import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const paths = ["dashboard", "inventory", "locations", "activity", "household", "calendar", "settings"];
for (const theme of ["light", "dark"]) {
  test.describe(`${theme} Readiness index`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(value => localStorage.setItem("theme", value), theme);
    });
    test("pages load without overflow or serious accessibility violations", async ({ page }) => {
      for (const path of paths) {
        await page.goto(`/${path}`);
        await expect(page.locator("main h1")).toBeVisible();
        await expect(page.getByText(/^Loading/)).toHaveCount(0);
        await expect(page.locator("html")).toHaveClass(theme === "dark" ? /dark/ : /light/);
        const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
        expect(result.violations.filter(v => ["serious", "critical"].includes(v.impact ?? "")), `${path}: ${JSON.stringify(result.violations)}`).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({ path: `.superpowers/sdd/readiness-index/${path}-${theme}.png`, fullPage: true });
        await page.locator("#main-content").evaluate(el => { el.scrollTop = el.scrollHeight; });
        await page.screenshot({ path: `.superpowers/sdd/readiness-index/${path}-${theme}-bottom.png` });
      }
    });
    test("mobile pages contain scrolling locally and drawer restores focus", async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 800 });
      for (const path of paths) {
        await page.goto(`/${path}`);
        await expect(page.locator("main h1")).toBeVisible();
        await expect(page.getByText(/^Loading/)).toHaveCount(0);
        expect(await page.evaluate(() => {
          const content = document.getElementById("main-content")!;
          return content.scrollWidth <= content.clientWidth && document.documentElement.scrollWidth <= innerWidth;
        }), path).toBe(true);
      }
      const open = page.getByRole("button", { name: "Open navigation menu" });
      await open.click();
      await expect(page.getByRole("dialog", { name: "Navigation", exact: true })).toBeVisible();
      await page.getByRole("button", { name: /^Notifications/ }).click();
      const notificationPanel = page.getByRole("dialog", { name: "Pending notifications" });
      await expect(notificationPanel).toBeVisible();
      const panelBounds = await notificationPanel.boundingBox();
      expect(panelBounds!.x).toBeGreaterThanOrEqual(0);
      expect(panelBounds!.x + panelBounds!.width).toBeLessThanOrEqual(320);
      await page.keyboard.press("Escape");
      await page.keyboard.press("Escape");
      await expect(open).toBeFocused();
      await page.screenshot({ path: `.superpowers/sdd/readiness-index/mobile-${theme}.png` });
    });
    test("coverage details, collapsed navigation and item dialog remain usable", async ({ page }) => {
      await page.goto("/dashboard");
      await expect(page.getByRole("heading", { name: "Food coverage" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Water coverage" })).toBeVisible();
      await page.getByText("Water source breakdown", { exact: true }).click();
      await expect(page.locator("details[open]")).toBeVisible();
      await page.getByRole("button", { name: "Collapse sidebar", exact: true }).click();
      await page.getByRole("link", { name: "Inventory", exact: true }).click();
      await page.getByRole("button", { name: "Add Item", exact: true }).click();
      await expect(page.getByRole("dialog", { name: "Add item", exact: true })).toBeVisible();
      await page.screenshot({ path: `.superpowers/sdd/readiness-index/item-dialog-${theme}.png` });
      const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      expect(result.violations.filter(v => ["serious", "critical"].includes(v.impact ?? "")), JSON.stringify(result.violations)).toEqual([]);
      await page.keyboard.press("Escape");
      await expect(page.getByRole("button", { name: "Add Item", exact: true })).toBeFocused();
    });
  });
}

test("long names stay usable at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.route("**/api/trpc/**", async route => {
    const response = await route.fetch();
    if (!response.headers()["content-type"]?.includes("application/json")) return route.fulfill({ response });
    const body = JSON.parse(await response.text(), (key, value) =>
      ["name", "title", "description"].includes(key) && typeof value === "string"
        ? `StoredSupply${"LongUnbrokenName".repeat(12)}` : value,
    );
    await route.fulfill({ response, json: body });
  });
  for (const path of [...paths, "settings?tab=categories", "settings?tab=locations"]) {
    await page.goto(`/${path}`);
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.getByText(/^Loading/)).toHaveCount(0);
    expect(await page.evaluate(() => {
      const content = document.getElementById("main-content")!;
      return content.scrollWidth <= content.clientWidth;
    }), path).toBe(true);
    if (path === "inventory") {
      await page.getByRole("button", { name: "Cards", exact: true }).click();
      expect(await page.locator("#main-content").evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    }
  }
  await page.unrouteAll({ behavior: "wait" });
});

test("theme toggle follows system preference and persists selection", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/dashboard");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await expect(page.locator("html")).toHaveClass(/light/);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/light/);
});

test("desktop layouts fit 1024 through 1920px", async ({ page }) => {
  for (const width of [1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of paths) {
      await page.goto(`/${path}`);
      await expect(page.locator("main h1")).toBeVisible();
      await expect(page.getByText(/^Loading/)).toHaveCount(0);
      expect(await page.locator("#main-content").evaluate(el => el.scrollWidth <= el.clientWidth), `${path} at ${width}px`).toBe(true);
    }
  }
});

test("dark hover states and supporting overlays keep readable labels", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("theme", "dark"));
  await page.goto("/settings?tab=testdata");
  await expect(page.getByRole("button", { name: "Remove test data", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Remove test data", exact: true }).hover();
  let results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(results.violations.filter(v => ["serious", "critical"].includes(v.impact ?? "")), JSON.stringify(results.violations)).toEqual([]);
  await page.getByRole("link", { name: "PrepTrac on GitHub" }).hover();
  results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(results.violations.filter(v => ["serious", "critical"].includes(v.impact ?? "")), JSON.stringify(results.violations)).toEqual([]);
  await page.goto("/household");
  await page.getByRole("button", { name: "Add member" }).click();
  await expect(page.getByRole("dialog", { name: "Add family member" })).toBeVisible();
  results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(results.violations.filter(v => ["serious", "critical"].includes(v.impact ?? "")), JSON.stringify(results.violations)).toEqual([]);
  await page.keyboard.press("Escape");
});
