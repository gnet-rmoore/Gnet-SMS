# Custom error pages

> **Status:** done (2026-07-31)  
> **Scope:** Branded SPA error / system pages for all users  
> **Owning surface:** frontend-spa (`src/pages/errors/*`, `ErrorPageShell`, `AppErrorBoundary`, `OfflineGate`)

## Pages

| Path | Code | When |
| :--- | :--- | :--- |
| `/404` + catch-all `*` | 404 | Unknown public URL |
| `/:slug/*` and `/super-admin/*` unknown nested path | 404 (embedded) | Unknown page inside Layout |
| `/forbidden?reason=role\|capability` | 403 | `ProtectedRoute` role/capability denial (was silent redirect to dashboard) |
| `/error` | 500 | Manual / deep link; also rendered by `AppErrorBoundary` on render or chunk-load failure |
| `/offline` | — | Deep link; `OfflineGate` also swaps the tree when `navigator.onLine` is false |
| `/apply/:slug` school missing / apply disabled | 404 / 403 | Public apply gate (AD-E6) |
| `/school-unavailable` | — | Suspended / blocked school tenant |

## Behavior notes

- Shared chrome: `ErrorPageShell` (Executive Slate, language select, CTAs).
- Chunk-load failures show “Update required” copy and reload.
- Offline gate restores the previous tree when the browser fires `online`.
- i18n under `public.errorPages` (+ existing `public.schoolUnavailable`).

## Verify

1. Open `/this-is-not-a-route` → 404 page  
2. Sign in as Teacher → open a School Admin–only URL → `/forbidden`  
3. Temporarily throw in a page → ErrorBoundary 500 → Try again  
4. DevTools → Network → Offline → Offline page → go online → app returns  
5. Suspended school login → `/school-unavailable` (unchanged)
