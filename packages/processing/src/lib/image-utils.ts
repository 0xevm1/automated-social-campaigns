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

/** Returns relative luminance (0–1) for a hex color */
function luminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/** Ensure font color has enough contrast against the dark overlay bar (#1a1a1a).
 *  Falls back to white if the chosen color is too dark. */
function ensureBarContrast(fontColor: string): string {
  const barLum = luminance('#1a1a1a'); // ~0.01
  const textLum = luminance(fontColor);
  // WCAG contrast ratio: (lighter + 0.05) / (darker + 0.05) — need at least 4.5
  const ratio = (Math.max(textLum, barLum) + 0.05) / (Math.min(textLum, barLum) + 0.05);
  return ratio >= 4.5 ? fontColor : '#FFFFFF';
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export interface TextOverlayResult {
  svg: Buffer;
  barY: number;
  barHeight: number;
}

export function buildTextOverlaySvg(
  width: number,
  height: number,
  options: TextOverlayOptions,
): TextOverlayResult {
  const fontColor = ensureBarContrast(options.fontColor ?? '#FFFFFF');
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

  return { svg: Buffer.from(svg), barY, barHeight };
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

export async function compositeLogoOnBar(
  baseBuffer: Buffer,
  logoBuffer: Buffer,
  barY: number,
  barHeight: number,
  imageWidth: number,
  pad: number,
): Promise<Buffer> {
  const logoPad = Math.round(pad * 0.4);
  const maxLogoHeight = Math.round(barHeight - logoPad * 2);
  const resizedLogo = await sharp(logoBuffer)
    .resize({
      height: maxLogoHeight,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .png()
    .toBuffer();

  const logoMeta = await sharp(resizedLogo).metadata();
  const logoWidth = logoMeta.width ?? 0;
  const logoHeight = logoMeta.height ?? 0;

  const left = imageWidth - logoWidth - pad;
  const top = barY + Math.round((barHeight - logoHeight) / 2);

  return sharp(baseBuffer)
    .composite([{ input: resizedLogo, top, left }])
    .png()
    .toBuffer();
}
