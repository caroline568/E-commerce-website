CREATE TABLE stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  tagline text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  logo_url text,
  favicon_url text,
  domain text,
  currency char(3) NOT NULL,
  country char(2) NOT NULL,
  locale text NOT NULL DEFAULT 'en',
  timezone text NOT NULL DEFAULT 'UTC',
  theme text NOT NULL DEFAULT 'editorial'
    CHECK (theme IN ('editorial', 'studio', 'technical', 'heritage', 'minimal')),
  settings jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(settings) = 'object'),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, slug)
);

CREATE TABLE store_settings (
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  key text NOT NULL,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (store_id, key)
);

CREATE TABLE makers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  display_name text NOT NULL,
  profile_image_url text,
  cover_image_url text,
  bio text NOT NULL DEFAULT '',
  story jsonb NOT NULL DEFAULT '[]'::jsonb,
  location text,
  specialization text,
  website_url text,
  social_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  craft text,
  materials text[] NOT NULL DEFAULT '{}',
  process jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, id),
  UNIQUE (store_id, slug)
);

CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  parent_id uuid,
  slug text NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  position integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'published'
    CHECK (status IN ('draft', 'published', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, id),
  UNIQUE (store_id, slug),
  FOREIGN KEY (store_id, parent_id) REFERENCES categories(store_id, id)
);

CREATE TABLE collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  slug text NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  hero_image_url text,
  seo_title text,
  seo_description text,
  starts_at timestamptz,
  ends_at timestamptz,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, id),
  UNIQUE (store_id, slug),
  CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
);

CREATE TABLE brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, id),
  UNIQUE (store_id, slug)
);

CREATE TABLE tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  UNIQUE (store_id, id),
  UNIQUE (store_id, slug)
);

CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  maker_id uuid,
  brand_id uuid,
  category_id uuid,
  slug text NOT NULL,
  title text NOT NULL,
  summary text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  story jsonb NOT NULL DEFAULT '[]'::jsonb,
  provenance jsonb NOT NULL DEFAULT '[]'::jsonb,
  specifications jsonb NOT NULL DEFAULT '{}'::jsonb,
  materials text[] NOT NULL DEFAULT '{}',
  origin text,
  edition_label text,
  section_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  seo_title text,
  seo_description text,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, id),
  UNIQUE (store_id, slug),
  FOREIGN KEY (store_id, maker_id) REFERENCES makers(store_id, id),
  FOREIGN KEY (store_id, brand_id) REFERENCES brands(store_id, id),
  FOREIGN KEY (store_id, category_id) REFERENCES categories(store_id, id)
);

CREATE INDEX products_store_status_published_idx
  ON products (store_id, status, published_at DESC);

CREATE TABLE product_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  product_id uuid NOT NULL,
  url text NOT NULL,
  alt_text text NOT NULL,
  caption text NOT NULL DEFAULT '',
  position integer NOT NULL DEFAULT 0,
  media_type text NOT NULL DEFAULT 'image'
    CHECK (media_type IN ('image', 'video')),
  media_role text NOT NULL DEFAULT 'gallery'
    CHECK (media_role IN (
      'main', 'gallery', 'lifestyle', 'detail', 'process',
      'maker', 'workshop', 'customer'
    )),
  media_source text NOT NULL DEFAULT 'merchant'
    CHECK (media_source IN ('merchant', 'customer')),
  moderation_status text NOT NULL DEFAULT 'approved'
    CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  poster_url text,
  captions_url text,
  captions_language text NOT NULL DEFAULT 'en',
  transcript_url text,
  width integer CHECK (width IS NULL OR width > 0),
  height integer CHECK (height IS NULL OR height > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (length(trim(alt_text)) > 0),
  CHECK (position >= 0),
  CHECK (media_type <> 'video' OR length(trim(captions_url)) > 0),
  UNIQUE (store_id, product_id, position),
  FOREIGN KEY (store_id, product_id) REFERENCES products(store_id, id)
    ON DELETE CASCADE
);

CREATE INDEX product_media_public_order_idx
  ON product_media (store_id, product_id, moderation_status, position);

CREATE TABLE product_categories (
  store_id uuid NOT NULL,
  product_id uuid NOT NULL,
  category_id uuid NOT NULL,
  PRIMARY KEY (store_id, product_id, category_id),
  FOREIGN KEY (store_id, product_id) REFERENCES products(store_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (store_id, category_id) REFERENCES categories(store_id, id)
    ON DELETE CASCADE
);

CREATE TABLE product_tags (
  store_id uuid NOT NULL,
  product_id uuid NOT NULL,
  tag_id uuid NOT NULL,
  PRIMARY KEY (store_id, product_id, tag_id),
  FOREIGN KEY (store_id, product_id) REFERENCES products(store_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (store_id, tag_id) REFERENCES tags(store_id, id)
    ON DELETE CASCADE
);

CREATE TABLE collection_products (
  store_id uuid NOT NULL,
  collection_id uuid NOT NULL,
  product_id uuid NOT NULL,
  position integer NOT NULL DEFAULT 0,
  PRIMARY KEY (store_id, collection_id, product_id),
  FOREIGN KEY (store_id, collection_id) REFERENCES collections(store_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (store_id, product_id) REFERENCES products(store_id, id)
    ON DELETE CASCADE
);

CREATE TABLE product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  product_id uuid NOT NULL,
  sku text NOT NULL,
  options jsonb NOT NULL DEFAULT '{}'::jsonb,
  price_minor bigint NOT NULL CHECK (price_minor >= 0),
  currency char(3) NOT NULL,
  weight_grams integer CHECK (weight_grams IS NULL OR weight_grams >= 0),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, id),
  UNIQUE (store_id, sku),
  FOREIGN KEY (store_id, product_id) REFERENCES products(store_id, id)
    ON DELETE CASCADE
);

CREATE INDEX product_variants_product_idx
  ON product_variants (store_id, product_id, status);

CREATE TABLE inventory (
  store_id uuid NOT NULL,
  variant_id uuid NOT NULL,
  on_hand integer NOT NULL DEFAULT 0 CHECK (on_hand >= 0),
  reserved integer NOT NULL DEFAULT 0 CHECK (reserved >= 0 AND reserved <= on_hand),
  low_stock_threshold integer NOT NULL DEFAULT 0 CHECK (low_stock_threshold >= 0),
  version integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (store_id, variant_id),
  FOREIGN KEY (store_id, variant_id) REFERENCES product_variants(store_id, id)
    ON DELETE CASCADE
);

CREATE TABLE inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  variant_id uuid NOT NULL,
  quantity_delta integer NOT NULL CHECK (quantity_delta <> 0),
  movement_type text NOT NULL
    CHECK (movement_type IN ('adjustment', 'reservation', 'release', 'sale', 'return')),
  reason text NOT NULL,
  reference_id uuid,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (store_id, variant_id) REFERENCES product_variants(store_id, id)
);

CREATE TABLE stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  slug text NOT NULL,
  title text NOT NULL,
  summary text NOT NULL DEFAULT '',
  content jsonb NOT NULL DEFAULT '[]'::jsonb,
  cover_image_url text,
  seo_title text,
  seo_description text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, id),
  UNIQUE (store_id, slug)
);

CREATE TABLE story_products (
  store_id uuid NOT NULL,
  story_id uuid NOT NULL,
  product_id uuid NOT NULL,
  position integer NOT NULL DEFAULT 0,
  PRIMARY KEY (store_id, story_id, product_id),
  FOREIGN KEY (store_id, story_id) REFERENCES stories(store_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (store_id, product_id) REFERENCES products(store_id, id)
    ON DELETE CASCADE
);

CREATE TABLE story_makers (
  store_id uuid NOT NULL,
  story_id uuid NOT NULL,
  maker_id uuid NOT NULL,
  position integer NOT NULL DEFAULT 0,
  PRIMARY KEY (store_id, story_id, maker_id),
  FOREIGN KEY (store_id, story_id) REFERENCES stories(store_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (store_id, maker_id) REFERENCES makers(store_id, id)
    ON DELETE CASCADE
);

CREATE INDEX stories_published_idx
  ON stories (store_id, status, published_at DESC);
