/**
 * Playwright script to capture cropped feature screenshots from the live webmail app.
 *
 * Usage:
 *   npx playwright test --config=playwright.config.ts
 *   npx playwright test --config=playwright.config.ts -g "02"   # single test
 */

import { test, type Page, type Locator } from "@playwright/test";
import path from "path";

const BASE_URL = "https://webmail.massive-hosting.com";
const EMAIL = "info@acme.customer.mhst.io";
const PASSWORD = "test1234";
const SCREENSHOTS_DIR = path.join(__dirname, "screenshots");

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

async function login(page: Page) {
  await page.goto(BASE_URL);
  await page.waitForSelector('input[type="email"], input[placeholder*="email"], input[name="email"]', { timeout: 10000 });
  await page.fill('input[type="email"], input[placeholder*="email"], input[name="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForSelector('[role="treeitem"]', { timeout: 15000 });
  await page.waitForTimeout(2000);
}

/** Screenshot the full viewport */
async function snap(page: Page, name: string) {
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${name}.png`) });
}

/** Screenshot a specific element */
async function snapEl(loc: Locator, name: string) {
  await loc.screenshot({ path: path.join(SCREENSHOTS_DIR, `${name}.png`) });
}

/** Navigate to calendar view */
async function goCalendar(page: Page) {
  await page.locator('.activity-bar__icon').nth(2).click();
  await page.waitForTimeout(1500);
}

/** Navigate to contacts view */
async function goContacts(page: Page) {
  await page.locator('.activity-bar__icon').nth(1).click();
  await page.waitForTimeout(1500);
}

/** Open settings dialog and click a tab */
async function openSettings(page: Page, tab?: string) {
  // Click the settings icon in the toolbar (gear icon)
  await page.locator('button[aria-label="Settings"], [title="Settings"]').first().click().catch(async () => {
    // Fallback: open user menu first
    await page.locator('.toolbar button').last().click();
    await page.waitForTimeout(300);
    await page.click('text=Settings');
  });
  await page.waitForTimeout(1000);
  if (tab) {
    await page.click(`text=${tab}`).catch(() => {});
    await page.waitForTimeout(500);
  }
}

test.describe("Feature Screenshots", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(DESKTOP);
  });

  // ---- HERO / OVERVIEW ----

  test("01 - Login page", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.waitForTimeout(500);
    await snap(page, "01-login");
  });

  test("02 - Three pane layout (inbox)", async ({ page }) => {
    await login(page);
    const firstEmail = page.locator('.message-list-item').first();
    if (await firstEmail.isVisible()) {
      await firstEmail.click();
      await page.waitForTimeout(1500);
    }
    await snap(page, "02-inbox-three-pane");
  });

  test("03 - Dark mode", async ({ page }) => {
    await login(page);
    const firstEmail = page.locator('.message-list-item').first();
    if (await firstEmail.isVisible()) {
      await firstEmail.click();
      await page.waitForTimeout(1000);
    }
    await page.evaluate(() => document.documentElement.classList.add("dark"));
    await page.waitForTimeout(500);
    await snap(page, "03-dark-mode");
    await page.evaluate(() => document.documentElement.classList.remove("dark"));
  });

  // ---- MAIL FEATURES ----

  test("04 - Compose email", async ({ page }) => {
    await login(page);
    await page.click('.action-bar__btn--primary');
    await page.waitForTimeout(1500);
    // Crop to just the compose dialog
    const dialog = page.locator('.compose-dialog').first();
    if (await dialog.isVisible()) {
      await snapEl(dialog, "04-compose");
    } else {
      await snap(page, "04-compose");
    }
  });

  test("05 - Schedule send dropdown", async ({ page }) => {
    await login(page);
    await page.click('.action-bar__btn--primary');
    await page.waitForTimeout(1000);
    const scheduleBtn = page.locator('.compose-dialog__send-btn--dropdown');
    if (await scheduleBtn.isVisible()) {
      await scheduleBtn.click();
      await page.waitForTimeout(500);
    }
    // Crop to compose dialog area (includes the dropdown)
    const dialog = page.locator('.compose-dialog').first();
    if (await dialog.isVisible()) {
      // Take full page since dropdown renders in a portal
      await snap(page, "05-schedule-send");
    }
  });

  test("06 - Thread / conversation view", async ({ page }) => {
    await login(page);
    const thread = page.locator('.message-list-item--thread-header').first();
    if (await thread.isVisible({ timeout: 3000 }).catch(() => false)) {
      await thread.click();
      await page.waitForTimeout(1500);
    }
    // Crop to main content area (exclude activity bar)
    const main = page.locator('#main-content').first();
    if (await main.isVisible()) {
      await snapEl(main, "06-thread-view");
    } else {
      await snap(page, "06-thread-view");
    }
  });

  test("07 - Search", async ({ page }) => {
    await login(page);
    const searchInput = page.locator('#search-input, input[placeholder*="Search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.click();
      await page.waitForTimeout(500);
      await searchInput.fill("test");
      await page.waitForTimeout(300);
    }
    // Crop to the toolbar area with search dropdown
    await snap(page, "07-search");
  });

  test("08 - Folder context menu", async ({ page }) => {
    await login(page);
    const inbox = page.locator('[role="treeitem"]').first();
    await inbox.click({ button: "right" });
    await page.waitForTimeout(500);
    // Crop to the sidebar + context menu area
    const nav = page.locator('nav[role="navigation"]').first();
    if (await nav.isVisible()) {
      // Full screenshot since context menu is a portal
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, "08-folder-context-menu.png"),
        clip: { x: 48, y: 0, width: 450, height: 600 },
      });
    }
    await page.keyboard.press("Escape");
  });

  test("09 - Message context menu", async ({ page }) => {
    await login(page);
    const firstEmail = page.locator('.message-list-item').first();
    if (await firstEmail.isVisible()) {
      const box = await firstEmail.boundingBox();
      if (box) {
        await firstEmail.click({ button: "right" });
        await page.waitForTimeout(500);
        // Crop around the message + context menu
        await page.screenshot({
          path: path.join(SCREENSHOTS_DIR, "09-message-context-menu.png"),
          clip: { x: Math.max(0, box.x - 20), y: Math.max(0, box.y - 20), width: 500, height: 650 },
        });
      }
    }
    await page.keyboard.press("Escape");
  });

  // ---- CALENDAR ----

  test("10 - Calendar month view", async ({ page }) => {
    await login(page);
    await goCalendar(page);
    // Crop to calendar area (exclude activity bar)
    const main = page.locator('#main-content').first();
    if (await main.isVisible()) {
      await snapEl(main, "10-calendar-month");
    } else {
      await snap(page, "10-calendar-month");
    }
  });

  test("11 - Calendar week view", async ({ page }) => {
    await login(page);
    await goCalendar(page);
    // Click "Week" button in the calendar toolbar
    const weekBtn = page.locator('button').filter({ hasText: /^Week$/ }).first();
    if (await weekBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await weekBtn.click();
      await page.waitForTimeout(1000);
    }
    const main = page.locator('#main-content').first();
    if (await main.isVisible()) {
      await snapEl(main, "11-calendar-week");
    } else {
      await snap(page, "11-calendar-week");
    }
  });

  test("12 - Calendar event creation", async ({ page }) => {
    await login(page);
    await goCalendar(page);
    // Click "New Event" button
    const newEventBtn = page.locator('button').filter({ hasText: /New Event|Ny hendelse/ }).first();
    if (await newEventBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await newEventBtn.click();
      await page.waitForTimeout(1000);
    }
    // Crop to the dialog
    const dialog = page.locator('[role="dialog"]').first();
    if (await dialog.isVisible({ timeout: 2000 }).catch(() => false)) {
      await snapEl(dialog, "12-calendar-event-form");
    } else {
      await snap(page, "12-calendar-event-form");
    }
  });

  // ---- CONTACTS ----

  test("13 - Contacts page", async ({ page }) => {
    await login(page);
    await goContacts(page);
    const main = page.locator('#main-content').first();
    if (await main.isVisible()) {
      await snapEl(main, "13-contacts");
    } else {
      await snap(page, "13-contacts");
    }
  });

  // ---- SETTINGS ----

  test("14 - Settings dialog - General", async ({ page }) => {
    await login(page);
    await openSettings(page);
    const dialog = page.locator('[role="dialog"]').first();
    if (await dialog.isVisible({ timeout: 2000 }).catch(() => false)) {
      await snapEl(dialog, "14-settings-general");
    } else {
      await snap(page, "14-settings-general");
    }
  });

  test("15 - Settings - Signatures", async ({ page }) => {
    await login(page);
    await openSettings(page, "Signatures");
    const dialog = page.locator('[role="dialog"]').first();
    if (await dialog.isVisible({ timeout: 2000 }).catch(() => false)) {
      await snapEl(dialog, "15-settings-signatures");
    } else {
      await snap(page, "15-settings-signatures");
    }
  });

  test("16 - Settings - Filter rules", async ({ page }) => {
    await login(page);
    await openSettings(page, "Filters");
    const dialog = page.locator('[role="dialog"]').first();
    if (await dialog.isVisible({ timeout: 2000 }).catch(() => false)) {
      await snapEl(dialog, "16-settings-filters");
    } else {
      await snap(page, "16-settings-filters");
    }
  });

  test("17 - Settings - Templates", async ({ page }) => {
    await login(page);
    await openSettings(page, "Templates");
    const dialog = page.locator('[role="dialog"]').first();
    if (await dialog.isVisible({ timeout: 2000 }).catch(() => false)) {
      await snapEl(dialog, "17-settings-templates");
    } else {
      await snap(page, "17-settings-templates");
    }
  });

  // ---- SECURITY ----

  test("18 - Message details / security (SPF/DKIM/DMARC)", async ({ page }) => {
    await login(page);
    // Find "Real email!" subject and click it
    const realEmail = page.locator('.message-list-item').filter({ hasText: "Real email!" }).first();
    if (await realEmail.isVisible({ timeout: 3000 }).catch(() => false)) {
      await realEmail.click();
      await page.waitForTimeout(1500);
      // Open properties dialog
      await page.locator('button[title="Message details"], button[aria-label="Message details"]').first().click().catch(async () => {
        // Fallback: right-click and select properties
        await realEmail.click({ button: "right" });
        await page.waitForTimeout(300);
        await page.click('text=Message details').catch(() => {});
      });
      await page.waitForTimeout(1000);
      // Scroll to security section within the dialog
      const dialogContent = page.locator('[role="dialog"]').first();
      if (await dialogContent.isVisible({ timeout: 2000 }).catch(() => false)) {
        const securityHeading = dialogContent.locator('text=Security').last();
        if (await securityHeading.isVisible({ timeout: 2000 }).catch(() => false)) {
          await securityHeading.scrollIntoViewIfNeeded();
          await page.waitForTimeout(500);
        }
        await snapEl(dialogContent, "18-message-details-security");
      }
    } else {
      await snap(page, "18-message-details-security");
    }
  });

  test("19 - Keyboard shortcuts dialog", async ({ page }) => {
    await login(page);
    await page.keyboard.press("?");
    await page.waitForTimeout(800);
    const dialog = page.locator('[role="dialog"]').first();
    if (await dialog.isVisible({ timeout: 2000 }).catch(() => false)) {
      await snapEl(dialog, "19-keyboard-shortcuts");
    } else {
      await snap(page, "19-keyboard-shortcuts");
    }
    await page.keyboard.press("Escape");
  });

  // ---- SNOOZE / SCHEDULED ----

  test("20 - Snoozed folder", async ({ page }) => {
    await login(page);
    const snoozedItem = page.locator('button').filter({ hasText: /^Snoozed$|^Utsatt$/ }).first();
    if (await snoozedItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      await snoozedItem.click();
      await page.waitForTimeout(1500);
    }
    // Crop to sidebar + message list
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "20-snoozed-folder.png"),
      clip: { x: 0, y: 0, width: 700, height: 900 },
    });
  });

  test("21 - Read/unread visual indicators", async ({ page }) => {
    await login(page);
    await page.waitForTimeout(1000);
    // Crop to just the message list pane
    const listPane = page.locator('.mail-list-pane').first();
    if (await listPane.isVisible()) {
      await snapEl(listPane, "21-read-unread-indicators");
    } else {
      await snap(page, "21-read-unread-indicators");
    }
  });

  // ---- MOBILE ----

  test("22 - Mobile layout", async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto(BASE_URL);
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.fill('input[type="email"], input[placeholder*="email"], input[name="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);
    await snap(page, "22-mobile-layout");
  });

  // ---- SIDEBAR ----

  test("23 - Saved searches in sidebar", async ({ page }) => {
    await login(page);
    const sidebar = page.locator('nav[role="navigation"]').first();
    if (await sidebar.isVisible()) {
      await snapEl(sidebar, "23-saved-searches-sidebar");
    }
  });

  // ---- CALENDAR SHARING ----

  test("24 - Calendar sharing dialog", async ({ page }) => {
    await login(page);
    await goCalendar(page);
    // Right-click the first calendar item in the sidebar (not the header)
    const calItems = page.locator('.flex.items-center.gap-2.px-2.py-1\\.5.rounded');
    const firstCal = calItems.first();
    if (await firstCal.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstCal.click({ button: "right" });
      await page.waitForTimeout(500);
      // Click "Share" in context menu
      const shareItem = page.locator('[role="menuitem"]').filter({ hasText: /Share|Del/ }).first();
      if (await shareItem.isVisible({ timeout: 2000 }).catch(() => false)) {
        await shareItem.click();
        await page.waitForTimeout(1000);
        const dialog = page.locator('[role="dialog"]').first();
        if (await dialog.isVisible({ timeout: 2000 }).catch(() => false)) {
          await snapEl(dialog, "24-calendar-sharing");
          return;
        }
      }
    }
    await snap(page, "24-calendar-sharing");
  });

  // ---- AI ----

  test("25 - AI copilot panel", async ({ page }) => {
    await login(page);
    // Click first email to have context
    const firstEmail = page.locator('.message-list-item').first();
    if (await firstEmail.isVisible()) {
      await firstEmail.click();
      await page.waitForTimeout(1000);
    }
    // Look for the AI copilot toggle button in the toolbar area
    // It might be in the activity bar or toolbar
    const aiBtn = page.locator('button[aria-label*="AI"], button[title*="AI"], button:has-text("AI")').first();
    if (await aiBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await aiBtn.click();
      await page.waitForTimeout(1500);
      // Try to capture the AI panel
      const aiPanel = page.locator('[class*="copilot"], [class*="ai-panel"]').first();
      if (await aiPanel.isVisible({ timeout: 2000 }).catch(() => false)) {
        await snapEl(aiPanel, "25-ai-copilot");
        return;
      }
    }
    // Fallback: full screenshot
    await snap(page, "25-ai-copilot");
  });

  // ---- MORE SETTINGS ----

  test("26 - Vacation / Out of Office settings", async ({ page }) => {
    await login(page);
    await openSettings(page, "Out of Office");
    const dialog = page.locator('[role="dialog"]').first();
    if (await dialog.isVisible({ timeout: 2000 }).catch(() => false)) {
      await snapEl(dialog, "26-vacation-settings");
    } else {
      await snap(page, "26-vacation-settings");
    }
  });

  test("27 - PGP / Security settings", async ({ page }) => {
    await login(page);
    await openSettings(page, "Security");
    const dialog = page.locator('[role="dialog"]').first();
    if (await dialog.isVisible({ timeout: 2000 }).catch(() => false)) {
      await snapEl(dialog, "27-pgp-security");
    } else {
      await snap(page, "27-pgp-security");
    }
  });
});
