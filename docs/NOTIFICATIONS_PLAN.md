# In-app notifications & nav badges — Implementation plan

> **Status:** Done (Phases 1–3) — 2026-07-23  
> **Scope:** Working header notification bell + honest sidebar link badges, app-wide  
> **Companion:** `IMPLEMENTATION_STATUS.md`, `FRONTEND_GUIDELINES.md`, Settings → Notifications prefs

---

## 0. Summary (shipped)

| Area | Behavior |
| :--- | :--- |
| Bell | Real unread count + dropdown; mark one / mark all; navigate via `href` |
| Sidebar badges | Inbox `nav-badges` + queue soft-counts (pending leave, open work orders) |
| Full inbox | `/{slug}/notifications` with `?notificationId=` highlight |
| Producers | Grades, leave submit/decision, announcements, fee paid/due, work order assign/complete |
| Prefs | Extended keys including `LEAVE_SUBMITTED`, `WORK_ORDER_*`; School Admin can add custom categories in Settings → Notifications |

### 2026-07-23 — Full implement (Phases 1–3)

- **Change:** Comms `GET /api/notifications/nav-badges`; SPA feature module + Layout badges; Identity users-by-role for announcement fan-out; producers in staff/finance/ops/comms; notifications page + a11y
- **Services:** identity, comms, staff, finance, ops, academic (href), frontend-spa
- **Status:** done

---

## Verify

- [ ] Bell shows count only when unread &gt; 0 (no permanent decorative dot)
- [ ] Create announcement → target roles get inbox rows + announcements badge
- [ ] Submit leave → approvers get `LEAVE_SUBMITTED` + leave-approval badge
- [ ] Approve/reject leave → requester gets `LEAVE_DECISION`
- [ ] Assign work order → assignee notified; complete → requester notified
- [ ] Fee reminder / collect → student `FEE_DUE` / `FEE_PAID`
- [ ] Mark all read clears bell + inbox-derived sidebar badges
- [ ] `/{slug}/notifications` lists history; `?notificationId=` highlights

## Architecture notes

See prior sections in git history for the original plan diagram. Inbox lives in Comms `InAppNotification`; shell polls every 45s + focus refetch.
