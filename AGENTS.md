# Project guide for AI coding agents (Claude Code, Codex, …)

Monorepo (npm workspaces). Read `README.md` for the overview. Product and design documents for the app being built
live in `docs/product/` and `docs/design/` — read them before implementing features.

## Layout

| Path | What |
|---|---|
| `apps/api` | Cloudflare Worker: Hono app under `/api` (`src/index.ts`), routes in `src/routes/`, helpers in `src/lib/`, D1 migrations in `migrations/`, config `wrangler.jsonc`. Also serves `apps/web/dist` as static assets. |
| `apps/web` | React 19 + Vite + Tailwind 4 + React Router 8. Routes in `src/router.tsx`, pages in `src/pages/`, UI kit `src/components/ui.tsx`, session `src/lib/session.tsx`. |
| `apps/mobile` | Expo SDK 58 + Expo Router. Screens in `src/app/` (file = route; `(app)/` is the signed-in tab area guarded by `Stack.Protected` in `src/app/_layout.tsx`), UI kit `src/components/ui.tsx`, `src/lib/{config,api,session,theme}.ts`. See `apps/mobile/AGENTS.md` for Expo rules. |
| `packages/shared` | `@app/shared/api` (response types, headers), `/schemas` (zod request schemas), `/client` (fetch client), `/app-info` (app name, support email, web URL, legal paths). |

## Adding a feature end to end (follow the `notes` example)

1. Migration: `npm run db:new -w @app/api -- <name>` → SQL in `apps/api/migrations/`. Never edit a migration that already ran in production. Add `REFERENCES users(id) ON DELETE CASCADE` on user-owned tables so account deletion stays complete.
2. Types in `packages/shared/src/api.ts`, request schemas in `packages/shared/src/schemas.ts` (PATCH schemas: optional fields, **no defaults**).
3. Router in `apps/api/src/routes/<name>.ts` (copy `notes.ts`), mount it in `src/index.ts` after `requireUser`. Validate with `readBody(c, schema)`; scope every query by `c.get("user").id`; errors via `fail(status, message)`.
4. Web page in `apps/web/src/pages/` + route in `src/router.tsx`.
5. App screen in `apps/mobile/src/app/(app)/` (+ a `NativeTabs.Trigger` in `(app)/_layout.tsx` if it is a tab).
6. `npm run typecheck && npm run lint && npm run build` must pass.

## Rules

- Commands run from the repo root; target one package with `-w @app/<name>`.
- Mobile dependencies: `npx expo install <pkg>` inside `apps/mobile` (never plain npm install) so versions match the SDK.
- User-facing text is Vietnamese by default; code, comments and identifiers in English. URL paths in English.
- Secrets never go in git: production `npx wrangler secret put NAME` (in `apps/api`), local `apps/api/.dev.vars`. Add new bindings/vars/secrets to `apps/api/src/lib/env.ts`.
- Scripts must work on macOS and Windows: no `VAR=x cmd` prefixes or `sh`-only syntax in package.json scripts (use Node scripts).
- Production actions (`npm run deploy`, `db:migrate:remote`, EAS builds/submits, store changes) need the user's explicit go-ahead.
- Skills for common workflows are in `.claude/skills/` (setup-dev-env, init-project, deploy-cloudflare, build-mobile, store-release).
