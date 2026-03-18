import type { CampaignBrief } from '@asc/shared';
import { createLogger, headObject } from '@asc/shared';

const PROHIBITED_WORDS = [
  'guaranteed',
  'miracle',
  'cure',
  'risk-free',
  'risk free',
  'no side effects',
  'act now',
  'limited time only',
  'free money',
  'winner',
  'congratulations',
  'best ever',
  'no obligation',
  'once in a lifetime',
  '100% safe',
  'scientifically proven',
  'clinically proven',
  'instant results',
  'no strings attached',
  'exclusive deal',
  'lowest price',
  'no catch',
  'as seen on',
  'double your',
  'bonus',
];

export interface ComplianceCheck {
  category: 'prohibited-words' | 'brand-colors' | 'logo-presence';
  scope: string;
  status: 'pass' | 'warn';
  details?: string;
}

export interface ComplianceReport {
  timestamp: string;
  correlationId: string;
  campaignName: string;
  checks: ComplianceCheck[];
  warnings: string[];
  summary: { totalChecks: number; passed: number; warned: number };
}

export function scanProhibitedWords(brief: CampaignBrief, correlationId: string): ComplianceCheck[] {
  const log = createLogger(correlationId);
  const checks: ComplianceCheck[] = [];

  // Campaign-level text fields
  const campaignTexts = [
    brief.campaignMessage,
    brief.textOverlay?.headline,
    brief.textOverlay?.subheadline,
    brief.textOverlay?.ctaText,
  ].filter(Boolean) as string[];

  const campaignHits: string[] = [];
  for (const text of campaignTexts) {
    const lower = text.toLowerCase();
    for (const word of PROHIBITED_WORDS) {
      if (lower.includes(word)) {
        const detail = `Prohibited word/phrase "${word}" found in text: "${text}"`;
        campaignHits.push(detail);
        log.warn({ word, text }, detail);
      }
    }
  }

  checks.push({
    category: 'prohibited-words',
    scope: 'campaign',
    status: campaignHits.length > 0 ? 'warn' : 'pass',
    ...(campaignHits.length > 0 ? { details: campaignHits.join('; ') } : {}),
  });

  // Product-level text fields
  for (const product of brief.products) {
    const productTexts = [
      product.name,
      product.description,
      product.heroImagePrompt,
    ].filter(Boolean) as string[];

    const productHits: string[] = [];
    for (const text of productTexts) {
      const lower = text.toLowerCase();
      for (const word of PROHIBITED_WORDS) {
        if (lower.includes(word)) {
          const detail = `Prohibited word/phrase "${word}" found in product "${product.slug}": "${text}"`;
          productHits.push(detail);
          log.warn({ word, text, product: product.slug }, detail);
        }
      }
    }

    checks.push({
      category: 'prohibited-words',
      scope: `product:${product.slug}`,
      status: productHits.length > 0 ? 'warn' : 'pass',
      ...(productHits.length > 0 ? { details: productHits.join('; ') } : {}),
    });
  }

  return checks;
}

export function checkBrandColors(
  colors: string[] | undefined,
  productSlug: string,
  correlationId: string,
): ComplianceCheck {
  const log = createLogger(correlationId);

  if (!colors || colors.length === 0) {
    const detail = `No brand colors specified for product "${productSlug}" — using default overlay colors`;
    log.info({ product: productSlug }, detail);
    return { category: 'brand-colors', scope: `product:${productSlug}`, status: 'warn', details: detail };
  }

  return { category: 'brand-colors', scope: `product:${productSlug}`, status: 'pass' };
}

export async function checkLogoPresence(
  logoPath: string | undefined,
  productSlug: string,
  correlationId: string,
): Promise<ComplianceCheck> {
  const log = createLogger(correlationId);

  if (!logoPath) {
    const detail = `No logo provided for product "${productSlug}" — composites will not include a logo`;
    log.info({ product: productSlug }, detail);
    return { category: 'logo-presence', scope: `product:${productSlug}`, status: 'warn', details: detail };
  }

  try {
    const exists = await headObject(logoPath);
    if (!exists) {
      const detail = `Logo file not found in S3: ${logoPath}`;
      log.warn({ product: productSlug, logoPath }, detail);
      return { category: 'logo-presence', scope: `product:${productSlug}`, status: 'warn', details: detail };
    }
  } catch (err) {
    const detail = `Could not verify logo in S3: ${logoPath}`;
    log.warn({ product: productSlug, logoPath, error: err }, detail);
    return { category: 'logo-presence', scope: `product:${productSlug}`, status: 'warn', details: detail };
  }

  return { category: 'logo-presence', scope: `product:${productSlug}`, status: 'pass' };
}

export async function runFullComplianceCheck(
  brief: CampaignBrief,
  correlationId: string,
): Promise<ComplianceReport> {
  const log = createLogger(correlationId);
  const checks: ComplianceCheck[] = [];

  // Prohibited words (campaign + product level)
  checks.push(...scanProhibitedWords(brief, correlationId));

  // Per-product brand & logo checks
  for (const product of brief.products) {
    checks.push(checkBrandColors(product.brandColors, product.slug, correlationId));
    checks.push(await checkLogoPresence(product.logoPath, product.slug, correlationId));
  }

  const warnings = checks
    .filter((c) => c.status === 'warn' && c.details)
    .map((c) => c.details!);

  const passed = checks.filter((c) => c.status === 'pass').length;
  const warned = checks.filter((c) => c.status === 'warn').length;

  log.info(
    { totalChecks: checks.length, passed, warned },
    'Compliance check completed',
  );

  return {
    timestamp: new Date().toISOString(),
    correlationId,
    campaignName: brief.campaignName,
    checks,
    warnings,
    summary: { totalChecks: checks.length, passed, warned },
  };
}
