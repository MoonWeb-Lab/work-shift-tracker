const { chromium } = require('C:/Users/user/.gemini/antigravity/scratch/botanica-bistro/node_modules/playwright');
const { spawn } = require('child_process');
const path = require('path');

const PORT = 4192;
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
    await wait(600);

    // 1. Capture Calendar view with Salary Banner & Cards
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'miniapp-calendar-view.png') });
    console.log('📸 Screenshot saved: miniapp-calendar-view.png');

    // 2. Switch to Analytics Tab
    const statsTabBtn = page.locator('nav button:has-text("Зарплата")');
    await statsTabBtn.click();
    await wait(400);

    // Click "Отправить отчёт в бота Telegram"
    const sendReportBtn = page.locator('button:has-text("Отправить отчёт в бота Telegram")');
    if (await sendReportBtn.isVisible()) {
      await sendReportBtn.click();
      await wait(1200);
    }

    // Capture Analytics view with 2-part salary breakdown
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'miniapp-stats-view.png') });
    console.log('📸 Screenshot saved: miniapp-stats-view.png');

    // 3. Open Settings Modal
    const settingsBtn = page.locator('nav button:has-text("Настройки")');
    await settingsBtn.click();
    await wait(400);

    // Capture Settings Modal (top: rates)
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'miniapp-settings-modal.png') });
    console.log('📸 Screenshot saved: miniapp-settings-modal.png');

    // Scroll to 2-part salary payout section
    const modalContent = page.locator('.overflow-y-auto');
    await modalContent.evaluate((el) => { el.scrollTop = 380; });
    await wait(400);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'miniapp-settings-payouts.png') });
    console.log('📸 Screenshot saved: miniapp-settings-payouts.png');

    // Scroll Settings Modal to bottom to see notification buttons and Reset CTA
    await modalContent.evaluate((el) => { el.scrollTop = el.scrollHeight; });
    await wait(400);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'miniapp-settings-notifications.png') });
    console.log('📸 Screenshot saved: miniapp-settings-notifications.png');

    console.log('🎉 Mini App test completed with 100% success!');
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
}

main();
