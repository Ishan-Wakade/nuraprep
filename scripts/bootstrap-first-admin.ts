import { config } from "dotenv";
import { Pool } from "pg";

config({ path: ".env.local", quiet: true });

void main();

async function main() {
  if (!process.argv.includes("--confirm-first-admin")) {
    throw new Error(
      "No database changes made. Pass --confirm-first-admin after verifying the target account and database.",
    );
  }
  const databaseUrl = process.env.DATABASE_URL;
  const requestedEmail = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim();
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");
  if (!requestedEmail || requestedEmail.length > 320) {
    throw new Error(
      "BOOTSTRAP_ADMIN_EMAIL must contain the exact verified account email.",
    );
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended('nuraprep-first-admin-bootstrap', 0))",
    );
    const target = await client.query<{
      id: string;
      email_verified: boolean;
    }>(
      `SELECT id, email_verified
         FROM auth_users
        WHERE lower(email) = lower($1)
        FOR UPDATE`,
      [requestedEmail],
    );
    if (target.rows.length !== 1 || !target.rows[0]?.email_verified) {
      throw new Error(
        "Exactly one verified account must match BOOTSTRAP_ADMIN_EMAIL. Sign in with Google first.",
      );
    }
    const userId = target.rows[0].id;
    const activeAdmins = await client.query<{ user_id: string }>(
      `SELECT user_id
         FROM auth_role_grants
        WHERE role = 'ADMIN' AND revoked_at IS NULL
        FOR UPDATE`,
    );
    if (activeAdmins.rows.some((grant) => grant.user_id !== userId)) {
      throw new Error(
        "An active administrator already exists. Use the authenticated admin interface for future grants.",
      );
    }
    if (activeAdmins.rows.some((grant) => grant.user_id === userId)) {
      await client.query("COMMIT");
      process.stdout.write(
        `${JSON.stringify({ status: "ALREADY_BOOTSTRAPPED" }, null, 2)}\n`,
      );
      return;
    }

    await client.query(
      `INSERT INTO auth_role_grants
         (user_id, role, granted_by, reason)
       VALUES
         ($1, 'ADMIN', $1, $2)`,
      [
        userId,
        "Initial production administrator bootstrap after verified Google sign-in. Future grants require an authenticated administrator.",
      ],
    );
    await client.query(
      `INSERT INTO account_audit_events
         (user_id, event_type, actor_id, metadata)
       VALUES
         ($1, 'ADMIN_ROLE_BOOTSTRAPPED', $1, $2::jsonb)`,
      [
        userId,
        JSON.stringify({
          method: "one-time-cli",
          targetVerified: true,
          reason:
            "Establish the first production administrator; future grants use the application workflow.",
        }),
      ],
    );
    await client.query("COMMIT");
    process.stdout.write(
      `${JSON.stringify({ status: "ADMIN_BOOTSTRAPPED" }, null, 2)}\n`,
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}
