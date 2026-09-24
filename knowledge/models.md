# Which Claude model for which task

Source for every row: the official models overview. Re-verify monthly and whenever Anthropic announces a model.

## Current models

| Model | API ID | Best for | Price (input / output per 1M tokens) | Context | Retirement not before | Source | Verified |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Claude Fable 5.1 | `claude-fable-5-1` | Hardest reasoning, long agentic work, when Opus at high effort still falls short | $10 / $50 | 1M | 2027-09-01 | https://platform.claude.com/docs/en/models/overview | 2026-09-24 |
| Claude Opus 5.5 | `claude-opus-5-5` | Default for most work: long-running agentic coding, reviews, architecture | $4 / $20 | 1M | 2027-09-22 | https://platform.claude.com/docs/en/models/overview | 2026-09-24 |
| Claude Sonnet 5 | `claude-sonnet-5` | Fast, strong everyday work: product features, chat, classification with reasoning | $2 / $10 | 1M | 2027-06-30 | https://platform.claude.com/docs/en/models/overview | 2026-09-24 |
| Claude Haiku 4.5 | `claude-haiku-4-5-20251001` | Fastest and cheapest: routing, extraction, short replies | $1 / $5 | 200K | **2026-10-15** (soon) | https://platform.claude.com/docs/en/models/overview | 2026-09-24 |

## ASEN recommendations

| Task | Model | Why | Source | Verified |
| --- | --- | --- | --- | --- |
| Claude Code day-to-day building | Opus 5.5 | Anthropic's recommended starting point for most workloads | https://platform.claude.com/docs/en/models/overview | 2026-09-24 |
| security-reviewer, architect-reviewer, knowledge-verifier agents | Opus 5.5 | Deep reasoning; correctness matters more than speed | https://platform.claude.com/docs/en/models/overview | 2026-09-24 |
| qa-tester agent | Sonnet 5 | Many quick checks; good speed/intelligence balance | https://platform.claude.com/docs/en/models/overview | 2026-09-24 |
| Cloud routines on the Pro plan | Sonnet 5 (Opus 5.5 for PR Verifier) | Keeps usage low; verification needs the stronger model | https://platform.claude.com/docs/en/models/overview | 2026-09-24 |
| In-product AI features (WhatsApp replies, summaries) | Sonnet 5 | Balanced cost and quality at volume | https://platform.claude.com/docs/en/models/overview | 2026-09-24 |
| High-volume classification/routing in products | Sonnet 5 for new work; Haiku 4.5 only with a migration plan | Haiku 4.5 retirement can start 2026-10-15 | https://platform.claude.com/docs/en/models/overview | 2026-09-24 |

## Rules for model use in ASEN products

- Put the model ID in one config value, never scattered through code, so upgrades are one change.
- Current models use adaptive thinking steered by `effort`; don't send the old `budget_tokens` thinking mode to models that don't accept it.
- Track the retirement dates above; routines open a PR 60 days before a model in use can retire.
