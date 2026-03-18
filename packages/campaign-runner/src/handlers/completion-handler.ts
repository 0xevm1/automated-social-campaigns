import {
  PipelineEvent,
  type CampaignCompletedPayload,
  type CampaignFailedPayload,
  type ServiceMessage,
  SNS_TOPICS,
  publishToTopic,
  createLogger,
} from '@asc/shared';
import { updateCampaignStatus } from '../state/campaign-store.js';

export async function handleCompletionEvent(message: ServiceMessage): Promise<void> {
  const { eventType, correlationId } = message;
  const log = createLogger(correlationId);

  switch (eventType) {
    case PipelineEvent.CAMPAIGN_COMPLETED: {
      const payload = message.payload as CampaignCompletedPayload;

      log.info(
        {
          campaign: payload.campaignName,
          assets: payload.s3Keys.length,
          durationMs: payload.durationMs,
          warnings: payload.complianceWarnings.length,
        },
        'Campaign completed',
      );

      await updateCampaignStatus(correlationId, 'completed', {
        completedAt: new Date().toISOString(),
        durationMs: payload.durationMs,
        manifestS3Key: `campaigns/${correlationId}/manifest.json`,
      });

      // Publish campaign status to downstream consumers (notifications, etc.)
      await publishToTopic(
        SNS_TOPICS.CAMPAIGN_STATUS,
        'campaign:completed',
        correlationId,
        payload,
      );

      break;
    }

    case PipelineEvent.CAMPAIGN_FAILED: {
      const payload = message.payload as CampaignFailedPayload;

      log.error(
        { campaign: payload.campaignName, error: payload.error },
        'Campaign failed',
      );

      await updateCampaignStatus(correlationId, 'failed', {
        completedAt: new Date().toISOString(),
      });

      await publishToTopic(
        SNS_TOPICS.CAMPAIGN_STATUS,
        'campaign:failed',
        correlationId,
        payload,
      );

      break;
    }
  }
}
