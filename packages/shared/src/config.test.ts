import { describe, it, expect } from 'vitest';
import { S3_KEYS, ASPECT_RATIOS } from './config.js';

describe('S3_KEYS', () => {
  it('generates correct hero image key', () => {
    expect(S3_KEYS.heroImage('my-product')).toBe('products/my-product/hero.png');
  });

  it('generates correct logo key', () => {
    expect(S3_KEYS.logo('my-product')).toBe('products/my-product/logo.png');
  });

  it('generates correct composite key', () => {
    expect(S3_KEYS.composite('abc-123', 'my-product', '1x1'))
      .toBe('campaigns/abc-123/output/my-product/1x1/my-product_1x1.png');
  });

  it('generates correct brief key', () => {
    expect(S3_KEYS.brief('abc-123')).toBe('campaigns/abc-123/brief.json');
  });

  it('generates correct manifest key', () => {
    expect(S3_KEYS.manifest('abc-123')).toBe('campaigns/abc-123/manifest.json');
  });
});

describe('ASPECT_RATIOS', () => {
  it('has correct 1x1 dimensions', () => {
    expect(ASPECT_RATIOS['1x1']).toEqual({ width: 1080, height: 1080, label: 'Instagram feed' });
  });

  it('has correct 9x16 dimensions', () => {
    expect(ASPECT_RATIOS['9x16']).toEqual({ width: 1080, height: 1920, label: 'Instagram/TikTok Stories' });
  });

  it('has correct 16x9 dimensions', () => {
    expect(ASPECT_RATIOS['16x9']).toEqual({ width: 1920, height: 1080, label: 'Facebook/YouTube landscape' });
  });
});
