import { createContext, useState } from 'react';
import type { ReactNode } from 'react'; // <--- SOLUCIÓN AL ERROR

export interface CartItem {
  id: string;
  nombre: string;
  precioUSD: number;
  precioCOP: number;
  cantidad: number;
  imagen: string;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  cartTotal: number;
}

export const CartContext = createContext<CartContextType>({
  cart: [],
  addToCart: () => {},
  removeFromCart: () => {},
  cartTotal: 0,
});

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<CartItem[]>([]);

  const addToCart = (item: CartItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => (i.id === item.id ? { ...i, cantidad: i.cantidad + 1 } : i));
      }
      return [...prev, { ...item, cantidad: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  };

  const cartTotal = cart.reduce((acc, item) => acc + item.cantidad, 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, cartTotal }}>
      {children}
    </CartContext.Provider>
  );
};