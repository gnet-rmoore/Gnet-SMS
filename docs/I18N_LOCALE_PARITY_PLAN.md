# i18n locale parity (fr / hi / zh-Hans) — Implementation plan

> **Status:** Partial — Phase B critical-path done (2026-08-06); full non-critical `pages.*` / `public.*` TM rows still fall back to English (~1500 leaves)  
> **Goal:** Close **missing leaf keys** and **critical-path English leftovers** for production-complete locales (`fr`, `hi`, `zh-Hans`) while keeping **print layouts (report cards, grade sheets, certificates, receipt legal blocks) in English** until print-template epics finalize  
> **Companion:** `docs/I18N_PLAN.md`, `scripts/i18n-check.ts`, `scripts/i18n-build-full-locales.ts`, `IMPLEMENTATION_STATUS.md`

---

## 0. Problem today (honest)

| Locale | `SUPPORTED_LOCALES.complete` | `i18n:check` reality (2026-08-06) |
| :--- | :---: | :--- |
| **en** | source | ✅ baseline |
| **fr** | `true` | ❌ ~863 missing `pages.*` leaves; ~284 missing `public.*`; 8 missing `nav.*`; critical EN leftovers mostly fixed |
| **hi** | `true` | ❌ ~919 missing `pages.*`; ~353 missing `public.*`; same nav/auth gaps |
| **zh-Hans** | `true` | ❌ same order of magnitude as hi |
| **es, de, ar** | `true` | es: small critical leftovers; de/ar closer on some namespaces — **this plan focuses fr/hi/zh-Hans** per product ask |

**Root cause:** `I18N_PLAN.md` claims “0 missing leaves” from an older build pipeline; runtime merges + new English keys shipped faster than locale regeneration. `complete: true` in `SUPPORTED_LOCALES` is **ahead of reality**.

**Print layouts:** By design English until report-card / gradesheet finalize (`I18N_PLAN.md` §6.4) — **not a gap**.

---

## 1. Scope

### In scope

| # | Area |
| :--- | :--- |
| 1.1 | All **`REQUIRED_NS`** leaves for fr, hi, zh-Hans: `common`, `nav`, `auth`, `errors`, `roles`, `pages`, `public` |
| 1.2 | **`CRITICAL_PREFIXES`** in `scripts/i18n-check.ts` — zero EN leftovers |
| 1.3 | RTL sanity for **hi** (Devanagari) and **zh-Hans** (CJK) on auth, nav, students, fees, settings |
| 1.4 | CI gate: **`npm run i18n:check` fails PR** when complete locales regress |
| 1.5 | Playwright login smokes for fr, hi, zh-Hans (nightly; promote to PR per CI plan) |

### Out of scope (explicit)

| Area | Reason |
| :--- | :--- |
| Report card / grade sheet / certificate **print HTML** | Legal layout epics deferred |
| User-authored content translation | By design — never auto-translate |
| Professional human review of every string | Use TM + spot QA; hire LQA optional Phase D |
| **es / de / ar** full re-audit | Separate pass if needed; fix only if blocking |

---

## 2. Tooling & key files

| Piece | Path |
| :--- | :--- |
| English catalog | `src/i18n/catalogs/en.ts` |
| Generated locale trees | `src/i18n/catalogs/locales/{fr,hi,zh-Hans}.ts` |
| Runtime merge | `src/i18n/catalogs/translations.ts` |
| Translation memory | `scripts/i18n-data/*.json` |
| Builder | `scripts/i18n-build-full-locales.ts` |
| Checker | `scripts/i18n-check.ts` |
| Locale metadata | `src/i18n/locales.ts` (`SUPPORTED_LOCALES`) |
| Tests | `tests/i18n-resolve.test.ts`, `e2e/i18n-locale.spec.ts` |

---

## 3. Strategy

### Option A — Regenerate from translation memory (preferred)

1. Export missing leaf list: `npm run i18n:check 2>&1 | tee /tmp/i18n-gap.txt`  
2. Batch-translate new English strings into `scripts/i18n-data/` rows (human or approved MT)  
3. Run `npx tsx scripts/i18n-build-full-locales.ts`  
4. Hand-curate high-traffic overrides in `translations.ts` where MT is wrong  

### Option B — Temporary honesty flag

Until Phase B completes, set `complete: false` for fr/hi/zh-Hans in `SUPPORTED_LOCALES` so Language picker shows **(beta)** — **only if** product accepts visible beta label. Prefer Option A for production schools.

### Print exclusion list (checker allowlist)

Extend `i18n-check.ts` with prefix block:

```
pages.reportCard.print.*
pages.gradeSheet.print.*
pages.certificates.print.*
(receipt legal static blocks if keyed under pages.fees.receiptPrint.*)
```

Document in checker header — **not** translated in this plan.

---

## 4. Phased delivery

### Phase A — Measure & freeze baseline (2 days)

| # | Work | Acceptance |
| :--- | :--- | :--- |
| A.1 | Script report: missing counts per namespace per locale | Table in this plan §6 updated |
| A.2 | Add `npm run i18n:gap-report` (optional wrapper) | Single command output |
| A.3 | Fix any **new** English keys merged without TM row | Stop the bleeding |

### Phase B — Critical path 100% (1 week)

Translate + verify **`CRITICAL_PREFIXES` only**:

- `common.*`, `nav.*`, `auth.*`, `errors.*`, `roles.*`  
- `pages.students.*`, `pages.fees.{title,subtitle,tabs,toast,confirm,status}.*`  
- `pages.settings.*`, `pages.profile.*`  
- `public.apply*`, `public.register*`, `public.invite*`, `public.landing.{hero,nav,cta,signIn}.*`  

| Acceptance |
| :--- |
| `i18n:check` — zero critical-path EN leftovers for fr, hi, zh-Hans |
| `npm run test:i18n` green |

### Phase C — Full namespace parity (2–4 weeks, batched)

| Batch | Namespace | Priority |
| :--- | :--- | :--- |
| C1 | `public.*` (landing, pricing, modules) | Marketing |
| C2 | `pages.dashboard.*`, `pages.superAdmin.*` | Daily use |
| C3 | `pages.*` remainder (features alphabetically) | 200–300 keys/week |
| C4 | `errors.*` edge codes | Low traffic |

Per batch:

1. Update TM JSON  
2. Rebuild locales  
3. `i18n:check` → 0 missing for that namespace  
4. Spot-check in UI (switch language on 3 representative pages)  

### Phase D — QA & CI (ongoing)

| # | Work | Acceptance |
| :--- | :--- | :--- |
| D.1 | Add `i18n:check` to PR workflow (after Phase B) | Regressions blocked |
| D.2 | Nightly: `e2e/i18n-locale.spec.ts` for fr, hi, zh-Hans | Login + one nav click |
| D.3 | Script QA: Devanagari / Han script presence tests in `test:i18n` | Already partial — extend |
| D.4 | Update `I18N_PLAN.md` status banner to match reality | No false “0 missing” claims |

---

## 5. Acceptance (definition of done)

For each of **fr**, **hi**, **zh-Hans**:

- [ ] `npm run i18n:check` — **0 missing leaves** in `REQUIRED_NS` (excluding print allowlist)  
- [ ] **0 critical-path English leftovers**  
- [ ] `npm run test:i18n` — script + resolve tests pass  
- [ ] Manual: Login → Dashboard → Students → Fees → Settings in locale — no raw `pages.foo.bar` keys visible  
- [ ] Arabic RTL unchanged; hi/zh use correct fonts (system stack OK)  

**Not required for done:** print templates in locale language.

---

## 6. Baseline gap table (2026-08-06 snapshot)

| Locale | Missing `pages` (approx) | Missing `public` (approx) | Missing `nav` |
| :--- | ---: | ---: | ---: |
| fr | 863 | 284 | 8 |
| hi | 919 | 353 | 8 |
| zh-Hans | 919 | 353 | 8 |

*Re-run `i18n:check` after Phase A to refresh.*

---

## 7. Verification

```bash
npm run i18n:check
npm run test:i18n
npm run test:email-i18n
# Nightly:
E2E_ENABLED=1 npm run test:e2e -- e2e/i18n-locale.spec.ts
```

**Rebuild:** `frontend-spa` only (unless email catalog changes → `identity`).

---

## 8. Risks

| Risk | Mitigation |
| :--- | :--- |
| Machine translation quality | Human review on critical path; glossary for SMS terms (Registrar, Gradebook, …) |
| Large PR diffs | One locale per PR or namespace batch |
| `complete: false` user confusion | Prefer finishing Phase B before flipping flags |
| Print scope creep | Hard allowlist in checker |

---

## 9. Change log

| Date | Note |
| :--- | :--- |
| 2026-08-06 | Plan authored — fr/hi/zh-Hans parity + print EN exception |
| 2026-08-06 | **Phase B done:** critical-path TM batch (`scripts/i18n-data/*-critical.json`); `npm run i18n:check` green for fr/hi/zh-Hans critical surfaces |
