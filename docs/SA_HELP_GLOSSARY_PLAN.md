# Super Admin Help & glossary — Implementation plan

> **Status:** Phase 1 shipped (2026-08-04) — index at `/super-admin/help` + per-term detail pages at `/super-admin/help/:entryId` with expanded sections, related terms, and console links.  
> **Goal:** Add a Super Admin **Help** page that defines key platform terms and short how-to tips for operators.  
> **Non-goals:** Replacing the interactive Platform Guide tour (`/super-admin/guide`); school-staff help; CMS/wiki editing.  
> **Owning surfaces:** SPA (`frontend-spa`); companion edge docs in `docs/CUSTOM_DOMAIN_EDGE.md`.  
> **Companion:** `docs/SUPER_ADMIN_PLATFORM_PLAN.md`, `docs/CUSTOM_DOMAIN_EDGE_PLAN.md`

---

### Changelog

| Date | Note |
| :--- | :--- |
| 2026-07-31 | Plan authored — no implementation yet |
| 2026-07-31 | **Shipped:** glossary page, nav Help, dashboard Glossary link, tests |
| 2026-08-04 | **Shipped:** per-term detail routes, enriched sections, related-term cross-links |

---

## 0. Product intent

Super Admins see jargon on Plans, Reports, School Detail, Operators, and Settings (MRR, entitlements, custom domain, dual-control delete, DSR, etc.) without an in-app glossary. The interactive **Platform Guide** teaches navigation/steps; this page is a **searchable reference** of definitions + “where to go / what it does.”

**Definition of done:** From the SA sidebar, open **Help**, search/filter terms by category, open any term for a full explanation page, and jump to the related console page when useful.

---

## 1. Decisions (defaults — change on approve)

| Decision | Default |
| :--- | :--- |
| Route | `/super-admin/help` (index) · `/super-admin/help/:entryId` (detail) |
| Nav | Account section: Help (CircleHelp icon), after Settings; keep Guide separate if already linked elsewhere |
| Content source | Static TS catalog in SPA (`src/features/super-admin-help/glossary.ts`) — editable in code, not DB |
| Categories | Billing & plans · Tenants & schools · Identity & operators · Security & compliance · Domains & delivery · Reports & logs |
| UI | Executive Slate: search + category chips on index; detail page with sections, tips, related terms, console CTA |
| i18n | English definitions in catalog; page chrome via `pages.superAdmin.helpPage.*` (en required; other locales fall back) |
| Relation to Guide | Help page links to `/super-admin/guide` for the walkthrough; glossary ≠ tour |

---

## 2. Key terms (initial catalog)

Include at least:

- Plan / catalog plan · Entitlement · Quota · List price · MRR · ACTIVE_PAID / trial statuses · Checkout  
- School / tenant · Slug · Registration · Suspend / disable  
- Platform operator · OWNER / SUPPORT (capabilities) · Impersonation  
- Custom domain · TXT verification · resolve-host  
- Dual-control delete · DSR export · Audit / system logs · Broadcast · Mail delivery log · Maintenance mode  
- Impersonation window · School health / notes  

Each entry: `id`, `term`, `category`, `shortDef`, `detail` (optional), `sections[]`, `relatedTermIds[]`, `relatedPath` (optional), `tips[]` (optional).

---

## 3. Phases

### Phase 0 — Page + nav (single pass)

- [x] `src/features/super-admin-help/glossary.ts` + `Page.tsx` + `src/pages/SuperAdmin/Help.tsx` re-export  
- [x] Route in `App.tsx`; nav item in `navByRole.ts`; i18n nav label  
- [x] Search + category filter; empty state; links to related routes  
- [x] Update this plan status + `IMPLEMENTATION_STATUS.md`  
- [x] Rebuild `frontend-spa`

### Phase 1 — Detail pages

- [x] `EntryDetailPage.tsx` + route `/super-admin/help/:entryId`  
- [x] Index cards link to detail; full sections + related terms on detail  
- [x] i18n chrome keys for detail page  
- [x] Rebuild `frontend-spa`

---

## 4. Acceptance checks

- [ ] SUPER_ADMIN sees Help in sidebar; other roles do not  
- [ ] Searching “custom domain” / “MRR” / “DSR” finds the right cards  
- [ ] Clicking a term opens `/super-admin/help/<id>` with sections and related links  
- [ ] Related console links open existing SA pages (Plans, Schools, Operators, Settings, Logs, Reports, Guide)  
- [ ] No fake telemetry; copy matches shipped behavior (honest about limits)

---

## 5. Verify

```bash
# After ship
docker compose up --build -d frontend-spa
# Open /super-admin/help as SUPER_ADMIN; search MRR; open custom-domain detail
```
