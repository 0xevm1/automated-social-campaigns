import {
  type EventBus,
  PipelineEvent,
  type CompositeRequestedPayload,
  ASPECT_RATIOS,
  S3_KEYS,
  getObject,
  putObject,
  createLogger,
} from '@asc/shared';
import { resizeToRatio, buildTextOverlaySvg, compositeOverlay } from '../lib/image-utils.js';

/**
 * Compositor reads hero from S3, resizes, overlays text, writes output to S3,
 * and emits PERSIST_COMPLETED directly (compositor + persister merged for S3 flow).
 */
export function registerCompositor(bus: EventBus): void {
  bus.on(PipelineEvent.COMPOSITE_REQUESTED, async (payload: CompositeRequestedPayload) => {
    const log = createLogger(payload.correlationId);
    const { product, heroImageS3Key, brief, ratio } = payload;
    const dimensions = ASPECT_RATIOS[ratio];

    try {
      log.info({ product: product.slug, ratio }, 'Compositing image');

      // Read hero image from S3
      const heroBuffer = await getObject(heroImageS3Key);

      // Resize hero to target aspect ratio
      const resizedBuffer = await resizeToRatio(
        heroBuffer,
        dimensions.width,
        dimensions.height,
      );

      // Build text overlay
      const textOverlay = brief.textOverlay ?? {
        headline: brief.campaignMessage,
      };

      const overlaySvg = buildTextOverlaySvg(
        dimensions.width,
        dimensions.height,
        {
          headline: textOverlay.headline,
          subheadline: textOverlay.subheadline,
          ctaText: textOverlay.ctaText,
          fontColor: textOverlay.fontColor,
          fontSize: textOverlay.fontSize,
          position: textOverlay.position,
        },
      );

      // Composite text overlay onto resized image
      const compositeBuffer = await compositeOverlay(resizedBuffer, overlaySvg);

      // Write composite to S3
      const s3Key = S3_KEYS.composite(payload.correlationId, product.slug, ratio);
      await putObject(s3Key, compositeBuffer, 'image/png');

      log.info({ product: product.slug, ratio, size: compositeBuffer.length, s3Key }, 'Composite persisted to S3');

      bus.emit(PipelineEvent.PERSIST_COMPLETED, {
        product,
        ratio,
        s3Key,
        correlationId: payload.correlationId,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      log.error({ product: product.slug, ratio, error: errorMsg }, 'Compositing failed');
      bus.emit(PipelineEvent.COMPOSITE_FAILED, {
        product,
        ratio,
        error: errorMsg,
        correlationId: payload.correlationId,
      });
    }
  });
}
