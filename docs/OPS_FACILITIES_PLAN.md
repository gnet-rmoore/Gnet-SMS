# Ops & facilities — Plan

> **Status:** Done for planned v1 scope (2026-07-23) — work orders + Facilities Hub (overview/inventory) + procurement/security incident routes; fake PM/assets/techs removed  
> **Scope:** School facility work orders, Facilities Hub overview/inventory  
> **Companion:** `IMPLEMENTATION_STATUS.md`

## 0. Summary

| Area | Behavior |
| :--- | :--- |
| Work Orders page | `/:slug/work-orders` — search, status, priority, sort; honest counts; assign real staff |
| Facilities Hub | `/:slug/maintenance` — Overview / Work orders / Inventory; drawer detail; `?tab=` deep links; no fake PM/assets/techs |
| Create WO | School Admin / Principal / VPA / Maintenance |
| Inventory | Create part + adjust quantity (±1/±5); Ops PATCH may update qty/min/name/category/unit |
| API | Ops: work-orders + inventory routes |

### 2026-07-23 — Facilities Hub honesty + slate

- **Change:** Removed fake technicians, PM schedules, asset registry, and fake activity feed; Executive Slate hub with Overview / Work orders / Inventory; FeatureModalShell create forms; real staff job counts; link to full Work Orders page
- **Services:** ops (+ frontend SPA)
- **UI / API:** `/:slug/maintenance`
- **Status:** done
- **Verify:**
  - [ ] Overview stats match real open / in-progress / completed / low-stock counts
  - [ ] No Marcus Vance / Elena Rostova / Dave Miller / Tyrone Washington
  - [ ] Add inventory part → appears in table; ± quantity works
  - [ ] Create WO from hub → appears under Work orders tab

### 2026-07-23 — Work orders UI + assign honesty

- **Change:** Executive Slate work-orders page; FeatureModalShell create; detail drawer; staff name join for requester/assignee; removed preset fake technicians; Principal/VPA can update (aligned with route roles); assign auto-progresses Open → In progress
- **Services:** ops (+ frontend SPA)
- **UI / API:** `/:slug/work-orders`
- **Status:** done
- **Verify:**
  - [ ] Create work order → appears in list with requester name
  - [ ] Assign maintenance/admin staff → assignee shown; status becomes In progress if was Open
  - [ ] Set Completed from drawer
  - [ ] Filter by status/priority; empty state when no matches
  - [ ] No Marcus Vance / Elena Rostova / Dave Miller presets

### 2026-07-23 — Work orders deep polish

- **Change:** Optional assignee on create; priority / field patches on Ops API; clickable metric filters + unassigned chip; confirm before complete; priority control in drawer; Facilities Hub link; short order IDs; search by people
- **Services:** ops (+ frontend SPA)
- **UI / API:** `/:slug/work-orders`
- **Status:** done
- **Verify:**
  - [ ] Create with assignee → status In progress and name shown
  - [ ] Change priority from drawer → persists after refresh
  - [ ] Mark completed asks for confirmation
  - [ ] Unassigned filter shows only open/in-progress without assignee
  - [ ] Metric cards filter the list

### 2026-07-23 — Facilities Hub UX polish

- **Change:** Executive dark chrome; Overview stats + recent WO open detail drawer; `?tab=` deep links; Cancelled filter; confirm complete/cancel; inventory ±1/±5 adjust; Ops inventory PATCH accepts qty/min/name/category/unit; VPA + Maintenance nav point at Facilities Hub / Work Orders (no broken Inventory shortcut for Maintenance)
- **Services:** ops (+ frontend SPA)
- **UI / API:** `/:slug/maintenance` (`?tab=overview|work-orders|inventory`); `PATCH /api/inventory/:id`
- **Status:** done
- **Verify:**
  - [ ] Overview → click recent WO → drawer assign/status works
  - [ ] Stat cards jump to Work orders / Inventory with filters
  - [ ] `?tab=inventory` opens Inventory tab
  - [ ] Add part + ±5 quantity persists after refresh
  - [ ] Complete / Cancel prompts for confirmation
  - [ ] Maintenance role can open hub and inventory APIs

## 1. Owning services

| Concern | Service |
| :--- | :--- |
| WorkOrder / InventoryItem CRUD | **Ops** |
| Staff directory for assignees / names | **Identity** (`GET …/staff`) |

## 2. Roles

| Action | Roles |
| :--- | :--- |
| View / create / update WO | `SCHOOL_ADMIN`, `PRINCIPAL`, `VPA`, `MAINTENANCE` |
| Facilities Hub manage | same (+ inventory roles as routed for inventory APIs) |

## 3. Acceptance

- [x] No fabricated technicians in assignee lists or hub roster
- [x] Requester and assignee names resolved from Identity staff list
- [x] Work Orders + Facilities Hub use Executive Slate + `PageToast`
- [x] Facilities Hub inventory is API-backed (no fake stock)
- [ ] Preventative schedules / asset registry not persisted yet (tabs removed until API exists)
- [ ] Vehicles / security logs still separate surfaces
