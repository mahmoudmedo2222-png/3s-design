import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';

const outDir = dirname(fileURLToPath(import.meta.url));

const palette = {
  black: '#070706',
  blackSoft: '#11100e',
  charcoal: '#181613',
  ivory: '#f2eadc',
  ivorySoft: '#ded1be',
  gold: '#c8a45d',
  goldDark: '#7c6030',
  taupe: '#9b8874',
  burgundy: '#5a2430',
};

const templates = [
  {
    file: '01-post-editorial-invite.svg',
    id: 'CDSK / 01 / Post / Editorial Invite',
    channel: 'Instagram post',
    variation: 'A',
    width: 1080,
    height: 1080,
    mode: 'editorial',
    headline: 'PRIVATE EDIT',
    subline: 'Selected pieces for a limited capsule drop.',
    eyebrow: 'CAPSULE DROP',
    cta: 'SHOP THE EDIT',
    collection: 'The Capsule Edit',
    window: 'Fri 12 - Sun 14',
    code: 'CAPSULE15',
    productCount: '32 selected pieces',
  },
  {
    file: '01-post-offer-invite.svg',
    id: 'CDSK / 01 / Post / Offer Invite',
    channel: 'Instagram post',
    variation: 'B',
    width: 1080,
    height: 1080,
    mode: 'offer',
    headline: 'PRIVATE SALE',
    subline: 'A quiet offer for selected pieces.',
    eyebrow: 'LIMITED ACCESS',
    cta: 'UNLOCK THE OFFER',
    collection: 'Private Wardrobe Drop',
    window: '48 hours only',
    code: 'PRIVATE15',
    productCount: 'Limited sizes',
  },
  {
    file: '01-story-editorial-invite.svg',
    id: 'CDSK / 01 / Story / Editorial Invite',
    channel: 'Instagram story',
    variation: 'A',
    width: 1080,
    height: 1920,
    mode: 'editorial',
    headline: 'THE EDIT OPENS',
    subline: 'A curated capsule drop for selected pieces.',
    eyebrow: 'PRIVATE PREVIEW',
    cta: 'SHOP THE EDIT',
    collection: 'The Capsule Edit',
    window: 'Preview ends Sunday',
    code: 'CAPSULE15',
    productCount: '32 selected pieces',
  },
  {
    file: '01-story-offer-invite.svg',
    id: 'CDSK / 01 / Story / Offer Invite',
    channel: 'Instagram story',
    variation: 'B',
    width: 1080,
    height: 1920,
    mode: 'offer',
    headline: 'SALE ACCESS',
    subline: 'Limited pieces. Quiet pricing. Premium presentation.',
    eyebrow: 'OPEN FOR 48 HOURS',
    cta: 'ENTER THE DROP',
    collection: 'Private Wardrobe Drop',
    window: '48 hours only',
    code: 'PRIVATE15',
    productCount: 'Limited sizes',
  },
  {
    file: '01-banner-editorial-invite.svg',
    id: 'CDSK / 01 / Banner / Editorial Invite',
    channel: 'Website/banner',
    variation: 'A',
    width: 1600,
    height: 900,
    mode: 'editorial',
    headline: 'THE CAPSULE EDIT',
    subline: 'Selected pieces, presented with quiet urgency.',
    eyebrow: 'PRIVATE SALE PREVIEW',
    cta: 'SHOP THE EDIT',
    collection: 'The Capsule Edit',
    window: 'Fri 12 - Sun 14',
    code: 'CAPSULE15',
    productCount: '32 selected pieces',
  },
  {
    file: '01-banner-offer-invite.svg',
    id: 'CDSK / 01 / Banner / Offer Invite',
    channel: 'Website/banner',
    variation: 'B',
    width: 1600,
    height: 900,
    mode: 'offer',
    headline: 'PRIVATE SALE',
    subline: 'A restrained launch banner for a premium offer.',
    eyebrow: 'CAPSULE DROP',
    cta: 'UNLOCK ACCESS',
    collection: 'Private Wardrobe Drop',
    window: '48 hours only',
    code: 'PRIVATE15',
    productCount: 'Limited sizes',
  },
];

function esc(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function defs(width, height) {
  return `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="${width}" y2="${height}">
      <stop offset="0" stop-color="${palette.black}" />
      <stop offset="0.55" stop-color="${palette.blackSoft}" />
      <stop offset="1" stop-color="${palette.charcoal}" />
    </linearGradient>
    <linearGradient id="ivoryCard" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${palette.ivory}" />
      <stop offset="1" stop-color="${palette.ivorySoft}" />
    </linearGradient>
    <linearGradient id="goldLine" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${palette.goldDark}" stop-opacity="0" />
      <stop offset="0.5" stop-color="${palette.gold}" />
      <stop offset="1" stop-color="${palette.goldDark}" stop-opacity="0" />
    </linearGradient>
    <linearGradient id="silk" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2a241e" />
      <stop offset="0.35" stop-color="#8d7864" />
      <stop offset="0.7" stop-color="#302820" />
      <stop offset="1" stop-color="#130f0d" />
    </linearGradient>
    <pattern id="marble" width="180" height="180" patternUnits="userSpaceOnUse">
      <rect width="180" height="180" fill="${palette.black}" />
      <path d="M-20 130 C 40 90, 80 190, 170 35" fill="none" stroke="#3e3931" stroke-width="2" opacity="0.45" />
      <path d="M10 20 C 70 80, 120 5, 190 80" fill="none" stroke="#cbb991" stroke-width="1" opacity="0.16" />
    </pattern>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#000000" flood-opacity="0.42" />
    </filter>
  </defs>`;
}

function background(width, height) {
  const lineCount = Math.max(8, Math.round(width / 120));
  const lines = Array.from({ length: lineCount }, (_, index) => {
    const x = Math.round((width / lineCount) * index + 24);
    return `<line x1="${x}" y1="0" x2="${x - 80}" y2="${height}" stroke="${palette.gold}" stroke-opacity="0.055" stroke-width="1" />`;
  }).join('\n');

  return `
  <rect width="${width}" height="${height}" fill="url(#bg)" />
  <rect width="${width}" height="${height}" fill="url(#marble)" opacity="0.18" />
  <g id="ambient-lines">${lines}</g>`;
}

function placeholderImage(x, y, w, h, label = 'PRODUCT IMAGE') {
  return `
  <g id="editable-product-image" data-field="product-image" filter="url(#softShadow)">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.min(28, w * 0.04)}" fill="url(#silk)" />
    <path d="M${x + w * 0.18} ${y + h * 0.82} C ${x + w * 0.34} ${y + h * 0.3}, ${x + w * 0.62} ${y + h * 1.04}, ${x + w * 0.88} ${y + h * 0.18}" fill="none" stroke="#f3dec1" stroke-opacity="0.2" stroke-width="${Math.max(2, w * 0.006)}" />
    <path d="M${x + w * 0.08} ${y + h * 0.16} L ${x + w * 0.92} ${y + h * 0.9}" stroke="#c8a45d" stroke-width="${Math.max(2, w * 0.004)}" opacity="0.42" />
    <circle cx="${x + w * 0.76}" cy="${y + h * 0.24}" r="${Math.min(w, h) * 0.08}" fill="#0d0c0a" opacity="0.55" />
    <text x="${x + w / 2}" y="${y + h / 2}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="${Math.max(18, Math.round(Math.min(w, h) * 0.05))}" fill="${palette.ivory}" opacity="0.78" letter-spacing="4">${label}</text>
  </g>`;
}

function editableText({ id, x, y, text, size, fill = palette.ivory, weight = 500, spacing = 0, anchor = 'start' }) {
  return `<text id="${id}" data-editable="text" x="${x}" y="${y}" text-anchor="${anchor}" font-family="Inter, Arial, sans-serif" font-size="${size}" font-weight="${weight}" letter-spacing="${spacing}" fill="${fill}">${esc(text)}</text>`;
}

function serifText({ id, x, y, text, size, fill = palette.ivory, weight = 500, anchor = 'start' }) {
  return `<text id="${id}" data-editable="text" x="${x}" y="${y}" text-anchor="${anchor}" font-family="Georgia, 'Times New Roman', serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${esc(text)}</text>`;
}

function ctaButton(x, y, w, h, label, dark = false) {
  return `
  <g id="editable-cta" data-field="cta">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${dark ? palette.black : palette.gold}" />
    <text x="${x + w / 2}" y="${y + h * 0.62}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="${Math.round(h * 0.28)}" font-weight="700" fill="${dark ? palette.gold : palette.black}" letter-spacing="2">${esc(label)}</text>
  </g>`;
}

function campaignStep(x, y, dark = true) {
  const fill = dark ? palette.gold : palette.goldDark;
  const line = dark ? palette.gold : palette.black;
  return `
  <g id="editable-campaign-step" data-field="campaign-step">
    <text x="${x}" y="${y}" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="700" fill="${fill}" letter-spacing="3">01 / PRIVATE ANNOUNCEMENT</text>
    <line x1="${x}" y1="${y + 18}" x2="${x + 158}" y2="${y + 18}" stroke="${line}" stroke-width="2" opacity="0.72" />
  </g>`;
}

function detailPill(x, y, text, dark = true, w = 170) {
  const bg = dark ? '#11100e' : '#f2eadc';
  const stroke = dark ? palette.gold : palette.goldDark;
  const fill = dark ? palette.ivorySoft : palette.black;
  return `
  <g class="editable-detail-pill" data-field="campaign-detail">
    <rect x="${x}" y="${y}" width="${w}" height="40" rx="20" fill="${bg}" stroke="${stroke}" stroke-width="1" opacity="${dark ? 0.94 : 1}" />
    <text x="${x + w / 2}" y="${y + 26}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="14" font-weight="700" fill="${fill}" letter-spacing="1.4">${esc(text)}</text>
  </g>`;
}

function metaStack(x, y, items, dark = true) {
  const labelFill = dark ? palette.gold : palette.goldDark;
  const valueFill = dark ? palette.ivory : palette.black;
  const rows = items
    .map((item, index) => {
      const rowY = y + index * 58;
      return `
      <g class="editable-meta-row" data-field="${esc(item.field)}">
        <text x="${x}" y="${rowY}" font-family="Inter, Arial, sans-serif" font-size="13" font-weight="700" fill="${labelFill}" letter-spacing="2.4">${esc(item.label)}</text>
        <text x="${x}" y="${rowY + 28}" font-family="Inter, Arial, sans-serif" font-size="21" font-weight="600" fill="${valueFill}">${esc(item.value)}</text>
      </g>`;
    })
    .join('\n');

  return `<g id="editable-campaign-meta" data-field-group="campaign-meta">${rows}</g>`;
}

function microProofLine(x, y, text, dark = true, w = 320) {
  const fill = dark ? palette.ivorySoft : '#50483f';
  const stroke = dark ? palette.gold : palette.goldDark;
  return `
  <g id="editable-proof-cue" data-field="proof-cue">
    <line x1="${x}" y1="${y}" x2="${x + w}" y2="${y}" stroke="${stroke}" stroke-width="1" opacity="0.38" />
    <text x="${x}" y="${y + 29}" font-family="Inter, Arial, sans-serif" font-size="15" font-weight="500" fill="${fill}" letter-spacing="0.6">${esc(text)}</text>
  </g>`;
}

function productShelf(x, y, count = 3, dark = true) {
  const cards = Array.from({ length: count }, (_, index) => {
    const cardX = x + index * 70;
    return `
    <g class="editable-mini-product" data-field="mini-product-${index + 1}">
      <rect x="${cardX}" y="${y}" width="50" height="68" rx="8" fill="${dark ? '#1d1914' : '#efe2cf'}" stroke="${dark ? palette.gold : palette.goldDark}" stroke-width="1" opacity="0.9" />
      <line x1="${cardX + 10}" y1="${y + 48}" x2="${cardX + 40}" y2="${y + 48}" stroke="${dark ? palette.ivorySoft : palette.black}" stroke-width="1" opacity="0.45" />
    </g>`;
  }).join('\n');

  return `<g id="editable-product-shelf" data-field-group="product-shelf">${cards}</g>`;
}

function productBadge(x, y, w, h) {
  return `
  <g id="editable-offer-badge" data-field="offer">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h * 0.12}" fill="${palette.black}" stroke="${palette.gold}" stroke-width="2" />
    <text x="${x + w / 2}" y="${y + h * 0.38}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="${Math.round(h * 0.15)}" fill="${palette.gold}" letter-spacing="3">LIMITED</text>
    <text x="${x + w / 2}" y="${y + h * 0.72}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="${Math.round(h * 0.3)}" fill="${palette.ivory}">48H</text>
  </g>`;
}

function editorialLayout(config) {
  const { width, height, headline, subline, eyebrow, cta, collection, window, code, productCount } = config;
  const margin = Math.round(Math.min(width, height) * 0.07);
  const isStory = height > width * 1.4;
  const isBanner = width > height * 1.4;

  if (isStory) {
    const imageX = margin;
    const imageY = Math.round(height * 0.17);
    const imageW = width - margin * 2;
    const imageH = Math.round(height * 0.54);
    const panelY = imageY + imageH - Math.round(height * 0.1);

    return `
    ${placeholderImage(imageX, imageY, imageW, imageH)}
    <g id="editable-copy" data-field-group="copy">
      ${editableText({ id: 'brand-name', x: margin, y: Math.round(height * 0.08), text: 'BRAND NAME', size: 26, fill: palette.gold, weight: 700, spacing: 5 })}
      <line x1="${margin}" y1="${Math.round(height * 0.105)}" x2="${margin + 120}" y2="${Math.round(height * 0.105)}" stroke="${palette.gold}" stroke-width="2" />
      <rect x="${margin}" y="${panelY}" width="${width - margin * 2}" height="${Math.round(height * 0.31)}" rx="34" fill="${palette.black}" opacity="0.92" stroke="${palette.gold}" stroke-opacity="0.38" />
      ${campaignStep(margin + 48, panelY + 54)}
      ${editableText({ id: 'eyebrow', x: margin + 48, y: panelY + 84, text: eyebrow, size: 24, fill: palette.gold, weight: 700, spacing: 4 })}
      ${serifText({ id: 'headline', x: margin + 48, y: panelY + 190, text: headline, size: 70, fill: palette.ivory })}
      ${editableText({ id: 'subline', x: margin + 52, y: panelY + 260, text: subline, size: 28, fill: palette.ivorySoft })}
      ${ctaButton(margin + 48, panelY + 330, 330, 74, cta)}
      ${detailPill(margin + 410, panelY + 348, window, true, 220)}
      ${metaStack(margin + 48, panelY + 454, [
        { label: 'COLLECTION', value: collection, field: 'collection-name' },
        { label: 'ACCESS CODE', value: code, field: 'access-code' },
      ])}
    </g>`;
  }

  if (isBanner) {
    const imageX = Math.round(width * 0.52);
    const imageY = Math.round(height * 0.13);
    const imageW = Math.round(width * 0.38);
    const imageH = Math.round(height * 0.66);

    return `
    ${placeholderImage(imageX, imageY, imageW, imageH)}
    ${productShelf(Math.round(width * 0.66), Math.round(height * 0.72), 3)}
    <g id="editable-copy" data-field-group="copy">
      ${editableText({ id: 'brand-name', x: margin, y: Math.round(height * 0.16), text: 'BRAND NAME', size: 24, fill: palette.gold, weight: 700, spacing: 5 })}
      <rect x="${margin}" y="${Math.round(height * 0.24)}" width="${Math.round(width * 0.38)}" height="${Math.round(height * 0.48)}" rx="26" fill="${palette.black}" opacity="0.82" stroke="${palette.gold}" stroke-opacity="0.25" />
      ${campaignStep(margin + 42, Math.round(height * 0.29))}
      ${editableText({ id: 'eyebrow', x: margin + 42, y: Math.round(height * 0.33), text: eyebrow, size: 20, fill: palette.gold, weight: 700, spacing: 4 })}
      ${serifText({ id: 'headline', x: margin + 42, y: Math.round(height * 0.48), text: headline, size: 64, fill: palette.ivory })}
      ${editableText({ id: 'subline', x: margin + 45, y: Math.round(height * 0.56), text: subline, size: 24, fill: palette.ivorySoft })}
      ${ctaButton(margin + 42, Math.round(height * 0.63), 300, 64, cta)}
      ${detailPill(margin + 370, Math.round(height * 0.638), window, true, 210)}
      ${microProofLine(margin + 42, Math.round(height * 0.71), `${productCount} / Code ${code}`, true, 420)}
    </g>`;
  }

  const imageX = margin;
  const imageY = Math.round(height * 0.2);
  const imageW = Math.round(width * 0.48);
  const imageH = Math.round(height * 0.58);
  const copyX = imageX + imageW + Math.round(width * 0.055);

  return `
  ${placeholderImage(imageX, imageY, imageW, imageH)}
  <g id="editable-copy" data-field-group="copy">
    ${editableText({ id: 'brand-name', x: margin, y: Math.round(height * 0.1), text: 'BRAND NAME', size: 22, fill: palette.gold, weight: 700, spacing: 5 })}
    <line x1="${margin}" y1="${Math.round(height * 0.13)}" x2="${margin + 110}" y2="${Math.round(height * 0.13)}" stroke="${palette.gold}" stroke-width="2" />
    ${campaignStep(copyX, imageY + 12)}
    ${editableText({ id: 'eyebrow', x: copyX, y: imageY + 46, text: eyebrow, size: 19, fill: palette.gold, weight: 700, spacing: 4 })}
    ${serifText({ id: 'headline', x: copyX, y: imageY + 162, text: headline, size: 54, fill: palette.ivory })}
    ${editableText({ id: 'subline', x: copyX, y: imageY + 230, text: subline, size: 23, fill: palette.ivorySoft })}
    ${ctaButton(copyX, imageY + 308, 300, 66, cta)}
    ${detailPill(copyX, imageY + 392, window, true, 190)}
    ${detailPill(copyX + 210, imageY + 392, code, true, 150)}
    ${microProofLine(copyX, imageY + 474, productCount, true, 330)}
  </g>`;
}

function offerLayout(config) {
  const { width, height, headline, subline, eyebrow, cta, collection, window, code, productCount } = config;
  const margin = Math.round(Math.min(width, height) * 0.07);
  const isStory = height > width * 1.4;
  const isBanner = width > height * 1.4;

  if (isStory) {
    const cardX = margin;
    const cardY = Math.round(height * 0.12);
    const cardW = width - margin * 2;
    const cardH = Math.round(height * 0.68);

    return `
    <rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="42" fill="url(#ivoryCard)" filter="url(#softShadow)" />
    <rect x="${cardX + 36}" y="${cardY + 36}" width="${cardW - 72}" height="${cardH - 72}" rx="30" fill="none" stroke="${palette.gold}" stroke-width="2" opacity="0.72" />
    ${placeholderImage(cardX + 72, cardY + Math.round(cardH * 0.47), cardW - 144, Math.round(cardH * 0.28), 'EDIT IMAGE')}
    <g id="editable-copy" data-field-group="copy">
      ${editableText({ id: 'brand-name', x: cardX + 70, y: cardY + 118, text: 'BRAND NAME', size: 24, fill: palette.goldDark, weight: 700, spacing: 5 })}
      ${campaignStep(cardX + 70, cardY + 158, false)}
      ${editableText({ id: 'eyebrow', x: cardX + 70, y: cardY + 202, text: eyebrow, size: 22, fill: palette.black, weight: 700, spacing: 4 })}
      ${serifText({ id: 'headline', x: cardX + 70, y: cardY + 336, text: headline, size: 78, fill: palette.black })}
      ${editableText({ id: 'subline', x: cardX + 74, y: cardY + 420, text: subline, size: 28, fill: '#50483f' })}
      ${metaStack(
        cardX + 74,
        cardY + 492,
        [
          { label: 'COLLECTION', value: collection, field: 'collection-name' },
          { label: 'SALE WINDOW', value: window, field: 'sale-window' },
        ],
        false,
      )}
      ${ctaButton(cardX + 70, cardY + cardH - 140, 360, 78, cta, true)}
      ${productBadge(cardX + cardW - 260, cardY + cardH - 160, 170, 105)}
      ${detailPill(cardX + 440, cardY + cardH - 128, code, false, 220)}
    </g>`;
  }

  if (isBanner) {
    const cardX = Math.round(width * 0.08);
    const cardY = Math.round(height * 0.12);
    const cardW = Math.round(width * 0.46);
    const cardH = Math.round(height * 0.68);
    const imageX = Math.round(width * 0.61);

    return `
    <rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="34" fill="url(#ivoryCard)" filter="url(#softShadow)" />
    ${placeholderImage(imageX, Math.round(height * 0.18), Math.round(width * 0.28), Math.round(height * 0.55), 'PRODUCT')}
    <g id="editable-copy" data-field-group="copy">
      ${editableText({ id: 'brand-name', x: cardX + 54, y: cardY + 78, text: 'BRAND NAME', size: 20, fill: palette.goldDark, weight: 700, spacing: 5 })}
      ${campaignStep(cardX + 54, cardY + 118, false)}
      ${editableText({ id: 'eyebrow', x: cardX + 54, y: cardY + 156, text: eyebrow, size: 20, fill: palette.black, weight: 700, spacing: 4 })}
      ${serifText({ id: 'headline', x: cardX + 54, y: cardY + 292, text: headline, size: 78, fill: palette.black })}
      ${editableText({ id: 'subline', x: cardX + 58, y: cardY + 366, text: subline, size: 24, fill: '#50483f' })}
      ${detailPill(cardX + 54, cardY + 414, window, false, 190)}
      ${detailPill(cardX + 260, cardY + 414, code, false, 160)}
      ${ctaButton(cardX + 54, cardY + 486, 300, 64, cta, true)}
      ${productBadge(cardX + cardW - 210, cardY + cardH - 140, 150, 92)}
    </g>`;
  }

  const card = margin;
  const cardW = width - margin * 2;
  const cardH = height - margin * 2;
  return `
  <rect x="${card}" y="${card}" width="${cardW}" height="${cardH}" rx="36" fill="url(#ivoryCard)" filter="url(#softShadow)" />
  <rect x="${card + 34}" y="${card + 34}" width="${cardW - 68}" height="${cardH - 68}" rx="24" fill="none" stroke="${palette.gold}" stroke-width="2" opacity="0.72" />
  ${placeholderImage(card + Math.round(cardW * 0.58), card + Math.round(cardH * 0.16), Math.round(cardW * 0.27), Math.round(cardH * 0.52), 'ITEM')}
  <g id="editable-copy" data-field-group="copy">
    ${editableText({ id: 'brand-name', x: card + 62, y: card + 96, text: 'BRAND NAME', size: 21, fill: palette.goldDark, weight: 700, spacing: 5 })}
    ${campaignStep(card + 62, card + 136, false)}
    ${editableText({ id: 'eyebrow', x: card + 62, y: card + 182, text: eyebrow, size: 20, fill: palette.black, weight: 700, spacing: 4 })}
    ${serifText({ id: 'headline', x: card + 62, y: card + 324, text: headline, size: 72, fill: palette.black })}
    ${editableText({ id: 'subline', x: card + 66, y: card + 402, text: subline, size: 24, fill: '#50483f' })}
    ${detailPill(card + 62, card + 456, window, false, 180)}
    ${detailPill(card + 260, card + 456, code, false, 150)}
    ${ctaButton(card + 62, card + 540, 320, 68, cta, true)}
    ${microProofLine(card + 62, card + 650, productCount, false, 330)}
    ${productBadge(card + 64, card + cardH - 170, 180, 110)}
  </g>`;
}

function render(config) {
  const { width, height, id, channel, variation, mode } = config;
  const body = mode === 'editorial' ? editorialLayout(config) : offerLayout(config);
  const safeMargin = Math.round(Math.min(width, height) * 0.045);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">${esc(id)}</title>
  <desc id="desc">Editable Stage 01 private announcement template for Capsule Drop Sale Kit. Channel: ${esc(channel)}. Variation: ${esc(variation)}.</desc>
  ${defs(width, height)}
  ${background(width, height)}
  <rect id="safe-area-guide" x="${safeMargin}" y="${safeMargin}" width="${width - safeMargin * 2}" height="${height - safeMargin * 2}" fill="none" stroke="${palette.gold}" stroke-width="1" stroke-dasharray="8 10" opacity="0.18" />
  <g id="template-master" data-product="capsule-drop-sale-kit" data-stage="01-private-announcement" data-channel="${esc(channel)}" data-variation="${esc(variation)}">
    ${body}
  </g>
</svg>
`;
}

function writePreviewHtml() {
  const cards = templates
    .map(
      (template) => `
      <article>
        <img src="./${template.file}" alt="${template.id}" />
        <h2>${template.id}</h2>
        <p>${template.channel} - Variation ${template.variation}</p>
      </article>`,
    )
    .join('\n');

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Capsule Drop Sale Kit - Stage 01 Preview</title>
    <style>
      :root {
        color-scheme: dark;
        background: #070706;
        color: #f2eadc;
        font-family: Inter, Arial, sans-serif;
      }

      body {
        margin: 0;
        padding: 40px;
        background:
          radial-gradient(circle at 20% 0%, rgba(200, 164, 93, 0.16), transparent 30%),
          #070706;
      }

      header {
        max-width: 1180px;
        margin: 0 auto 28px;
      }

      h1 {
        margin: 0 0 10px;
        font: 500 32px/1.1 Georgia, "Times New Roman", serif;
      }

      p {
        color: #cbb991;
      }

      main {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        gap: 22px;
        max-width: 1180px;
        margin: 0 auto;
      }

      article {
        border: 1px solid rgba(200, 164, 93, 0.24);
        background: rgba(255, 255, 255, 0.035);
        padding: 16px;
      }

      img {
        width: 100%;
        height: 420px;
        object-fit: contain;
        background: #050504;
        display: block;
      }

      h2 {
        font-size: 14px;
        margin: 14px 0 4px;
        color: #f2eadc;
      }
    </style>
  </head>
  <body>
    <header>
      <h1>Capsule Drop Sale Kit - Stage 01 Private Announcement</h1>
      <p>Six editable SVG masters: 3 channel families x 2 variations.</p>
    </header>
    <main>${cards}
    </main>
  </body>
</html>
`;

  writeFileSync(join(outDir, 'preview.html'), html, 'utf8');
}

function writeManifest() {
  const manifest = {
    product: 'Capsule Drop Sale Kit',
    stage: '01 Private announcement',
    status: 'draft-master',
    generatedAt: '2026-07-08',
    purpose: 'First six editable source templates for the premium 30-template package with commercial campaign details.',
    detailPass: 'Adds sale window, access code, collection name, product count, campaign step, and proof cues.',
    editableFields: [
      'brand-name',
      'campaign-step',
      'eyebrow',
      'headline',
      'subline',
      'cta',
      'offer',
      'product-image',
      'collection-name',
      'sale-window',
      'access-code',
      'product-count',
      'proof-cue',
    ],
    tokens: palette,
    templates: templates.map((template) => ({
      id: template.id,
      file: template.file,
      channel: template.channel,
      variation: template.variation,
      size: `${template.width}x${template.height}`,
      mode: template.mode,
    })),
  };

  writeFileSync(join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

function writeReadme() {
  const rows = templates.map((template) => `| ${template.id} | ${template.width}x${template.height} | ${template.file} |`).join('\n');

  const readme = `# Capsule Drop Sale Kit - Stage 01 Private Announcement

These are the first six editable source masters for the approved Premium 30-template package.

They are SVG masters, not final flattened previews. The goal is to keep text, offer fields, and image placeholders editable before rebuilding or importing the direction into Figma and Canva.

## Files

| Template | Size | File |
| --- | --- | --- |
${rows}

## Design Logic

- Variation A is image-led and editorial.
- Variation B is type-led and offer-led.
- Every template belongs to the same customer moment: private announcement.
- Copy is editable source text, not baked into a raster preview.
- Product placeholders should be replaced with licensed product photography before final export.
- The detail pass adds commercial fields so the template feels like a real campaign asset, not a decorative layout.

## Editable Fields

- Brand name.
- Campaign step.
- Eyebrow.
- Headline.
- Subline.
- CTA.
- Offer badge.
- Product image.
- Collection name.
- Sale window.
- Access code.
- Product count.
- Proof cue.

## Next Production Move

Review the detail pass in Figma, then regenerate or rebuild the customer-facing Canva versions from the approved Figma master.
`;

  writeFileSync(join(outDir, 'README.md'), readme, 'utf8');
}

for (const template of templates) {
  writeFileSync(join(outDir, template.file), render(template), 'utf8');
}

writeManifest();
writeReadme();
writePreviewHtml();

console.log(`Generated ${templates.length} Stage 01 templates in ${outDir}`);
