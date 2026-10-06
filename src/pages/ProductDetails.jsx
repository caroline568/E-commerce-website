import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useStore } from "../context/StoreContext";
import {
  ProductGallery,
  ProductMediaSections,
} from "../components/commerce/ProductMedia";
import { formatMoney, requestApi } from "../services/api";

export default function ProductDetails() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { addToCart } = useCart();
  const { store } = useStore();
  const [result, setResult] = useState({
    slug: null,
    product: null,
    error: null,
  });
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const loading = result.slug !== slug;
  const product = loading ? null : result.product;
  const error = loading ? null : result.error;

  useEffect(() => {
    const controller = new AbortController();

    requestApi(`/products/${encodeURIComponent(slug)}`, {
      signal: controller.signal,
    })
      .then(({ data }) => {
        setResult({ slug, product: data, error: null });
      })
      .catch((requestError) => {
        if (requestError.name !== "AbortError") {
          setResult({ slug, product: null, error: requestError });
        }
      });

    return () => controller.abort();
  }, [slug]);

  if (loading) {
    return (
      <div className="page page-state" role="status">
        Loading this piece…
      </div>
    );
  }
  if (error || !product) {
    return (
      <section className="page page-state" role="alert">
        <h1>{error?.message || "This piece could not be found."}</h1>
        <Link className="text-link" to="/">
          Return to the collection
        </Link>
      </section>
    );
  }

  const selectedVariant = product.variants.find(
    (variant) => variant.id === selectedVariantId,
  ) || product.variants[0];
  function addSelectedToCart() {
    setActionMessage("");
    const result = addToCart(product, selectedVariant);
    if (!result.success) {
      setActionMessage(result.error);
      return false;
    }
    return true;
  }

  function handleBuyNow() {
    if (!addSelectedToCart()) return;
    if (user) {
      navigate("/checkout");
    } else {
      navigate("/auth", { state: { from: "/checkout" } });
    }
  }

  return (
    <article className="page product-page container">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Shop</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{product.title}</span>
      </nav>

      <div className="product-detail">
        <ProductGallery media={product.media} productTitle={product.title} />
        <div className="product-detail-content">
          {product.maker && (
            <p className="eyebrow">
              Made by{" "}
              <span className="maker-name">{product.maker.displayName}</span>
            </p>
          )}
          <h1>{product.title}</h1>
          {selectedVariant && (
            <p className="product-detail-price">
              {formatMoney(
                selectedVariant.priceMinor,
                selectedVariant.currency || store.currency,
                store.locale,
              )}
            </p>
          )}
          {product.summary && <p className="product-lede">{product.summary}</p>}
          {product.description && (
            <p className="product-description">{product.description}</p>
          )}

          {product.variants.length > 1 && (
            <fieldset className="variant-selector">
              <legend>Choose an option</legend>
              {product.variants.map((variant) => (
                <label className="variant-option" key={variant.id}>
                  <input
                    type="radio"
                    name="product-variant"
                    value={variant.id}
                    checked={selectedVariantId === variant.id}
                    onChange={() => setSelectedVariantId(variant.id)}
                  />
                  <span>
                    {Object.entries(variant.options || {})
                      .map(([key, value]) => `${key}: ${value}`)
                      .join(" · ") || variant.sku}
                  </span>
                  <span>
                    {formatMoney(
                      variant.priceMinor,
                      variant.currency || store.currency,
                      store.locale,
                    )}
                  </span>
                </label>
              ))}
            </fieldset>
          )}

          <div className="purchase-actions">
            <button
              className="button button-outline"
              type="button"
              onClick={addSelectedToCart}
              disabled={!selectedVariant}
            >
              Add to cart
            </button>
            <button
              className="button button-dark"
              type="button"
              onClick={handleBuyNow}
              disabled={!selectedVariant || authLoading}
            >
              Buy now
            </button>
          </div>
          <p className="purchase-note">
            You can explore without an account. We’ll ask you to sign in or
            create one when you continue to buy.
          </p>
          <p className="inline-error" role="status" aria-live="polite">
            {actionMessage}
          </p>
          {selectedVariant && (
            <p className="availability-note">
              {selectedVariant.availableQuantity} available
            </p>
          )}
        </div>
      </div>

      {(product.story?.length > 0 || product.provenance?.length > 0) && (
        <div className="product-story">
          {product.story?.length > 0 && (
            <NarrativeSection title="The story" items={product.story} />
          )}
          {product.provenance?.length > 0 && (
            <NarrativeSection title="Provenance" items={product.provenance} />
          )}
        </div>
      )}
      <ProductMediaSections media={product.media} />

      <dl className="product-facts">
        {product.maker?.location && (
          <div>
            <dt>Maker</dt>
            <dd>
              {product.maker.displayName}
              {product.maker.location ? ` · ${product.maker.location}` : ""}
            </dd>
          </div>
        )}
        {product.origin && (
          <div>
            <dt>Origin</dt>
            <dd>{product.origin}</dd>
          </div>
        )}
        {product.materials?.length > 0 && (
          <div>
            <dt>Materials</dt>
            <dd>{product.materials.join(", ")}</dd>
          </div>
        )}
        {product.editionLabel && (
          <div>
            <dt>Edition</dt>
            <dd>{product.editionLabel}</dd>
          </div>
        )}
      </dl>
    </article>
  );
}

function NarrativeSection({ title, items }) {
  return (
    <section className="narrative-section">
      <h2>{title}</h2>
      <ol>
        {items.map((item, index) => (
          <li key={`${item.title || "step"}-${index}`}>
            {item.title && <h3>{item.title}</h3>}
            {item.text && <p>{item.text}</p>}
          </li>
        ))}
      </ol>
    </section>
  );
}
