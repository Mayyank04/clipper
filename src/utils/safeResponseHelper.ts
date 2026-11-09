/**
 * VIRALCLIP STUDIO — SAFE API RESPONSE PARSER & ERROR CONTRACT
 * Standardizes API responses across all ingestion endpoints and prevents
 * JSON parse crashes from non-JSON / HTML / gateway responses.
 */

export interface StructuredApiError {
  code: string;
  message: string;
  status: number;
  retryable: boolean;
  suggestedAction?: string;
  stage?: string;
  details?: any;
  diagnosticId?: string;
  rawResponseExcerpt?: string;
}

export class ApiError extends Error {
  public code: string;
  public status: number;
  public retryable: boolean;
  public suggestedAction?: string;
  public stage?: string;
  public details?: any;
  public diagnosticId?: string;
  public rawResponseExcerpt?: string;

  constructor(payload: StructuredApiError) {
    super(payload.message);
    this.name = 'ApiError';
    this.code = payload.code;
    this.status = payload.status;
    this.retryable = payload.retryable;
    this.suggestedAction = payload.suggestedAction;
    this.stage = payload.stage;
    this.details = payload.details;
    this.diagnosticId = payload.diagnosticId;
    this.rawResponseExcerpt = payload.rawResponseExcerpt;
  }
}

/**
 * Standard safe response reader for all frontend and worker HTTP calls.
 * 1. Reads the response body safely.
 * 2. Checks HTTP status.
 * 3. Checks Content-Type.
 * 4. Handles empty bodies.
 * 5. Parses JSON only when appropriate.
 * 6. Detects HTML / plain-text upstream responses (e.g. Embarko 421, Bad Gateway, etc.).
 * 7. Produces a structured ApiError.
 * 8. Attaches sanitized diagnostic ID.
 */
export async function parseSafeApiResponse<T = any>(response: Response): Promise<T> {
  const diagnosticId = `diag_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  const status = response.status;

  let rawText = '';
  try {
    rawText = await response.text();
  } catch (readErr: any) {
    throw new ApiError({
      code: 'NETWORK_ERROR',
      message: `Failed to read server response: ${readErr?.message || 'Connection lost'}`,
      status,
      retryable: true,
      suggestedAction: 'Please check your internet connection and try again.',
      diagnosticId,
    });
  }

  const trimmed = rawText.trim();

  // 1. Empty body handling
  if (!trimmed) {
    if (response.ok) {
      return {} as T;
    }
    throw new ApiError({
      code: status >= 500 ? 'WORKER_UNAVAILABLE' : 'EMPTY_RESPONSE',
      message: `Server returned an empty response with HTTP status ${status}`,
      status,
      retryable: status >= 500,
      suggestedAction: 'Please retry the request or check backend status.',
      diagnosticId,
    });
  }

  // 2. Determine if body is JSON
  const looksLikeJson = trimmed.startsWith('{') || trimmed.startsWith('[');
  const isJsonType = contentType.includes('application/json');

  let parsedData: any = null;
  if (isJsonType || looksLikeJson) {
    try {
      parsedData = JSON.parse(trimmed);
    } catch {
      parsedData = null;
    }
  }

  // 3. Handle non-JSON or upstream HTML/plain-text responses
  if (!parsedData) {
    const excerpt = trimmed.slice(0, 300);

    // Embarko routing / cold-start / sleeping app response
    if (trimmed.includes('This app is not reachable') || trimmed.includes('This app i')) {
      throw new ApiError({
        code: 'WORKER_UNAVAILABLE',
        message: 'The processing service is currently initializing or unreachable.',
        status: status || 503,
        retryable: true,
        suggestedAction: 'The server may be starting up. Please wait 15 seconds and retry, or upload the video directly.',
        diagnosticId,
        rawResponseExcerpt: excerpt,
      });
    }

    if (trimmed.includes('Bad Gateway') || status === 502) {
      throw new ApiError({
        code: 'WORKER_UNAVAILABLE',
        message: 'The upstream processing service returned a Bad Gateway error (502).',
        status: 502,
        retryable: true,
        suggestedAction: 'The server is temporarily restarting. Retry in a moment or upload the video directly.',
        diagnosticId,
        rawResponseExcerpt: excerpt,
      });
    }

    if (trimmed.includes('Gateway Time-out') || trimmed.includes('Gateway Timeout') || status === 504) {
      throw new ApiError({
        code: 'DOWNLOAD_TIMEOUT',
        message: 'The request timed out waiting for the server to respond (504).',
        status: 504,
        retryable: true,
        suggestedAction: 'The video stream is taking too long to process. Try a shorter video or upload the file.',
        diagnosticId,
        rawResponseExcerpt: excerpt,
      });
    }

    // HTML fallback extraction (e.g. 404 or error page)
    let summaryMessage = `Server returned non-JSON response with HTTP ${status}`;
    if (contentType.includes('text/html') || trimmed.startsWith('<')) {
      const titleMatch = trimmed.match(/<title>([^<]+)<\/title>/i);
      const h1Match = trimmed.match(/<h1>([^<]+)<\/h1>/i);
      summaryMessage = (titleMatch ? titleMatch[1] : (h1Match ? h1Match[1] : `HTML Page (HTTP ${status})`)).trim();
    } else {
      summaryMessage = trimmed.slice(0, 150);
    }

    throw new ApiError({
      code: status >= 500 ? 'WORKER_UNAVAILABLE' : 'INVALID_SERVER_RESPONSE',
      message: summaryMessage,
      status,
      retryable: status >= 500,
      suggestedAction: 'Upload the video directly as MP4/MOV if the problem persists.',
      diagnosticId,
      rawResponseExcerpt: excerpt,
    });
  }

  // 4. Structured JSON response: verify success flag and HTTP status
  if (!response.ok || parsedData.success === false) {
    const errObj = parsedData.error;
    const errorCode = (typeof errObj === 'object' && errObj?.code) ||
      parsedData.code ||
      parsedData.errorCode ||
      (status === 400 ? 'INVALID_YOUTUBE_URL' : (status === 404 ? 'VIDEO_NOT_FOUND' : 'UNKNOWN_INGESTION_ERROR'));

    const errorMessage = (typeof errObj === 'object' && errObj?.message) ||
      (typeof errObj === 'string' ? errObj : null) ||
      parsedData.message ||
      parsedData.error ||
      `Request failed with HTTP ${status}`;

    const retryable = (typeof errObj === 'object' && typeof errObj.retryable === 'boolean')
      ? errObj.retryable
      : (status >= 500 || status === 429);

    const suggestedAction = (typeof errObj === 'object' && errObj?.suggestedAction) ||
      parsedData.suggestedAction ||
      (retryable ? 'Please retry in a moment.' : 'Upload the video file directly instead.');

    throw new ApiError({
      code: errorCode,
      message: errorMessage,
      status,
      retryable,
      suggestedAction,
      stage: parsedData.stage,
      details: (typeof errObj === 'object' ? errObj?.details : undefined) || parsedData,
      diagnosticId,
    });
  }

  return parsedData as T;
}

