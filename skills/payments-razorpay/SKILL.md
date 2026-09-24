---
name: payments-razorpay
description: ASEN rules for Razorpay payments - server-side orders, payment signature and webhook verification, idempotency, paise integers, refunds, reconciliation. Use when adding checkout, subscriptions, payment links, refunds, or Razorpay webhooks.
---

# Payments with Razorpay

SDK version: `${CLAUDE_PLUGIN_ROOT}/knowledge/stack.md`.

## When it applies

Checkout, orders, subscriptions, payment links, refunds, payouts, or any Razorpay webhook.

## Must-have checklist

- [ ] **Amounts are integers in paise**, computed on the server from your own price table. Never trust an amount, currency, or plan from the client.
- [ ] **Create the order on the server**; the client only receives `order_id` and the **key ID** (never the key secret).
- [ ] **Verify the checkout signature on the server** (`razorpay_order_id|razorpay_payment_id` HMAC-SHA256 with the key secret) before marking anything paid.
- [ ] **Webhooks are the source of truth**: HMAC-SHA256 of the **raw body** with the webhook secret, compared to `X-Razorpay-Signature` in constant time. Don't parse or re-serialize the body before verifying.
- [ ] **Dedupe webhooks** with the `x-razorpay-event-id` header (store processed IDs with a unique constraint).
- [ ] **Order of events isn't guaranteed** (e.g. `payment.captured` can arrive before `payment.authorized`): use a state machine that only moves forward.
- [ ] **Idempotency** on order creation and refunds (your own idempotency key per cart/refund request).
- [ ] Payment state changes and entitlement grants happen in one database transaction.
- [ ] Refunds only from the server by an authorized role, with an audit log.
- [ ] Daily **reconciliation** job compares Razorpay payments with your database and alerts on mismatches.
- [ ] Test mode and live mode keys are separate env values; live keys only in production.

## Common AI-generated mistakes

- Marking an order paid from the frontend success callback without server verification.
- Using floats for rupees (`499.99`) and rounding errors in totals.
- Putting the key secret in frontend env variables.
- Verifying the webhook against `JSON.stringify(req.body)` instead of the raw body.
- Granting access twice when the same webhook arrives twice.
- Using a blacklisted tunnel domain for webhook testing (ngrok, webhook.site and others are blocked by Razorpay).

## Pre-launch checklist

- [ ] Tampered signature and tampered amount are both rejected in tests.
- [ ] Replaying the same webhook twice changes nothing the second time.
- [ ] Failed, pending, and refunded flows show correct UI states.
- [ ] Reconciliation job runs and alerts.
- [ ] Live keys configured only in the production environment; test payments done in live mode with a small real amount and refunded.
