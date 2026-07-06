# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Waldorf Connection: a community platform (feed, school events, private messaging, marketplace/services, member profiles) for Waldorf schools, families, students and alumni. React + Vite + Tailwind frontend, Supabase (Postgres + Auth + Storage + Realtime) backend, deployed on Vercel.

## Commands

```bash
npm install
npm run dev        # Vite dev server
npm run build       # production build
npm run lint        # eslint . --quiet
npm run lint:fix     # eslint . --fix
npm run typecheck    # tsc -p ./jsconfig.json (JS project, checkJs is off — this only validates config/paths)
npm run preview      # preview a production build
```

There is no test suite / test runner configured in this repo.

### Local environment

Vite needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in a `.env.local` (gitignored). Get them from the Supabase project (`get_project_url` / `get_publishable_keys` if using the Supabase MCP tools). Without them `supabaseClient.js` throws `supabaseUrl is required.` at runtime and the app fails to render.

## Architecture

### Routing & layout

`App.jsx` gates the whole app on auth itself (`AuthenticatedApp` reads `useAuth()` and renders `<Login/>` if there's no user) — it does **not** use `src/components/ProtectedRoute.jsx`, which is leftover scaffold code with no matching state in `AuthContext` and isn't mounted anywhere. Once authenticated, routes are flat and all wrapped in one `<Route element={<Layout/>}>` in `App.jsx`; `Layout.jsx` renders the header (logo, contextual header icons, "Publicar" button) and the bottom tab bar (`navItems` array). Unmatched routes redirect to `/` (so `src/lib/PageNotFound.jsx` is also dead code, never reached).

### The three identity tables — read this before touching author/profile display

An account's real display identity lives in **one of three tables**, keyed by `id = auth.users.id`, never all three:
- `school_profiles` (school accounts — `name`, `avatar_url`, `school_email`)
- `company_profiles` (company accounts — `name`, `logo_url`, `company_email`)
- `profiles` (individuals: parents/students/alumni — `display_name`, `avatar_url`, `user_email`)

Looking up only `profiles` for "the current user" is a recurring bug (it silently returns nothing for school/company accounts, falling back to the email prefix as a fake display name). Always resolve identity with `getMemberIdentity(userId)` in `src/lib/identity.js`, which checks the three tables in that priority order (school → company → profiles) and returns a normalized `{ name, avatar, role, email }`. This mirrors the resolution `Hilo.jsx` already does for chat participants and `Layout.jsx`/`SchoolProfile.jsx` do for "my profile" redirects. Content tables (`posts`, `marketplace_listings`, `school_routes`, service listings, etc.) denormalize `author_name`/`author_avatar`/`author_email` at write time from this same helper rather than joining `profiles` at read time.

`PerfilPublico.jsx` (route `/usuario/:id`) accepts either an email or a UUID and auto-resolves/redirects to the right destination (`/colegios/:id`, `/empresas/:id`, or itself) — link to it directly with an email, no need to pre-resolve the type.

### Data fetching

No react-query in practice: `QueryClientProvider`/`queryClientInstance` are wired up in `App.jsx` but almost nothing uses `useQuery`/`useMutation` (the one exception is in the dead `PageNotFound.jsx`). The actual pattern everywhere is a page-local `useState` + `useEffect` that calls `supabase.from(...)` directly (see `Feed.jsx`, `Comunidad.jsx`, `Servicios.jsx`, `Hilo.jsx`). Follow that pattern for new pages instead of introducing react-query.

Lists that can grow (Feed posts/events, chat messages) are paginated with `.range()`/`.limit()` plus a "cargar más" button or "load older" — don't `select('*')` an entire table.

### Page structure convention

Multi-section features are built as **one page with in-page tabs** (`activeTab` state + pill buttons), not nested routes — see `Comunidad.jsx` (Raíz/Empresas) and `Servicios.jsx` (Compraventa/Rutas Escolares/Empleabilidad). A dedicated detail page+route (e.g. `EventDetail.jsx` at `/eventos/:id`, `ListingDetail.jsx` at `/anuncios/:id`) is only added when a list item needs a full expanded view (image gallery, edit, contact card) — simple resource types (routes, chats) stay as cards in the list with inline actions.

Create/edit modals are a single component per resource that accepts an `editX = null` prop and branches insert vs. update (see `CreatePostModal.jsx`'s `editPost`, `CreateMarketplaceListingModal.jsx`'s `editListing`) — don't create separate Create/Edit components.

"Contactar" (start a chat with another member) is the same few lines everywhere: sort the two emails, `upsert` into `chats` with `onConflict: 'user_1_email,user_2_email'`, then `navigate('/hilo', { state: { activeChatId: data.id } })`.

### Supabase / RLS conventions

- Every new table needs RLS enabled from the start, following the pattern in existing tables: public `select` (`using (true)`) where content is meant to be public, and owner-only insert/update/delete gated on `author_email` matching `(select auth.jwt()) ->> 'email'`.
- Always wrap `auth.uid()`/`auth.jwt()` in `(select ...)` in policies — bare calls get re-evaluated per row and were a real, fixed performance bug (Supabase's `auth_rls_initplan` advisor lint) affecting nearly every table at one point.
- Avoid multiple permissive policies on the same table/action/role (Supabase's `multiple_permissive_policies` lint) — merge overlapping policies with `or` instead of stacking separate ones.
- Add an index on foreign key columns and on columns used in RLS `using`/`with_check` clauses or heavy filters (email columns, etc.).
- Check `get_advisors(type: performance)` after any schema change.
- Image uploads go to Supabase Storage buckets `avatars` (profile/school/company avatars & covers) and `posts` (post/listing images), via `supabase.storage.from(bucket).upload()` + `getPublicUrl()`.

### Design system

Tailwind with shadcn/ui semantic tokens (`bg-card`, `text-foreground`, `bg-primary`, `border-border`, etc. — see `tailwind.config.js` / `src/index.css` for the CSS variables) plus `class-variance-authority`. Headings use `font-cormorant` (Cormorant Garamond serif); body text is the default sans. Reusable shadcn primitives live in `src/components/ui/` (Radix-based) — check there before hand-rolling a UI primitive (e.g. the carousel used in `ListingDetail.jsx` is `src/components/ui/carousel.jsx`, wrapping `embla-carousel-react`, which was already a dependency before it had a caller).

Path alias `@/*` → `src/*` (configured in both `vite.config.js` and `jsconfig.json`).
