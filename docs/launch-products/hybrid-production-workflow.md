---
title: Hybrid Production Workflow
status: active
updated: 2026-07-06
---

# Hybrid Production Workflow

The approved production path is Hybrid:

```txt
Figma premium master -> Canva editable customer copy -> exports -> delivery ZIP -> 3S product draft -> publish gate
```

Figma is the premium source of truth. Canva is the editable customer convenience layer.

## Why Hybrid

- Figma keeps the product quality high and consistent.
- Canva makes the product easier for normal customers to edit.
- The website can sell a clear delivery package instead of a vague template.
- AI matching gets stronger because each product has a real buyer moment and complete Design DNA.

## Production Stages

## 1. Figma Master

Create one Figma file for the starter five, or one page per product inside a shared launch file.

Recommended page structure:

```txt
01 Foundations
02 Noir Dining Launch Kit
03 Glow Clinic Launch Kit
04 Signature Property Carousel
05 Capsule Drop Sale Kit
06 Elegant Wedding Invitation Suite
07 Watermarked Previews
08 Export QA
```

Each product page must include:

- Product master frame.
- Website hero preview frame.
- Product card preview frame.
- Export frames.
- Notes frame with fonts, image style, and Canva handoff notes.

## 2. Canva Editable Copy

After the Figma direction is approved:

- Rebuild or adapt the customer-facing frames in Canva.
- Keep headline, offer, dates, prices, and contact text editable.
- Keep colors easy to replace.
- Do not flatten the whole design into one image.
- Save the Canva editable link for delivery notes.

## 3. Export Package

Export these files before creating the product ZIP:

```txt
preview/
  product-card-preview.webp
  website-hero-preview.webp
  watermarked-preview.webp
exports/
  social-post.png
  story.png
  product-specific-extra.png
source-notes/
  figma-link.txt
  canva-link.txt
  font-license-notes.md
license/
  commercial-license.txt
README.txt
```

## 4. Delivery ZIP

Create one ZIP per product:

```txt
{slug}-v1.zip
```

The ZIP must not contain:

- API keys.
- Personal files.
- Raw unrelated assets.
- Unlicensed fonts.
- Private customer data.

## 5. 3S Product Draft

The draft product already exists in the local database for the starter five. Keep it as draft until:

- Primary watermarked preview is uploaded.
- Delivery ZIP/source file is uploaded.
- License price exists.
- Design DNA is complete.
- Admin publishing checks pass.

## Starter Five Build Order

1. Noir Dining Launch Kit.
2. Glow Clinic Launch Kit.
3. Signature Property Carousel.
4. Capsule Drop Sale Kit.
5. Elegant Wedding Invitation Suite.

## Per-Product Done Definition

A product is production-ready when it has:

- Figma master link.
- Canva editable link.
- Product card preview.
- Website hero preview.
- Watermarked preview.
- Delivery ZIP.
- License notes.
- Metadata reviewed.
- Admin publishing checks passing.

## Next Decision Gate

Before creating visual assets, choose how we will make the first Figma master:

- Manual design in Figma.
- AI-generated visual direction first, then rebuild in Figma.
- Canva-first rough draft, then polish in Figma.

The preferred route for 3S is manual Figma master with AI mood references only.
