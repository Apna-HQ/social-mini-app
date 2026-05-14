# DESIGN.md — social-mini-app

> Portable design system spec for the **social-mini-app** Apna mini-app,
> following the
> [Google Labs DESIGN.md](https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-design-md/)
> concept: a machine-readable record of design tokens **and the reasoning
> behind them**, so AI agents and humans generate UI that stays on-brand.
>
> Source of truth: [tailwind.config.ts](tailwind.config.ts) +
> [app/globals.css](app/globals.css). Update this file when those change.

## Project

- **Name:** social-mini-app — Nostr-based social mini-app, runs inside the Apna host
- **Type:** Next.js 14 (App Router) PWA, mobile-first, Module Federation remote
- **Stack:** Tailwind CSS, shadcn/ui-style tokens (`baseColor: slate`), Radix UI primitives
- **Tooling:** Storybook (`:6006`), Playwright e2e (`:6007`)
- **Theming:** HSL CSS custom properties, `class`-based dark mode (`.dark`)

## Color tokens

All colors are HSL triplets consumed as `hsl(var(--token))`. Each pairs a
surface with a `-foreground` for text/icons on that surface.

| Token | Light | Dark | Purpose |
|---|---|---|---|
| `background` / `foreground` | `0 0% 100%` / `222.2 84% 4.9%` | `222.2 84% 4.9%` / `210 40% 98%` | App canvas + default text |
| `primary` / `primary-foreground` | `222.2 47.4% 11.2%` / `210 40% 98%` | `210 40% 98%` / `222.2 47.4% 11.2%` | Primary actions (CTAs, active nav, FAB). Near-black/near-white — high contrast, brand-neutral |
| `secondary` / `secondary-foreground` | `210 40% 96.1%` / `222.2 47.4% 11.2%` | `217.2 32.6% 17.5%` / `210 40% 98%` | Secondary fills, low-emphasis chips |
| `muted` / `muted-foreground` | `210 40% 96.1%` / `215.4 16.3% 46.9%` | `217.2 32.6% 17.5%` / `215 20.2% 65.1%` | Subtle backgrounds, timestamps, helper text |
| `accent` / `accent-foreground` | `210 40% 96.1%` / `222.2 47.4% 11.2%` | `217.2 32.6% 17.5%` / `210 40% 98%` | Hover/highlight states on ghost & outline elements |
| `destructive` / `destructive-foreground` | `0 84.2% 60.2%` / `210 40% 98%` | `0 62.8% 30.6%` / `210 40% 98%` | Errors, delete actions — the only hue-bearing token |
| `card` / `card-foreground` | `0 0% 100%` / `222.2 84% 4.9%` | `222.2 84% 4.9%` / `210 40% 98%` | Post cards, elevated surfaces |
| `popover` / `popover-foreground` | same as card | same as card | Floating surfaces (dropdowns, bottom sheets) |
| `border` | `214.3 31.8% 91.4%` | `217.2 32.6% 17.5%` | Default border; applied globally via `* { @apply border-border }` |
| `input` | `214.3 31.8% 91.4%` | `217.2 32.6% 17.5%` | Form control borders |
| `ring` | `222.2 84% 4.9%` | `212.7 26.8% 83.9%` | Focus ring — always visible, never removed |

**Rules for agents**
- Never hardcode hex/raw HSL in components — use the semantic token.
- The palette is intentionally **monochrome slate** except `destructive`. Don't introduce new accent hues without updating this file.
- `destructive` means danger only. Don't reuse it for emphasis.
- Maintain WCAG AA: body text on its surface must hit ≥ 4.5:1. The
  `*-foreground` pairs above are pre-validated — stay within a pair.

## Typography

- **Font:** no custom font configured — uses the browser/Tailwind default sans stack. If a brand font is added, register it here and as `--font-sans`.
- Use Tailwind's type scale; `text-sm` for dense UI. Weight: `font-medium` for interactive labels.

## Shape & spacing

- **Radius:** `--radius: 0.5rem`. Use `rounded-lg` (`var(--radius)`), `rounded-md` (`-2px`), `rounded-sm` (`-4px`). No other radii.
- **Container:** centered, `2rem` padding, max width `1400px` at `2xl`.
- Mobile-first; design for a phone viewport with a fixed bottom nav.

## Motion

- Accordion: `accordion-down` / `accordion-up`, `0.2s ease-out` (`tailwindcss-animate`).
- Loading: `animate-spin` ring spinner (see [app/layout.tsx](app/layout.tsx) Suspense fallback).
- Keep durations ≤ 200ms for UI feedback.

## Layout conventions

- App shell: `{children}` + fixed bottom `Nav`, with a `pb-16` spacer so content clears the nav.
- Wrapped in `ApnaProvider` → `Suspense` → `AppProvider`. New routes render inside this shell.
- Mobile-first single-column feed layout.

## Components

- Primitives live in [components/ui/](components/ui/) — `button`, `card`, `tabs`, `avatar`, `textarea`, `bottom-sheet`, `bottom-nav`, `fab`, `post`, etc. Prefer these over new primitives.
- App components follow **atomic design**: [atoms/](components/atoms/) → [molecules/](components/molecules/) → [organisms/](components/organisms/) → [templates/](components/templates/).
- `Button` variants: `default` `ghost` `outline`; sizes: `default` `sm` `lg` `icon`. `default` size is `h-9`. (Note: smaller variant set than apna-app — don't assume `secondary`/`destructive`/`link` exist here.)
- Compose classes with `cn()` from `@/lib/utils`. Always expose `className` passthrough.
- New/changed components should get a Storybook story (`*.stories.tsx`) — see existing `post.stories.tsx`, `post-actions.stories.tsx`.
