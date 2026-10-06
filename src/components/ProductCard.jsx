import { useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { mediaPreviewUrl } from "../lib/media";
import { formatMoney } from "../services/api";

export default function ProductCard({ product, currency, locale, storeName }) {
  const { addToCart } = useCart();
  const [message, setMessage] = useState("");
  const variant = product.variants[0];
  const image =
    product.media.find(
      (item) =>
        item.role === "main" &&
        mediaPreviewUrl(item),
    ) ||
    product.media.find((item) => item.mediaType === "image" && mediaPreviewUrl(item)) ||
    product.media.find((item) => mediaPreviewUrl(item));

  function handleAddToCart() {
    const result = addToCart(product, variant);
    setMessage(result.success ? "Added to your cart." : result.error);
  }

  return (
    <article className="product-card">
      <Link
        className="product-card-image-link"
        to={`/products/${product.slug}`}
        aria-label={`Explore ${product.title}`}
      >
        {image ? (
          <img
            src={mediaPreviewUrl(image)}
            alt={image.alt}
            className="product-card-image"
            loading="lazy"
          />
        ) : (
          <span className="image-placeholder" aria-hidden="true">
            {storeName}
          </span>
        )}
      </Link>
      <div className="product-card-content">
        <div className="product-card-heading">
          <div>
            {product.maker && (
              <p className="eyebrow">{product.maker.displayName}</p>
            )}
            <h3 className="product-card-name">
              <Link to={`/products/${product.slug}`}>{product.title}</Link>
            </h3>
          </div>
          {variant && (
            <p className="product-card-price">
              {formatMoney(variant.priceMinor, variant.currency || currency, locale)}
            </p>
          )}
        </div>
        {product.summary && (
          <p className="product-card-summary">{product.summary}</p>
        )}
        <div className="product-card-actions">
          <Link className="text-link" to={`/products/${product.slug}`}>
            Discover the piece
          </Link>
          <button
            className="text-button"
            type="button"
            onClick={handleAddToCart}
            disabled={!variant}
          >
            Add to cart
          </button>
        </div>
        <p className="sr-only" aria-live="polite">
          {message}
        </p>
      </div>
    </article>
  );
}
