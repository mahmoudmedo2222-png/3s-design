---
title: 3S Client Color Session
status: active
created: 2026-07-07
updated: 2026-07-07
source: codex-client-studio-flow
---

# 3S Client Color Session

## Purpose

The client color session helps 3S understand a client's visual taste without overwhelming them with design jargon, long forms, or technical AI details.

It lives inside the existing client studio preview, not as a separate product or unrelated prototype.

## Product Fit

This feature belongs to 3S because the platform sells ready-to-use and campaign-ready digital design directions. The session captures client taste and feeds future recommendations through taste memory.

## Flow

The flow should stay short:

1. Choose brightness: light, dark, or balanced.
2. Choose the first feeling: luxury, bold, warm, or minimal.
3. Choose the closest color family.
4. Choose one final direction from three options.

The client should not see internal scores, raw AI reasoning, database labels, or unrelated business examples.

## Implementation

The current MVP implementation is in:

```text
apps/web/components/client-studio-preview.tsx
```

The visual styling is in:

```text
apps/web/app/globals.css
```

The saved direction uses the existing taste memory helper:

```text
apps/web/lib/taste-memory.ts
```

## Guardrails

- Keep the session inside the 3S visual language.
- Do not show unrelated financial, property, or operational examples.
- Do not create a separate standalone HTML prototype for this feature.
- Keep client-facing choices simple and visual.
- Use the 3S campaign preview as the live preview surface.
- Save only the selected direction and brief needed for future recommendations.

## Future Enhancements

- Let the client upload a reference image and extract a color direction.
- Add accessibility contrast warnings for selected palettes.
- Send the saved direction into AI discovery as context.
- Allow admin review before turning a client direction into a custom campaign.
