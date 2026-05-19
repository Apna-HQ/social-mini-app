# Realtime Social Mini App Redesign

## Design Guardrails

- Preserve the existing social-mini-app theme: semantic slate tokens, mobile-first layout, bottom navigation, compact post surfaces, and existing `components/ui` primitives.
- Keep Nostr data access behind `@apna/sdk` / `useApna()`; the mini-app must not call relays directly.
- Prefer socket/stream subscriptions for live feed, thread, profile, messages, and notifications; use fetch calls for initial hydration and pagination.

## Status

- [x] Confirm design direction, task breakdown, and plan with the user.
- [x] Audit the current graph, social app, SDK social API, and host Nostr capability surface.
- [x] Extend SDK social spec/types for realtime feeds, threads, DMs, profiles, notifications, reactions, and quote reposts.
- [x] Implement host `social.v1` handlers and bridge-stream subscriptions.
- [x] Add mini-app realtime hooks and helpers around SDK social subscriptions.
- [x] Redesign the app shell/navigation while preserving the existing visual theme.
- [x] Build Home feed with followed users' notes/replies and detail thread navigation.
- [x] Build realtime Thread view with replies and composer.
- [x] Build Messaging section for encrypted DMs.
- [x] Build own Profile edit and public Profile follow/unfollow flows.
- [x] Build Notifications for reactions and replies.
- [x] Support composing notes, replies, reactions, direct reposts, and quote reposts.
- [x] Verify with available lint/build/tests.
- [x] Run `graphify update .` after code changes.

## Implementation Notes

- SDK: update `apna.social.v1` interfaces and domain module; expose unsubscribe-based subscription methods.
- Host: use `nostr.subscribe`/`subscribeToEvents` where possible and keep publish/sign/encrypt actions gated.
- Mini-app: hydrate from fetch APIs, then merge live events by id; preserve local IndexedDB cache for feed/profile timelines where useful.
