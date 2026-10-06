import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";

export default function Checkout() {
  const { cartItems } = useCart();

  return (
    <section className="page container checkout-page">
      <p className="eyebrow">Checkout</p>
      <h1>You’re signed in.</h1>
      {cartItems.length > 0 ? (
        <>
          <p className="checkout-notice" role="status">
            Secure payment is not configured yet. No payment will be taken and
            no order will be created. Your selected pieces are still in your
            cart.
          </p>
          <Link className="button button-outline" to="/cart">
            Review your cart
          </Link>
        </>
      ) : (
        <>
          <p className="checkout-notice">
            Your cart is empty. Explore the collection and add a piece when
            you’re ready.
          </p>
          <Link className="button button-dark" to="/">
            Explore the collection
          </Link>
        </>
      )}
    </section>
  );
}
