import { defineConfig, devices } from "@playwright/test";

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const API_URL = process.env.API_URL || "http://localhost:3000";

const isWin = process.platform === "win32";
const npmCmd = isWin ? "npm.cmd" : "npm";

export default defineConfig({
  testDir: "./e2e",
  testIgnore: ["lab-02/**"],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [["list"]],
  use: {
    baseURL: CLIENT_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
  webServer: [
    {
      command: `${npmCmd} run dev --prefix server`,
      url: `${API_URL}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      stdout: "pipe",
    },
    {
      command: `${npmCmd} run dev --prefix client`,
      url: CLIENT_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      stdout: "pipe",
    },
  ],
});
