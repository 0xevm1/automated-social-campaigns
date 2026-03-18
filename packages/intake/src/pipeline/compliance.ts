import type { CampaignBrief } from '@asc/shared';
import { createLogger } from '@asc/shared';

const PROHIBITED_WORDS = [
  'guaranteed',
  'miracle',
  'cure',
  'risk-free',
  'no side effects',
  'act now',
  'limited time only',
  'free money',
  'winner',
  'congratulations',
];

export function scanProhibitedWords(brief: CampaignBrief, correlationId: string): string[] {
  const log = createLogger(correlationId);
  const warnings: string[] = [];
  const textFields = [
    brief.campaignMessage,
    brief.textOverlay?.headline,
    brief.textOverlay?.subheadline,
    brief.textOverlay?.ctaText,
  ].filter(Boolean) as string[];

  for (const text of textFields) {
    const lower = text.toLowerCase();
    for (const word of PROHIBITED_WORDS) {
      if (lower.includes(word)) {
        const warning = `Prohibited word/phrase "${word}" found in text: "${text}"`;
        warnings.push(warning);
        log.warn({ word, text }, warning);
      }
    }
  }

  return warnings;
}

export function checkBrandColors(colors: string[] | undefined, correlationId: string): string[] {
  const log = createLogger(correlationId);
  const warnings: string[] = [];

  if (!colors || colors.length === 0) {
    const warning = 'No brand colors specified — using default overlay colors';
    warnings.push(warning);
    log.info(warning);
  }

  return warnings;
}

export function checkLogoPresence(logoPath: string | undefined, correlationId: string): string[] {
  const log = createLogger(correlationId);
  const warnings: string[] = [];

  if (!logoPath) {
    const warning = 'No logo provided for product — composites will not include a logo';
    warnings.push(warning);
    log.info(warning);
  }

  return warnings;
}
