import { createContext, useContext, useState } from "react";

const CartContext = createContext(null);

export default function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);

  function addToCart(product, variant) {
    if (!variant || variant.availableQuantity < 1) {
      return { success: false, error: "This option is currently unavailable." };
    }

    const existing = cartItems.find((item) => item.variant.id === variant.id);
    if (existing?.quantity >= variant.availableQuantity) {
      return { success: false, error: "No more stock is currently available." };
    }

    setCartItems((items) => {
      const current = items.find((item) => item.variant.id === variant.id);
      if (current) {
        return items.map((item) =>
          item.variant.id === variant.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...items, { product, variant, quantity: 1 }];
    });
    return { success: true };
  }

  function removeFromCart(variantId) {
    setCartItems((items) =>
      items.filter((item) => item.variant.id !== variantId),
    );
  }

  function updateQuantity(variantId, quantity) {
    if (quantity < 1) {
      removeFromCart(variantId);
      return;
    }
    setCartItems((items) =>
      items.map((item) =>
        item.variant.id === variantId
          ? {
              ...item,
              quantity: Math.min(quantity, item.variant.availableQuantity),
            }
          : item,
      ),
    );
  }

  function clearCart() {
    setCartItems([]);
  }

  const itemCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        itemCount,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider.");
  return context;
}
