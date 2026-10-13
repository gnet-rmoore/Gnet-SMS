# Document signatures — Plan

> **Status:** Done (2026-08-04)  
> **Owner:** identity (school defaults), frontend-spa (print layouts), finance (receipt PDF)  
> **Depends on:** `docs/USER_SIGNATURE_PLAN.md` (Profile draw/upload → `User.signatureUrl`)  
> **Companion:** `IMPLEMENTATION_STATUS.md`

## 0. Goal

Let schools **place saved staff official signatures** on printable / PDF official documents (certificates, report cards, gradesheets, fee receipts) instead of blank signature lines — without inventing signatures when none exist.

## 1. Product rules (honest)

| Rule | Behavior |
| :--- | :--- |
| Source of truth | Identity `User.signatureUrl` (data URL) for the chosen staff member |
| Missing signature | Blank line under the role label — never invent or reuse another person’s image |
| Who configures | School Admin / Principal (Settings → Appearance → Document signatures) |
| Who overrides | Certificates page staff pickers when issuing |
| Soft fallback | **Off** — empty Settings → blank line |

## 2. What shipped

| Area | Detail |
| :--- | :--- |
| Identity | `School.documentSignatories` JSON; extended `certificateDefaults` with `sig1UserId` / `sig2UserId` |
| Settings | Slot pickers + mini signature preview |
| Certificates | Staff picker + image on all four templates |
| Report cards | Principal / Registrar / academic slots via `SigBlock` / Liberian `SigLine` |
| Gradesheets | Principal signature image on all three templates |
| Fee receipts | Accountant (then Principal, then issuer) signature on PDF |

## 3. Verify

- [ ] Settings → map Principal to staff with Profile signature → certificate preview shows image
- [ ] Remove Profile signature → next preview shows blank line
- [ ] Report card / gradesheet Principal line shows image when mapped
- [ ] Fee receipt PDF shows Accountant signature when mapped
- [ ] Student/Parent cannot be selected as document signatories (staff list only)

## 4. Change log

### 2026-08-04 — Document signatures on official printouts

- **Change:** School maps staff signatures to document roles; certificates, report cards, gradesheets, and fee receipts render images or blank lines
- **Services:** identity, finance, frontend-spa
- **Status:** done
