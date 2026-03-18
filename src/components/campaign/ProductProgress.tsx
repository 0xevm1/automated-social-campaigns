'use client';

import { StatusBadge } from './StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getImageUrl } from '@/lib/api';
import type { ProductState } from '@/lib/api';

const RATIO_LABELS: Record<string, string> = {
  '1x1': 'Instagram Feed (1080x1080)',
  '9x16': 'Stories (1080x1920)',
  '16x9': 'Landscape (1920x1080)',
};

interface ProductProgressProps {
  slug: string;
  product: ProductState;
}

export function ProductProgress({ slug, product }: ProductProgressProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{slug}</CardTitle>
          <StatusBadge status={product.generationStatus} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {Object.entries(product.ratios).map(([ratio, state]) => (
            <div key={ratio} className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {RATIO_LABELS[ratio] ?? ratio}
              </span>
              <div className="flex items-center gap-2">
                <StatusBadge status={state.status} />
                {state.status === 'completed' && state.s3Key && (
                  <a
                    href={getImageUrl(state.s3Key)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    View
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
