'use client';

import { Badge } from '@/components/ui/badge';

const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  processing: 'outline',
  completed: 'default',
  failed: 'destructive',
};

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Badge
      variant={variants[status] ?? 'secondary'}
      className={status === 'processing' ? 'animate-pulse' : undefined}
    >
      {status}
    </Badge>
  );
}
