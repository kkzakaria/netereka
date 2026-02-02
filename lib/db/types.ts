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

export interface DeliveryZone {
  id: string;
  name: string;
  commune: string;
  fee: number;
  estimated_hours: number;
  is_active: number;
}

export interface Address {
  id: string;
  user_id: string;
  label: string;
  full_name: string;
  phone: string;
  street: string;
  city: string;
  commune: string;
  zone_id: string | null;
  instructions: string | null;
  is_default: number;
  created_at: string;
}

export interface Order {
  id: string;
  user_id: string;
  order_number: string;
  status: string;
  subtotal: number;
  delivery_fee: number;
  discount_amount: number;
  total: number;
  promo_code_id: string | null;
  delivery_address: string;
  delivery_commune: string;
  delivery_phone: string;
  delivery_instructions: string | null;
  estimated_delivery: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id: string | null;
  product_name: string;
  variant_name: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface PromoCode {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_amount: number | null;
  max_uses: number | null;
  used_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: number;
  created_at: string;
}
