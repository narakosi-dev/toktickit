import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";

const OUTPUT_DIR = path.join(process.cwd(), "artifacts/lab-02/screenshots/github");

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const targets = [
  {
    name: "01-github-repo-main.png",
    url: "https://github.com/narakosi-dev/toktickit",
    description: "Repository Main Page & Code Structure",
  },
  {
    name: "02-github-project-board.png",
    url: "https://github.com/users/narakosi-dev/projects/1",
    description: "GitHub Projects Kanban Board (Sprint Planning & Status)",
    waitFor: 4000,
  },
  {
    name: "03-github-issues-list.png",
    url: "https://github.com/narakosi-dev/toktickit/issues?q=is%3Aissue",
    description: "GitHub Issues Tracking List",
  },
  {
    name: "04-github-pull-requests.png",
    url: "https://github.com/narakosi-dev/toktickit/pulls?q=is%3Apr",
    description: "Pull Requests List (Closed & Merged Feature PRs)",
  },
  {
    name: "05-github-release-pr-22.png",
    url: "https://github.com/narakosi-dev/toktickit/pull/22",
    description: "Release PR #22 (lab2-staging into main with Peer Review)",
  },
  {
    name: "06-github-commits-main.png",
    url: "https://github.com/narakosi-dev/toktickit/commits/main",
    description: "Commit History and Linear History on main",
  },
  {
    name: "07-github-branches.png",
    url: "https://github.com/narakosi-dev/toktickit/branches",
    description: "Branch Hierarchy (main, lab2-staging)",
  },
  {
    name: "08-github-pr-22-files-changed.png",
    url: "https://github.com/narakosi-dev/toktickit/pull/22/files",
    description: "Release PR #22 Diffs & Files Changed (+5,591 -106 across 41 files)",
  },
];

async function captureGitHub() {
  console.log("Launching Chromium to capture complete GitHub suite...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.5,
  });

  const page = await context.newPage();

  for (const target of targets) {
    console.log(`Navigating to: ${target.url}`);
    try {
      await page.goto(target.url, { waitUntil: "domcontentloaded", timeout: 20000 });
      await page.waitForTimeout(target.waitFor || 2500);
      const outPath = path.join(OUTPUT_DIR, target.name);
      await page.screenshot({ path: outPath, fullPage: false });
      console.log(`[SUCCESS] Captured: ${target.name} (${target.description})`);
    } catch (err) {
      console.error(`[ERROR] capturing ${target.url}:`, err.message);
    }
  }

  await browser.close();
  console.log("All GitHub screenshots captured successfully!");
}

captureGitHub().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
