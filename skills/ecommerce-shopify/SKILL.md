---
name: ecommerce-shopify
description: ASEN standard for Shopify stores, themes, and custom Shopify apps - API versioning, webhook HMAC verification, least-privilege scopes, rate limits, GDPR/DPDP webhooks, checkout and inventory safety. Use when working on a Shopify store, theme, or app.
---

# E-commerce on Shopify

API version and support window: `${CLAUDE_PLUGIN_ROOT}/knowledge/stack.md`. Template: `${CLAUDE_PLUGIN_ROOT}/templates/ecommerce-shopify/`.

## When it applies

Shopify themes (Liquid), custom or public Shopify apps, storefront integrations, and automations that read or change store data.

## Must-have checklist

- [ ] **Pin the Admin API version** (a current stable quarterly version) in one config value; plan an upgrade every quarter. Watch for fall-forward via the `X-Shopify-API-Version` response header.
- [ ] **Least-privilege access scopes**; request only what the feature needs. Admin API tokens stay server-side.
- [ ] **Webhook HMAC**: base64 HMAC-SHA256 of the **raw body** with the app client secret, compared to `X-Shopify-Hmac-SHA256` in constant time.
- [ ] **Respond within 5 seconds** and queue the work; dedupe with `X-Shopify-Webhook-Id` (Shopify retries 8 times over 4 hours).
- [ ] **Mandatory privacy webhooks** (customer data request, customer redact, shop redact) implemented for apps.
- [ ] **Rate limits**: GraphQL cost-based throttling respected; bulk operations API for large exports/imports.
- [ ] **Money** as integer minor units with currency; never recompute prices client-side for orders.
- [ ] **Inventory/order changes are idempotent** and reconciled on a schedule.
- [ ] Theme: no secrets in Liquid or theme JS; app embeds instead of pasted third-party scripts; Lighthouse checked on product and collection pages.

## Common AI-generated mistakes

- Copying a tutorial with an old or unversioned API URL.
- Verifying webhooks against parsed JSON (always fails, then gets removed).
- Requesting `write_*` scopes for read-only features.
- Pulling all products page by page in a request instead of using bulk operations.
- Editing the live theme directly instead of a duplicate/preview theme.

## Pre-launch checklist

- [ ] Webhook HMAC rejects a tampered payload; duplicate delivery is harmless.
- [ ] API version is current and not in the next retirement window.
- [ ] Theme changes tested on a duplicate theme, on mobile, and on slow network.
- [ ] Checkout, discounts, taxes (GST), and shipping rules verified with a real test order.
