import { test, expect } from "@playwright/test";

const password = "admin123";

async function login(page: import("@playwright/test").Page, email: string) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in|log in|login/i }).click();
  await page.waitForURL(/\/(demo-school|super-admin)/, { timeout: 30_000 });
}

test.describe("persona smoke", () => {
  test.skip(
    !process.env.E2E_ENABLED && process.env.CI !== "nightly",
    "Set E2E_ENABLED=1 (compose SPA on :8080) or run nightly workflow"
  );

  test("@tier1 school admin: dashboard + students", async ({ page }) => {
    await login(page, "schooladmin@yoursms.com");
    await expect(page).toHaveURL(/\/demo-school/);
    await page.goto("/demo-school/students");
    await expect(page.getByRole("heading", { name: /student/i }).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test("@tier1 teacher: my classes", async ({ page }) => {
    await login(page, "teacher@yoursms.com");
    await page.goto("/demo-school/classroom");
    await expect(page.locator("body")).toContainText(/class|classroom|course/i, {
      timeout: 20_000,
    });
  });

  test("@tier2 student: my classes", async ({ page }) => {
    await login(page, "student@yoursms.com");
    await page.goto("/demo-school/classroom");
    await expect(page.locator("body")).not.toContainText(/1,240/);
  });

  test("@tier1 parent: children area reachable", async ({ page }) => {
    await login(page, "parent@yoursms.com");
    await page.goto("/demo-school/dashboard");
    await expect(page.locator("body")).toBeVisible();
  });

  test("@tier2 super admin: schools", async ({ page }) => {
    await login(page, "superadmin@yoursms.com");
    await page.goto("/super-admin/schools");
    await expect(page.locator("body")).toContainText(/school/i, { timeout: 20_000 });
  });

  test("@tier2 negative: teacher cannot open roles", async ({ page }) => {
    await login(page, "teacher@yoursms.com");
    await page.goto("/demo-school/roles");
    // ProtectedRoute should bounce away from roles
    await expect(page).not.toHaveURL(/\/roles$/);
  });

  test("@tier2 specialty: library live catalog", async ({ page }) => {
    await login(page, "librarian@yoursms.com");
    await page.goto("/demo-school/library");
    await expect(page.locator("body")).toContainText(/Library|Catalog|Loans/i, {
      timeout: 20_000,
    });
    await expect(page.locator("body")).not.toContainText(/nothing to show|coming online|not connected/i);
  });
});
