---
name: dpdp-compliance
description: ASEN checklist for India's Digital Personal Data Protection Act 2023 and DPDP Rules 2025 - notices, consent, purpose limits, security safeguards, breach intimation, retention, children's data, user rights, and the compliance timeline. Use when a project collects or processes personal data of people in India.
---

# DPDP (India) compliance

This is an engineering checklist, not legal advice. Deadlines and sources: `${CLAUDE_PLUGIN_ROOT}/knowledge/security-watchlist.md`.

## Timeline (DPDP Rules 2025, Gazette G.S.R. 846(E), dated 13 Nov 2025)

- In force from 13 Nov 2025: Rules 1, 2 and 17–21 (Data Protection Board setup).
- 13 Nov 2026 (one year): Rule 4, Consent Managers.
- About 13 May 2027 (18 months): Rules 3 and 5–16, 22, 23, which cover notices, security safeguards, breach intimation, retention, children's data, and rights. **Build compliant now**, so there's no retrofit later.

## When it applies

Any ASEN project that stores or processes names, phone numbers, emails, addresses, chat messages, location, payment details, or any other data about an identifiable person.

## Must-have checklist

- [ ] **Data map** in the project docs: what personal data, why (purpose), where it is stored, who can access it, how long it's kept.
- [ ] **Notice** shown before or at collection: clear, standalone, plain language, itemised data and specific purpose, how to withdraw consent, and how to complain. Available in English and any language the product uses.
- [ ] **Consent** recorded per purpose (who, when, what text/version, how). Withdrawal as easy as giving consent, and it stops processing for that purpose.
- [ ] **Purpose limitation**: data used only for the stated purpose; analytics/marketing uses need their own consent.
- [ ] **Security safeguards**: encryption in transit and at rest, access control (RLS), access logs, backups, and monitoring, as required by the Rules' reasonable security safeguards.
- [ ] **Breach response plan (Rule 7)**: tell each affected user and the Data Protection Board *without delay*; send the Board a detailed report *within 72 hours* of becoming aware. Keep `/incident` ready.
- [ ] **Logs (Rule 6)**: keep logs that let you detect and investigate unauthorised access for one year (Rule 6 and the Seventh Schedule), then erase them unless another law requires otherwise.
- [ ] **Retention (Rule 8)**: erase data once the purpose is served; where the Third Schedule applies, warn the user at least 48 hours before erasure.
- [ ] **Children (under 18)**: verifiable parental consent before processing; no tracking or targeted ads to children.
- [ ] **User rights (Rule 14)**: publish how to request access, correction, erasure, and nomination; answer grievances within 90 days at most.
- [ ] **Processors** (Supabase, Vercel, Meta, Razorpay, Resend, PostHog, Sentry) listed with contracts; send them the minimum data.
- [ ] Contact for data questions published (Data Protection Officer if the project is a Significant Data Fiduciary).

## Common AI-generated mistakes

- Pre-ticked consent boxes, or one consent for "everything".
- Sending phone numbers or emails to analytics (PostHog event properties, Sentry breadcrumbs).
- No way to delete an account and its data.
- Keeping chat logs and exports forever "just in case".
- Copying a GDPR template without India-specific notice items and grievance contact.

## Pre-launch checklist

- [ ] Data map written and matches the database schema.
- [ ] Notice and consent screens reviewed by Aakash (and a lawyer for high-risk products).
- [ ] Delete-my-data flow tested end to end (including backups policy and processors).
- [ ] Breach runbook exists and names who does what.
- [ ] PII scrubbing on in Sentry and analytics.
