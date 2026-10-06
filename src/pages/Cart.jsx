import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useStore } from "../context/StoreContext";
import { mediaPreviewUrl } from "../lib/media";
import { formatMoney } from "../services/api";

export default function Cart() {
  const { cartItems, removeFromCart, updateQuantity } = useCart();
  const { store } = useStore();

  if (cartItems.length === 0) {
    return (
      <section className="page container cart-page">
        <p className="eyebrow">Your selection</p>
        <h1>Your cart is waiting for a story.</h1>
        <p>Discover work made with care by independent makers.</p>
        <Link className="button button-dark" to="/">
          Explore the collection
        </Link>
      </section>
    );
  }

  const subtotal = cartItems.reduce(
    (total, item) =>
      total + item.variant.priceMinor * item.quantity,
    0,
  );

  return (
    <section className="page container cart-page">
      <p className="eyebrow">Your selection</p>
      <h1>Pieces you’ve discovered</h1>
      <div className="cart-layout">
        <div className="cart-items">
          {cartItems.map(({ product, variant, quantity }) => {
            const image =
              product.media.find(
                (item) =>
                  item.role === "main" &&
                  mediaPreviewUrl(item),
              ) ||
              product.media.find(
                (item) => item.mediaType === "image" && mediaPreviewUrl(item),
              ) ||
              product.media.find((item) => mediaPreviewUrl(item));
            return (
              <article className="cart-item" key={variant.id}>
                {image ? (
                  <img
                    src={mediaPreviewUrl(image)}
                    alt={image.alt}
                    loading="lazy"
                  />
                ) : (
                  <div className="image-placeholder" aria-hidden="true">
                    {product.title}
                  </div>
                )}
                <div className="cart-item-details">
                  {product.maker && (
                    <p className="eyebrow">{product.maker.displayName}</p>
                  )}
                  <h2>
                    <Link to={`/products/${product.slug}`}>{product.title}</Link>
                  </h2>
                  <p>
                    {Object.entries(variant.options || {})
                      .map(([key, value]) => `${key}: ${value}`)
                      .join(" · ")}
                  </p>
                  <p className="cart-item-price">
                    {formatMoney(
                      variant.priceMinor,
                      variant.currency || store.currency,
                      store.locale,
                    )}
                  </p>
                  <div className="cart-item-actions">
                    <button
                      type="button"
                      className="quantity-button"
                      aria-label={`Decrease quantity of ${product.title}`}
                      onClick={() =>
                        updateQuantity(variant.id, quantity - 1)
                      }
                    >
                      −
                    </button>
                    <span aria-live="polite">Quantity: {quantity}</span>
                    <button
                      type="button"
                      className="quantity-button"
                      aria-label={`Increase quantity of ${product.title}`}
                      onClick={() =>
                        updateQuantity(variant.id, quantity + 1)
                      }
                    >
                      +
                    </button>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => removeFromCart(variant.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <p className="cart-line-total">
                  {formatMoney(
                    variant.priceMinor * quantity,
                    variant.currency || store.currency,
                    store.locale,
                  )}
                </p>
              </article>
            );
          })}
        </div>

        <aside className="cart-summary" aria-labelledby="cart-summary-title">
          <h2 id="cart-summary-title">Summary</h2>
          <div className="cart-subtotal">
            <span>Estimated subtotal</span>
            <strong>{formatMoney(subtotal, store.currency, store.locale)}</strong>
          </div>
          <p>
            Shipping and final availability are confirmed at checkout. No
            payment is collected until secure checkout is available.
          </p>
          <Link className="button button-dark button-block" to="/checkout">
            Continue to checkout
          </Link>
        </aside>
      </div>
    </section>
  );
}
