const priceFormatter = new Intl.NumberFormat("fr-CI", {
  style: "currency",
  currency: "XOF",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatPrice(amount: number): string {
  return priceFormatter.format(amount);
}

const dateFormatter = new Intl.DateTimeFormat("fr-CI", {
  dateStyle: "long",
});

const dateTimeFormatter = new Intl.DateTimeFormat("fr-CI", {
  dateStyle: "long",
  timeStyle: "short",
});

export function formatDate(date: string | Date): string {
  return dateFormatter.format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return dateTimeFormatter.format(new Date(date));
}
