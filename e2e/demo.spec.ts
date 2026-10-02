import { test, expect } from "@playwright/test";

test("demo mode stays read-only throughout the redesigned shell", async ({ page }) => {
  test.skip(process.env.PREPTRAC_E2E_MODE !== "demo", "Run separately against an isolated demo-mode server");
  for (const theme of ["light", "dark"]) {
    await page.addInitScript(value => localStorage.setItem("theme", value), theme);
    await page.goto("/dashboard");
    await expect(page.getByText(/Demo mode — this instance is read-only/)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Food coverage" })).toBeVisible();
    await page.screenshot({ path: `.superpowers/sdd/readiness-index/demo-${theme}.png` });
    await page.goto("/locations");
    await expect(page.getByText(/^Loading/)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Add item here" })).toHaveCount(0);
    await page.goto("/inventory");
    await expect(page.getByRole("button", { name: "Add Item", exact: true })).toHaveCount(0);
    await page.goto("/settings");
    await expect(page.getByRole("button", { name: "Save goals" })).toBeDisabled();
  }
});
