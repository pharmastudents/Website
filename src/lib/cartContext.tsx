import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

export type CartItemType = "material" | "package" | "subject" | "semester";

export interface CartItem {
  id: string; // material_id or package_id
  type: CartItemType;
  title: string;
  subtitle?: string | undefined;
  code?: string | undefined;
  price: number; // in Rupees
  originalPrice?: number | undefined;
  pages?: number | undefined;
  fileSize?: string | undefined;
  coverUrl?: string | undefined;
  subjectId?: string | undefined;
  semester?: number | undefined;
  course?: string | undefined;
}

interface CartContextType {
  items: CartItem[];
  count: number;
  subtotal: number;
  discount: number;
  totalAmount: number;
  addToCart: (item: CartItem) => { ok: boolean; message: string; alreadyOwned?: boolean; alreadyInCart?: boolean };
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  isInCart: (id: string) => boolean;
}

const CartContext = createContext<CartContextType | null>(null);

const CART_STORAGE_KEY = "pharmastudents_cart_v2";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { student, db, hasAccess } = useStore();
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      /* ignore */
    }
    return [];
  });

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage full or unavailable */
    }
  }, [items]);

  const isInCart = useCallback(
    (id: string) => {
      return items.some((i) => i.id === id);
    },
    [items],
  );

  const addToCart = useCallback(
    (item: CartItem) => {
      // 1. Check if already purchased/owned by student
      if (student) {
        const directPurchase = db.purchases.some(
          (p) => p.studentId === student.id && p.materialId === item.id,
        );
        const storeMat = db.materials.find((m) => m.id === item.id);
        const owned = directPurchase || (storeMat && hasAccess(storeMat));

        if (owned) {
          toast.info("You already own this material! You can access it in My Notes.", {
            action: {
              label: "View Notes",
              onClick: () => {
                window.location.href = "/dashboard/my-resources";
              },
            },
          });
          return { ok: false, message: "Already owned", alreadyOwned: true };
        }
      }

      // 2. Check if already in cart
      if (items.some((i) => i.id === item.id)) {
        toast.info(`"${item.title}" is already in your cart.`, {
          action: {
            label: "View Cart",
            onClick: () => {
              window.location.href = "/cart";
            },
          },
        });
        return { ok: false, message: "Already in cart", alreadyInCart: true };
      }

      // 3. Add to cart
      setItems((prev) => [...prev, item]);
      toast.success(`"${item.title}" added to your cart!`, {
        action: {
          label: "View Cart",
          onClick: () => {
            window.location.href = "/cart";
          },
        },
      });
      return { ok: true, message: "Added to cart" };
    },
    [items, student, db.purchases, db.materials, hasAccess],
  );

  const removeFromCart = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    toast.success("Item removed from cart.");
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const count = items.length;

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  }, [items]);

  const discount = 0; // Authoritative pricing from DB
  const totalAmount = subtotal - discount;

  const value = useMemo(
    () => ({
      items,
      count,
      subtotal,
      discount,
      totalAmount,
      addToCart,
      removeFromCart,
      clearCart,
      isInCart,
    }),
    [items, count, subtotal, discount, totalAmount, addToCart, removeFromCart, clearCart, isInCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return ctx;
}
