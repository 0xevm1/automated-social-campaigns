'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface TextOverlayData {
  headline: string;
  subheadline: string;
  ctaText: string;
  fontColor: string;
  position: 'top' | 'center' | 'bottom';
}

interface TextOverlayFieldsProps {
  overlay: TextOverlayData;
  onChange: (overlay: TextOverlayData) => void;
  errors: Record<string, string>;
}

export function TextOverlayFields({
  overlay,
  onChange,
  errors,
}: TextOverlayFieldsProps) {
  const update = (field: keyof TextOverlayData, value: string) => {
    onChange({ ...overlay, [field]: value });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>Headline *</Label>
        <Input
          value={overlay.headline}
          onChange={(e) => update('headline', e.target.value)}
        />
        {errors['textOverlay.headline'] && (
          <p className="text-sm text-destructive">{errors['textOverlay.headline']}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Subheadline</Label>
          <Input
            value={overlay.subheadline}
            onChange={(e) => update('subheadline', e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>CTA Text</Label>
          <Input
            value={overlay.ctaText}
            onChange={(e) => update('ctaText', e.target.value)}
            placeholder="e.g. Shop Now"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Font Color</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={overlay.fontColor}
              onChange={(e) => update('fontColor', e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border border-border"
            />
            <span className="text-sm font-mono text-muted-foreground">
              {overlay.fontColor}
            </span>
          </div>
        </div>
        <div className="space-y-1">
          <Label>Position</Label>
          <select
            value={overlay.position}
            onChange={(e) => update('position', e.target.value)}
            className="w-full h-8 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="top">Top</option>
            <option value="center">Center</option>
            <option value="bottom">Bottom</option>
          </select>
        </div>
      </div>
    </div>
  );
}
