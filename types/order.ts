export interface OrderItem {
  id: string;
  productId: string;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  sku: string | null;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

export interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  subtotal: number;
  discount_total: number;
  delivery_fee: number;
  total: number;
  currency: string;
  customer_note?: string | null;
  payment_provider?: string | null;
  can_cancel?: boolean;
  status_history?: { status: string; note: string | null; created_at: string }[];
  shipping_address: {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    zone?: string;
    postalCode?: string;
    country: string;
  };
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

/** What staff get from /admin/orders (adds customer + internal fields). */
export interface AdminOrder extends Order {
  customer_name: string;
  customer_email: string;
  admin_note?: string | null;
  statusHistory?: { status: string; note: string | null; created_at: string; changed_by_name?: string | null }[];
  payments?: { id: string; provider: string; status: string; amount: number | string; transaction_id: string | null; created_at: string }[];
}

export interface CartItem {
  id: string;
  productId: string;
  variantId: string | null;
  slug: string;
  name: string;
  variantName: string | null;
  image: string | null;
  price: number;
  quantity: number;
  subtotal: number;
  stockAvailable: number | null;
  isAvailable: boolean;
  warning: string | null;
}

export interface Cart {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  hasIssues: boolean;
}

export interface CheckoutQuote {
  subtotal: number;
  discountTotal: number;
  deliveryFee: number;
  total: number;
  currency: string;
  couponCode: string | null;
  couponError: string | null;
  freeDeliveryThreshold: number;
  paymentProviders: string[];
}
