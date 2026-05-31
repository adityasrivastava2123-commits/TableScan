"use client";

import { useCallback, useEffect, useMemo, useState, memo } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import axios from "axios";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle2, Clock, ChefHat, Package, Check, X, MoreVertical } from "lucide-react";
import toast from "react-hot-toast";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getPusherClient } from "@/lib/pusher-client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

type BoardStatus = "NEW" | "PREPARING" | "READY" | "DONE";
type UpdatableStatus = "PREPARING" | "READY" | "DONE" | "CANCELLED";

type BoardOrder = {
  id: string;
  orderNumber: string;
  status: "NEW" | "PREPARING" | "READY" | "DONE" | "CANCELLED";
  totalAmount: number;
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
  payment: {
    status: string;
  } | null;
};

const boardStatuses: BoardStatus[] = ["NEW", "PREPARING", "READY", "DONE"];

const columnStyles: Record<BoardStatus, { bg: string; text: string; label: string; icon: React.ReactNode }> = {
  NEW: {
    bg: "bg-blue-500/10",
    text: "text-blue-500",
    label: "NEW",
    icon: <Clock className="size-4" />,
  },
  PREPARING: {
    bg: "bg-[#f97316]/10",
    text: "text-[#f97316]",
    label: "PREPARING",
    icon: <ChefHat className="size-4" />,
  },
  READY: {
    bg: "bg-[#22c55e]/10",
    text: "text-[#22c55e]",
    label: "READY",
    icon: <Package className="size-4" />,
  },
  DONE: {
    bg: "bg-[#999999]/10",
    text: "text-[#999999]",
    label: "DONE",
    icon: <Check className="size-4" />,
  },
};

const nextStatusAction: Record<
  "NEW" | "PREPARING" | "READY",
  { status: UpdatableStatus; label: string }
> = {
  NEW: { status: "PREPARING", label: "Start Preparing" },
  PREPARING: { status: "READY", label: "Mark Ready" },
  READY: { status: "DONE", label: "Mark Done" },
};

type OrdersBoardProps = {
  restaurantId: string;
};

export const OrdersBoard = memo(function OrdersBoard({ restaurantId }: OrdersBoardProps) {
  const [orders, setOrders] = useState<BoardOrder[]>([]);
  const [minLoading, setMinLoading] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [usePollingFallback, setUsePollingFallback] = useState(false);
  const queryClient = useQueryClient();

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ["orders", restaurantId],
    queryFn: async () => {
      const { data } = await axios.get<BoardOrder[]>(
        `/api/orders/restaurant/${restaurantId}`,
      );
      return data;
    },
    staleTime: 1000 * 30, // 30 seconds
  });

  useEffect(() => {
    if (ordersData) {
      setOrders(ordersData);
      setMinLoading(false);
    }
  }, [ordersData]);

  const handleNewOrder = useCallback((payload: { order?: BoardOrder }) => {
    if (!payload?.order) return;
    setOrders((prev) => {
      const exists = prev.some((order) => order.id === payload.order!.id);
      if (exists) return prev;
      if (payload.order!.status === "CANCELLED") return prev;
      return [payload.order!, ...prev];
    });
    toast.success("New order received!");
  }, []);

  const handleOrderUpdated = useCallback((payload: { order?: BoardOrder }) => {
    if (!payload?.order) return;
    setOrders((prev) =>
      prev.map((order) =>
        order.id === payload.order!.id ? payload.order! : order,
      ).filter((order) => order.status !== "CANCELLED"),
    );
  }, []);

  const handleConnectionError = useCallback(() => {
    setUsePollingFallback(true);
  }, []);

  useEffect(() => {
    const pusherClient = getPusherClient();
    const channelName = `restaurant-${restaurantId}`;
    const channel = pusherClient.subscribe(channelName);

    channel.bind("new-order", handleNewOrder);
    channel.bind("order-updated", handleOrderUpdated);
    pusherClient.connection.bind("error", handleConnectionError);
    pusherClient.connection.bind("unavailable", handleConnectionError);

    return () => {
      channel.unbind("new-order", handleNewOrder);
      channel.unbind("order-updated", handleOrderUpdated);
      pusherClient.unsubscribe(channelName);
      pusherClient.connection.unbind("error", handleConnectionError);
      pusherClient.connection.unbind("unavailable", handleConnectionError);
    };
  }, [restaurantId, handleNewOrder, handleOrderUpdated, handleConnectionError]);

  useEffect(() => {
    if (!usePollingFallback) return;

    const interval = setInterval(() => {
      // React Query will handle refetching automatically
      void window.location.reload();
    }, 10000);

    return () => clearInterval(interval);
  }, [usePollingFallback]);

  const groupedOrders = useMemo(() => {
    return {
      NEW: orders.filter((order) => order.status === "NEW"),
      PREPARING: orders.filter((order) => order.status === "PREPARING"),
      READY: orders.filter((order) => order.status === "READY"),
      DONE: orders.filter((order) => order.status === "DONE"),
    };
  }, [orders]);

  const stats = useMemo(() => {
    const today = new Date();
    const todaysOrders = orders.filter((order) => {
      const createdAt = new Date(order.createdAt);
      return (
        createdAt.getDate() === today.getDate() &&
        createdAt.getMonth() === today.getMonth() &&
        createdAt.getFullYear() === today.getFullYear()
      );
    });

    const pendingOrders = orders.filter(
      (order) => order.status === "NEW" || order.status === "PREPARING",
    ).length;

    const revenueToday = todaysOrders.reduce(
      (sum, order) => sum + order.totalAmount,
      0,
    );
    const averageOrderValue =
      todaysOrders.length > 0 ? revenueToday / todaysOrders.length : 0;

    return {
      totalOrdersToday: todaysOrders.length,
      pendingOrders,
      revenueToday,
      averageOrderValue,
    };
  }, [orders]);

  const updateOrderStatus = useCallback(async (orderId: string, status: UpdatableStatus) => {
    try {
      setUpdatingOrderId(orderId);
      await axios.patch(`/api/orders/${orderId}/status`, { status });

      setOrders((prev) =>
        prev
          .map((order) =>
            order.id === orderId ? { ...order, status } : order,
          )
          .filter((order) => order.status !== "CANCELLED"),
      );
      
      // Invalidate cache to refetch data
      queryClient.invalidateQueries({ queryKey: ["orders", restaurantId] });
    } catch (error) {
      console.error(error);
      toast.error("Failed to update order status.");
    } finally {
      setUpdatingOrderId(null);
    }
  }, [restaurantId, queryClient]);

  if (minLoading) {
    return <OrdersBoardSkeleton />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 mb-6"
      >
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#f97316] to-transparent" />
        <p className="text-[0.65rem] font-semibold tracking-[0.12em] uppercase text-[#f97316]">OPERATIONS</p>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#f97316] to-transparent" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h1 className="text-4xl font-extrabold tracking-tight text-white">
          All <span className="text-[#999999] italic">orders.</span>
        </h1>
        <p className="text-[#999999] mt-2">{orders.length} orders · streaming in real time</p>
      </motion.div>

      {/* Filter Tabs */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex gap-2"
      >
        {["All", "Pending", "Preparing", "Ready", "Done", "Cancelled"].map((filter) => (
          <motion.button
            key={filter}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all hover-lift ${
              filter === "All"
                ? "bg-[#f97316] text-white"
                : "bg-[#141414] text-[#999999] border border-[#252525] hover:bg-[#1e1e1e]"
            }`}
          >
            {filter}
          </motion.button>
        ))}
      </motion.div>

      {/* Kanban Board */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {boardStatuses.map((status) => {
          const columnOrders = groupedOrders[status];
          const style = columnStyles[status];

          return (
            <div key={status} className="bg-[#141414] border border-[#252525] rounded-xl overflow-hidden">
              {/* Column Header */}
              <div className={`p-4 border-b border-[#252525] ${style.bg}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {style.icon}
                    <h3 className={`font-semibold ${style.text}`}>{style.label}</h3>
                  </div>
                  <Badge className={`${style.bg} ${style.text} border-0`}>
                    {columnOrders.length}
                  </Badge>
                </div>
              </div>

              {/* Column Content */}
              <div className="p-3 space-y-3 min-h-[400px]">
                <AnimatePresence mode="popLayout">
                  {columnOrders.map((order) => (
                    <motion.div
                      key={order.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      whileHover={{ scale: 1.02, y: -2 }}
                      className="bg-[#1e1e1e] border border-[#252525] rounded-lg p-4 hover-lift cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <span className="text-white font-bold text-lg">#{order.orderNumber}</span>
                          <p className="text-[#999999] text-sm">{order.table.name}</p>
                        </div>
                        <StatusBadge status={order.status} />
                      </div>

                      <div className="space-y-2 mb-3">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between text-sm">
                            <span className="text-[#999999]">
                              {item.quantity}x {item.menuItem.name}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-[#252525]">
                        <span className="text-white font-semibold text-lg tabular-nums">
                          ₹{order.totalAmount.toFixed(2)}
                        </span>
                        <span className="text-[#555555] text-xs">
                          {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                        </span>
                      </div>

                      {status !== "DONE" && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => updateOrderStatus(order.id, nextStatusAction[status].status)}
                          disabled={updatingOrderId === order.id}
                          className="w-full mt-3 px-3 py-2 rounded-lg bg-[#f97316] text-white text-sm font-medium hover:bg-[#ea6c0a] transition-colors disabled:opacity-50"
                        >
                          {updatingOrderId === order.id ? "Updating..." : nextStatusAction[status].label}
                        </motion.button>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>

                {columnOrders.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-[#555555]">
                    {style.icon}
                    <p className="text-sm mt-2">No orders</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </motion.div>
    </motion.div>
  );
});

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { color: string; label: string; bg: string }> = {
    "NEW": { color: "text-blue-500", label: "NEW", bg: "bg-blue-500/10" },
    "PREPARING": { color: "text-[#f97316]", label: "PREPARING", bg: "bg-[#f97316]/10" },
    "READY": { color: "text-[#22c55e]", label: "READY", bg: "bg-[#22c55e]/10" },
    "DONE": { color: "text-[#999999]", label: "DONE", bg: "bg-[#999999]/10" },
    "CANCELLED": { color: "text-[#ef4444]", label: "CANCELLED", bg: "bg-[#ef4444]/10" },
  };

  const config = statusConfig[status] || statusConfig["NEW"];

  return (
    <Badge className={`${config.bg} ${config.color} border-0`}>
      {config.label}
    </Badge>
  );
}

function StatsCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4 shadow-sm bg-[#141414] border-[#252525]">
      <p className="text-sm text-[#999999]">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
    </Card>
  );
}

function OrdersBoardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-80" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <Card key={idx} className="min-h-[500px] bg-[#141414] border-[#252525] overflow-hidden">
            <Skeleton className="h-16" />
            <div className="p-3 space-y-3">
              {Array.from({ length: 3 }).map((__, cardIdx) => (
                <div
                  key={cardIdx}
                  className="h-24 rounded-md bg-[#1e1e1e]"
                />
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

