import { test, expect } from "@playwright/test";

/**
 * Public landing smoke. Skip unless E2E_ENABLED=1 (or CI=nightly).
 */
test.describe("landing page", () => {
  test.skip(
    !process.env.E2E_ENABLED && process.env.CI !== "nightly",
    "Set E2E_ENABLED=1 (compose SPA on :8080) or run nightly workflow"
  );

  test("landing loads with hero, capabilities, and register CTA", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("h1")).toContainText(/Gnet/i);
    await expect(page.locator("#capabilities")).toBeVisible();
    await expect(page.locator("#campus")).toBeVisible();
    await expect(page.locator("#modules")).toHaveCount(0);
    await expect(page.locator("#pricing")).toHaveCount(0);
    await expect(page.locator("#faq")).toBeVisible();
    await expect(page.locator("#tour")).toHaveCount(0);

    const modulesNav = page.getByRole("link", { name: /modules|módulos|module|模块|मॉड्यूल/i }).first();
    await expect(modulesNav).toHaveAttribute("href", "/modules");

    const pricingNav = page.getByRole("link", { name: /pricing|tarifs|precios|preise|价格|मूल्य/i }).first();
    await expect(pricingNav).toHaveAttribute("href", "/pricing");

    const register = page.getByRole("link", { name: /register/i }).first();
    await expect(register).toHaveAttribute("href", "/register-school");

    const signIn = page.getByRole("link", { name: /sign in|connexion/i }).first();
    await expect(signIn).toHaveAttribute("href", "/login");
  });

  test("modules page shows hero, search/filter, and domain catalog", async ({ page }) => {
    await page.goto("/modules");
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("#modules")).toBeVisible();
    await expect(page.getByRole("searchbox").or(page.locator('input[type="search"]')).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /live|actifs|en vivo|live/i }).first()).toBeVisible();
    await expect(page.locator("#modules article").first()).toBeVisible();
  });

  test("pricing page shows hero, plan cards, and comparison matrix", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("#pricing")).toBeVisible();
    const cards = page.locator("#pricing article");
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThanOrEqual(3);
    await expect(page.locator("#pricing-compare")).toBeVisible();
    await expect(page.locator("#pricing-compare table")).toBeVisible();
  });

  test("locale switch updates landing chrome", async ({ page }) => {
    await page.goto("/");
    const languageSelect = page.getByLabel(/language|langue|idioma|sprache|语言|भाषा/i).first();
    await languageSelect.selectOption("fr");
    await expect(page.locator("body")).toContainText(/Connexion|Se connecter|École|Inscrire/i, {
      timeout: 10_000,
    });
  });
});
