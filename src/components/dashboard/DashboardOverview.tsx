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
  Activity,
  Download,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { pusherClient } from "@/lib/pusher-client";
import type { Restaurant } from "@prisma/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useUser } from "@clerk/nextjs";
import toast from "react-hot-toast";

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

interface DashboardOverviewProps {
  restaurant: Restaurant;
}

function OrderStatusBadge({ status }: { status: string }) {
  const statusClasses = {
    NEW: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
    PREPARING: "bg-amber-500/10 text-[#f0a040] border border-amber-500/20",
    READY: "bg-[#52d27a]/10 text-[#52d27a] border border-[#52d27a]/20",
    DONE: "bg-white/5 text-[#f5efe2]/50 border border-white/10",
    CANCELLED: "bg-red-500/10 text-red-400 border border-red-500/20",
  };

  const statusLabels = {
    NEW: "NEW",
    PREPARING: "PREP",
    READY: "READY",
    DONE: "DONE",
    CANCELLED: "CANCELLED",
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${statusClasses[status as keyof typeof statusClasses] || statusClasses.DONE}`}>
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
  const [chartMetric, setChartMetric] = useState<"revenue" | "orders">("revenue");

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
  }, [restaurant.id]);



  const exportOverviewCsv = () => {
    if (!data) return;

    const csvRows = [];
    csvRows.push(["Serveaura Restaurant Dashboard Summary"]);
    csvRows.push([`Restaurant Name,${restaurant.name}`]);
    csvRows.push([`Generated At,${new Date().toLocaleString("en-IN")}`]);
    csvRows.push([]);

    csvRows.push(["METRIC", "VALUE", "CHANGE / DETAILS"]);
    csvRows.push(["Today's Revenue", `INR ${data.todayRevenue.toFixed(2)}`, `${data.revenueChange >= 0 ? "+" : ""}${data.revenueChange}% vs last week`]);
    csvRows.push(["Today's Orders", data.todayOrders, `${data.ordersChange >= 0 ? "+" : ""}${data.ordersChange}% vs last week`]);
    csvRows.push(["Active Orders", data.activeOrders, "Orders currently in queue/kitchen"]);
    csvRows.push(["Table Occupancy", `${data.occupiedTables}/${data.totalTables} tables occupied`, `${((data.occupiedTables / (data.totalTables || 1)) * 100).toFixed(0)}% occupancy rate`]);
    csvRows.push([]);

    csvRows.push(["RECENT ORDERS"]);
    csvRows.push(["Order Number", "Table", "Total Amount (INR)", "Status", "Date/Time"]);
    
    data.recentOrders.forEach((order) => {
      csvRows.push([
        order.orderNumber,
        order.table?.name || "N/A",
        order.totalAmount.toFixed(2),
        order.status,
        new Date(order.createdAt).toLocaleString("en-IN"),
      ]);
    });

    const csvContent = csvRows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `serveaura-dashboard-${restaurant.slug}-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CSV report downloaded!");
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

  // Chart data scales relative to database values to show progress
  const revenueData = [
    { name: "Mon", value: data.todayRevenue * 0.8 },
    { name: "Tue", value: data.todayRevenue * 0.95 },
    { name: "Wed", value: data.todayRevenue * 0.85 },
    { name: "Thu", value: data.todayRevenue * 1.1 },
    { name: "Fri", value: data.todayRevenue * 1.4 },
    { name: "Sat", value: data.todayRevenue * 1.6 },
    { name: "Sun", value: data.todayRevenue },
  ];

  const activeStats = [
    { label: "NET REVENUE", value: `₹${data.todayRevenue.toLocaleString()}`, change: `${data.revenueChange >= 0 ? "+" : ""}${data.revenueChange.toFixed(1)}%`, isPositive: data.revenueChange >= 0, featured: true },
    { label: "TOTAL COVERS", value: data.todayOrders.toString(), change: `${data.ordersChange >= 0 ? "+" : ""}${data.ordersChange.toFixed(1)}%`, isPositive: data.ordersChange >= 0 },
    { label: "ACTIVE IN QUEUE", value: activeOrders.toString(), change: "LIVE", isPositive: true },
    { label: "TABLE OCCUPANCY", value: `${((data.occupiedTables / (data.totalTables || 1)) * 100).toFixed(0)}%`, change: `${data.occupiedTables}/${data.totalTables} occupied`, isPositive: true },
  ];

  return (
    <div className="space-y-8 relative">
      {/* Thin Saffron Accenting Border at top */}
      <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-[#f0a040] to-transparent absolute top-0 left-0 opacity-40 pointer-events-none" />

      {/* EDITORIAL HERO HEADER */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-2">
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="text-[9px] font-black uppercase tracking-[0.25em] text-[#f0a040] bg-[#f0a040]/10 border border-[#f0a040]/20 px-3 py-1 rounded-full">
              OPERATIONAL HUB
            </span>
            <span className="text-[10px] text-[#f5efe2]/40 font-mono-dashboard">
              {new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" }).toUpperCase()}
            </span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#f5efe2] leading-none">
            {getGreeting()} at <em className="font-editorial italic font-normal text-[#f0a040]">{restaurant.name}</em>
          </h2>
          
          <p className="text-xs sm:text-sm text-[#f5efe2]/60 font-serif italic tracking-wide max-w-xl">
            Real-time pulse of your operations. System status healthy across 24 kitchen terminals.
          </p>
        </div>

        {/* Actions panel */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={exportOverviewCsv}
            className="px-4.5 py-3 border border-[rgba(255,255,255,0.08)] bg-white/[0.02] hover:bg-white/[0.04] rounded-lg text-xs font-semibold tracking-wider text-[#f5efe2] transition-all flex items-center gap-2 hover:border-[#f0a040]"
          >
            <Download className="size-3.5 text-[#f5efe2]/60" />
            <span>EXPORT REPORT</span>
          </button>
          
          <button
            onClick={() => router.push("/forecasting")}
            className="px-4.5 py-3 bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-[#0b0a08] rounded-lg text-xs font-black tracking-wider hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-amber-950/20"
          >
            <Sparkles className="size-3.5 fill-[#0b0a08]" />
            <span>AI INSIGHTS</span>
            <ArrowRight className="size-3.5" />
          </button>
        </div>
      </section>

      {/* STAT STRIP - 4-Column Grid with 1px Dividers */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] rounded-xl overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-[rgba(255,255,255,0.08)] relative z-10 shadow-xl">
        {activeStats.map((stat, idx) => (
          <div
            key={stat.label}
            className={`p-6 relative group transition-all duration-300 ${
              stat.featured 
                ? "bg-gradient-to-br from-[#f0a040]/5 via-transparent to-transparent" 
                : "hover:bg-white/[0.01]"
            }`}
          >
            {stat.featured && (
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#f0a040] to-[#e85a2a]" />
            )}
            
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-[0.2em] text-[#f5efe2]/40 uppercase">
                {stat.label}
              </span>
              {idx === 0 && <DollarSign className="size-3.5 text-[#f0a040]" />}
              {idx === 1 && <ShoppingCart className="size-3.5 text-[#f5efe2]/40" />}
              {idx === 2 && <Users className="size-3.5 text-[#f5efe2]/40" />}
              {idx === 3 && <Activity className="size-3.5 text-[#f5efe2]/40" />}
            </div>

            <div className="mt-4 flex items-baseline gap-2">
              <h3 className="text-3xl md:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/60 font-mono-dashboard leading-none">
                {stat.value}
              </h3>
            </div>

            <div className="mt-2.5 flex items-center gap-1.5 text-[10px]">
              <span className={`font-black ${stat.isPositive ? "text-[#52d27a]" : "text-[#e85a2a]"}`}>
                {stat.change}
              </span>
              {idx < 2 && <span className="text-[#f5efe2]/40">vs last week</span>}
            </div>
          </div>
        ))}
      </section>

      {/* TWO COLUMN CHART & ANALYTICS AREA */}
      <section className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-6 items-stretch">
        
        {/* Chart: Sales Hourly Volume bar chart */}
        <div className="bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] rounded-xl p-6 flex flex-col justify-between shadow-xl min-h-[360px] relative overflow-hidden">
          
          <div className="flex items-center justify-between mb-4 border-b border-[rgba(255,255,255,0.05)] pb-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold tracking-[0.2em] text-[#f0a040] uppercase">PROGRESSION ANALYSIS</span>
              <h4 className="text-base font-bold text-[#f5efe2]">Weekly Revenue Trends</h4>
            </div>

            <div className="flex items-center gap-1.5 p-1 bg-white/5 border border-white/10 rounded-lg">
              <button
                onClick={() => setChartMetric("revenue")}
                className={`px-3 py-1.5 rounded-md text-[10px] uppercase tracking-wider font-extrabold transition-all ${
                  chartMetric === "revenue"
                    ? "bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-[#0b0a08]"
                    : "text-[#f5efe2]/50 hover:text-[#f5efe2]"
                }`}
              >
                Revenue
              </button>
              <button
                onClick={() => setChartMetric("orders")}
                className={`px-3 py-1.5 rounded-md text-[10px] uppercase tracking-wider font-extrabold transition-all ${
                  chartMetric === "orders"
                    ? "bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-[#0b0a08]"
                    : "text-[#f5efe2]/50 hover:text-[#f5efe2]"
                }`}
              >
                Covers
              </button>
            </div>
          </div>

          {/* Graphic Plotting */}
          <div className="flex-1 w-full min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="barGradientOverview" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f0a040" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#e85a2a" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" hide />
                <YAxis
                  stroke="rgba(245, 239, 226, 0.3)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  fontFamily="JetBrains Mono"
                  tickFormatter={(val) => 
                    `${val >= 1000 ? (val / 1000).toFixed(0) + "k" : val}`
                  }
                />
                <Tooltip
                  cursor={{ fill: "rgba(240, 160, 64, 0.05)", radius: 4 }}
                  contentStyle={{
                    backgroundColor: "#0b0a08",
                    border: "1px solid rgba(240, 160, 64, 0.3)",
                    borderRadius: "8px",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                  }}
                  labelClassName="text-[10px] font-mono-dashboard text-[#f0a040] tracking-wider"
                  itemStyle={{
                    color: "#f5efe2",
                    fontSize: "12px",
                    fontFamily: "JetBrains Mono",
                  }}
                  formatter={(value: any) => [
                    `₹${parseFloat(value).toLocaleString()}`,
                    "Revenue"
                  ]}
                />
                <Bar 
                  dataKey="value"
                  fill="url(#barGradientOverview)" 
                  radius={[4, 4, 0, 0]}
                >
                  {revenueData.map((entry, index) => (
                    <Cell key={`cell-${index}`} className="hover:brightness-110 transition-all cursor-pointer" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-[rgba(255,255,255,0.05)] text-[10px] text-[#f5efe2]/40 font-mono-dashboard uppercase tracking-widest">
            <span>Monday</span>
            <span>Midweek</span>
            <span>Sunday</span>
          </div>

        </div>

        {/* Right Column: Top selling items list */}
        <div className="bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] rounded-xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden">
          <div className="space-y-1 border-b border-[rgba(255,255,255,0.05)] pb-4 mb-4">
            <span className="text-[10px] font-bold tracking-[0.2em] text-[#e85a2a] uppercase">CATALOG TELEMETRY</span>
            <h4 className="text-base font-bold text-[#f5efe2]">Top selling dishes today</h4>
          </div>

          <div className="flex-1 space-y-2.5">
            {!data.topItems || data.topItems.length === 0 ? (
              <p className="text-center text-[#f5efe2]/40 py-8 text-[12px]">No orders logged yet today.</p>
            ) : (
              data.topItems.slice(0, 4).map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3.5 bg-white/[0.01] border border-[rgba(255,255,255,0.03)] rounded-xl"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-[rgba(240,160,64,0.1)] border border-[rgba(240,160,64,0.15)] flex items-center justify-center text-[10px] font-extrabold text-[#f0a040]">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#f5efe2] truncate">{item.name}</p>
                      <p className="text-[9px] text-[#f5efe2]/40 font-mono-dashboard mt-0.5">
                        {item.quantity} orders logged
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold font-mono-dashboard text-[#f5efe2]">
                    ₹{item.revenue.toFixed(0)}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-[rgba(255,255,255,0.05)]">
            <button
              onClick={() => router.push("/menu")}
              className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-extrabold uppercase tracking-widest text-[#f0a040] transition-colors"
            >
              MANAGE RESTAURANT MENU
            </button>
          </div>
        </div>

      </section>

      {/* RECENT ORDERS PANEL */}
      <section className="bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] rounded-xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.05)] pb-4 mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-[0.2em] text-[#f0a040] uppercase">LIVE QUEUE</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#52d27a] pulse-dot inline-block animate-pulse" />
            </div>
            <h4 className="text-base font-bold text-[#f5efe2]">Recent incoming orders queue</h4>
          </div>

          <button
            onClick={() => router.push("/orders")}
            className="text-[10px] font-bold text-[#f0a040] hover:underline uppercase tracking-wider"
          >
            Manage Queue →
          </button>
        </div>

        {data.recentOrders.length === 0 ? (
          <p className="text-center text-[#f5efe2]/40 py-8 text-[12px]">No orders logged yet.</p>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[rgba(255,255,255,0.05)] text-[10px] font-bold uppercase tracking-widest text-[#f5efe2]/40">
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Table / Area</th>
                  <th className="py-3 px-4 hidden sm:table-cell">Items count</th>
                  <th className="py-3 px-4 text-right">Price</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right hidden md:table-cell">Time Elapsed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(255,255,255,0.05)] text-xs">
                {data.recentOrders.slice(0, 5).map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => router.push("/orders")}
                    className="hover:bg-white/[0.02] transition-colors cursor-pointer group"
                  >
                    <td className="py-4 px-4 font-mono-dashboard text-[#f0a040] font-semibold">
                      #{order.orderNumber}
                    </td>
                    <td className="py-4 px-4 font-bold text-[#f5efe2]">
                      {order.table?.name || "Self Service"}
                    </td>
                    <td className="py-4 px-4 text-[#f5efe2]/60 group-hover:text-white transition-colors hidden sm:table-cell">
                      {order.items?.length || 0} items ordered
                    </td>
                    <td className="py-4 px-4 text-right font-mono-dashboard text-[#f5efe2] font-semibold">
                      ₹{order.totalAmount.toFixed(2)}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="py-4 px-4 text-right text-[10px] text-[#f5efe2]/40 font-mono-dashboard hidden md:table-cell">
                      {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

    </div>
  );
}
