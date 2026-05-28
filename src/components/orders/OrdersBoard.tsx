"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPusherClient } from "@/lib/pusher-client";

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

const columnStyles: Record<BoardStatus, { bg: string; text: string; label: string }> = {
  NEW: {
    bg: "bg-blue-100",
    text: "text-blue-700",
    label: "NEW",
  },
  PREPARING: {
    bg: "bg-orange-100",
    text: "text-orange-700",
    label: "PREPARING",
  },
  READY: {
    bg: "bg-green-100",
    text: "text-green-700",
    label: "READY",
  },
  DONE: {
    bg: "bg-slate-100",
    text: "text-slate-700",
    label: "DONE",
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

export function OrdersBoard({ restaurantId }: OrdersBoardProps) {
  const [orders, setOrders] = useState<BoardOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [usePollingFallback, setUsePollingFallback] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const { data } = await axios.get<BoardOrder[]>(
        `/api/orders/restaurant/${restaurantId}`,
      );
      setOrders(data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch orders.");
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    const pusherClient = getPusherClient();
    const channelName = `restaurant-${restaurantId}`;
    const channel = pusherClient.subscribe(channelName);

    const handleNewOrder = (payload: { order?: BoardOrder }) => {
      if (!payload?.order) return;
      setOrders((prev) => {
        const exists = prev.some((order) => order.id === payload.order!.id);
        if (exists) return prev;
        return [payload.order!, ...prev];
      });
      toast.success("New order received!");
    };

    const handleOrderUpdated = (payload: { order?: BoardOrder }) => {
      if (!payload?.order) return;
      setOrders((prev) => {
        const hasOrder = prev.some((order) => order.id === payload.order!.id);
        if (!hasOrder && payload.order!.status !== "CANCELLED") {
          return [payload.order!, ...prev];
        }

        return prev
          .map((order) =>
            order.id === payload.order!.id ? payload.order! : order,
          )
          .filter((order) => order.status !== "CANCELLED");
      });
    };

    const handleConnectionError = () => {
      setUsePollingFallback(true);
    };

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
  }, [restaurantId]);

  useEffect(() => {
    if (!usePollingFallback) return;

    const interval = setInterval(() => {
      void fetchOrders();
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchOrders, usePollingFallback]);

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

  const updateOrderStatus = async (orderId: string, status: UpdatableStatus) => {
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
    } catch (error) {
      console.error(error);
      toast.error("Failed to update order status.");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  if (loading) {
    return <OrdersBoardSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard label="Total orders today" value={stats.totalOrdersToday.toString()} />
        <StatsCard label="Pending orders" value={stats.pendingOrders.toString()} />
        <StatsCard label="Revenue today" value={`₹${stats.revenueToday.toFixed(2)}`} />
        <StatsCard
          label="Average order value"
          value={`₹${stats.averageOrderValue.toFixed(2)}`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4 overflow-x-auto pb-2 -mx-4 px-4">
        {boardStatuses.map((status) => (
          <div key={status} className="flex min-h-[500px] w-80 flex-shrink-0 flex-col rounded-lg border bg-muted/20">
            <div
              className={`sticky top-0 z-10 flex items-center justify-between rounded-t-lg px-4 py-3 ${columnStyles[status].bg}`}
            >
              <h3 className={`text-sm font-semibold ${columnStyles[status].text}`}>
                {columnStyles[status].label}
              </h3>
              <Badge variant="secondary">{groupedOrders[status].length}</Badge>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-3">
              {groupedOrders[status].length === 0 ? (
                <div className="flex h-40 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                  No orders
                </div>
              ) : (
                groupedOrders[status].map((order) => (
                  <Card
                    key={order.id}
                    className="space-y-3 p-4 shadow-sm transition hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{order.orderNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          Table: {order.table.name}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(order.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>

                    <div className="space-y-1 rounded-md bg-muted/30 p-2">
                      {order.items.map((item) => (
                        <p key={item.id} className="text-xs">
                          {item.quantity}x {item.menuItem.name}
                        </p>
                      ))}
                    </div>

                    <div className="space-y-1">
                      {order.customerName ? (
                        <p className="text-xs text-muted-foreground">
                          Customer: {order.customerName}
                        </p>
                      ) : null}
                      <p className="text-sm font-semibold">
                        Total: ₹{order.totalAmount.toFixed(2)}
                      </p>
                    </div>

                    {order.status === "DONE" ? (
                      <div className="flex items-center gap-2 text-sm text-green-700">
                        <CheckCircle2 className="h-4 w-4" />
                        Completed
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {order.status === "NEW" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                            disabled={updatingOrderId === order.id}
                            onClick={() => void updateOrderStatus(order.id, "CANCELLED")}
                          >
                            Cancel
                          </Button>
                        ) : null}

                        {order.status in nextStatusAction ? (
                          <Button
                            size="sm"
                            disabled={updatingOrderId === order.id}
                            onClick={() =>
                              void updateOrderStatus(
                                order.id,
                                nextStatusAction[order.status as keyof typeof nextStatusAction]
                                  .status,
                              )
                            }
                          >
                            {
                              nextStatusAction[order.status as keyof typeof nextStatusAction]
                                .label
                            }
                          </Button>
                        ) : null}
                      </div>
                    )}
                  </Card>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </Card>
  );
}

function OrdersBoardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <Card key={idx} className="space-y-3 p-4">
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            <div className="h-7 w-24 animate-pulse rounded bg-muted" />
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4 overflow-x-auto pb-2 -mx-4 px-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <Card key={idx} className="min-h-[500px] w-80 flex-shrink-0 p-4">
            <div className="h-5 w-20 animate-pulse rounded bg-muted" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 3 }).map((__, cardIdx) => (
                <div
                  key={cardIdx}
                  className="h-24 animate-pulse rounded-md bg-muted/70"
                />
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

