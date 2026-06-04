"use client";

import { useCallback, useEffect, useMemo, useState, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { formatDistanceToNow, format } from "date-fns";
import { Search, Download, Eye, ChevronDown, ArrowUpDown, ShoppingCart, Edit3, History, Split, Save } from "lucide-react";
import toast from "react-hot-toast";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getPusherClient } from "@/lib/pusher-client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

type BoardStatus = "NEW" | "PREPARING" | "READY" | "DONE" | "CANCELLED";

type BoardOrder = {
  id: string;
  orderNumber: string;
  status: "NEW" | "PREPARING" | "READY" | "DONE" | "CANCELLED";
  totalAmount: number;
  taxAmount: number;
  customerName: string | null;
  customerPhone: string | null;
  specialNote?: string | null;
  createdAt: string;
  table: {
    name: string;
  };
  items: Array<{
    id: string;
    quantity: number;
    price: number;
    menuItem: {
      name: string;
    };
  }>;
  payment: {
    status: string;
    method: string;
  } | null;
};

type OrdersBoardProps = {
  restaurantId: string;
};

export const OrdersBoard = memo(function OrdersBoard({ restaurantId }: OrdersBoardProps) {
  const [orders, setOrders] = useState<BoardOrder[]>([]);
  const [minLoading, setMinLoading] = useState(true);
  const [usePollingFallback, setUsePollingFallback] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<BoardStatus | "ALL">("ALL");
  const [dateFilter, setDateFilter] = useState<"today" | "week" | "month" | "all">("today");
  const [sortBy, setSortBy] = useState<"createdAt" | "totalAmount">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedOrder, setSelectedOrder] = useState<BoardOrder | null>(null);
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [editDraft, setEditDraft] = useState<BoardOrder | null>(null);
  const [splitGuests, setSplitGuests] = useState(2);
  const [editHistory, setEditHistory] = useState<Array<{ id: string; details: string; createdAt: string }>>([]);
  const queryClient = useQueryClient();

  const { data: ordersData, isLoading } = useQuery<BoardOrder[]>({
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
      return [payload.order!, ...prev];
    });
    toast.success("New order received!");
  }, []);

  const handleOrderUpdated = useCallback((payload: { order?: BoardOrder }) => {
    if (!payload?.order) return;
    setOrders((prev) =>
      prev.map((order) =>
        order.id === payload.order!.id ? payload.order! : order,
      ),
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
      queryClient.invalidateQueries({ queryKey: ["orders", restaurantId] });
    }, 10000);

    return () => clearInterval(interval);
  }, [usePollingFallback, restaurantId, queryClient]);

  // Filter and sort orders
  const filteredOrders = useMemo(() => {
    let filtered = [...orders];

    // Status filter
    if (statusFilter !== "ALL") {
      filtered = filtered.filter((order) => order.status === statusFilter);
    }

    // Date filter
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    if (dateFilter === "today") {
      filtered = filtered.filter((order) => new Date(order.createdAt) >= today);
    } else if (dateFilter === "week") {
      filtered = filtered.filter((order) => new Date(order.createdAt) >= weekAgo);
    } else if (dateFilter === "month") {
      filtered = filtered.filter((order) => new Date(order.createdAt) >= monthAgo);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          order.orderNumber.toLowerCase().includes(query) ||
          order.customerName?.toLowerCase().includes(query) ||
          order.table.name.toLowerCase().includes(query),
      );
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === "totalAmount") {
        const aValue = a.totalAmount;
        const bValue = b.totalAmount;
        return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
      } else {
        const aDate = new Date(a.createdAt).getTime();
        const bDate = new Date(b.createdAt).getTime();
        return sortOrder === "asc" ? aDate - bDate : bDate - aDate;
      }
    });

    return filtered;
  }, [orders, statusFilter, dateFilter, searchQuery, sortBy, sortOrder]);

  // Analytics
  const analytics = useMemo(() => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const todaysOrders = orders.filter((order) => new Date(order.createdAt) >= todayStart);
    const revenueToday = todaysOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const avgOrderValue = todaysOrders.length > 0 ? revenueToday / todaysOrders.length : 0;
    
    const pendingOrders = orders.filter((order) => order.status === "NEW" || order.status === "PREPARING").length;
    const completedOrders = orders.filter((order) => order.status === "DONE").length;
    
    return {
      totalOrders: orders.length,
      todaysOrders: todaysOrders.length,
      revenueToday,
      avgOrderValue,
      pendingOrders,
      completedOrders,
    };
  }, [orders]);

  const toggleSort = (field: "createdAt" | "totalAmount") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const handleExportCsv = () => {
    const header = ["Order Number", "Table", "Items Count", "Total", "Status", "Date/Time"];
    const rows = filteredOrders.map((order) => [
      order.orderNumber,
      order.table.name,
      order.items.length,
      order.totalAmount.toFixed(2),
      order.status,
      format(new Date(order.createdAt), "yyyy-MM-dd HH:mm:ss"),
    ]);

    const csvContent = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `orders-export-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CSV report exported!");
  };

  useEffect(() => {
    if (!selectedOrder) {
      setEditDraft(null);
      setEditHistory([]);
      setIsEditingOrder(false);
      return;
    }

    setEditDraft(JSON.parse(JSON.stringify(selectedOrder)));
    axios
      .get(`/api/orders/${selectedOrder.id}/history`)
      .then(({ data }) => setEditHistory(data))
      .catch(() => setEditHistory([]));
  }, [selectedOrder]);

  const splitAmount = selectedOrder ? selectedOrder.totalAmount / Math.max(1, splitGuests) : 0;

  const saveOrderEdits = async () => {
    if (!editDraft || !selectedOrder) return;

    try {
      const { data } = await axios.patch(`/api/orders/${selectedOrder.id}`, {
        customerName: editDraft.customerName,
        customerPhone: editDraft.customerPhone,
        specialNote: editDraft.specialNote,
        status: editDraft.status,
        items: editDraft.items.map((item) => ({
          id: item.id,
          quantity: item.quantity,
          price: item.price,
        })),
      });

      setOrders((prev) => prev.map((order) => (order.id === data.id ? data : order)));
      setSelectedOrder(data);
      setIsEditingOrder(false);
      queryClient.invalidateQueries({ queryKey: ["orders", restaurantId] });
      toast.success("Order updated and logged");
    } catch {
      toast.error("Failed to update order");
    }
  };

  if (minLoading) {
    return <OrdersBoardSkeleton />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-8 relative"
    >
      {/* ── Page Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[rgba(255,255,255,0.08)] pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-[50px] h-[50px] rounded-2xl bg-gradient-to-tr from-[#f0a040] to-[#e85a2a] flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#f0a040]/15 border border-[#f0a040]/20">
            <ShoppingCart className="size-5 text-white" />
          </div>
          <div>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#f0a040]">BOARD HUB</span>
            <h1 className="text-2xl font-bold tracking-tight text-[#f5efe2] font-editorial italic mt-0.5">
              Order Management
            </h1>
            <p className="text-[11px] text-[#f5efe2]/50 font-serif italic mt-0.5">
              Real-time checkout dispatching and customer billing ledger
            </p>
          </div>
        </div>

        <button
          onClick={handleExportCsv}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-transparent border border-[rgba(255,255,255,0.08)] text-[#f5efe2]/60 hover:text-white font-mono-dashboard uppercase tracking-wider text-[10px] font-bold transition-all"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AnalyticsCard label="Today's Orders" value={analytics.todaysOrders} icon="📋" color="blue" />
        <AnalyticsCard label="Today's Revenue" value={`₹${analytics.revenueToday.toLocaleString()}`} icon="💰" color="green" />
        <AnalyticsCard label="Avg Order Value" value={`₹${analytics.avgOrderValue.toFixed(0)}`} icon="📊" color="purple" />
        <AnalyticsCard label="Pending Checkout" value={analytics.pendingOrders} icon="⏳" color="orange" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#f5efe2]/40" />
          <input
            type="text"
            placeholder="Search orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0a08] text-[#f5efe2] text-xs font-mono-dashboard focus:outline-none focus:border-[#f0a040]"
          />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as BoardStatus | "ALL")}
            className="appearance-none px-4 py-2 pr-10 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0a08] text-[#f5efe2] text-xs font-mono-dashboard focus:outline-none focus:border-[#f0a040]"
          >
            <option value="ALL">All Status</option>
            <option value="NEW">New</option>
            <option value="PREPARING">Preparing</option>
            <option value="READY">Ready</option>
            <option value="DONE">Done</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#f5efe2]/45 pointer-events-none" />
        </div>

        {/* Date Filter */}
        <div className="relative">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as "today" | "week" | "month" | "all")}
            className="appearance-none px-4 py-2 pr-10 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0a08] text-[#f5efe2] text-xs font-mono-dashboard focus:outline-none focus:border-[#f0a040]"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="all">All Time</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#f5efe2]/45 pointer-events-none" />
        </div>
      </div>

      {/* Orders Table */}
      <Card className="overflow-hidden bg-[#0b0a08]/40 border border-[rgba(255,255,255,0.08)] backdrop-blur-md rounded-2xl shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#0b0a08] text-left text-[9px] font-mono-dashboard font-black uppercase tracking-wider text-[#f5efe2]/40 border-b border-[rgba(255,255,255,0.08)]">
              <tr>
                <th className="px-6 py-4">Order</th>
                <th className="px-6 py-4 hidden sm:table-cell">Customer</th>
                <th className="px-6 py-4">Table</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 cursor-pointer hover:text-[#f0a040]"
                  onClick={() => toggleSort("totalAmount")}
                >
                  <div className="flex items-center gap-1">
                    Total
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:text-[#f0a040] hidden md:table-cell"
                  onClick={() => toggleSort("createdAt")}
                >
                  <div className="flex items-center gap-1">
                    Date
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(255,255,255,0.08)]">
              <AnimatePresence mode="popLayout">
                {filteredOrders.map((order) => (
                  <motion.tr
                    key={order.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="hover:bg-[rgba(255,255,255,0.01)] transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-bold text-[#f5efe2] font-mono-dashboard">{order.orderNumber}</p>
                        <p className="text-[10px] text-[#f5efe2]/40 font-serif italic mt-0.5">{order.items.length} items</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                      <p className="text-sm font-semibold text-[#f5efe2]">
                        {order.customerName || "Guest"}
                      </p>
                      {order.customerPhone && (
                        <p className="text-[10px] font-mono-dashboard text-[#f5efe2]/40 mt-0.5">{order.customerPhone}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-[#f5efe2]">{order.table.name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-black text-[#f5efe2] font-mono-dashboard text-sm">
                        ₹{order.totalAmount.toFixed(0)}
                      </p>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <p className="text-xs font-mono-dashboard text-[#f5efe2]/75">
                        {format(new Date(order.createdAt), "MMM dd · HH:mm")}
                      </p>
                      <p className="text-[9px] font-mono-dashboard text-[#f5efe2]/40 mt-0.5">
                        {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true }).toUpperCase()}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="flex items-center justify-center h-8 w-8 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.08)] text-[#f5efe2]/70 hover:text-white transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[#f5efe2]/40 font-serif italic text-sm">No orders found matching filters</p>
          </div>
        )}
      </Card>

      {/* Order Details Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-xs z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedOrder(null)}
          >
            <motion.div
              initial={{ scale: 0.97, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.97, y: 20 }}
              className="bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-4 mb-6">
                <div>
                  <span className="text-[9px] font-mono-dashboard font-black text-[#f0a040] uppercase tracking-wider">CHECKOUT DETAIL</span>
                  <h2 className="text-2xl font-bold text-[#f5efe2] font-mono-dashboard mt-0.5">
                    {selectedOrder.orderNumber}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsEditingOrder((value) => !value)}
                    className={`h-8 px-3 rounded-lg border text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors ${
                      isEditingOrder
                        ? "bg-[#f0a040] border-[#f0a040] text-[#0b0a08]"
                        : "bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.08)] text-[#f5efe2]/70 hover:text-white"
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  {isEditingOrder && (
                    <button
                      onClick={saveOrderEdits}
                      className="h-8 px-3 rounded-lg bg-[#52d27a] text-[#0b0a08] text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Save
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="w-8 h-8 rounded-lg bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.08)] text-[#f5efe2]/60 hover:text-white flex items-center justify-center"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-[#070707] border border-[rgba(255,255,255,0.04)] p-4 rounded-xl">
                  <div>
                    <p className="text-[9px] font-mono-dashboard uppercase text-[#f5efe2]/40">Customer</p>
                    <p className="font-bold text-[#f5efe2] text-sm mt-0.5">
                      {selectedOrder.customerName || "Guest"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-mono-dashboard uppercase text-[#f5efe2]/40">Table</p>
                    <p className="font-bold text-[#f5efe2] text-sm mt-0.5">
                      {selectedOrder.table.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-mono-dashboard uppercase text-[#f5efe2]/40">Status</p>
                    <div className="mt-1">
                      <StatusBadge status={selectedOrder.status} />
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] font-mono-dashboard uppercase text-[#f5efe2]/40">Payment</p>
                    <p className="font-bold text-[#f5efe2] text-sm mt-0.5">
                      {selectedOrder.payment?.method || "N/A"} ({selectedOrder.payment?.status})
                    </p>
                  </div>
                </div>

                {isEditingOrder && editDraft && (
                  <div className="rounded-xl border border-[#f0a040]/20 bg-[#f0a040]/5 p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <Edit3 className="w-4 h-4 text-[#f0a040]" />
                      <p className="text-[10px] font-mono-dashboard uppercase tracking-widest text-[#f0a040]">Order edit mode</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        value={editDraft.customerName || ""}
                        onChange={(event) => setEditDraft({ ...editDraft, customerName: event.target.value })}
                        placeholder="Customer name"
                        className="rounded-lg border border-white/[0.08] bg-[#0b0a08] px-3 py-2 text-xs text-[#f5efe2] outline-none focus:border-[#f0a040]"
                      />
                      <input
                        value={editDraft.customerPhone || ""}
                        onChange={(event) => setEditDraft({ ...editDraft, customerPhone: event.target.value })}
                        placeholder="Customer phone"
                        className="rounded-lg border border-white/[0.08] bg-[#0b0a08] px-3 py-2 text-xs text-[#f5efe2] outline-none focus:border-[#f0a040]"
                      />
                      <select
                        value={editDraft.status}
                        onChange={(event) => setEditDraft({ ...editDraft, status: event.target.value as BoardStatus })}
                        className="rounded-lg border border-white/[0.08] bg-[#0b0a08] px-3 py-2 text-xs text-[#f5efe2] outline-none focus:border-[#f0a040]"
                      >
                        {["NEW", "PREPARING", "READY", "DONE", "CANCELLED"].map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </div>
                    <textarea
                      value={editDraft.specialNote || ""}
                      onChange={(event) => setEditDraft({ ...editDraft, specialNote: event.target.value })}
                      placeholder="Special note"
                      className="w-full min-h-[72px] rounded-lg border border-white/[0.08] bg-[#0b0a08] px-3 py-2 text-xs text-[#f5efe2] outline-none focus:border-[#f0a040]"
                    />
                    <div className="space-y-2">
                      {editDraft.items.map((item) => (
                        <div key={item.id} className="grid grid-cols-[1fr_80px_96px] items-center gap-2 rounded-lg border border-white/[0.06] bg-[#0b0a08] p-2">
                          <span className="text-xs font-semibold text-[#f5efe2] truncate">{item.menuItem.name}</span>
                          <input
                            type="number"
                            min={0}
                            value={item.quantity}
                            onChange={(event) => setEditDraft({
                              ...editDraft,
                              items: editDraft.items.map((draftItem) =>
                                draftItem.id === item.id
                                  ? { ...draftItem, quantity: Number(event.target.value) || 0 }
                                  : draftItem
                              ),
                            })}
                            className="rounded-lg border border-white/[0.08] bg-[#070707] px-2 py-1.5 text-right text-xs text-[#f5efe2] outline-none focus:border-[#f0a040]"
                          />
                          <input
                            type="number"
                            min={0}
                            value={item.price}
                            onChange={(event) => setEditDraft({
                              ...editDraft,
                              items: editDraft.items.map((draftItem) =>
                                draftItem.id === item.id
                                  ? { ...draftItem, price: Number(event.target.value) || 0 }
                                  : draftItem
                              ),
                            })}
                            className="rounded-lg border border-white/[0.08] bg-[#070707] px-2 py-1.5 text-right text-xs text-[#f5efe2] outline-none focus:border-[#f0a040]"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-[9px] font-mono-dashboard uppercase tracking-widest text-[#f5efe2]/40 mb-2">Itemized checkout</p>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between items-center p-3 bg-[#0b0a08]/80 border border-[rgba(255,255,255,0.08)] rounded-xl"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono-dashboard font-black text-[#f0a040] text-xs bg-[#f0a040]/10 px-2 py-0.5 rounded-md">{item.quantity}x</span>
                          <span className="font-semibold text-[#f5efe2] text-sm">
                            {item.menuItem.name}
                          </span>
                        </div>
                        <p className="font-bold text-[#f5efe2] font-mono-dashboard">
                          ₹{(item.price * item.quantity).toFixed(0)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-[rgba(255,255,255,0.08)] pt-4 space-y-2">
                  <div className="flex justify-between text-xs text-[#f5efe2]/60">
                    <p className="font-serif italic">Subtotal</p>
                    <p className="font-mono-dashboard">
                      ₹{(selectedOrder.totalAmount - (selectedOrder.taxAmount || 0)).toFixed(0)}
                    </p>
                  </div>
                  <div className="flex justify-between text-xs text-[#f5efe2]/60">
                    <p className="font-serif italic">Tax</p>
                    <p className="font-mono-dashboard">
                      ₹{(selectedOrder.taxAmount || 0).toFixed(0)}
                    </p>
                  </div>
                  <div className="flex justify-between text-base font-bold text-[#f5efe2] border-t border-[rgba(255,255,255,0.08)] pt-2">
                    <p className="font-editorial italic text-lg">Total Amount</p>
                    <p className="font-mono-dashboard text-lg text-[#f0a040]">
                      ₹{selectedOrder.totalAmount.toFixed(0)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-[rgba(255,255,255,0.08)] rounded-xl p-4 bg-[#070707]">
                    <div className="flex items-center gap-2 mb-3">
                      <Split className="w-4 h-4 text-[#f0a040]" />
                      <p className="text-[9px] font-mono-dashboard uppercase tracking-widest text-[#f5efe2]/40">Bill splitting</p>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-xs text-[#f5efe2]/55">Guests</label>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={splitGuests}
                        onChange={(event) => setSplitGuests(Math.max(1, Number(event.target.value) || 1))}
                        className="w-20 rounded-lg border border-white/[0.08] bg-[#0b0a08] px-2 py-1.5 text-right text-xs text-[#f5efe2] outline-none focus:border-[#f0a040]"
                      />
                    </div>
                    <div className="mt-3 flex justify-between border-t border-white/[0.08] pt-3">
                      <span className="text-xs text-[#f5efe2]/55">Equal split</span>
                      <span className="font-mono-dashboard font-black text-[#f0a040]">INR {splitAmount.toFixed(0)} each</span>
                    </div>
                  </div>

                  <div className="border border-[rgba(255,255,255,0.08)] rounded-xl p-4 bg-[#070707]">
                    <div className="flex items-center gap-2 mb-3">
                      <History className="w-4 h-4 text-[#f0a040]" />
                      <p className="text-[9px] font-mono-dashboard uppercase tracking-widest text-[#f5efe2]/40">Edit history</p>
                    </div>
                    {editHistory.length === 0 ? (
                      <p className="text-xs text-[#f5efe2]/40">No edits logged for this order yet.</p>
                    ) : (
                      <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                        {editHistory.map((log) => (
                          <div key={log.id} className="rounded-lg border border-white/[0.06] bg-[#0b0a08] p-2">
                            <p className="text-[10px] text-[#f5efe2]/45">
                              {format(new Date(log.createdAt), "MMM dd, HH:mm")}
                            </p>
                            <p className="mt-1 text-[10px] text-[#f5efe2]/65 line-clamp-2">
                              {log.details}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { color: string; label: string; bg: string }> = {
    "NEW": { color: "text-blue-400 border-blue-500/20", label: "New", bg: "bg-blue-500/10" },
    "PREPARING": { color: "text-[#f0a040] border-amber-500/20", label: "Prep", bg: "bg-amber-500/10" },
    "READY": { color: "text-[#52d27a] border-[#52d27a]/20", label: "Ready", bg: "bg-[#52d27a]/10" },
    "DONE": { color: "text-[#f5efe2]/50 border-white/10", label: "Done", bg: "bg-white/5" },
    "CANCELLED": { color: "text-red-400 border-red-500/20", label: "Cancelled", bg: "bg-red-500/10" },
  };

  const config = statusConfig[status] || statusConfig["NEW"];

  return (
    <Badge className={`${config.bg} ${config.color} border text-[9px] font-mono-dashboard font-black uppercase tracking-wider py-0.5 px-2 rounded-full`}>
      {config.label}
    </Badge>
  );
}

function AnalyticsCard({ label, value, icon, color }: { label: string; value: string | number; icon: string; color: string }) {
  const colorClasses = {
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    green: "bg-[#52d27a]/10 text-[#52d27a] border-[#52d27a]/20",
    purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    orange: "bg-[#f0a040]/10 text-[#f0a040] border-[#f0a040]/20",
  };

  return (
    <Card className="p-4 bg-[#0b0a08]/40 border border-[rgba(255,255,255,0.08)] backdrop-blur-md rounded-2xl flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[9px] uppercase tracking-widest text-[#f5efe2]/40 font-mono-dashboard">{label}</p>
        <div className={`p-1.5 rounded-lg border text-sm ${colorClasses[color as keyof typeof colorClasses]}`}>{icon}</div>
      </div>
      <p className="text-xl font-bold text-[#f5efe2] font-mono-dashboard mt-1">{value}</p>
    </Card>
  );
}

function OrdersBoardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <Card key={idx} className="p-4 bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700">
            <Skeleton className="h-8 w-24 bg-neutral-200 dark:bg-neutral-700" />
            <Skeleton className="h-6 w-16 mt-2 bg-neutral-200 dark:bg-neutral-700" />
          </Card>
        ))}
      </div>
      <Skeleton className="h-12 w-80 bg-neutral-200 dark:bg-neutral-700" />
      <Card className="min-h-[400px] bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700">
        <Skeleton className="h-16 bg-neutral-200 dark:bg-neutral-700" />
        <div className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((__, idx) => (
            <div key={idx} className="h-16 bg-neutral-100 dark:bg-neutral-700 rounded-lg" />
          ))}
        </div>
      </Card>
    </div>
  );
}
