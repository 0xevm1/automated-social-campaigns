export type CampaignStatus = 'processing' | 'completed' | 'failed';

export interface ProductState {
  slug: string;
  generationStatus: 'pending' | 'completed' | 'failed';
  ratios: Record<string, RatioState>;
}

export interface RatioState {
  status: 'pending' | 'completed' | 'failed';
  s3Key?: string;
}

export interface CampaignState {
  correlationId: string;
  campaignName: string;
  status: CampaignStatus;
  products: Record<string, ProductState>;
  complianceWarnings: string[];
  s3Keys: string[];
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  manifestS3Key?: string;
}
