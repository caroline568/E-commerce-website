import { z } from "zod";
import { pool } from "./db.js";

const publicImageUrlSchema = z
  .string()
  .trim()
  .min(1)
  .max(2048)
  .refine((value) => {
    if (
      value.startsWith("/") &&
      !value.startsWith("//") &&
      !value.includes("\\")
    ) {
      return true;
    }

    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  });

const bootstrapSchema = z.object({
  STORE_SLUG: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(63)
    .default("kijiji-works"),
  STORE_NAME: z.string().trim().min(1).max(120),
  STORE_TAGLINE: z.string().max(240).default(""),
  STORE_DESCRIPTION: z.string().max(5000).default(""),
  STORE_HERO_IMAGE_URL: publicImageUrlSchema.default("/images/woven-baskets.webp"),
  STORE_HERO_IMAGE_ALT: z
    .string()
    .trim()
    .min(1)
    .max(240)
    .default("Handwoven baskets arranged together"),
  STORE_PROCESS_IMAGE_URL: publicImageUrlSchema.default("/images/weaving-process.webp"),
  STORE_PROCESS_IMAGE_ALT: z
    .string()
    .trim()
    .min(1)
    .max(240)
    .default("A maker weaving straw into a basket"),
  STORE_DETAIL_IMAGE_URL: publicImageUrlSchema.default("/images/clay-pot-maker.webp"),
  STORE_DETAIL_IMAGE_ALT: z
    .string()
    .trim()
    .min(1)
    .max(240)
    .default("A craftsperson shaping a clay pot"),
  STORE_STORY_TITLE: z.string().trim().min(1).max(160).default("The work, and the hands behind it."),
  STORE_STORY_BODY: z
    .string()
    .trim()
    .min(1)
    .max(1000)
    .default("Explore the materials, methods, and makers behind each piece."),
  STORE_CURRENCY: z.string().regex(/^[A-Za-z]{3}$/).transform((value) => value.toUpperCase()),
  STORE_COUNTRY: z.string().regex(/^[A-Za-z]{2}$/).transform((value) => value.toUpperCase()),
  STORE_LOCALE: z.string().min(2).max(35).default("en"),
  STORE_TIMEZONE: z.string().min(1).max(100).default("UTC"),
  STORE_THEME: z
    .enum(["editorial", "studio", "technical", "heritage", "minimal"])
    .default("heritage"),
});

const parsed = bootstrapSchema.safeParse(process.env);
if (!parsed.success) {
  const invalidFields = parsed.error.issues
    .map((issue) => issue.path.join("."))
    .join(", ");
  throw new Error(`Invalid store configuration: ${invalidFields}`);
}
const store = parsed.data;
const settings = {
  homepageSections: [
    {
      type: "hero",
      id: "hero",
      eyebrow: "Made with meaning",
      title: store.STORE_NAME,
      description: store.STORE_TAGLINE,
      body: store.STORE_DESCRIPTION,
      ctaLabel: "Explore the collection",
      ctaHref: "#shop",
      imageUrl: store.STORE_HERO_IMAGE_URL,
      imageAlt: store.STORE_HERO_IMAGE_ALT,
    },
    {
      type: "products",
      id: "shop",
      eyebrow: "Discover",
      title: "The collection",
    },
    {
      type: "statement",
      id: "maker-story",
      eyebrow: "Made by hand",
      title: store.STORE_STORY_TITLE,
      body: store.STORE_STORY_BODY,
      imageUrl: store.STORE_PROCESS_IMAGE_URL,
      imageAlt: store.STORE_PROCESS_IMAGE_ALT,
      secondaryImageUrl: store.STORE_DETAIL_IMAGE_URL,
      secondaryImageAlt: store.STORE_DETAIL_IMAGE_ALT,
    },
  ],
};

try {
  const result = await pool.query(
    `INSERT INTO stores
       (slug, name, tagline, description, currency, country, locale, timezone, theme, settings)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (slug) DO NOTHING
     RETURNING id, slug, name`,
    [
      store.STORE_SLUG,
      store.STORE_NAME,
      store.STORE_TAGLINE,
      store.STORE_DESCRIPTION,
      store.STORE_CURRENCY,
      store.STORE_COUNTRY,
      store.STORE_LOCALE,
      store.STORE_TIMEZONE,
      store.STORE_THEME,
      JSON.stringify(settings),
    ],
  );

  if (result.rowCount === 0) {
    throw new Error(`A store with slug "${store.STORE_SLUG}" already exists.`);
  }

  console.info(
    JSON.stringify({
      level: "info",
      event: "store_bootstrapped",
      store: result.rows[0],
    }),
  );
} finally {
  await pool.end();
}
