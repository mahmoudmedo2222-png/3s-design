---
title: Launch Product Pack
status: active
updated: 2026-07-06
---

# Launch Product Pack

This checklist turns a design from a nice preview into a sellable 3S product. Use it for the first 10-20 launch products before production.

## Launch Goal

Ship a focused catalog that feels premium, trustworthy, and ready to buy:

- 10-20 real products only.
- Every product has a protected public preview.
- Every product has a ready delivery file.
- Every product has a clear commercial license.
- Every product has complete Design DNA for AI matching.
- Every product can be purchased and delivered without manual code changes.

## Product Folder Shape

Send or store each product in this shape:

```txt
launch-pack/
  01-luxury-restaurant-black-gold-posts/
    preview/
      watermarked-preview.webp
      product-card-preview.webp
    delivery/
      luxury-restaurant-black-gold-posts-v1.zip
    source-notes/
      figma-link.txt
      canva-link.txt
      license-notes.md
    metadata.md
```

Keep the delivery ZIP product-level for now. Do not attach it only to a variant until the storefront has a variant selector.

## Required Metadata

Each product needs:

| Field            | Example                                                               |
| ---------------- | --------------------------------------------------------------------- |
| Product title    | Luxury Restaurant Black Gold Posts                                    |
| Slug             | luxury-restaurant-black-gold-posts                                    |
| Subtitle         | Premium black and gold launch post kit for restaurants                |
| Description      | What the customer can use it for and what feeling it creates          |
| Price            | 19.00 USD                                                             |
| License          | Full Commercial, reusable, editable, non-exclusive                    |
| Industry         | restaurant                                                            |
| Mood             | luxury, confident, social                                             |
| Style            | premium, modern                                                       |
| Colors           | black, gold                                                           |
| Platform         | instagram, social                                                     |
| Format           | post, menu, story, banner                                             |
| Audience         | restaurant owners, food brands                                        |
| Preview alt text | Black and gold restaurant launch social media design preview          |
| Included files   | Canva link, Figma link, PNG exports, editable source, PDF, fonts note |

## Design DNA Minimum

A launch product is not ready for AI matching until it has all of these groups:

- Industry: who it is for.
- Mood or style: how the customer should feel.
- Color: visual palette.
- Platform or format: where it will be used.

Good:

```txt
Industry: restaurant
Mood: luxury, confident
Style: premium, editorial
Color: black, gold
Platform: instagram, social
Format: post, story, menu
Audience: restaurant owners, hospitality brands
```

Weak:

```txt
Color: black
Tag: modern
```

## Preview Rules

Public previews must be inspectable but protected:

- Use `.webp`, `.jpg`, or `.png`.
- Prefer 1600px wide or larger for product detail.
- Add a subtle 3S watermark.
- Do not upload raw editable files as previews.
- Preview should show the actual product, not a vague mockup only.

## Delivery ZIP Rules

Each delivery ZIP should include:

- Editable source or clear external edit link instructions.
- Exported ready-to-use files.
- Font/license notes.
- Dimensions list.
- A short `README.txt`.
- No private API keys, credentials, or unrelated files.

Suggested ZIP contents:

```txt
README.txt
exports/
  instagram-post-1080x1080.png
  story-1080x1920.png
source/
  figma-link.txt
  canva-link.txt
license/
  commercial-license.txt
```

## Figma And Canva Role

Use Figma as the professional source of truth:

- Master design.
- Components and design system.
- Premium preview screens.
- Product detail mockups.

Use Canva as the customer's fast-edit path:

- Easy social media variants.
- Client-friendly editable copies.
- Seasonal/niche versions.
- Quick product bundles.

Best launch pattern:

```txt
Figma master -> Canva customer variant -> exported previews -> delivery ZIP -> 3S product
```

## First Launch Batches

Start focused:

1. Restaurants and cafes: 5 products.
2. Beauty and spa: 4 products.
3. Real estate and property: 3 products.
4. Fashion/ecommerce sale packs: 4 products.
5. Events/wedding/invitations: 4 products.

Do not launch with a huge weak catalog. A small premium catalog will feel more expensive and more intentional.

## Acceptance Gate

A product can enter production only when:

- Admin publishing checks pass.
- Product has a primary watermarked preview.
- Product has a ready delivery ZIP or source file.
- Product has at least one commercial license price.
- Product has category and tags.
- Product has complete Design DNA.
- Checkout can create an order for it.
- Paid order grants entitlement.
- Entitlement creates a signed download URL.

## What To Send For One Product

For each product, send:

```txt
1. Product name:
2. Price:
3. Who it is for:
4. What feeling it should create:
5. Colors:
6. Formats/platforms:
7. Figma link:
8. Canva link:
9. Preview image:
10. Final delivery ZIP:
11. Any font/license notes:
```

If a field is unknown, leave it blank. We can fill the strategy together before uploading.
