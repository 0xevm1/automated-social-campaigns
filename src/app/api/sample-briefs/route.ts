import { NextResponse } from 'next/server';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  const dir = join(process.cwd(), 'briefs');
  const files = await readdir(dir);
  const briefs = await Promise.all(
    files
      .filter((f) => f.endsWith('.json'))
      .map(async (f) => JSON.parse(await readFile(join(dir, f), 'utf-8'))),
  );
  return NextResponse.json(briefs);
}
