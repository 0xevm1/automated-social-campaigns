import { NextRequest, NextResponse } from 'next/server';

const INTAKE_URL = process.env.INTAKE_URL ?? 'http://localhost:4567';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(`${INTAKE_URL}/events/campaign-brief`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { error: 'Intake service unavailable. Is Docker running?' },
      { status: 502 },
    );
  }
}
