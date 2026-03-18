import { GoogleGenAI } from '@google/genai';
import { CONFIG, createLogger } from '@asc/shared';

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!client) {
    if (!CONFIG.geminiApiKey) {
      throw new Error('GEMINI_API_KEY not set. Copy .env.example to .env and add your key.');
    }
    client = new GoogleGenAI({ apiKey: CONFIG.geminiApiKey });
  }
  return client;
}

export async function generateImage(
  prompt: string,
  correlationId: string,
): Promise<Buffer> {
  const log = createLogger(correlationId);
  const ai = getClient();

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= CONFIG.maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = CONFIG.retryBaseDelayMs * Math.pow(2, attempt - 1);
        log.info({ attempt, delay }, 'Retrying image generation');
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      log.info({ attempt, prompt: prompt.slice(0, 100) }, 'Calling Gemini Imagen 4');

      const response = await ai.models.generateImages({
        model: CONFIG.geminiModel,
        prompt,
        config: {
          numberOfImages: 1,
        },
      });

      const image = response.generatedImages?.[0];
      if (!image?.image?.imageBytes) {
        throw new Error('No image data in Gemini response');
      }

      const buffer = Buffer.from(image.image.imageBytes, 'base64');
      log.info({ size: buffer.length }, 'Image generated successfully');
      return buffer;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      log.error({ attempt, error: lastError.message }, 'Image generation failed');
    }
  }

  throw lastError ?? new Error('Image generation failed after retries');
}
