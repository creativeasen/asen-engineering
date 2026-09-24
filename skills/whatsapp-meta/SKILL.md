---
name: whatsapp-meta
description: ASEN rules for the WhatsApp Cloud API (Meta) - webhook signature verification, templates and the 24-hour window, opt-in, queued sending, rate limits, idempotency, Graph API versions. Use when building or changing anything that sends or receives WhatsApp messages.
---

# WhatsApp Cloud API (Meta)

Graph API version and deadlines: `${CLAUDE_PLUGIN_ROOT}/knowledge/stack.md` and `${CLAUDE_PLUGIN_ROOT}/knowledge/security-watchlist.md`.

## When it applies

Anything that sends WhatsApp messages, receives WhatsApp webhooks, manages templates, or onboards business numbers (Embedded Signup).

## Must-have checklist

- [ ] **Pinned Graph API version** in one config value (e.g. `v26.0`), never hard-coded in many places.
- [ ] **Webhook verification (GET)**: compare `hub.verify_token` to a secret env value; reply with `hub.challenge` only when it matches.
- [ ] **Webhook signature (POST)**: HMAC-SHA256 of the **raw body** with the App Secret, compared in constant time with `X-Hub-Signature-256` (after `sha256=`). Reject on mismatch, before parsing.
- [ ] **Respond 200 fast** and process in a queue. Meta retries failed deliveries for up to 36 hours, so dedupe by message ID (`wamid`) / status ID.
- [ ] **Sending goes through a queue** (BullMQ) with per-number throughput limits and exponential backoff on rate-limit errors. Never loop over contacts inside an HTTP request.
- [ ] **Idempotency**: one send per (campaign, contact) enforced by a unique key; retries reuse the same key.
- [ ] **Opt-in** recorded (when, how, what they agreed to) before any business-initiated message; opt-out keywords honoured immediately and stored.
- [ ] **24-hour customer service window**: free-form messages only inside it; outside it, only approved templates. Track the window per contact.
- [ ] Template category chosen correctly (marketing / utility / authentication); handle automatic category changes and template rejections.
- [ ] **Access tokens** are system-user tokens stored server-side; never in the frontend or logs. Rotate on staff changes.
- [ ] Store phone numbers in E.164 format; treat them as personal data (DPDP).
- [ ] Media URLs from Meta expire: download with the token, store privately, and serve via signed URLs.

## Common AI-generated mistakes

- Parsing the JSON body with a framework parser, then failing signature checks and "fixing" it by removing verification.
- Sending bulk messages in a `for` loop with `await fetch` inside an API route (timeouts, duplicates, bans).
- Ignoring status webhooks (`sent`, `delivered`, `read`, `failed`) so failures go unnoticed.
- Hard-coding an old Graph API version copied from a tutorial.
- No quality-rating monitoring: spam complaints lower the number's limits.
- Retrying a failed send without an idempotency key, so customers get duplicates.

## Pre-launch checklist

- [ ] Signature check rejects a tampered payload in a test.
- [ ] Duplicate webhook delivery doesn't create duplicate records or replies.
- [ ] A 1,000-contact test campaign completes through the queue without timeouts; rate-limit errors back off correctly.
- [ ] Opt-out ("STOP") tested end to end.
- [ ] Alerts on send failure rate and on the phone number's quality rating.
