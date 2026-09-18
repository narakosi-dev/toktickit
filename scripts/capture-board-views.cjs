const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto('https://github.com/users/narakosi-dev/projects/1', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  // View 1: Left overview
  const out1 = path.join(__dirname, '../artifacts/lab-02/screenshots/github/02-github-project-board-view1.png');
  await page.screenshot({ path: out1 });
  console.log('Saved view 1 at', out1);

  // View 2: Mid scroll
  await page.mouse.wheel(600, 0);
  await page.waitForTimeout(1500);
  const out2 = path.join(__dirname, '../artifacts/lab-02/screenshots/github/02-github-project-board-view2.png');
  await page.screenshot({ path: out2 });
  console.log('Saved view 2 at', out2);

  // View 3: Done column focused
  await page.mouse.wheel(1200, 0);
  await page.waitForTimeout(1500);
  const out3 = path.join(__dirname, '../artifacts/lab-02/screenshots/github/02-github-project-board-view3.png');
  await page.screenshot({ path: out3 });
  console.log('Saved view 3 at', out3);

  await browser.close();
})();
