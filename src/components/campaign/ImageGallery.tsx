'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getImageUrl } from '@/lib/api';

interface ImageGalleryProps {
  s3Keys: string[];
}

const RATIO_ORDER = ['1x1', '9x16', '16x9'];

const RATIO_META: Record<string, { label: string; dimensions: string }> = {
  '1x1': { label: 'Instagram Feed', dimensions: '1080x1080' },
  '9x16': { label: 'Stories', dimensions: '1080x1920' },
  '16x9': { label: 'Landscape', dimensions: '1920x1080' },
};

function parseKeyInfo(s3Key: string) {
  const parts = s3Key.split('/');
  const slug = parts[3] ?? 'unknown';
  const ratio = parts[4] ?? 'unknown';
  return { slug, ratio };
}

function sortByRatio(keys: string[]): string[] {
  return [...keys].sort((a, b) => {
    const ra = parseKeyInfo(a).ratio;
    const rb = parseKeyInfo(b).ratio;
    const ia = RATIO_ORDER.indexOf(ra);
    const ib = RATIO_ORDER.indexOf(rb);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
}

export function ImageGallery({ s3Keys }: ImageGalleryProps) {
  if (s3Keys.length === 0) return null;

  const sorted = sortByRatio(s3Keys);

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Generated Assets</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sorted.map((key) => {
          const { slug, ratio } = parseKeyInfo(key);
          const meta = RATIO_META[ratio];
          const url = getImageUrl(key);
          return (
            <Card key={key} className="overflow-hidden">
              <div className="relative">
                <img
                  src={url}
                  alt={`${slug} ${ratio}`}
                  className="w-full h-auto"
                />
                <div className="absolute top-2 right-2 flex gap-1">
                  <Badge
                    variant="secondary"
                    className="bg-black/60 text-white border-none text-[10px]"
                  >
                    {ratio}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="bg-black/60 text-white border-none text-[10px]"
                  >
                    {meta?.dimensions ?? ratio}
                  </Badge>
                </div>
              </div>
              <CardContent className="pt-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{slug}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {meta?.label ?? ratio}
                    </p>
                  </div>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    Full size
                  </a>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
