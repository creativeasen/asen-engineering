---
name: website
description: ASEN standard for marketing and business websites and landing pages - React + Vite + Tailwind or static, performance, SEO, accessibility, forms, analytics consent. Use when building or changing a website, landing page, or brochure site.
---

# Website / landing page

Stack and versions: `${CLAUDE_PLUGIN_ROOT}/knowledge/stack.md` (React, Vite, Tailwind, Vercel, Cloudflare, PostHog, Resend). Template: `${CLAUDE_PLUGIN_ROOT}/templates/website/`.

## When it applies

Public sites with mostly static content: agency sites, client landing pages, portfolios, campaign pages. If users log in or data is per-user, use `saas-webapp` instead.

## Standard stack

React + Vite + Tailwind (static build) on Vercel, DNS/WAF on Cloudflare, forms via a server function that validates with Zod and sends with Resend, PostHog analytics after consent.

## Must-have checklist

- [ ] Lighthouse mobile ≥ 90 for Performance, Accessibility, Best Practices, SEO.
- [ ] Images: modern formats, explicit width/height, lazy-loaded below the fold; fonts self-hosted or preloaded with `font-display: swap`.
- [ ] Semantic HTML, one `h1` per page, alt text, visible focus, colour contrast AA, works with keyboard only.
- [ ] SEO: unique title and meta description per page, canonical URLs, Open Graph tags, `sitemap.xml`, `robots.txt`, structured data where relevant.
- [ ] Forms: server-side Zod validation, honeypot + rate limit (or Cloudflare Turnstile), no secrets in client code, clear success/error states.
- [ ] Analytics and marketing pixels load only after consent; no personal data in analytics events (DPDP).
- [ ] Security headers set in `vercel.json` (CSP, HSTS, nosniff, frame-ancestors, referrer policy).
- [ ] 404 page, favicon set, and a contact/privacy page.

## Common AI-generated mistakes

- Giant hero images and videos with no compression; layout shift from images without dimensions.
- Contact form that emails from the browser with an API key in client code.
- Copy-pasted meta tags identical on every page.
- Div-soup buttons that can't be reached with the keyboard.
- Loading five analytics/chat widgets on first paint.

## Pre-launch checklist

- [ ] Lighthouse scores recorded (mobile).
- [ ] All links and forms tested on a real phone and slow 3G throttling.
- [ ] DNS, HTTPS, and `www` → apex redirect correct; Cloudflare proxy on.
- [ ] Privacy notice and consent banner in place (see `dpdp-compliance`).
- [ ] Uptime monitor added in Better Stack.
