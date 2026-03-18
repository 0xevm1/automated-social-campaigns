import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';

const CAMPAIGN_RUNNER_URL =
  process.env.CAMPAIGN_RUNNER_URL ?? 'http://localhost:4568';
const S3_ENDPOINT = process.env.S3_ENDPOINT ?? 'http://localhost:4566';
const S3_BUCKET = process.env.S3_BUCKET ?? 'asc-campaign-assets';

async function fetchS3(key: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(`${S3_ENDPOINT}/${S3_BUCKET}/${key}`);
    if (!res.ok) return null;
    return res.arrayBuffer();
  } catch {
    return null;
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ correlationId: string }> },
) {
  const { correlationId } = await params;

  // Fetch campaign state
  let campaign: {
    campaignName: string;
    s3Keys: string[];
  };
  try {
    const res = await fetch(
      `${CAMPAIGN_RUNNER_URL}/campaigns/${correlationId}`,
    );
    if (!res.ok) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: res.status },
      );
    }
    campaign = await res.json();
  } catch {
    return NextResponse.json(
      { error: 'Campaign runner unavailable' },
      { status: 502 },
    );
  }

  const zip = new JSZip();

  // Add brief if available
  const briefData = await fetchS3(
    `campaigns/${correlationId}/brief.json`,
  );
  if (briefData) {
    zip.file('brief.json', briefData);
  }

  // Add all generated images
  const fetches = campaign.s3Keys.map(async (key) => {
    const data = await fetchS3(key);
    if (!data) return;

    // Turn "campaigns/{id}/product-slug/16x9/file.png" into "product-slug/16x9/file.png"
    const parts = key.split('/');
    const relativePath = parts.slice(2).join('/');
    zip.file(relativePath, data);
  });

  await Promise.all(fetches);

  const zipBuffer = await zip.generateAsync({
    type: 'arraybuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const safeName = campaign.campaignName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  return new NextResponse(zipBuffer, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${safeName}-assets.zip"`,
    },
  });
}
