"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import type { PublicListing } from "@/lib/api";

export interface CartItem {
  listing_id: string;
  product_name: string;
  farmer_id: string;
  farmer_name: string;
  farm_name: string | null;
  category: string;
  price_per_unit: number; // naira
  unit: string;
  quantity: number; // buyer's requested qty
  max_quantity: number; // from listing
  location_state: string;
  delivery_options: string[];
}

interface CartContextValue {
  items: CartItem[];
  addItem: (listing: PublicListing, qty?: number) => void;
  updateQty: (listing_id: string, qty: number) => void;
  removeItem: (listing_id: string) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number; // naira
}

const CartContext = createContext<CartContextValue | null>(null);
const CART_KEY = "hl_cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setItems(JSON.parse(saved));
    } catch {
      localStorage.removeItem(CART_KEY);
    }
  }, []);

  // Persist to localStorage on every change
  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((listing: PublicListing, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.listing_id === listing.listing_id);
      if (existing) {
        return prev.map((i) =>
          i.listing_id === listing.listing_id
            ? { ...i, quantity: Math.min(i.quantity + qty, i.max_quantity) }
            : i,
        );
      }
      const newItem: CartItem = {
        listing_id: listing.listing_id,
        product_name: listing.product_name,
        farmer_id: listing.farmer_id,
        farmer_name: listing.farmer.name,
        farm_name: listing.farmer.farmName ?? null,
        category: listing.category,
        // price_per_unit is stored in kobo by the backend — convert to naira for display
        price_per_unit: listing.price_per_unit / 100,
        unit: listing.unit,
        quantity: qty,
        max_quantity: parseFloat(listing.quantity),
        location_state: listing.location_state,
        delivery_options: (listing.delivery_options as string[]) ?? ["pickup"],
      };
      return [...prev, newItem];
    });
  }, []);

  const updateQty = useCallback((listing_id: string, qty: number) => {
    if (qty <= 0) {
      setItems((prev) => prev.filter((i) => i.listing_id !== listing_id));
    } else {
      setItems((prev) =>
        prev.map((i) =>
          i.listing_id === listing_id
            ? { ...i, quantity: Math.min(qty, i.max_quantity) }
            : i,
        ),
      );
    }
  }, []);

  const removeItem = useCallback((listing_id: string) => {
    setItems((prev) => prev.filter((i) => i.listing_id !== listing_id));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = items.reduce((s, i) => s + i.price_per_unit * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, updateQty, removeItem, clearCart, totalItems, totalPrice }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
