import { describe, it, expect } from 'vitest';
import { CampaignBriefSchema, ProductSchema } from './campaign-brief.js';

describe('ProductSchema', () => {
  it('validates a minimal product', () => {
    const result = ProductSchema.safeParse({
      name: 'Test Product',
      slug: 'test-product',
      description: 'A test product',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid slug', () => {
    const result = ProductSchema.safeParse({
      name: 'Test',
      slug: 'INVALID SLUG!',
      description: 'desc',
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional logoPath', () => {
    const result = ProductSchema.safeParse({
      name: 'Test',
      slug: 'test',
      description: 'desc',
      logoPath: 'products/test/logo.png',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.logoPath).toBe('products/test/logo.png');
    }
  });

  it('accepts optional brandColors with valid hex', () => {
    const result = ProductSchema.safeParse({
      name: 'Test',
      slug: 'test',
      description: 'desc',
      brandColors: ['#FF0000', '#00ff00'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid brand color format', () => {
    const result = ProductSchema.safeParse({
      name: 'Test',
      slug: 'test',
      description: 'desc',
      brandColors: ['red'],
    });
    expect(result.success).toBe(false);
  });
});

describe('CampaignBriefSchema', () => {
  const minimalBrief = {
    campaignName: 'Test Campaign',
    campaignMessage: 'Buy now',
    products: [{ name: 'Prod', slug: 'prod', description: 'A product' }],
  };

  it('validates a minimal brief', () => {
    const result = CampaignBriefSchema.safeParse(minimalBrief);
    expect(result.success).toBe(true);
  });

  it('defaults locale to en', () => {
    const result = CampaignBriefSchema.safeParse(minimalBrief);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.locale).toBe('en');
    }
  });

  it('rejects empty products array', () => {
    const result = CampaignBriefSchema.safeParse({
      ...minimalBrief,
      products: [],
    });
    expect(result.success).toBe(false);
  });

  it('accepts text overlay with all fields', () => {
    const result = CampaignBriefSchema.safeParse({
      ...minimalBrief,
      textOverlay: {
        headline: 'Big Sale',
        subheadline: 'Limited time',
        ctaText: 'Shop Now',
        fontColor: '#FFFFFF',
        position: 'bottom',
      },
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid target platforms', () => {
    const result = CampaignBriefSchema.safeParse({
      ...minimalBrief,
      targetPlatforms: ['instagram', 'tiktok'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid target platform', () => {
    const result = CampaignBriefSchema.safeParse({
      ...minimalBrief,
      targetPlatforms: ['myspace'],
    });
    expect(result.success).toBe(false);
  });
});
