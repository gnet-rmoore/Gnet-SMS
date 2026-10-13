---
name: watch-console-while-clicking
description: >-
  Continuously monitors server and app console logs while the user clicks through
  pages to catch runtime crashes and broken routes. Use when the user is live-testing
  the app, says pages are not working, asks to watch console/logs, or says they are
  clicking around the UI.
---

# Watch console while clicking

## User instruction (verbatim)

Please be constantly checking the console logs, because I am clicking pages, and some pagesn not working

## When this applies

Apply immediately and keep doing it for the rest of the session whenever the user is navigating the running app (school admin or other roles) and reporting broken pages.

## Workflow

1. **Start a live log stream** (do not wait for the user to paste errors):
   - Prefer Docker: `docker compose logs -f --tail=0 api-gateway identity classroom lifecycle ops staff academic finance comms frontend-spa`
   - If Vite/dev is used instead: watch the terminal running the API and the Vite process
   - Use `block_until_ms: 0` so streaming continues in the background

2. **Watch for failures while they click**:
   - HTTP `4xx` / `5xx`, `502`, `Host is unreachable`
   - `prisma:error`, DB disconnects, unmatched routes
   - Frontend chunk loads followed by **no** matching API calls (likely a client crash before fetch)
   - Browser/runtime clues implied by navigation: page reload loops, blank screens after a chunk load

3. **On each failure, fix ASAP**:
   - Trace the route/chunk → feature `Page.tsx` / presentational extract under `src/features/**/components`
   - Common extract bugs: undefined JSX props (`subject={subject}` when `subject` is only a map local), missing imports/hooks (`useNavigate` / `useParams` / lucide / recharts), truncated JSX
   - Patch the root cause; do not only restart containers

4. **Redeploy what they are hitting**:
   - SPA-only fixes: `docker compose build frontend-spa && docker compose up -d frontend-spa`
   - Tell the user to hard-refresh so the new `index-*.js` bundle loads
   - If API/DB died: `docker compose up -d postgres redis identity lifecycle ops staff classroom academic finance comms api-gateway frontend-spa` and confirm gateway `/health/ready`

5. **Keep watching**:
   - After fixes, restart the log stream with `--tail=0` so old errors are not re-matched
   - Brief the user on what broke and what was fixed; invite them to keep clicking

## Do / don't

- Do treat log watching as continuous background work, not a one-shot check
- Do correlate path + asset name (e.g. `Classrooms-*.js`) with source under `src/features/`
- Don't stop after the first fix if they are still testing
- Don't ask them to paste console output if you can stream logs yourself
