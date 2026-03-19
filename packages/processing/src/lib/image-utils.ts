import sharp from 'sharp';

export interface TextOverlayOptions {
  headline: string;
  subheadline?: string;
  ctaText?: string;
  fontColor?: string;
  fontSize?: number;
  position?: 'top' | 'center' | 'bottom';
}

/** Accepts a Buffer (from S3) instead of a file path */
export async function resizeToRatio(
  input: Buffer,
  width: number,
  height: number,
): Promise<Buffer> {
  return sharp(input)
    .resize(width, height, {
      fit: 'cover',
      position: 'attention',
    })
    .png()
    .toBuffer();
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildTextOverlaySvg(
  width: number,
  height: number,
  options: TextOverlayOptions,
): Buffer {
  const fontColor = options.fontColor ?? '#FFFFFF';
  const fontSize = options.fontSize ?? Math.round(width * 0.045);
  const subFontSize = Math.round(fontSize * 0.6);
  const ctaFontSize = Math.round(fontSize * 0.5);
  const fontStack = 'Noto Sans, Liberation Sans, DejaVu Sans, FreeSans, sans-serif';
  const pad = Math.round(width * 0.05);

  // Calculate bar height based on content
  let contentLines = 1; // headline
  if (options.subheadline) contentLines++;
  if (options.ctaText) contentLines++;
  const lineSpacing = fontSize * 1.35;
  const barPadY = Math.round(fontSize * 0.9);
  const barHeight = barPadY * 2 + lineSpacing * contentLines + (options.ctaText ? Math.round(ctaFontSize * 0.4) : 0);

  // Position the bar
  let barY: number;
  switch (options.position ?? 'bottom') {
    case 'top':
      barY = 0;
      break;
    case 'center':
      barY = Math.round((height - barHeight) / 2);
      break;
    case 'bottom':
      barY = height - barHeight;
      break;
  }

  const elements: string[] = [];

  // Solid dark bar anchored to edge
  elements.push(
    `<rect x="0" y="${barY}" width="${width}" height="${barHeight}" fill="#1a1a1a" opacity="0.88" />`,
  );

  // Thin accent line at the top of the bar
  elements.push(
    `<rect x="${pad}" y="${barY}" width="${width - pad * 2}" height="2" fill="${fontColor}" opacity="0.3" />`,
  );

  // Headline — left-aligned, uppercase, tracked out
  const textY = barY + barPadY + fontSize;
  elements.push(
    `<text x="${pad}" y="${textY}" ` +
    `font-family="${fontStack}" font-size="${fontSize}" ` +
    `font-weight="700" letter-spacing="${Math.round(fontSize * 0.08)}" ` +
    `fill="${fontColor}">${escapeXml(options.headline.toUpperCase())}</text>`,
  );

  // Subheadline — left-aligned, regular weight
  let nextY = textY + lineSpacing;
  if (options.subheadline) {
    elements.push(
      `<text x="${pad}" y="${nextY}" ` +
      `font-family="${fontStack}" font-size="${subFontSize}" ` +
      `font-weight="400" fill="${fontColor}" opacity="0.8">${escapeXml(options.subheadline)}</text>`,
    );
    nextY += lineSpacing;
  }

  // CTA — pill button, left-aligned
  if (options.ctaText) {
    const ctaPadX = Math.round(ctaFontSize * 1.2);
    const ctaPadY = Math.round(ctaFontSize * 0.8);
    const ctaW = options.ctaText.length * ctaFontSize * 0.68 + ctaPadX * 2;
    const ctaH = ctaFontSize + ctaPadY * 2;
    const ctaRectY = nextY - Math.round(ctaFontSize * 0.3);
    // Position text baseline at rect center + ~0.35em (ascender offset for visual centering)
    const ctaTextY = ctaRectY + Math.round(ctaH / 2) + Math.round(ctaFontSize * 0.35);

    elements.push(
      `<rect x="${pad}" y="${ctaRectY}" width="${ctaW}" height="${ctaH}" ` +
      `fill="${fontColor}" rx="${Math.round(ctaH / 2)}" />`,
    );
    elements.push(
      `<text x="${pad + ctaPadX}" y="${ctaTextY}" ` +
      `font-family="${fontStack}" font-size="${ctaFontSize}" ` +
      `font-weight="600" letter-spacing="${Math.round(ctaFontSize * 0.05)}" ` +
      `fill="#1a1a1a">${escapeXml(options.ctaText.toUpperCase())}</text>`,
    );
  }

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
${elements.join('\n')}
</svg>`;

  return Buffer.from(svg);
}

export async function compositeOverlay(
  baseBuffer: Buffer,
  overlaySvg: Buffer,
): Promise<Buffer> {
  return sharp(baseBuffer)
    .composite([{ input: overlaySvg, top: 0, left: 0 }])
    .png()
    .toBuffer();
}
