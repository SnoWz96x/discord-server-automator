const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const baseUrl = process.env.DASHBOARD_URL || 'http://127.0.0.1:3000';
const outDir = path.join(__dirname, '..', '..', 'docs', 'assets', 'screenshots');

async function main() {
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });

  await page.screenshot({
    path: path.join(outDir, 'dashboard-overview.png'),
    fullPage: true
  });

  await page.locator('#admin').scrollIntoViewIfNeeded();
  await page.screenshot({
    path: path.join(outDir, 'dashboard-admin.png'),
    fullPage: false
  });

  await page.locator('#shop').scrollIntoViewIfNeeded();
  await page.screenshot({
    path: path.join(outDir, 'dashboard-shop.png'),
    fullPage: false
  });

  await browser.close();
  console.log(`Screenshots saved to ${outDir}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
