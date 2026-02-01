import { nanoid } from "nanoid";
import { queryFirst, execute } from "@/lib/db";

export type User = {
  id: string;
  email: string;
  phone: string | null;
  password_hash: string | null;
  first_name: string;
  last_name: string;
  role: "customer" | "admin" | "super_admin";
  auth_provider: string;
  avatar_url: string | null;
  is_verified: number;
  created_at: string;
  updated_at: string;
};

export type SafeUser = Omit<User, "password_hash">;

export async function getUserById(id: string): Promise<User | null> {
  return queryFirst<User>("SELECT * FROM users WHERE id = ?", [id]);
}

export async function getUserByEmail(email: string): Promise<User | null> {
  return queryFirst<User>("SELECT * FROM users WHERE email = ?", [email]);
}

export async function getUserSafe(id: string): Promise<SafeUser | null> {
  return queryFirst<SafeUser>(
    "SELECT id, email, phone, first_name, last_name, role, auth_provider, avatar_url, is_verified, created_at, updated_at FROM users WHERE id = ?",
    [id]
  );
}

export async function createUser(data: {
  email: string;
  password_hash?: string | null;
  first_name: string;
  last_name: string;
  phone?: string | null;
  auth_provider?: string;
  avatar_url?: string | null;
  is_verified?: number;
}): Promise<string> {
  const id = nanoid();
  await execute(
    `INSERT INTO users (id, email, password_hash, first_name, last_name, phone, auth_provider, avatar_url, is_verified)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.email,
      data.password_hash ?? null,
      data.first_name,
      data.last_name,
      data.phone ?? null,
      data.auth_provider ?? "email",
      data.avatar_url ?? null,
      data.is_verified ?? 0,
    ]
  );
  return id;
}

const UPDATABLE_COLUMNS = new Set([
  "first_name",
  "last_name",
  "phone",
  "avatar_url",
  "password_hash",
  "is_verified",
]);

export async function updateUser(
  id: string,
  data: Partial<Pick<User, "first_name" | "last_name" | "phone" | "avatar_url" | "password_hash" | "is_verified">>
): Promise<void> {
  const fields: string[] = [];
  const values: unknown[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && UPDATABLE_COLUMNS.has(key)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (fields.length === 0) return;

  fields.push("updated_at = datetime('now')");
  values.push(id);

  await execute(
    `UPDATE users SET ${fields.join(", ")} WHERE id = ?`,
    values
  );
}
