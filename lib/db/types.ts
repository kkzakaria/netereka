export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  parent_id: string | null;
  sort_order: number;
  is_active: number;
  created_at: string;
}

export interface Product {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  base_price: number;
  compare_price: number | null;
  sku: string | null;
  brand: string | null;
  is_active: number;
  is_featured: number;
  stock_quantity: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  image_url?: string | null;
  category_name?: string | null;
  category_slug?: string | null;
  variant_count?: number;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  sku: string | null;
  price: number;
  compare_price: number | null;
  stock_quantity: number;
  attributes: string; // JSON string
  is_active: number;
  sort_order: number;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  alt: string | null;
  sort_order: number;
  is_primary: number;
}

export interface ProductDetail extends Product {
  images: ProductImage[];
  variants: ProductVariant[];
}

export interface ParsedVariantAttributes {
  color?: string;
  storage?: string;
  ram?: string;
  [key: string]: string | undefined;
}
