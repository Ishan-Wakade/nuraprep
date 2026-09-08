import "server-only";

import { getDatabasePool } from "@/db/client";

export type PrivilegedAccountSummary = {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  roles: string[];
  activeRoles: string[];
  isPseudonymized: boolean;
};

export async function listPrivilegedAccounts() {
  const result = await getDatabasePool().query<{
    id: string;
    name: string;
    email: string;
    created_at: Date;
    roles: string[];
    active_roles: string[];
    is_pseudonymized: boolean;
  }>(
    `SELECT users.id,
            users.name,
            users.email,
            users.created_at,
            array_agg(DISTINCT grants.role::text ORDER BY grants.role::text)
              AS roles,
            array_agg(DISTINCT grants.role::text ORDER BY grants.role::text)
              FILTER (WHERE grants.revoked_at IS NULL) AS active_roles,
            users.email LIKE 'erased-%@users.invalid' AS is_pseudonymized
     FROM auth_users AS users
     INNER JOIN auth_role_grants AS grants ON grants.user_id = users.id
     WHERE grants.role IN ('REVIEWER', 'ADMIN')
     GROUP BY users.id
     ORDER BY users.created_at ASC`,
  );

  return result.rows.map((row): PrivilegedAccountSummary => ({
    id: row.id,
    name: row.name,
    email: row.email,
    createdAt: row.created_at,
    roles: row.roles,
    activeRoles: row.active_roles ?? [],
    isPseudonymized: row.is_pseudonymized,
  }));
}
