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

const G = "#f0a040";

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
    color: "#e85a2a",
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
      <div className="min-h-screen bg-[#0b0a08] text-[#f5efe2] flex items-center justify-center"
        style={{ fontFamily: "var(--font-poppins, 'Poppins', sans-serif)" }}>
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded-full border-[3px] border-t-[#f0a040] border-[#f0a040]/20
            animate-spin mx-auto" />
          <p className="text-sm font-semibold text-[#f5efe2]/60">Loading your order…</p>
        </div>
      </div>
    );
  }

  // ── No orderId ────────────────────────────────────────────────────────────
  if (!orderId || !order) {
    return (
      <div className="min-h-screen bg-[#0b0a08] text-[#f5efe2] flex items-center justify-center p-6"
        style={{ fontFamily: "var(--font-poppins, 'Poppins', sans-serif)" }}>
        <div className="w-full max-w-sm bg-[#13110e] border border-white/[0.08] rounded-[28px] shadow-2xl p-8 text-center space-y-4">
          <span className="text-5xl">🍽️</span>
          <h2 className="text-lg font-bold text-white">No active order</h2>
          <p className="text-xs text-[#f5efe2]/60">Place an order first to track it here.</p>
          <button onClick={goBack}
            className="w-full py-3.5 rounded-2xl text-[#0b0a08] text-sm font-black active:scale-95 transition-all hover:brightness-110"
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
      <div className="min-h-screen bg-[#0b0a08] text-[#f5efe2] flex items-center justify-center p-6"
        style={{ fontFamily: "var(--font-poppins, 'Poppins', sans-serif)" }}>
        <div className="w-full max-w-sm bg-[#13110e] border border-white/[0.08] rounded-[28px] shadow-2xl p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-white">Order Cancelled</h2>
          <p className="text-xs text-[#f5efe2]/60">
            Order #{order.orderNumber} was cancelled. Please speak to a staff member.
          </p>
          <button onClick={goBack}
            className="w-full py-3.5 rounded-2xl text-[#0b0a08] text-sm font-black active:scale-95 transition-all hover:brightness-110"
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
      className="min-h-screen bg-[#0b0a08] text-[#f5efe2] pb-10"
      style={{ fontFamily: "var(--font-poppins, 'Poppins', sans-serif)" }}
    >
      {/* Header */}
      <div className="bg-[#0b0a08]/90 backdrop-blur-md px-5 pt-6 pb-4 border-b border-white/[0.06] sticky top-0 z-10 shadow-lg">
        <div className="flex items-center gap-3">
          <button onClick={goBack}
            className="w-9 h-9 rounded-xl bg-[#181512] border border-white/[0.08] flex items-center justify-center flex-shrink-0 text-[#f5efe2] hover:bg-[#222222] transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-extrabold text-white">Track Order</h1>
            <p className="text-[11px] text-[#f5efe2]/60">#{order.orderNumber}</p>
          </div>
          {/* Live dot */}
          <div className="flex items-center gap-1.5 bg-[#f0a040]/10 border border-[#f0a040]/20 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f0a040] animate-pulse" />
            <span className="text-[10px] font-bold text-[#f0a040] uppercase tracking-wider">Live</span>
          </div>
        </div>
      </div>

      <div className="px-5 pt-6 space-y-5">

        {/* Multiple Orders Selector Switcher */}
        {ordersList.length > 1 && (
          <div className="bg-[#13110e] border border-white/[0.08] rounded-[24px] p-4 shadow-sm space-y-2">
            <p className="text-[9px] font-black text-[#f5efe2]/40 uppercase tracking-widest">
              Active Orders ({ordersList.length})
            </p>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1 -mx-1 px-1">
              {ordersList.map((o) => (
                <button
                  key={o.id}
                  onClick={() => setOrder(o)}
                  className={`px-3 py-2 rounded-xl text-xs font-black tracking-wide uppercase transition-all duration-200 flex-shrink-0 flex items-center gap-2 border ${
                    order?.id === o.id
                      ? "bg-[#f0a040] text-[#0b0a08] border-transparent shadow-sm font-bold"
                      : "bg-[#181512] text-[#f5efe2]/60 border-white/[0.08] hover:bg-[#222222]"
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
          className="bg-[#13110e] border border-white/[0.08] rounded-[24px] p-6 shadow-2xl text-center space-y-3"
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
            <h2 className="text-xl font-extrabold text-white">
              {STATUS_STEPS[currentIndex]?.label ?? "Processing"}
            </h2>
            <p className="text-xs text-[#f5efe2]/60 mt-1">
              {STATUS_STEPS[currentIndex]?.sublabel ?? "Please wait…"}
            </p>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden border border-white/[0.04]">
            <motion.div
              className="h-2 rounded-full"
              style={{ background: G }}
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          <p className="text-[10px] text-[#f5efe2]/60 font-medium">
            Step {currentIndex + 1} of {STATUS_STEPS.length}
          </p>
        </motion.div>

        {/* Step tracker */}
        <div className="bg-[#13110e] border border-white/[0.08] rounded-[24px] p-5 shadow-2xl space-y-1">
          <p className="text-[10px] font-bold text-[#f5efe2]/40 uppercase tracking-widest mb-3">
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
                        : "#181512",
                      borderColor: active ? G : done ? G : "rgba(255,255,255,0.08)",
                      scale: active ? 1.1 : 1,
                    }}
                    transition={{ duration: 0.3 }}
                    className="w-10 h-10 rounded-full flex items-center justify-center border-2"
                  >
                    {done ? (
                      <CheckCircle2 className="w-4 h-4 text-[#0b0a08]" />
                    ) : (
                      <span className={`text-base ${future ? "opacity-35" : ""}`}>
                        {step.icon}
                      </span>
                    )}
                  </motion.div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div className={`w-0.5 h-6 mt-1 rounded-full transition-colors duration-500
                      ${done ? "bg-[#f0a040]" : "bg-white/5"}`} />
                  )}
                </div>

                {/* Right: text */}
                <div className={`flex-1 pb-6 ${i === STATUS_STEPS.length - 1 ? "pb-0" : ""}`}>
                  <p className={`text-sm font-bold transition-colors duration-300 ${
                    active ? "text-[#f0a040]" : done ? "text-[#f5efe2]" : "text-[#f5efe2]/40"
                  }`}>
                    {step.label}
                  </p>
                  {active && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="text-[11px] text-[#f5efe2]/60 mt-0.5"
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
                    className="text-[9px] font-black px-2 py-1 rounded-full text-[#0b0a08] flex-shrink-0"
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
        <div className="bg-[#f0a040]/10 border border-[#f0a040]/20 rounded-[20px] px-4 py-3 flex items-center gap-3">
          <RefreshCw className="w-4 h-4 text-[#f0a040] flex-shrink-0" />
          <p className="text-[11px] text-[#f0a040] font-semibold">
            This page updates automatically via live tracking. Last updated:{" "}
            {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {order.status === "DONE" && (
            <button
              onClick={() => setShowReceipt(true)}
              className="w-full py-4 rounded-2xl text-[#0b0a08] font-black text-sm tracking-wider uppercase shadow-lg shadow-[#f0a040]/10
                active:scale-95 transition-transform flex items-center justify-center gap-2 hover:brightness-110"
              style={{ background: G }}
            >
              🧾 View Bill Receipt
            </button>
          )}

          <button
            onClick={goBack}
            className={`w-full py-4 rounded-2xl font-bold text-sm active:scale-95 transition-transform ${
              order.status === "DONE"
                ? "bg-white/5 border border-white/[0.08] text-[#f5efe2] hover:bg-white/10"
                : "text-[#0b0a08] font-black tracking-wider uppercase shadow-md shadow-orange-500/10"
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
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ y: "100%", scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: "100%", scale: 0.95 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="relative w-full sm:max-w-md bg-[#13110e] rounded-t-[32px] sm:rounded-[32px] max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-white/[0.08] print:max-h-none print:shadow-none print:rounded-none"
              onClick={e => e.stopPropagation()}
              id="print-receipt-modal"
            >
              {/* Gold/Orange top aesthetic accent bar */}
              <div className="h-2 w-full bg-gradient-to-r from-[#f0a040] via-[#ea6c0a] to-[#f0a040] flex-shrink-0" />

              {/* Receipt Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 print:overflow-visible relative bg-[#13110e]">
                
                {/* Dynamic Restaurant Verified stamp */}
                <div className="absolute -rotate-12 right-6 top-6 w-20 h-20 rounded-full border-2 border-[#f0a040]/30 flex items-center justify-center opacity-70 print:opacity-100 flex-shrink-0 select-none pointer-events-none">
                  <div className="w-16 h-16 rounded-full border border-dashed border-[#f0a040]/35 flex flex-col items-center justify-center">
                    <span className="text-[8px] font-black text-[#f0a040] tracking-wider leading-none">VERIFIED</span>
                    <span className="text-[7px] font-bold text-[#f5efe2]/40 mt-1 uppercase truncate max-w-[50px]">
                      {order.restaurant?.name || "DINE"}
                    </span>
                  </div>
                </div>

                {/* Print Header */}
                <div className="text-center space-y-2.5">
                  <div className="flex justify-center mb-1">
                    {order.restaurant?.logo ? (
                      <div className="w-16 h-16 rounded-full overflow-hidden bg-white p-0.5 shadow-md border border-white/[0.08] flex items-center justify-center flex-shrink-0">
                        <img
                          src={order.restaurant.logo}
                          alt={order.restaurant.name}
                          className="w-full h-full object-cover rounded-full"
                        />
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#f0a040] to-[#e85a2a] p-0.5 shadow-md flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-1 rounded-full border border-dashed border-white/30" />
                        <span className="text-[#0b0a08] text-xs font-black tracking-widest uppercase">DINE</span>
                      </div>
                    )}
                  </div>
                  <h2 className="text-base font-black text-white tracking-widest uppercase">
                    {order.restaurant?.name || "TableScan Invoice"}
                  </h2>
                  <p className="text-[10px] text-[#f5efe2]/60 uppercase tracking-widest font-extrabold">Exclusive Dine-In Service</p>
                </div>

                {/* Receipt Type Toggle (Only if multiple orders exist) */}
                {ordersList.length > 1 && (
                  <div className="flex p-1 bg-[#181512] border border-white/[0.08] rounded-xl gap-1 w-fit mx-auto print:hidden">
                    <button
                      onClick={() => setReceiptType("SINGLE")}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                        receiptType === "SINGLE"
                          ? "bg-[#13110e] text-[#f5efe2] shadow-sm"
                          : "text-[#f5efe2]/60 hover:text-white"
                      }`}
                    >
                      This Order
                    </button>
                    <button
                      onClick={() => setReceiptType("COMBINED")}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                        receiptType === "COMBINED"
                          ? "bg-[#13110e] text-[#f5efe2] shadow-sm"
                          : "text-[#f5efe2]/60 hover:text-white"
                      }`}
                    >
                      Combined Table Bill
                    </button>
                  </div>
                )}

                {/* Info Swatches */}
                <div className="bg-[#181512] border border-white/[0.08] rounded-2xl p-4 text-[11px] space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[#f5efe2]/60 font-medium">Invoice Type</span>
                    <span className="font-extrabold text-[#f5efe2] uppercase">
                      {receiptType === "COMBINED" ? "Consolidated Bill" : "Single Order Statement"}
                    </span>
                  </div>
                  {receiptType === "SINGLE" ? (
                    <div className="flex justify-between">
                      <span className="text-[#f5efe2]/60 font-medium">Order Number</span>
                      <span className="font-extrabold text-[#f5efe2]">#{order.orderNumber}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between">
                      <span className="text-[#f5efe2]/60 font-medium">Consolidated Orders</span>
                      <span className="font-extrabold text-[#f5efe2]">
                        {consolidatedDetails?.ordersCount || 1} Active Placements
                      </span>
                    </div>
                  )}
                  {order.table?.name && (
                    <div className="flex justify-between">
                      <span className="text-[#f5efe2]/60 font-medium">Serving Table</span>
                      <span className="font-extrabold text-[#f5efe2]">Table #{order.table.name}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[#f5efe2]/60 font-medium">Payment Status</span>
                    <span className="font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider">
                      PAID
                    </span>
                  </div>
                  {order.payment?.method && (
                    <div className="flex justify-between">
                      <span className="text-[#f5efe2]/60 font-medium">Payment Method</span>
                      <span className="font-extrabold text-[#f5efe2] uppercase tracking-wide">{order.payment.method}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[#f5efe2]/60 font-medium">Customer Guest</span>
                    <span className="font-extrabold text-[#f5efe2]">
                      {order.customerName || "Guest Diner"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#f5efe2]/60 font-medium">Phone Contact</span>
                    <span className="font-extrabold text-[#f5efe2]">
                      {order.customerPhone ? `+91 ${order.customerPhone}` : "Not Registered"}
                    </span>
                  </div>
                </div>

                {/* Items List */}
                <div className="space-y-3">
                  <p className="text-[9px] font-black text-[#f5efe2]/40 uppercase tracking-widest border-b border-white/[0.08] pb-2">
                    {receiptType === "COMBINED" ? "Consolidated Table Items" : "Line Items"}
                  </p>
                  <div className="space-y-2.5">
                    {receiptType === "COMBINED" && consolidatedDetails ? (
                      consolidatedDetails.items.map((item: any, idx: number) => (
                        <div key={idx} className="bg-[#181512]/60 border border-white/[0.08] rounded-xl p-3 flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#f0a040] flex-shrink-0" />
                              <p className="text-xs font-extrabold text-[#f5efe2] truncate">{item.menuItem?.name || "Menu Item"}</p>
                            </div>
                            <p className="text-[10px] text-[#f5efe2]/60 mt-1 font-semibold ml-3">
                              ₹{item.price} x {item.quantity}
                            </p>
                            {item.notes.length > 0 && (
                              <p className="text-[9px] text-[#f0a040] font-bold mt-1.5 bg-[#f0a040]/5 px-2 py-0.5 rounded-md w-fit ml-3">
                                ✏️ {item.notes.join(", ")}
                              </p>
                            )}
                          </div>
                          <span className="text-xs font-black text-white flex-shrink-0 font-mono-dashboard">
                            ₹{(item.price * item.quantity).toFixed(0)}
                          </span>
                        </div>
                      ))
                    ) : (
                      order.items?.map((item, idx) => (
                        <div key={item.id || idx} className="bg-[#181512]/60 border border-white/[0.08] rounded-xl p-3 flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#f0a040] flex-shrink-0" />
                              <p className="text-xs font-extrabold text-[#f5efe2] truncate">{item.menuItem?.name || "Menu Item"}</p>
                            </div>
                            <p className="text-[10px] text-[#f5efe2]/60 mt-1 font-semibold ml-3">
                              ₹{item.price} x {item.quantity}
                            </p>
                            {item.note && (
                              <p className="text-[9px] text-[#f0a040] font-bold mt-1.5 bg-[#f0a040]/5 px-2 py-0.5 rounded-md w-fit ml-3">
                                ✏️ {item.note}
                              </p>
                            )}
                          </div>
                          <span className="text-xs font-black text-white flex-shrink-0 font-mono-dashboard">
                            ₹{(item.price * item.quantity).toFixed(0)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Dashed paper tear simulation */}
                <div className="relative h-2 w-full flex items-center justify-between overflow-hidden">
                  <div className="w-full border-b-[2px] border-dashed border-white/[0.08]" />
                </div>

                {/* Bill Breakdown */}
                <div className="bg-[#181512]/80 border border-white/[0.08] rounded-2xl p-4 space-y-2.5 text-xs">
                  <div className="flex justify-between text-[#f5efe2]/60 font-semibold">
                    <span>Subtotal</span>
                    <span className="font-extrabold text-[#f5efe2] font-mono-dashboard">
                      ₹{receiptType === "COMBINED" && consolidatedDetails 
                        ? consolidatedDetails.subtotal.toFixed(0)
                        : ((order.totalAmount ?? 0) - (order.taxAmount ?? 0)).toFixed(0)}
                    </span>
                  </div>
                  {((receiptType === "COMBINED" && consolidatedDetails ? consolidatedDetails.taxAmount : order.taxAmount) ?? 0) > 0 ? (
                    <div className="flex justify-between text-[#f5efe2]/60 font-semibold">
                      <span>GST (Tax)</span>
                      <span className="font-extrabold text-[#f5efe2] font-mono-dashboard">
                        ₹{(receiptType === "COMBINED" && consolidatedDetails 
                          ? consolidatedDetails.taxAmount
                          : (order.taxAmount ?? 0)).toFixed(0)}
                      </span>
                    </div>
                  ) : null}
                  <div className="border-t border-dashed border-white/[0.08] pt-2.5 flex justify-between font-black text-sm text-white">
                    <span className="tracking-widest uppercase text-xs">
                      {receiptType === "COMBINED" ? "Total Table Bill" : "Grand Total"}
                    </span>
                    <span className="text-base font-mono-dashboard" style={{ color: G }}>
                      ₹{(receiptType === "COMBINED" && consolidatedDetails 
                        ? consolidatedDetails.totalAmount
                        : (order.totalAmount ?? 0)).toFixed(0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons (Print / PDF and Close) */}
              <div className="bg-[#13110e] border-t border-white/[0.08] p-5 space-y-2.5 flex-shrink-0 print:hidden">
                <button
                  onClick={() => window.print()}
                  className="w-full py-3.5 rounded-2xl bg-[#f5efe2] text-[#0b0a08] font-black text-xs shadow-md active:scale-95 hover:bg-white transition-all flex items-center justify-center gap-2"
                >
                  🖨️ Print Receipt / Save PDF
                </button>
                <button
                  onClick={() => setShowReceipt(false)}
                  className="w-full py-3.5 rounded-2xl border border-white/[0.08] bg-white/5 text-xs font-bold text-[#f5efe2] hover:bg-white/10 transition-all"
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
          @page {
            margin: 0 !important;
          }
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
