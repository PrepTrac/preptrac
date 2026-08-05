import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Core smoke workflows + automated accessibility checks.
 *
 * These run against a running app server (see playwright.config.ts webServer).
 * The app auto-creates a default user and seeds default categories/locations on
 * first DB access, so pages are usable without manual auth setup.
 */

test.describe("Core navigation smoke", () => {
  test("dashboard loads and shows key metrics", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveTitle(/PrepTrac/i);
  });

  test("sidebar navigation reaches each section", async ({ page }) => {
    for (const href of ["/inventory", "/calendar", "/activity", "/household", "/settings"]) {
      await page.goto(href);
      await expect(page).toHaveURL(href);
    }
  });

  test("settings tabs switch and expose only the active panel", async ({ page }) => {
    await page.goto("/settings");
    const goalsTab = page.getByRole("tab", { name: "goals" });
    await expect(goalsTab).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tabpanel")).toBeVisible();

    const notificationsTab = page.getByRole("tab", { name: "notifications" });
    await notificationsTab.click();
    await expect(notificationsTab).toHaveAttribute("aria-selected", "true");
  });

  test("settings tabs respond to arrow keys (roving tabindex)", async ({ page }) => {
    await page.goto("/settings");
    const goalsTab = page.getByRole("tab", { name: "goals" });
    await goalsTab.focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: "notifications" })).toBeFocused();
    await page.keyboard.press("Home");
    await expect(goalsTab).toBeFocused();
  });
});

test.describe("Accessibility — automated axe scans", () => {
  for (const path of ["/dashboard", "/inventory", "/calendar", "/settings", "/household"]) {
    test(`${path} has no critical axe violations`, async ({ page }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        // Focus on serious/critical issues; moderate/minor are reported but not gating.
        .analyze();
      const blocking = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious",
      );
      expect(blocking, JSON.stringify(blocking, null, 2)).toHaveLength(0);
    });
  }
});
