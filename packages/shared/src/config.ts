import dotenv from 'dotenv';

dotenv.config();

export const ASPECT_RATIOS = {
  '1x1': { width: 1080, height: 1080, label: 'Instagram feed' },
  '9x16': { width: 1080, height: 1920, label: 'Instagram/TikTok Stories' },
  '16x9': { width: 1920, height: 1080, label: 'Facebook/YouTube landscape' },
} as const;

export type AspectRatioKey = keyof typeof ASPECT_RATIOS;

export const AWS_CONFIG = {
  region: process.env.AWS_REGION ?? 'us-east-1',
  endpoint: process.env.AWS_ENDPOINT_URL ?? undefined,
  s3Bucket: process.env.S3_BUCKET ?? 'asc-campaign-assets',
  snsTopicArnPrefix: process.env.SNS_TOPIC_ARN_PREFIX ?? 'arn:aws:sns:us-east-1:000000000000:',
  sqsQueueUrlPrefix: process.env.SQS_QUEUE_URL_PREFIX ?? 'http://localhost:4566/000000000000/',
  dynamoTableName: process.env.DYNAMO_TABLE_NAME ?? 'asc-campaigns',
};

export const CONFIG = {
  geminiApiKey: process.env.GEMINI_API_KEY ?? '',
  geminiModel: process.env.GEMINI_IMAGE_MODEL ?? 'imagen-4.0-generate-001',
  logLevel: process.env.LOG_LEVEL ?? 'info',
  maxRetries: 2,
  retryBaseDelayMs: 1000,
  heroSize: { width: 1080, height: 1080 },
};

/** S3 key helpers */
export const S3_KEYS = {
  heroImage: (slug: string) => `products/${slug}/hero.png`,
  logo: (slug: string) => `products/${slug}/logo.png`,
  brief: (correlationId: string) => `campaigns/${correlationId}/brief.json`,
  composite: (correlationId: string, slug: string, ratio: string) =>
    `campaigns/${correlationId}/output/${slug}/${ratio}/${slug}_${ratio}.png`,
  manifest: (correlationId: string) => `campaigns/${correlationId}/manifest.json`,
  complianceReport: (correlationId: string) => `campaigns/${correlationId}/compliance-report.json`,
};
