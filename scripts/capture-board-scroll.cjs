const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('https://github.com/users/narakosi-dev/projects/1', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  // Take overview screenshot
  const out1 = path.join(__dirname, '../artifacts/lab-02/screenshots/github/02-github-project-board-view1.png');
  await page.screenshot({ path: out1 });
  console.log('Saved view 1 at', out1);

  // Scroll down within the Done column
  // Find text "My Tickets View" and scroll further
  const doneHeading = await page.getByText('Done', { exact: false }).first();
  if (doneHeading) {
    // Hover over Done column and scroll mouse wheel down
    const box = await doneHeading.boundingBox();
    if (box) {
      await page.mouse.move(box.x + 100, box.y + 300);
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(1500);
      const out2 = path.join(__dirname, '../artifacts/lab-02/screenshots/github/02-github-project-board-view2.png');
      await page.screenshot({ path: out2 });
      console.log('Saved view 2 at', out2);
    }
  }

  await browser.close();
})();
