# Finance fee templates — Entrance + regional school fees

> **Status:** Planned — awaiting confirmation  
> **Requested:** 2026-08-07 — Finance (Accountant) sets templates for **Entrance fee** and other school fees (US, Europe, Liberia)  
> **Companions:** `docs/FINANCE_BILLING_PLAN.md`, `docs/FEE_SCOPE_ELIGIBILITY_PLAN.md`, `ONBOARDING_AND_ADMISSION_PLAN.md`

## 0. Goal

Give **Accountants** a single place (`/:slug/fees → Templates`) to define reusable fee schedules — including **Entrance** — with correct **currency display** for schools in the **US, Europe, and Liberia**, and wire admissions billing to those templates instead of ad-hoc amounts.

## 1. Current state (honest)

| Area | Status |
| :--- | :--- |
| Fee templates (Tuition, Exam, Library, Transport, Other) | **Shipped** — CRUD + batch apply in Finance |
| Accountant must invoice from template | **Enforced** server-side |
| `ENTRANCE` fee type on invoices | **Shipped** — but **blocked** in template create UI |
| Entrance fee creation | **Manual amount** in Registrar review modal → Lifecycle internal fee API |
| Admission policy | Identity JSON: `requireEntranceFee`, `entranceFeeAmount` — **not linked to templates** |
| Online registration UI | Does **not** expose entrance-fee policy fields today |
| School currency | **USD everywhere** — `formatMoney(..., "USD")`; no billing currency on school |
| Provisioning seed | Fake `ENTRANCE_CATALOG` invoice — **not** a real `FeeTemplate` |

## 2. Target behavior

### Finance (Accountant)

- Create/edit/delete templates for **all** fee types, including **Entrance**.
- Set **school billing currency** (USD / EUR / LRD) — default derived from school country, overridable.
- Optional: **“Apply regional starter pack”** — one-click seed of common templates for US / EU / Liberia (amounts editable after).
- Mark which Entrance template is the **default for new admissions** (stored in admission policy).

### Admissions (Registrar)

- When `requireEntranceFee` is on, **Create entrance fee** in review modal prefills from the linked Entrance template (Registrar may override amount).
- Online registration card exposes: require entrance fee toggle + **pick default Entrance template** (read list from Finance API).

### Enroll gate

- Unchanged: paid entrance invoice required when policy says so.

## 3. Owning services

| Concern | Service |
| :--- | :--- |
| `FeeTemplate`, billing currency | `finance` |
| `admissionPolicy.entranceFeeTemplateId` | `identity` |
| Resolve template on create-entrance-fee | `lifecycle` |
| Fees UI, template modal, billing settings card | `frontend-spa` |
| Regional starter templates on provision | `identity` → `finance` internal API |

## 4. Phases

### Phase A — Entrance templates in Finance UI (small)

**Changes**

- Remove `ENTRANCE` filter in `TemplateModal.tsx` (and batch/invoice modals if needed for consistency).
- Templates tab: badge/help text for Entrance templates (“Used for new student admissions”).
- Enforce at most **one default Entrance template** per school via admission policy pointer (not a DB flag on template).

**Files:** `src/features/fees/components/TemplateModal.tsx`, `TemplatesTab.tsx`, i18n `pages.fees.*`

**Acceptance:** Accountant can create “Entrance fee — New students” template with amount + cohort `NEW`.

---

### Phase B — School billing currency (US / EU / Liberia)

**Changes**

- Extend `SchoolBillingSettings` with `currency String @default("USD")` — allowed: `USD`, `EUR`, `LRD`.
- `GET/PATCH /api/schools/:schoolId/billing-settings` — roles: `SCHOOL_ADMIN`, `ACCOUNTANT`.
- Default currency when unset:
  - School `country` Liberia / `LR` → `LRD`
  - EU member countries (shared list) → `EUR`
  - Otherwise → `USD`
- Fees UI: load billing settings; pass currency into `formatMoney` across ledger, templates, batch, overview.
- Stripe checkout: use billing currency (lowercase) when creating session.

**Files:** `services/finance/prisma/schema.prisma`, migration, `financeService.ts`, `financeRoutes.ts`, `src/features/fees/*`, `src/i18n/format.ts` usage sites

**Acceptance:** Liberian school sees amounts as `LRD`; German school as `EUR`; US as `USD`. Accountant can change currency in Fees settings card.

**Out of scope (follow-up):** FX conversion, multi-currency on one school, LRD Stripe rails.

---

### Phase C — Wire admissions to Entrance template

**Changes**

- Extend `AdmissionPolicy`:
  - `entranceFeeTemplateId?: string | null`
  - Keep `entranceFeeAmount` as **deprecated fallback** (sync from template amount when template selected).
- Identity `mergeAdmissionPolicy` + Lifecycle mirror.
- Finance internal: `GET /api/internal/schools/:schoolId/fee-templates/default-entrance` OR resolve by policy ID.
- `createEntranceFeeForApplication`:
  1. If request `amount` > 0 → use it.
  2. Else if policy `entranceFeeTemplateId` → load template amount (+ store `templateId` on invoice).
  3. Else if policy `entranceFeeAmount` → use it.
  4. Else 400 with clear error (“Configure an Entrance fee template in Finance”).
- Registrar `ApplicationReviewModal`: prefill amount from linked template; show template name.
- `OnlineRegistrationCard`: toggles `requireEntranceFee` + dropdown of Entrance templates (Finance GET).

**Files:** `services/identity/src/lib/admissionPolicy.ts`, `services/lifecycle/src/services/admissionService.ts`, `services/lifecycle/src/lib/financeClient.ts`, `services/finance/src/services/financeService.ts`, registrar components, `usePageActions.ts`

**Acceptance:** Accountant sets Entrance template $150 → Registrar opens review → amount prefilled → Create entrance fee invoice uses template amount and `templateId`.

---

### Phase D — Regional starter fee packs

**Changes**

- Replace `starterPack.ts` fake invoice with `POST /api/internal/fee-templates/bulk` (new internal route).
- Packs keyed by region (`US` | `EU` | `LR`), derived from school country at provision:

| Region | Example templates (names only; amounts = 0, Accountant edits) |
| :--- | :--- |
| **US** | Entrance / Registration, Annual Tuition, Activity Fee, Transportation |
| **EU** | Registration, Tuition, Examination Fee, Canteen / Meals |
| **Liberia** | Entrance Fee, Tuition, PTA Levy, Uniform Fee |

- Set admission policy: `requireEntranceFee: false` by default; if Entrance template seeded, set `entranceFeeTemplateId` to that template.
- Onboarding checklist: still “≥1 fee template” — now satisfied by starter pack.

**Files:** `services/identity/src/lib/starterPack.ts`, `services/finance/src/routes/internalRoutes.ts`, `packages/shared` or finance lib for pack definitions

**Acceptance:** New US school gets 4 editable templates; new LR school gets Liberian-named pack with LRD currency default.

---

### Phase E — Finance “Fee catalog” UX polish

**Changes**

- Fees page → Templates tab: group by type; highlight Entrance + link to admissions policy.
- Optional card: **Billing & region** (currency + “Re-apply starter pack” with confirm — additive only, never deletes existing templates).
- Docs + role note: Accountant owns fee templates; Registrar picks admission Entrance template.

**Files:** `src/features/fees/Page.tsx`, `TemplatesTab.tsx`, new `BillingSettingsCard.tsx`, `ROLES_DOCUMENTATION.md`, `docs/FINANCE_BILLING_PLAN.md`, `ONBOARDING_AND_ADMISSION_PLAN.md`

---

## 5. API summary (new/changed)

| Method | Path | Notes |
| :--- | :--- | :--- |
| PATCH | `/api/schools/:id/billing-settings` | `{ currency }` |
| GET | `/api/schools/:id/billing-settings` | Returns `{ currency, minPaymentAmount }` |
| PATCH | `/api/schools/:id/admission-policy` | Add `entranceFeeTemplateId`; allow ACCOUNTANT **read** (optional write: REGISTRAR+ only for policy toggle) |
| POST | `/api/internal/fee-templates/bulk` | Seed regional pack (internal) |

## 6. Tests

| Suite | Cases |
| :--- | :--- |
| `tests/fee-scope.test.ts` | Entrance template create; currency on settings |
| `tests/onboarding-admission.test.ts` | create-entrance-fee resolves template amount; enroll gate unchanged |
| Frontend smoke | Templates tab shows Entrance; review modal prefills |

## 7. Verification checklist

1. Login as **Accountant** → Fees → Templates → create Entrance template in **LRD** school → amount shows LRD.
2. Set as default via admission policy (or Online registration card).
3. Registrar → review application → Create entrance fee → invoice matches template.
4. Pay invoice → application advances; enroll succeeds when policy requires fee.
5. New school in Liberia → starter pack templates present with LRD currency.

## 8. Risks / decisions

| Decision | Recommendation |
| :--- | :--- |
| Single source of truth for entrance amount | **FeeTemplate** via `entranceFeeTemplateId`; deprecate free-form policy amount |
| Accountant edits admission policy? | **Read** templates in Finance; **Registrar/Admin** sets `requireEntranceFee` + template pick in Admissions |
| Multi-currency Stripe | USD/EUR only for checkout initially; LRD **cash desk only** (document honestly) |
| Template delete | Block delete if referenced as `entranceFeeTemplateId` |

---

## 9. Implementation order

```
A (Entrance in UI) → B (currency) → C (admission wire) → D (starter packs) → E (UX polish)
```

Estimated touch: **finance**, **identity**, **lifecycle**, **frontend-spa**; tests; docs.

**Ready to implement after your confirmation** (or say “skip plan / start with Phase A only”).
