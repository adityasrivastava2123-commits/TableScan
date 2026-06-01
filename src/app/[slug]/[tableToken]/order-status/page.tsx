"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, ChefHat, Bell, XCircle, ArrowLeft,
  Clock, Utensils, RefreshCw,
} from "lucide-react";
import { getPusherClient } from "@/lib/pusher-client";

const G = "#3D7A5A";

const STATUS_STEPS = [
  {
    key: "NEW",
    label: "Order Received",
    sublabel: "Your order is confirmed ✅",
    icon: "🧾",
    color: G,
  },
  {
    key: "PREPARING",
    label: "Being Prepared",
    sublabel: "Our chef is cooking your food 👨‍🍳",
    icon: "🍳",
    color: "#F97316",
  },
  {
    key: "READY",
    label: "Ready to Serve",
    sublabel: "Your order is ready! Coming right up 🚀",
    icon: "🔔",
    color: G,
  },
  {
    key: "DONE",
    label: "Served",
    sublabel: "Enjoy your meal! 🍽️",
    icon: "✅",
    color: G,
  },
];

type OrderStatus = "NEW" | "PREPARING" | "READY" | "DONE" | "CANCELLED";

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  note?: string | null;
  menuItem?: {
    id: string;
    name: string;
    isVeg: boolean;
  } | null;
}

interface Payment {
  id: string;
  amount: number;
  status: string;
  method: string;
  transactionId?: string | null;
}

type OrderData = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  taxAmount?: number | null;
  createdAt: string;
  paymentMethod: string;
  specialNote?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  table?: { name: string };
  restaurant?: {
    name: string;
    logo?: string | null;
  } | null;
  items?: OrderItem[];
  payment?: Payment | null;
};

export default function OrderStatusPage() {
  const searchParams = useSearchParams();
  const params = useParams();
  const router = useRouter();

  const orderId = searchParams.get("orderId");
  const slug = params?.slug as string;
  const tableToken = params?.tableToken as string;

  const [order, setOrder] = useState<OrderData | null>(null);
  const [ordersList, setOrdersList] = useState<OrderData[]>([]);
  const [receiptType, setReceiptType] = useState<"SINGLE" | "COMBINED">("SINGLE");
  const [loading, setLoading] = useState(true);
  const [usePollingFallback, setUsePollingFallback] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [showReceipt, setShowReceipt] = useState(false);

  useEffect(() => {
    if (searchParams.get("showReceipt") === "true" && order?.status === "DONE") {
      setShowReceipt(true);
    }
  }, [searchParams, order?.status]);

  const fetchAllOrders = useCallback(async () => {
    let ids: string[] = [];
    if (orderId) ids.push(orderId);

    if (typeof window !== "undefined") {
      try {
        const saved = JSON.parse(localStorage.getItem(`tablescan_orders_${tableToken}`) || "[]");
        if (Array.isArray(saved)) {
          saved.forEach((id: string) => {
            if (id && typeof id === "string" && !ids.includes(id)) {
              ids.push(id);
            }
          });
        }
      } catch (e) { /* silent */ }
    }

    if (ids.length === 0) {
      setLoading(false);
      return;
    }

    try {
      const responses = await Promise.all(
        ids.map(id =>
          axios
            .get<OrderData>(`/api/orders/${id}`)
            .then(res => res.data)
            .catch(() => null)
        )
      );
      const validOrders = responses.filter((o): o is OrderData => o !== null);
      setOrdersList(validOrders);

      // Default tracking target
      const currentTracker = validOrders.find(o => o.id === orderId) || validOrders[0];
      if (currentTracker) {
        setOrder(currentTracker);
      }
      setLastUpdated(new Date());
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [orderId, tableToken]);

  useEffect(() => { void fetchAllOrders(); }, [fetchAllOrders]);

  // Pusher real-time updates for all orders in parallel
  useEffect(() => {
    if (ordersList.length === 0) return;
    const pusherClient = getPusherClient();

    const activeChannels = ordersList.map(o => {
      const channelName = `order-${o.id}`;
      const channel = pusherClient.subscribe(channelName);

      const handleUpdated = (payload: { status?: OrderStatus }) => {
        if (!payload?.status) return;

        // Update specific order in the list
        setOrdersList(prev =>
          prev.map(item =>
            item.id === o.id ? { ...item, status: payload.status! } : item
          )
        );

        // If it's the currently viewed order, update it too
        setOrder(prev => {
          if (prev && prev.id === o.id) {
            return { ...prev, status: payload.status! };
          }
          return prev;
        });

        setLastUpdated(new Date());
      };

      channel.bind("order-updated", handleUpdated);
      return { channel, channelName, handleUpdated };
    });

    const handleError = () => setUsePollingFallback(true);
    pusherClient.connection.bind("error", handleError);
    pusherClient.connection.bind("unavailable", handleError);

    return () => {
      activeChannels.forEach(chan => {
        chan.channel.unbind("order-updated", chan.handleUpdated);
        pusherClient.unsubscribe(chan.channelName);
      });
      pusherClient.connection.unbind("error", handleError);
      pusherClient.connection.unbind("unavailable", handleError);
    };
  }, [ordersList]);

  // Polling fallback
  useEffect(() => {
    if (!usePollingFallback) return;
    const interval = setInterval(() => void fetchAllOrders(), 10000);
    return () => clearInterval(interval);
  }, [fetchAllOrders, usePollingFallback]);

  const goBack = () => router.push(`/${slug}/${tableToken}`);

  // Consolidated receipt details
  const consolidatedDetails = useMemo(() => {
    if (ordersList.length === 0) return null;

    // Filter out cancelled orders
    const activeOrders = ordersList.filter(o => o.status !== "CANCELLED");

    // Map items
    const itemsMap: Record<string, { menuItem: any; price: number; quantity: number; notes: string[] }> = {};
    let subtotal = 0;
    let taxAmount = 0;

    activeOrders.forEach(o => {
      o.items?.forEach(item => {
        const key = item.menuItem?.id || item.id;
        if (itemsMap[key]) {
          itemsMap[key].quantity += item.quantity;
          if (item.note) itemsMap[key].notes.push(item.note);
        } else {
          itemsMap[key] = {
            menuItem: item.menuItem,
            price: item.price,
            quantity: item.quantity,
            notes: item.note ? [item.note] : [],
          };
        }
      });
      taxAmount += o.taxAmount ?? 0;
      subtotal += ((o.totalAmount ?? 0) - (o.taxAmount ?? 0));
    });

    const consolidatedItems = Object.values(itemsMap);
    const totalAmount = subtotal + taxAmount;

    return {
      items: consolidatedItems,
      subtotal,
      taxAmount,
      totalAmount,
      ordersCount: activeOrders.length,
    };
  }, [ordersList]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center"
        style={{ fontFamily: "var(--font-poppins, 'Poppins', sans-serif)" }}>
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded-full border-[3px] border-t-[#3D7A5A] border-[#3D7A5A]/20
            animate-spin mx-auto" />
          <p className="text-sm font-semibold text-gray-400">Loading your order…</p>
        </div>
      </div>
    );
  }

  // ── No orderId ────────────────────────────────────────────────────────────
  if (!orderId || !order) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6"
        style={{ fontFamily: "var(--font-poppins, 'Poppins', sans-serif)" }}>
        <div className="w-full max-w-sm bg-white rounded-[28px] shadow-xl p-8 text-center space-y-4">
          <span className="text-5xl">🍽️</span>
          <h2 className="text-lg font-bold text-gray-900">No active order</h2>
          <p className="text-xs text-gray-400">Place an order first to track it here.</p>
          <button onClick={goBack}
            className="w-full py-3.5 rounded-2xl text-white text-sm font-bold"
            style={{ background: G }}>
            Back to Menu
          </button>
        </div>
      </div>
    );
  }

  // ── Cancelled ─────────────────────────────────────────────────────────────
  if (order.status === "CANCELLED") {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6"
        style={{ fontFamily: "var(--font-poppins, 'Poppins', sans-serif)" }}>
        <div className="w-full max-w-sm bg-white rounded-[28px] shadow-xl p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Order Cancelled</h2>
          <p className="text-xs text-gray-400">
            Order #{order.orderNumber} was cancelled. Please speak to a staff member.
          </p>
          <button onClick={goBack}
            className="w-full py-3.5 rounded-2xl text-white text-sm font-bold"
            style={{ background: G }}>
            Back to Menu
          </button>
        </div>
      </div>
    );
  }

  // ── Active order tracker ──────────────────────────────────────────────────
  const currentIndex = STATUS_STEPS.findIndex(s => s.key === order.status);
  const progressPct = currentIndex < 0 ? 0 : Math.round((currentIndex / (STATUS_STEPS.length - 1)) * 100);

  return (
    <div
      className="min-h-screen bg-[#FAFAFA] pb-10"
      style={{ fontFamily: "var(--font-poppins, 'Poppins', sans-serif)" }}
    >
      {/* Header */}
      <div className="bg-white px-5 pt-6 pb-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={goBack}
            className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-extrabold text-gray-900">Track Order</h1>
            <p className="text-[11px] text-gray-400">#{order.orderNumber}</p>
          </div>
          {/* Live dot */}
          <div className="flex items-center gap-1.5 bg-[#3D7A5A]/10 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3D7A5A] animate-pulse" />
            <span className="text-[10px] font-bold text-[#3D7A5A] uppercase tracking-wider">Live</span>
          </div>
        </div>
      </div>

      <div className="px-5 pt-6 space-y-5">

        {/* Multiple Orders Selector Switcher */}
        {ordersList.length > 1 && (
          <div className="bg-white rounded-[24px] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-gray-100/50 space-y-2">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
              Active Orders ({ordersList.length})
            </p>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1 -mx-1 px-1">
              {ordersList.map((o) => (
                <button
                  key={o.id}
                  onClick={() => setOrder(o)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex-shrink-0 flex items-center gap-2 border ${
                    order?.id === o.id
                      ? "bg-[#3D7A5A] text-white border-transparent shadow-sm"
                      : "bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100"
                  }`}
                >
                  <span>#{o.orderNumber.substring(o.orderNumber.length - 4)}</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    o.status === "DONE" ? "bg-emerald-500" : o.status === "CANCELLED" ? "bg-red-500" : "bg-orange-500 animate-pulse"
                  }`} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Hero status card */}
        <motion.div
          key={order.status}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[24px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.07)] text-center space-y-3"
        >
          <motion.div
            key={order.status + "-icon"}
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 12, stiffness: 200 }}
            className="text-5xl mx-auto"
          >
            {STATUS_STEPS[currentIndex]?.icon ?? "⏳"}
          </motion.div>
          <div>
            <h2 className="text-xl font-extrabold text-gray-900">
              {STATUS_STEPS[currentIndex]?.label ?? "Processing"}
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              {STATUS_STEPS[currentIndex]?.sublabel ?? "Please wait…"}
            </p>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <motion.div
              className="h-2 rounded-full"
              style={{ background: G }}
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          <p className="text-[10px] text-gray-400 font-medium">
            Step {currentIndex + 1} of {STATUS_STEPS.length}
          </p>
        </motion.div>

        {/* Step tracker */}
        <div className="bg-white rounded-[24px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.07)] space-y-1">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
            Order Progress
          </p>
          {STATUS_STEPS.map((step, i) => {
            const done   = i < currentIndex;
            const active = i === currentIndex;
            const future = i > currentIndex;
            return (
              <div key={step.key} className="flex items-center gap-3">
                {/* Left: icon circle + connector line */}
                <div className="flex flex-col items-center flex-shrink-0">
                  <motion.div
                    animate={{
                      backgroundColor: done
                        ? G
                        : active
                        ? `${G}20`
                        : "#F3F4F6",
                      borderColor: active ? G : done ? G : "#E5E7EB",
                      scale: active ? 1.1 : 1,
                    }}
                    transition={{ duration: 0.3 }}
                    className="w-10 h-10 rounded-full flex items-center justify-center border-2"
                  >
                    {done ? (
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    ) : (
                      <span className={`text-base ${future ? "opacity-30" : ""}`}>
                        {step.icon}
                      </span>
                    )}
                  </motion.div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div className={`w-0.5 h-6 mt-1 rounded-full transition-colors duration-500
                      ${done ? "bg-[#3D7A5A]" : "bg-gray-200"}`} />
                  )}
                </div>

                {/* Right: text */}
                <div className={`flex-1 pb-6 ${i === STATUS_STEPS.length - 1 ? "pb-0" : ""}`}>
                  <p className={`text-sm font-bold transition-colors duration-300 ${
                    active ? "text-[#3D7A5A]" : done ? "text-gray-800" : "text-gray-300"
                  }`}>
                    {step.label}
                  </p>
                  {active && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="text-[11px] text-gray-400 mt-0.5"
                    >
                      {step.sublabel}
                    </motion.p>
                  )}
                </div>

                {/* NOW badge */}
                {active && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-[9px] font-black px-2 py-1 rounded-full text-white flex-shrink-0"
                    style={{ background: G }}
                  >
                    NOW
                  </motion.span>
                )}
              </div>
            );
          })}
        </div>

        {/* Info footer */}
        <div className="bg-[#3D7A5A]/6 rounded-[20px] px-4 py-3 flex items-center gap-3">
          <RefreshCw className="w-4 h-4 text-[#3D7A5A] flex-shrink-0" />
          <p className="text-[11px] text-[#3D7A5A] font-semibold">
            This page updates automatically via live tracking. Last updated:{" "}
            {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {order.status === "DONE" && (
            <button
              onClick={() => setShowReceipt(true)}
              className="w-full py-4 rounded-2xl text-white font-extrabold text-sm shadow-lg
                active:scale-95 transition-transform flex items-center justify-center gap-2"
              style={{ background: G }}
            >
              🧾 View Bill Receipt
            </button>
          )}

          <button
            onClick={goBack}
            className={`w-full py-4 rounded-2xl font-bold text-sm active:scale-95 transition-transform ${
              order.status === "DONE"
                ? "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                : "text-white shadow-md"
            }`}
            style={order.status === "DONE" ? {} : { background: G }}
          >
            {order.status === "DONE" ? "Go Back to Menu" : "+ Add More Items"}
          </button>
        </div>
      </div>

      {/* ─── Digital Bill Receipt Modal ────────────────────────────────────── */}
      <AnimatePresence>
        {showReceipt && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center p-0 sm:p-4" onClick={() => setShowReceipt(false)}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" />
            <motion.div
              initial={{ y: "100%", scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: "100%", scale: 0.95 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="relative w-full sm:max-w-md bg-white rounded-t-[32px] sm:rounded-[32px] max-h-[90vh] flex flex-col overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-gray-100 print:max-h-none print:shadow-none print:rounded-none"
              onClick={e => e.stopPropagation()}
              id="print-receipt-modal"
            >
              {/* Classy Gold/Green top aesthetic accent bar */}
              <div className="h-2 w-full bg-gradient-to-r from-[#3D7A5A] via-[#85b597] to-[#3D7A5A] flex-shrink-0" />

              {/* Receipt Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 print:overflow-visible relative">
                
                {/* Dynamic Restaurant Verified stamp */}
                <div className="absolute -rotate-12 right-6 top-6 w-20 h-20 rounded-full border-2 border-[#3D7A5A]/30 flex items-center justify-center opacity-70 print:opacity-100 flex-shrink-0 select-none pointer-events-none">
                  <div className="w-16 h-16 rounded-full border border-dashed border-[#3D7A5A]/35 flex flex-col items-center justify-center">
                    <span className="text-[8px] font-black text-[#3D7A5A] tracking-wider leading-none">VERIFIED</span>
                    <span className="text-[7px] font-bold text-gray-400 mt-1 uppercase truncate max-w-[50px]">
                      {order.restaurant?.name || "DINE"}
                    </span>
                  </div>
                </div>

                {/* Print Header - Premium Culinary Crest with Restaurant Logo */}
                <div className="text-center space-y-2.5">
                  <div className="flex justify-center mb-1">
                    {order.restaurant?.logo ? (
                      <div className="w-16 h-16 rounded-full overflow-hidden bg-white p-0.5 shadow-md border border-gray-100 flex items-center justify-center flex-shrink-0">
                        <img
                          src={order.restaurant.logo}
                          alt={order.restaurant.name}
                          className="w-full h-full object-cover rounded-full"
                        />
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#3D7A5A] to-[#559b75] p-0.5 shadow-md flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-1 rounded-full border border-dashed border-white/30" />
                        <span className="text-white text-xs font-black tracking-widest uppercase">DINE</span>
                      </div>
                    )}
                  </div>
                  <h2 className="text-base font-black text-gray-900 tracking-widest uppercase">
                    {order.restaurant?.name || "TableScan Invoice"}
                  </h2>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-extrabold">Exclusive Dine-In Service</p>
                </div>

                {/* Receipt Type Toggle (Only if multiple orders exist) */}
                {ordersList.length > 1 && (
                  <div className="flex p-1 bg-gray-100 rounded-xl gap-1 w-fit mx-auto print:hidden">
                    <button
                      onClick={() => setReceiptType("SINGLE")}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                        receiptType === "SINGLE"
                          ? "bg-white text-gray-800 shadow-sm"
                          : "text-gray-400 hover:text-gray-600"
                      }`}
                    >
                      This Order
                    </button>
                    <button
                      onClick={() => setReceiptType("COMBINED")}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                        receiptType === "COMBINED"
                          ? "bg-white text-gray-800 shadow-sm"
                          : "text-gray-400 hover:text-gray-600"
                      }`}
                    >
                      Combined Table Bill
                    </button>
                  </div>
                )}

                {/* Info Swatches with premium grey backing */}
                <div className="bg-[#FAFAFA] rounded-2xl p-4 text-[11px] space-y-2 border border-gray-100/60">
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-medium">Invoice Type</span>
                    <span className="font-extrabold text-gray-800 uppercase">
                      {receiptType === "COMBINED" ? "Consolidated Bill" : "Single Order Statement"}
                    </span>
                  </div>
                  {receiptType === "SINGLE" ? (
                    <div className="flex justify-between">
                      <span className="text-gray-400 font-medium">Order Number</span>
                      <span className="font-extrabold text-gray-800">#{order.orderNumber}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between">
                      <span className="text-gray-400 font-medium">Consolidated Orders</span>
                      <span className="font-extrabold text-gray-800">
                        {consolidatedDetails?.ordersCount || 1} Active Placements
                      </span>
                    </div>
                  )}
                  {order.table?.name && (
                    <div className="flex justify-between">
                      <span className="text-gray-400 font-medium">Serving Table</span>
                      <span className="font-extrabold text-gray-800">Table #{order.table.name}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-medium">Payment Status</span>
                    <span className="font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider">
                      PAID
                    </span>
                  </div>
                  {order.payment?.method && (
                    <div className="flex justify-between">
                      <span className="text-gray-400 font-medium">Payment Method</span>
                      <span className="font-extrabold text-gray-800 uppercase tracking-wide">{order.payment.method}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-medium">Customer Guest</span>
                    <span className="font-extrabold text-gray-800">
                      {order.customerName || "Guest Diner"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-medium">Phone Contact</span>
                    <span className="font-extrabold text-gray-800">
                      {order.customerPhone ? `+91 ${order.customerPhone}` : "Not Registered"}
                    </span>
                  </div>
                </div>

                {/* Items List */}
                <div className="space-y-3">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">
                    {receiptType === "COMBINED" ? "Consolidated Table Items" : "Line Items"}
                  </p>
                  <div className="space-y-2.5">
                    {receiptType === "COMBINED" && consolidatedDetails ? (
                      consolidatedDetails.items.map((item: any, idx: number) => (
                        <div key={idx} className="bg-gray-50/60 rounded-xl p-3 border border-gray-100/40 flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#3D7A5A] flex-shrink-0" />
                              <p className="text-xs font-extrabold text-gray-800 truncate">{item.menuItem?.name || "Menu Item"}</p>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1 font-semibold ml-3">
                              ₹{item.price} x {item.quantity}
                            </p>
                            {item.notes.length > 0 && (
                              <p className="text-[9px] text-[#3D7A5A] font-bold mt-1.5 bg-[#3D7A5A]/5 px-2 py-0.5 rounded-md w-fit ml-3">
                                ✏️ {item.notes.join(", ")}
                              </p>
                            )}
                          </div>
                          <span className="text-xs font-black text-gray-900 flex-shrink-0">
                            ₹{(item.price * item.quantity).toFixed(0)}
                          </span>
                        </div>
                      ))
                    ) : (
                      order.items?.map((item, idx) => (
                        <div key={item.id || idx} className="bg-gray-50/60 rounded-xl p-3 border border-gray-100/40 flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#3D7A5A] flex-shrink-0" />
                              <p className="text-xs font-extrabold text-gray-800 truncate">{item.menuItem?.name || "Menu Item"}</p>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1 font-semibold ml-3">
                              ₹{item.price} x {item.quantity}
                            </p>
                            {item.note && (
                              <p className="text-[9px] text-[#3D7A5A] font-bold mt-1.5 bg-[#3D7A5A]/5 px-2 py-0.5 rounded-md w-fit ml-3">
                                ✏️ {item.note}
                              </p>
                            )}
                          </div>
                          <span className="text-xs font-black text-gray-900 flex-shrink-0">
                            ₹{(item.price * item.quantity).toFixed(0)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Receipt Zig-zag / Dashed paper tear simulation */}
                <div className="relative h-2 w-full flex items-center justify-between overflow-hidden">
                  <div className="w-full border-b-[2px] border-dashed border-gray-200" />
                </div>

                {/* Bill Breakdown with unified card layout */}
                <div className="bg-gray-50/80 rounded-2xl p-4 space-y-2.5 border border-gray-100/60 text-xs">
                  <div className="flex justify-between text-gray-500 font-semibold">
                    <span>Subtotal</span>
                    <span className="font-extrabold text-gray-800">
                      ₹{receiptType === "COMBINED" && consolidatedDetails 
                        ? consolidatedDetails.subtotal.toFixed(0)
                        : ((order.totalAmount ?? 0) - (order.taxAmount ?? 0)).toFixed(0)}
                    </span>
                  </div>
                  {((receiptType === "COMBINED" && consolidatedDetails ? consolidatedDetails.taxAmount : order.taxAmount) ?? 0) > 0 ? (
                    <div className="flex justify-between text-gray-500 font-semibold">
                      <span>GST (Tax)</span>
                      <span className="font-extrabold text-gray-800">
                        ₹{(receiptType === "COMBINED" && consolidatedDetails 
                          ? consolidatedDetails.taxAmount
                          : (order.taxAmount ?? 0)).toFixed(0)}
                      </span>
                    </div>
                  ) : null}
                  <div className="border-t border-dashed border-gray-200 pt-2.5 flex justify-between font-black text-sm text-gray-900">
                    <span className="tracking-widest uppercase text-xs">
                      {receiptType === "COMBINED" ? "Total Consolidated Bill" : "Grand Total"}
                    </span>
                    <span className="text-base" style={{ color: G }}>
                      ₹{(receiptType === "COMBINED" && consolidatedDetails 
                        ? consolidatedDetails.totalAmount
                        : (order.totalAmount ?? 0)).toFixed(0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons (Print / PDF and Close) */}
              <div className="bg-[#FAFAFA] border-t border-gray-100 p-5 space-y-2.5 flex-shrink-0 print:hidden">
                <button
                  onClick={() => window.print()}
                  className="w-full py-3.5 rounded-2xl bg-gray-900 text-white font-extrabold text-xs shadow-md active:scale-95 hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
                >
                  🖨️ Print Receipt / Save PDF
                </button>
                <button
                  onClick={() => setShowReceipt(false)}
                  className="w-full py-3.5 rounded-2xl border border-gray-200 bg-white text-xs font-bold text-gray-500 hover:bg-gray-50 transition-all"
                >
                  Close Receipt
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Print CSS Injector */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          /* Hide all screen elements */
          body * {
            visibility: hidden !important;
          }
          /* Show the receipt modal and its children */
          #print-receipt-modal,
          #print-receipt-modal * {
            visibility: visible !important;
          }
          /* Ensure modal occupies top left corner with no margins */
          #print-receipt-modal {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            max-height: none !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          /* Hide modal footer buttons when printing */
          #print-receipt-modal .print\\:hidden,
          #print-receipt-modal .print\\:hidden * {
            display: none !important;
            visibility: hidden !important;
          }
        }
      `}} />
    </div>
  );
}
