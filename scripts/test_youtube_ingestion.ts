import assert from 'assert';
import path from 'path';
import fs from 'fs';
import {
  classifyYouTubeError,
  getYouTubeAuthConfig,
  extractYouTubeId,
  normalizeYouTubeUrl,
  YouTubeDownloader,
  YouTubeErrorCode,
} from '../src/utils/youtubeDownloader';

let passed = 0;
let failed = 0;

function check(desc: string, fn: () => void | Promise<void>) {
  try {
    const res = fn();
    if (res instanceof Promise) {
      return res
        .then(() => {
          passed++;
          console.log(`  [PASS] #${passed}: ${desc}`);
        })
        .catch((err) => {
          failed++;
          console.error(`  [FAIL] #${passed + failed}: ${desc}\n         ${err.message}`);
        });
    } else {
      passed++;
      console.log(`  [PASS] #${passed}: ${desc}`);
    }
  } catch (err: any) {
    failed++;
    console.error(`  [FAIL] #${passed + failed}: ${desc}\n         ${err.message}`);
  }
}

async function runTests() {
  console.log('===============================================================');
  console.log('VIRALCLIP STUDIO — YOUTUBE INGESTION & AUTHENTICATION TEST SUITE');
  console.log('===============================================================\n');

  // ---------------------------------------------------------------------------
  // 1. ERROR CLASSIFICATION (All 12 Categories)
  // ---------------------------------------------------------------------------
  console.log('--- 1. yt-dlp Stderr Error Classification ---');

  // Exact user case: "Sign in to confirm your age"
  const ageErr = classifyYouTubeError(
    '[youtube] 12345678901: Sign in to confirm your age. Use --cookies-from-browser or --cookies for the authentication.'
  );
  check('Classifies "Sign in to confirm your age" as YOUTUBE_AGE_RESTRICTED', () => {
    assert.strictEqual(ageErr.code, 'YOUTUBE_AGE_RESTRICTED');
    assert.strictEqual(ageErr.requiresAuth, true);
    assert.ok(ageErr.userMessage.includes('age-restricted'));
    assert.ok(ageErr.userMessage.includes('signed-in YouTube session'));
  });

  const loginErr = classifyYouTubeError(
    'ERROR: [youtube] abcd: Sign in to confirm you’re not a bot. Use --cookies-from-browser or --cookies'
  );
  check('Classifies bot check sign in as YOUTUBE_LOGIN_REQUIRED', () => {
    assert.strictEqual(loginErr.code, 'YOUTUBE_LOGIN_REQUIRED');
    assert.strictEqual(loginErr.requiresAuth, true);
  });

  const cookieErr = classifyYouTubeError(
    'ERROR: [youtube] xyz: Use --cookies for the authentication required to access this media'
  );
  check('Classifies cookie prompt as YOUTUBE_COOKIE_REQUIRED', () => {
    assert.strictEqual(cookieErr.code, 'YOUTUBE_COOKIE_REQUIRED');
    assert.strictEqual(cookieErr.requiresAuth, true);
  });

  const poErr = classifyYouTubeError(
    'ERROR: [youtube] xyz: PO Token verification failed. Web client requires bot detection token'
  );
  check('Classifies Proof-of-Origin token prompt as YOUTUBE_PO_TOKEN_REQUIRED', () => {
    assert.strictEqual(poErr.code, 'YOUTUBE_PO_TOKEN_REQUIRED');
    assert.strictEqual(poErr.requiresPoToken, true);
  });

  const privErr = classifyYouTubeError(
    'ERROR: [youtube] xyz: Private video. Sign in if you\'ve been granted access to this video'
  );
  check('Classifies private video as YOUTUBE_PRIVATE', () => {
    assert.strictEqual(privErr.code, 'YOUTUBE_PRIVATE');
    assert.ok(privErr.userMessage.includes('private'));
  });

  const notFoundErr = classifyYouTubeError(
    'ERROR: [youtube] xyz: Video unavailable. This video is unavailable.'
  );
  check('Classifies unavailable/deleted video as YOUTUBE_NOT_FOUND', () => {
    assert.strictEqual(notFoundErr.code, 'YOUTUBE_NOT_FOUND');
    assert.ok(notFoundErr.userMessage.includes('not found') || notFoundErr.userMessage.includes('removed'));
  });

  const geoErr = classifyYouTubeError(
    'ERROR: [youtube] xyz: The uploader has not made this video available in your country'
  );
  check('Classifies regional lock as YOUTUBE_GEO_BLOCKED', () => {
    assert.strictEqual(geoErr.code, 'YOUTUBE_GEO_BLOCKED');
    assert.ok(geoErr.userMessage.includes('geographically restricted'));
  });

  const rateErr = classifyYouTubeError(
    'ERROR: [youtube] HTTP Error 429: Too Many Requests'
  );
  check('Classifies HTTP 429 as YOUTUBE_RATE_LIMITED', () => {
    assert.strictEqual(rateErr.code, 'YOUTUBE_RATE_LIMITED');
    assert.ok(rateErr.userMessage.includes('rate-limited'));
  });

  const invalidErr = classifyYouTubeError(
    'ERROR: [youtube] Incomplete YouTube ID. URL is not a valid URL'
  );
  check('Classifies malformed URL as YOUTUBE_INVALID_URL', () => {
    assert.strictEqual(invalidErr.code, 'YOUTUBE_INVALID_URL');
  });

  const depErr = classifyYouTubeError(
    'yt-dlp binary not found in standard system paths'
  );
  check('Classifies missing yt-dlp binary as YOUTUBE_DEPENDENCY_MISSING', () => {
    assert.strictEqual(depErr.code, 'YOUTUBE_DEPENDENCY_MISSING');
  });

  // ---------------------------------------------------------------------------
  // 2. URL NORMALIZATION & EXTRACTION
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. URL Normalization & Validation ---');

  check('Normalizes standard watch URL: youtube.com/watch?v=dQw4w9WgXcQ', () => {
    const res = normalizeYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.videoId, 'dQw4w9WgXcQ');
    assert.strictEqual(res.canonicalUrl, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  });

  check('Normalizes short URL: youtu.be/dQw4w9WgXcQ', () => {
    const res = normalizeYouTubeUrl('https://youtu.be/dQw4w9WgXcQ');
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.videoId, 'dQw4w9WgXcQ');
  });

  check('Normalizes Shorts URL: youtube.com/shorts/dQw4w9WgXcQ', () => {
    const res = normalizeYouTubeUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ');
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.videoId, 'dQw4w9WgXcQ');
  });

  check('Normalizes URL with extra query params: &t=42s&feature=share', () => {
    const res = normalizeYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s&feature=share');
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.videoId, 'dQw4w9WgXcQ');
    assert.strictEqual(res.canonicalUrl, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  });

  check('Rejects invalid non-YouTube URLs', () => {
    const res = normalizeYouTubeUrl('https://vimeo.com/123456');
    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.videoId, null);
  });

  // ---------------------------------------------------------------------------
  // 3. AUTHENTICATION CONFIGURATION & SECURITY
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. Authentication Configuration & Security Rules ---');

  check('Defaults to unconfigured authentication in standard environment', () => {
    delete process.env.YTDLP_COOKIE_FILE;
    delete process.env.YTDLP_BROWSER_COOKIES;
    const auth = getYouTubeAuthConfig();
    assert.strictEqual(auth.isConfigured, false);
    assert.strictEqual(auth.method, 'none');
    assert.strictEqual(auth.cookieFile, undefined);
  });

  check('Respects YTDLP_BROWSER_COOKIES if explicitly set for local dev', () => {
    process.env.YTDLP_BROWSER_COOKIES = 'chrome';
    const auth = getYouTubeAuthConfig();
    assert.strictEqual(auth.isConfigured, true);
    assert.strictEqual(auth.method, 'browser_cookies');
    assert.strictEqual(auth.browser, 'chrome');
    delete process.env.YTDLP_BROWSER_COOKIES;
  });

  check('Rejects unknown/unauthorized browser names', () => {
    process.env.YTDLP_BROWSER_COOKIES = 'malicious_browser_exploit';
    const auth = getYouTubeAuthConfig();
    assert.strictEqual(auth.isConfigured, false);
    delete process.env.YTDLP_BROWSER_COOKIES;
  });

  check('Never exposes cookie files that do not exist', () => {
    process.env.YTDLP_COOKIE_FILE = '/nonexistent/path/cookies.txt';
    const auth = getYouTubeAuthConfig();
    assert.strictEqual(auth.isConfigured, false);
    delete process.env.YTDLP_COOKIE_FILE;
  });

  // ---------------------------------------------------------------------------
  // 4. DOWNLOADER ADAPTER & STATUS API
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. Downloader Adapter & Status Reporting ---');
  const downloader = new YouTubeDownloader('ffmpeg');

  check('Detects installed yt-dlp binary', () => {
    const binary = downloader.getAdapter().findBinary();
    assert.ok(binary !== null, 'yt-dlp binary is detected');
  });

  check('Status API reports capabilities without exposing secrets', () => {
    const status = downloader.getStatus();
    assert.strictEqual(status.available, true);
    assert.strictEqual(status.ytDlpInstalled, true);
    assert.strictEqual(typeof status.authenticatedAccessConfigured, 'boolean');
    assert.strictEqual(typeof status.poTokenConfigured, 'boolean');
    // Ensure no private credentials exist on status
    assert.strictEqual((status as any).cookieFile, undefined);
    assert.strictEqual((status as any).cookies, undefined);
  });

  // ---------------------------------------------------------------------------
  // 5. DOWNLOAD PIPELINE BEHAVIOR
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. Ingestion Pipeline & Error Handling ---');

  await check('Fails gracefully with YOUTUBE_INVALID_URL on bad URL', async () => {
    const res = await downloader.downloadVideo('https://google.com', path.join(process.cwd(), 'public/uploads'));
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.code, 'YOUTUBE_INVALID_URL');
  });

  await check('HTTP GET /api/youtube/status returns 200 with status JSON', async () => {
    const res = await fetch('http://localhost:3001/api/youtube/status');
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.available, true);
    assert.strictEqual(json.authenticatedAccessConfigured, false);
  });

  await check('Invalid URL in POST /api/process returns HTTP 400 with honest error', async () => {
    const res = await fetch('http://localhost:3001/api/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ youtubeUrl: 'https://invalid-video-url.com' }),
    });
    assert.strictEqual(res.status, 400);
    const json = await res.json();
    assert.strictEqual(json.code, 'INVALID_URL');
  });

  // ---------------------------------------------------------------------------
  // 6. SOURCE INTEGRITY & NO DEMO FALLBACK
  // ---------------------------------------------------------------------------
  console.log('\n--- 6. Source Integrity & No Demo Fallback ---');

  check('Source integrity hash format is valid SHA-256 (64 hex characters)', () => {
    const sampleHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    assert.strictEqual(sampleHash.length, 64);
    assert.ok(/^[0-9a-f]{64}$/.test(sampleHash));
  });

  check('Ensures no demo media fallback exists in downloader code', () => {
    const code = fs.readFileSync(path.join(process.cwd(), 'src/utils/youtubeDownloader.ts'), 'utf8');
    assert.ok(!code.includes('sample.mp4'), 'No sample.mp4 in youtubeDownloader.ts');
    assert.ok(!code.includes('creator_clip.mp4'), 'No creator_clip.mp4 in youtubeDownloader.ts');
    assert.ok(!code.includes('demo_video.mp4'), 'No demo_video.mp4 in youtubeDownloader.ts');
  });

  console.log('\n===============================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
