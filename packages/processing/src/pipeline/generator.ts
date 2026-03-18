import {
  type EventBus,
  PipelineEvent,
  type AssetResolvedPayload,
  S3_KEYS,
  putObject,
  createLogger,
} from '@asc/shared';
import { generateImage } from '../lib/gemini-client.js';

export function registerGenerator(bus: EventBus, dryRun = false): void {
  bus.on(PipelineEvent.ASSET_RESOLVED, async (payload: AssetResolvedPayload) => {
    const log = createLogger(payload.correlationId);
    const { product } = payload;

    // Already has a hero image — go straight to compositing
    if (payload.heroImageS3Key) {
      log.info({ product: product.slug }, 'Using existing hero image');
      bus.emit(PipelineEvent.GENERATION_COMPLETED, {
        product,
        heroImageS3Key: payload.heroImageS3Key,
        correlationId: payload.correlationId,
      });
      return;
    }

    if (!payload.generationPrompt) {
      bus.emit(PipelineEvent.GENERATION_FAILED, {
        product,
        error: 'No hero image and no generation prompt available',
        correlationId: payload.correlationId,
      });
      return;
    }

    if (dryRun) {
      log.info({ product: product.slug }, '[DRY RUN] Would generate image');
      bus.emit(PipelineEvent.GENERATION_FAILED, {
        product,
        error: 'Dry run — skipping image generation',
        correlationId: payload.correlationId,
      });
      return;
    }

    try {
      log.info({ product: product.slug }, 'Generating hero image via Gemini');
      const imageBuffer = await generateImage(payload.generationPrompt, payload.correlationId);

      // Save generated image to S3 for reuse
      const heroKey = S3_KEYS.heroImage(product.slug);
      await putObject(heroKey, imageBuffer, 'image/png');

      log.info({ product: product.slug, heroKey }, 'Hero image generated and saved to S3');

      bus.emit(PipelineEvent.GENERATION_COMPLETED, {
        product,
        heroImageS3Key: heroKey,
        correlationId: payload.correlationId,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      log.error({ product: product.slug, error: errorMsg }, 'Image generation failed');
      bus.emit(PipelineEvent.GENERATION_FAILED, {
        product,
        error: errorMsg,
        correlationId: payload.correlationId,
      });
    }
  });
}
