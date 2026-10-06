import "dotenv/config";
import { z } from "zod";

const environmentSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DATABASE_SSL: z
    .enum(["true", "false"])
    .default(process.env.VERCEL ? "true" : "false"),
  DATABASE_POOL_MAX: z.coerce
    .number()
    .int()
    .min(1)
    .max(50)
    .default(process.env.VERCEL ? 1 : 10),
  API_PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  STORE_SLUG: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(63)
    .default("kijiji-works"),
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:5173")
    .transform((value) => value.split(",").map((origin) => origin.trim()))
    .pipe(z.array(z.string().url()).min(1)),
});

const result = environmentSchema.safeParse(process.env);
if (!result.success) {
  const invalidFields = result.error.issues
    .map((issue) => issue.path.join("."))
    .join(", ");
  throw new Error(`Invalid environment configuration: ${invalidFields}`);
}

export const config = {
  databaseUrl: result.data.DATABASE_URL,
  databaseSsl: result.data.DATABASE_SSL === "true",
  databasePoolMax: result.data.DATABASE_POOL_MAX,
  apiPort: result.data.API_PORT,
  environment: result.data.NODE_ENV,
  storeSlug: result.data.STORE_SLUG,
  corsOrigins: [
    ...new Set([
      ...result.data.CORS_ORIGINS,
      ...[
        process.env.VERCEL_URL,
        process.env.VERCEL_PROJECT_PRODUCTION_URL,
      ]
        .filter(Boolean)
        .map((hostname) => `https://${hostname}`),
    ]),
  ],
};
