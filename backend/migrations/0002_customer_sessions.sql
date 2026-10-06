CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  email text NOT NULL,
  password_hash text NOT NULL,
  display_name text NOT NULL,
  role text NOT NULL DEFAULT 'customer'
    CHECK (role IN ('customer', 'staff', 'manager', 'admin', 'super_admin')),
  email_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, id),
  UNIQUE (store_id, email)
);

CREATE TABLE auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  user_id uuid NOT NULL,
  token_hash bytea NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (store_id, user_id) REFERENCES users(store_id, id)
    ON DELETE CASCADE
);

CREATE INDEX auth_sessions_user_expiry_idx
  ON auth_sessions (store_id, user_id, expires_at);

ALTER TABLE product_media
  ADD COLUMN submitted_by uuid,
  ADD CONSTRAINT product_media_submitter_store_fk
    FOREIGN KEY (store_id, submitted_by) REFERENCES users(store_id, id);

ALTER TABLE inventory_movements
  ADD CONSTRAINT inventory_movements_actor_store_fk
  FOREIGN KEY (store_id, actor_id) REFERENCES users(store_id, id);
