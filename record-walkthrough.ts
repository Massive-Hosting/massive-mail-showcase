/**
 * Cinematic walkthrough recording of Massive Mail.
 * Emits timestamp markers for precise narration sync.
 */

import { test, type Page } from "@playwright/test";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";

const BASE_URL = "https://webmail.massive-hosting.com";
const EMAIL = "info@acme.customer.mhst.io";
const PASSWORD = "test1234";
const OUTPUT_DIR = path.join(__dirname, "video");
const DESKTOP = { width: 1440, height: 900 };
const MARKERS_FILE = path.join(__dirname, "markers.json");

// Timing markers — written during recording, read by narration script
const markers: Record<string, number> = {};
let recordingStartTime = 0;

function mark(name: string) {
  markers[name] = (Date.now() - recordingStartTime) / 1000;
  console.log(`  [${markers[name].toFixed(1)}s] ${name}`);
}

async function glide(page: Page, selector: string) {
  const el = page.locator(selector).first();
  if (!(await el.isVisible({ timeout: 2000 }).catch(() => false))) return;
  const box = await el.boundingBox();
  if (!box) return;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 20 });
  await page.waitForTimeout(150);
}

async function smoothClick(page: Page, selector: string) {
  await glide(page, selector);
  const el = page.locator(selector).first();
  if (await el.isVisible({ timeout: 1500 }).catch(() => false)) {
    await el.click();
  }
}

async function typeText(page: Page, selector: string, text: string, delay = 35) {
  const el = page.locator(selector).first();
  if (!(await el.isVisible({ timeout: 2000 }).catch(() => false))) return;
  await el.click();
  for (const char of text) {
    await page.keyboard.type(char, { delay });
  }
}

async function pause(page: Page, ms = 1500) {
  await page.waitForTimeout(ms);
}

test.describe("Walkthrough Recording", () => {
  test("Full feature tour", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: DESKTOP,
      deviceScaleFactor: 2,
      recordVideo: { dir: OUTPUT_DIR, size: DESKTOP },
    });

    const page = await context.newPage();

    // Inject cursor
    await page.addInitScript(() => {
      const style = document.createElement("style");
      style.textContent = `
        #pw-cursor {
          position: fixed; z-index: 999999; pointer-events: none;
          width: 24px; height: 24px;
          transform: translate(-3px, -1px);
          filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
          transition: filter 0.1s;
        }
        #pw-cursor.clicking { filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3)) brightness(0.7); }
        * { cursor: none !important; }
      `;
      document.addEventListener("DOMContentLoaded", () => {
        document.head.appendChild(style);
        const c = document.createElement("div");
        c.id = "pw-cursor";
        c.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M5 3l14 8.5L12 14l-2 7L5 3z" fill="white" stroke="black" stroke-width="1.5" stroke-linejoin="round"/></svg>';
        document.body.appendChild(c);
        document.addEventListener("mousemove", e => { c.style.left = e.clientX + "px"; c.style.top = e.clientY + "px"; });
        document.addEventListener("mousedown", () => c.classList.add("clicking"));
        document.addEventListener("mouseup", () => c.classList.remove("clicking"));
      });
    });

    // ========== START RECORDING ==========
    await page.goto(BASE_URL);
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.mouse.move(720, 450, { steps: 5 });
    recordingStartTime = Date.now();

    // --- LOGIN ---
    mark("login");
    await pause(page, 800);
    await typeText(page, 'input[type="email"]', EMAIL, 30);
    await pause(page, 200);
    await typeText(page, 'input[type="password"]', PASSWORD, 35);
    await pause(page, 200);
    await smoothClick(page, 'button[type="submit"]');
    await page.waitForSelector('[role="treeitem"]', { timeout: 15000 });
    await pause(page, 1200);

    // --- INBOX ---
    mark("inbox");

    // Click through emails using .all() to get actual visible items
    const allMessages = page.locator('.message-list-item');
    const msgCount = await allMessages.count();
    console.log(`  Found ${msgCount} messages in list`);

    // Click first 5 messages (or as many as available) with quick pacing
    for (let i = 0; i < Math.min(5, msgCount); i++) {
      const msg = allMessages.nth(i);
      if (await msg.isVisible({ timeout: 500 }).catch(() => false)) {
        const box = await msg.boundingBox();
        if (box) {
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 15 });
          await page.waitForTimeout(100);
          await msg.click();
          await pause(page, i === 0 ? 1000 : 700); // slightly longer on first
        }
      }
    }

    // Try to expand a thread
    const threadHeader = page.locator('.message-list-item--thread-header').first();
    if (await threadHeader.isVisible({ timeout: 800 }).catch(() => false)) {
      const box = await threadHeader.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 15 });
        await threadHeader.click();
        await pause(page, 800);
        const threadChild = page.locator('.message-list-item--thread-child').first();
        if (await threadChild.isVisible({ timeout: 800 }).catch(() => false)) {
          await threadChild.click();
          await pause(page, 700);
        }
      }
    }

    // --- COMPOSE ---
    mark("compose");
    await smoothClick(page, '.action-bar__btn--primary');
    await pause(page, 1200);

    const recipientInput = page.locator('input[placeholder*="Add recipients"], input[placeholder*="Legg til"]').first();
    if (await recipientInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await recipientInput.click();
      await page.keyboard.type("team@example.com", { delay: 25 });
      await page.keyboard.press("Enter");
      await pause(page, 300);
    }

    const subjectInput = page.locator('input[placeholder*="Subject"], input[placeholder*="Emne"]').first();
    if (await subjectInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await subjectInput.click();
      await page.keyboard.type("Weekly sync notes", { delay: 30 });
      await pause(page, 400);
    }

    // Show schedule send dropdown
    const scheduleBtn = page.locator('.compose-dialog__send-btn--dropdown');
    if (await scheduleBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await glide(page, '.compose-dialog__send-btn--dropdown');
      await scheduleBtn.click();
      await pause(page, 1800);
      await page.keyboard.press("Escape");
    }
    await pause(page, 300);
    await page.keyboard.press("Escape");
    await pause(page, 300);
    const discardBtn = page.locator('button').filter({ hasText: /Discard|Forkast/ }).first();
    if (await discardBtn.isVisible({ timeout: 800 }).catch(() => false)) await discardBtn.click();
    await pause(page, 600);

    // --- SEARCH ---
    mark("search");
    const searchInput = page.locator('#search-input, input[placeholder*="Search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.click();
      await page.keyboard.type("invoice", { delay: 60 });
      await pause(page, 1500);
      await page.keyboard.press("Escape");
      await pause(page, 400);
    }

    // --- CONTEXT MENU ---
    mark("context_menu");
    const firstMsg = page.locator('.message-list-item').first();
    if (await firstMsg.isVisible()) {
      await firstMsg.click({ button: "right" });
      await pause(page, 1800);
      await page.keyboard.press("Escape");
      await pause(page, 500);
    }

    // --- CALENDAR ---
    mark("calendar");
    await smoothClick(page, '.activity-bar__icon:nth-child(3)');
    await pause(page, 2000);

    // Switch to week view
    const weekBtn = page.locator('button').filter({ hasText: /^Week$/ }).first();
    if (await weekBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await smoothClick(page, 'button:has-text("Week")');
      await pause(page, 1500);
    }

    // Click an event to show the popover
    const eventBlock = page.locator('[data-testid="calendar-event"]').first();
    if (await eventBlock.isVisible({ timeout: 2000 }).catch(() => false)) {
      const evBox = await eventBlock.boundingBox();
      if (evBox) {
        await page.mouse.move(evBox.x + evBox.width / 2, evBox.y + evBox.height / 2, { steps: 15 });
        await page.waitForTimeout(150);
        await eventBlock.click();
        await pause(page, 1500);
        await page.keyboard.press("Escape");
        await pause(page, 500);
      }
    }

    // Drag an event down to reschedule
    const dragTarget = page.locator('[data-testid="calendar-event"]').first();
    if (await dragTarget.isVisible({ timeout: 1000 }).catch(() => false)) {
      const box = await dragTarget.boundingBox();
      if (box) {
        const startX = box.x + box.width / 2;
        const startY = box.y + 5; // near the top of the event
        await page.mouse.move(startX, startY, { steps: 10 });
        await pause(page, 300);
        await page.mouse.down();
        // Drag down slowly (~120px = ~2 hours on week grid)
        for (let step = 0; step < 24; step++) {
          await page.mouse.move(startX, startY + step * 5, { steps: 2 });
          await page.waitForTimeout(40);
        }
        await pause(page, 400);
        await page.mouse.up();
        await pause(page, 800);
      }
    }

    // Back to month
    const monthBtn = page.locator('button').filter({ hasText: /^Month$/ }).first();
    if (await monthBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await smoothClick(page, 'button:has-text("Month")');
      await pause(page, 1200);
    }

    // --- CONTACTS ---
    mark("contacts");
    await smoothClick(page, '.activity-bar__icon:nth-child(2)');
    await pause(page, 2000);

    const contactRow = page.locator('[role="option"], button').filter({ hasText: /@/ }).first();
    if (await contactRow.isVisible({ timeout: 2000 }).catch(() => false)) {
      await contactRow.click();
      await pause(page, 1500);
    }

    // --- AI COPILOT ---
    mark("ai_copilot");
    await smoothClick(page, '.activity-bar__icon:nth-child(1)');
    await pause(page, 1200);
    await smoothClick(page, '.message-list-item:nth-child(1)');
    await pause(page, 1200);

    // Open AI panel
    let aiClicked = false;
    for (const sel of ['button[aria-label*="AI"]', 'button[aria-label*="Copilot"]', 'button[aria-label*="Assistant"]']) {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await glide(page, sel);
        await btn.click();
        aiClicked = true;
        break;
      }
    }
    await pause(page, 1500);

    if (aiClicked) {
      const summarizeBtn = page.locator('button').filter({ hasText: /Summarize|Oppsummer|key points/ }).first();
      if (await summarizeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await glide(page, 'button:has-text("Summarize")');
        await summarizeBtn.click();
      }
    }
    await pause(page, 5000);

    // Close copilot
    if (aiClicked) {
      for (const sel of ['button[aria-label*="AI"]', 'button[aria-label*="Copilot"]']) {
        const btn = page.locator(sel).first();
        if (await btn.isVisible({ timeout: 500 }).catch(() => false)) { await btn.click(); break; }
      }
    }
    await pause(page, 800);

    // --- DARK MODE ---
    mark("dark_mode");
    await page.evaluate(() => document.documentElement.classList.add("dark"));
    await pause(page, 2500);
    await page.evaluate(() => document.documentElement.classList.remove("dark"));
    await pause(page, 1500);

    // --- KEYBOARD SHORTCUTS ---
    mark("shortcuts");
    await page.keyboard.press("?");
    await pause(page, 2000);
    await page.keyboard.press("Escape");
    await pause(page, 1500);

    mark("end");

    // Save markers
    fs.writeFileSync(MARKERS_FILE, JSON.stringify(markers, null, 2));
    console.log(`\nMarkers saved to ${MARKERS_FILE}`);
    console.log(JSON.stringify(markers, null, 2));

    await context.close();

    // Convert WebM to MP4
    const files = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith(".webm"));
    if (files.length > 0) {
      const webmPath = path.join(OUTPUT_DIR, files[files.length - 1]);
      const rawPath = path.join(__dirname, "walkthrough-raw.mp4");
      const mp4Path = path.join(__dirname, "walkthrough.mp4");
      console.log(`\nConverting ${webmPath} → ${rawPath}`);
      execSync(`ffmpeg -y -i "${webmPath}" -c:v libx264 -preset slow -crf 22 -pix_fmt yuv420p -movflags +faststart -an "${rawPath}"`, { stdio: "inherit" });
      fs.copyFileSync(rawPath, mp4Path);
      console.log(`✓ Video saved to ${rawPath} (and copied to ${mp4Path})`);
    }
  });
});
