import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Checkout from "./pages/Checkout";
import Cart from "./pages/Cart";
import Navbar from "./components/Navbar";

import "./App.css";
import AuthProvider, { useAuth } from "./context/AuthContext";
import ProductDetails from "./pages/ProductDetails";
import CartProvider from "./context/CartContext";
import StoreProvider from "./context/StoreContext";

function App() {
  return (
    <StoreProvider>
      <AuthProvider>
        <CartProvider>
          <div className="app">
            <a className="skip-link" href="#main-content">
              Skip to content
            </a>
            <Navbar />
            <main id="main-content">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/cart" element={<Cart />} />
                <Route
                  path="/checkout"
                  element={
                    <RequireAuth>
                      <Checkout />
                    </RequireAuth>
                  }
                />
                <Route path="/products/:slug" element={<ProductDetails />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
          </div>
        </CartProvider>
      </AuthProvider>
    </StoreProvider>
  );
}

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="page-state" role="status">
        Checking your account…
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }
  return children;
}

function NotFound() {
  return (
    <section className="page page-state">
      <h1>We could not find that page.</h1>
      <Link className="text-link" to="/">
        Return to the storefront
      </Link>
    </section>
  );
}

export default App;
