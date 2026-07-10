# 3S Design Visual System + Figma Handoff

## Purpose

This document turns the recent UI/UX work into a clean handoff map for Figma and future code cleanup.

## Current Visual Foundation

The code now has a first real visual system layer in `apps/web/app/globals.css`.

### Tokens Already Introduced

- Core color tokens:
  - `--3s-ink`
  - `--3s-paper`
  - `--3s-surface`
  - `--3s-surface-raised`
  - `--3s-surface-inverse`
  - `--3s-muted`
  - `--3s-line`
  - `--3s-pine`
  - `--3s-pine-bright`
  - `--3s-berry`
  - `--3s-saffron`
  - `--3s-gold`
  - `--3s-cream`
  - `--3s-danger`
  - `--3s-success`
  - `--3s-warning`
  - `--3s-info`
- Radius tokens:
  - `--3s-radius-sm`
  - `--3s-radius-md`
  - `--3s-radius-lg`
  - `--3s-radius-xl`
- Shadow tokens:
  - `--3s-shadow-soft`
  - `--3s-shadow-raised`
  - `--3s-shadow-premium`
- Type tokens:
  - `--3s-font-sans`
  - `--3s-type-display`
  - `--3s-type-h1`
  - `--3s-type-h2`
  - `--3s-type-h3`
  - `--3s-type-body`
  - `--3s-type-small`
  - `--3s-type-caption`

## Components Ready To Mirror In Figma

### Product Card

Code source:

- `apps/web/components/product-card.tsx`

Figma component variants:

- `Default`
- `Compact`
- `Featured`
- `Matched`
- `Signed out`
- `Adding`
- `Error`

Figma anatomy:

- Preview area
- Featured/match badges
- Feeling chip
- Title/subtitle
- Match decision panel
- License/delivery proof
- Signal chips
- Price/action footer

### Product Detail Decision Page

Code source:

- `apps/web/app/products/[slug]/page.tsx`
- `apps/web/components/product-detail-actions.tsx`

Figma frames:

- Desktop product detail
- Mobile product detail

Figma components:

- Hero preview
- Decision readout
- Purchase action panel
- License option row
- Purchase fact row
- Delivery reassurance block

### Search + AI Finder

Code source:

- `apps/web/components/search-experience.tsx`
- `apps/web/components/ai-discovery-panel.tsx`

Figma components:

- Search decision shell
- Search hero prompt
- Intent chip
- Match summary card
- Result grid
- No-results recovery state

### Checkout

Code source:

- `apps/web/components/checkout-workspace.tsx`

Figma components:

- Checkout hero
- Cart item
- Order summary
- Total row
- Confirmation block
- Checkout CTA
- Payment expectation panel

### Account + Vault

Code source:

- `apps/web/components/account-dashboard.tsx`
- `apps/web/components/delivery-vault.tsx`

Figma components:

- Account studio hero
- Ownership metric card
- Vault shell
- Vault entitlement card
- License ribbon
- Vault asset download row

## Visual QA Findings

These counts were measured on `apps/web/app` and `apps/web/components`.

| Pattern                          | Count |
| -------------------------------- | ----: |
| Hex colors                       |   408 |
| `rgba(...)` usage                |   252 |
| `bg-[...]` arbitrary classes     |   146 |
| `text-[...]` arbitrary classes   |   168 |
| `border-[...]` arbitrary classes |    30 |
| `shadow-[...]` arbitrary classes |    12 |

## Meaning

The visual system exists now, but the older interface still contains many hardcoded decisions.

This is acceptable for the current stage, but the next serious design-engineering pass should migrate repeated values into reusable tokens and component classes.

## Figma Build Order

1. Foundations
   - Colors
   - Typography
   - Radius
   - Shadows
   - Spacing examples

2. Core UI Components
   - Button
   - Badge
   - Panel/Card
   - Input
   - Notice
   - Chip

3. Sales Components
   - Product Card
   - Product Detail Action Panel
   - Search Match Summary
   - Cart Item
   - Checkout Summary
   - Vault Entitlement Card

4. Screen Frames
   - Home latest products
   - Product detail desktop/mobile
   - Search desktop/mobile
   - Checkout desktop/mobile
   - Account/Vault desktop/mobile

## Next Code Cleanup

Recommended next engineering task:

`3-31-token-migration-pass`

Scope:

- Convert repeated `#f7d17e`, `#fff8e8`, `#101513`, `#0f1513`, `#121816`, and `#7bd8bd` usage into semantic tokens.
- Replace common arbitrary Tailwind classes with component classes where repeated.
- Keep one-off rich visuals only where they belong: hero/intro/specific art direction.

## Token Migration Pass 3-31

Completed first low-risk migration:

- Added Tailwind semantic aliases for:
  - `success`
  - `warning`
  - `danger`
  - `surface`
  - `surface-raised`
  - `surface-inverse`
  - `pine-hover`
  - `gold-strong`
  - `cream-ink`
- Migrated core UI primitives:
  - `Button`
  - `ActionLink`
  - `Badge`
  - `Notice`
  - `Panel`
  - `Input`

Updated counts after this pass:

| Pattern                          | Before | After |
| -------------------------------- | -----: | ----: |
| Hex colors                       |    408 |   399 |
| `rgba(...)` usage                |    252 |   252 |
| `bg-[...]` arbitrary classes     |    146 |   134 |
| `text-[...]` arbitrary classes   |    168 |   160 |
| `border-[...]` arbitrary classes |     30 |    24 |
| `shadow-[...]` arbitrary classes |     12 |    12 |

Next migration target:

- `showcase-header.tsx`
- `site-footer.tsx`
- `product-detail-actions.tsx`
- repeated gold/cream/dark surface utility classes inside customer-facing surfaces

## Token Migration Pass 3-32

Completed header/footer migration:

- Migrated `showcase-header.tsx` repeated cream/gold/ink utilities to semantic tokens.
- Migrated `site-footer.tsx` repeated dark surface, cream, gold, and success utilities.
- Migrated `intent-link.tsx` active/hover gold border to token utilities.

Updated counts after this pass:

| Pattern                          | Before 3-32 | After 3-32 |
| -------------------------------- | ----------: | ---------: |
| Hex colors                       |         399 |        376 |
| `rgba(...)` usage                |         252 |        252 |
| `bg-[...]` arbitrary classes     |         134 |        123 |
| `text-[...]` arbitrary classes   |         160 |        146 |
| `border-[...]` arbitrary classes |          24 |         16 |
| `shadow-[...]` arbitrary classes |          12 |         12 |

Verification:

- Web typecheck passed.
- Web build passed after removing the stale `.next/lock` build artifact.

Next migration target:

- `product-detail-actions.tsx`
- `post-order-guidance.tsx`
- repeated product-detail page surface classes

## Token Migration Pass 3-33

Completed product decision/support migration:

- Migrated `product-detail-actions.tsx` personal-fit and auth notice colors to semantic tokens.
- Migrated `post-order-guidance.tsx` gold/dark support colors to semantic tokens.
- Removed stale `.next/lock` build artifact before verification.

Updated counts after this pass:

| Pattern                          | Before 3-33 | After 3-33 |
| -------------------------------- | ----------: | ---------: |
| Hex colors                       |         376 |        367 |
| `rgba(...)` usage                |         252 |        252 |
| `bg-[...]` arbitrary classes     |         123 |        118 |
| `text-[...]` arbitrary classes   |         146 |        140 |
| `border-[...]` arbitrary classes |          16 |         16 |
| `shadow-[...]` arbitrary classes |          12 |         12 |

Verification:

- Web typecheck passed.
- Web build passed.

## Token Migration Pass 3-34

Completed product detail page migration:

- Migrated repeated product-detail page surfaces from hardcoded dark backgrounds to semantic `surface` and `paper` tokens.
- Migrated gold/cream decision states in delivery metadata and design passport blocks to semantic tokens.
- Migrated product-card notice states to `gold`, `success`, and `berry` semantic tokens.
- Kept the product-media gradient overlay as a one-off art-direction layer.

Updated counts after this pass:

| Pattern                          | Before 3-34 | After 3-34 |
| -------------------------------- | ----------: | ---------: |
| Hex colors                       |         367 |        329 |
| `rgba(...)` usage                |         252 |        252 |
| `bg-[...]` arbitrary classes     |         118 |         87 |
| `text-[...]` arbitrary classes   |         140 |        127 |
| `border-[...]` arbitrary classes |          16 |         13 |
| `shadow-[...]` arbitrary classes |          12 |         12 |

Verification:

- Web typecheck passed.
- Direct `next typegen` and `tsc` checks passed.
- Production build still needs a separate stability pass; local `next build` attempts can leave an active `.next/lock` worker.

Next migration target:

- Continue token migration on checkout/account/search surfaces.

## Build Stability Investigation 3-35

Build work attempted:

- Diagnosed production build failure as static generation conflicting with request cookie usage in `RootLayout`.
- Added `export const dynamic = 'force-dynamic'` to `apps/web/app/layout.tsx`.
- Kept `experimental.webpackBuildWorker: false` in `apps/web/next.config.ts` because worker-backed builds were unstable on this Windows workspace.

Verification:

- Direct `next typegen` passed.
- Direct `tsc -p tsconfig.json --noEmit` passed.
- `@3s-design/web` tests passed.
- Official `corepack pnpm --filter @3s-design/web build` remains unstable on this local Node `24.18.0` Windows workspace and can exit while leaving a short-lived `.next/build` worker. Release gates must run on pinned Node `22.x`.

## Token Migration Pass 3-36

Checkout token migration is complete:

- Migrated checkout repeated dark panel colors to `paper`/`surface` tokens.
- Removed checkout-specific hardcoded dark backgrounds where the global theme tokens already carry light/dark behavior.
- Kept typography arbitrary sizes unchanged because those are compact UI scale decisions, not color-token debt.

Updated counts after this pass:

| Pattern                          | Before 3-36 | After 3-36 |
| -------------------------------- | ----------: | ---------: |
| Hex colors                       |         329 |        319 |
| `rgba(...)` usage                |         252 |        252 |
| `bg-[...]` arbitrary classes     |          87 |         77 |
| `text-[...]` arbitrary classes   |         127 |        127 |
| `border-[...]` arbitrary classes |          13 |         13 |
| `shadow-[...]` arbitrary classes |          12 |         12 |

Verification:

- Web typecheck passed.
- Production build is not accepted as release-verified until it passes under pinned Node `22.x`.
- Local Node emitted an environment warning: project engines expect Node `>=22 <23`, while local Node is `24.18.0`.

Next migration target:

- Account/search surfaces still carrying hardcoded visual debt.
- Local Node runtime drift should be cleaned up before heavier release verification.

## Token Migration Pass 3-37

Completed account token migration:

- Migrated account-dashboard repeated gold/cream accents to semantic tokens.
- Migrated email-verification notice and account action hover states away from raw hex colors.
- Kept the unauthenticated account dark backdrop as a one-off art-direction layer.

Updated counts after this pass:

| Pattern                          | Before 3-37 | After 3-37 |
| -------------------------------- | ----------: | ---------: |
| Hex colors                       |         319 |        307 |
| `rgba(...)` usage                |         252 |        252 |
| `bg-[...]` arbitrary classes     |          77 |         70 |
| `text-[...]` arbitrary classes   |         127 |        120 |
| `border-[...]` arbitrary classes |          13 |         11 |
| `shadow-[...]` arbitrary classes |          12 |         12 |

Verification:

- Web typecheck passed.
- Production build is not accepted as release-verified until it passes under pinned Node `22.x`.
- Local Node emitted the existing environment warning: project engines expect Node `>=22 <23`, while local Node is `24.18.0`.

Next migration target:

- Search surface token migration.

## Token Migration Pass 3-38

Completed search token migration:

- Migrated AI search gold headings, notices, paging lock text, and submit action to semantic tokens.
- Migrated search input placeholder color from raw hex to `cream-ink`.
- Kept compact typography arbitrary sizes unchanged because they are UI scale decisions, not color-token debt.

Updated counts after this pass:

| Pattern                          | Before 3-38 | After 3-38 |
| -------------------------------- | ----------: | ---------: |
| Hex colors                       |         307 |        301 |
| `rgba(...)` usage                |         252 |        252 |
| `bg-[...]` arbitrary classes     |          70 |         68 |
| `text-[...]` arbitrary classes   |         120 |        114 |
| `border-[...]` arbitrary classes |          11 |         10 |
| `shadow-[...]` arbitrary classes |          12 |         12 |

Verification:

- Web typecheck passed.
- A Node `22.23.1` production build produced `.next/BUILD_ID` and route manifests, but the release gate should rerun the build in a clean Node 22 shell or CI before shipping.

Next migration target:

- Align local Node runtime to Node 22 before heavier release verification.
- Continue deeper visual debt reduction in shared glass/dark account surfaces.

## Release Runtime Gate 3-39

Completed release runtime guard:

- Added `pnpm release:check` as the combined release gate.
- Added `pnpm runtime:check:strict` to the GitHub quality workflow before quality/build.
- Updated release documentation to use the combined gate.

Verification:

- Local `pnpm runtime:check` warns on Node `24.18.0` as expected.
- Local `pnpm runtime:check:strict` fails on Node `24.18.0` as expected.
- CI is configured to run on Node `22`.

Next migration target:

- Switch the local shell to Node 22, then run `pnpm release:check`.
- Continue deeper visual debt reduction in shared glass/dark account surfaces.

## Local Node 22 Wrapper 3-40

Completed local runtime wrapper:

- Added `scripts/with-node22.ps1`.
- Added `pnpm with:node22 "<command>"`.
- Added `pnpm release:check:node22`.
- Documented the wrapper in release and environment docs.

Verification:

- `pnpm with:node22 "corepack pnpm runtime:check:strict"` passed.
- `pnpm with:node22 "corepack pnpm --filter @3s-design/web typecheck"` passed.
- `pnpm with:node22 "corepack pnpm --filter @3s-design/web build"` still exits locally after compile with `4294967295`; keep release build verification on CI or a clean Node 22 shell.

Next migration target:

- Continue deeper visual debt reduction in shared glass/dark account surfaces.

## Token Migration Pass 3-41

Completed shared customer surface token migration:

- Migrated shared customer journey, trust, decision, badge, and empty-state surfaces to semantic tokens.
- Removed repeated hardcoded dark panel backgrounds from `customer-experience.tsx`.
- Fixed a React ref typing issue in `related-products-loader.tsx`.

Updated counts after this pass:

| Pattern                          | Before 3-41 | After 3-41 |
| -------------------------------- | ----------: | ---------: |
| Hex colors                       |         301 |        288 |
| `rgba(...)` usage                |         252 |        252 |
| `bg-[...]` arbitrary classes     |          68 |         58 |
| `text-[...]` arbitrary classes   |         114 |        108 |
| `border-[...]` arbitrary classes |          10 |          8 |
| `shadow-[...]` arbitrary classes |          12 |         12 |

Verification:

- Web typecheck passed.
- Web build remains a local Windows/Next blocker after compile; do not mark this pass release-verified until CI or a clean Node 22 shell passes.

Next migration target:

- Delivery vault, private showroom, taste-memory, and funnel panels.

## Token Migration Pass 3-42

Completed account-side glass surface token migration:

- Migrated delivery vault, private showroom, taste-memory, and funnel insight accents to semantic tokens.
- Replaced repeated gold, cream, cream-ink, and berry hex utilities.
- Kept one-off shadow utilities unchanged for a later elevation-token pass.

Updated counts after this pass:

| Pattern                          | Before 3-42 | After 3-42 |
| -------------------------------- | ----------: | ---------: |
| Hex colors                       |         288 |        269 |
| `rgba(...)` usage                |         252 |        252 |
| `bg-[...]` arbitrary classes     |          58 |         49 |
| `text-[...]` arbitrary classes   |         108 |         92 |
| `border-[...]` arbitrary classes |           8 |          6 |
| `shadow-[...]` arbitrary classes |          12 |         12 |

Verification:

- Web typecheck passed.
- Web build remains a local Windows/Next blocker after compile; do not mark this pass release-verified until CI or a clean Node 22 shell passes.

Next migration target:

- Typography utility audit for repeated `text-[...]` sizes, then elevation tokens for repeated `shadow-[...]` values.

## Micro Type and Elevation Tokens 3-43

Completed micro typography and elevation token migration:

- Added Tailwind font-size tokens for `micro`, `nano`, and `brand`.
- Added uppercase tracking tokens for repeated caps labels.
- Replaced near-equivalent account glass arbitrary shadows with `shadow-premium`.
- Migrated `Badge` to the shared micro type token.

Updated counts after this pass:

| Pattern                          | Before 3-43 | After 3-43 |
| -------------------------------- | ----------: | ---------: |
| Hex colors                       |         269 |        269 |
| `rgba(...)` usage                |         252 |        250 |
| `bg-[...]` arbitrary classes     |          49 |         49 |
| `text-[...]` arbitrary classes   |          92 |         84 |
| `border-[...]` arbitrary classes |           6 |          6 |
| `shadow-[...]` arbitrary classes |          12 |         10 |

Verification:

- Web typecheck passed.
- Web build remains behind the local Windows/Next static-generation gate; do not mark this pass release-verified until the production build completes cleanly.

Next migration target:

- Home/showcase visual token cleanup, especially remaining gold/ink hex usage and showcase-specific surfaces.

## Screenshots Captured

Stored in `outputs/`:

- `visual-system-product-card-home.png`
- `product-detail-v2-desktop.png`
- `product-detail-v2-mobile.png`
- `search-ai-redesign-desktop.png`
- `search-ai-redesign-mobile.png`
- `checkout-visual-refinement-desktop.png`
- `checkout-visual-refinement-mobile.png`
- `account-vault-refinement-desktop.png`
- `account-vault-refinement-mobile.png`
