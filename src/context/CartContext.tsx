import { createContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

// 1. EXPORTACIÓN EXPLÍCITA DE LA INTERFAZ
export interface CartItem {
  id: string;
  nombre: string;
  precioUSD: number;
  precioCOP: number; // Este campo faltaba en tus datos viejos
  imagen: string;
  categoria?: string;
  descripcion?: string;
  cantidad: number;
  setMarco?: string;
  tipo?: string;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  cartTotal: number;
}

export const CartContext = createContext<CartContextType>({
  cartItems: [],
  addToCart: () => {},
  removeFromCart: () => {},
  cartTotal: 0,
});

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const savedCart = localStorage.getItem('nardoCart');
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart);
        // 2. SANITIZACIÓN DE DATOS (Evita el crash de toLocaleString)
        // Si un producto viejo no tiene precioCOP, le ponemos 0 por defecto.
        const sanitizedCart = parsed.map((item: any) => ({
            ...item,
            precioCOP: item.precioCOP || 0, 
            precioUSD: item.precioUSD || 0,
            cantidad: item.cantidad || 1
        }));
        setCartItems(sanitizedCart);
      } catch (e) {
        console.error("Error recuperando carrito", e);
        localStorage.removeItem('nardoCart'); // Si está corrupto, borrarlo
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('nardoCart', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (product: CartItem) => {
    setCartItems((prev) => {
      const exists = prev.find((item) => item.id === product.id);
      if (exists) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, cantidad: item.cantidad + 1 } : item
        );
      }
      return [...prev, { ...product, cantidad: product.cantidad || 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  const cartTotal = cartItems.reduce((acc, item) => acc + item.cantidad, 0);

  return (
    <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, cartTotal }}>
      {children}
    </CartContext.Provider>
  );
};