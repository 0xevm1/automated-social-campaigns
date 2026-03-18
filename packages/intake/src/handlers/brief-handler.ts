import {
  CampaignBriefSchema,
  type CampaignBrief,
  S3_KEYS,
  SNS_TOPICS,
  putObject,
  publishToTopic,
  createLogger,
} from '@asc/shared';
import { scanProhibitedWords } from '../pipeline/compliance.js';

export interface BriefHandlerResult {
  success: boolean;
  correlationId: string;
  campaignName?: string;
  complianceWarnings?: string[];
  error?: string;
}

export async function handleBrief(
  briefData: unknown,
  correlationId: string,
): Promise<BriefHandlerResult> {
  const log = createLogger(correlationId);

  try {
    // Validate
    const brief = CampaignBriefSchema.parse(briefData);
    log.info({ campaign: brief.campaignName }, 'Brief validated');

    // Compliance check
    const complianceWarnings = scanProhibitedWords(brief, correlationId);

    // Upload brief to S3
    const briefKey = S3_KEYS.brief(correlationId);
    await putObject(briefKey, JSON.stringify(brief, null, 2), 'application/json');
    log.info({ briefKey }, 'Brief uploaded to S3');

    // Publish to SNS
    await publishToTopic(
      SNS_TOPICS.BRIEF_VALIDATED,
      'brief:validated',
      correlationId,
      {
        brief,
        correlationId,
        complianceWarnings,
        s3BriefKey: briefKey,
      },
    );

    log.info({ campaign: brief.campaignName }, 'Brief published to SNS');

    return {
      success: true,
      correlationId,
      campaignName: brief.campaignName,
      complianceWarnings,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    log.error({ error: errorMsg }, 'Brief handling failed');
    return {
      success: false,
      correlationId,
      error: errorMsg,
    };
  }
}
