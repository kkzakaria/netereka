export type UserRole = "customer" | "admin" | "super_admin";
export type AuthProvider = "email" | "google" | "apple";

export interface User {
  id: string;
  email: string;
  phone: string | null;
  password_hash: string | null;
  first_name: string;
  last_name: string;
  role: UserRole;
  auth_provider: AuthProvider;
  avatar_url: string | null;
  is_verified: number;
  created_at: string;
  updated_at: string;
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

export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  is_verified: number;
  created_at: string;
}
