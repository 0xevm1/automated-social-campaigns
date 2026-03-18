import { NextRequest, NextResponse } from 'next/server';

const S3_ENDPOINT = process.env.S3_ENDPOINT ?? 'http://localhost:4566';
const S3_BUCKET = process.env.S3_BUCKET ?? 'asc-campaign-assets';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key } = await params;
  const s3Key = key.join('/');

  try {
    const response = await fetch(
      `${S3_ENDPOINT}/${S3_BUCKET}/${s3Key}`,
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 },
      );
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') ?? 'image/png';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600, immutable',
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'S3 unavailable. Is Docker running?' },
      { status: 502 },
    );
  }
}
