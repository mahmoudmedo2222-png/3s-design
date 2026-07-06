# BMAD Method and TEA for 3S Design

## Status

BMAD was installed in this project using the official CLI:

```powershell
pnpm dlx bmad-method install --modules bmm --tools codex --yes
```

Installed official modules:

- BMAD Core `v6.10.0`
- BMAD Method `v6.10.0`
- Codex skills in `.agents/skills`

The official installer currently exposes `core` and `bmm` as built-in modules. A standalone official module named `tea` was not available from the installed BMAD CLI, so this project also includes project-local TEA adapter skills under `.agents/skills`.

## Why BMAD

BMAD gives the project a repeatable product and engineering workflow:

- Turn ideas into product briefs, PRDs, UX notes, architecture, and stories.
- Keep decisions and artifacts in the repo instead of scattered chat history.
- Make feature work easier to review because requirements, acceptance criteria, and implementation notes are explicit.
- Let Codex use specialized skills for planning, architecture, development, review, and documentation.

## Why TEA

TEA here means the Test Architect operating layer for 3S Design. Its job is to keep quality work intentional before implementation starts:

- Design test strategy before coding risky changes.
- Decide which tests are worth automating.
- Review existing tests for meaningful coverage instead of test volume.
- Trace product requirements, acceptance criteria, risks, and tests together.

TEA should be used for checkout, auth, cart, account, product detail, admin, payment, download, and AI discovery flows.

## Codex Skills

Official BMAD skills are available in `.agents/skills`, including:

- `$bmad-help`
- `$bmad-agent-architect`
- `$bmad-agent-dev`
- `$bmad-code-review`
- `$bmad-qa-generate-e2e-tests`
- `$bmad-create-prd`
- `$bmad-create-story`

Project-local TEA adapter skills:

- `$bmad-tea`
- `$bmad-tea-testarch-test-design`
- `$bmad-tea-testarch-automate`
- `$bmad-tea-testarch-test-review`
- `$bmad-tea-testarch-trace`

## Suggested Usage

Use `$bmad-tea` when you want a testing architecture menu for a feature or release.

Use `$bmad-tea-testarch-test-design` before implementation when a feature needs a test plan, risk model, or acceptance-criteria coverage map.

Use `$bmad-tea-testarch-automate` when the test design is clear and you want automation recommendations or implementation guidance.

Use `$bmad-tea-testarch-test-review` after tests exist, or before merging risky work, to identify weak assertions, missing cases, and brittle coverage.

Use `$bmad-tea-testarch-trace` to map requirements, user flows, risks, and tests into a traceability table.

## Artifact Locations

Recommended output locations:

- Product and planning artifacts: `_bmad-output/planning-artifacts`
- Implementation artifacts: `_bmad-output/implementation-artifacts`
- Project knowledge: `docs`
- Testing artifacts: `docs/testing` or `_bmad-output/testing-artifacts`

## Operating Rules

- Do not start with automation. Start with risk and acceptance criteria.
- Prefer a small number of high-value tests over broad shallow tests.
- Every critical visitor flow should have at least one reliable regression path.
- Authentication, payments, downloads, and admin workflows need negative-path tests.
- Traceability should connect each important behavior to a test or an explicit accepted risk.
