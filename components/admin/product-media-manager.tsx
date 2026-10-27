'use client';

import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Upload, Star, Trash2 } from 'lucide-react';
import { adminApi } from '@/lib/api/admin';
import { getErrorMessage } from '@/lib/api/errors';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { SafeImage } from '@/components/shared/safe-image';
import { ProductImage } from '@/types/product';
import { toast } from '@/stores/toast.store';
import { cn } from '@/lib/utils';

const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif'; // exactly what the server accepts

export function ProductMediaManager({ productId, images }: { productId: string; images: ProductImage[] }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin', 'products', productId] });

  async function handleFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setIsUploading(true);
    let uploaded = 0;
    for (const file of files) {
      if (file.size > MAX_BYTES) {
        toast({ title: `${file.name} is too large`, description: 'Maximum size is 8MB.', variant: 'destructive' });
        continue;
      }
      try {
        await adminApi.products.uploadImage(productId, file, { isMain: images.length === 0 && uploaded === 0 });
        uploaded += 1;
      } catch (err) {
        toast({ title: `Could not upload ${file.name}`, description: getErrorMessage(err), variant: 'destructive' });
      }
    }
    if (uploaded > 0) toast({ title: `${uploaded} image${uploaded > 1 ? 's' : ''} uploaded`, variant: 'success' });
    await refresh();
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSetMain(imageId: string) {
    setBusyId(imageId);
    try {
      await adminApi.products.updateImage(productId, imageId, { isMain: true });
      await refresh();
    } catch (err) {
      toast({ title: 'Could not set main image', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setBusyId(deleteTarget);
    try {
      await adminApi.products.deleteImage(productId, deleteTarget);
      toast({ title: 'Image removed', variant: 'success' });
      await refresh();
    } catch (err) {
      toast({ title: 'Could not remove image', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setBusyId(null);
      setDeleteTarget(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {images.map((img) => (
          <div key={img.id} className={cn('flex flex-col gap-2', busyId === img.id && 'opacity-60')}>
            <div className="relative aspect-square overflow-hidden rounded-md border border-border">
              <SafeImage src={img.url} alt={img.altText ?? ''} fill sizes="200px" className="object-cover" />
              {img.isMain && (
                <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground">
                  <Star className="h-2.5 w-2.5 fill-current" /> Main
                </span>
              )}
            </div>
            {/* Controls are always visible (the old hover-only delete button was unusable on touch screens). */}
            <div className="flex gap-1">
              {!img.isMain && (
                <Button type="button" variant="outline" size="sm" className="flex-1 text-xs" disabled={busyId === img.id} onClick={() => handleSetMain(img.id)}>
                  Make main
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(img.isMain && 'flex-1')}
                disabled={busyId === img.id}
                onClick={() => setDeleteTarget(img.id)}
                aria-label="Delete image"
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className={cn(
            'flex aspect-square flex-col items-center justify-center gap-1.5 rounded-md border-2 border-dashed border-border text-muted-foreground hover:border-accent hover:text-accent',
            isUploading && 'opacity-50'
          )}
        >
          <Upload className="h-5 w-5" />
          <span className="text-xs">{isUploading ? 'Uploading...' : 'Upload'}</span>
        </button>
      </div>
      <input ref={fileInputRef} type="file" multiple accept={ACCEPT} className="hidden" onChange={handleFilesChange} aria-label="Upload product images" />
      <p className="text-xs text-muted-foreground">
        JPEG, PNG, WEBP or AVIF up to 8MB each. The main image is shown first in the store.
      </p>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this image?"
        description="The image will be removed from the product and from storage."
        onConfirm={handleDelete}
        isLoading={busyId === deleteTarget && !!deleteTarget}
      />
    </div>
  );
}
