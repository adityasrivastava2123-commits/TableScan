"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import { CheckCircle, Clock, ChefHat, Bell, CheckCircle2, XCircle } from "lucide-react";
import { getPusherClient } from "@/lib/pusher-client";

const STATUS_STEPS = [
  {
    key: "NEW",
    label: "Order Placed",
    sublabel: "Your order has been received",
    icon: CheckCircle,
    color: "text-[#60a5fa]",
    bg: "bg-[rgba(59,130,246,0.12)]",
    border: "border-[rgba(59,130,246,0.25)]",
  },
  {
    key: "PREPARING",
    label: "Preparing",
    sublabel: "Kitchen is working on your order",
    icon: ChefHat,
    color: "text-[#f97316]",
    bg: "bg-[rgba(249,115,22,0.12)]",
    border: "border-[rgba(249,115,22,0.25)]",
  },
  {
    key: "READY",
    label: "Ready to Serve",
    sublabel: "Your order is ready!",
    icon: Bell,
    color: "text-[#4ade80]",
    bg: "bg-[rgba(34,197,94,0.12)]",
    border: "border-[rgba(34,197,94,0.25)]",
  },
  {
    key: "DONE",
    label: "Served",
    sublabel: "Enjoy your meal!",
    icon: CheckCircle2,
    color: "text-[#9a9488]",
    bg: "bg-[rgba(154,148,136,0.1)]",
    border: "border-[rgba(154,148,136,0.2)]",
  },
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

    const handleConnectionError = () => setUsePollingFallback(true);

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
    const interval = setInterval(() => void fetchOrder(), 10000);
    return () => clearInterval(interval);
  }, [fetchOrder, usePollingFallback]);

  if (!order) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-2 border-[#f97316] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[#9a9488] text-sm">Loading your order...</p>
        </div>
      </div>
    );
  }

  if (order.status === "CANCELLED") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="bg-[#111111] border border-[rgba(239,68,68,0.2)] rounded-2xl p-8 max-w-sm w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-[rgba(239,68,68,0.12)] flex items-center justify-center mx-auto">
            <XCircle className="w-8 h-8 text-[#ef4444]" />
          </div>
          <h1 className="text-xl font-bold text-[#f0ece4]">Order Cancelled</h1>
          <p className="text-[#9a9488] text-sm">
            Order #{order.orderNumber} has been cancelled. Please speak to a staff member.
          </p>
        </div>
      </div>
    );
  }

  const currentIndex = STATUS_STEPS.findIndex((s) => s.key === order.status);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">
        {/* Header card */}
        <div className="bg-[#111111] border border-[rgba(255,255,255,0.07)] rounded-2xl p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-[rgba(34,197,94,0.12)] border border-[rgba(34,197,94,0.25)] flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-7 h-7 text-[#4ade80]" />
          </div>
          <h1 className="text-xl font-bold text-[#f0ece4]">Order Confirmed</h1>
          <p className="text-[#9a9488] text-sm mt-1">#{order.orderNumber}</p>
          <div className="mt-3 inline-flex items-center gap-1.5 bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.2)] rounded-full px-3 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse" />
            <span className="text-[11px] font-semibold text-[#4ade80] tracking-wider">LIVE TRACKING</span>
          </div>
        </div>

        {/* Status steps */}
        <div className="bg-[#111111] border border-[rgba(255,255,255,0.07)] rounded-2xl p-4 space-y-2">
          {STATUS_STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentIndex;
            const isDone = index < currentIndex;

            return (
              <div
                key={step.key}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  isActive
                    ? `${step.bg} ${step.border}`
                    : isDone
                    ? "border-transparent opacity-40"
                    : "border-transparent opacity-25"
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isActive ? step.bg : "bg-[#1a1a1a]"}`}>
                  <Icon className={`w-4 h-4 ${isActive ? step.color : "text-[#5a5650]"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[13px] font-semibold ${isActive ? "text-[#f0ece4]" : "text-[#5a5650]"}`}>
                    {step.label}
                  </p>
                  {isActive && (
                    <p className="text-[11px] text-[#9a9488] mt-0.5">{step.sublabel}</p>
                  )}
                </div>
                {isActive && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${step.bg} ${step.color} tracking-wider`}>
                    NOW
                  </span>
                )}
                {isDone && (
                  <CheckCircle2 className="w-4 h-4 text-[#4ade80] flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        <p className="text-center text-[11px] text-[#5a5650]">
          This page updates automatically · no need to refresh
        </p>
      </div>
    </div>
  );
}
