import { test, expect } from "@playwright/test";

/**
 * Platform guide smokes — skip unless E2E_ENABLED=1 (or nightly).
 */
const enabled = process.env.E2E_ENABLED === "1" || process.env.CI === "nightly";
const password = "admin123";

async function login(page: import("@playwright/test").Page, email: string) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in|log in|login/i }).click();
  await page.waitForURL(/\/(demo-school|super-admin)/, { timeout: 30_000 });
}

async function dismissSoftTour(page: import("@playwright/test").Page) {
  const close = page.getByRole("dialog").getByRole("button", { name: /close/i });
  if (await close.isVisible({ timeout: 2000 }).catch(() => false)) {
    await close.click();
  }
}

test.describe("platform guide", () => {
  test.skip(!enabled, "Set E2E_ENABLED=1 to run");

  test("school admin: guide hub + completion widget reachable", async ({ page }) => {
    await login(page, "schooladmin@yoursms.com");
    await dismissSoftTour(page);
    await page.goto("/demo-school/guide");
    await expect(page.getByText(/School admin guide|Platform guide/i).first()).toBeVisible({
      timeout: 15_000,
    });
    await page.goto("/demo-school/reports");
    await expect(page.locator("body")).toContainText(/Guide completion by role|Learn your role|Platform guide/i, {
      timeout: 15_000,
    });
  });

  test("teacher: deep link ?step= opens tour", async ({ page }) => {
    await login(page, "teacher@yoursms.com");
    await dismissSoftTour(page);
    await page.goto("/demo-school/guide?step=teacher_attendance");
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("dialog")).toContainText(/roll|attendance|Welcome|Teacher/i);
  });

  test("parent: guide page distinct copy", async ({ page }) => {
    await login(page, "parent@yoursms.com");
    await dismissSoftTour(page);
    await page.goto("/demo-school/guide");
    await expect(page.getByText(/Parent guide/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("body")).toContainText(/children|fees|grades/i);
  });

  test("student: guide page loads", async ({ page }) => {
    await login(page, "student@yoursms.com");
    await dismissSoftTour(page);
    await page.goto("/demo-school/guide");
    await expect(page.getByText(/Student guide/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test("super admin: platform guide route", async ({ page }) => {
    await login(page, "superadmin@yoursms.com");
    await dismissSoftTour(page);
    await page.goto("/super-admin/guide");
    await expect(page.getByText(/Super Admin guide|Platform guide/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("esc closes coach dialog", async ({ page }) => {
    await login(page, "teacher@yoursms.com");
    await page.goto("/demo-school/guide?tour=1");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden({ timeout: 5_000 });
  });
});
