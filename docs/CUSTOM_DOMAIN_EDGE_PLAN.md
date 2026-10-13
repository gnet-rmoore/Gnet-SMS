# Custom domain edge (TLS + Host routing) — Implementation plan

> **Status:** Phase 1 shipping (2026-07-31) — SPA Host catch-all, TLS ask + optional Caddy profile, SA ops UI + docs + Help glossary.  
> **Goal:** Close the previous “out of scope” gap: verified custom domains can hit the app on any Host, with documented HTTPS via edge (Caddy on-demand TLS) rather than inventing in-app cert storage.  
> **Owning:** `nginx.conf` / `frontend-spa`, `docker/edge`, identity public + SA APIs, School Detail UI, `docs/CUSTOM_DOMAIN_EDGE.md`, SA Help.  
> **Companion:** `docs/SUPER_ADMIN_PLATFORM_PLAN.md`, `docs/SA_HELP_GLOSSARY_PLAN.md`

---

### Changelog

| Date | Note |
| :--- | :--- |
| 2026-07-31 | Brought edge TLS/routing into scope; implement nginx `_`, Caddy profile, ask endpoint, SA Help |

---

## What ships

1. **SPA nginx** accepts any `Host` (`server_name _`) so CNAME → platform IP serves the same SPA/API.  
2. **`GET /api/public/domain-tls-ask?domain=`** — 200 only for platform hosts or **verified** custom domains (Caddy `on_demand_tls` ask).  
3. **Optional compose profile `edge`** — Caddy terminates TLS and reverse-proxies to `frontend-spa`.  
4. **SA School Detail** — CNAME target, HTTPS steps, copyable snippets.  
5. **`GET /api/super-admin/domain-edge`** — edge hostname + verified domain list + nginx/caddy snippets.  
6. **Docs + Super Admin Help** glossary covering domain ops and all key SA terms.

## Honest limits

- Local Docker without the `edge` profile stays HTTP on `:8080`.  
- Production still needs DNS CNAME + opening 443 on the edge host.  
- We do **not** store private keys in Postgres or run certbot inside Identity.
