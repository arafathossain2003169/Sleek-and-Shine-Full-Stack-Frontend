export interface ProductImage {
  id: string;
  url: string;
  altText?: string | null;
  sortOrder?: number;
  isMain?: boolean;
}

export interface ProductVariant {
  id: string;
  name: string;
  sku?: string | null;
  price: number | null;
  salePrice: number | null;
  finalPrice?: number;
  stockQuantity: number;
  attributes: Record<string, unknown>;
  imageUrl?: string | null;
  status: 'active' | 'inactive';
  images?: ProductImage[];
}

export interface ProductSummary {
  id: string;
  name: string;
  slug: string;
  shortDescription?: string | null;
  brand: { id: string; name: string; slug: string } | null;
  category: { id: string; name: string; slug: string } | null;
  basePrice: number;
  salePrice: number | null;
  finalPrice?: number;
  currency: string;
  stockStatus: string;
  hasVariants?: boolean;
  status?: string;
  isFeatured: boolean;
  isNewArrival: boolean;
  isOffer: boolean;
  attributes: Record<string, unknown>;
  attributeDetails?: { slug: string; name: string; type: string; value: unknown }[];
  images: ProductImage[];
}

export interface ProductDetail extends ProductSummary {
  fullDescription?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  variants: ProductVariant[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  parent_id?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

export interface CategoryTreeNode {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  children: CategoryTreeNode[];
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logo_url?: string | null;
  is_active?: boolean;
}

export interface AttributeDefinition {
  id: string;
  name: string;
  slug: string;
  type:
    | 'text' | 'number' | 'select' | 'multiselect' | 'boolean'
    | 'richtext' | 'date' | 'color' | 'measurement';
  predefined_values: unknown[];
  is_required: boolean;
  is_filterable: boolean;
  is_visible: boolean;
  applies_to: 'product' | 'variant' | 'both';
  sort_order: number;
}
