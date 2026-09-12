import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { execFile, execSync } from 'child_process';

export type YouTubeErrorCode =
  | 'YOUTUBE_INVALID_URL'
  | 'YOUTUBE_NOT_FOUND'
  | 'YOUTUBE_PRIVATE'
  | 'YOUTUBE_AGE_RESTRICTED'
  | 'YOUTUBE_LOGIN_REQUIRED'
  | 'YOUTUBE_COOKIE_REQUIRED'
  | 'YOUTUBE_PO_TOKEN_REQUIRED'
  | 'YOUTUBE_RATE_LIMITED'
  | 'YOUTUBE_GEO_BLOCKED'
  | 'YOUTUBE_DOWNLOAD_FAILED'
  | 'YOUTUBE_DEPENDENCY_MISSING'
  | 'YOUTUBE_UNKNOWN';

export interface ClassifiedYouTubeError {
  code: YouTubeErrorCode;
  reason: string;
  userMessage: string;
  requiresAuth: boolean;
  requiresPoToken: boolean;
  rawError?: string;
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
 */
export function extractYouTubeId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  const regExp = /^.*(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|shorts\/|&v=)([^#&?]*).*/;
  const match = trimmed.match(regExp);
  return match && match[1].length === 11 ? match[1] : null;
}

/**
 * Helper: Normalize any supported YouTube URL into a canonical URL.
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
 * Maps "Sign in to confirm your age" directly to YOUTUBE_AGE_RESTRICTED.
 */
export function classifyYouTubeError(
  stderr: string,
  stdout: string = '',
  exitCode?: number
): ClassifiedYouTubeError {
  const combined = `${stderr}\n${stdout}`.trim();
  const lower = combined.toLowerCase();

  // 1. Age Restriction
  if (
    lower.includes('sign in to confirm your age') ||
    lower.includes('confirm your age') ||
    lower.includes('age-restricted') ||
    lower.includes('age restricted') ||
    (lower.includes('sign in to confirm') && lower.includes('age'))
  ) {
    return {
      code: 'YOUTUBE_AGE_RESTRICTED',
      reason: 'Video is marked age-restricted by YouTube and requires an authenticated session.',
      userMessage: 'This video is age-restricted or requires a signed-in YouTube session. ViralClip Studio could not access it with the current server configuration.',
      requiresAuth: true,
      requiresPoToken: false,
      rawError: stderr.trim(),
    };
  }

  // 2. Login Required (Bot check, registered users, members-only)
  if (
    lower.includes('sign in to confirm you’re not a bot') ||
    lower.includes('sign in to confirm you are not a bot') ||
    lower.includes('sign in to access this video') ||
    lower.includes('only available to registered users') ||
    lower.includes('members-only') ||
    lower.includes('join this channel to get access')
  ) {
    return {
      code: 'YOUTUBE_LOGIN_REQUIRED',
      reason: 'YouTube requires a signed-in account or channel membership for this video.',
      userMessage: 'This YouTube video requires a signed-in account or member authorization. Upload the video file instead.',
      requiresAuth: true,
      requiresPoToken: false,
      rawError: stderr.trim(),
    };
  }

  // 3. Cookie Required
  if (
    (lower.includes('use --cookies') || lower.includes('cookies-from-browser')) &&
    (lower.includes('authentication') || lower.includes('required'))
  ) {
    return {
      code: 'YOUTUBE_COOKIE_REQUIRED',
      reason: 'YouTube requires cookie session tokens for media extraction.',
      userMessage: 'YouTube requires session authentication for this video stream. Upload the video file instead.',
      requiresAuth: true,
      requiresPoToken: false,
      rawError: stderr.trim(),
    };
  }

  // 4. Proof-of-Origin (PO) Token Required
  if (
    lower.includes('po token') ||
    lower.includes('po_token') ||
    lower.includes('proof-of-origin') ||
    lower.includes('bot detection token') ||
    lower.includes('gvs po token')
  ) {
    return {
      code: 'YOUTUBE_PO_TOKEN_REQUIRED',
      reason: 'YouTube requires Proof-of-Origin token verification for stream decryption.',
      userMessage: 'YouTube restricted download stream due to Proof-of-Origin token verification. Upload the video file instead.',
      requiresAuth: false,
      requiresPoToken: true,
      rawError: stderr.trim(),
    };
  }

  // 5. Private Video
  if (
    lower.includes('private video') ||
    lower.includes('this video is private') ||
    lower.includes('this is a private video')
  ) {
    return {
      code: 'YOUTUBE_PRIVATE',
      reason: 'The video has been set to Private by its owner.',
      userMessage: 'This YouTube video is private. Upload the video file instead.',
      requiresAuth: true,
      requiresPoToken: false,
      rawError: stderr.trim(),
    };
  }

  // 6. Video Not Found / Unavailable
  if (
    lower.includes('video unavailable') ||
    lower.includes('this video does not exist') ||
    lower.includes('this video has been removed') ||
    lower.includes('http error 404')
  ) {
    return {
      code: 'YOUTUBE_NOT_FOUND',
      reason: 'The video was not found, was deleted, or the URL ID is invalid.',
      userMessage: 'This YouTube video was not found or has been removed. Check the link or upload the video directly.',
      requiresAuth: false,
      requiresPoToken: false,
      rawError: stderr.trim(),
    };
  }

  // 7. Geo Blocked
  if (
    lower.includes('not available in your country') ||
    lower.includes('uploader has not made this video available in your country') ||
    lower.includes('geo restricted') ||
    lower.includes('geoblocked')
  ) {
    return {
      code: 'YOUTUBE_GEO_BLOCKED',
      reason: 'Video is geographically restricted by the uploader or regional licensing.',
      userMessage: 'This YouTube video is geographically restricted in this server’s region. Upload the video file instead.',
      requiresAuth: false,
      requiresPoToken: false,
      rawError: stderr.trim(),
    };
  }

  // 8. Rate Limited
  if (
    lower.includes('http error 429') ||
    lower.includes('too many requests') ||
    lower.includes('rate-limited') ||
    lower.includes('rate limit')
  ) {
    return {
      code: 'YOUTUBE_RATE_LIMITED',
      reason: 'YouTube has temporarily throttled download requests.',
      userMessage: 'YouTube has temporarily rate-limited requests from this server. Please try again later or upload the file.',
      requiresAuth: false,
      requiresPoToken: false,
      rawError: stderr.trim(),
    };
  }

  // 9. Invalid URL
  if (
    lower.includes('incomplete youtube id') ||
    lower.includes('is not a valid url') ||
    lower.includes('unable to extract video data')
  ) {
    return {
      code: 'YOUTUBE_INVALID_URL',
      reason: 'The specified URL is not a recognized YouTube URL format.',
      userMessage: 'Invalid YouTube URL format. Supported formats: youtube.com/watch?v=..., youtu.be/..., or youtube.com/shorts/...',
      requiresAuth: false,
      requiresPoToken: false,
      rawError: stderr.trim(),
    };
  }

  // 10. Dependency Missing
  if (
    lower.includes('downloader not installed') ||
    lower.includes('yt-dlp binary not found') ||
    lower.includes('command not found')
  ) {
    return {
      code: 'YOUTUBE_DEPENDENCY_MISSING',
      reason: 'yt-dlp binary or python runtime is missing from the host environment.',
      userMessage: 'YouTube downloader dependency is not installed on this server. Upload the video file instead.',
      requiresAuth: false,
      requiresPoToken: false,
      rawError: stderr.trim(),
    };
  }

  // Fallback for download failures
  const errLine = stderr.split('\n').find((l) => l.includes('ERROR:'));
  const fallbackReason = errLine ? errLine.replace(/^ERROR:\s*/, '').trim() : 'Media extraction failed on YouTube server';

  return {
    code: exitCode !== 0 ? 'YOUTUBE_DOWNLOAD_FAILED' : 'YOUTUBE_UNKNOWN',
    reason: fallbackReason,
    userMessage: `${fallbackReason}. Upload the video file instead.`,
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

    const candidates = [
      'yt-dlp',
      path.join(process.env.HOME || '', 'Library/Python/3.9/bin/yt-dlp'),
      path.join(process.env.HOME || '', 'Library/Python/3.10/bin/yt-dlp'),
      path.join(process.env.HOME || '', 'Library/Python/3.11/bin/yt-dlp'),
      path.join(process.env.HOME || '', 'Library/Python/3.12/bin/yt-dlp'),
      path.join(process.env.HOME || '', '.local/bin/yt-dlp'),
      '/opt/homebrew/bin/yt-dlp',
      '/usr/local/bin/yt-dlp',
      '/usr/bin/yt-dlp',
    ];

    for (const c of candidates) {
      try {
        execSync(`"${c}" --version`, { stdio: 'ignore' });
        this.cachedPath = c;
        return c;
      } catch {
        // continue
      }
    }

    // Try python3 -m yt_dlp
    try {
      execSync('python3 -m yt_dlp --version', { stdio: 'ignore' });
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
      log('Classification: INVALID_URL', 'error');
      const err = classifyYouTubeError('Invalid YouTube URL');
      return {
        success: false,
        code: 'YOUTUBE_INVALID_URL',
        classifiedError: err,
        error: err.userMessage,
      };
    }

    // 2. Downloader binary availability
    const binary = this.adapter.findBinary();
    if (!binary) {
      log('Classification: DEPENDENCY_MISSING - yt-dlp not found', 'error');
      const err = classifyYouTubeError('yt-dlp binary not found');
      return {
        success: false,
        code: 'YOUTUBE_DEPENDENCY_MISSING',
        classifiedError: err,
        error: err.userMessage,
      };
    }

    const authConfig = getYouTubeAuthConfig();
    const filename = `yt_${videoId}_${Date.now()}.mp4`;
    const outputPath = path.join(targetDir, filename);

    log(`Starting YouTube ingestion for ${canonicalUrl}`);

    // Helper: Execute yt-dlp process
    const runDownloadProcess = (useAuth: boolean): Promise<{ success: boolean; stderr: string; stdout: string; exitCode: number }> => {
      const { cmd, args } = this.adapter.buildArgs(canonicalUrl, outputPath, {
        ffmpegPath: this.ffmpegPath,
        authConfig,
        useAuth,
      });

      return new Promise((resolve) => {
        execFile(cmd, args, { maxBuffer: 25 * 1024 * 1024, timeout: 240000 }, (err, stdout, stderr) => {
          const exitCode = err ? (err as any).code || 1 : 0;
          resolve({
            success: !err && fs.existsSync(outputPath),
            stderr: stderr || '',
            stdout: stdout || '',
            exitCode: typeof exitCode === 'number' ? exitCode : 1,
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
            code: 'DOWNLOAD_INVALID_MEDIA',
            error: 'Downloaded media failed FFprobe validation (no valid video stream). Upload the video file instead.',
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
          code: 'DOWNLOAD_INVALID_MEDIA',
          error: 'Failed to inspect downloaded media with FFprobe. Upload the video file instead.',
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
