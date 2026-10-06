import pg from "pg";
import { config } from "./config.js";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: config.databasePoolMax,
  ssl: config.databaseSsl ? { rejectUnauthorized: true } : undefined,
});

pool.on("error", (error) => {
  console.error(
    JSON.stringify({
      level: "error",
      event: "database_pool_error",
      errorCode: error.code || error.name,
    }),
  );
});
