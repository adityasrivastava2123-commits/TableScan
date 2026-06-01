"use client";

import { useCallback, useEffect, useMemo, useState, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { formatDistanceToNow, format } from "date-fns";
import { Search, Calendar, Download, Eye, Filter, ChevronDown, ArrowUpDown } from "lucide-react";
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
      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnalyticsCard label="Today's Orders" value={analytics.todaysOrders} icon="📋" />
        <AnalyticsCard label="Today's Revenue" value={`₹${analytics.revenueToday.toFixed(0)}`} icon="💰" />
        <AnalyticsCard label="Avg Order Value" value={`₹${analytics.avgOrderValue.toFixed(0)}`} icon="📊" />
        <AnalyticsCard label="Pending" value={analytics.pendingOrders} icon="⏳" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-800 dark:text-white">Order Management</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            {filteredOrders.length} orders found
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#f97316]"
          />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as BoardStatus | "ALL")}
            className="appearance-none px-4 py-2 pr-10 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#f97316]"
          >
            <option value="ALL">All Status</option>
            <option value="NEW">New</option>
            <option value="PREPARING">Preparing</option>
            <option value="READY">Ready</option>
            <option value="DONE">Done</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
        </div>

        {/* Date Filter */}
        <div className="relative">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as "today" | "week" | "month" | "all")}
            className="appearance-none px-4 py-2 pr-10 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#f97316]"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="all">All Time</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
        </div>
      </div>

      {/* Orders Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                  Order
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                  Table
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider cursor-pointer hover:text-[#f97316]"
                  onClick={() => toggleSort("totalAmount")}
                >
                  <div className="flex items-center gap-1">
                    Total
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider cursor-pointer hover:text-[#f97316]"
                  onClick={() => toggleSort("createdAt")}
                >
                  <div className="flex items-center gap-1">
                    Date
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
              <AnimatePresence mode="popLayout">
                {filteredOrders.map((order) => (
                  <motion.tr
                    key={order.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-semibold text-neutral-800 dark:text-white">{order.orderNumber}</p>
                        <p className="text-xs text-neutral-500">{order.items.length} items</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-neutral-800 dark:text-white">
                        {order.customerName || "Guest"}
                      </p>
                      {order.customerPhone && (
                        <p className="text-xs text-neutral-500">{order.customerPhone}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-neutral-800 dark:text-white">{order.table.name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-neutral-800 dark:text-white">
                        ₹{order.totalAmount.toFixed(2)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        {format(new Date(order.createdAt), "MMM dd, yyyy")}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <p className="text-neutral-500 dark:text-neutral-400">No orders found</p>
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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedOrder(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-neutral-800 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-neutral-800 dark:text-white">
                  {selectedOrder.orderNumber}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedOrder(null)}
                >
                  ✕
                </Button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-neutral-500">Customer</p>
                    <p className="font-semibold text-neutral-800 dark:text-white">
                      {selectedOrder.customerName || "Guest"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500">Table</p>
                    <p className="font-semibold text-neutral-800 dark:text-white">
                      {selectedOrder.table.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500">Status</p>
                    <StatusBadge status={selectedOrder.status} />
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500">Payment</p>
                    <p className="font-semibold text-neutral-800 dark:text-white">
                      {selectedOrder.payment?.method || "N/A"} ({selectedOrder.payment?.status})
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-neutral-500 mb-2">Items</p>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between items-center p-3 bg-neutral-50 dark:bg-neutral-700 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-neutral-800 dark:text-white">
                            {item.quantity}x {item.menuItem.name}
                          </p>
                        </div>
                        <p className="font-semibold text-neutral-800 dark:text-white">
                          ₹{(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4">
                  <div className="flex justify-between">
                    <p className="text-neutral-600 dark:text-neutral-400">Subtotal</p>
                    <p className="font-semibold text-neutral-800 dark:text-white">
                      ₹{(selectedOrder.totalAmount - (selectedOrder.taxAmount || 0)).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex justify-between">
                    <p className="text-neutral-600 dark:text-neutral-400">Tax</p>
                    <p className="font-semibold text-neutral-800 dark:text-white">
                      ₹{(selectedOrder.taxAmount || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex justify-between text-lg font-bold">
                    <p className="text-neutral-800 dark:text-white">Total</p>
                    <p className="text-neutral-800 dark:text-white">
                      ₹{selectedOrder.totalAmount.toFixed(2)}
                    </p>
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
    "NEW": { color: "text-blue-500", label: "New", bg: "bg-blue-500/10" },
    "PREPARING": { color: "text-[#f97316]", label: "Preparing", bg: "bg-[#f97316]/10" },
    "READY": { color: "text-[#22c55e]", label: "Ready", bg: "bg-[#22c55e]/10" },
    "DONE": { color: "text-[#999999]", label: "Done", bg: "bg-[#999999]/10" },
    "CANCELLED": { color: "text-[#ef4444]", label: "Cancelled", bg: "bg-[#ef4444]/10" },
  };

  const config = statusConfig[status] || statusConfig["NEW"];

  return (
    <Badge className={`${config.bg} ${config.color} border-0`}>
      {config.label}
    </Badge>
  );
}

function AnalyticsCard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <Card className="p-4 bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{label}</p>
          <p className="text-2xl font-bold text-neutral-800 dark:text-white mt-1">{value}</p>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
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

