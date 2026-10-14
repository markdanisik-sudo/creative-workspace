# m.studio.lab

A client portal for photo and film production. Each client signs in to their own job, and the studio and client work on it together: moodboards and shot lists on an infinite canvas, production phases, a task plan, shoot dates, a discussion and add-on requests (an extra shoot day, another edit). The interface is in English and Czech, with a light and dark theme.

> The name is set in `src/lib/config.ts`; the logo in `src/components/brand/Wordmark.tsx`.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS 4 · Supabase (Auth, Postgres with RLS, Storage) · tldraw 5

[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) explains the architecture, the canvas library choice, the data model and the known risks.

## Getting started

Requirements: Node.js 20.9+ and Docker Desktop (running).

```bash
npm install       # once, and after pulling changes
npm run local     # starts the local database, writes .env.local, runs the app
```

Open http://localhost:3000. In development against the local database you are **signed in automatically as the studio** (never in production or against a hosted database; set `LAB_DEV_AUTO_SIGN_IN=false` in `.env.local` to see the sign-in page). If the database is empty, a studio account is created for you. The first account is the studio; after that, sign-up is closed and clients join only through an invitation link that the studio creates under a project's **People** tab. The invite page is not signed in automatically, so you can try the client flow in a private window.

**On your phone:** `npm run local` also prints an address (and a QR code) such as `http://192.168.1.20:3000`. Open it on a phone on the same Wi-Fi while the app runs on this computer. In Safari, Share → _Add to Home Screen_ opens it full screen like an app. If the detected address is wrong, set it yourself: `LAB_LAN_ADDRESS=192.168.1.20 npm run local`.

Prefer to do it by hand? `npx supabase start`, copy the URL and publishable key it prints into `.env.local` (see `.env.example`), then `npm run dev`.

### Putting it online (Supabase + Vercel)

No terminal needed; every push to the repository then redeploys automatically.

1. **Supabase**: create a project (region Frankfurt; a database password with letters and digits only). Under Authentication → Sign In / Providers → Email, turn off _Confirm email_ so invited clients get in straight away.
2. From Supabase copy: the **Project URL** and **publishable key** (Project Settings → API Keys), and the **Session pooler** connection string (Connect button), with your password filled in.
3. **tldraw**: get a license key at [tldraw.dev](https://tldraw.dev/pricing) for your domain (e.g. `*.vercel.app`). Without it the board does not load on the public site.
4. **Vercel**: sign in with GitHub, _Add New → Project_, import this repository, and add the environment variables:

   | Name                                   | Value                            |
   | -------------------------------------- | -------------------------------- |
   | `NEXT_PUBLIC_SUPABASE_URL`             | Project URL                      |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | publishable key                  |
   | `SUPABASE_DB_URL`                      | Session pooler connection string |
   | `NEXT_PUBLIC_TLDRAW_LICENSE_KEY`       | tldraw key                       |

   Deploy. The `vercel-build` script applies `supabase/migrations` to the database before each build.

5. Open the site and **create your account right away**: the first account becomes the studio, and sign-up closes after it.
6. In Supabase → Authentication → URL Configuration, set the Site URL to your Vercel address.
7. On iPhone: open the address in Safari → Share → _Add to Home Screen_.

### Production checklist

- **tldraw license**: production domains need `NEXT_PUBLIC_TLDRAW_LICENSE_KEY` ([pricing](https://tldraw.dev/pricing)). Without it, the canvas does not load in production. Localhost works without a key.
- For email confirmation or password-reset emails at volume, set up SMTP in Supabase Auth.
- Rate-limit `/api/unfurl` at the edge if the app is public.

## Roles

|                          | Studio                                                                     | Client                                                                      |
| ------------------------ | -------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Projects                 | creates, edits and deletes all of them                                     | sees only the projects they were invited to                                 |
| Boards                   | creates, renames and deletes them; edits the canvas                        | edits the canvas                                                            |
| Phase, details, schedule | edits                                                                      | reads                                                                       |
| Plan (tasks)             | edits                                                                      | edits                                                                       |
| Discussion               | posts; deletes any message                                                 | posts; deletes their own messages                                           |
| Add-ons                  | manages the catalog in Settings; approves, declines or marks requests done | requests add-ons; withdraws their own requests while they are still waiting |
| People                   | invites clients and removes them                                           | no access                                                                   |

All of this is enforced by Postgres row-level security (`supabase/migrations`), not only by the UI. Invitation links are single-use, expire after 30 days and are stored only as a hash.

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
src/features/hub        job hub: phases, plan, schedule, requests, discussion
src/features/people     invitations and project members
src/features/settings   appearance and the add-on catalog
src/lib/i18n            EN/CS dictionaries and translator
src/lib/preferences     theme and language cookies
src/features/boards     board templates and actions
src/features/canvas     canvas host, shapes, persistence, assets, canvas UI
src/lib                 Supabase clients, link unfurling, formatting, errors
```

## Keyboard shortcuts

Press <kbd>?</kbd> on a board to see them all. Highlights: <kbd>⌘Z</kbd> / <kbd>⇧⌘Z</kbd> undo and redo, <kbd>⌘D</kbd> duplicate, <kbd>⌫</kbd> delete (undoable), <kbd>⌘A</kbd> select all, hold <kbd>Space</kbd> and drag to pan, <kbd>Esc</kbd> to deselect, and <kbd>⌘K</kbd> to search from the dashboard.
