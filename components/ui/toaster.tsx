'use client';

import { useEffect } from 'react';
import { X, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToastStore } from '@/stores/toast.store';
import { cn } from '@/lib/utils';

function ToastCard({ id, title, description, variant = 'default' }: {
  id: string; title: string; description?: string; variant?: 'default' | 'destructive' | 'success';
}) {
  const removeToast = useToastStore((s) => s.removeToast);

  useEffect(() => {
    const timer = setTimeout(() => removeToast(id), 4500);
    return () => clearTimeout(timer);
  }, [id, removeToast]);

  return (
    <div
      className={cn(
        'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border p-4 shadow-lg animate-slide-up bg-card',
        variant === 'destructive' && 'border-destructive/50',
        variant === 'success' && 'border-accent/50'
      )}
    >
      {variant === 'success' && <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />}
      {variant === 'destructive' && <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />}
      <div className="flex-1">
        <p className="text-sm font-medium">{title}</p>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      <button onClick={() => removeToast(id)} className="text-muted-foreground hover:text-foreground">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div className="pointer-events-none fixed bottom-20 left-1/2 z-[100] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4 md:bottom-4 md:left-auto md:right-4 md:translate-x-0">
      {toasts.map((t) => (
        <ToastCard key={t.id} {...t} />
      ))}
    </div>
  );
}
