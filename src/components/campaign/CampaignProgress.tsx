'use client';

import { LoaderCircle, Download } from 'lucide-react';
import { useCampaignPolling } from '@/lib/hooks';
import { StatusBadge } from './StatusBadge';
import { ProductProgress } from './ProductProgress';
import { ImageGallery } from './ImageGallery';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface CampaignProgressProps {
  correlationId: string;
}

export function CampaignProgress({ correlationId }: CampaignProgressProps) {
  const { data, error, isLoading } = useCampaignPolling(correlationId);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
        <LoaderCircle className="size-8 animate-spin" />
        <p className="text-sm">Waiting for campaign to start...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="pt-6">
          <p className="font-medium text-destructive">Error</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <p className="text-xs mt-2 text-muted-foreground">
            Correlation ID: <span className="font-mono">{correlationId}</span>
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const products = Object.entries(data.products);
  const totalRatios = products.reduce(
    (sum, [, p]) => sum + Object.keys(p.ratios).length,
    0,
  );
  const completedRatios = products.reduce(
    (sum, [, p]) =>
      sum +
      Object.values(p.ratios).filter((r) => r.status === 'completed').length,
    0,
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{data.campaignName}</CardTitle>
              <p className="text-sm text-muted-foreground font-mono mt-1">
                {correlationId}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={data.status} />
              {data.status === 'completed' && (
                <Button
                  variant="outline"
                  size="sm"
                  render={
                    <a
                      href={`/api/campaigns/${correlationId}/download`}
                      download
                    />
                  }
                >
                  <Download className="size-3.5" />
                  Download
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {data.status === 'processing' && totalRatios > 0 && (
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Progress</span>
                <span>
                  {completedRatios} / {totalRatios} assets
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary rounded-full h-2 transition-all duration-500"
                  style={{
                    width: `${totalRatios > 0 ? (completedRatios / totalRatios) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          )}

          {data.completedAt && (
            <p className="text-sm text-muted-foreground">
              Completed in {((data.durationMs ?? 0) / 1000).toFixed(1)}s
            </p>
          )}
        </CardContent>
      </Card>

      {data.complianceWarnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg p-4">
          <p className="font-medium text-sm mb-1">Compliance Warnings</p>
          <ul className="list-disc list-inside text-sm space-y-1">
            {data.complianceWarnings.map((warning, i) => (
              <li key={i}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {products.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Products</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {products.map(([slug, product]) => (
              <ProductProgress key={slug} slug={slug} product={product} />
            ))}
          </div>
        </div>
      )}

      {data.status === 'completed' && <ImageGallery s3Keys={data.s3Keys} />}
    </div>
  );
}
