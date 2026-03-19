'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { HeroImageUpload } from './HeroImageUpload';
import { LogoUpload } from './LogoUpload';

interface ProductData {
  name: string;
  slug: string;
  description: string;
  heroImagePrompt: string;
  brandColors: string[];
  heroImageUploaded?: boolean;
  logoUploaded?: boolean;
}

interface ProductFieldsetProps {
  index: number;
  product: ProductData;
  onChange: (index: number, product: ProductData) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
  errors: Record<string, string>;
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function ProductFieldset({
  index,
  product,
  onChange,
  onRemove,
  canRemove,
  errors,
}: ProductFieldsetProps) {
  const update = (field: keyof ProductData, value: string | string[]) => {
    const updated = { ...product, [field]: value };
    if (field === 'name' && product.slug === toSlug(product.name)) {
      updated.slug = toSlug(value as string);
    }
    onChange(index, updated);
  };

  const prefix = `products.${index}`;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">Product {index + 1}</span>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => onRemove(index)}
            className="text-destructive"
          >
            Remove
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Name *</Label>
          <Input
            value={product.name}
            onChange={(e) => update('name', e.target.value)}
          />
          {errors[`${prefix}.name`] && (
            <p className="text-sm text-destructive">{errors[`${prefix}.name`]}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label>Slug *</Label>
          <Input
            value={product.slug}
            onChange={(e) => update('slug', e.target.value)}
            className="font-mono"
          />
          {errors[`${prefix}.slug`] && (
            <p className="text-sm text-destructive">{errors[`${prefix}.slug`]}</p>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <Label>Description *</Label>
        <Textarea
          value={product.description}
          onChange={(e) => update('description', e.target.value)}
          rows={2}
        />
        {errors[`${prefix}.description`] && (
          <p className="text-sm text-destructive">{errors[`${prefix}.description`]}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label>Hero Image</Label>
        <HeroImageUpload
          slug={product.slug}
          onUploadComplete={(s3Key) => {
            onChange(index, { ...product, heroImageUploaded: !!s3Key });
          }}
        />
      </div>

      <div className="space-y-1">
        <Label>Product Logo</Label>
        <LogoUpload
          slug={product.slug}
          onUploadComplete={(s3Key) => {
            onChange(index, { ...product, logoUploaded: !!s3Key });
          }}
        />
      </div>

      <div className="space-y-1">
        <Label className={product.heroImageUploaded ? 'text-muted-foreground' : ''}>
          Hero Image Prompt
        </Label>
        {product.heroImageUploaded && (
          <p className="text-xs text-muted-foreground">
            Using uploaded image — prompt will be ignored
          </p>
        )}
        <Textarea
          value={product.heroImagePrompt}
          onChange={(e) => update('heroImagePrompt', e.target.value)}
          rows={2}
          placeholder="Describe the product image to generate..."
          disabled={product.heroImageUploaded}
          className={product.heroImageUploaded ? 'opacity-50' : ''}
        />
      </div>

      <div className="space-y-1">
        <Label>Brand Colors</Label>
        <div className="flex gap-2 items-center flex-wrap">
          {product.brandColors.map((color, i) => (
            <div key={i} className="flex items-center gap-1">
              <input
                type="color"
                value={color}
                onChange={(e) => {
                  const colors = [...product.brandColors];
                  colors[i] = e.target.value;
                  update('brandColors', colors);
                }}
                className="w-8 h-8 rounded cursor-pointer border border-border"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => {
                  const colors = product.brandColors.filter((_, j) => j !== i);
                  update('brandColors', colors);
                }}
                className="text-muted-foreground hover:text-destructive"
              >
                x
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={() => update('brandColors', [...product.brandColors, '#000000'])}
          >
            + Add Color
          </Button>
        </div>
      </div>
    </Card>
  );
}
