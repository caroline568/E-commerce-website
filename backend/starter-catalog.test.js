import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { STARTER_CATALOG, toMinorUnits } from "./starter-catalog.js";

test("starter products have unique slugs and SKUs with product photography", () => {
  assert.ok(STARTER_CATALOG.length >= 3);
  assert.equal(
    new Set(STARTER_CATALOG.map((product) => product.slug)).size,
    STARTER_CATALOG.length,
  );
  assert.equal(
    new Set(STARTER_CATALOG.map((product) => product.sku)).size,
    STARTER_CATALOG.length,
  );

  for (const product of STARTER_CATALOG) {
    assert.ok(product.image.startsWith("/images/"));
    assert.ok(product.imageAlt);
    assert.ok(product.additionalMedia.length > 0);
    assert.ok(product.additionalMedia.every((media) => media.alt));
    assert.ok(product.examplePrice > 0);
    assert.ok(product.exampleQuantity > 0);

    for (const imageUrl of [
      product.image,
      ...product.additionalMedia.map((media) => media.url),
    ]) {
      const imagePath = fileURLToPath(
        new URL(`../public${imageUrl}`, import.meta.url),
      );
      assert.ok(existsSync(imagePath), `Expected product image at ${imageUrl}`);
    }
  }
});

test("starter catalog prices respect currency minor-unit precision", () => {
  assert.equal(toMinorUnits(8500, "KES"), 850000);
  assert.equal(toMinorUnits(8500, "JPY"), 8500);
  assert.equal(toMinorUnits(12.34, "USD"), 1234);
});
