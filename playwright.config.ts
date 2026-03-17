import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: ["capture-screenshots.ts", "record-walkthrough.ts"],
  timeout: 120_000, // walkthrough takes longer
  expect: { timeout: 10_000 },
  retries: 0,
  reporter: "list",
  use: {
    headless: true,
    screenshot: "off",
    actionTimeout: 10_000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 2,
      },
    },
  ],
});
