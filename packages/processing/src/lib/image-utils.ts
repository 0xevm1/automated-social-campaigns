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
  const fontSize = options.fontSize ?? Math.round(width * 0.05);
  const subFontSize = Math.round(fontSize * 0.65);
  const ctaFontSize = Math.round(fontSize * 0.55);

  let yPosition: number;
  switch (options.position ?? 'bottom') {
    case 'top':
      yPosition = Math.round(height * 0.15);
      break;
    case 'center':
      yPosition = Math.round(height * 0.45);
      break;
    case 'bottom':
      yPosition = Math.round(height * 0.75);
      break;
  }

  const lines: string[] = [];

  const barHeight = fontSize * 3.5;
  const barY = yPosition - fontSize * 1.2;
  lines.push(
    `<rect x="0" y="${barY}" width="${width}" height="${barHeight}" fill="rgba(0,0,0,0.5)" rx="0" />`
  );

  lines.push(
    `<text x="${width / 2}" y="${yPosition}" text-anchor="middle" ` +
    `font-family="Liberation Sans, DejaVu Sans, Arial, Helvetica, sans-serif" font-size="${fontSize}" ` +
    `font-weight="bold" fill="${fontColor}">${escapeXml(options.headline)}</text>`
  );

  if (options.subheadline) {
    lines.push(
      `<text x="${width / 2}" y="${yPosition + fontSize * 1.2}" text-anchor="middle" ` +
      `font-family="Liberation Sans, DejaVu Sans, Arial, Helvetica, sans-serif" font-size="${subFontSize}" ` +
      `fill="${fontColor}">${escapeXml(options.subheadline)}</text>`
    );
  }

  if (options.ctaText) {
    const ctaY = yPosition + fontSize * (options.subheadline ? 2.2 : 1.4);
    const ctaWidth = options.ctaText.length * ctaFontSize * 0.7 + 40;
    const ctaHeight = ctaFontSize * 1.8;
    lines.push(
      `<rect x="${(width - ctaWidth) / 2}" y="${ctaY - ctaFontSize * 0.9}" ` +
      `width="${ctaWidth}" height="${ctaHeight}" fill="${fontColor}" rx="8" />`
    );
    lines.push(
      `<text x="${width / 2}" y="${ctaY + ctaFontSize * 0.2}" text-anchor="middle" ` +
      `font-family="Liberation Sans, DejaVu Sans, Arial, Helvetica, sans-serif" font-size="${ctaFontSize}" ` +
      `font-weight="bold" fill="#000000">${escapeXml(options.ctaText)}</text>`
    );
  }

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
${lines.join('\n')}
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
