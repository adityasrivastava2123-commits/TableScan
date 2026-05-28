"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import type { OrderWithItems } from "@/types";

export function useOrders(restaurantId?: string) {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchOrders() {
      if (!restaurantId) return;

      setLoading(true);
      try {
        const { data } = await axios.get<OrderWithItems[]>("/api/orders", {
          params: { restaurantId },
        });
        setOrders(data);
      } finally {
        setLoading(false);
      }
    }

    void fetchOrders();
  }, [restaurantId]);

  return { orders, loading, setOrders };
}
