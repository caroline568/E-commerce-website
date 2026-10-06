import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useStore } from "../context/StoreContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const { store } = useStore();
  const [error, setError] = useState("");

  async function handleLogout() {
    setError("");
    try {
      await logout();
    } catch (logoutError) {
      setError(logoutError.message);
    }
  }

  return (
    <header className="site-header">
      {store?.settings?.announcement && (
        <div className="announcement" aria-label="Store announcement">
          {store.settings.announcement}
        </div>
      )}
      <nav className="navbar" aria-label="Main navigation">
        <Link className="navbar-brand" to="/" aria-label="Go to storefront home">
          <span>{store?.name || "Kijiji Works"}</span>
          <small>{store?.tagline || "Contemporary craft & heritage"}</small>
        </Link>
        <div className="navbar-links">
          <Link className="navbar-link" to="/">
            Shop
          </Link>
          <Link className="navbar-link" to="/cart">
            Cart <span className="cart-count">({itemCount})</span>
          </Link>
          {user ? (
            <div className="navbar-account">
              <span className="account-name">{user.displayName}</span>
              <button className="text-button" onClick={handleLogout}>
                Sign out
              </button>
            </div>
          ) : (
            <Link className="navbar-link" to="/auth">
              Sign in
            </Link>
          )}
        </div>
      </nav>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
    </header>
  );
}
