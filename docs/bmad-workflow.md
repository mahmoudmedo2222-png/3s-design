---
title: 3S Design BMAD Workflow
status: active
created: 2026-07-04
updated: 2026-07-07
---

# 3S Design BMAD Workflow

## Daily Rule

No risky implementation starts from chat memory alone. Use the smallest useful artifact chain:

```text
Idea -> Product Brief / PRD -> Architecture Spine -> Epic/Story -> TEA Test Design -> Dev -> Review
```

## When To Use Each Skill

| Need                                       | Skill                                             |
| ------------------------------------------ | ------------------------------------------------- |
| Understand or reshape product direction    | `bmad-product-brief`                              |
| Define requirements                        | `bmad-prd` or `bmad-create-prd`                   |
| Define technical invariants                | `bmad-architecture` or `bmad-create-architecture` |
| Split work into epics/stories              | `bmad-create-epics-and-stories`                   |
| Prepare a single implementation story      | `bmad-create-story`                               |
| Implement quickly from a clear small spec  | `bmad-quick-dev`                                  |
| Design tests before coding                 | `bmad-tea-testarch-test-design`                   |
| Review test coverage                       | `bmad-tea-testarch-test-review`                   |
| Trace requirements to tests                | `bmad-tea-testarch-trace`                         |
| Review code                                | `bmad-code-review`                                |
| Track sprint state                         | `bmad-sprint-planning` / `bmad-sprint-status`     |
| Challenge product direction and priorities | `3s-strategy-advisor`                             |
| Research competitors, offers, and growth   | `3s-growth-market-research`                       |
| Improve storefront/account/checkout UX     | `3s-ux-commerce-advisor`                          |
| Review risky auth/payment/download flows   | `3s-security-reviewer`                            |
| Design production payment readiness        | `3s-payment-architect`                            |
| Improve product/category SEO and content   | `3s-seo-content-advisor`                          |

## 3S Advisor Agents And Specialist Skills

Use these project-local skills before BMAD execution when the work is still fuzzy:

- `3s-strategy-advisor`: pressure-tests ideas, rejects weak scope, and turns strong ideas into next moves.
- `3s-growth-market-research`: researches comparable stores and extracts what to copy, adapt, reject, or test.
- `3s-ux-commerce-advisor`: improves product pages, cart, checkout, account library, entitlements, downloads, and admin publishing UX.
- `3s-security-reviewer`: reviews auth, ownership, payment, webhook, entitlement, download, admin, and data leakage risks.
- `3s-payment-architect`: designs provider-ready payment flows, webhook/idempotency/refund behavior, and launch readiness.
- `3s-seo-content-advisor`: improves product/category content, metadata, trust copy, and buyer-intent discovery.

They do not replace BMAD. They prepare better inputs for BMAD.

## Artifact Locations

- Project context: `docs/project-context.md`
- BMAD operating guide: `docs/bmad-method.md`
- This workflow: `docs/bmad-workflow.md`
- Planning artifacts: `_bmad-output/planning-artifacts`
- Implementation artifacts: `_bmad-output/implementation-artifacts`
- Testing artifacts: `_bmad-output/testing-artifacts`

## Definition of Ready

A story is ready for development when:

- It maps to a PRD requirement.
- It does not violate the architecture spine.
- It has acceptance criteria.
- It names relevant files or modules.
- High-risk flows have TEA test design.

## Definition of Done

A story is done when:

- Code changes are scoped to the story.
- Relevant tests/checks were run or the gap is documented.
- Security/authorization behavior is checked when relevant.
- Sprint status is updated.
- A short implementation summary is recorded in the final response or artifact.

## High-Risk Areas

Always use PRD + Architecture + Story + TEA before changing:

- Authentication/session/token logic.
- Cart and checkout.
- Payments and webhooks.
- Entitlements and downloads.
- Admin mutations.
- Product/license/pricing relationships.
- AI discovery ranking or result generation.
