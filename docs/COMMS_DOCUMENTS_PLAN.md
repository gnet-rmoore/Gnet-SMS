# Communications & School Documents — Plan

> **Status:** Complete (2026-07-23) — Documents library UI + role scoping + uploader enrich  
> **Scope:** School document library (policies, forms, materials) for managers and role-scoped viewers  
> **Companion:** `IMPLEMENTATION_STATUS.md`

## 0. Summary

| Area | Behavior |
| :--- | :--- |
| List | `GET /api/schools/:schoolId/documents` — managers see all; non-managers auto-scoped to their role (or explicit `?role=`) |
| Create / update / delete | School Admin, Principal, VPI, VPA, Registrar, Teacher |
| Categories | `POLICY`, `FORM`, `TEACHING_MATERIAL`, `HR`, `ACADEMIC`, `OTHER` |
| Access | JSON array of roles stored on each document; viewers only open docs that include their role |
| Uploader | Comms enriches `uploadedBy` via Identity internal user lookup (`uploader.name`) |
| UI | `/:slug/documents` — Executive Slate card library; Staff Portal → Documents tab (read) |
| Attachments | Paste HTTPS URL, or attach a small file (≤1.5 MB inline). Larger files must use a hosted URL. |

### 2026-07-23 — Documents flow polish

- **Change:** Rebuilt Documents page (search, category chips, honest stats, FeatureModalShell upload/edit, toasts); role-aware list; uploader name join; unified categories with Staff Portal; validation on create/update
- **Services:** comms (+ frontend SPA); compose adds `IDENTITY_URL` + `INTERNAL_SERVICE_TOKEN` on `comms`
- **UI / API:** `/:slug/documents`; Staff Portal documents tab; `GET/POST …/documents`, `PUT/DELETE /api/documents/:id`
- **Status:** done
- **Verify:**
  - [ ] School Admin uploads a document with roles → appears in library with uploader name
  - [ ] Student/parent only sees docs that include their role; no Upload button
  - [ ] Search + category chips filter the list; empty state when no matches
  - [ ] Edit / delete with confirm; toast on success/error (no `alert`)
  - [ ] Staff Portal Documents tab shows same categories and opens file

## 1. Owning services

| Concern | Service |
| :--- | :--- |
| Document CRUD + role filter | **Comms** |
| Uploader name / role | **Identity** (internal GET) |
| SPA | **frontend-spa** |

## 2. Flows / rules

1. Manager opens Documents → lists all school documents (newest first).
2. Manager uploads → title, optional description, file URL or small attachment, category, access roles → `POST`.
3. Viewer (student/parent/etc.) → API filters to documents whose `accessRoles` contains their role.
4. Open → navigates to `fileUrl` in a new tab.
5. Staff Portal Documents tab uses the same list API with `?role=` for the signed-in staff role.

## 3. Acceptance

- [x] Executive Slate chrome; no fake KPIs
- [x] Toasts + `confirmAction` (no `window.alert` / `confirm`)
- [x] Working search and category filters
- [x] Role-scoped listing for non-managers
- [x] Uploader display via Identity enrichment (fallback “School staff”)
- [ ] Optional follow-up: MinIO/presigned upload for large school documents (same pattern as admissions)
