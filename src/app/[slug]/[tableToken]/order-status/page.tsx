"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import { CheckCircle, Clock, ChefHat, Bell } from "lucide-react";
import { getPusherClient } from "@/lib/pusher-client";

const STATUS_STEPS = [
  { key: "NEW", label: "Order Placed", icon: CheckCircle, color: "text-blue-500" },
  { key: "PREPARING", label: "Preparing", icon: ChefHat, color: "text-orange-500" },
  { key: "READY", label: "Ready to Serve", icon: Bell, color: "text-green-500" },
  { key: "DONE", label: "Served", icon: CheckCircle, color: "text-gray-500" },
];

type CustomerOrderStatus = "NEW" | "PREPARING" | "READY" | "DONE" | "CANCELLED";
type OrderStatusResponse = {
  id: string;
  orderNumber: string;
  status: CustomerOrderStatus;
};

export default function OrderStatusPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const [order, setOrder] = useState<OrderStatusResponse | null>(null);
  const [usePollingFallback, setUsePollingFallback] = useState(false);

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;

    try {
      const { data } = await axios.get<OrderStatusResponse>(`/api/orders/${orderId}`);
      setOrder(data);
    } catch (error) {
      console.error(error);
    }
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return;
    void fetchOrder();
  }, [fetchOrder, orderId]);

  useEffect(() => {
    if (!orderId) return;

    const pusherClient = getPusherClient();
    const channelName = `order-${orderId}`;
    const channel = pusherClient.subscribe(channelName);

    const handleOrderUpdated = (payload: { status?: CustomerOrderStatus }) => {
      if (!payload?.status) return;
      setOrder((prev) => (prev ? { ...prev, status: payload.status! } : prev));
    };

    const handleConnectionError = () => {
      setUsePollingFallback(true);
    };

    channel.bind("order-updated", handleOrderUpdated);
    pusherClient.connection.bind("error", handleConnectionError);
    pusherClient.connection.bind("unavailable", handleConnectionError);

    return () => {
      channel.unbind("order-updated", handleOrderUpdated);
      pusherClient.unsubscribe(channelName);
      pusherClient.connection.unbind("error", handleConnectionError);
      pusherClient.connection.unbind("unavailable", handleConnectionError);
    };
  }, [orderId]);

  useEffect(() => {
    if (!usePollingFallback) return;
    const interval = setInterval(() => {
      void fetchOrder();
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchOrder, usePollingFallback]);

  if (!order) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-2">
        <Clock size={48} className="mx-auto text-gray-300 animate-spin" />
        <p className="text-gray-500">Loading your order...</p>
      </div>
    </div>
  );

  const currentIndex = STATUS_STEPS.findIndex((s) => s.key === order.status);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full space-y-6">
        <div className="text-center">
          <CheckCircle size={56} className="mx-auto text-green-500 mb-3" />
          <h1 className="text-2xl font-bold">Order Confirmed!</h1>
          <p className="text-gray-500 text-sm mt-1">#{order.orderNumber}</p>
        </div>

        <div className="space-y-3">
          {STATUS_STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentIndex;
            const isDone = index < currentIndex;
            return (
              <div key={step.key}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all
                  ${isActive ? "bg-gray-50 border-2 border-gray-200" : ""}
                  ${isDone ? "opacity-50" : ""}`}>
                <Icon size={24} className={isActive ? step.color : "text-gray-300"} />
                <span className={`font-medium ${isActive ? "text-gray-900" : "text-gray-400"}`}>
                  {step.label}
                </span>
                {isActive && (
                  <span className="ml-auto text-xs bg-black text-white px-2 py-0.5 rounded-full">
                    Now
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-center text-sm text-gray-400">
          This page updates automatically in real time
        </p>
      </div>
    </div>
  );
}