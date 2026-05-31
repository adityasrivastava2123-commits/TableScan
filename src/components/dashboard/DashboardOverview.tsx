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
  userName: string;
}

function OrderStatusBadge({ status }: { status: string }) {
  const statusClasses = {
    NEW: "bg-[rgba(59,130,246,0.15)] text-[#60a5fa]",
    PREPARING: "bg-[rgba(249,115,22,0.15)] text-[#f97316]",
    READY: "bg-[rgba(34,197,94,0.1)] text-[#4ade80]",
    DONE: "bg-[#222222] text-[#9a9488]",
    CANCELLED: "bg-[rgba(239,68,68,0.15)] text-[#f87171]",
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

export default function DashboardOverview({ restaurant, userName }: DashboardOverviewProps) {
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 animate-pulse bg-[#141414] rounded" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse bg-[#141414] rounded-xl border border-[#252525]"
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
          <h1 className="text-3xl font-bold tracking-tight text-[#f0ece4] leading-[1.1]">
            {getGreeting()} at <em className="text-[#f97316] not-italic">{restaurant.name}</em>
          </h1>
          <p className="text-[13px] text-[#9a9488] mt-1">Real-time pulse of your operations.</p>
          <div className="text-[11px] text-[#5a5650] mt-1 tracking-wider uppercase">
            {new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" })}
          </div>
        </div>
        <div className="flex gap-2.5">
          <button className="px-4 py-2.5 border border-[rgba(255,255,255,0.12)] rounded-lg bg-transparent text-[#f0ece4] text-[12px] font-medium hover:border-[#f97316] hover:text-[#f97316] transition-all flex items-center gap-1.5">
            ↓ Export report
          </button>
          <button className="px-4 py-2.5 border-none rounded-lg bg-[#f97316] text-white text-[12px] font-semibold hover:bg-[#ea6c0a] transition-all flex items-center gap-1.5">
            ✦ AI insights
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          title="REVENUE TODAY"
          value={`₹${data.todayRevenue.toFixed(2)}`}
          change={data.revenueChange}
          icon={<DollarSign className="text-[18px]" />}
          color="green"
        />
        <StatCard
          title="ORDERS"
          value={data.todayOrders.toString()}
          subtitle={`+${data.todayOrders} today`}
          icon={<ShoppingCart className="text-[16px]" />}
          color="blue"
        />
        <StatCard
          title="PENDING"
          value={activeOrders.toString()}
          subtitle="in queue"
          icon={<Users className="text-[16px]" />}
          color="purple"
          clickable
          onClick={() => router.push("/orders")}
        />
        <StatCard
          title="TAX RATE"
          value="18%"
          subtitle="GST applied"
          icon={<TrendingUp className="text-[16px]" />}
          color="orange"
        />
      </div>

      {/* Revenue Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-3.5">
        <Card className="bg-[#111111] border-[rgba(255,255,255,0.07)] rounded-xl p-5 overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[14px]">♦</span>
              <span className="text-[14px] font-semibold text-[#f0ece4]">Revenue Analytics</span>
            </div>
            <Badge className="bg-[rgba(34,197,94,0.15)] text-[#4ade80] border-0 text-[9px] font-bold tracking-wider">LIVE</Badge>
          </div>
          <p className="text-[11px] text-[#5a5650] mb-4">Weekly revenue trends</p>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#f97316" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" stroke="#5a5650" fontSize={9} />
              <YAxis stroke="#5a5650" fontSize={9} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e1e1e",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "8px",
                }}
                itemStyle={{ color: "#fff" }}
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

        <Card className="bg-[#111111] border-[rgba(255,255,255,0.07)] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[14px]">◷</span>
            <span className="text-[14px] font-semibold text-[#f0ece4]">Order Trends</span>
          </div>
          <p className="text-[11px] text-[#5a5650] mb-4">Orders by time of day</p>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={orderData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" stroke="#5a5650" fontSize={9} />
              <YAxis stroke="#5a5650" fontSize={9} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e1e1e",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "8px",
                }}
                itemStyle={{ color: "#fff" }}
              />
              <Bar dataKey="orders" fill="#f97316" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {/* Left: Top Items */}
        <Card className="bg-[#111111] border-[rgba(255,255,255,0.07)] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[14px]">🔥</span>
            <span className="text-[14px] font-semibold text-[#f0ece4]">Top items today</span>
          </div>
          <p className="text-[11px] text-[#5a5650] mb-4">Best selling menu items</p>
          {data.recentOrders.length === 0 ? (
            <p className="text-center text-[#5a5650] py-8 text-[12px]">No orders yet today.</p>
          ) : (
            <div className="space-y-0">
              {data.recentOrders.slice(0, 4).map((order, idx) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between py-3 border-b border-[rgba(255,255,255,0.07)] last:border-0"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#222222] flex items-center justify-center text-[10px] font-semibold text-[#9a9488]">{idx + 1}</span>
                    <div>
                      <p className="text-[13px] text-[#f0ece4] font-medium">
                        {order.items[0]?.name || "Unknown item"}
                      </p>
                      <p className="text-[11px] text-[#5a5650]">
                        {order.items.length} {order.items.length === 1 ? "order" : "orders"}
                      </p>
                    </div>
                  </div>
                  <span className="text-[13px] font-semibold text-[#f0ece4]">₹{order.totalAmount.toFixed(0)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Right: Recent Orders */}
        <Card className="bg-[#111111] border-[rgba(255,255,255,0.07)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-[14px]">Recent orders</span>
            </div>
            <Badge className="bg-[rgba(34,197,94,0.15)] text-[#4ade80] border-0 text-[9px] font-bold tracking-wider">LIVE</Badge>
          </div>
          <p className="text-[11px] text-[#5a5650] mb-4">Latest incoming orders</p>
          {data.recentOrders.length === 0 ? (
            <p className="text-center text-[#5a5650] py-8 text-[12px]">No orders yet.</p>
          ) : (
            <div className="space-y-0">
              {data.recentOrders.slice(0, 4).map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between py-3 border-b border-[rgba(255,255,255,0.07)] last:border-0 cursor-pointer hover:bg-[#181818] transition-colors px-[-10px] mx-[-10px]"
                >
                  <div>
                    <p className="text-[13px] text-[#f0ece4] font-medium">#{order.orderNumber}</p>
                    <p className="text-[11px] text-[#5a5650]">{(order as any).table?.name || "N/A"} · {order.items.length} items</p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-[13px] font-semibold text-[#f0ece4]">₹{order.totalAmount.toFixed(0)}</span>
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
    green: "bg-[rgba(34,197,94,0.1)] text-[#4ade80]",
    blue: "bg-[rgba(59,130,246,0.1)] text-[#60a5fa]",
    purple: "bg-[rgba(168,85,247,0.1)] text-[#c084fc]",
    orange: "bg-[rgba(249,115,22,0.1)] text-[#f97316]",
  };

  const isPositive = change !== undefined && change >= 0;

  return (
    <div
      className={`bg-[#111111] border border-[rgba(255,255,255,0.07)] rounded-xl p-[18px_20px] relative overflow-hidden transition-all hover:border-[rgba(255,255,255,0.12)] ${clickable ? "cursor-pointer" : ""}`}
      onClick={onClick}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[rgba(249,115,22,0.15)] to-transparent opacity-0 hover:opacity-100 transition-opacity pointer-events-none" />
      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <div className={`w-[34px] h-[34px] rounded-lg flex items-center justify-center ${colorClasses[color]} mb-3.5`}>{icon}</div>
          {change !== undefined && (
            <div className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${isPositive ? "bg-[rgba(34,197,94,0.15)] text-[#4ade80]" : "bg-[rgba(239,68,68,0.15)] text-[#f87171]"}`}>
              {isPositive ? "↑" : "↓"} {Math.abs(change).toFixed(1)}%
            </div>
          )}
        </div>
        <p className="text-[10px] tracking-wider uppercase text-[#5a5650] mb-1.5">{title}</p>
        <p className="text-[26px] font-bold text-[#f0ece4] tracking-tight leading-none">{value}</p>
        {subtitle && <p className="text-[11px] text-[#5a5650] mt-1.5">{subtitle}</p>}
      </div>
    </div>
  );
}


