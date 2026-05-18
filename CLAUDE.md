# CLAUDE.md — social-mini-app

A Nostr-based **social mini-app** that runs *inside* the Apna host (`apna-app`).
It is a Module Federation remote and talks to the host via `@apna/sdk` rather
than calling Nostr relays directly.

## Stack

- Next.js 14 (App Router) — `next dev` on port **3001**
- TypeScript, Tailwind CSS, shadcn/ui-style tokens (`baseColor: slate`), Radix UI
- `@module-federation/enhanced` — exposes/consumes federated components
- `@apna/sdk` (`ApnaProvider` / `useApna`) — all Nostr access goes through the host bridge
- `idb` — local feed/reaction caches; profile metadata is cached by the host bridge
- Storybook (port 6006) + Playwright e2e (port 6007)

## Layout

- `app/` — routes: `note`, `profile`, `user`, `search`; `providers.tsx` wires `ApnaProvider` → `AppProvider`
- `components/` — atomic design: `atoms/` → `molecules/` → `organisms/` → `templates/`, plus `ui/` (primitives) and `providers/`
- `lib/` — IndexedDB layers (`feedDB`, `feedReactionsDB`, `userNotesFeedDB`), `hooks/`, `utils/`
- `hooks/useFeed.ts` — main feed hook
- `utils/federation.ts` — Module Federation wiring
- `stories/`, `tests/`, `docs/`

## Conventions

- **UI / design tokens:** follow [DESIGN.md](DESIGN.md) — use semantic Tailwind tokens, never hardcode colors. Note the `Button` variant set here is smaller than apna-app's (`default`/`ghost`/`outline` only).
- Nostr data flows through `useApna()` / the SDK — do not add direct relay calls.
- Reads/writes go through the `lib/*DB.ts` IndexedDB layers; don't access `idb` ad hoc.
- New/changed components get a Storybook story (`*.stories.tsx`); add a Playwright test for user-facing flows.
- Prefer existing `components/ui/` primitives; compose with `cn()` from `@/lib/utils`. Path alias `@/*` maps to the project root.

## Commands

- `npm run dev` — dev server (port 3001)
- `npm run build` / `npm run start` — production build & serve
- `npm run lint`
- `npm run storybook` / `npm run build-storybook`
- `npm run e2e` / `npm run e2e:ui` — Playwright

> Dev servers run under PM2 — see workspace notes before starting another instance.
> After changing code, run `graphify update .` to keep the knowledge graph current.
