import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("fr-CI", { style: "decimal" }).format(price) + " FCFA";
}

// Date formatting options for order lists (shared across components)
const orderDateFormatOptions: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
};

export function formatOrderDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", orderDateFormatOptions);
}

// Short date format: "25 janv. 2024" (for tables/lists)
const shortDateFormatOptions: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "short",
  year: "numeric",
};

export function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", shortDateFormatOptions);
}

// Long date format: "25 janvier 2024" (for detail pages)
const longDateFormatOptions: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "long",
  year: "numeric",
};

export function formatDateLong(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", longDateFormatOptions);
}

export interface ActionResult {
  success: boolean;
  error?: string;
  id?: string;
  url?: string;
}
