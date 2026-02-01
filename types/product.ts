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
  low_stock_threshold: number;
  weight_grams: number | null;
  meta_title: string | null;
  meta_description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  sku: string | null;
  price: number;
  compare_price: number | null;
  stock_quantity: number;
  attributes: string;
  is_active: number;
  sort_order: number;
  created_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  alt: string | null;
  sort_order: number;
  is_primary: number;
  created_at: string;
}

export interface ProductAttribute {
  id: string;
  product_id: string;
  name: string;
  value: string;
}

export interface ProductWithDetails extends Product {
  category?: Category;
  variants?: ProductVariant[];
  images?: ProductImage[];
  attributes?: ProductAttribute[];
}
