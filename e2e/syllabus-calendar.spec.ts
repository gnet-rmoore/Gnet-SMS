import { test, expect } from "@playwright/test";

const password = "admin123";

async function login(page: import("@playwright/test").Page, email: string) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in|log in|login/i }).click();
  await page.waitForURL(/\/(demo-school|super-admin)/, { timeout: 30_000 });
}

test.describe("syllabus calendar alignment", () => {
  test.skip(
    !process.env.E2E_ENABLED && process.env.CI !== "nightly",
    "Set E2E_ENABLED=1 (compose SPA on :8080) or run nightly workflow"
  );

  test("teacher: syllabus builder references academic calendar", async ({ page }) => {
    await login(page, "teacher@yoursms.com");
    await page.goto("/demo-school/curriculum");
    await page.getByRole("button", { name: /syllabus/i }).click();
    await page
      .getByRole("button", { name: /submit syllabus|fill syllabus|new syllabus/i })
      .first()
      .click();
    await expect(page.locator("body")).toContainText(
      /academic calendar|linked to academic calendar|terms \/ periods/i,
      { timeout: 20_000 }
    );
  });

  test("teacher: lesson plans week board shows period context", async ({ page }) => {
    await login(page, "teacher@yoursms.com");
    await page.goto("/demo-school/lesson-plans");
    await expect(page.locator("body")).toContainText(/week of|lesson plan/i, {
      timeout: 20_000,
    });
    const periodTab = page.getByRole("button", { name: /term|semester|quarter|period/i }).first();
    if (await periodTab.isVisible().catch(() => false)) {
      await periodTab.click();
      await expect(page.locator("body")).toContainText(/\d{4}-\d{2}-\d{2}/);
    }
  });
});
