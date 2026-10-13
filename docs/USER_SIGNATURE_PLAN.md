# Official user signatures — Plan

> **Status:** Done (2026-07-23)  
> **Scope:** Staff / admin official signature on Profile for attaching to documents  
> **Companion:** `IMPLEMENTATION_STATUS.md`

## 0. Summary

| Area | Behavior |
| :--- | :--- |
| Who | Super Admin + school staff roles (not Student/Parent) — see `canManageOfficialSignature` |
| Where | Profile (`/:slug/profile` and `/super-admin/profile`) |
| Capture | Draw on canvas **or** upload PNG/JPEG (compressed) |
| Storage | Identity `User.signatureUrl` (data URL), same pattern as `photoUrl` |
| Session | Returned on login; `authStore.updateUser` / `AuthUser.signatureUrl` |
| Documents | Use `getOfficialSignatureUrl(user)` from `src/lib/userSignature.ts` when generating PDFs |

## 1. Owning services

| Concern | Service |
| :--- | :--- |
| Persist signature | **Identity** |
| Profile UI | **frontend-spa** |

## 2. Change log

### 2026-07-23 — Official signature on Profile

- **Change:** Users can draw or upload an official signature from Profile; save/remove via `PATCH /api/users/:id` `{ signatureUrl }`; login returns `signatureUrl`
- **Services:** identity, frontend-spa
- **Status:** done
- **Verify:**
  - [ ] School Admin → Profile → Draw → Save → signature preview persists after refresh
  - [ ] Upload PNG → Save → Replace / Remove works
  - [ ] Student profile does **not** show the signature card

## 3. Document attachment (consumers)

> **Status:** Done (2026-08-04) — see `docs/DOCUMENT_SIGNATURES_PLAN.md`

When adding a signature to a PDF or print layout:

1. Map staff in **Settings → Appearance → Document signatures** (`School.documentSignatories`).
2. Resolvers load staff `signatureUrl` via `resolveDocumentSignatory` / `getOfficialSignatureUrl`.
3. If null, show a blank signature line (do not invent a signature).

**Wired consumers:** graduation certificates, report cards, gradesheets, fee receipt PDFs.
