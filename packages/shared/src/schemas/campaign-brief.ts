import { z } from 'zod';

export const ProductSchema = z.object({
  name: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  description: z.string(),
  heroImagePrompt: z.string().optional(),
  logoPath: z.string().optional(),
  brandColors: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)).optional(),
});

export const CampaignBriefSchema = z.object({
  campaignName: z.string().min(1),
  campaignMessage: z.string().min(1),
  products: z.array(ProductSchema).min(1),
  targetPlatforms: z.array(z.enum(['instagram', 'tiktok', 'facebook', 'youtube'])).optional(),
  textOverlay: z.object({
    headline: z.string(),
    subheadline: z.string().optional(),
    ctaText: z.string().optional(),
    fontColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    fontSize: z.number().optional(),
    position: z.enum(['top', 'center', 'bottom']).optional(),
  }).optional(),
  locale: z.string().default('en'),
});

export type Product = z.infer<typeof ProductSchema>;
export type CampaignBrief = z.infer<typeof CampaignBriefSchema>;
