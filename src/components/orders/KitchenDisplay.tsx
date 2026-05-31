"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { CheckCircle2, Clock, ChefHat, Package, AlertTriangle, Bell, Timer } from "lucide-react";
import { formatDistanceToNowStrict, format } from "date-fns";
import { getPusherClient } from "@/lib/pusher-client";
import { Badge } from "@/components/ui/badge";

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

  async function updateOrderStatus(orderId: string, nextStatus: "PREPARING" | "READY" | "DONE") {
    try {
      await axios.patch(`/api/orders/${orderId}/status`, { status: nextStatus });
    } catch (error) {
      console.error("Failed to update order status:", error);
    }
  }

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-[#0a0a0a] text-white"
    >
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center justify-between border-b border-[#252525] px-6 py-4 bg-[#0a0a0a]/80 backdrop-blur-xl sticky top-0 z-50"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#f97316] to-[#ea6c0a]">
            <ChefHat className="size-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Kitchen Display</h1>
            <p className="text-sm text-[#999999]">Live orders update automatically</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-[#999999]">Active Orders</p>
            <p className="text-3xl font-bold text-white tabular-nums">{sortedOrders.length}</p>
          </div>
          <div className="h-12 w-px bg-[#252525]" />
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-[#999999]">Time</p>
            <p className="text-2xl font-bold text-white tabular-nums">{clock}</p>
          </div>
        </div>
      </motion.header>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-6"
      >
        {sortedOrders.length === 0 ? (
          <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
              className="flex h-24 w-24 items-center justify-center rounded-full bg-[#141414] border border-[#252525] mb-4"
            >
              <Package className="size-10 text-[#555555]" />
            </motion.div>
            <p className="text-2xl text-[#555555]">Nothing here yet</p>
            <p className="text-sm text-[#999999] mt-2">Orders will appear here when they come in</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* New Column */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-[#141414] border border-[#252525] rounded-xl overflow-hidden"
            >
              <div className="p-4 border-b border-[#252525] bg-blue-500/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="size-5 text-blue-500" />
                    <h2 className="text-lg font-semibold text-blue-500">New</h2>
                  </div>
                  <Badge className="bg-blue-500/10 text-blue-500 border-0">
                    {sortedOrders.filter((o) => o.status === "NEW").length}
                  </Badge>
                </div>
              </div>
              <div className="p-4 space-y-3 min-h-[400px]">
                <AnimatePresence mode="popLayout">
                  {sortedOrders
                    .filter((order) => order.status === "NEW")
                    .map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onUpdate={() => void updateOrderStatus(order.id, "PREPARING")}
                        actionLabel="Start Preparing"
                        isFlashing={flashingOrderIds.includes(order.id)}
                      />
                    ))}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Preparing Column */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-[#141414] border border-[#252525] rounded-xl overflow-hidden"
            >
              <div className="p-4 border-b border-[#252525] bg-[#f97316]/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ChefHat className="size-5 text-[#f97316]" />
                    <h2 className="text-lg font-semibold text-[#f97316]">Preparing</h2>
                  </div>
                  <Badge className="bg-[#f97316]/10 text-[#f97316] border-0">
                    {sortedOrders.filter((o) => o.status === "PREPARING").length}
                  </Badge>
                </div>
              </div>
              <div className="p-4 space-y-3 min-h-[400px]">
                <AnimatePresence mode="popLayout">
                  {sortedOrders
                    .filter((order) => order.status === "PREPARING")
                    .map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onUpdate={() => void updateOrderStatus(order.id, "READY")}
                        actionLabel="Mark Ready"
                        isFlashing={flashingOrderIds.includes(order.id)}
                      />
                    ))}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Ready to Serve Column */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-[#141414] border border-[#252525] rounded-xl overflow-hidden"
            >
              <div className="p-4 border-b border-[#252525] bg-[#22c55e]/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="size-5 text-[#22c55e]" />
                    <h2 className="text-lg font-semibold text-[#22c55e]">Ready to serve</h2>
                  </div>
                  <Badge className="bg-[#22c55e]/10 text-[#22c55e] border-0">
                    {sortedOrders.filter((o) => o.status === "READY").length}
                  </Badge>
                </div>
              </div>
              <div className="p-4 space-y-3 min-h-[400px]">
                <AnimatePresence mode="popLayout">
                  {sortedOrders
                    .filter((order) => order.status === "READY")
                    .map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onUpdate={() => void updateOrderStatus(order.id, "DONE")}
                        actionLabel="Mark Done"
                        isFlashing={flashingOrderIds.includes(order.id)}
                      />
                    ))}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        )}
      </motion.section>
    </motion.main>
  );
}

function OrderCard({
  order,
  onUpdate,
  actionLabel,
  isFlashing,
}: {
  order: KitchenOrder;
  onUpdate: () => void;
  actionLabel: string;
  isFlashing: boolean;
}) {
  const createdAt = new Date(order.createdAt);
  const elapsedMinutes = Math.floor(
    (Date.now() - createdAt.getTime()) / (1000 * 60),
  );
  const isLate = elapsedMinutes > 15;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ scale: 1.02, y: -2 }}
      className={`rounded-xl bg-[#1e1e1e] border border-[#252525] p-5 shadow-lg transition-all hover-lift ${
        isFlashing ? "animate-pulse ring-2 ring-[#f97316]/50" : ""
      }`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-3xl font-bold text-white">{order.table.name}</p>
          <p className="text-sm text-[#999999]">#{order.orderNumber}</p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
          isLate ? "bg-[#ef4444]/10 text-[#ef4444]" : "bg-[#f97316]/10 text-[#f97316]"
        }`}>
          {isLate ? <AlertTriangle className="size-4" /> : <Timer className="size-4" />}
          <p className="text-sm font-bold tabular-nums">{elapsedMinutes}m</p>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        {order.items.map((item) => (
          <div key={item.id} className="flex items-center justify-between p-2 bg-[#141414] rounded-lg">
            <span className="text-sm text-[#999999]">
              <span className="mr-2 font-bold text-white">{item.quantity}x</span>
              {item.menuItem.name}
            </span>
          </div>
        ))}
      </div>

      {order.specialNote && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mb-4 rounded-lg border border-[#eab308]/40 bg-[#eab308]/10 p-3"
        >
          <div className="flex items-center gap-2 mb-1">
            <Bell className="size-4 text-[#eab308]" />
            <p className="text-sm font-semibold text-[#eab308]">Special Note</p>
          </div>
          <p className="mt-1 text-sm text-[#fef9c3]">{order.specialNote}</p>
        </motion.div>
      )}

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onUpdate}
        className="w-full rounded-lg bg-[#f97316] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#ea6c0a] shadow-lg shadow-[#f97316]/20"
      >
        {actionLabel}
      </motion.button>
    </motion.article>
  );
}

