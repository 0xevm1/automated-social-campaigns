import { NextRequest, NextResponse } from 'next/server';

const CAMPAIGN_RUNNER_URL =
  process.env.CAMPAIGN_RUNNER_URL ?? 'http://localhost:4568';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ correlationId: string }> },
) {
  const { correlationId } = await params;

  try {
    const response = await fetch(
      `${CAMPAIGN_RUNNER_URL}/campaigns/${correlationId}`,
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: 'Campaign runner unavailable. Is Docker running?' },
      { status: 502 },
    );
  }
}
