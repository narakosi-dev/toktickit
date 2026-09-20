import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";

try {
  process.chdir(fs.realpathSync(process.cwd()));
} catch {}

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, fs: { strict: false } },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./tests/setup.ts",
    include: ["tests/**/*.test.tsx"],
  },
});
