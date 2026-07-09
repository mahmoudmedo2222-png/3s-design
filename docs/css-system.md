---
title: 3S CSS System
status: active
created: 2026-07-08
updated: 2026-07-08
source: codex-css-cleanup
---

# 3S CSS System

## Purpose

The CSS system keeps the 3S interface premium, consistent, responsive, and maintainable while preserving the existing product experience.

## Current Scope

The first cleanup pass focuses on:

- Global design tokens.
- Tailwind token alignment.
- Product card depth motion.
- Client studio visual direction flow.
- Markdown linting for documentation quality.
- Reduced motion handling.

## Design Tokens

Core tokens live in:

```text
apps/web/app/globals.css
```

Tailwind token aliases live in:

```text
apps/web/tailwind.config.ts
```

Use tokens for repeated visual decisions:

- Color
- Radius
- Shadow
- Motion
- Focus states

## Reusable Classes

Use shared classes for repeated premium surfaces:

```text
premium-panel
premium-control
```

These classes reduce repeated border, background, shadow, and hover code.

## Motion Rules

Product previews may use depth motion on hover because it supports the buying experience.

Keep motion rules:

- Use transform and opacity first.
- Avoid heavy blur on large areas.
- Avoid WebGL for repeated product cards.
- Respect `prefers-reduced-motion`.

## Product Card Depth

Product cards use layered 2.5D motion:

- The card lifts slightly.
- The design preview gains focus.
- Mockup layers move forward.
- Background detail softens.

This gives a living product feel without adding expensive per-card 3D rendering.

## Client Studio

The client studio should stay calm and premium:

- English default.
- Client-safe copy.
- Few choices per step.
- Compact static direction preview.
- No internal scores or technical wording.

## Guardrails

- Do not create standalone prototypes outside the project unless explicitly requested.
- Do not introduce unrelated business examples.
- Avoid random hex values in new components when a token exists.
- Do not add large motion effects without a clear user-facing purpose.
- Keep RTL support intact, but English remains the default language.

## Checks

Run these before handing off CSS work:

```bash
pnpm --filter @3s-design/web typecheck
pnpm --filter @3s-design/web lint
pnpm lint:md
```
