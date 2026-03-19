import type { CampaignBrief } from '@asc/shared/schemas/campaign-brief';

export interface BriefResponse {
  correlationId: string;
  campaignName?: string;
  complianceWarnings?: string[];
  error?: string;
  message?: string;
}

export interface CampaignState {
  correlationId: string;
  campaignName: string;
  status: 'processing' | 'completed' | 'failed';
  products: Record<string, ProductState>;
  complianceWarnings: string[];
  s3Keys: string[];
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  manifestS3Key?: string;
}

export interface ProductState {
  slug: string;
  generationStatus: 'pending' | 'completed' | 'failed';
  ratios: Record<string, RatioState>;
}

export interface RatioState {
  status: 'pending' | 'completed' | 'failed';
  s3Key?: string;
}

export async function submitBrief(
  brief: CampaignBrief,
): Promise<BriefResponse> {
  const response = await fetch('/api/brief', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(brief),
  });
  return response.json();
}

export class CampaignNotFoundError extends Error {
  constructor(correlationId: string) {
    super(`Campaign not found (${correlationId})`);
    this.name = 'CampaignNotFoundError';
  }
}

export async function getCampaignStatus(
  correlationId: string,
): Promise<CampaignState> {
  const response = await fetch(`/api/campaigns/${correlationId}`);
  if (response.status === 404) {
    throw new CampaignNotFoundError(correlationId);
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch campaign (${response.status})`);
  }
  return response.json();
}

export async function getCampaignBrief(
  correlationId: string,
): Promise<CampaignBrief | null> {
  try {
    const response = await fetch(
      `/api/images/campaigns/${correlationId}/brief.json`,
    );
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

export async function uploadProductHero(
  slug: string,
  file: File,
): Promise<{ key: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('slug', slug);

  const response = await fetch('/api/upload/product-hero', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(data.error ?? 'Upload failed');
  }

  return response.json();
}

export interface ComplianceCheck {
  category: 'prohibited-words' | 'brand-colors' | 'logo-presence';
  scope: string;
  status: 'pass' | 'warn';
  details?: string;
}

export interface ComplianceReport {
  correlationId: string;
  campaignName: string;
  checks: ComplianceCheck[];
  warnings: string[];
  warningCount: number;
}

export async function getComplianceReport(
  correlationId: string,
): Promise<ComplianceReport | null> {
  try {
    const response = await fetch(
      `/api/images/campaigns/${correlationId}/compliance-report.json`,
    );
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

export function getImageUrl(s3Key: string): string {
  return `/api/images/${s3Key}`;
}
