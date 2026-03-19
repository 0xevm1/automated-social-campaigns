'use client';

import { useState, useEffect } from 'react';
import { CircleCheck, CircleX, Shield } from 'lucide-react';
import { getComplianceReport } from '@/lib/api';
import type { ComplianceCheck, ComplianceReport } from '@/lib/api';

const CATEGORY_LABELS: Record<string, string> = {
  'prohibited-words': 'Prohibited Words',
  'brand-colors': 'Brand Colors',
  'logo-presence': 'Logo',
};

function scopeLabel(scope: string): string {
  if (scope === 'campaign') return 'Campaign';
  if (scope.startsWith('product:')) return scope.replace('product:', '');
  return scope;
}

function CheckRow({ check }: { check: ComplianceCheck }) {
  const passed = check.status === 'pass';
  return (
    <div className="flex items-start gap-2 py-1.5">
      {passed ? (
        <CircleCheck className="size-4 text-green-600 shrink-0 mt-0.5" />
      ) : (
        <CircleX className="size-4 text-red-500 shrink-0 mt-0.5" />
      )}
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">
            {CATEGORY_LABELS[check.category] ?? check.category}
          </span>
          <span className="text-muted-foreground text-xs font-mono">
            {scopeLabel(check.scope)}
          </span>
        </div>
        {check.details && (
          <p className="text-xs text-muted-foreground mt-0.5 break-words">
            {check.details}
          </p>
        )}
      </div>
    </div>
  );
}

interface ComplianceChecklistProps {
  correlationId: string;
}

export function ComplianceChecklist({ correlationId }: ComplianceChecklistProps) {
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getComplianceReport(correlationId).then((r) => {
      setReport(r);
      setLoaded(true);
    });
  }, [correlationId]);

  if (!loaded || !report?.checks?.length) return null;

  const passed = report.checks.filter((c) => c.status === 'pass').length;
  const warned = report.checks.filter((c) => c.status === 'warn').length;
  const allPassed = warned === 0;

  return (
    <div
      className={`rounded-lg border p-4 ${
        allPassed
          ? 'border-green-200 bg-green-50'
          : 'border-yellow-200 bg-yellow-50'
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <Shield
          className={`size-4 ${allPassed ? 'text-green-600' : 'text-yellow-600'}`}
        />
        <span className="font-medium text-sm">
          Compliance Checks
        </span>
        <span className="text-xs text-muted-foreground ml-auto">
          {passed} passed{warned > 0 ? `, ${warned} warned` : ''}
        </span>
      </div>
      <div className="divide-y divide-border/50">
        {report.checks.map((check, i) => (
          <CheckRow key={i} check={check} />
        ))}
      </div>
    </div>
  );
}
