---
title: 3S Design BMAD Workflow
status: active
created: 2026-07-04
updated: 2026-07-04
---

# 3S Design BMAD Workflow

## Daily Rule

No risky implementation starts from chat memory alone. Use the smallest useful artifact chain:

```text
Idea -> Product Brief / PRD -> Architecture Spine -> Epic/Story -> TEA Test Design -> Dev -> Review
```

## When To Use Each Skill

| Need                                      | Skill                                             |
| ----------------------------------------- | ------------------------------------------------- |
| Understand or reshape product direction   | `bmad-product-brief`                              |
| Define requirements                       | `bmad-prd` or `bmad-create-prd`                   |
| Define technical invariants               | `bmad-architecture` or `bmad-create-architecture` |
| Split work into epics/stories             | `bmad-create-epics-and-stories`                   |
| Prepare a single implementation story     | `bmad-create-story`                               |
| Implement quickly from a clear small spec | `bmad-quick-dev`                                  |
| Design tests before coding                | `bmad-tea-testarch-test-design`                   |
| Review test coverage                      | `bmad-tea-testarch-test-review`                   |
| Trace requirements to tests               | `bmad-tea-testarch-trace`                         |
| Review code                               | `bmad-code-review`                                |
| Track sprint state                        | `bmad-sprint-planning` / `bmad-sprint-status`     |

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
