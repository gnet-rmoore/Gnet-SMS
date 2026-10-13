# School reports — Plan

> **Status:** Done (2026-07-23) — honest school reports hub  
> **Scope:** School-scoped summary for Principal / Admin / VPI / VPA / IT Admin  
> **Companion:** `IMPLEMENTATION_STATUS.md`

## 0. Summary

| Area | Behavior |
| :--- | :--- |
| Page | `/:slug/reports` — roster, attendance, finance (role-gated), ops/leave signals |
| Export | CSV of available metrics only (no fake PDFs) |
| Chart | Finance monthly fees in vs outflow when role + data allow; otherwise empty state |
| Links | Jump to Attendance, Fees, Expenses, Leave, Work Orders, Students |

### 2026-07-23 — Honest School Reports

- **Change:** Replaced hardcoded attendance/GPA/fee KPIs and fake report downloads with Identity stats, Lifecycle attendance stats, Finance summary (when permitted), Work Orders / Leave pending counts; Executive Slate UI; CSV export
- **Services:** identity, lifecycle, finance, ops, staff (+ frontend SPA)
- **UI / API:** `/:slug/reports`
- **Status:** done
- **Verify:**
  - [ ] Principal sees students/teachers and attendance % from API (or — if none)
  - [ ] Cash flow chart uses finance summary months — empty when no paid fees/spend
  - [ ] Export CSV downloads real rows only
  - [ ] No “94.2%”, “3.45 GPA”, or fake PDF file list

## 1. Role gating

| Data | Roles |
| :--- | :--- |
| Roster stats | All report viewers |
| Attendance stats | Admin / Principal / VPI / VPA (matches attendance API) |
| Finance summary | Admin / Principal / VPA (accountant also API-capable; not on reports nav) |
| Work orders / leave | Admin / Principal / VPA |
| Route access | `SCHOOL_ADMIN`, `PRINCIPAL`, `VPI`, `VPA`, `IT_ADMIN` |
