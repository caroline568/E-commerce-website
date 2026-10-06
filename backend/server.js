import crypto from "node:crypto";
import cors from "cors";
import express from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import { z } from "zod";
import { pool } from "./db.js";
import { config } from "./config.js";
import {
  createSessionToken,
  hashPassword,
  hashSessionToken,
  readSessionCookie,
  sessionExpiresAt,
  sessionLifetimeSeconds,
  verifyPassword,
} from "./security.js";

const port = config.apiPort;
const storeSlug = config.storeSlug;
const allowedOrigins = config.corsOrigins;

const app = express();
if (process.env.VERCEL) app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(helmet());
app.use((request, response, next) => {
  request.requestId = crypto.randomUUID();
  response.setHeader("X-Request-Id", request.requestId);
  next();
});
app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(
        Object.assign(new Error("Origin is not allowed by CORS."), {
          status: 403,
        }),
      );
    },
  }),
);
app.use(express.json({ limit: "100kb" }));

const publicReadLimit = rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});
app.use("/api/v1", publicReadLimit);

const authWriteLimit = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

function requireTrustedOrigin(request, response, next) {
  const origin = request.get("origin");
  if (origin && !allowedOrigins.includes(origin)) {
    response.status(403).json({
      error: {
        code: "ORIGIN_NOT_ALLOWED",
        message: "This request origin is not allowed.",
        requestId: request.requestId,
      },
    });
    return;
  }
  next();
}

const cookieName = "mavera_session";
const cookieOptions = `Path=/; HttpOnly; SameSite=Lax; Max-Age=${sessionLifetimeSeconds}`;
const secureCookieOption =
  config.environment === "production" ? "; Secure" : "";

function setSessionCookie(response, token) {
  response.setHeader(
    "Set-Cookie",
    `${cookieName}=${token}; ${cookieOptions}${secureCookieOption}`,
  );
}

function clearSessionCookie(response) {
  response.setHeader(
    "Set-Cookie",
    `${cookieName}=; ${cookieOptions.replace(`Max-Age=${sessionLifetimeSeconds}`, "Max-Age=0")}${secureCookieOption}`,
  );
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    role: user.role,
  };
}

async function saveSession(storeId, userId, database = pool) {
  const token = createSessionToken();
  await database.query(
    `INSERT INTO auth_sessions (store_id, user_id, token_hash, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [storeId, userId, hashSessionToken(token), sessionExpiresAt()],
  );
  return token;
}

async function findStore() {
  const result = await pool.query(
    `SELECT id, slug, name, tagline, description, logo_url AS "logoUrl",
            favicon_url AS "faviconUrl", domain, currency, country, locale,
            timezone, theme,
            jsonb_strip_nulls(jsonb_build_object(
              'announcement', settings->'announcement',
              'navigation', settings->'navigation',
              'homepageSections', settings->'homepageSections',
              'themeTokens', settings->'themeTokens'
            )) AS settings
       FROM stores
      WHERE slug = $1 AND status = 'active'`,
    [storeSlug],
  );
  return result.rows[0] ?? null;
}

const registrationSchema = z.object({
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
  password: z.string().min(12).max(128),
  displayName: z.string().trim().min(2).max(100),
});

const loginSchema = z.object({
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
  password: z.string().min(1).max(128),
});

const dummyPasswordHash = await hashPassword(
  "mavera-invalid-account-password",
);

app.get("/api/v1/auth/session", async (request, response, next) => {
  try {
    const token = readSessionCookie(request.headers.cookie, cookieName);
    if (!token || !/^[a-f0-9]{64}$/.test(token)) {
      response.json({ data: { user: null } });
      return;
    }
    const result = await pool.query(
      `SELECT u.id, u.email, u.display_name, u.role
         FROM auth_sessions s
         JOIN users u ON u.store_id = s.store_id AND u.id = s.user_id
        WHERE s.store_id = (SELECT id FROM stores WHERE slug = $2)
          AND s.token_hash = $1 AND s.expires_at > now()`,
      [hashSessionToken(token), storeSlug],
    );
    response.json({
      data: { user: result.rowCount ? publicUser(result.rows[0]) : null },
    });
  } catch (error) {
    next(error);
  }
});

app.post(
  "/api/v1/auth/register",
  authWriteLimit,
  requireTrustedOrigin,
  async (request, response, next) => {
    const parsed = registrationSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Check the account details and try again.",
          details: parsed.error.issues.map(({ path, message }) => ({
            field: path.join("."),
            message,
          })),
          requestId: request.requestId,
        },
      });
      return;
    }

    try {
      const store = await findStore();
      if (!store) {
        response.status(404).json({
          error: {
            code: "STORE_NOT_FOUND",
            message: "The requested storefront is not configured.",
            requestId: request.requestId,
          },
        });
        return;
      }
      const passwordHash = await hashPassword(parsed.data.password);
      const client = await pool.connect();
      let result;
      let sessionToken;
      try {
        await client.query("BEGIN");
        result = await client.query(
          `INSERT INTO users (store_id, email, password_hash, display_name)
           VALUES ($1, $2, $3, $4)
           RETURNING id, email, display_name, role`,
          [store.id, parsed.data.email, passwordHash, parsed.data.displayName],
        );
        sessionToken = await saveSession(
          store.id,
          result.rows[0].id,
          client,
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
      setSessionCookie(response, sessionToken);
      response.status(201).json({ data: { user: publicUser(result.rows[0]) } });
    } catch (error) {
      if (error.code === "23505") {
        response.status(409).json({
          error: {
            code: "ACCOUNT_CREATION_FAILED",
            message: "The account could not be created with these details.",
            requestId: request.requestId,
          },
        });
        return;
      }
      next(error);
    }
  },
);

app.post(
  "/api/v1/auth/login",
  authWriteLimit,
  requireTrustedOrigin,
  async (request, response, next) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Enter a valid email and password.",
          requestId: request.requestId,
        },
      });
      return;
    }

    try {
      const store = await findStore();
      if (!store) {
        response.status(404).json({
          error: {
            code: "STORE_NOT_FOUND",
            message: "The requested storefront is not configured.",
            requestId: request.requestId,
          },
        });
        return;
      }
      const result = await pool.query(
        `SELECT id, email, password_hash, display_name, role
           FROM users
          WHERE store_id = $1 AND email = $2`,
        [store.id, parsed.data.email],
      );
      const user = result.rows[0];
      const passwordMatches = await verifyPassword(
        parsed.data.password,
        user?.password_hash || dummyPasswordHash,
      );
      if (!user || !passwordMatches) {
        response.status(401).json({
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Email or password is incorrect.",
            requestId: request.requestId,
          },
        });
        return;
      }
      const sessionToken = await saveSession(store.id, user.id);
      setSessionCookie(response, sessionToken);
      response.json({ data: { user: publicUser(user) } });
    } catch (error) {
      next(error);
    }
  },
);

app.post(
  "/api/v1/auth/logout",
  requireTrustedOrigin,
  async (request, response, next) => {
    try {
      const token = readSessionCookie(request.headers.cookie, cookieName);
      if (token && /^[a-f0-9]{64}$/.test(token)) {
        await pool.query("DELETE FROM auth_sessions WHERE token_hash = $1", [
          hashSessionToken(token),
        ]);
      }
      clearSessionCookie(response);
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  },
);

app.get("/health/live", (_request, response) => {
  response.json({ status: "ok" });
});

app.get("/health/ready", async (_request, response, next) => {
  try {
    await pool.query("SELECT 1");
    response.json({ status: "ready" });
  } catch (error) {
    next(error);
  }
});

const searchQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(48).default(24),
  offset: z.coerce.number().int().min(0).max(10_000).default(0),
  sort: z.enum(["newest", "price_asc", "price_desc"]).default("newest"),
});

const productSelection = `
  SELECT p.id, p.slug, p.title, p.summary, p.description, p.story,
         p.provenance, p.specifications, p.materials, p.origin,
         p.edition_label AS "editionLabel",
         p.section_config AS "sectionConfig",
         (SELECT min(variant.price_minor)
            FROM product_variants variant
            JOIN inventory stock ON stock.store_id = variant.store_id
                                AND stock.variant_id = variant.id
           WHERE variant.store_id = p.store_id AND variant.product_id = p.id
             AND variant.status = 'active'
             AND stock.on_hand > stock.reserved) AS minimum_price,
         m.id AS "makerId", m.slug AS "makerSlug", m.display_name AS "makerName",
         m.location AS "makerLocation",
         b.id AS "brandId", b.slug AS "brandSlug", b.name AS "brandName",
         COALESCE((
           SELECT json_agg(json_build_object(
             'id', media.id, 'url', media.url, 'alt', media.alt_text,
             'caption', media.caption, 'position', media.position,
             'role', media.media_role, 'mediaType', media.media_type,
             'posterUrl', media.poster_url,
             'captionsUrl', media.captions_url,
             'captionsLanguage', media.captions_language,
             'transcriptUrl', media.transcript_url,
             'width', media.width, 'height', media.height
           ) ORDER BY media.position)
           FROM product_media media
           WHERE media.store_id = p.store_id AND media.product_id = p.id
             AND media.moderation_status = 'approved'
         ), '[]'::json) AS media,
         COALESCE((
           SELECT json_agg(json_build_object(
             'id', variant.id, 'sku', variant.sku, 'options', variant.options,
             'priceMinor', variant.price_minor, 'currency', variant.currency,
             'availableQuantity', inventory.on_hand - inventory.reserved
           ) ORDER BY variant.created_at)
           FROM product_variants variant
           JOIN inventory ON inventory.store_id = variant.store_id
                         AND inventory.variant_id = variant.id
           WHERE variant.store_id = p.store_id AND variant.product_id = p.id
             AND variant.status = 'active'
             AND inventory.on_hand > inventory.reserved
         ), '[]'::json) AS variants
    FROM products p
    LEFT JOIN makers m ON m.store_id = p.store_id AND m.id = p.maker_id
    LEFT JOIN brands b ON b.store_id = p.store_id AND b.id = p.brand_id
`;

function toProduct(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    description: row.description,
    story: row.story,
    provenance: row.provenance,
    specifications: row.specifications,
    materials: row.materials,
    origin: row.origin,
    editionLabel: row.editionLabel,
    sectionConfig: row.sectionConfig,
    maker: row.makerId
      ? {
          id: row.makerId,
          slug: row.makerSlug,
          displayName: row.makerName,
          location: row.makerLocation,
        }
      : null,
    brand: row.brandId
      ? { id: row.brandId, slug: row.brandSlug, name: row.brandName }
      : null,
    media: row.media,
    variants: row.variants,
  };
}

app.get("/api/v1/storefront", async (_request, response, next) => {
  try {
    const store = await findStore();
    if (!store) {
      response.status(404).json({
        error: {
          code: "STORE_NOT_FOUND",
          message: "The requested storefront is not configured.",
          requestId: _request.requestId,
        },
      });
      return;
    }
    response.json({ data: store });
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/products", async (request, response, next) => {
  try {
    const query = searchQuerySchema.safeParse(request.query);
    if (!query.success) {
      response.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "The product query is invalid.",
          details: query.error.issues.map(({ path, message }) => ({
            field: path.join("."),
            message,
          })),
          requestId: request.requestId,
        },
      });
      return;
    }

    const store = await findStore();
    if (!store) {
      response.status(404).json({
        error: {
          code: "STORE_NOT_FOUND",
          message: "The requested storefront is not configured.",
          requestId: request.requestId,
        },
      });
      return;
    }

    const { q, limit, offset, sort } = query.data;
    const orderBy = {
      newest: "p.created_at DESC",
      price_asc: "minimum_price ASC, p.created_at DESC",
      price_desc: "minimum_price DESC, p.created_at DESC",
    }[sort];
    const result = await pool.query(
      `${productSelection}
        WHERE p.store_id = $1 AND p.status = 'published'
          AND EXISTS (
            SELECT 1
              FROM product_variants available_variant
              JOIN inventory available_inventory
                ON available_inventory.store_id = available_variant.store_id
               AND available_inventory.variant_id = available_variant.id
             WHERE available_variant.store_id = p.store_id
               AND available_variant.product_id = p.id
               AND available_variant.status = 'active'
               AND available_inventory.on_hand > available_inventory.reserved
          )
          AND ($2::text IS NULL OR
               concat_ws(
                 ' ', p.title, p.summary, p.description, m.display_name,
                 b.name, p.origin, array_to_string(p.materials, ' '),
                 p.specifications::text
               ) ILIKE '%' || $2 || '%'
               OR EXISTS (
                 SELECT 1 FROM product_variants search_variant
                  WHERE search_variant.store_id = p.store_id
                    AND search_variant.product_id = p.id
                    AND search_variant.sku ILIKE '%' || $2 || '%'
               )
               OR EXISTS (
                 SELECT 1
                   FROM product_tags search_product_tag
                   JOIN tags search_tag
                     ON search_tag.store_id = search_product_tag.store_id
                    AND search_tag.id = search_product_tag.tag_id
                  WHERE search_product_tag.store_id = p.store_id
                    AND search_product_tag.product_id = p.id
                    AND search_tag.name ILIKE '%' || $2 || '%'
               )
               OR EXISTS (
                 SELECT 1
                   FROM product_categories search_product_category
                   JOIN categories search_category
                     ON search_category.store_id = search_product_category.store_id
                    AND search_category.id = search_product_category.category_id
                  WHERE search_product_category.store_id = p.store_id
                    AND search_product_category.product_id = p.id
                    AND search_category.name ILIKE '%' || $2 || '%'
               )
               OR EXISTS (
                 SELECT 1
                   FROM collection_products search_collection_product
                   JOIN collections search_collection
                     ON search_collection.store_id = search_collection_product.store_id
                    AND search_collection.id = search_collection_product.collection_id
                  WHERE search_collection_product.store_id = p.store_id
                    AND search_collection_product.product_id = p.id
                    AND search_collection.status = 'published'
                    AND search_collection.title ILIKE '%' || $2 || '%'
               ))
        ORDER BY ${orderBy}
        LIMIT $3 OFFSET $4`,
      [store.id, q || null, limit, offset],
    );
    response.json({
      data: result.rows.map(toProduct),
      page: { limit, offset },
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/products/:slug", async (request, response, next) => {
  try {
    const store = await findStore();
    if (!store) {
      response.status(404).json({
        error: {
          code: "STORE_NOT_FOUND",
          message: "The requested storefront is not configured.",
          requestId: request.requestId,
        },
      });
      return;
    }

    const result = await pool.query(
      `${productSelection}
        WHERE p.store_id = $1 AND p.slug = $2 AND p.status = 'published'`,
      [store.id, request.params.slug],
    );
    if (result.rowCount === 0) {
      response.status(404).json({
        error: {
          code: "PRODUCT_NOT_FOUND",
          message: "This product could not be found.",
          requestId: request.requestId,
        },
      });
      return;
    }
    response.json({ data: toProduct(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});

app.use((request, response) => {
  response.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "The requested endpoint could not be found.",
      requestId: request.requestId,
    },
  });
});

app.use((error, request, response, _next) => {
  const status =
    Number.isInteger(error.status) && error.status >= 400 && error.status < 500
      ? error.status
      : 500;
  console.error(
    JSON.stringify({
      level: "error",
      event: "request_failed",
      requestId: request.requestId,
      method: request.method,
      path: request.path,
      errorCode: error.code || error.name,
    }),
  );
  response.status(status).json({
    error: {
      code: status < 500 ? "INVALID_REQUEST" : "INTERNAL_ERROR",
      message:
        status < 500
          ? "The request could not be processed."
          : "An unexpected error occurred.",
      requestId: request.requestId,
    },
  });
});

export default app;

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.info(
      JSON.stringify({
        level: "info",
        event: "api_listening",
        port,
        storeSlug,
      }),
    );
  });

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, async () => {
      await pool.end();
      process.exit(0);
    });
  }
}
