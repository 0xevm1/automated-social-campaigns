import {
  type EventBus,
  PipelineEvent,
  type AssetResolutionPayload,
  S3_KEYS,
  headObject,
  createLogger,
} from '@asc/shared';

function buildGenerationPrompt(product: { name: string; description: string; heroImagePrompt?: string }): string {
  if (product.heroImagePrompt) {
    return product.heroImagePrompt;
  }
  return `Professional product photography of ${product.name}. ${product.description}. Clean white background, studio lighting, commercial advertising style, high resolution, photorealistic.`;
}

export function registerAssetResolver(bus: EventBus): void {
  bus.on(PipelineEvent.ASSET_RESOLUTION, async (payload: AssetResolutionPayload) => {
    const log = createLogger(payload.correlationId);
    const { product } = payload;

    log.info({ product: product.slug }, 'Resolving assets for product');

    const heroKey = S3_KEYS.heroImage(product.slug);
    const exists = await headObject(heroKey);

    if (exists) {
      log.info({ product: product.slug, heroKey }, 'Found existing hero image in S3');
      bus.emit(PipelineEvent.ASSET_RESOLVED, {
        product,
        heroImageS3Key: heroKey,
        generationPrompt: null,
        correlationId: payload.correlationId,
      });
    } else {
      const generationPrompt = buildGenerationPrompt(product);
      log.info({ product: product.slug }, 'No hero image found in S3, will generate');
      bus.emit(PipelineEvent.ASSET_RESOLVED, {
        product,
        heroImageS3Key: null,
        generationPrompt,
        correlationId: payload.correlationId,
      });
    }
  });
}
