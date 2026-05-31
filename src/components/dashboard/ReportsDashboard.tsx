"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, DollarSign, ShoppingCart, PieChart as PieChartIcon, Activity, Download } from "lucide-react";

type Period = "today" | "week" | "month";

type ReportResponse = {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  topItems: Array<{ name: string; quantity: number; revenue: number }>;
  revenueByDay: Array<{ date: string; revenue: number; orders: number }>;
  ordersByStatus: {
    NEW: number;
    PREPARING: number;
    READY: number;
    DONE: number;
    CANCELLED: number;
  };
  peakHours: Array<{ hour: number; orders: number }>;
};

type ReportsDashboardProps = {
  restaurantId: string;
};

const statusColors = ["#f97316", "#f59e0b", "#22c55e", "#64748b", "#ef4444"];

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function ReportsDashboard({ restaurantId }: ReportsDashboardProps) {
  const [period, setPeriod] = useState<Period>("today");
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get<ReportResponse>(
        `/api/reports?restaurantId=${restaurantId}&period=${period}`,
      );
      setReport(data);
    } catch (error) {
      console.error(error);
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [period, restaurantId]);

  useEffect(() => {
    void fetchReport();
  }, [fetchReport]);

  const completionRate = useMemo(() => {
    if (!report || report.totalOrders === 0) return 0;
    return (report.ordersByStatus.DONE / report.totalOrders) * 100;
  }, [report]);

  if (loading) {
    return <ReportsSkeleton />;
  }

  if (!report || report.totalOrders === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Tabs value={period} onValueChange={(value) => setPeriod(value as Period)}>
            <TabsList className="bg-[#141414] border-[#252525]">
              <TabsTrigger value="today" className="data-[state=active]:bg-[#f97316] data-[state=active]:text-white">Today</TabsTrigger>
              <TabsTrigger value="week" className="data-[state=active]:bg-[#f97316] data-[state=active]:text-white">This Week</TabsTrigger>
              <TabsTrigger value="month" className="data-[state=active]:bg-[#f97316] data-[state=active]:text-white">This Month</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button className="bg-[#141414] border-[#252525] text-white hover:bg-[#1e1e1e]">
            <Download className="size-4 mr-2" />
            Export
          </Button>
        </div>
        <Card className="flex min-h-[300px] items-center justify-center p-6 text-center bg-[#141414] border-[#252525]">
          <div>
            <Activity className="size-12 mx-auto mb-4 text-[#555555]" />
            <h3 className="text-xl font-semibold text-white">No orders yet</h3>
            <p className="mt-2 text-sm text-[#999999]">
              Place orders to start seeing revenue and performance insights.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-[#111111] border border-[rgba(255,255,255,0.07)] rounded-lg p-1">
          <button
            onClick={() => setPeriod("today")}
            className={`px-4 py-1.5 rounded-md text-[12px] font-medium transition-all ${period === "today" ? "bg-[#f97316] text-white" : "text-[#9a9488] hover:text-[#f0ece4]"}`}
          >
            Today
          </button>
          <button
            onClick={() => setPeriod("week")}
            className={`px-4 py-1.5 rounded-md text-[12px] font-medium transition-all ${period === "week" ? "bg-[#f97316] text-white" : "text-[#9a9488] hover:text-[#f0ece4]"}`}
          >
            This Week
          </button>
          <button
            onClick={() => setPeriod("month")}
            className={`px-4 py-1.5 rounded-md text-[12px] font-medium transition-all ${period === "month" ? "bg-[#f97316] text-white" : "text-[#9a9488] hover:text-[#f0ece4]"}`}
          >
            This Month
          </button>
        </div>
        <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#111111] border border-[rgba(255,255,255,0.07)] text-[#f0ece4] text-[12px] font-medium hover:border-[#f97316] hover:text-[#f97316] transition-all">
          ↓ Export Report
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          label="Total Revenue"
          value={inr.format(report.totalRevenue)}
          icon={<DollarSign className="text-[16px]" />}
          color="green"
        />
        <StatCard
          label="Total Orders"
          value={report.totalOrders.toString()}
          icon={<ShoppingCart className="text-[16px]" />}
          color="blue"
        />
        <StatCard
          label="Average Order Value"
          value={inr.format(report.avgOrderValue)}
          icon={<TrendingUp className="text-[16px]" />}
          color="purple"
        />
        <StatCard
          label="Completion Rate"
          value={`${completionRate.toFixed(1)}%`}
          icon={<PieChartIcon className="text-[16px]" />}
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <ChartCard title="Revenue by Day" description="Daily revenue trends">
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={report.revenueByDay}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#f97316" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tick={{ fontSize: 8 }} stroke="#5a5650" />
              <YAxis tickFormatter={(value) => `₹${value}`} tick={{ fontSize: 8 }} stroke="#5a5650" />
              <Tooltip
                formatter={(value) => typeof value === 'number' ? inr.format(value) : value}
                contentStyle={{
                  backgroundColor: "#1e1e1e",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "8px",
                }}
                itemStyle={{ color: "#fff" }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#f97316"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top 5 Menu Items" description="Most popular items by quantity">
          <div className="mt-4 space-y-3.5">
            {report.topItems.slice(0, 3).map((item, idx) => (
              <div key={idx}>
                <div className="flex justify-between mb-1.5">
                  <span className="text-[12px] text-[#9a9488]">{item.name}</span>
                  <span className="text-[11px] text-[#5a5650]">{item.quantity}</span>
                </div>
                <div className="bg-[#222222] rounded-[4px] h-2">
                  <div
                    className="bg-[#f97316] h-2 rounded-[4px]"
                    style={{ width: `${(item.quantity / Math.max(...report.topItems.map(i => i.quantity))) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: "green" | "blue" | "purple" | "orange";
}) {
  const colorClasses = {
    green: "bg-[rgba(34,197,94,0.1)] text-[#4ade80]",
    blue: "bg-[rgba(59,130,246,0.1)] text-[#60a5fa]",
    purple: "bg-[rgba(168,85,247,0.1)] text-[#c084fc]",
    orange: "bg-[rgba(249,115,22,0.1)] text-[#f97316]",
  };

  return (
    <div className="bg-[#111111] border border-[rgba(255,255,255,0.07)] rounded-xl p-[18px_20px]">
      <p className="text-[10px] tracking-wider uppercase text-[#5a5650] mb-1.5">{label}</p>
      <p className="text-[22px] font-bold text-[#f0ece4] tracking-tight leading-none">{value}</p>
    </div>
  );
}

function ChartCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#111111] border border-[rgba(255,255,255,0.07)] rounded-xl p-5">
      <div className="text-[14px] font-semibold text-[#f0ece4] mb-2">{title}</div>
      {description && <div className="text-[11px] text-[#5a5650] mb-4">{description}</div>}
      {children}
    </div>
  );
}

function ReportsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-80 animate-pulse rounded-md bg-[#141414]" />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <Card key={idx} className="space-y-3 p-4 bg-[#141414] border-[#252525]">
            <div className="h-4 w-28 animate-pulse rounded bg-[#1e1e1e]" />
            <div className="h-7 w-32 animate-pulse rounded bg-[#1e1e1e]" />
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, idx) => (
          <Card key={idx} className="space-y-3 p-4 bg-[#141414] border-[#252525]">
            <div className="h-5 w-36 animate-pulse rounded bg-[#1e1e1e]" />
            <div className="h-[300px] animate-pulse rounded bg-[#1e1e1e]/70" />
          </Card>
        ))}
      </div>
    </div>
  );
}

