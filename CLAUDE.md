# CLAUDE.md

Portfolio piece #4: QR table ordering for a fictional noodle shop (เส้นทอง). UI copy is Thai. Sibling of `../komkrip` (same stack and conventions).

## Commands

- `npm run dev` — Vite + `@cloudflare/vite-plugin` (Worker, local D1 and the Hub Durable Object together)
- `npm run db:migrate` / `db:migrate:remote` — apply `migrations/` to local / remote D1
- `npm test` — vitest on `shared/*.test.ts` (pricing + option validation)
- `npm run build` — `tsc -b` (app, node, worker) + vite build
- `npm run deploy` — build + `wrangler deploy` (never bare `wrangler deploy`: it ships stale `dist/`)
- `npm run types` — regenerate `worker-configuration.d.ts` after changing `wrangler.jsonc`

## Architecture

- `shared/menu.ts` — option presets, `checkPicks()` (server-authoritative pricing), order status machine `NEXT`, Bangkok time helpers. Used by UI and Worker.
- `shared/types.ts` — API response shapes.
- `worker/index.ts` — Hono app under `/api`. Public: `/menu`, `/t/:token` (+ `/orders`, `/call`), `/demo`, `/ws`. Staff (cookie): `/staff/*`.
  Order insert is one D1 batch: `INSERT OR IGNORE` sitting (partial unique index = one open sitting per table) → order → lines.
  Status changes are compare-and-set (`WHERE status = ?`).
- `worker/hub.ts` — `Hub` Durable Object, single instance `main`, WebSocket hibernation. Tags: `staff`, `tables`, `t:<id>`.
  Events are hints only; clients refetch over HTTP (`src/live.ts` also re-syncs on reconnect/visibility/30 s).
- `worker/seed.ts` — demo menu + fixed table tokens (server-only; never import from `src/`).
- `worker/demo.ts` — `resetDemo()`; `refreshIfStale()` re-seeds when data is >30 min old AND idle >10 min (seed times are relative). Every mutation `touch`es via `emit()`.
- `src/` — React SPA, pushState router; routes `/`, `/t/:token`, `/kitchen`, `/admin[/menu|/qr|/sales]`.

## Notes

- No `window.confirm`/`alert` anywhere (two-step inline confirms) — keeps Claude-in-Chrome testing unblocked.
- Visual checks: headless Chrome via playwright-core is reliable; Claude-in-Chrome screenshots can time out when the window is occluded.
