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

    // Inject a visible cursor that tracks mouse movements
    await page.addInitScript(() => {
      const style = document.createElement("style");
      style.textContent = `
        #pw-cursor {
          position: fixed;
          z-index: 999999;
          pointer-events: none;
          width: 24px;
          height: 24px;
          transform: translate(-3px, -1px);
          transition: filter 0.1s;
          filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
        }
        #pw-cursor.clicking {
          filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3)) brightness(0.8);
        }
        * { cursor: none !important; }
      `;
      document.addEventListener("DOMContentLoaded", () => {
        document.head.appendChild(style);
        const cursor = document.createElement("div");
        cursor.id = "pw-cursor";
        cursor.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 3l14 8.5L12 14l-2 7L5 3z" fill="white" stroke="black" stroke-width="1.5" stroke-linejoin="round"/></svg>';
        document.body.appendChild(cursor);
        document.addEventListener("mousemove", (e) => {
          cursor.style.left = e.clientX + "px";
          cursor.style.top = e.clientY + "px";
        });
        document.addEventListener("mousedown", () => cursor.classList.add("clicking"));
        document.addEventListener("mouseup", () => cursor.classList.remove("clicking"));
      });
    });

    // ============================================================
    // ACT 1: LOGIN
    // ============================================================
    await page.goto(BASE_URL);
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.mouse.move(720, 450, { steps: 5 });
    await pause(page, 1000);

    // Type email
    await typeSlowly(page, 'input[type="email"]', EMAIL, 35);
    await pause(page, 300);

    // Type password
    await typeSlowly(page, 'input[type="password"]', PASSWORD, 40);
    await pause(page, 300);

    // Click sign in
    await smoothClick(page, 'button[type="submit"]');
    await page.waitForSelector('[role="treeitem"]', { timeout: 15000 });
    await pause(page, 1500);

    // ============================================================
    // ACT 2: INBOX - Browse emails
    // ============================================================

    // Click through several emails quickly
    await smoothClick(page, '.message-list-item:nth-child(1)');
    await pause(page, 1200);

    await smoothClick(page, '.message-list-item:nth-child(2)');
    await pause(page, 1000);

    await smoothClick(page, '.message-list-item:nth-child(3)');
    await pause(page, 1000);

    await smoothClick(page, '.message-list-item:nth-child(5)');
    await pause(page, 800);

    // Try to expand a thread if one exists
    const threadHeader = page.locator('.message-list-item--thread-header').first();
    if (await threadHeader.isVisible({ timeout: 1000 }).catch(() => false)) {
      await glide(page, '.message-list-item--thread-header');
      await threadHeader.click();
      await pause(page, 1200);
      // Click a child message in the expanded thread
      const threadChild = page.locator('.message-list-item--thread-child').first();
      if (await threadChild.isVisible({ timeout: 1000 }).catch(() => false)) {
        await threadChild.click();
        await pause(page, 1000);
      }
    } else {
      // No thread, just click one more email
      await smoothClick(page, '.message-list-item:nth-child(4)');
      await pause(page, 800);
    }

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

    // Open AI copilot — try multiple selectors
    const aiSelectors = [
      'button[aria-label*="AI"]',
      'button[aria-label*="Copilot"]',
      'button[aria-label*="Assistant"]',
    ];
    let aiClicked = false;
    for (const sel of aiSelectors) {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await glide(page, sel);
        await btn.click();
        aiClicked = true;
        break;
      }
    }
    await pause(page, 2000);

    // Click Summarize if AI panel opened
    if (aiClicked) {
      const summarizeBtn = page.locator('button').filter({ hasText: /Summarize|Oppsummer|key points/ }).first();
      if (await summarizeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await glide(page, 'button:has-text("Summarize")');
        await summarizeBtn.click();
      }
    }
    // Always wait the full duration for timing consistency
    await pause(page, 5000);

    // Close copilot
    if (aiClicked) {
      for (const sel of aiSelectors) {
        const btn = page.locator(sel).first();
        if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
          await btn.click();
          break;
        }
      }
    }
    await pause(page, 1000);

    // ============================================================
    // ACT 9: DARK MODE TOGGLE
    // ============================================================

    await page.evaluate(() => document.documentElement.classList.add("dark"));
    await pause(page, 3000);

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
