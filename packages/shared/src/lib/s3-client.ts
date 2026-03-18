import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { AWS_CONFIG } from '../config.js';

let client: S3Client | null = null;

function getClient(): S3Client {
  if (!client) {
    client = new S3Client({
      region: AWS_CONFIG.region,
      ...(AWS_CONFIG.endpoint ? {
        endpoint: AWS_CONFIG.endpoint,
        forcePathStyle: true,
      } : {}),
    });
  }
  return client;
}

export async function getObject(key: string, bucket = AWS_CONFIG.s3Bucket): Promise<Buffer> {
  const s3 = getClient();
  const response = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const stream = response.Body;
  if (!stream) throw new Error(`Empty response for s3://${bucket}/${key}`);
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function putObject(
  key: string,
  body: Buffer | string,
  contentType?: string,
  bucket = AWS_CONFIG.s3Bucket,
): Promise<void> {
  const s3 = getClient();
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: typeof body === 'string' ? Buffer.from(body) : body,
    ContentType: contentType,
  }));
}

export async function headObject(
  key: string,
  bucket = AWS_CONFIG.s3Bucket,
): Promise<boolean> {
  const s3 = getClient();
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}
