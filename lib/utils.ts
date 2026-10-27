import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const DEFAULT_CURRENCY = process.env.NEXT_PUBLIC_CURRENCY ?? 'USD';

export function formatCurrency(amount: number | string | null | undefined, currency = DEFAULT_CURRENCY): string {
  const n = typeof amount === 'string' ? Number(amount) : amount;
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(date);
}

export function getDiscountPercent(basePrice: number, salePrice: number | null | undefined): number | null {
  if (salePrice === null || salePrice === undefined) return null;
  if (!Number.isFinite(basePrice) || !Number.isFinite(salePrice)) return null;
  if (salePrice <= 0 || salePrice >= basePrice) return null;
  return Math.round(((basePrice - salePrice) / basePrice) * 100);
}

/**
 * Only allow same-site relative redirects ("/account", "/checkout?x=1").
 * Blocks "https://evil.example", "//evil.example" and "/\\evil.example" (open-redirect attempts).
 */
export function safeRedirect(target: string | null | undefined, fallback = '/account'): string {
  if (!target) return fallback;
  if (!target.startsWith('/') || target.startsWith('//') || target.includes('\\')) return fallback;
  return target;
}

/** Links coming from the CMS: allow same-site paths and http(s) only (never javascript:, data:, ...). */
export function safeHref(target: string | null | undefined, fallback = '/shop'): string {
  if (!target) return fallback;
  if (target.startsWith('/') && !target.startsWith('//')) return target;
  return /^https?:\/\/[^\s]+$/i.test(target) ? target : fallback;
}

/** crypto.randomUUID() only exists on secure origins; fall back for http://192.168.x.x testing. */
export function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number) {
  let t: ReturnType<typeof setTimeout> | undefined;
  const wrapped = (...args: A) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
  wrapped.cancel = () => t && clearTimeout(t);
  return wrapped;
}
