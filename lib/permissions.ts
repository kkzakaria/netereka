/**
 * Team Permissions System
 *
 * Permissions are stored as JSON array in team_members.permissions
 * Format: ["products:read", "products:write", "orders:read", ...]
 */

// All available permissions
export const PERMISSIONS = {
  // Products & Categories
  PRODUCTS_READ: "products:read",
  PRODUCTS_WRITE: "products:write",

  // Orders
  ORDERS_READ: "orders:read",
  ORDERS_WRITE: "orders:write",
  ORDERS_ASSIGN: "orders:assign",

  // Customers
  CUSTOMERS_READ: "customers:read",
  CUSTOMERS_WRITE: "customers:write",

  // Team Management
  TEAM_READ: "team:read",
  TEAM_WRITE: "team:write",

  // Reports & Dashboard
  REPORTS_READ: "reports:read",

  // Deliveries
  DELIVERIES_READ: "deliveries:read",
  DELIVERIES_WRITE: "deliveries:write",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// Team roles (stored in user.role)
export type TeamRole =
  | "super_admin"
  | "admin"
  | "delivery"      // Livreur
  | "support"       // Service client
  | "accountant";   // Comptable

// All roles including customer
export type UserRole = "customer" | TeamRole;

// Role labels in French
export const TEAM_ROLE_LABELS: Record<TeamRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  delivery: "Livreur",
  support: "Service Client",
  accountant: "Comptable",
};

// Role badge variants
export const TEAM_ROLE_VARIANTS: Record<TeamRole, "default" | "secondary" | "destructive" | "outline"> = {
  super_admin: "destructive",
  admin: "default",
  delivery: "secondary",
  support: "secondary",
  accountant: "outline",
};

// Role options for forms
export const TEAM_ROLE_OPTIONS: { value: TeamRole; label: string; description: string }[] = [
  { value: "admin", label: "Admin", description: "Accès complet à la gestion" },
  { value: "delivery", label: "Livreur", description: "Gestion des livraisons" },
  { value: "support", label: "Service Client", description: "Support et relation client" },
  { value: "accountant", label: "Comptable", description: "Rapports et finances" },
  { value: "super_admin", label: "Super Admin", description: "Accès total (gestion équipe)" },
];

// Permission labels in French
export const PERMISSION_LABELS: Record<Permission, string> = {
  "products:read": "Voir les produits",
  "products:write": "Gérer les produits",
  "orders:read": "Voir les commandes",
  "orders:write": "Modifier les commandes",
  "orders:assign": "Assigner les livraisons",
  "customers:read": "Voir les clients",
  "customers:write": "Gérer les clients",
  "team:read": "Voir l'équipe",
  "team:write": "Gérer l'équipe",
  "reports:read": "Voir les rapports",
  "deliveries:read": "Voir les livraisons",
  "deliveries:write": "Gérer les livraisons",
};

// Permission groups for UI
export const PERMISSION_GROUPS: { label: string; permissions: Permission[] }[] = [
  {
    label: "Produits",
    permissions: [PERMISSIONS.PRODUCTS_READ, PERMISSIONS.PRODUCTS_WRITE],
  },
  {
    label: "Commandes",
    permissions: [PERMISSIONS.ORDERS_READ, PERMISSIONS.ORDERS_WRITE, PERMISSIONS.ORDERS_ASSIGN],
  },
  {
    label: "Clients",
    permissions: [PERMISSIONS.CUSTOMERS_READ, PERMISSIONS.CUSTOMERS_WRITE],
  },
  {
    label: "Équipe",
    permissions: [PERMISSIONS.TEAM_READ, PERMISSIONS.TEAM_WRITE],
  },
  {
    label: "Livraisons",
    permissions: [PERMISSIONS.DELIVERIES_READ, PERMISSIONS.DELIVERIES_WRITE],
  },
  {
    label: "Rapports",
    permissions: [PERMISSIONS.REPORTS_READ],
  },
];

// Default permissions per role
export const DEFAULT_PERMISSIONS: Record<TeamRole, Permission[]> = {
  super_admin: Object.values(PERMISSIONS), // All permissions
  admin: [
    PERMISSIONS.PRODUCTS_READ,
    PERMISSIONS.PRODUCTS_WRITE,
    PERMISSIONS.ORDERS_READ,
    PERMISSIONS.ORDERS_WRITE,
    PERMISSIONS.ORDERS_ASSIGN,
    PERMISSIONS.CUSTOMERS_READ,
    PERMISSIONS.CUSTOMERS_WRITE,
    PERMISSIONS.TEAM_READ,
    PERMISSIONS.REPORTS_READ,
    PERMISSIONS.DELIVERIES_READ,
  ],
  delivery: [
    PERMISSIONS.ORDERS_READ,
    PERMISSIONS.DELIVERIES_READ,
    PERMISSIONS.DELIVERIES_WRITE,
  ],
  support: [
    PERMISSIONS.ORDERS_READ,
    PERMISSIONS.CUSTOMERS_READ,
    PERMISSIONS.CUSTOMERS_WRITE,
  ],
  accountant: [
    PERMISSIONS.ORDERS_READ,
    PERMISSIONS.REPORTS_READ,
  ],
};

/**
 * Check if a user has a specific permission
 */
export function hasPermission(
  userRole: UserRole,
  userPermissions: string | null,
  permission: Permission
): boolean {
  // Customers have no admin permissions
  if (userRole === "customer") return false;

  // Super admin has all permissions
  if (userRole === "super_admin") return true;

  // Parse stored permissions or use defaults
  let permissions: Permission[];
  if (userPermissions) {
    try {
      permissions = JSON.parse(userPermissions) as Permission[];
    } catch {
      permissions = DEFAULT_PERMISSIONS[userRole as TeamRole] || [];
    }
  } else {
    permissions = DEFAULT_PERMISSIONS[userRole as TeamRole] || [];
  }

  return permissions.includes(permission);
}

/**
 * Check if a user has any of the specified permissions
 */
export function hasAnyPermission(
  userRole: UserRole,
  userPermissions: string | null,
  requiredPermissions: Permission[]
): boolean {
  return requiredPermissions.some(p => hasPermission(userRole, userPermissions, p));
}

/**
 * Check if a user has all of the specified permissions
 */
export function hasAllPermissions(
  userRole: UserRole,
  userPermissions: string | null,
  requiredPermissions: Permission[]
): boolean {
  return requiredPermissions.every(p => hasPermission(userRole, userPermissions, p));
}

/**
 * Get effective permissions for a user (considering role defaults)
 */
export function getEffectivePermissions(
  userRole: UserRole,
  userPermissions: string | null
): Permission[] {
  if (userRole === "customer") return [];
  if (userRole === "super_admin") return Object.values(PERMISSIONS);

  if (userPermissions) {
    try {
      return JSON.parse(userPermissions) as Permission[];
    } catch {
      return DEFAULT_PERMISSIONS[userRole as TeamRole] || [];
    }
  }

  return DEFAULT_PERMISSIONS[userRole as TeamRole] || [];
}

/**
 * Check if a role can manage another role
 */
export function canManageRole(managerRole: TeamRole, targetRole: TeamRole): boolean {
  // Only super_admin can manage other super_admins
  if (targetRole === "super_admin") {
    return managerRole === "super_admin";
  }

  // super_admin and admin can manage other roles
  return managerRole === "super_admin" || managerRole === "admin";
}
