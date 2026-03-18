'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LoaderCircle, Download } from 'lucide-react';
import {
  getCampaignStatus,
  getCampaignBrief,
  getImageUrl,
} from '@/lib/api';
import type { CampaignState } from '@/lib/api';
import type { CampaignBrief } from '@asc/shared/schemas/campaign-brief';
import { StatusBadge } from '@/components/campaign/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface CampaignEntry {
  correlationId: string;
  state: CampaignState | null;
  brief: CampaignBrief | null;
  error?: string;
}

const RATIO_ORDER = ['1x1', '9x16', '16x9'];

const RATIO_META: Record<string, { label: string; dimensions: string }> = {
  '1x1': { label: 'Instagram Feed', dimensions: '1080x1080' },
  '9x16': { label: 'Stories', dimensions: '1080x1920' },
  '16x9': { label: 'Landscape', dimensions: '1920x1080' },
};

function parseKeyInfo(s3Key: string) {
  const parts = s3Key.split('/');
  return { slug: parts[3] ?? 'unknown', ratio: parts[4] ?? 'unknown' };
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

function BriefDetails({ brief }: { brief: CampaignBrief }) {
  return (
    <div className="space-y-2 text-sm">
      <div>
        <span className="text-muted-foreground">Message: </span>
        <span>{brief.campaignMessage}</span>
      </div>
      {brief.targetPlatforms && brief.targetPlatforms.length > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Platforms:</span>
          {brief.targetPlatforms.map((p) => (
            <Badge key={p} variant="secondary" className="capitalize">
              {p}
            </Badge>
          ))}
        </div>
      )}
      {brief.textOverlay && (
        <div>
          <span className="text-muted-foreground">Overlay: </span>
          <span>
            {brief.textOverlay.headline}
            {brief.textOverlay.subheadline
              ? ` / ${brief.textOverlay.subheadline}`
              : ''}
            {brief.textOverlay.ctaText
              ? ` / ${brief.textOverlay.ctaText}`
              : ''}
          </span>
        </div>
      )}
      <div>
        <span className="text-muted-foreground">Products: </span>
        <span>
          {brief.products.map((p) => p.name).join(', ')}
        </span>
      </div>
    </div>
  );
}

function CampaignImages({ s3Keys }: { s3Keys: string[] }) {
  if (s3Keys.length === 0) return null;

  const sorted = sortByRatio(s3Keys);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {sorted.map((key) => {
        const { slug, ratio } = parseKeyInfo(key);
        const meta = RATIO_META[ratio];
        const url = getImageUrl(key);
        return (
          <a
            key={key}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative overflow-hidden rounded-lg border bg-muted"
          >
            <img
              src={url}
              alt={`${slug} ${ratio}`}
              className="w-full h-auto transition-transform group-hover:scale-105"
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
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
              <p className="text-xs font-medium text-white">{slug}</p>
              <p className="text-[10px] text-white/70">
                {meta?.label ?? ratio}
              </p>
            </div>
          </a>
        );
      })}
    </div>
  );
}

function CampaignCard({ entry }: { entry: CampaignEntry }) {
  const { correlationId, state, brief, error } = entry;

  if (error) {
    return (
      <Card className="border-destructive/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-mono">
              {correlationId.slice(0, 8)}...
            </CardTitle>
            <Badge variant="destructive">unavailable</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!state) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <Link
              href={`/campaigns/${correlationId}`}
              className="hover:underline"
            >
              <CardTitle className="text-lg">{state.campaignName}</CardTitle>
            </Link>
            <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
              {correlationId}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge status={state.status} />
            {state.completedAt && state.durationMs != null && (
              <span className="text-xs text-muted-foreground">
                {(state.durationMs / 1000).toFixed(1)}s
              </span>
            )}
            {state.status === 'completed' && (
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
      <CardContent className="space-y-4">
        {brief && <BriefDetails brief={brief} />}

        {state.complianceWarnings.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-md px-3 py-2 text-xs">
            {state.complianceWarnings.join('; ')}
          </div>
        )}

        <CampaignImages s3Keys={state.s3Keys} />
      </CardContent>
    </Card>
  );
}

export default function RecentCampaignsPage() {
  const [entries, setEntries] = useState<CampaignEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ids = JSON.parse(
      localStorage.getItem('recentCampaigns') || '[]',
    ) as string[];

    if (ids.length === 0) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    Promise.all(
      ids.map(async (correlationId): Promise<CampaignEntry> => {
        try {
          const [state, brief] = await Promise.all([
            getCampaignStatus(correlationId),
            getCampaignBrief(correlationId),
          ]);
          return { correlationId, state, brief };
        } catch (err) {
          return {
            correlationId,
            state: null,
            brief: null,
            error: err instanceof Error ? err.message : 'Failed to load',
          };
        }
      }),
    ).then((results) => {
      if (!cancelled) {
        setEntries(results);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Recent Campaigns</h1>

      {loading && (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
          <LoaderCircle className="size-8 animate-spin" />
          <p className="text-sm">Loading campaigns...</p>
        </div>
      )}

      {!loading && entries.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>No recent campaigns yet.</p>
            <Link
              href="/campaigns/new"
              className="text-primary hover:underline text-sm mt-1 inline-block"
            >
              Create your first campaign
            </Link>
          </CardContent>
        </Card>
      )}

      {!loading &&
        entries.map((entry) => (
          <CampaignCard key={entry.correlationId} entry={entry} />
        ))}
    </div>
  );
}
