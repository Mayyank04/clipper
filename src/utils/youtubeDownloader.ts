import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { execFile, execSync, spawn } from 'child_process';

export type YouTubeErrorCode =
  | 'INVALID_YOUTUBE_URL'
  | 'VIDEO_NOT_FOUND'
  | 'VIDEO_PRIVATE'
  | 'VIDEO_RESTRICTED'
  | 'AUTHENTICATION_REQUIRED'
  | 'YOUTUBE_RATE_LIMITED'
  | 'YOUTUBE_CHALLENGE_REQUIRED'
  | 'FORMAT_UNAVAILABLE'
  | 'DOWNLOAD_TIMEOUT'
  | 'NETWORK_ERROR'
  | 'WORKER_UNAVAILABLE'
  | 'STORAGE_UPLOAD_FAILED'
  | 'MEDIA_VALIDATION_FAILED'
  | 'UNKNOWN_INGESTION_ERROR'
  | 'YOUTUBE_INVALID_URL'
  | 'YOUTUBE_NOT_FOUND'
  | 'YOUTUBE_PRIVATE'
  | 'YOUTUBE_AGE_RESTRICTED'
  | 'YOUTUBE_LOGIN_REQUIRED'
  | 'YOUTUBE_COOKIE_REQUIRED'
  | 'YOUTUBE_PO_TOKEN_REQUIRED'
  | 'YOUTUBE_GEO_BLOCKED'
  | 'YOUTUBE_DOWNLOAD_FAILED'
  | 'YOUTUBE_DEPENDENCY_MISSING'
  | 'YOUTUBE_UNKNOWN';

export interface ClassifiedYouTubeError {
  code: YouTubeErrorCode;
  reason: string;
  userMessage: string;
  retryable: boolean;
  suggestedAction: string;
  requiresAuth: boolean;
  requiresPoToken: boolean;
  rawError?: string;
  videoId?: string | null;
  normalizedUrl?: string | null;
}

export interface YouTubeAuthConfig {
  isConfigured: boolean;
  method: 'none' | 'cookie_file' | 'browser_cookies';
  cookieFile?: string;
  browser?: string;
  poToken?: string;
}

export interface YouTubeStatusResponse {
  available: boolean;
  ytDlpInstalled: boolean;
  ytDlpVersion?: string;
  authenticatedAccessConfigured: boolean;
  poTokenConfigured: boolean;
  authMethod: 'none' | 'cookie_file' | 'browser_cookies';
  configuredBrowser: string | null;
}

export interface DownloadedSourceMedia {
  sourceId: string;
  sourceType: 'youtube';
  originalUrl: string;
  downloadedFile: string;
  duration: number;
  width: number;
  height: number;
  fps: number;
  audio?: {
    codec: string;
    channels?: number;
    sampleRate?: number;
  };
  video: {
    codec: string;
    width: number;
    height: number;
    fps: number;
  };
  fileSize: number;
  hash: string;
}

export interface YouTubeDownloadResult {
  success: boolean;
  filePath?: string;
  fileUrl?: string;
  sourceMedia?: DownloadedSourceMedia;
  duration?: number;
  width?: number;
  height?: number;
  fps?: number;
  fileSize?: number;
  hash?: string;
  classifiedError?: ClassifiedYouTubeError;
  error?: string;
  code?: YouTubeErrorCode | string;
  authConfigured?: boolean;
}

/**
 * Helper: Extract YouTube video ID from various standard YouTube URL formats.
 * Robustly parses watch?v=, youtu.be/, shorts/, embed/, live/, and query parameters.
 */
export function extractYouTubeId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();

  // Try standard URL parsing
  try {
    const parsed = new URL(trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : `https://${trimmed}`);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');

    if (host === 'youtu.be') {
      const id = parsed.pathname.slice(1).split('/')[0].split('?')[0];
      if (/^[a-zA-Z0-9_-]{11}$/.test(id)) return id;
    }

    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      const v = parsed.searchParams.get('v');
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;

      const parts = parsed.pathname.split('/').filter(Boolean);
      if (['shorts', 'embed', 'v', 'live'].includes(parts[0]) && parts[1]) {
        const id = parts[1].split('?')[0];
        if (/^[a-zA-Z0-9_-]{11}$/.test(id)) return id;
      }
    }
  } catch {}

  // Regex fallback: handles watch?v=, youtu.be/, embed/, shorts/, and query parameters
  const regExp = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|live\/|watch\?v=|watch\?.+?&v=))([a-zA-Z0-9_-]{11})/i;
  const match = trimmed.match(regExp);
  if (match && match[1] && match[1].length === 11) {
    return match[1];
  }

  return null;
}

/**
 * Helper: Normalize any supported YouTube URL into a canonical URL and extract video ID.
 */
export function normalizeYouTubeUrl(rawUrl: string): { valid: boolean; videoId: string | null; canonicalUrl: string | null } {
  const videoId = extractYouTubeId(rawUrl);
  if (!videoId) return { valid: false, videoId: null, canonicalUrl: null };
  return {
    valid: true,
    videoId,
    canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`,
  };
}

/**
 * Parse yt-dlp stderr, stdout, and exit codes into explicit, classified error categories.
 * Strictly uses the 14 standardized error codes:
 * INVALID_YOUTUBE_URL, VIDEO_NOT_FOUND, VIDEO_PRIVATE, VIDEO_RESTRICTED, AUTHENTICATION_REQUIRED,
 * YOUTUBE_RATE_LIMITED, YOUTUBE_CHALLENGE_REQUIRED, FORMAT_UNAVAILABLE, DOWNLOAD_TIMEOUT,
 * NETWORK_ERROR, WORKER_UNAVAILABLE, STORAGE_UPLOAD_FAILED, MEDIA_VALIDATION_FAILED, UNKNOWN_INGESTION_ERROR.
 */
export function classifyYouTubeError(
  stderr: string,
  stdout: string = '',
  exitCode?: number
): ClassifiedYouTubeError {
  const combined = `${stderr}\n${stdout}`.trim();
  const lower = combined.toLowerCase();

  // 1. Invalid YouTube URL
  if (
    lower.includes('incomplete youtube id') ||
    lower.includes('is not a valid url') ||
    lower.includes('unable to extract video data') ||
    lower.includes('invalid youtube url')
  ) {
    return {
      code: 'INVALID_YOUTUBE_URL',
      reason: 'The specified URL is not a recognized YouTube URL format.',
      userMessage: 'Invalid YouTube URL format. Supported formats: youtube.com/watch?v=..., youtu.be/..., or youtube.com/shorts/...',
      retryable: false,
      suggestedAction: 'Please check the URL and ensure it points to a valid public YouTube video.',
      requiresAuth: false,
      requiresPoToken: false,
      rawError: stderr.trim(),
    };
  }

  // 2. Video Not Found / Removed (Error A root cause check: never classify other errors as not found)
  if (
    lower.includes('video unavailable') ||
    lower.includes('video is unavailable') ||
    lower.includes('this video is unavailable') ||
    lower.includes('this video does not exist') ||
    lower.includes('this video has been removed') ||
    lower.includes('http error 404') ||
    lower.includes('video has been deleted')
  ) {
    return {
      code: 'VIDEO_NOT_FOUND',
      reason: 'The video was not found, was deleted, or the URL ID is invalid.',
      userMessage: 'This YouTube video was not found or has been removed. Check the link or upload the video directly.',
      retryable: false,
      suggestedAction: 'Verify the video is still publicly viewable on YouTube or upload the video file directly.',
      requiresAuth: false,
      requiresPoToken: false,
      rawError: stderr.trim(),
    };
  }

  // 3. Private Video
  if (
    lower.includes('private video') ||
    lower.includes('this video is private') ||
    lower.includes('this is a private video')
  ) {
    return {
      code: 'VIDEO_PRIVATE',
      reason: 'The video has been set to Private by its owner.',
      userMessage: 'This YouTube video is private. Upload the video file directly instead.',
      retryable: false,
      suggestedAction: 'Ask the video owner to set the video to unlisted/public, or upload the MP4/MOV file directly.',
      requiresAuth: true,
      requiresPoToken: false,
      rawError: stderr.trim(),
    };
  }

  // 4. Age Restriction / Geo restriction / Region blocked
  if (
    lower.includes('sign in to confirm your age') ||
    lower.includes('confirm your age') ||
    lower.includes('age-restricted') ||
    lower.includes('age restricted') ||
    lower.includes('not available in your country') ||
    lower.includes('uploader has not made this video available in your country') ||
    lower.includes('geo restricted') ||
    lower.includes('geoblocked') ||
    lower.includes('members-only') ||
    lower.includes('join this channel to get access')
  ) {
    return {
      code: 'VIDEO_RESTRICTED',
      reason: 'Video is restricted by YouTube (age restriction, regional licensing, or membership requirements).',
      userMessage: 'This video is restricted by YouTube (age-gated or regionally restricted). Upload the video directly.',
      retryable: false,
      suggestedAction: 'Download the video in your authenticated browser and upload the MP4/MOV file directly.',
      requiresAuth: true,
      requiresPoToken: false,
      rawError: stderr.trim(),
    };
  }

  // 5. Bot challenge / CAPTCHA / Proof-of-Origin required
  if (
    lower.includes('sign in to confirm you’re not a bot') ||
    lower.includes('sign in to confirm you are not a bot') ||
    lower.includes('bot detection') ||
    lower.includes('po token') ||
    lower.includes('po_token') ||
    lower.includes('proof-of-origin') ||
    lower.includes('bot detection token') ||
    lower.includes('gvs po token') ||
    lower.includes('challenge required') ||
    lower.includes('captcha')
  ) {
    return {
      code: 'YOUTUBE_CHALLENGE_REQUIRED',
      reason: 'YouTube triggered bot detection or requires Proof-of-Origin token verification.',
      userMessage: 'YouTube triggered bot verification for this video stream. Upload the video directly instead.',
      retryable: false,
      suggestedAction: 'YouTube is challenging automated access. Please upload the video file directly.',
      requiresAuth: false,
      requiresPoToken: true,
      rawError: stderr.trim(),
    };
  }

  // 6. Authentication required (cookies / login)
  if (
    lower.includes('sign in to access this video') ||
    lower.includes('only available to registered users') ||
    lower.includes('use --cookies') ||
    lower.includes('cookies-from-browser')
  ) {
    return {
      code: 'AUTHENTICATION_REQUIRED',
      reason: 'YouTube requires an authenticated session for this video.',
      userMessage: 'This video requires YouTube authentication credentials. Upload the video file directly.',
      retryable: false,
      suggestedAction: 'Upload the video file directly or configure authenticated cookies on the server.',
      requiresAuth: true,
      requiresPoToken: false,
      rawError: stderr.trim(),
    };
  }

  // 7. Rate Limited
  if (
    lower.includes('http error 429') ||
    lower.includes('too many requests') ||
    lower.includes('rate-limited') ||
    lower.includes('rate limit')
  ) {
    return {
      code: 'YOUTUBE_RATE_LIMITED',
      reason: 'YouTube has temporarily throttled download requests from this server.',
      userMessage: 'YouTube temporarily limited downloads from this server. Retry later or upload the video directly.',
      retryable: true,
      suggestedAction: 'Retry in a few minutes, or upload the video directly as an MP4/MOV.',
      requiresAuth: false,
      requiresPoToken: false,
      rawError: stderr.trim(),
    };
  }

  // 8. Format unavailable
  if (
    lower.includes('requested format not available') ||
    lower.includes('no video formats found') ||
    lower.includes('no suitable format found') ||
    lower.includes('format is not available')
  ) {
    return {
      code: 'FORMAT_UNAVAILABLE',
      reason: 'No compatible video stream format is available from YouTube for this video.',
      userMessage: 'No compatible video format could be extracted. Upload the video directly.',
      retryable: false,
      suggestedAction: 'Upload the video file directly in MP4 or MOV format.',
      requiresAuth: false,
      requiresPoToken: false,
      rawError: stderr.trim(),
    };
  }

  // 9. Timeout
  if (
    lower.includes('timed out') ||
    lower.includes('timeout') ||
    exitCode === 124
  ) {
    return {
      code: 'DOWNLOAD_TIMEOUT',
      reason: 'The YouTube download process timed out before completion.',
      userMessage: 'Download timed out. The video may be too large or the network connection was slow.',
      retryable: true,
      suggestedAction: 'Retry with a shorter video, or upload the video file directly.',
      requiresAuth: false,
      requiresPoToken: false,
      rawError: stderr.trim(),
    };
  }

  // 10. Network Error
  if (
    lower.includes('unable to download webpage') ||
    lower.includes('connection refused') ||
    lower.includes('network is unreachable') ||
    lower.includes('temporary failure in name resolution') ||
    lower.includes('name or service not known') ||
    lower.includes('getaddrinfo') ||
    lower.includes('econnreset') ||
    lower.includes('socket hang up') ||
    lower.includes('tls handshake')
  ) {
    return {
      code: 'NETWORK_ERROR',
      reason: 'Network connectivity error while contacting YouTube servers.',
      userMessage: 'Network error connecting to YouTube. Check the connection or upload the video directly.',
      retryable: true,
      suggestedAction: 'Check network connectivity or upload the video directly.',
      requiresAuth: false,
      requiresPoToken: false,
      rawError: stderr.trim(),
    };
  }

  // 11. Worker / Dependency Missing
  if (
    lower.includes('downloader not installed') ||
    lower.includes('yt-dlp binary not found') ||
    lower.includes('command not found') ||
    lower.includes('worker unavailable') ||
    lower.includes('spawn enoent')
  ) {
    return {
      code: 'WORKER_UNAVAILABLE',
      reason: 'YouTube downloader dependency or worker process is not available on this server.',
      userMessage: 'YouTube downloader worker is unavailable on this server. Upload the video directly.',
      retryable: false,
      suggestedAction: 'Upload the video directly as MP4/MOV while the backend worker is configured.',
      requiresAuth: false,
      requiresPoToken: false,
      rawError: stderr.trim(),
    };
  }

  // 12. Storage upload failure
  if (
    lower.includes('storage upload failed') ||
    lower.includes('s3 upload error') ||
    (lower.includes('permission denied') && lower.includes('upload'))
  ) {
    return {
      code: 'STORAGE_UPLOAD_FAILED',
      reason: 'Failed to write downloaded media to server storage.',
      userMessage: 'Storage upload failed. Server storage may be temporarily full or read-only.',
      retryable: true,
      suggestedAction: 'Retry in a moment or contact server administrator.',
      requiresAuth: false,
      requiresPoToken: false,
      rawError: stderr.trim(),
    };
  }

  // 13. Media validation failure
  if (
    lower.includes('ffprobe') ||
    lower.includes('validation failed') ||
    lower.includes('missing valid video stream') ||
    lower.includes('corrupt')
  ) {
    return {
      code: 'MEDIA_VALIDATION_FAILED',
      reason: 'Downloaded media failed FFprobe validation or was corrupted.',
      userMessage: 'Downloaded media could not be validated. Upload the video directly.',
      retryable: false,
      suggestedAction: 'Upload the video file directly in MP4 or MOV format.',
      requiresAuth: false,
      requiresPoToken: false,
      rawError: stderr.trim(),
    };
  }

  // 14. Unknown ingestion error fallback
  const errLine = stderr.split('\n').find((l) => l.includes('ERROR:'));
  const fallbackReason = errLine ? errLine.replace(/^ERROR:\s*/, '').trim() : (stderr.trim() || 'YouTube media download failed.');

  return {
    code: 'UNKNOWN_INGESTION_ERROR',
    reason: fallbackReason,
    userMessage: `${fallbackReason} Upload the video directly instead.`,
    retryable: true,
    suggestedAction: 'Please retry, or upload the video directly as MP4/MOV.',
    requiresAuth: false,
    requiresPoToken: false,
    rawError: stderr.trim(),
  };
}

/**
 * Inspect server environment variables to detect configured authentication.
 *
 * Supported variables:
 * - YTDLP_COOKIE_FILE: absolute/relative path to a Netscape format cookies file.
 * - YTDLP_BROWSER_COOKIES: local development only! Must be one of ['chrome', 'firefox', 'safari', 'edge', 'chromium', 'brave'].
 * - YTDLP_PO_TOKEN: Proof-of-Origin token for YouTube clients.
 *
 * SECURITY:
 * Never automatically harvest or access browser profiles without explicit env var.
 * Never log or expose cookie file contents or tokens.
 */
export function getYouTubeAuthConfig(): YouTubeAuthConfig {
  const cookieFilePath = process.env.YTDLP_COOKIE_FILE?.trim();
  if (cookieFilePath) {
    const resolvedPath = path.isAbsolute(cookieFilePath)
      ? cookieFilePath
      : path.join(process.cwd(), cookieFilePath);
    if (fs.existsSync(resolvedPath)) {
      return {
        isConfigured: true,
        method: 'cookie_file',
        cookieFile: resolvedPath,
        poToken: process.env.YTDLP_PO_TOKEN?.trim() || undefined,
      };
    }
  }

  const browserEnv = process.env.YTDLP_BROWSER_COOKIES?.trim().toLowerCase();
  const ALLOWED_BROWSERS = ['chrome', 'chromium', 'firefox', 'safari', 'edge', 'brave', 'opera', 'vivaldi'];
  if (browserEnv && ALLOWED_BROWSERS.includes(browserEnv)) {
    return {
      isConfigured: true,
      method: 'browser_cookies',
      browser: browserEnv,
      poToken: process.env.YTDLP_PO_TOKEN?.trim() || undefined,
    };
  }

  return {
    isConfigured: false,
    method: 'none',
    poToken: process.env.YTDLP_PO_TOKEN?.trim() || undefined,
  };
}

/**
 * Adapter for yt-dlp downloader execution.
 * Encapsulates binary location, version detection, and argument construction.
 */
export class YtDlpAdapter {
  private cachedPath: string | null | undefined = undefined;
  private cachedVersion: string | null | undefined = undefined;

  /**
   * Locate yt-dlp on the host machine.
   */
  public findBinary(): string | null {
    if (this.cachedPath !== undefined) return this.cachedPath;

    const localBin = path.join(process.cwd(), 'bin', 'yt-dlp');
    const candidates = [
      localBin,
      'yt-dlp',
      '/root/.local/share/mise/shims/yt-dlp',
      '/root/.local/share/mise/installs/yt-dlp/latest/bin/yt-dlp',
      path.join(process.env.HOME || '', '.local/share/mise/shims/yt-dlp'),
      path.join(process.env.HOME || '', '.local/bin/yt-dlp'),
      path.join(process.env.HOME || '', 'Library/Python/3.9/bin/yt-dlp'),
      path.join(process.env.HOME || '', 'Library/Python/3.10/bin/yt-dlp'),
      path.join(process.env.HOME || '', 'Library/Python/3.11/bin/yt-dlp'),
      path.join(process.env.HOME || '', 'Library/Python/3.12/bin/yt-dlp'),
      '/opt/homebrew/bin/yt-dlp',
      '/usr/local/bin/yt-dlp',
      '/usr/bin/yt-dlp',
    ];

    for (const c of candidates) {
      try {
        if (c.includes('/') && !fs.existsSync(c)) continue;
        execSync(`"${c}" --version`, { stdio: 'ignore', timeout: 3000 });
        this.cachedPath = c;
        return c;
      } catch {
        // continue
      }
    }

    // Try python3 -m yt_dlp
    try {
      execSync('python3 -m yt_dlp --version', { stdio: 'ignore', timeout: 3000 });
      this.cachedPath = 'python3 -m yt_dlp';
      return this.cachedPath;
    } catch {
      // not found
    }

    this.cachedPath = null;
    return null;
  }

  /**
   * Get version string of the yt-dlp binary.
   */
  public getVersion(): string | null {
    if (this.cachedVersion !== undefined) return this.cachedVersion;
    const binary = this.findBinary();
    if (!binary) {
      this.cachedVersion = null;
      return null;
    }

    try {
      const out = binary.startsWith('python3')
        ? execSync('python3 -m yt_dlp --version', { encoding: 'utf8' })
        : execSync(`"${binary}" --version`, { encoding: 'utf8' });
      this.cachedVersion = out.trim();
      return this.cachedVersion;
    } catch {
      this.cachedVersion = null;
      return null;
    }
  }

  /**
   * Build yt-dlp command-line arguments.
   */
  public buildArgs(
    url: string,
    outputPath: string,
    options: {
      ffmpegPath: string;
      authConfig: YouTubeAuthConfig;
      useAuth: boolean;
      clientProfiles?: string[];
    }
  ): { cmd: string; args: string[] } {
    const binary = this.findBinary();
    const isPythonModule = binary === 'python3 -m yt_dlp';
    const baseCmd = isPythonModule ? 'python3' : (binary || 'yt-dlp');

    const clientList = options.clientProfiles?.join(',') || 'android,ios,web';
    const dlArgs: string[] = isPythonModule ? ['-m', 'yt_dlp'] : [];

    dlArgs.push(
      '--ffmpeg-location', options.ffmpegPath,
      '--extractor-args', `youtube:player_client=${clientList}`,
      '--no-check-certificates',
      '--no-playlist',
      '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
      '--merge-output-format', 'mp4',
      '-o', outputPath
    );

    // Apply authentication if explicitly requested and configured
    if (options.useAuth && options.authConfig.isConfigured) {
      if (options.authConfig.method === 'cookie_file' && options.authConfig.cookieFile) {
        dlArgs.push('--cookies', options.authConfig.cookieFile);
      } else if (options.authConfig.method === 'browser_cookies' && options.authConfig.browser) {
        dlArgs.push('--cookies-from-browser', options.authConfig.browser);
      }
    }

    // Apply Proof-of-Origin token if configured
    if (options.authConfig.poToken) {
      dlArgs.push('--extractor-args', `youtube:po_token=${options.authConfig.poToken}`);
    }

    dlArgs.push(url);
    return { cmd: baseCmd, args: dlArgs };
  }

  /**
   * Clean up leftover partial downloads or temp files.
   */
  public cleanPartialFiles(targetDir: string, baseFilename: string): void {
    try {
      if (!fs.existsSync(targetDir)) return;
      const files = fs.readdirSync(targetDir);
      const prefix = baseFilename.replace(/\.mp4$/, '');
      for (const f of files) {
        if (f.startsWith(prefix) && (f.endsWith('.part') || f.endsWith('.ytdl') || f.includes('.temp.'))) {
          try {
            fs.unlinkSync(path.join(targetDir, f));
          } catch {}
        }
      }
    } catch {}
  }
}

/**
 * Primary YouTube Ingestion Downloader Service.
 * Implements two-phase download strategy:
 * Phase 1: Try safest normal download without authentication.
 * Phase 2: If authentication error occurs and server is configured, retry with credentials.
 */
export class YouTubeDownloader {
  private adapter: YtDlpAdapter;
  private ffmpegPath: string;

  constructor(ffmpegPath: string) {
    this.ffmpegPath = ffmpegPath;
    this.adapter = new YtDlpAdapter();
  }

  public getAdapter(): YtDlpAdapter {
    return this.adapter;
  }

  /**
   * Report status for GET /api/youtube/status.
   */
  public getStatus(): YouTubeStatusResponse {
    const binary = this.adapter.findBinary();
    const version = this.adapter.getVersion();
    const auth = getYouTubeAuthConfig();

    return {
      available: Boolean(binary),
      ytDlpInstalled: Boolean(binary),
      ytDlpVersion: version || undefined,
      authenticatedAccessConfigured: auth.isConfigured,
      poTokenConfigured: Boolean(auth.poToken),
      authMethod: auth.method,
      configuredBrowser: auth.browser || null,
    };
  }

  /**
   * Real media download with error classification, authentication retries, and source integrity.
   */
  public async downloadVideo(
    rawUrl: string,
    targetDir: string,
    options?: {
      probeMediaFn?: (filePath: string) => Promise<any>;
      onLog?: (msg: string, type?: 'info' | 'warn' | 'error' | 'success') => void;
    }
  ): Promise<YouTubeDownloadResult> {
    const log = (msg: string, type: 'info' | 'warn' | 'error' | 'success' = 'info') => {
      const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });
      console.log(`[${timeStr}] [YOUTUBE] ${msg}`);
      if (options?.onLog) options.onLog(msg, type);
    };

    // 1. URL validation
    log(`Validating YouTube URL: ${rawUrl}`);
    const { valid, videoId, canonicalUrl } = normalizeYouTubeUrl(rawUrl);
    if (!valid || !videoId || !canonicalUrl) {
      log('Classification: INVALID_YOUTUBE_URL', 'error');
      const err = classifyYouTubeError('Invalid YouTube URL');
      return {
        success: false,
        code: 'INVALID_YOUTUBE_URL',
        classifiedError: err,
        error: err.userMessage,
      };
    }

    // 2. Downloader binary availability
    const binary = this.adapter.findBinary();
    if (!binary) {
      log('Classification: WORKER_UNAVAILABLE - yt-dlp not found', 'error');
      const err = classifyYouTubeError('yt-dlp binary not found');
      return {
        success: false,
        code: 'WORKER_UNAVAILABLE',
        classifiedError: err,
        error: err.userMessage,
      };
    }

    const authConfig = getYouTubeAuthConfig();
    const filename = `yt_${videoId}_${Date.now()}.mp4`;
    const outputPath = path.join(targetDir, filename);

    log(`Starting YouTube ingestion for ${canonicalUrl}`);

    // Helper: Execute yt-dlp process with streaming download progress
    const runDownloadProcess = (useAuth: boolean): Promise<{ success: boolean; stderr: string; stdout: string; exitCode: number }> => {
      const { cmd, args } = this.adapter.buildArgs(canonicalUrl, outputPath, {
        ffmpegPath: this.ffmpegPath,
        authConfig,
        useAuth,
      });

      return new Promise((resolve) => {
        let stdoutData = '';
        let stderrData = '';
        let lastProgressTime = 0;

        const child = spawn(cmd, args);

        const hardTimeout = setTimeout(() => {
          try { child.kill('SIGTERM'); } catch {}
          resolve({
            success: false,
            stderr: stderrData + '\nDownload process timed out after 240 seconds',
            stdout: stdoutData,
            exitCode: 124,
          });
        }, 240000);

        child.stdout.on('data', (chunk: Buffer) => {
          const str = chunk.toString();
          stdoutData += str;
          // Parse download progress lines: [download]  45.2% of ~ 15.00MiB at  2.50MiB/s ETA 00:04
          const match = str.match(/\[download\]\s+(\d+(?:\.\d+)?%[^\r\n]*)/);
          if (match && Date.now() - lastProgressTime > 1500) {
            lastProgressTime = Date.now();
            log(match[0].trim(), 'info');
          }
        });

        child.stderr.on('data', (chunk: Buffer) => {
          stderrData += chunk.toString();
        });

        child.on('error', (err) => {
          clearTimeout(hardTimeout);
          stderrData += `\nSpawn error: ${err.message}`;
          resolve({
            success: false,
            stderr: stderrData,
            stdout: stdoutData,
            exitCode: 1,
          });
        });

        child.on('close', (code) => {
          clearTimeout(hardTimeout);
          resolve({
            success: (code === 0 || code === null) && fs.existsSync(outputPath),
            stderr: stderrData,
            stdout: stdoutData,
            exitCode: code ?? 0,
          });
        });
      });
    };

    // Phase 1: Attempt standard public download first
    const attempt1 = await runDownloadProcess(false);

    if (attempt1.success && fs.existsSync(outputPath)) {
      // Validate file size
      const stat = fs.statSync(outputPath);
      if (stat.size > 2048) {
        log('YouTube download completed successfully', 'success');
        return this.verifyAndFinalizeMedia(outputPath, filename, canonicalUrl, stat.size, options?.probeMediaFn, log);
      }
    }

    // Phase 1 Failed: Classify error
    const classified = classifyYouTubeError(attempt1.stderr, attempt1.stdout, attempt1.exitCode);
    log(`YouTube download failed. Classification: ${classified.code}`, classified.requiresAuth ? 'warn' : 'error');

    // Phase 2: If authentication is required and configured on server, retry
    if (classified.requiresAuth) {
      log('YouTube requires authentication', 'warn');

      if (authConfig.isConfigured) {
        log(`Authenticated downloader: CONFIGURED (method=${authConfig.method})`, 'info');
        log('Retrying download with configured authentication credentials...', 'info');

        const attempt2 = await runDownloadProcess(true);
        if (attempt2.success && fs.existsSync(outputPath)) {
          const stat = fs.statSync(outputPath);
          if (stat.size > 2048) {
            log('Authenticated YouTube download succeeded', 'success');
            return this.verifyAndFinalizeMedia(outputPath, filename, canonicalUrl, stat.size, options?.probeMediaFn, log);
          }
        }

        // Attempt 2 also failed
        const classified2 = classifyYouTubeError(attempt2.stderr, attempt2.stdout, attempt2.exitCode);
        this.adapter.cleanPartialFiles(targetDir, filename);
        try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch {}

        log('Authenticated download failed with provided credentials', 'error');
        return {
          success: false,
          code: classified2.code,
          classifiedError: classified2,
          error: classified2.userMessage,
          authConfigured: true,
        };
      } else {
        // Authentication NOT configured
        log('Authenticated downloader: NOT CONFIGURED', 'warn');
        log('Processing stopped', 'warn');
        this.adapter.cleanPartialFiles(targetDir, filename);
        try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch {}

        return {
          success: false,
          code: classified.code,
          classifiedError: classified,
          error: classified.userMessage,
          authConfigured: false,
        };
      }
    }

    // Clean up partial files on unrecoverable failure
    this.adapter.cleanPartialFiles(targetDir, filename);
    try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch {}

    return {
      success: false,
      code: classified.code,
      classifiedError: classified,
      error: classified.userMessage,
      authConfigured: authConfig.isConfigured,
    };
  }

  /**
   * Finalize downloaded media: FFprobe validation and SHA-256 integrity hash.
   */
  private async verifyAndFinalizeMedia(
    outputPath: string,
    filename: string,
    canonicalUrl: string,
    fileSize: number,
    probeMediaFn: ((path: string) => Promise<any>) | undefined,
    log: (msg: string, type?: 'info' | 'warn' | 'error' | 'success') => void
  ): Promise<YouTubeDownloadResult> {
    // 1. Compute SHA-256 hash for source integrity
    let fileHash = '';
    try {
      const fileBuffer = fs.readFileSync(outputPath);
      fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    } catch (e) {
      log('Warning: could not compute SHA-256 file hash', 'warn');
    }

    // 2. FFprobe validation
    let duration = 0;
    let width = 1080;
    let height = 1920;
    let fps = 30;
    let videoCodec = 'h264';
    let audioCodec = 'aac';

    if (probeMediaFn) {
      try {
        log('Probing downloaded media with FFprobe...');
        const probe = await probeMediaFn(outputPath);
        if (!probe || probe.duration <= 0 || !probe.hasVideo) {
          log('FFprobe validation failed: file missing valid video stream or duration', 'error');
          try { fs.unlinkSync(outputPath); } catch {}
          return {
            success: false,
            code: 'MEDIA_VALIDATION_FAILED',
            error: 'Downloaded media failed FFprobe validation (no valid video stream). Upload the video file directly.',
          };
        }

        duration = probe.duration;
        width = probe.width || 1080;
        height = probe.height || 1920;
        fps = probe.fps || 30;
        videoCodec = probe.video?.codec || 'h264';
        audioCodec = probe.audio?.codec || 'aac';
        log(`FFprobe confirmed: ${duration}s, ${width}x${height}, ${fps}fps, video=${videoCodec}, audio=${audioCodec}`, 'success');
      } catch (err: any) {
        log(`FFprobe verification error: ${err.message}`, 'error');
        try { fs.unlinkSync(outputPath); } catch {}
        return {
          success: false,
          code: 'MEDIA_VALIDATION_FAILED',
          error: 'Failed to inspect downloaded media with FFprobe. Upload the video file directly.',
        };
      }
    }

    const sourceMedia: DownloadedSourceMedia = {
      sourceId: `yt_${Date.now()}`,
      sourceType: 'youtube',
      originalUrl: canonicalUrl,
      downloadedFile: filename,
      duration,
      width,
      height,
      fps,
      video: {
        codec: videoCodec,
        width,
        height,
        fps,
      },
      audio: {
        codec: audioCodec,
      },
      fileSize,
      hash: fileHash,
    };

    return {
      success: true,
      filePath: outputPath,
      fileUrl: `/uploads/${filename}`,
      duration,
      width,
      height,
      fps,
      fileSize,
      hash: fileHash,
      sourceMedia,
    };
  }
}
