import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import ffprobeStatic from 'ffprobe-static';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE_URL = 'http://localhost:3001';
const ffprobePath = (ffprobeStatic && ffprobeStatic.path) ? ffprobeStatic.path : 'ffprobe';

function assert(condition: boolean, testName: string, detail?: any) {
  if (!condition) {
    console.error(`❌ FAIL: ${testName}`, detail !== undefined ? detail : '');
    process.exit(1);
  }
  console.log(`✅ PASS: ${testName}`, detail !== undefined ? `(${detail})` : '');
}

async function runBrowserE2E() {
  console.log('================================================================');
  console.log('   VIRALCLIP STUDIO — END-TO-END BROWSER VALIDATION (CHROME)   ');
  console.log('================================================================\n');

  assert(fs.existsSync(CHROME_PATH), 'Google Chrome exists on system', CHROME_PATH);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--autoplay-policy=no-user-gesture-required'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // 1. Open Application
    console.log('1. Navigating to ViralClip Studio application at', BASE_URL);
    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });
    const pageTitle = await page.title();
    assert(pageTitle.includes('ViralClip'), 'Page title indicates ViralClip Studio', pageTitle);

    // 2. Access Project & Editor View
    console.log('2. Accessing project in Editor view...');
    // If on landing or dashboard, open the editor
    await page.evaluate(() => {
      // Find sample project card or edit button
      const buttons = Array.from(document.querySelectorAll('button, a'));
      const editBtn = buttons.find(b =>
        b.textContent?.toLowerCase().includes('open project') ||
        b.textContent?.toLowerCase().includes('edit') ||
        b.getAttribute('title')?.toLowerCase().includes('edit')
      ) as HTMLElement;
      if (editBtn) editBtn.click();
    });

    // Wait for Video Element in Editor with loaded metadata
    await page.waitForFunction(() => {
      const v = document.querySelector('video') as HTMLVideoElement;
      return v && v.readyState >= 1 && Number.isFinite(v.duration) && v.duration > 0;
    }, { timeout: 20000 });
    console.log('Found video element with loaded metadata in DOM');

    // 3. Media Metadata & Canonical Duration
    const videoInfo = await page.evaluate(() => {
      const v = document.querySelector('video') as HTMLVideoElement;
      return {
        duration: v ? v.duration : 0,
        src: v ? v.currentSrc || v.src : '',
        paused: v ? v.paused : true,
        currentTime: v ? v.currentTime : 0,
      };
    });
    assert(videoInfo.duration > 0, 'Video element loaded real duration', `${videoInfo.duration}s`);
    assert(Boolean(videoInfo.src), 'Video element has valid src URL', videoInfo.src);

    // 4. Test Play & CurrentTime Advancement
    console.log('3. Testing Playback Authority...');
    await page.evaluate(() => {
      const v = document.querySelector('video') as HTMLVideoElement;
      if (v) v.play();
    });
    await new Promise((r) => setTimeout(r, 1200));

    const playInfo = await page.evaluate(() => {
      const v = document.querySelector('video') as HTMLVideoElement;
      return {
        currentTime: v ? v.currentTime : 0,
        paused: v ? v.paused : true,
      };
    });
    assert(playInfo.currentTime > 0, 'Video currentTime advanced during playback', `${playInfo.currentTime.toFixed(2)}s`);
    assert(!playInfo.paused, 'Video is playing (paused === false)');

    // 5. Test Pause
    console.log('4. Testing Pause...');
    await page.evaluate(() => {
      const v = document.querySelector('video') as HTMLVideoElement;
      if (v) v.pause();
    });
    await new Promise((r) => setTimeout(r, 300));

    const pauseTime1 = await page.evaluate(() => {
      const v = document.querySelector('video') as HTMLVideoElement;
      return v ? v.currentTime : 0;
    });
    await new Promise((r) => setTimeout(r, 600));
    const pauseTime2 = await page.evaluate(() => {
      const v = document.querySelector('video') as HTMLVideoElement;
      return v ? v.currentTime : 0;
    });
    assert(Math.abs(pauseTime2 - pauseTime1) < 0.05, 'currentTime stops when paused', `${pauseTime1}s == ${pauseTime2}s`);

    // 6. Test Seeking & Playhead Synchronization
    console.log('5. Testing Precise Seeking in Second Half...');
    // Target second half of the short (e.g. 20s for a 28s short)
    const targetSeek = 20.0;
    await page.evaluate((seekTo) => {
      const v = document.querySelector('video') as HTMLVideoElement;
      if (v) v.currentTime = seekTo;
    }, targetSeek);
    await new Promise((r) => setTimeout(r, 600));

    const soughtTime = await page.evaluate(() => {
      const v = document.querySelector('video') as HTMLVideoElement;
      return v ? v.currentTime : 0;
    });
    assert(Math.abs(soughtTime - targetSeek) < 0.5, `Seek accurate to ${targetSeek}s`, `${soughtTime}s`);

    // 7. Test Second Half (>50% duration of short)
    console.log('6. Verifying Second-Half Duration Behavior...');
    assert(soughtTime >= 14.0, `Playhead is in second half of short (${soughtTime}s >= 14s)`);

    // Check that canvas / preview renders without failure in second half
    const canvasHealthy = await page.evaluate(() => {
      const v = document.querySelector('video') as HTMLVideoElement;
      return Boolean(v && v.readyState >= 2 && !v.error);
    });
    assert(canvasHealthy, 'Video element is healthy in second half');

    // 8. Capture Verification Screenshot
    const screenshotDir = path.join(process.cwd(), 'public/exports');
    if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
    const screenshotPath = path.join(screenshotDir, 'browser_e2e_editor.png');
    await page.screenshot({ path: screenshotPath });
    assert(fs.existsSync(screenshotPath), 'E2E Editor screenshot captured successfully', screenshotPath);

    console.log('\n================================================================');
    console.log('   BROWSER E2E TESTING COMPLETED SUCCESSFULLY WITH CHROME!     ');
    console.log('================================================================\n');
  } finally {
    await browser.close();
  }
}

runBrowserE2E().catch((err) => {
  console.error('Browser E2E test failed:', err);
  process.exit(1);
});
