"use client";

import { useMemo } from "react";
import { useCartStore } from "@/store/cartStore";

export function useCart() {
  const items = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);
  const getTotalPrice = useCartStore((state) => state.getTotalPrice);

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );

  return {
    items,
    itemCount,
    addItem,
    removeItem,
    clearCart,
    totalAmount: getTotalPrice(),
  };
}
