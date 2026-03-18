'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProductFieldset } from './ProductFieldset';
import { TextOverlayFields } from './TextOverlayFields';
import { PlatformSelector } from './PlatformSelector';
import { validateBrief } from '@/lib/validation';
import { submitBrief } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import sampleBrief from '../../../briefs/sample-brief.json';

interface ProductData {
  name: string;
  slug: string;
  description: string;
  heroImagePrompt: string;
  brandColors: string[];
  heroImageUploaded?: boolean;
}

interface TextOverlayData {
  headline: string;
  subheadline: string;
  ctaText: string;
  fontColor: string;
  position: 'top' | 'center' | 'bottom';
}

const emptyProduct: ProductData = {
  name: '',
  slug: '',
  description: '',
  heroImagePrompt: '',
  brandColors: [],
  heroImageUploaded: false,
};

const emptyOverlay: TextOverlayData = {
  headline: '',
  subheadline: '',
  ctaText: '',
  fontColor: '#FFFFFF',
  position: 'bottom',
};

function addToRecent(correlationId: string) {
  const recent = JSON.parse(localStorage.getItem('recentCampaigns') || '[]') as string[];
  const updated = [correlationId, ...recent.filter((id) => id !== correlationId)].slice(0, 10);
  localStorage.setItem('recentCampaigns', JSON.stringify(updated));
}

export function BriefForm() {
  const router = useRouter();
  const [campaignName, setCampaignName] = useState('');
  const [campaignMessage, setCampaignMessage] = useState('');
  const [products, setProducts] = useState<ProductData[]>([{ ...emptyProduct }]);
  const [targetPlatforms, setTargetPlatforms] = useState<string[]>([]);
  const [showOverlay, setShowOverlay] = useState(false);
  const [textOverlay, setTextOverlay] = useState<TextOverlayData>({ ...emptyOverlay });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const buildBrief = () => {
    const brief: Record<string, unknown> = {
      campaignName,
      campaignMessage,
      products: products.map((p) => {
        const prod: Record<string, unknown> = {
          name: p.name,
          slug: p.slug,
          description: p.description,
        };
        if (p.heroImagePrompt) prod.heroImagePrompt = p.heroImagePrompt;
        if (p.brandColors.length > 0) prod.brandColors = p.brandColors;
        return prod;
      }),
    };
    if (targetPlatforms.length > 0) brief.targetPlatforms = targetPlatforms;
    if (showOverlay && textOverlay.headline) {
      const overlay: Record<string, unknown> = { headline: textOverlay.headline };
      if (textOverlay.subheadline) overlay.subheadline = textOverlay.subheadline;
      if (textOverlay.ctaText) overlay.ctaText = textOverlay.ctaText;
      if (textOverlay.fontColor) overlay.fontColor = textOverlay.fontColor;
      if (textOverlay.position) overlay.position = textOverlay.position;
      brief.textOverlay = overlay;
    }
    return brief;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const brief = buildBrief();
    const result = validateBrief(brief);

    if (!result.success) {
      const errMap: Record<string, string> = {};
      for (const err of result.errors ?? []) {
        errMap[err.path] = err.message;
      }
      setErrors(errMap);
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      const response = await submitBrief(result.data);
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

  const loadSample = () => {
    setCampaignName(sampleBrief.campaignName);
    setCampaignMessage(sampleBrief.campaignMessage);
    setProducts(
      sampleBrief.products.map((p) => ({
        name: p.name,
        slug: p.slug,
        description: p.description,
        heroImagePrompt: p.heroImagePrompt ?? '',
        brandColors: p.brandColors ?? [],
        heroImageUploaded: false,
      })),
    );
    if (sampleBrief.targetPlatforms) {
      setTargetPlatforms(sampleBrief.targetPlatforms);
    }
    if (sampleBrief.textOverlay) {
      setShowOverlay(true);
      setTextOverlay({
        headline: sampleBrief.textOverlay.headline ?? '',
        subheadline: sampleBrief.textOverlay.subheadline ?? '',
        ctaText: sampleBrief.textOverlay.ctaText ?? '',
        fontColor: sampleBrief.textOverlay.fontColor ?? '#FFFFFF',
        position: (sampleBrief.textOverlay.position as 'top' | 'center' | 'bottom') ?? 'bottom',
      });
    }
    setErrors({});
  };

  const updateProduct = (index: number, product: ProductData) => {
    const updated = [...products];
    updated[index] = product;
    setProducts(updated);
  };

  const removeProduct = (index: number) => {
    setProducts(products.filter((_, i) => i !== index));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex justify-end">
        <Button type="button" variant="link" onClick={loadSample}>
          Load Sample Brief
        </Button>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="campaignName">Campaign Name *</Label>
          <Input
            id="campaignName"
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
          />
          {errors.campaignName && (
            <p className="text-sm text-destructive">{errors.campaignName}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="campaignMessage">Campaign Message *</Label>
          <Textarea
            id="campaignMessage"
            value={campaignMessage}
            onChange={(e) => setCampaignMessage(e.target.value)}
            rows={2}
          />
          {errors.campaignMessage && (
            <p className="text-sm text-destructive">{errors.campaignMessage}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Target Platforms</Label>
        <PlatformSelector
          selected={targetPlatforms}
          onChange={setTargetPlatforms}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Products</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setProducts([...products, { ...emptyProduct }])}
          >
            + Add Product
          </Button>
        </div>
        {products.map((product, index) => (
          <ProductFieldset
            key={index}
            index={index}
            product={product}
            onChange={updateProduct}
            onRemove={removeProduct}
            canRemove={products.length > 1}
            errors={errors}
          />
        ))}
      </div>

      <div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowOverlay(!showOverlay)}
        >
          {showOverlay ? '- Hide' : '+ Add'} Text Overlay
        </Button>
        {showOverlay && (
          <Card className="mt-3 p-4">
            <TextOverlayFields
              overlay={textOverlay}
              onChange={setTextOverlay}
              errors={errors}
            />
          </Card>
        )}
      </div>

      {submitError && (
        <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
          {submitError}
        </div>
      )}

      {Object.keys(errors).length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg p-3 text-sm">
          Please fix the validation errors above.
        </div>
      )}

      <Button type="submit" disabled={submitting} className="w-full" size="lg">
        {submitting ? 'Submitting...' : 'Submit Campaign Brief'}
      </Button>
    </form>
  );
}
