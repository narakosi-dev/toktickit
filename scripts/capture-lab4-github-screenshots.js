import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";

const OUTPUT_DIR = path.join(process.cwd(), "artifacts/lab-04/screenshots/github");

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const targets = [
  {
    name: "01-github-repo-lab4.png",
    url: "https://github.com/narakosi-dev/toktickit/tree/lab4-staging",
    description: "Repository Staging Page & Directory Structure on lab4-staging",
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
    description: "GitHub Issues Tracking List (Issues #49 through #61)",
  },
  {
    name: "04-github-pull-requests.png",
    url: "https://github.com/narakosi-dev/toktickit/pulls?q=is%3Apr",
    description: "Pull Requests List (Closed & Merged Feature PRs #62-#76)",
  },
  {
    name: "05-github-commits-staging.png",
    url: "https://github.com/narakosi-dev/toktickit/commits/lab4-staging",
    description: "Commit History and Linear Staged Integration on lab4-staging",
  },
  {
    name: "06-github-branches.png",
    url: "https://github.com/narakosi-dev/toktickit/branches",
    description: "Branch Hierarchy (main, lab4-staging, feature branches)",
  },
  {
    name: "07-github-pr-75-merged.png",
    url: "https://github.com/narakosi-dev/toktickit/pull/75",
    description: "PR #75 Merged with Peer Review Approval by Sxr1n",
  },
  {
    name: "08-github-pr-76-merged.png",
    url: "https://github.com/narakosi-dev/toktickit/pull/76",
    description: "PR #76 Merged with Peer Review Approval by Sxr1n",
  },
  {
    name: "09-github-actions-runs.png",
    url: "https://github.com/narakosi-dev/toktickit/actions",
    description: "GitHub Actions CI All Green Runs on lab4-staging",
  },
];

async function captureGitHub() {
  console.log("Launching Chromium to capture complete GitHub suite for Lab 4...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.5,
  });

  const page = await context.newPage();

  for (const target of targets) {
    console.log(`Navigating to: ${target.url}`);
    try {
      await page.goto(target.url, { waitUntil: "domcontentloaded", timeout: 25000 });
      await page.waitForTimeout(target.waitFor || 3000);
      const outPath = path.join(OUTPUT_DIR, target.name);
      await page.screenshot({ path: outPath, fullPage: false });
      console.log(`[SUCCESS] Captured: ${target.name} (${target.description})`);
    } catch (err) {
      console.error(`[ERROR] capturing ${target.url}:`, err.message);
    }
  }

  await browser.close();
  console.log("GitHub capture complete!");
}

captureGitHub().catch(console.error);
