---
name: mobile-app
description: ASEN standard for mobile apps with Expo / React Native - secure storage, no secrets in the bundle, server-side authorization, offline and slow-network states, push notifications, store release. Use when building or changing an iOS or Android app.
---

# Mobile app (Expo / React Native)

Versions: `${CLAUDE_PLUGIN_ROOT}/knowledge/stack.md` (Expo row). Template: `${CLAUDE_PLUGIN_ROOT}/templates/mobile-app/`. Backend rules come from `saas-webapp`, `supabase`, and `security-core`.

## Standard stack

Expo (managed workflow, EAS Build/Update) + TypeScript · Supabase Auth with the publishable key · API on Vercel/Railway for anything privileged · Sentry for crashes · PostHog after consent.

## Must-have checklist

- [ ] **Nothing secret in the app bundle.** Anything in `EXPO_PUBLIC_*` or `app.config` is readable by anyone. Only publishable keys belong there.
- [ ] Tokens stored with `expo-secure-store`, never AsyncStorage.
- [ ] All privileged actions go through your API, which checks authorization on the server.
- [ ] **Slow and offline network**: timeouts, retry with backoff, cached last-known data, and clear offline banners.
- [ ] Every screen has loading, empty, error, and permission-denied states; works on small screens (360dp) and with large font sizes.
- [ ] Deep links validated (no open redirects, no auth tokens in URLs).
- [ ] Push notifications: ask for permission in context, store tokens per device, remove on logout, and never put personal data in the notification text.
- [ ] Permissions (camera, contacts, location) requested only when needed, with a reason string.
- [ ] Minimum OS versions and app store privacy labels / data safety forms match what the app really collects.
- [ ] OTA updates (EAS Update) only for JS changes; native changes go through a store build.

## Common AI-generated mistakes

- Supabase secret key or third-party API keys placed in `EXPO_PUBLIC_` variables.
- Storing JWTs in AsyncStorage.
- No handling for requests that never return (spinner forever).
- Hard-coded API URLs for localhost left in production builds.
- Asking for every permission at first launch.

## Pre-launch checklist

- [ ] Search the built bundle for key prefixes (`sb_secret_`, `sk_`, `rzp_live_`): none found.
- [ ] Tested on a low-end Android device with network throttled to 3G, and in airplane mode.
- [ ] Crash reporting verified with a test crash; source maps uploaded.
- [ ] Store listing privacy answers reviewed against the DPDP data map.
