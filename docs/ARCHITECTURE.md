# Architecture

> Product name: **m.studio.lab**, defined once in `src/lib/config.ts` (`APP_NAME`); the logo lives in `src/components/brand/Wordmark.tsx`.

## 1. Starting point

The repository started empty: no commits, framework, dependencies, Supabase config or design system.

## 2. Stack

| Concern   | Choice                                                                                    | Why                                                                                                                                                                            |
| --------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Framework | **Next.js 16** (App Router, Turbopack) + React 19                                         | Server Components for fast dashboard rendering, a `proxy.ts` for session refresh, route handlers for server-only work (URL unfurling).                                         |
| Language  | TypeScript, `strict`                                                                      | —                                                                                                                                                                              |
| Styling   | Tailwind CSS v4 + CSS custom properties                                                   | The design tokens live in CSS variables (`src/app/globals.css`), and Tailwind reads them through `@theme`. This keeps one source of truth and makes dark mode a variable swap. |
| Backend   | **Supabase**: Auth, Postgres with RLS, Storage                                            | Covers what the spec asks for. Realtime is available later for collaboration.                                                                                                  |
| Canvas    | **tldraw 5**                                                                              | See §4.                                                                                                                                                                        |
| Tests     | Vitest for unit tests, Playwright for a browser smoke test against a local Supabase stack | —                                                                                                                                                                              |

## 3. Folder structure

```
supabase/
  config.toml               local stack config
  migrations/               schema, RLS, storage policies (source of truth)
src/
  app/
    (auth)/sign-in, sign-up  auth screens (server actions)
    (app)/projects           dashboard, project and board routes
    (app)/settings           profile and account
    api/unfurl               server-side link metadata (SSRF-guarded)
    auth/callback            Supabase email-link callback
  components/ui/             design-system primitives (Button, Input, Dialog, Menu, …)
  features/
    auth/                    auth actions and forms
    projects/                project queries, actions, cards, dialogs
    boards/                  board queries, actions, templates
    canvas/
      Canvas.tsx             tldraw host (client only)
      shapes/                custom shape utils (checklist, file)
      assets/                Supabase-backed TLAssetStore, file asset util
      persistence/           store <-> canvas_objects sync (debounced)
      ui/                    our own toolbar, add menu, contextual bar, shortcuts dialog
      external-content.ts    paste and drop handling (URL → bookmark, files → upload)
  lib/
    supabase/                browser, server and proxy clients
    config.ts, errors.ts, …
  proxy.ts                   refreshes the auth session and guards routes
```

## 4. Canvas technology

Candidates evaluated:

| Library             | Infinite canvas | Images/video     | Resize/rotate/crop      | Undo, snapping, multi-select, copy/paste | Custom React objects              | Collaboration path                      | License                                |
| ------------------- | --------------- | ---------------- | ----------------------- | ---------------------------------------- | --------------------------------- | --------------------------------------- | -------------------------------------- |
| **tldraw**          | ✅              | ✅ built in      | ✅ including image crop | ✅ all built in                          | ✅ `ShapeUtil` renders React/HTML | ✅ `@tldraw/sync`, or record-level sync | Commercial: key required in production |
| Excalidraw          | ✅              | images only      | partial, no crop        | ✅                                       | ❌ limited, hand-drawn look       | ✅                                      | MIT                                    |
| React Flow          | ✅              | via custom nodes | resize only             | partial, no rotation                     | ✅                                | DIY                                     | MIT                                    |
| Konva / react-konva | DIY             | ✅               | DIY (Transformer)       | ❌ all DIY                               | ❌ canvas only, no HTML           | DIY                                     | MIT                                    |
| Fabric.js           | DIY             | ✅               | ✅                      | partial                                  | ❌                                | DIY                                     | MIT                                    |

**Decision: tldraw.** It is the only option that delivers every interaction in the spec out of the box: pan, zoom, selection, multi-selection, resize, rotate, crop, snapping, layering, undo/redo, copy/paste, keyboard shortcuts and paste/drop pipelines. It also renders custom objects as real HTML, which gives us crisp typography, video playback and accessible checkboxes. Its store is a flat set of JSON records, which maps cleanly onto one database row per object and onto future real-time sync.

We do **not** ship tldraw's default look. Its menus, toolbar and style panel are turned off and replaced with our own components. tldraw supplies the interaction engine; the product UI is ours.

**Trade-off:** tldraw needs a license key for production domains. Without one, the editor refuses to render in production, while `localhost` works without a key. Set `NEXT_PUBLIC_TLDRAW_LICENSE_KEY`. To limit lock-in, the database schema is library-neutral (§5): objects are stored as `type`, geometry and a `data` JSON column, not as an opaque tldraw snapshot.

## 5. Data model

```
profiles        id (= auth.users.id), display_name, avatar_url
projects        id, owner_id, name, description, cover_path, created_at, updated_at
boards          id, project_id, owner_id, name, template, position, created_at, updated_at
canvas_objects  board_id, id, type, parent_id, x, y, width, height, rotation, z_index, data jsonb, …
canvas_connections  board_id, id, type, from_id, to_id, data jsonb   (arrow bindings)
board_assets    board_id, id, type, file_id, data jsonb             (image/video/bookmark/file metadata)
files           id, owner_id, project_id, board_id, storage_path, name, mime_type, size_bytes, width, height
project_summaries  view: projects + item_count, board_count, cover image
```

- `canvas_objects.id` is the canvas record id. The primary key is `(board_id, id)`, so boards can be duplicated later without id collisions.
- `z_index` is a **fractional index string**. Re-ordering one object never rewrites its neighbours, which matters for collaboration.
- `data` holds type-specific properties (text, colours, checklist items, crop, …) plus a schema `version`. New object types need no migration.
- Every table carries `owner_id`, either directly or through its project. RLS policies check ownership with `auth.uid()`. Collaboration will later replace "owner" with a `project_members` table without changing any object table.
- Triggers keep `updated_at` and the parent project's `updated_at` current, so "last modified" is always correct.

### Storage

There is one **private** bucket, `assets`, with the path `user_id/project_id/board_id/<uuid>.<ext>`. Storage RLS allows access only when the first path segment is the caller's user id **and** the caller owns the project. The bucket enforces a size limit and a MIME allow-list on the server. Images also get a downscaled `.preview.webp`, and the canvas loads the preview unless an image is shown large. Files are served through short-lived signed URLs that are cached on the client.

## 6. Persistence flow

1. On open, the board's rows are loaded and converted into tldraw records (`persistence/mapping.ts`).
2. `editor.store.listen(…, { source: 'user', scope: 'document' })` collects dirty ids.
3. A debounced flush (about 500 ms) upserts changed objects and deletes removed ones. A save also runs when the tab is hidden or closed.
4. A small save indicator shows "Saving…" / "Saved", plus a friendly retry message on failure.

Future real-time collaboration can subscribe to the same tables (Supabase Realtime) or move to `@tldraw/sync`. Either way the row-per-object model stays.

## 7. Paste and drop

| Input                                  | Result                                                                                                        |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Image or video file, dropped or pasted | Uploaded to Storage, then an image or video object                                                            |
| PDF or document                        | Uploaded, then a **file card** (custom shape) that opens via a signed URL                                     |
| URL                                    | Bookmark card. Metadata comes from `/api/unfurl` (server-side, SSRF-guarded); if that fails, a plain URL card |
| Plain text                             | Text object                                                                                                   |

### Placement and media

- Objects added from the menu, and pastes without a position, go to the **nearest free area** around the viewport center (`placement.ts`), so new work never covers existing work. Drops land where they are dropped.
- Large photos and videos are scaled to at most 560 units when added (`media-placement.ts`). Several files dropped together are packed into a tidy group.
- tldraw's fonts, icons and translations are **self-hosted** from `public/tldraw`, copied there on `npm install`. The canvas makes no third-party CDN calls.

## 8. Risks

1. **tldraw licensing** (see §4): a business decision before launch.
2. **Large boards**: tldraw culls off-screen shapes. We add image previews and debounced batched writes. Hundreds of objects are fine; thousands of full-resolution images would need server thumbnails.
3. **Link previews**: many sites (notably Instagram) block scrapers. We fall back gracefully; richer previews need an oEmbed or paid unfurl provider later.
4. **Offline and conflicts**: single-user last-write-wins is fine for the MVP. Collaboration needs CRDT/OT, which tldraw sync provides.
5. **Mobile**: tldraw supports touch. The MVP focuses on viewing, moving and adding content.

## 9. Roadmap hooks

- `boards.template` already drives starter content. The selection bar's **Tidy up** (`editor.packShapes`) is the first layout command. "Arrange automatically", grid, masonry and film strip slot in beside it as commands over the selection.
- `project_members` (roles) is the place for sharing, client review and permissions.
- `canvas_objects.data.version` supports migrations for version history.
