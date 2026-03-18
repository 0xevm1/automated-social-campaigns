'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { validateBrief, getJsonParseErrorPosition, type ValidationError } from '@/lib/validation';
import { submitBrief } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import sampleBrief from '../../../briefs/sample-brief.json';

function addToRecent(correlationId: string) {
  const recent = JSON.parse(localStorage.getItem('recentCampaigns') || '[]') as string[];
  const updated = [correlationId, ...recent.filter((id) => id !== correlationId)].slice(0, 10);
  localStorage.setItem('recentCampaigns', JSON.stringify(updated));
}

export function JsonTextarea() {
  const router = useRouter();
  const [json, setJson] = useState('');
  const [validationErrors, setValidationErrors] = useState<ValidationError[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [valid, setValid] = useState(false);

  const validate = () => {
    setParseError(null);
    setValidationErrors(null);
    setValid(false);

    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch (err) {
      const line = getJsonParseErrorPosition(json, err);
      const lineInfo = line ? ` (line ${line})` : '';
      setParseError(`Invalid JSON syntax${lineInfo}`);
      return null;
    }

    const result = validateBrief(parsed, json);
    if (!result.success) {
      setValidationErrors(result.errors);
      return null;
    }

    setValid(true);
    return result.data;
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    const data = validate();
    if (!data) return;

    setSubmitting(true);
    try {
      const response = await submitBrief(data);
      if (response.error) {
        setSubmitError(response.error);
      } else {
        addToRecent(response.correlationId);
        router.push(`/campaigns/${response.correlationId}`);
      }
    } catch {
      setSubmitError('Failed to submit brief. Is the backend running?');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="link"
          onClick={() => {
            setJson(JSON.stringify(sampleBrief, null, 2));
            setParseError(null);
            setValidationErrors(null);
            setValid(false);
          }}
        >
          Load Sample
        </Button>
      </div>

      <Textarea
        value={json}
        onChange={(e) => {
          setJson(e.target.value);
          setParseError(null);
          setValidationErrors(null);
          setValid(false);
        }}
        rows={20}
        placeholder="Paste campaign brief JSON here..."
        className="font-mono text-sm"
      />

      {parseError && (
        <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
          {parseError}
        </div>
      )}

      {validationErrors && (
        <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
          <p className="font-medium mb-1">Validation errors:</p>
          <ul className="list-disc list-inside space-y-1">
            {validationErrors.map((err, i) => (
              <li key={i}>
                {err.line != null && (
                  <span className="font-mono text-destructive/70">line {err.line}: </span>
                )}
                <span className="font-mono">{err.path}</span>: {err.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {valid && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm">
          Valid campaign brief.
        </div>
      )}

      {submitError && (
        <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
          {submitError}
        </div>
      )}

      <div className="flex gap-3">
        <Button type="button" variant="secondary" onClick={validate}>
          Validate
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit'}
        </Button>
      </div>
    </div>
  );
}
