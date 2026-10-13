import { test, expect } from "@playwright/test";

/**
 * Locale smoke: login page renders localized auth chrome.
 * Skip unless E2E_ENABLED=1 (or CI=nightly), matching other smoke tests.
 */
test.describe("i18n locale", () => {
  test.skip(
    !process.env.E2E_ENABLED && process.env.CI !== "nightly",
    "Set E2E_ENABLED=1 (compose SPA on :8080) or run nightly workflow"
  );

  test("login shows French sign-in copy when locale is fr", async ({ page }) => {
    await page.goto("/login");

    const languageSelect = page.getByLabel(/language|langue|idioma|sprache|语言|भाषा|اللغة/i);
    if (await languageSelect.isVisible().catch(() => false)) {
      await languageSelect.selectOption("fr");
    } else {
      await page.evaluate(() => {
        localStorage.setItem("sms-locale", "fr");
      });
      await page.reload();
    }

    await expect(page.locator("body")).toContainText(
      /connexion|se connecter|ouvrir une session/i,
      { timeout: 15_000 }
    );
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  });

  test("login shows Arabic chrome and dir=rtl when locale is ar", async ({ page }) => {
    await page.goto("/login");

    const languageSelect = page.getByLabel(/language|langue|idioma|sprache|语言|भाषा|اللغة/i);
    if (await languageSelect.isVisible().catch(() => false)) {
      await languageSelect.selectOption("ar");
    } else {
      await page.evaluate(() => {
        localStorage.setItem("sms-locale", "ar");
      });
      await page.reload();
    }

    await expect(page.locator("html")).toHaveAttribute("dir", "rtl", { timeout: 15_000 });
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    // Arabic script present (login / email / password chrome)
    await expect(page.locator("body")).toContainText(/[\u0600-\u06FF]{3,}/, {
      timeout: 15_000,
    });
  });

  test("login shows Chinese chrome when locale is zh-Hans", async ({ page }) => {
    await page.goto("/login");

    const languageSelect = page.getByLabel(/language|langue|idioma|sprache|语言|भाषा|اللغة/i);
    if (await languageSelect.isVisible().catch(() => false)) {
      await languageSelect.selectOption("zh-Hans");
    } else {
      await page.evaluate(() => {
        localStorage.setItem("sms-locale", "zh-Hans");
      });
      await page.reload();
    }

    await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hans", { timeout: 15_000 });
    await expect(page.locator("body")).toContainText(/登录|登入|电子邮件|密码/, {
      timeout: 15_000,
    });
  });

  test("login shows Hindi chrome when locale is hi", async ({ page }) => {
    await page.goto("/login");

    const languageSelect = page.getByLabel(/language|langue|idioma|sprache|语言|भाषा|اللغة/i);
    if (await languageSelect.isVisible().catch(() => false)) {
      await languageSelect.selectOption("hi");
    } else {
      await page.evaluate(() => {
        localStorage.setItem("sms-locale", "hi");
      });
      await page.reload();
    }

    await expect(page.locator("html")).toHaveAttribute("lang", "hi", { timeout: 15_000 });
    await expect(page.locator("body")).toContainText(/[\u0900-\u097F]{3,}/, {
      timeout: 15_000,
    });
  });
});
