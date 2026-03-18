import {
  PipelineEvent,
  type PersistCompletedPayload,
  type GenerationFailedPayload,
  type ServiceMessage,
  createLogger,
} from '@asc/shared';
import { getCampaign, createCampaign, addS3Key, addComplianceWarning } from '../state/campaign-store.js';
import type { CampaignState } from '@asc/shared';

export async function handleProgressEvent(message: ServiceMessage): Promise<void> {
  const { eventType, correlationId } = message;
  const log = createLogger(correlationId);

  // Ensure campaign exists in state store
  let campaign = await getCampaign(correlationId);
  if (!campaign) {
    log.info({ correlationId }, 'Creating new campaign state');
    campaign = {
      correlationId,
      campaignName: 'unknown',
      status: 'processing',
      products: {},
      complianceWarnings: [],
      s3Keys: [],
      startedAt: new Date().toISOString(),
    };
    await createCampaign(campaign);
  }

  switch (eventType) {
    case PipelineEvent.PERSIST_COMPLETED: {
      const payload = message.payload as PersistCompletedPayload;
      log.info(
        { product: payload.product.slug, ratio: payload.ratio, s3Key: payload.s3Key },
        'Asset persisted',
      );
      await addS3Key(correlationId, payload.s3Key);
      break;
    }

    case PipelineEvent.GENERATION_FAILED: {
      const payload = message.payload as GenerationFailedPayload;
      log.warn({ product: payload.product.slug, error: payload.error }, 'Generation failed for product');
      await addComplianceWarning(correlationId, `Generation failed for ${payload.product.slug}: ${payload.error}`);
      break;
    }

    case PipelineEvent.CAMPAIGN_COMPLETED: {
      // Handled by completion-handler
      break;
    }

    default:
      log.debug({ eventType }, 'Unhandled progress event type');
  }
}
