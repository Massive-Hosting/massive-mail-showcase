/**
 * Cinematic walkthrough recording of Massive Mail.
 *
 * Records a smooth, choreographed tour through all major features.
 * Outputs a WebM video that gets converted to MP4 via ffmpeg.
 *
 * Usage: npx playwright test record-walkthrough.ts --config=playwright.config.ts
 */

import { test, type Page } from "@playwright/test";
import path from "path";
import { execSync } from "child_process";

const BASE_URL = "https://webmail.massive-hosting.com";
const EMAIL = "info@acme.customer.mhst.io";
const PASSWORD = "test1234";
const OUTPUT_DIR = path.join(__dirname, "video");

/** Smooth mouse move to an element's center */
async function glide(page: Page, selector: string, opts?: { offset?: { x: number; y: number } }) {
  const el = page.locator(selector).first();
  if (!(await el.isVisible({ timeout: 3000 }).catch(() => false))) return;
  const box = await el.boundingBox();
  if (!box) return;
  const x = box.x + box.width / 2 + (opts?.offset?.x ?? 0);
  const y = box.y + box.height / 2 + (opts?.offset?.y ?? 0);
  await page.mouse.move(x, y, { steps: 25 });
  await page.waitForTimeout(200);
}

/** Smooth click on an element */
async function smoothClick(page: Page, selector: string) {
  await glide(page, selector);
  const el = page.locator(selector).first();
  if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
    await el.click();
  }
}

/** Type text character by character with delay */
async function typeSlowly(page: Page, selector: string, text: string, delay = 60) {
  const el = page.locator(selector).first();
  if (!(await el.isVisible({ timeout: 2000 }).catch(() => false))) return;
  await el.click();
  for (const char of text) {
    await page.keyboard.type(char, { delay });
  }
}

/** Pause for dramatic effect */
async function pause(page: Page, ms = 1500) {
  await page.waitForTimeout(ms);
}

test.describe("Walkthrough Recording", () => {
  test("Full feature tour", async ({ browser }) => {
    // Create context with video recording
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
      recordVideo: {
        dir: OUTPUT_DIR,
        size: { width: 1440, height: 900 },
      },
    });

    const page = await context.newPage();

    // ============================================================
    // ACT 1: LOGIN
    // ============================================================
    await page.goto(BASE_URL);
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await pause(page, 1500);

    // Type email elegantly
    await typeSlowly(page, 'input[type="email"]', EMAIL, 40);
    await pause(page, 500);

    // Type password
    await typeSlowly(page, 'input[type="password"]', PASSWORD, 50);
    await pause(page, 500);

    // Click sign in
    await smoothClick(page, 'button[type="submit"]');
    await page.waitForSelector('[role="treeitem"]', { timeout: 15000 });
    await pause(page, 2000);

    // ============================================================
    // ACT 2: INBOX - Browse emails
    // ============================================================

    // Click first email to open reading pane
    await smoothClick(page, '.message-list-item:nth-child(1)');
    await pause(page, 2500);

    // Click second email
    await smoothClick(page, '.message-list-item:nth-child(2)');
    await pause(page, 2000);

    // Click third email
    await smoothClick(page, '.message-list-item:nth-child(3)');
    await pause(page, 2000);

    // ============================================================
    // ACT 3: COMPOSE with Schedule Send
    // ============================================================

    // Click New Mail
    await smoothClick(page, '.action-bar__btn--primary');
    await pause(page, 1500);

    // Type a recipient
    const recipientInput = page.locator('input[placeholder*="Add recipients"], input[placeholder*="Legg til"]').first();
    if (await recipientInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await recipientInput.click();
      await page.keyboard.type("team@example.com", { delay: 30 });
      await page.keyboard.press("Enter");
      await pause(page, 500);
    }

    // Type subject
    const subjectInput = page.locator('input[placeholder*="Subject"], input[placeholder*="Emne"]').first();
    if (await subjectInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await subjectInput.click();
      await page.keyboard.type("Weekly sync notes", { delay: 40 });
      await pause(page, 500);
    }

    // Show the schedule send dropdown briefly
    const scheduleBtn = page.locator('.compose-dialog__send-btn--dropdown');
    if (await scheduleBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await glide(page, '.compose-dialog__send-btn--dropdown');
      await pause(page, 500);
      await scheduleBtn.click();
      await pause(page, 2000);
      await page.keyboard.press("Escape");
    }

    await pause(page, 500);

    // Close compose
    await page.keyboard.press("Escape");
    await pause(page, 500);
    // Dismiss any unsaved changes dialog
    const discardBtn = page.locator('button').filter({ hasText: /Discard|Forkast/ }).first();
    if (await discardBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await discardBtn.click();
    }
    await pause(page, 1000);

    // ============================================================
    // ACT 4: SEARCH
    // ============================================================

    const searchInput = page.locator('#search-input, input[placeholder*="Search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.click();
      await page.keyboard.type("invoice", { delay: 80 });
      await pause(page, 2000);
      // Clear
      await page.keyboard.press("Escape");
      await pause(page, 500);
    }

    // ============================================================
    // ACT 5: CONTEXT MENU
    // ============================================================

    const firstMsg = page.locator('.message-list-item').first();
    if (await firstMsg.isVisible()) {
      await firstMsg.click({ button: "right" });
      await pause(page, 2000);
      await page.keyboard.press("Escape");
      await pause(page, 800);
    }

    // ============================================================
    // ACT 6: CALENDAR
    // ============================================================

    // Switch to calendar
    await smoothClick(page, '.activity-bar__icon:nth-child(3)');
    await pause(page, 2500);

    // Switch to week view
    const weekBtn = page.locator('button').filter({ hasText: /^Week$/ }).first();
    if (await weekBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await smoothClick(page, 'button:has-text("Week")');
      await pause(page, 2000);
    }

    // Back to month
    const monthBtn = page.locator('button').filter({ hasText: /^Month$/ }).first();
    if (await monthBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await smoothClick(page, 'button:has-text("Month")');
      await pause(page, 1500);
    }

    // ============================================================
    // ACT 7: CONTACTS
    // ============================================================

    await smoothClick(page, '.activity-bar__icon:nth-child(2)');
    await pause(page, 2500);

    // Click a contact if available
    const contactRow = page.locator('button, [role="option"]').filter({ hasText: /@/ }).first();
    if (await contactRow.isVisible({ timeout: 2000 }).catch(() => false)) {
      await contactRow.click();
      await pause(page, 2000);
    }

    // ============================================================
    // ACT 8: BACK TO MAIL + AI COPILOT
    // ============================================================

    await smoothClick(page, '.activity-bar__icon:nth-child(1)');
    await pause(page, 1500);

    // Select an email
    await smoothClick(page, '.message-list-item:nth-child(1)');
    await pause(page, 1500);

    // Open AI copilot
    const aiBtn = page.locator('button[aria-label*="AI"]').first();
    if (await aiBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await smoothClick(page, 'button[aria-label*="AI"]');
      await pause(page, 2000);

      // Click Summarize
      const summarizeBtn = page.locator('button').filter({ hasText: /Summarize|Oppsummer/ }).first();
      if (await summarizeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await smoothClick(page, 'button:has-text("Summarize")');
        await pause(page, 5000); // Let AI respond
      }

      // Close copilot
      await smoothClick(page, 'button[aria-label*="AI"]');
      await pause(page, 1000);
    }

    // ============================================================
    // ACT 9: DARK MODE TOGGLE
    // ============================================================

    // Toggle dark mode via JS for smooth transition
    await page.evaluate(() => document.documentElement.classList.add("dark"));
    await pause(page, 3000);

    // Back to light
    await page.evaluate(() => document.documentElement.classList.remove("dark"));
    await pause(page, 2000);

    // ============================================================
    // ACT 10: KEYBOARD SHORTCUTS
    // ============================================================

    await page.keyboard.press("?");
    await pause(page, 2500);
    await page.keyboard.press("Escape");
    await pause(page, 1500);

    // ============================================================
    // FINALE: Hold on inbox
    // ============================================================
    await pause(page, 2000);

    // Close context and save video
    await context.close();

    // Convert WebM to MP4
    const fs = await import("fs");
    const files = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith(".webm"));
    if (files.length > 0) {
      const webmPath = path.join(OUTPUT_DIR, files[files.length - 1]);
      const mp4Path = path.join(__dirname, "walkthrough.mp4");
      console.log(`Converting ${webmPath} → ${mp4Path}`);
      execSync(
        `ffmpeg -y -i "${webmPath}" -c:v libx264 -preset slow -crf 22 -pix_fmt yuv420p -movflags +faststart -an "${mp4Path}"`,
        { stdio: "inherit" }
      );
      console.log(`✓ Video saved to ${mp4Path}`);
    }
  });
});
