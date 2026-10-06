import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { pool } from "./db.js";

const migrationsDirectory = fileURLToPath(
  new URL("./migrations/", import.meta.url),
);

async function migrate() {
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const files = (await readdir(migrationsDirectory))
      .filter((name) => name.endsWith(".sql"))
      .sort();

    for (const name of files) {
      const existing = await client.query(
        "SELECT 1 FROM schema_migrations WHERE name = $1",
        [name],
      );
      if (existing.rowCount > 0) continue;

      const sql = await readFile(path.join(migrationsDirectory, name), "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [
          name,
        ]);
        await client.query("COMMIT");
        console.info(
          JSON.stringify({ level: "info", event: "migration_applied", name }),
        );
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((error) => {
  console.error(
    JSON.stringify({
      level: "error",
      event: "migration_failed",
      message: error.message,
    }),
  );
  process.exitCode = 1;
});
