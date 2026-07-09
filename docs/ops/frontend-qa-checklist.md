---
title: Frontend QA Checklist
status: active
updated: 2026-07-09
---

# Frontend QA Checklist

Use this checklist before merging UI-heavy branches or shipping a release.

## Required Viewports

Check every core surface at:

- Mobile: `390 x 844`
- Tablet: `768 x 1024`
- Desktop: `1440 x 1000`
- Wide desktop: `1920 x 1080`

## Core Surfaces

### Home

- Hero/product signal is visible in the first viewport.
- AI finder is reachable and does not overlap adjacent sections.
- Storefront discovery cards align cleanly across breakpoints.
- Buyer profile recovery appears only when memory signals exist.
- Trust strip and client studio preview remain readable on mobile.

### Search

- Empty state is clear when no query is active.
- Buyer profile recovery card does not crowd the empty state.
- Results load without layout shift.
- Match badges and signals wrap without overflowing cards.
- Product actions remain usable with keyboard and touch.

### Product Detail

- Product media has stable dimensions and does not push checkout controls below an unusable point.
- Personal fit panel appears only when search context exists.
- License clarity is readable before add-to-cart.
- Sticky purchase panel does not cover content on mobile.
- Error/auth notices are visible and actionable.

### Cart and Checkout

- Cart item quantities and remove actions are obvious.
- Checkout state is clear before login, after login, and after order creation.
- Payment provider options communicate manual/provider checkout differences.
- Failed payment states do not unlock delivery.
- Paid states unlock delivery only after confirmed payment.

### Account

- Order list is readable with multiple orders.
- Payment history statuses are understandable.
- Download vault shows active and inactive entitlements clearly.
- Refund request form only appears for eligible paid orders.
- Taste memory panel sync states are understandable.

### Admin

- Product table remains scannable on desktop.
- Publishing checks identify blockers clearly.
- Payment desk supports pending, paid, failed, expired, and refunded states.
- Refund desk supports requested, approved, and rejected states.
- Dangerous actions require password fields and disabled states work.

## Interaction Checks

- All buttons have a visible hover/focus/disabled state.
- Keyboard tab order reaches primary controls.
- Text never overlaps icons, buttons, cards, or media.
- Long product titles and customer emails truncate or wrap cleanly.
- Loading states do not cause major layout jumps.
- Empty states explain the next useful action.
- Error states preserve user-entered form data where possible.

## Visual Quality Bar

- Avoid one-color monotony across a full page.
- Keep operational screens dense and scannable, not marketing-heavy.
- Use gold/saffron accents for decisions and premium cues, not every container.
- Keep cards for repeated items or framed tools only.
- Avoid nested cards unless the inner item is a real repeated record.

## Data State Matrix

Run at least one pass with:

- Guest user.
- New signed-in user with no orders.
- Returning buyer with taste memory.
- Buyer with pending payment.
- Buyer with paid order and active entitlement.
- Buyer with refunded order and inactive entitlement.
- Admin with pending payments and refund requests.

## Production Smoke Test

After deploy:

1. Open home.
2. Run an AI/search query.
3. Open a product detail page.
4. Add to cart.
5. Register or log in.
6. Create checkout.
7. Create payment session.
8. Approve payment from admin.
9. Confirm download vault access.
10. Request refund.
11. Resolve refund from admin.
12. Confirm entitlement becomes inactive.

## Evidence

For release review, attach:

- Desktop screenshot of home.
- Mobile screenshot of product detail.
- Desktop screenshot of search results.
- Desktop screenshot of admin payment/refund desks.
- Notes for any known visual issue accepted for the release.
