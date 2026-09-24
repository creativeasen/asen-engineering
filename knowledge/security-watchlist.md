# Security and deadline watchlist

Things that can break ASEN projects or put them at risk, with dates. Daily Scout adds items here. Remove an item only when its date has passed and every ASEN project is safe.

Severity: **critical** (act now), **high** (act this week), **medium** (plan it), **low** (awareness).

| Date | Item | Severity | Action for ASEN projects | Source | Verified |
| --- | --- | --- | --- | --- | --- |
| 2026-09-24 | Meta Graph API v20.0 stops working | high | Any code calling `graph.facebook.com/v20.0` or older must move to v26.0 (or at least v25.0). | https://developers.facebook.com/docs/graph-api/changelog/ | 2026-09-24 |
| 2026-09-23 → mid-Oct 2026 | WhatsApp Business accounts move to a new account model (phased rollout) | medium | Existing IDs, endpoints, and tokens keep working. Coexistence onboarding now needs the `account_update` webhook subscription. | https://developers.facebook.com/docs/whatsapp/business-platform/changelog/ | 2026-09-24 |
| 2026-10-01 | WhatsApp service and utility pricing changes; new pricing webhook/analytics values | medium | Check cost dashboards and any code that parses pricing webhooks. | https://developers.facebook.com/docs/whatsapp/business-platform/changelog/ | 2026-09-24 |
| 2026-10-01 | Vercel deprecates Node.js 20 | high | Set `"engines": {"node": "24.x"}` in every Vercel project. | https://vercel.com/docs/functions/runtimes/node-js/node-js-versions | 2026-09-24 |
| 2026-10-15 | Claude Haiku 4.5 may be retired from this date | medium | Move any `claude-haiku-4-5` usage to Sonnet 5 before then. | https://platform.claude.com/docs/en/models/overview | 2026-09-24 |
| 2026-10-16 | Shopify API version 2025-10 becomes inaccessible | medium | Pin Shopify apps to 2026-07 (or 2026-10 after 2026-10-01). | https://shopify.dev/docs/api/usage/versioning | 2026-09-24 |
| 2026-11-13 | DPDP Rules: Rule 4 (Consent Managers) comes into force, one year after the 2025-11-13 Gazette notification | low | Only matters if a project integrates a registered Consent Manager. | https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf | 2026-09-24 |
| By end of 2026 | Supabase deprecates legacy `anon` / `service_role` keys | high | Migrate to publishable / secret keys; remove any `eyJ...` keys from config. | https://supabase.com/docs/guides/api/api-keys | 2026-09-24 |
| ~2027-05-13 | DPDP Rules 3, 5–16, 22, 23 come into force (18 months after 2025-11-13): notices, security safeguards, breach intimation, retention, children's data, rights | critical (for readiness) | Every ASEN project that handles personal data must be compliant before this date. See the `dpdp-compliance` skill. | https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf | 2026-09-24 |
| Ongoing | Node.js 20 is end-of-life (since 2026-04-30): no more security fixes | high | Run Node 24 LTS everywhere. | https://github.com/nodejs/Release/blob/main/schedule.json | 2026-09-24 |
| Ongoing | Meta webhook mTLS: the old DigiCert client certificate expired 2026-04-15; Meta now uses its own outbound CA | low | Only if mTLS is enabled: trust `meta-outbound-api-ca-2025-12.pem`. | https://developers.facebook.com/docs/graph-api/webhooks/getting-started/ | 2026-09-24 |
| Ongoing | The Claude Code security review GitHub Action is not hardened against prompt injection | medium | Run it only on trusted PRs (our own), never automatically on outside contributors' PRs. | https://github.com/anthropics/claude-code-security-review | 2026-09-24 |
