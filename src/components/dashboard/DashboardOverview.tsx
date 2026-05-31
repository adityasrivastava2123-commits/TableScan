"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { formatDistanceToNow } from "date-fns";
import {
  DollarSign,
  ShoppingCart,
  Users,
  TrendingUp,
  ArrowUpRight,
  Activity,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { pusherClient } from "@/lib/pusher-client";
import type { Restaurant } from "@prisma/client";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DashboardData {
  todayRevenue: number;
  todayOrders: number;
  activeOrders: number;
  totalTables: number;
  occupiedTables: number;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    totalAmount: number;
    createdAt: Date;
    items: any[];
    table?: { name: string };
  }>;
  topItems: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
  lowStockAlert: boolean;
  trialDaysLeft: number;
  revenueChange: number;
  ordersChange: number;
  totalMenuItems: number;
  totalStaff: number;
  restaurantOpen: boolean;
}

import { useUser } from "@clerk/nextjs";

interface DashboardOverviewProps {
  restaurant: Restaurant;
}

function OrderStatusBadge({ status }: { status: string }) {
  const statusClasses = {
    NEW: "bg-blue-500/10 dark:bg-[rgba(59,130,246,0.15)] text-blue-600 dark:text-[#60a5fa]",
    PREPARING: "bg-orange-500/10 dark:bg-[rgba(249,115,22,0.15)] text-orange-600 dark:text-[#f97316]",
    READY: "bg-green-500/10 dark:bg-[rgba(34,197,94,0.1)] text-green-600 dark:text-[#4ade80]",
    DONE: "bg-neutral-100 dark:bg-[#222222] text-neutral-500 dark:text-[#9a9488]",
    CANCELLED: "bg-red-500/10 dark:bg-[rgba(239,68,68,0.15)] text-red-600 dark:text-[#f87171]",
  };

  const statusLabels = {
    NEW: "NEW",
    PREPARING: "PREP",
    READY: "READY",
    DONE: "DONE",
    CANCELLED: "CANCELLED",
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider ${statusClasses[status as keyof typeof statusClasses] || statusClasses.DONE}`}>
      {statusLabels[status as keyof typeof statusLabels] || status}
    </span>
  );
}

export default function DashboardOverview({ restaurant }: DashboardOverviewProps) {
  const { user } = useUser();
  const userName = user?.firstName || user?.emailAddresses?.[0]?.emailAddress || "User";

  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [activeOrders, setActiveOrders] = useState(0);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get(`/api/dashboard?restaurantId=${restaurant.id}`);
      setData(response.data);
      setActiveOrders(response.data.activeOrders);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Subscribe to Pusher for real-time updates
    if (pusherClient) {
      const channel = pusherClient.subscribe(`restaurant-${restaurant.id}`);

      channel.bind("new-order", (data: unknown) => {
        const order = (data as any).order;
        if (order.status === "NEW" || order.status === "PREPARING" || order.status === "READY") {
          setActiveOrders((prev) => prev + 1);
        }
        fetchDashboardData();
      });

      channel.bind("order-updated", (data: unknown) => {
        const status = (data as any).status;
        if (status === "DONE") {
          setActiveOrders((prev) => prev - 1);
        }
        fetchDashboardData();
      });

      return () => {
        channel.unbind_all();
        channel.unsubscribe();
      };
    }
  }, [restaurant.id, fetchDashboardData]);

  const handleShareMenu = () => {
    const menuUrl = `${window.location.origin}/${restaurant.slug}`;
    navigator.clipboard.writeText(menuUrl);
    // Could add toast notification here
  };

  const exportOverviewCsv = () => {
    if (!data) return;

    const csvRows = [];
    
    // 1. Header
    csvRows.push(["TableScan Restaurant Dashboard Summary"]);
    csvRows.push([`Restaurant Name,${restaurant.name}`]);
    csvRows.push([`Generated At,${new Date().toLocaleString("en-IN")}`]);
    csvRows.push([]);

    // 2. Key Performance Indicators
    csvRows.push(["METRIC", "VALUE", "CHANGE / DETAILS"]);
    csvRows.push(["Today's Revenue", `INR ${data.todayRevenue.toFixed(2)}`, `${data.revenueChange >= 0 ? "+" : ""}${data.revenueChange}% vs last week`]);
    csvRows.push(["Today's Orders", data.todayOrders, `${data.ordersChange >= 0 ? "+" : ""}${data.ordersChange}% vs last week`]);
    csvRows.push(["Active Orders", data.activeOrders, "Orders currently in queue/kitchen"]);
    csvRows.push(["Table Occupancy", `${data.occupiedTables}/${data.totalTables} tables occupied`, `${((data.occupiedTables / (data.totalTables || 1)) * 100).toFixed(0)}% occupancy rate`]);
    csvRows.push(["Total Menu Items", data.totalMenuItems, "Registered dishes"]);
    csvRows.push(["Total Staff Members", data.totalStaff, "Scheduled personnel"]);
    csvRows.push(["Low Stock Risk", data.lowStockAlert ? "YES" : "NO", data.lowStockAlert ? "Some inventory items are running low!" : "Inventory healthy"]);
    csvRows.push([]);

    // 3. Recent Orders
    csvRows.push(["RECENT ORDERS"]);
    csvRows.push(["Order Number", "Table", "Items Count", "Total Amount (INR)", "Status", "Date/Time"]);
    data.recentOrders.forEach((order) => {
      csvRows.push([
        order.orderNumber,
        order.table?.name || "N/A",
        order.items?.length || 0,
        order.totalAmount.toFixed(2),
        order.status,
        new Date(order.createdAt).toLocaleString("en-IN"),
      ]);
    });

    // Generate CSV string
    const csvContent = csvRows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tablescan-dashboard-${restaurant.slug}-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 animate-pulse bg-neutral-100 dark:bg-[#141414] rounded" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse bg-neutral-50 dark:bg-[#141414] rounded-xl border border-neutral-200 dark:border-[#252525]"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Mock data for charts (in production, this would come from API)
  const revenueData = [
    { name: "Mon", value: 4500 },
    { name: "Tue", value: 5200 },
    { name: "Wed", value: 4800 },
    { name: "Thu", value: 6100 },
    { name: "Fri", value: 7500 },
    { name: "Sat", value: 8900 },
    { name: "Sun", value: 7200 },
  ];

  const orderData = [
    { name: "9AM", orders: 12 },
    { name: "12PM", orders: 45 },
    { name: "3PM", orders: 28 },
    { name: "6PM", orders: 62 },
    { name: "9PM", orders: 38 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-800 dark:text-[#f0ece4] leading-[1.1]">
            {getGreeting()} at <em className="gradient-text not-italic">{restaurant.name}</em>
          </h1>
          <p className="text-[13px] text-neutral-500 dark:text-[#9a9488] mt-1">Real-time pulse of your operations.</p>
          <div className="text-[11px] text-neutral-400 dark:text-[#5a5650] mt-1 tracking-wider uppercase">
            {new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" })}
          </div>
        </div>
        <div className="flex gap-2.5">
          <button 
            onClick={exportOverviewCsv}
            className="px-4 py-2.5 border border-neutral-200 dark:border-[rgba(255,255,255,0.12)] rounded-lg bg-transparent text-neutral-800 dark:text-[#f0ece4] text-[12px] font-medium hover:border-[#f97316] hover:text-[#f97316] transition-all flex items-center gap-1.5"
          >
            ↓ Export report
          </button>
          <button 
            onClick={() => router.push("/forecasting")}
            className="px-4 py-2.5 border-none rounded-lg bg-gradient-to-r from-[#f97316] to-[#f59e0b] text-white text-[12px] font-semibold hover:from-[#ea6c0a] hover:to-[#d97706] transition-all flex items-center gap-1.5 shadow-lg shadow-[rgba(249,115,22,0.25)]"
          >
            <span className="text-[10px]">✦</span> AI insights
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="animate-stagger-in" style={{ animationDelay: "0ms" }}>
          <StatCard
            title="REVENUE TODAY"
            value={`₹${data.todayRevenue.toFixed(2)}`}
            change={data.revenueChange}
            icon={<DollarSign className="text-[18px]" />}
            color="green"
          />
        </div>
        <div className="animate-stagger-in" style={{ animationDelay: "75ms" }}>
          <StatCard
            title="ORDERS"
            value={data.todayOrders.toString()}
            subtitle={`+${data.todayOrders} today`}
            icon={<ShoppingCart className="text-[16px]" />}
            color="blue"
          />
        </div>
        <div className="animate-stagger-in" style={{ animationDelay: "150ms" }}>
          <StatCard
            title="PENDING"
            value={activeOrders.toString()}
            subtitle="in queue"
            icon={<Users className="text-[16px]" />}
            color="purple"
            clickable
            onClick={() => router.push("/orders")}
          />
        </div>
        <div className="animate-stagger-in" style={{ animationDelay: "225ms" }}>
          <StatCard
            title="TAX RATE"
            value="18%"
            subtitle="GST applied"
            icon={<TrendingUp className="text-[16px]" />}
            color="orange"
          />
        </div>
      </div>

      {/* Revenue Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-3.5">
        <Card className="bg-white dark:bg-[#111111] border-neutral-200 dark:border-[rgba(255,255,255,0.07)] rounded-xl p-5 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[14px] text-[#f97316]">♦</span>
              <span className="text-[14px] font-semibold text-neutral-800 dark:text-[#f0ece4]">Revenue Analytics</span>
            </div>
            <Badge className="bg-[#22c55e]/15 dark:bg-[rgba(34,197,94,0.15)] text-green-600 dark:text-[#4ade80] border-0 text-[9px] font-bold tracking-wider">LIVE</Badge>
          </div>
          <p className="text-[11px] text-neutral-400 dark:text-[#5a5650] mb-4">Weekly revenue trends</p>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#f97316" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--text3)" fontSize={9} />
              <YAxis stroke="var(--text3)" fontSize={9} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--bg1)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                }}
                itemStyle={{ color: "var(--text)" }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#f97316"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="bg-white dark:bg-[#111111] border-neutral-200 dark:border-[rgba(255,255,255,0.07)] rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[14px] text-[#f97316]">◷</span>
            <span className="text-[14px] font-semibold text-neutral-800 dark:text-[#f0ece4]">Order Trends</span>
          </div>
          <p className="text-[11px] text-neutral-400 dark:text-[#5a5650] mb-4">Orders by time of day</p>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={orderData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--text3)" fontSize={9} />
              <YAxis stroke="var(--text3)" fontSize={9} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--bg1)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                }}
                itemStyle={{ color: "var(--text)" }}
              />
              <Bar dataKey="orders" fill="#f97316" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {/* Left: Top Items */}
        <Card className="bg-white dark:bg-[#111111] border-neutral-200 dark:border-[rgba(255,255,255,0.07)] rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[14px]">🔥</span>
            <span className="text-[14px] font-semibold text-neutral-800 dark:text-[#f0ece4]">Top items today</span>
          </div>
          <p className="text-[11px] text-neutral-400 dark:text-[#5a5650] mb-4">Best selling menu items</p>
          {!data.topItems || data.topItems.length === 0 ? (
            <p className="text-center text-neutral-400 dark:text-[#5a5650] py-8 text-[12px]">No orders yet today.</p>
          ) : (
            <div className="space-y-0">
              {data.topItems.slice(0, 4).map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-3 border-b border-neutral-100 dark:border-[rgba(255,255,255,0.07)] last:border-0"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-neutral-100 dark:bg-[#222222] flex items-center justify-center text-[10px] font-semibold text-neutral-500 dark:text-[#9a9488]">{idx + 1}</span>
                    <div>
                      <p className="text-[13px] text-neutral-800 dark:text-[#f0ece4] font-medium">
                        {item.name}
                      </p>
                      <p className="text-[11px] text-neutral-400 dark:text-[#5a5650]">
                        {item.quantity} {item.quantity === 1 ? "order" : "orders"}
                      </p>
                    </div>
                  </div>
                  <span className="text-[13px] font-semibold text-neutral-800 dark:text-[#f0ece4]">₹{item.revenue.toFixed(0)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Right: Recent Orders */}
        <Card className="bg-white dark:bg-[#111111] border-neutral-200 dark:border-[rgba(255,255,255,0.07)] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 flex-row">
              <span className="text-[14px] text-neutral-800 dark:text-[#f0ece4]">Recent orders</span>
            </div>
            <Badge className="bg-[#22c55e]/15 dark:bg-[rgba(34,197,94,0.15)] text-green-600 dark:text-[#4ade80] border-0 text-[9px] font-bold tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 dark:bg-[#4ade80] pulse-dot inline-block" />LIVE
            </Badge>
          </div>
          <p className="text-[11px] text-neutral-400 dark:text-[#5a5650] mb-4">Latest incoming orders</p>
          {data.recentOrders.length === 0 ? (
            <p className="text-center text-neutral-400 dark:text-[#5a5650] py-8 text-[12px]">No orders yet.</p>
          ) : (
            <div className="space-y-0">
              {data.recentOrders.slice(0, 4).map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between py-3 border-b border-neutral-100 dark:border-[rgba(255,255,255,0.07)] last:border-0 cursor-pointer hover:bg-neutral-50 dark:hover:bg-[#181818] transition-colors px-[-10px] mx-[-10px]"
                >
                  <div>
                    <p className="text-[13px] text-neutral-800 dark:text-[#f0ece4] font-medium">#{order.orderNumber}</p>
                    <p className="text-[11px] text-neutral-400 dark:text-[#5a5650]">{(order as any).table?.name || "N/A"} · {order.items.length} {order.items.length === 1 ? "item" : "items"}</p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-[13px] font-semibold text-neutral-800 dark:text-[#f0ece4]">₹{order.totalAmount.toFixed(0)}</span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  change?: number;
  subtitle?: string;
  icon: React.ReactNode;
  color: "green" | "blue" | "purple" | "orange";
  clickable?: boolean;
  onClick?: () => void;
}

function StatCard({ title, value, change, subtitle, icon, color, clickable, onClick }: StatCardProps) {
  const colorClasses = {
    green: "bg-green-500/10 dark:bg-[rgba(34,197,94,0.1)] text-green-600 dark:text-[#4ade80]",
    blue: "bg-blue-500/10 dark:bg-[rgba(59,130,246,0.1)] text-blue-600 dark:text-[#60a5fa]",
    purple: "bg-purple-500/10 dark:bg-[rgba(168,85,247,0.1)] text-purple-600 dark:text-[#c084fc]",
    orange: "bg-orange-500/10 dark:bg-[rgba(249,115,22,0.1)] text-orange-600 dark:text-[#f97316]",
  };

  const isPositive = change !== undefined && change >= 0;

  return (
    <div
      className={`bg-white dark:bg-[#111111] border border-neutral-200 dark:border-[rgba(255,255,255,0.07)] rounded-xl p-[18px_20px] relative overflow-hidden transition-all hover:border-neutral-300 dark:hover:border-[rgba(255,255,255,0.14)] card-hover shadow-sm ${clickable ? "cursor-pointer" : ""}`}
      onClick={onClick}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[rgba(249,115,22,0.15)] to-transparent opacity-0 hover:opacity-100 transition-opacity pointer-events-none" />
      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <div className={`w-[34px] h-[34px] rounded-lg flex items-center justify-center ${colorClasses[color]} mb-3.5`}>{icon}</div>
          {change !== undefined && (
            <div className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${isPositive ? "bg-green-500/10 dark:bg-[rgba(34,197,94,0.15)] text-green-600 dark:text-[#4ade80]" : "bg-red-500/10 dark:bg-[rgba(239,68,68,0.15)] text-red-600 dark:text-[#f87171]"}`}>
              {isPositive ? "↑" : "↓"} {Math.abs(change).toFixed(1)}%
            </div>
          )}
        </div>
        <p className="text-[10px] tracking-wider uppercase text-neutral-400 dark:text-[#5a5650] mb-1.5">{title}</p>
        <p className="text-[26px] font-bold text-neutral-800 dark:text-[#f0ece4] tracking-tight leading-none">{value}</p>
        {subtitle && <p className="text-[11px] text-neutral-400 dark:text-[#5a5650] mt-1.5">{subtitle}</p>}
      </div>
    </div>
  );
}


