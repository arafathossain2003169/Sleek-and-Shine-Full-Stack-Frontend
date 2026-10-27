import { AlertTriangle, Ban, Check, RotateCcw } from 'lucide-react';
import { cn, formatDateTime } from '@/lib/utils';

export interface ProgressHistoryEntry {
  status: string;
  created_at: string;
}

/** The happy path of every order. */
const STEPS = [
  { status: 'pending', label: 'Placed', hint: 'We received your order' },
  { status: 'confirmed', label: 'Confirmed', hint: 'Your order is confirmed' },
  { status: 'processing', label: 'Processing', hint: 'We are preparing it' },
  { status: 'packed', label: 'Packed', hint: 'Packed and ready to ship' },
  { status: 'shipped', label: 'Shipped', hint: 'On its way to you' },
  { status: 'delivered', label: 'Delivered', hint: 'Delivered. Enjoy!' },
] as const;

const OFF_TRACK: Record<string, { label: string; text: string; tone: 'danger' | 'warn'; icon: typeof Ban }> = {
  cancelled: { label: 'Order cancelled', text: 'This order was cancelled and will not be delivered.', tone: 'danger', icon: Ban },
  failed_payment: { label: 'Payment failed', text: 'The payment for this order did not go through.', tone: 'danger', icon: AlertTriangle },
  returned: { label: 'Order returned', text: 'The items were returned to us.', tone: 'warn', icon: RotateCcw },
  refunded: { label: 'Order refunded', text: 'This order was returned and refunded.', tone: 'warn', icon: RotateCcw },
};

const indexOfStatus = (status: string) => STEPS.findIndex((s) => s.status === status);

/** How far along the happy path an order got (also for cancelled/returned ones, using their history). */
export function reachedStep(status: string, history: ProgressHistoryEntry[] = []): number {
  const direct = indexOfStatus(status);
  if (direct >= 0) return direct;
  let best = 0;
  for (const h of history) best = Math.max(best, indexOfStatus(h.status));
  return Math.max(best, 0);
}

export function progressPercent(status: string, history: ProgressHistoryEntry[] = []): number {
  return Math.round((reachedStep(status, history) / (STEPS.length - 1)) * 100);
}

function stepTime(status: string, history: ProgressHistoryEntry[]) {
  const entry = history.find((h) => h.status === status);
  return entry ? formatDateTime(entry.created_at) : null;
}

/**
 * Full order tracker: horizontal on wide screens, vertical on phones.
 * Orders that left the happy path (cancelled, failed payment, returned, refunded) show a banner and
 * keep the steps they actually completed.
 */
export function OrderProgress({ status, history = [] }: { status: string; history?: ProgressHistoryEntry[] }) {
  const off = OFF_TRACK[status];
  const current = reachedStep(status, history);
  const done = status === 'delivered';
  const percent = progressPercent(status, history);

  return (
    <div>
      {off && (
        <div role="status" className={cn('mb-5 flex items-start gap-3 rounded-lg border p-3 text-sm',
          off.tone === 'danger' ? 'border-destructive/30 bg-destructive/5 text-destructive' : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400')}>
          <off.icon className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">{off.label}</p>
            <p className="opacity-90">{off.text}</p>
          </div>
        </div>
      )}

      <p className="sr-only" aria-live="polite">
        {off ? off.label : `Step ${current + 1} of ${STEPS.length}: ${STEPS[current].label}`}
      </p>

      {/* wide screens: horizontal tracker with a filling bar */}
      <div className="hidden md:block">
        <div className="relative px-4">
          <div className="absolute left-[calc(1rem+1.25rem)] right-[calc(1rem+1.25rem)] top-5 h-1 -translate-y-1/2 rounded-full bg-muted" aria-hidden="true">
            <div
              className={cn('h-full rounded-full transition-all duration-700', off?.tone === 'danger' ? 'bg-destructive/60' : 'bg-accent')}
              style={{ width: `${percent}%` }}
            />
          </div>
          <ol className="relative flex justify-between" aria-label="Order progress">
            {STEPS.map((step, i) => {
              const reached = i <= current;
              const isCurrent = i === current && !done && !off;
              const time = stepTime(step.status, history);
              return (
                <li key={step.status} className="flex w-24 flex-col items-center text-center" aria-current={isCurrent ? 'step' : undefined}>
                  <span className={cn(
                    'z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors',
                    reached ? (off?.tone === 'danger' ? 'border-destructive/60 bg-destructive/60 text-white' : 'border-accent bg-accent text-accent-foreground') : 'border-border bg-background text-muted-foreground',
                    isCurrent && 'ring-4 ring-accent/20'
                  )}>
                    {reached && (i < current || done || off) ? <Check className="h-4 w-4" /> : i + 1}
                  </span>
                  <span className={cn('mt-2 text-sm', reached ? 'font-medium text-foreground' : 'text-muted-foreground')}>{step.label}</span>
                  <span className="mt-0.5 min-h-8 text-[11px] leading-tight text-muted-foreground">{time ?? (isCurrent ? step.hint : '')}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {/* phones: vertical tracker */}
      <ol className="md:hidden" aria-label="Order progress">
        {STEPS.map((step, i) => {
          const reached = i <= current;
          const isCurrent = i === current && !done && !off;
          const last = i === STEPS.length - 1;
          const time = stepTime(step.status, history);
          return (
            <li key={step.status} className="relative flex gap-3 pb-5 last:pb-0" aria-current={isCurrent ? 'step' : undefined}>
              {!last && (
                <span aria-hidden="true" className={cn('absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-0.5', i < current ? (off?.tone === 'danger' ? 'bg-destructive/60' : 'bg-accent') : 'bg-border')} />
              )}
              <span className={cn(
                'z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-medium',
                reached ? (off?.tone === 'danger' ? 'border-destructive/60 bg-destructive/60 text-white' : 'border-accent bg-accent text-accent-foreground') : 'border-border bg-background text-muted-foreground',
                isCurrent && 'ring-4 ring-accent/20'
              )}>
                {reached && (i < current || done || off) ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <div className="pt-1">
                <p className={cn('text-sm', reached ? 'font-medium' : 'text-muted-foreground')}>{step.label}</p>
                <p className="text-xs text-muted-foreground">{time ?? (isCurrent ? step.hint : '')}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Slim progress bar for lists ("Shipped · 4 of 6"). */
export function OrderProgressBar({ status, history = [] }: { status: string; history?: ProgressHistoryEntry[] }) {
  const off = OFF_TRACK[status];
  const current = reachedStep(status, history);
  const percent = off ? progressPercent(status, history) : Math.round(((current + 1) / STEPS.length) * 100);

  return (
    <div className="w-full">
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={off ? off.label : `Order progress: ${STEPS[current].label}`}
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
      >
        <div className={cn('h-full rounded-full transition-all', off?.tone === 'danger' ? 'bg-destructive/60' : off ? 'bg-amber-500' : 'bg-accent')} style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {off ? off.label : status === 'delivered' ? 'Delivered' : `${STEPS[current].label} · step ${current + 1} of ${STEPS.length}`}
      </p>
    </div>
  );
}
