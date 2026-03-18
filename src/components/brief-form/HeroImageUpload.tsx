'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, X, Check, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { uploadProductHero } from '@/lib/api';

type UploadState = 'idle' | 'uploading' | 'uploaded' | 'error';

interface HeroImageUploadProps {
  slug: string;
  onUploadComplete: (s3Key: string | null) => void;
}

export function HeroImageUpload({ slug, onUploadComplete }: HeroImageUploadProps) {
  const [state, setState] = useState<UploadState>('idle');
  const [preview, setPreview] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [heldFile, setHeldFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevSlugRef = useRef(slug);

  const doUpload = useCallback(async (file: File, targetSlug: string) => {
    if (!targetSlug) {
      setErrorMsg('Enter a product slug before uploading.');
      setState('error');
      return;
    }

    setState('uploading');
    setErrorMsg(null);

    try {
      const result = await uploadProductHero(targetSlug, file);
      setState('uploaded');
      onUploadComplete(result.key);
    } catch (err) {
      setState('error');
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed');
      onUploadComplete(null);
    }
  }, [onUploadComplete]);

  // Re-upload when slug changes after a successful upload
  useEffect(() => {
    if (prevSlugRef.current !== slug && heldFile && state === 'uploaded') {
      doUpload(heldFile, slug);
    }
    prevSlugRef.current = slug;
  }, [slug, heldFile, state, doUpload]);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select an image file.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Image must be under 10MB.');
      return;
    }

    // Show local preview
    setPreview(URL.createObjectURL(file));
    setHeldFile(file);
    doUpload(file, slug);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleRemove = () => {
    setState('idle');
    setPreview(null);
    setErrorMsg(null);
    setHeldFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onUploadComplete(null);
  };

  if (state === 'uploaded' && preview) {
    return (
      <div className="relative rounded-md border border-border overflow-hidden">
        <img
          src={preview}
          alt="Product hero preview"
          className="w-full h-32 object-cover"
        />
        <div className="absolute top-2 right-2 flex gap-1">
          <span className="inline-flex items-center gap-1 bg-green-600 text-white text-xs px-2 py-1 rounded">
            <Check className="w-3 h-3" /> Uploaded
          </span>
          <Button
            type="button"
            variant="secondary"
            size="icon-xs"
            onClick={handleRemove}
            className="bg-white/90 hover:bg-white"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-md p-4 text-center cursor-pointer transition-colors
          ${state === 'error' ? 'border-destructive/50 bg-destructive/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/50'}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />

        {state === 'uploading' ? (
          <div className="flex flex-col items-center gap-1 text-muted-foreground py-1">
            <LoaderCircle className="w-5 h-5 animate-spin" />
            <span className="text-xs">Uploading...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground py-1">
            <Upload className="w-5 h-5" />
            <span className="text-xs">Drop an image or click to browse</span>
          </div>
        )}
      </div>

      {errorMsg && (
        <p className="text-sm text-destructive mt-1">{errorMsg}</p>
      )}
    </div>
  );
}
