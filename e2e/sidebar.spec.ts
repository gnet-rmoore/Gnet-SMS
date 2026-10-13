import { test, expect } from "@playwright/test";

/**
 * Sidebar chrome smoke. Skip unless E2E_ENABLED=1 (or CI=nightly).
 */
test.describe("app sidebar", () => {
  test.skip(
    !process.env.E2E_ENABLED && process.env.CI !== "nightly",
    "Set E2E_ENABLED=1 (compose SPA on :8080) or run nightly workflow"
  );

  test("login then sidebar expands/collapses on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("schooladmin@yoursms.com");
    await page.getByLabel(/password/i).fill("admin123");
    await page.getByRole("button", { name: /sign in|log in|connexion/i }).click();
    await page.waitForURL(/\/[^/]+\/(dashboard)?/, { timeout: 20_000 });

    const sidebar = page.locator("#app-sidebar");
    await expect(sidebar).toBeVisible();

    const toggle = page.getByRole("button", { name: /collapse sidebar|expand sidebar/i });
    await toggle.click();
    await expect(page.getByRole("button", { name: /expand sidebar/i })).toBeVisible();
    await toggle.click();
    await expect(page.getByRole("button", { name: /collapse sidebar/i })).toBeVisible();
  });
});
