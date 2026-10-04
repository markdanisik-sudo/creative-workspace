# m.studio.lab

A calm, visual workspace for creative work: moodboards, treatments, shot lists and references on an infinite canvas.

> The name and logo parts are set once in `src/lib/config.ts`.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS 4 · Supabase (Auth, Postgres with RLS, Storage) · tldraw 5

[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) explains the architecture, the canvas library choice, the data model and the known risks.

## Getting started

Requirements: Node.js 20.9+ and Docker Desktop (running).

```bash
npm install       # once, and after pulling changes
npm run local     # starts the local database, writes .env.local, runs the app
```

Open http://localhost:3000 and create an account (any email; the local stack does not send confirmation emails). Stop the app with Ctrl+C and the database with `npm run local:stop`.

Prefer to do it by hand? `npx supabase start`, copy the URL and publishable key it prints into `.env.local` (see `.env.example`), then `npm run dev`.

### Using a hosted Supabase project

1. Create a project, then run `npx supabase link` and `npx supabase db push` to apply `supabase/migrations`.
2. Put the project URL and publishable (anon) key in `.env.local`.
3. Under Auth → URL configuration, add `https://<your-domain>/auth/callback`.
4. Set `NEXT_PUBLIC_SITE_URL` to your domain so confirmation emails link back correctly.

### Production checklist

- **tldraw license**: production domains need `NEXT_PUBLIC_TLDRAW_LICENSE_KEY` ([pricing](https://tldraw.dev/pricing)). Without it, the canvas does not load in production. Localhost works without a key.
- Enable email confirmation and set up SMTP in Supabase Auth.
- Rate-limit `/api/unfurl` at the edge if the app is public.

## Scripts

| Command                      | What it does                                                                                                                                            |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`                | Development server                                                                                                                                      |
| `npm run build` / `start`    | Production build and server                                                                                                                             |
| `npm run lint` / `typecheck` | ESLint and TypeScript                                                                                                                                   |
| `npm test`                   | Unit tests (Vitest)                                                                                                                                     |
| `npm run test:db`            | RLS and storage integration tests against the local stack (needs `SUPABASE_TEST_PUBLISHABLE_KEY` and `SUPABASE_TEST_SECRET_KEY` from `supabase status`) |
| `npm run db:reset`           | Recreate the local database from migrations                                                                                                             |
| `npm run db:types`           | Regenerate `src/lib/supabase/database.types.ts`                                                                                                         |

## Project layout

```
supabase/migrations     schema, RLS and storage policies
src/app                 routes: auth, dashboard, project, board, API
src/components/ui       design-system primitives
src/features/auth       sign in/up/out and profile
src/features/projects   dashboard data and project UI
src/features/boards     board templates and actions
src/features/canvas     canvas host, shapes, persistence, assets, canvas UI
src/lib                 Supabase clients, link unfurling, formatting, errors
```

## Keyboard shortcuts

Press <kbd>?</kbd> on a board to see them all. Highlights: <kbd>⌘Z</kbd> / <kbd>⇧⌘Z</kbd> undo and redo, <kbd>⌘D</kbd> duplicate, <kbd>⌫</kbd> delete (undoable), <kbd>⌘A</kbd> select all, hold <kbd>Space</kbd> and drag to pan, <kbd>Esc</kbd> to deselect, and <kbd>⌘K</kbd> to search from the dashboard.
