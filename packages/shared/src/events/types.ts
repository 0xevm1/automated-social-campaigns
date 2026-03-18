import type { CampaignBrief, Product } from '../schemas/campaign-brief.js';
import type { AspectRatioKey } from '../config.js';

export enum PipelineEvent {
  BRIEF_RECEIVED = 'brief:received',
  BRIEF_VALIDATED = 'brief:validated',
  ASSET_RESOLUTION = 'asset:resolution',
  ASSET_RESOLVED = 'asset:resolved',
  GENERATION_REQUESTED = 'generation:requested',
  GENERATION_COMPLETED = 'generation:completed',
  GENERATION_FAILED = 'generation:failed',
  COMPOSITE_REQUESTED = 'composite:requested',
  COMPOSITE_COMPLETED = 'composite:completed',
  COMPOSITE_FAILED = 'composite:failed',
  PERSIST_REQUESTED = 'persist:requested',
  PERSIST_COMPLETED = 'persist:completed',
  CAMPAIGN_COMPLETED = 'campaign:completed',
  CAMPAIGN_FAILED = 'campaign:failed',
}

export interface BriefReceivedPayload {
  brief: CampaignBrief;
  correlationId: string;
}

export interface BriefValidatedPayload {
  brief: CampaignBrief;
  correlationId: string;
  complianceWarnings: string[];
  s3BriefKey?: string;
}

export interface AssetResolutionPayload {
  product: Product;
  correlationId: string;
}

export interface AssetResolvedPayload {
  product: Product;
  heroImageS3Key: string | null;
  generationPrompt: string | null;
  correlationId: string;
}

export interface GenerationRequestedPayload {
  product: Product;
  prompt: string;
  correlationId: string;
}

export interface GenerationCompletedPayload {
  product: Product;
  heroImageS3Key: string;
  correlationId: string;
}

export interface GenerationFailedPayload {
  product: Product;
  error: string;
  correlationId: string;
}

export interface CompositeRequestedPayload {
  product: Product;
  heroImageS3Key: string;
  brief: CampaignBrief;
  ratio: AspectRatioKey;
  correlationId: string;
}

export interface CompositeCompletedPayload {
  product: Product;
  ratio: AspectRatioKey;
  s3Key: string;
  correlationId: string;
}

export interface CompositeFailedPayload {
  product: Product;
  ratio: AspectRatioKey;
  error: string;
  correlationId: string;
}

export interface PersistRequestedPayload {
  product: Product;
  ratio: AspectRatioKey;
  s3Key: string;
  correlationId: string;
}

export interface PersistCompletedPayload {
  product: Product;
  ratio: AspectRatioKey;
  s3Key: string;
  correlationId: string;
}

export interface CampaignCompletedPayload {
  campaignName: string;
  products: string[];
  s3Keys: string[];
  complianceWarnings: string[];
  durationMs: number;
  correlationId: string;
}

export interface CampaignFailedPayload {
  campaignName: string;
  error: string;
  correlationId: string;
}

export type PipelineEventPayloads = {
  [PipelineEvent.BRIEF_RECEIVED]: BriefReceivedPayload;
  [PipelineEvent.BRIEF_VALIDATED]: BriefValidatedPayload;
  [PipelineEvent.ASSET_RESOLUTION]: AssetResolutionPayload;
  [PipelineEvent.ASSET_RESOLVED]: AssetResolvedPayload;
  [PipelineEvent.GENERATION_REQUESTED]: GenerationRequestedPayload;
  [PipelineEvent.GENERATION_COMPLETED]: GenerationCompletedPayload;
  [PipelineEvent.GENERATION_FAILED]: GenerationFailedPayload;
  [PipelineEvent.COMPOSITE_REQUESTED]: CompositeRequestedPayload;
  [PipelineEvent.COMPOSITE_COMPLETED]: CompositeCompletedPayload;
  [PipelineEvent.COMPOSITE_FAILED]: CompositeFailedPayload;
  [PipelineEvent.PERSIST_REQUESTED]: PersistRequestedPayload;
  [PipelineEvent.PERSIST_COMPLETED]: PersistCompletedPayload;
  [PipelineEvent.CAMPAIGN_COMPLETED]: CampaignCompletedPayload;
  [PipelineEvent.CAMPAIGN_FAILED]: CampaignFailedPayload;
};

/** Cross-service message envelope for SNS/SQS */
export interface ServiceMessage<T = unknown> {
  eventType: string;
  correlationId: string;
  timestamp: string;
  payload: T;
}

/** SNS topic names */
export const SNS_TOPICS = {
  BRIEF_VALIDATED: 'asc-brief-validated',
  PROCESSING_PROGRESS: 'asc-processing-progress',
  CAMPAIGN_STATUS: 'asc-campaign-status',
} as const;

/** SQS queue names */
export const SQS_QUEUES = {
  PROCESSING: 'asc-processing-queue',
  RUNNER: 'asc-runner-queue',
  NOTIFICATIONS: 'asc-notifications-queue',
  PROCESSING_DLQ: 'asc-processing-dlq',
  RUNNER_DLQ: 'asc-runner-dlq',
  NOTIFICATIONS_DLQ: 'asc-notifications-dlq',
} as const;
