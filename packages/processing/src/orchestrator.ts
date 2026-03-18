import {
  type EventBus,
  PipelineEvent,
  type BriefReceivedPayload,
  type BriefValidatedPayload,
  type GenerationCompletedPayload,
  type GenerationFailedPayload,
  type PersistCompletedPayload,
  type CompositeFailedPayload,
  type CampaignBrief,
  ASPECT_RATIOS,
  type AspectRatioKey,
  S3_KEYS,
  SNS_TOPICS,
  putObject,
  publishToTopic,
  createLogger,
  CampaignBriefSchema,
} from '@asc/shared';
import { registerAssetResolver } from './pipeline/asset-resolver.js';
import { registerGenerator } from './pipeline/generator.js';
import { registerCompositor } from './pipeline/compositor.js';
import type { ManifestEntry } from './pipeline/persister.js';

export interface OrchestratorOptions {
  dryRun?: boolean;
}

export function createOrchestrator(bus: EventBus, options: OrchestratorOptions = {}) {
  // Register all pipeline stages (internal EventBus)
  registerAssetResolver(bus);
  registerGenerator(bus, options.dryRun);
  registerCompositor(bus);

  const ratioKeys = Object.keys(ASPECT_RATIOS) as AspectRatioKey[];

  // Track state per campaign run
  let startTime = 0;
  let activeBrief: CampaignBrief | null = null;
  const s3Keys: string[] = [];
  const manifestEntries: ManifestEntry[] = [];
  const allWarnings: string[] = [];
  let pendingProducts = 0;
  let pendingComposites = 0;
  const failedProducts = new Set<string>();

  function reset() {
    startTime = 0;
    activeBrief = null;
    s3Keys.length = 0;
    manifestEntries.length = 0;
    allWarnings.length = 0;
    pendingProducts = 0;
    pendingComposites = 0;
    failedProducts.clear();
  }

  async function checkCompletion(correlationId: string) {
    if (pendingComposites > 0 || pendingProducts > 0) return;
    if (!activeBrief) return;

    const durationMs = Date.now() - startTime;
    const log = createLogger(correlationId);

    // Write manifest to S3
    const manifest = {
      campaignName: activeBrief.campaignName,
      generatedAt: new Date().toISOString(),
      durationMs,
      complianceWarnings: allWarnings,
      assets: manifestEntries,
    };

    const manifestKey = S3_KEYS.manifest(correlationId);
    await putObject(manifestKey, JSON.stringify(manifest, null, 2), 'application/json');

    log.info(
      { durationMs, assets: s3Keys.length, warnings: allWarnings.length },
      'Campaign processing completed',
    );

    const completedPayload = {
      campaignName: activeBrief.campaignName,
      products: activeBrief.products.map((p) => p.slug),
      s3Keys,
      complianceWarnings: allWarnings,
      durationMs,
      correlationId,
    };

    bus.emit(PipelineEvent.CAMPAIGN_COMPLETED, completedPayload);

    // Publish progress to SNS for Campaign Runner
    await publishToTopic(
      SNS_TOPICS.PROCESSING_PROGRESS,
      PipelineEvent.CAMPAIGN_COMPLETED,
      correlationId,
      completedPayload,
    );
  }

  // Stage 1: Ingest & validate
  bus.on(PipelineEvent.BRIEF_RECEIVED, (payload: BriefReceivedPayload) => {
    const log = createLogger(payload.correlationId);
    reset();
    startTime = Date.now();

    log.info({ campaign: payload.brief.campaignName }, 'Brief received, validating');

    try {
      const brief = CampaignBriefSchema.parse(payload.brief);
      activeBrief = brief;

      bus.emit(PipelineEvent.BRIEF_VALIDATED, {
        brief,
        correlationId: payload.correlationId,
        complianceWarnings: [],
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      log.error({ error: errorMsg }, 'Brief validation failed');
      bus.emit(PipelineEvent.CAMPAIGN_FAILED, {
        campaignName: payload.brief.campaignName ?? 'unknown',
        error: `Validation failed: ${errorMsg}`,
        correlationId: payload.correlationId,
      });
    }
  });

  // Stage 2: Fan out to asset resolution per product
  bus.on(PipelineEvent.BRIEF_VALIDATED, (payload: BriefValidatedPayload) => {
    const log = createLogger(payload.correlationId);
    const { brief } = payload;

    if (payload.complianceWarnings.length > 0) {
      allWarnings.push(...payload.complianceWarnings);
    }

    pendingProducts = brief.products.length;
    log.info({ products: pendingProducts }, 'Starting asset resolution for all products');

    for (const product of brief.products) {
      bus.emit(PipelineEvent.ASSET_RESOLUTION, {
        product,
        correlationId: payload.correlationId,
      });
    }
  });

  // Stage 3→4: Generation complete → fan out composites per ratio
  bus.on(PipelineEvent.GENERATION_COMPLETED, (payload: GenerationCompletedPayload) => {
    const log = createLogger(payload.correlationId);
    const { product, heroImageS3Key } = payload;

    pendingProducts--;
    pendingComposites += ratioKeys.length;

    log.info({ product: product.slug, ratios: ratioKeys.length }, 'Fanning out composites');

    for (const ratio of ratioKeys) {
      bus.emit(PipelineEvent.COMPOSITE_REQUESTED, {
        product,
        heroImageS3Key,
        brief: activeBrief!,
        ratio,
        correlationId: payload.correlationId,
      });
    }
  });

  // Generation failed — skip composites for this product
  bus.on(PipelineEvent.GENERATION_FAILED, (payload: GenerationFailedPayload) => {
    const log = createLogger(payload.correlationId);
    pendingProducts--;
    failedProducts.add(payload.product.slug);
    allWarnings.push(`Generation failed for ${payload.product.slug}: ${payload.error}`);
    log.warn({ product: payload.product.slug }, 'Skipping composites due to generation failure');

    // Publish progress to SNS
    publishToTopic(
      SNS_TOPICS.PROCESSING_PROGRESS,
      PipelineEvent.GENERATION_FAILED,
      payload.correlationId,
      payload,
    ).catch(() => {});

    checkCompletion(payload.correlationId);
  });

  // Composite failed
  bus.on(PipelineEvent.COMPOSITE_FAILED, (payload: CompositeFailedPayload) => {
    pendingComposites--;
    allWarnings.push(`Composite failed for ${payload.product.slug}/${payload.ratio}: ${payload.error}`);
    checkCompletion(payload.correlationId);
  });

  // Stage 5: Persist complete → track & check if campaign is done
  bus.on(PipelineEvent.PERSIST_COMPLETED, (payload: PersistCompletedPayload) => {
    pendingComposites--;
    s3Keys.push(payload.s3Key);
    manifestEntries.push({
      product: payload.product.slug,
      ratio: payload.ratio,
      s3Key: payload.s3Key,
    });

    // Publish per-asset progress to SNS
    publishToTopic(
      SNS_TOPICS.PROCESSING_PROGRESS,
      PipelineEvent.PERSIST_COMPLETED,
      payload.correlationId,
      payload,
    ).catch(() => {});

    checkCompletion(payload.correlationId);
  });

  return {
    start(brief: CampaignBrief, correlationId: string) {
      bus.emit(PipelineEvent.BRIEF_RECEIVED, { brief, correlationId });
    },
  };
}
