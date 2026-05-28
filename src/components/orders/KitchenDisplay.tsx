"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { CheckCircle2 } from "lucide-react";
import { formatDistanceToNowStrict, format } from "date-fns";
import { getPusherClient } from "@/lib/pusher-client";

type KitchenOrderStatus = "NEW" | "PREPARING" | "READY" | "DONE" | "CANCELLED";

type KitchenOrder = {
  id: string;
  orderNumber: string;
  status: KitchenOrderStatus;
  totalAmount: number;
  specialNote: string | null;
  customerName: string | null;
  createdAt: string;
  table: {
    name: string;
  };
  items: Array<{
    id: string;
    quantity: number;
    menuItem: {
      name: string;
    };
  }>;
};

type KitchenDisplayProps = {
  restaurantId: string;
  restaurantName: string;
};

export function KitchenDisplay({
  restaurantId,
  restaurantName,
}: KitchenDisplayProps) {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [clock, setClock] = useState("");
  const [flashingOrderIds, setFlashingOrderIds] = useState<string[]>([]);

  const fetchOrders = useCallback(async () => {
    try {
      const { data } = await axios.get<KitchenOrder[]>(
        `/api/orders/restaurant/${restaurantId}?status=NEW,PREPARING`,
      );
      setOrders(data);
    } catch (error) {
      console.error("Failed to fetch kitchen orders:", error);
    }
  }, [restaurantId]);

  useEffect(() => {
    void fetchOrders();
    const interval = setInterval(() => {
      void fetchOrders();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  useEffect(() => {
    setClock(format(new Date(), "hh:mm:ss a"));
    const timeInterval = setInterval(() => {
      setClock(format(new Date(), "hh:mm:ss a"));
    }, 1000);
    return () => clearInterval(timeInterval);
  }, []);

  useEffect(() => {
    const pusherClient = getPusherClient();
    const channelName = `restaurant-${restaurantId}`;
    const channel = pusherClient.subscribe(channelName);

    const handleNewOrder = (payload: { order?: KitchenOrder }) => {
      if (!payload?.order) return;
      if (
        payload.order.status !== "NEW" &&
        payload.order.status !== "PREPARING"
      ) {
        return;
      }

      setOrders((prev) => {
        const exists = prev.some((order) => order.id === payload.order!.id);
        if (exists) return prev;
        return [payload.order!, ...prev];
      });

      setFlashingOrderIds((prev) => [...prev, payload.order!.id]);
      setTimeout(() => {
        setFlashingOrderIds((prev) => prev.filter((id) => id !== payload.order!.id));
      }, 1600);
    };

    const handleOrderUpdated = (payload: { order?: KitchenOrder }) => {
      if (!payload?.order) return;

      setOrders((prev) => {
        const isActive =
          payload.order!.status === "NEW" || payload.order!.status === "PREPARING";

        if (!isActive) {
          return prev.filter((order) => order.id !== payload.order!.id);
        }

        const exists = prev.some((order) => order.id === payload.order!.id);
        if (!exists) {
          return [payload.order!, ...prev];
        }

        return prev.map((order) =>
          order.id === payload.order!.id ? payload.order! : order,
        );
      });
    };

    channel.bind("new-order", handleNewOrder);
    channel.bind("order-updated", handleOrderUpdated);

    return () => {
      channel.unbind("new-order", handleNewOrder);
      channel.unbind("order-updated", handleOrderUpdated);
      pusherClient.unsubscribe(channelName);
    };
  }, [restaurantId]);

  const sortedOrders = useMemo(() => {
    return [...orders].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }, [orders]);

  async function updateOrderStatus(orderId: string, nextStatus: "PREPARING" | "READY") {
    try {
      await axios.patch(`/api/orders/${orderId}/status`, { status: nextStatus });
    } catch (error) {
      console.error("Failed to update order status:", error);
    }
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <header className="flex items-center justify-between border-b border-gray-700 px-6 py-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kitchen Display</h1>
          <p className="text-lg text-gray-300">{restaurantName}</p>
        </div>
        <div className="text-right">
          <p className="text-sm uppercase tracking-wide text-gray-400">Current Time</p>
          <p className="text-2xl font-semibold">{clock || "--:--:-- --"}</p>
        </div>
      </header>

      <section className="p-6">
        {sortedOrders.length === 0 ? (
          <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
            <CheckCircle2 className="h-20 w-20 text-green-400" />
            <h2 className="mt-5 text-4xl font-bold">No active orders</h2>
            <p className="mt-2 text-xl text-gray-300">Kitchen is clear!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {sortedOrders.map((order) => {
              const createdAt = new Date(order.createdAt);
              const elapsedMinutes = Math.floor(
                (Date.now() - createdAt.getTime()) / (1000 * 60),
              );
              const isLate = elapsedMinutes > 15;
              const borderColor =
                order.status === "NEW" ? "border-blue-500" : "border-orange-500";
              const isFlashing = flashingOrderIds.includes(order.id);

              return (
                <article
                  key={order.id}
                  className={`rounded-xl border-l-8 ${borderColor} bg-gray-800 p-5 shadow-lg transition ${
                    isFlashing ? "animate-pulse ring-2 ring-blue-300/70" : ""
                  }`}
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-3xl font-extrabold">#{order.orderNumber}</p>
                      <p className="mt-1 text-2xl font-semibold text-gray-200">
                        Table: {order.table.name}
                      </p>
                    </div>
                    <p
                      className={`text-xl font-bold ${
                        isLate ? "text-red-400" : "text-gray-300"
                      }`}
                    >
                      {formatDistanceToNowStrict(createdAt, { unit: "minute" })} ago
                    </p>
                  </div>

                  <div className="space-y-2">
                    {order.items.map((item) => (
                      <p key={item.id} className="text-lg leading-6">
                        <span className="mr-2 font-bold">{item.quantity}x</span>
                        {item.menuItem.name}
                      </p>
                    ))}
                  </div>

                  {order.specialNote ? (
                    <div className="mt-4 rounded-md border border-yellow-400/40 bg-yellow-300/10 p-3">
                      <p className="text-base font-semibold text-yellow-300">Special Note</p>
                      <p className="mt-1 text-base text-yellow-100">{order.specialNote}</p>
                    </div>
                  ) : null}

                  <div className="mt-5">
                    {order.status === "NEW" ? (
                      <button
                        onClick={() => void updateOrderStatus(order.id, "PREPARING")}
                        className="w-full rounded-md bg-orange-500 px-4 py-3 text-lg font-semibold text-white transition hover:bg-orange-600"
                      >
                        Start Preparing
                      </button>
                    ) : (
                      <button
                        onClick={() => void updateOrderStatus(order.id, "READY")}
                        className="w-full rounded-md bg-green-600 px-4 py-3 text-lg font-semibold text-white transition hover:bg-green-700"
                      >
                        Mark Ready
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

