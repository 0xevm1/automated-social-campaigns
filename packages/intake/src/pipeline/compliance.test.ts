import { describe, it, expect } from 'vitest';
import { scanProhibitedWords, checkBrandColors } from './compliance.js';
import type { CampaignBrief } from '@asc/shared';

function makeBrief(overrides: Partial<CampaignBrief> = {}): CampaignBrief {
  return {
    campaignName: 'Test',
    campaignMessage: 'Test message',
    products: [{ name: 'Prod', slug: 'prod', description: 'A product' }],
    locale: 'en',
    ...overrides,
  };
}

describe('scanProhibitedWords', () => {
  it('passes when no prohibited words are found', () => {
    const checks = scanProhibitedWords(makeBrief(), 'test-id');
    const allPass = checks.every((c) => c.status === 'pass');
    expect(allPass).toBe(true);
  });

  it('warns on prohibited word in campaign message', () => {
    const checks = scanProhibitedWords(
      makeBrief({ campaignMessage: 'This is a guaranteed result' }),
      'test-id',
    );
    const campaignCheck = checks.find((c) => c.scope === 'campaign');
    expect(campaignCheck?.status).toBe('warn');
    expect(campaignCheck?.details).toContain('guaranteed');
  });

  it('warns on prohibited word in text overlay', () => {
    const checks = scanProhibitedWords(
      makeBrief({
        textOverlay: { headline: 'Miracle cure for all' },
      }),
      'test-id',
    );
    const campaignCheck = checks.find((c) => c.scope === 'campaign');
    expect(campaignCheck?.status).toBe('warn');
    expect(campaignCheck?.details).toContain('miracle');
  });

  it('warns on prohibited word in product description', () => {
    const checks = scanProhibitedWords(
      makeBrief({
        products: [{ name: 'Prod', slug: 'prod', description: 'Risk-free investment' }],
      }),
      'test-id',
    );
    const productCheck = checks.find((c) => c.scope === 'product:prod');
    expect(productCheck?.status).toBe('warn');
    expect(productCheck?.details).toContain('risk-free');
  });

  it('is case insensitive', () => {
    const checks = scanProhibitedWords(
      makeBrief({ campaignMessage: 'GUARANTEED results' }),
      'test-id',
    );
    const campaignCheck = checks.find((c) => c.scope === 'campaign');
    expect(campaignCheck?.status).toBe('warn');
  });
});

describe('checkBrandColors', () => {
  it('passes when colors are provided', () => {
    const check = checkBrandColors(['#FF0000', '#00FF00'], 'test-slug', 'test-id');
    expect(check.status).toBe('pass');
  });

  it('warns when no colors are provided', () => {
    const check = checkBrandColors(undefined, 'test-slug', 'test-id');
    expect(check.status).toBe('warn');
  });

  it('warns when colors array is empty', () => {
    const check = checkBrandColors([], 'test-slug', 'test-id');
    expect(check.status).toBe('warn');
  });
});
