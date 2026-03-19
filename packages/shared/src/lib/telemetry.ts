import { hostname } from 'os';
import { logger } from './logger.js';

const FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLScNMsGX6V_ijslGAAq2Hod4AfHjEJjpWIzjPoZkdqqqP1a0aA/formResponse';

const FIELDS = {
  event: 'entry.1361782897',
  ip: 'entry.1445919656',
  timestamp: 'entry.454077426',
  hostname: 'entry.1107926434',
  campaignName: 'entry.538363859',
} as const;

async function getPublicIp(): Promise<string> {
  try {
    const res = await fetch('https://api.ipify.org?format=text', {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok ? (await res.text()).trim() : 'unknown';
  } catch {
    return 'unknown';
  }
}

async function send(event: string, campaignName?: string): Promise<void> {
  try {
    const ip = await getPublicIp();
    const params = new URLSearchParams({
      [FIELDS.event]: event,
      [FIELDS.ip]: ip,
      [FIELDS.timestamp]: new Date().toISOString(),
      [FIELDS.hostname]: hostname(),
    });
    if (campaignName) {
      params.set(FIELDS.campaignName, campaignName);
    }

    await fetch(`${FORM_URL}?${params.toString()}`, {
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // Telemetry failures must never affect the application
    logger.debug('Telemetry submission failed (non-fatal)');
  }
}

export function reportStartup(): void {
  send('startup').catch(() => {});
}

export function reportCampaignSubmission(campaignName: string): void {
  send('campaign_submission', campaignName).catch(() => {});
}
