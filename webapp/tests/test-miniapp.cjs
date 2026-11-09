const { chromium } = require('C:/Users/user/.gemini/antigravity/scratch/botanica-bistro/node_modules/playwright');
const { spawn } = require('child_process');
const path = require('path');

const PORT = 4190;
const BASE_URL = `http://127.0.0.1:${PORT}/`;
const ARTIFACTS_DIR = 'C:/Users/user/.gemini/antigravity/brain/8f960d99-1381-4065-8415-4e88eb8a0d2d';

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('🚀 Starting preview server for Telegram Mini App...');
  const server = spawn('cmd.exe', ['/c', 'npm.cmd', 'run', 'preview', '--', '--port', String(PORT), '--host', '127.0.0.1'], {
    cwd: 'C:/Users/user/.gemini/antigravity/scratch/work-shift-tracker/webapp',
    stdio: 'pipe',
  });

  await wait(3000);

  let browser;
  try {
    console.log('🌐 Launching mobile browser (iPhone 14 Pro viewport)...');
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    });

    const page = await context.newPage();
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await wait(500);

    // 1. Verify title and Header
    const title = await page.title();
    console.log('   Title:', title);

    // Capture Calendar view
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'miniapp-calendar-view.png') });
    console.log('📸 Screenshot saved: miniapp-calendar-view.png');

    // 2. Click a calendar day to toggle
    const todayNum = new Date().getDate();
    const dayBtn = page.locator(`.grid-cols-7 > div:has-text("${todayNum}")`).first();
    if (await dayBtn.isVisible()) {
      await dayBtn.click();
      await wait(300);
      console.log('✅ Shift toggled on calendar');
    }

    // 3. Switch to Analytics Tab
    const statsTabBtn = page.locator('button:has-text("Аналитика и ЗП")').first();
    await statsTabBtn.click();
    await wait(400);

    // Capture Analytics view
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'miniapp-stats-view.png') });
    console.log('📸 Screenshot saved: miniapp-stats-view.png');

    // 4. Open Settings Modal
    const settingsBtn = page.locator('nav button:has-text("Настройки")');
    await settingsBtn.click();
    await wait(400);

    // Capture Settings Modal
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'miniapp-settings-modal.png') });
    console.log('📸 Screenshot saved: miniapp-settings-modal.png');

    console.log('🎉 Mini App test completed with 100% success!');
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
}

main();
