# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev    # Next.js dev server on :3000
npm run build  # production build
npm run start  # serve production build
npm run lint   # next lint (eslint + next/core-web-vitals)
```

No test runner is configured. Database schema changes live as SQL files in `supabase/migrations/` (apply via the Supabase dashboard or CLI — this repo does not run them automatically).

Required env vars (in `.env.local`):
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_RESULTS_PER_PAGE`

## Architecture

Internal data manager for the Municipality of Dumingag ("DDM"). Next.js 14 **App Router** + Supabase (auth + Postgres) + Redux Toolkit + shadcn/ui (Tailwind, Radix).

### Auth + session flow
- `app/layout.tsx` is a **server component** that calls `createServerClient()` and `supabase.auth.getSession()`. If signed in, it eagerly fetches `ddm_users` (active), `ddm_system_access`, and the current user, then hands them to `SupabaseProvider` as initial props. If signed out, only `{children}` renders (no Redux/FilterContext providers).
- Per-module layouts (e.g. `app/(ris)/layout.tsx`, `app/documenttracker/layout.tsx`) re-check the session server-side and `redirect('/')` if missing. Treat module layouts as the auth gate; don't re-implement auth checks in pages.
- `utils/supabase-listener.js` is a client component that calls `router.refresh()` when the access token changes so server data re-fetches.
- Two Supabase client factories: `utils/supabase-server.ts` (RSC, reads cookies) and `utils/supabase-browser.ts` (client components). `utils/fetchApi.ts` instantiates its own browser client at module scope — that's the canonical entry point for client-side data fetching.

### Providers (client-side, only when signed in)
Wrapped in this order in the root layout: `SupabaseProvider` → `Providers` (Redux) → `FilterProvider` → `Toaster` → children.
- **`SupabaseProvider`** (`context/SupabaseProvider.js`) — exposes `useSupabase()` returning `{ supabase, session, systemAccess, systemUsers, currentUser }`. `currentUser` is the row from `ddm_users`; `session.user.id` is the Supabase auth id.
- **`FilterProvider`** (`context/FilterContext.tsx`) — `useFilter()` returns `hasAccess(type)`, `setToast(type, msg)`, plus shared `filters`/`perPage`/`isDarkMode` state. `hasAccess` checks the in-memory `ddm_system_access` for `{ type, user_id: session.user.id }`.
- **Redux store** (`GlobalRedux/store.ts`) — slices: `list`, `routes`, `results`, `recount`. `listSlice` holds the currently rendered list for the module being viewed; mutations dispatch `updateList(...)` after a successful Supabase write so the UI updates without a refetch.

### Authorization model
- `superAdmins` array in `constants/TrackerConstants.ts` (email allowlist) is the hard-coded admin escape hatch.
- All other gating goes through `hasAccess('ris_admin')`, `hasAccess('tracker_admin')`, etc., which reads the `ddm_system_access` table. Adding a new permission type means inserting rows in that table — the type strings are not enumerated in code.

### Routing layout
Routes use App Router conventions with route groups for organization (the parens don't appear in URLs):
- `app/(ris)/...` — Requisition & Issue Slip module (RIS, Purchase Orders, Cash Advances, Vehicles, Departments, Department Codes, Appropriations, Summary)
- `app/(profiling)/...` — household profiling, surveys, services, reports, BLC
- `app/(reservations)/...` — vehicle reservations
- `app/documenttracker/`, `app/lcr/`, `app/accounts/`, `app/settings/` — top-level modules
- `app/api/signup/` — the only API route

A module page typically follows the pattern: `page.tsx` (server) renders `<Main />` (client), which composes a `Sidebar`, module-specific `Filters`, an `AddEditModal`, a list table, and pagination via `PerPage` + `ShowMore`.

### Data layer
- **`utils/fetchApi.ts`** centralizes all read queries (~20 `fetchX` functions). Each takes filters + paging and returns Supabase results with embedded joins (e.g. `fetchRis` returns RIS rows joined to PO, appropriation, vehicle, CA, department, and creator). When adding a new list, follow this pattern rather than querying Supabase from components ad-hoc.
- Writes happen inline in components (the `*Modal.tsx` files) — `supabase.from('ddm_*').insert/update/delete(...)` then `dispatch(updateList(...))`.
- All app tables are prefixed `ddm_` (e.g. `ddm_users`, `ddm_ris`, `ddm_ris_purchase_orders`, `ddm_ris_cash_advances`, `ddm_trackers`, `ddm_tracker_routes`, `ddm_ris_appropriations`).
- Document Tracker routing logic (`docRouting`, `getStatusesByOffice`) lives in `constants/TrackerConstants.ts` and `utils/fetchApi.ts`. A document is visible to a department if either (a) it has a route row with status `"Forwarded to <DEPT>"` or (b) its `origin_department` matches.
- `logError(...)` writes to `ddm_error_logs`; call it on server-side query failures in layouts/pages.

### UI conventions
- shadcn/ui generator config in `components.json` (style `new-york`, slate base, `@/components` alias, utils at `@/lib/utils`). Primitives go in `components/ui/`.
- Shared app components are barrel-exported via `components/index.ts` — import as `import { Sidebar, TopBar, ... } from '@/components/index'`. Module sidebars live in `components/Sidebars/`.
- Money formatting in RIS uses up to **4 decimal places** (`maximumFractionDigits: 4`) — preserve this when touching RIS lists, exports, prints, and PDFs.
- Exports use `exceljs` + `file-saver`; printing uses `pdfmake` (vfs init pattern: `pdfMake.vfs = pdfFonts.pdfMake?.vfs || pdfFonts.vfs`).
- Path alias: `@/*` → repo root (configured in `tsconfig.json`).

### Codebase quirks
- Mixed `.js`/`.tsx` — provider files (`SupabaseProvider.js`, `supabase-listener.js`, `GlobalRedux/provider.js`) are intentionally JS; new code should be TS.
- ESLint disables `react-hooks/exhaustive-deps`, `@typescript-eslint/no-non-null-assertion`, and `@typescript-eslint/no-unsafe-argument` — don't add deps to a `useEffect` just to satisfy a missing rule.
- Prettier: no semicolons, single quotes, 2-space tabs, `singleAttributePerLine: true`, `bracketSameLine: true`.
- Root layout has `export const revalidate = 0` — don't add caching/ISR without checking whether the page depends on per-user Supabase data.
