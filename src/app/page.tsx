'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function Home() {
  const router = useRouter();
  const [correlationId, setCorrelationId] = useState('');
  const [recentIds, setRecentIds] = useState<string[]>([]);

  useEffect(() => {
    setRecentIds(
      JSON.parse(localStorage.getItem('recentCampaigns') || '[]') as string[],
    );
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-2">Campaign Dashboard</h1>
        <p className="text-muted-foreground">
          Create campaign briefs and track image generation progress.
        </p>
      </div>

      <Button size="lg" render={<Link href="/campaigns/new" />}>
        Create New Campaign
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Check Campaign Status</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (correlationId.trim()) {
                router.push(`/campaigns/${correlationId.trim()}`);
              }
            }}
            className="flex gap-3"
          >
            <Input
              value={correlationId}
              onChange={(e) => setCorrelationId(e.target.value)}
              placeholder="Paste a correlation ID..."
              className="flex-1"
            />
            <Button type="submit" variant="secondary">
              Check Status
            </Button>
          </form>
        </CardContent>
      </Card>

      {recentIds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {recentIds.map((id: string) => (
                <li key={id}>
                  <Link
                    href={`/campaigns/${id}`}
                    className="text-sm text-primary hover:underline font-mono"
                  >
                    {id}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
