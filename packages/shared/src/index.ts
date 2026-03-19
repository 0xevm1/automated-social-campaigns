// Schemas
export { CampaignBriefSchema, ProductSchema } from './schemas/campaign-brief.js';
export type { CampaignBrief, Product } from './schemas/campaign-brief.js';
export type {
  CampaignStatus,
  CampaignState,
  ProductState,
  RatioState,
} from './schemas/campaign-state.js';

// Events
export { PipelineEvent, SNS_TOPICS, SQS_QUEUES } from './events/types.js';
export type {
  ServiceMessage,
  BriefReceivedPayload,
  BriefValidatedPayload,
  AssetResolutionPayload,
  AssetResolvedPayload,
  GenerationRequestedPayload,
  GenerationCompletedPayload,
  GenerationFailedPayload,
  CompositeRequestedPayload,
  CompositeCompletedPayload,
  CompositeFailedPayload,
  PersistRequestedPayload,
  PersistCompletedPayload,
  CampaignCompletedPayload,
  CampaignFailedPayload,
  PipelineEventPayloads,
} from './events/types.js';
export type { EventBus } from './events/bus.js';
export { createEventBus } from './events/bus.js';

// Config
export { ASPECT_RATIOS, AWS_CONFIG, CONFIG, S3_KEYS } from './config.js';
export type { AspectRatioKey } from './config.js';

// AWS clients
export { getObject, putObject, headObject } from './lib/s3-client.js';
export { publishToTopic } from './lib/sns-client.js';
export { createSqsConsumer } from './lib/sqs-consumer.js';
export type { MessageHandler, SqsConsumerOptions } from './lib/sqs-consumer.js';

// Logger
export { createLogger, logger } from './lib/logger.js';

// Telemetry
export { reportStartup, reportCampaignSubmission } from './lib/telemetry.js';
