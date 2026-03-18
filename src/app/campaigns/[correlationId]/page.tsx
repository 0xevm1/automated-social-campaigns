import { CampaignProgress } from '@/components/campaign/CampaignProgress';

export default async function CampaignPage({
  params,
}: {
  params: Promise<{ correlationId: string }>;
}) {
  const { correlationId } = await params;

  return <CampaignProgress correlationId={correlationId} />;
}
