# Feature modules

School domain UIs live under `src/features/<domain>/` so route files in `src/pages/School/` stay thin re-exports.

## Folder convention

```
src/features/<domain>/
  Page.tsx              # Feature root screen (orchestration, tabs, local UI state)
  api.ts                # Thin wrappers around `api` from `src/services/api.ts`
  types.ts              # Optional shared types for the feature
  hooks/
    useXxxQuery.ts      # Primary React Query load (+ invalidate helper)
  components/           # Presentational extracts (tables, modals, panels, tabs)
```

**Reference implementation:** `src/features/registrar/`  
(`api.ts` + `hooks/useRegistrarQuery.ts` + `components/*Modal.tsx` + `Page.tsx`)

## Rules

1. **Pages re-export** — `src/pages/School/<Name>.tsx` should be one line:
   `export { Feature } from "../../features/<domain>/Page";`
2. **api.ts** — wrap list/fetch and common mutations. Prefer `api.get/post/patch/delete`. No secrets on the client.
3. **hooks/** — primary server reads use `@tanstack/react-query`. After mutations, call `invalidate()` from the hook so lists stay fresh.
4. **components/** — extract meaningful UI (modals, tables, large panels). Keep existing Tailwind / Executive Slate styling; do not redesign when splitting.
5. **Page.tsx** — compose hooks + components; keep orchestration, filters, and ephemeral UI state here. Mutations may call `*Api` or (temporarily) `fetch` with `Authorization`, then `invalidate`.
6. **Import depth** — from `Page.tsx` / `api.ts`: `../../store/...`, `../../services/api`. From `hooks/`: one extra `../` (`../../../store/...`).

Shared query-key helpers: `src/features/queryKeys.ts`.

## Phase 6 checklist (god-page split)

For each feature:

- [ ] `api.ts` with thin wrappers
- [ ] `hooks/useXxxQuery.ts` using `@tanstack/react-query`
- [ ] ≥2 components under `components/`
- [ ] `Page.tsx` wired to hooks/components (no duplicate primary `useEffect` fetch that races the hook)
- [ ] Behavior preserved (same UI, same endpoints)

## Example wiring

```tsx
// Page.tsx
const { students, loading, invalidate } = useStudentsQuery();
// ...
await studentsApi.updateUser(id, data);
invalidate();
```
