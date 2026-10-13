# Playwright E2E (persona smoke)

Install once:

```bash
npm install -D @playwright/test
npx playwright install chromium
```

Run against compose SPA (`frontend-spa` on http://localhost:8080):

```bash
E2E_ENABLED=1 npm run test:e2e
```

Nightly CI sets `E2E_ENABLED=1` and `CI=nightly`. PR CI does not run Playwright by default (see `docs/TEST_COVERAGE_PLAN.md`).
