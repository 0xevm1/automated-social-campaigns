import { describe, it, expect } from 'vitest';
import { buildTextOverlaySvg } from './image-utils.js';

describe('buildTextOverlaySvg', () => {
  it('returns valid SVG buffer with bar position', () => {
    const result = buildTextOverlaySvg(1080, 1080, {
      headline: 'Test Headline',
    });
    expect(result.svg).toBeInstanceOf(Buffer);
    expect(typeof result.barY).toBe('number');
    expect(typeof result.barHeight).toBe('number');
    expect(result.barHeight).toBeGreaterThan(0);
  });

  it('positions bar at bottom by default', () => {
    const result = buildTextOverlaySvg(1080, 1080, {
      headline: 'Test',
    });
    expect(result.barY).toBe(1080 - result.barHeight);
  });

  it('positions bar at top when specified', () => {
    const result = buildTextOverlaySvg(1080, 1080, {
      headline: 'Test',
      position: 'top',
    });
    expect(result.barY).toBe(0);
  });

  it('positions bar at center when specified', () => {
    const result = buildTextOverlaySvg(1080, 1080, {
      headline: 'Test',
      position: 'center',
    });
    expect(result.barY).toBe(Math.round((1080 - result.barHeight) / 2));
  });

  it('increases bar height with subheadline and CTA', () => {
    const headlineOnly = buildTextOverlaySvg(1080, 1080, {
      headline: 'Test',
    });
    const withAll = buildTextOverlaySvg(1080, 1080, {
      headline: 'Test',
      subheadline: 'Sub',
      ctaText: 'Click',
    });
    expect(withAll.barHeight).toBeGreaterThan(headlineOnly.barHeight);
  });

  it('includes headline text in SVG', () => {
    const result = buildTextOverlaySvg(1080, 1080, {
      headline: 'Big Sale',
    });
    const svg = result.svg.toString();
    expect(svg).toContain('BIG SALE');
  });

  it('escapes XML special characters in text', () => {
    const result = buildTextOverlaySvg(1080, 1080, {
      headline: 'Tom & Jerry <3',
    });
    const svg = result.svg.toString();
    expect(svg).toContain('TOM &amp; JERRY &lt;3');
    expect(svg).not.toContain('Tom & Jerry <3');
  });

  it('overrides dark font color to white for bar contrast', () => {
    const result = buildTextOverlaySvg(1080, 1080, {
      headline: 'Test',
      fontColor: '#37474F', // dark blue-gray — low contrast on dark bar
    });
    const svg = result.svg.toString();
    // Should fall back to white since #37474F fails WCAG 4.5:1 on #1a1a1a
    expect(svg).toContain('fill="#FFFFFF"');
    expect(svg).not.toContain('fill="#37474F"');
  });

  it('keeps light font color when contrast is sufficient', () => {
    const result = buildTextOverlaySvg(1080, 1080, {
      headline: 'Test',
      fontColor: '#FFD700', // gold — high contrast on dark bar
    });
    const svg = result.svg.toString();
    expect(svg).toContain('fill="#FFD700"');
  });

  it('generates valid SVG structure', () => {
    const result = buildTextOverlaySvg(1920, 1080, {
      headline: 'Test',
      subheadline: 'Sub',
      ctaText: 'Click',
    });
    const svg = result.svg.toString();
    expect(svg).toMatch(/^<svg width="1920" height="1080"/);
    expect(svg).toContain('</svg>');
    expect(svg).toContain('<rect'); // bar
    expect(svg).toContain('<text');  // text elements
  });
});
