export const SITE_NAME = "NETEREKA";
export const SITE_DESCRIPTION = "Votre boutique électronique en Côte d'Ivoire";
export const SITE_URL = "https://netereka.ci";

export const ORDER_STATUSES = {
  pending: "En attente",
  confirmed: "Confirmée",
  preparing: "En préparation",
  shipping: "En livraison",
  delivered: "Livrée",
  cancelled: "Annulée",
  returned: "Retournée",
} as const;

export const USER_ROLES = {
  customer: "Client",
  admin: "Administrateur",
  super_admin: "Super Admin",
} as const;

export const CURRENCY = "XOF";
export const DEFAULT_CITY = "Abidjan";
export const ITEMS_PER_PAGE = 20;
