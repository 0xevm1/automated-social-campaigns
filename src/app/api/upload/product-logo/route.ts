import { NextRequest, NextResponse } from 'next/server';

const S3_ENDPOINT = process.env.S3_ENDPOINT ?? 'http://localhost:4566';
const S3_BUCKET = process.env.S3_BUCKET ?? 'asc-campaign-assets';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const slug = formData.get('slug');

    if (!slug || typeof slug !== 'string') {
      return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
    }

    if (!SLUG_PATTERN.test(slug)) {
      return NextResponse.json(
        { error: 'Invalid slug format. Use lowercase alphanumeric with hyphens.' },
        { status: 400 },
      );
    }

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 },
      );
    }

    const buffer = await file.arrayBuffer();
    const s3Key = `products/${slug}/logo.png`;

    const response = await fetch(`${S3_ENDPOINT}/${S3_BUCKET}/${s3Key}`, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: buffer,
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to upload to storage' },
        { status: 502 },
      );
    }

    return NextResponse.json({ key: s3Key });
  } catch {
    return NextResponse.json(
      { error: 'Upload failed. Is Docker running?' },
      { status: 502 },
    );
  }
}
