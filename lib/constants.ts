export const SITE_NAME = 'SleeknShine';
export const SITE_TAGLINE = 'Radiance, Redefined';

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  packed: 'Packed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  returned: 'Returned',
  refunded: 'Refunded',
  failed_payment: 'Payment Failed',
};

export const ORDER_STATUS_OPTIONS = Object.keys(ORDER_STATUS_LABELS);

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: 'Unpaid',
  paid: 'Paid',
  failed: 'Failed',
  refunded: 'Refunded',
  partially_refunded: 'Partially Refunded',
};

export const PRODUCT_STATUS_OPTIONS = ['draft', 'published', 'hidden', 'archived'];

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'name_asc', label: 'Name: A to Z' },
  { value: 'discount', label: 'Biggest Discount' },
];

/** Mirrors the backend's allowed order transitions (backend enforces them; this drives the admin UI). */
export const ORDER_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled', 'failed_payment'],
  failed_payment: ['pending', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['packed', 'cancelled'],
  packed: ['shipped', 'cancelled'],
  shipped: ['delivered', 'returned'],
  delivered: ['returned'],
  returned: ['refunded'],
  cancelled: [],
  refunded: [],
};

export const PAYMENT_PROVIDER_LABELS: Record<string, string> = {
  cod: 'Cash on delivery',
  card: 'Card',
  mobile_banking: 'Mobile banking',
  manual: 'Manual payment',
  future_gateway: 'Online payment',
};

export const PAYMENT_STATUS_OPTIONS = Object.keys(PAYMENT_STATUS_LABELS);
