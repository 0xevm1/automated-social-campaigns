'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getCampaignStatus, CampaignNotFoundError } from './api';
import type { CampaignState } from './api';

const MAX_NOT_FOUND_WAIT_MS = 30_000;

export function useCampaignPolling(correlationId: string) {
  const [data, setData] = useState<CampaignState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(Date.now());

  const poll = useCallback(async () => {
    try {
      const state = await getCampaignStatus(correlationId);
      setData(state);
      setError(null);
      setIsLoading(false);

      if (state.status === 'completed' || state.status === 'failed') {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    } catch (err) {
      // Campaign not created yet — keep showing loading spinner
      // until the timeout expires
      if (
        err instanceof CampaignNotFoundError &&
        Date.now() - startedAtRef.current < MAX_NOT_FOUND_WAIT_MS
      ) {
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to fetch status');
      setIsLoading(false);
    }
  }, [correlationId]);

  useEffect(() => {
    poll();
    intervalRef.current = setInterval(poll, 2000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [poll]);

  return { data, error, isLoading };
}
