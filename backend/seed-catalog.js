import { config } from "./config.js";
import { pool } from "./db.js";
import { STARTER_CATALOG, toMinorUnits } from "./starter-catalog.js";

async function seedCatalog() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const storeResult = await client.query(
      `SELECT id, currency
         FROM stores
        WHERE slug = $1 AND status = 'active'`,
      [config.storeSlug],
    );
    const store = storeResult.rows[0];
    if (!store) {
      throw new Error(
        `Active store "${config.storeSlug}" not found. Run db:bootstrap-store first.`,
      );
    }

    const categoryResult = await client.query(
      `INSERT INTO categories (store_id, slug, name, description)
       VALUES ($1, 'starter-showcase', 'Starter showcase',
               'Illustrative starter catalog items. Verify all details before trading.')
       ON CONFLICT (store_id, slug) DO UPDATE
         SET name = EXCLUDED.name, description = EXCLUDED.description
       RETURNING id`,
      [store.id],
    );
    const categoryId = categoryResult.rows[0].id;

    const collectionResult = await client.query(
      `INSERT INTO collections
         (store_id, slug, title, description, hero_image_url, status)
       VALUES ($1, 'starter-showcase', 'A studio in progress',
               'An illustrative catalog of craft objects and their making.',
               '/images/woven-baskets.webp', 'published')
       ON CONFLICT (store_id, slug) DO UPDATE
         SET title = EXCLUDED.title,
             description = EXCLUDED.description,
             hero_image_url = EXCLUDED.hero_image_url
       RETURNING id`,
      [store.id],
    );
    const collectionId = collectionResult.rows[0].id;

    let productsAdded = 0;
    for (const [productPosition, product] of STARTER_CATALOG.entries()) {
      const productResult = await client.query(
        `INSERT INTO products
           (store_id, category_id, slug, title, summary, description,
            story, materials, status, published_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, '{}', 'published', now())
         ON CONFLICT (store_id, slug) DO NOTHING
         RETURNING id`,
        [
          store.id,
          categoryId,
          product.slug,
          product.title,
          product.summary,
          "Illustrative starter listing. This photo, price, and stock are examples, not verified merchant product details. Replace them before trading.",
          JSON.stringify([
            {
              title: "About this example",
              text: "This starter listing demonstrates how product photography and storytelling appear in the storefront. Confirm product details with the merchant before publishing.",
            },
          ]),
        ],
      );

      if (productResult.rowCount === 0) continue;
      const productId = productResult.rows[0].id;
      const media = [
        {
          url: product.image,
          alt: product.imageAlt,
          caption: "",
          role: "main",
        },
        ...product.additionalMedia,
      ];

      for (const [position, item] of media.entries()) {
        await client.query(
          `INSERT INTO product_media
             (store_id, product_id, url, alt_text, caption, position, media_role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            store.id,
            productId,
            item.url,
            item.alt,
            item.caption,
            position,
            item.role,
          ],
        );
      }

      const variantResult = await client.query(
        `INSERT INTO product_variants
           (store_id, product_id, sku, options, price_minor, currency)
         VALUES ($1, $2, $3, '{}'::jsonb, $4, $5)
         ON CONFLICT (store_id, sku) DO NOTHING
         RETURNING id`,
        [
          store.id,
          productId,
          product.sku,
          toMinorUnits(product.examplePrice, store.currency),
          store.currency,
        ],
      );
      if (variantResult.rowCount !== 1) {
        throw new Error(
          `Could not create starter variant "${product.sku}". Check for an existing SKU.`,
        );
      }
      const variantId = variantResult.rows[0].id;

      await client.query(
        `INSERT INTO inventory (store_id, variant_id, on_hand, low_stock_threshold)
         VALUES ($1, $2, $3, 1)`,
        [store.id, variantId, product.exampleQuantity],
      );
      await client.query(
        `INSERT INTO inventory_movements
           (store_id, variant_id, quantity_delta, movement_type, reason)
         VALUES ($1, $2, $3, 'adjustment',
                 'Illustrative starter quantity; replace with verified stock before trading.')`,
        [store.id, variantId, product.exampleQuantity],
      );
      await client.query(
        `INSERT INTO collection_products
           (store_id, collection_id, product_id, position)
         VALUES ($1, $2, $3, $4)`,
        [store.id, collectionId, productId, productPosition],
      );
      productsAdded += 1;
    }

    await client.query("COMMIT");
    console.info(
      JSON.stringify({
        level: "info",
        event: "starter_catalog_seeded",
        storeSlug: config.storeSlug,
        productsAdded,
      }),
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedCatalog().catch((error) => {
  console.error(
    JSON.stringify({
      level: "error",
      event: "starter_catalog_seed_failed",
      message: error.message,
    }),
  );
  process.exitCode = 1;
});
