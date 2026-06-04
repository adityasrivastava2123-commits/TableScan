"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart,
} from "recharts";
import { TrendingUp, DollarSign, ShoppingCart, PieChart as PieChartIcon, Activity, Download, Sparkles } from "lucide-react";

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
  restaurant?: any;
};

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0b0a08] border border-[rgba(240,160,64,0.3)] rounded-lg p-3.5 shadow-xl text-[12px] font-mono-dashboard">
      <p className="text-[#f5efe2]/40 mb-2 font-medium uppercase tracking-widest">{label}</p>
      {payload.map((entry: any, i: number) => (
        entry.value !== null && entry.value !== undefined && (
          <div key={i} className="flex items-center justify-between gap-6 mb-1 text-xs">
            <span className="text-[#f5efe2]/60">{entry.name === "revenue" ? "Revenue" : entry.name}:</span>
            <span className="text-[#f5efe2] font-black">
              {typeof entry.value === "number" ? inr.format(entry.value) : entry.value}
            </span>
          </div>
        )
      ))}
    </div>
  );
};

export function ReportsDashboard({ restaurantId, restaurant }: ReportsDashboardProps) {
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

  const exportReportCsv = () => {
    if (!report) return;

    const csvRows = [];
    csvRows.push(["TableScan Restaurant Report Summary"]);
    csvRows.push([`Period,${period.toUpperCase()}`]);
    csvRows.push([`Generated At,${new Date().toLocaleString("en-IN")}`]);
    csvRows.push([]);

    csvRows.push(["METRIC", "VALUE"]);
    csvRows.push(["Total Revenue", `INR ${report.totalRevenue.toFixed(2)}`]);
    csvRows.push(["Total Orders", report.totalOrders]);
    csvRows.push(["Average Order Value", `INR ${report.avgOrderValue.toFixed(2)}`]);
    csvRows.push(["Completion Rate", `${completionRate.toFixed(1)}%`]);
    csvRows.push([]);

    csvRows.push(["ORDER STATUS", "COUNT"]);
    csvRows.push(["NEW", report.ordersByStatus.NEW]);
    csvRows.push(["PREPARING", report.ordersByStatus.PREPARING]);
    csvRows.push(["READY", report.ordersByStatus.READY]);
    csvRows.push(["DONE", report.ordersByStatus.DONE]);
    csvRows.push(["CANCELLED", report.ordersByStatus.CANCELLED]);
    csvRows.push([]);

    csvRows.push(["DAILY REVENUE BREAKDOWN"]);
    csvRows.push(["Date", "Revenue (INR)", "Orders"]);
    report.revenueByDay.forEach(day => {
      csvRows.push([day.date, day.revenue.toFixed(2), day.orders]);
    });
    csvRows.push([]);

    csvRows.push(["POPULAR ITEMS"]);
    csvRows.push(["Item Name", "Quantity Sold", "Revenue (INR)"]);
    report.topItems.forEach(item => {
      csvRows.push([item.name, item.quantity, item.revenue.toFixed(2)]);
    });

    const csvContent = csvRows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tablescan-report-${period}-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <ReportsSkeleton />;
  }

  return (
    <div className="space-y-8 relative">
      {/* Thin Saffron Accenting Border at top */}
      <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-[#f0a040] to-transparent absolute top-0 left-0 opacity-40 pointer-events-none" />

      {/* EDITORIAL HERO HEADER */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-2">
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="text-[9px] font-black uppercase tracking-[0.25em] text-[#f0a040] bg-[#f0a040]/10 border border-[#f0a040]/20 px-3 py-1 rounded-full">
              ANALYTICS CONTROL
            </span>
            <span className="text-[10px] text-[#f5efe2]/40 font-mono-dashboard">
              {new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" }).toUpperCase()}
            </span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#f5efe2] leading-none">
            Performance Reports {restaurant?.name && <>at <em className="font-editorial italic font-normal text-[#f0a040]">{restaurant.name}</em></>}
          </h2>
          
          <p className="text-xs sm:text-sm text-[#f5efe2]/60 font-serif italic tracking-wide max-w-xl">
            Analyze kitchen cycle times, total revenue metrics, and item popularity stats.
          </p>
        </div>

        {/* Actions panel */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="flex bg-white/5 border border-white/10 p-1 rounded-lg">
            {["today", "week", "month"].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p as Period)}
                className={`px-3.5 py-1.5 rounded-md text-[10px] uppercase tracking-wider font-extrabold transition-all ${
                  period === p
                    ? "bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-[#0b0a08]"
                    : "text-[#f5efe2]/50 hover:text-[#f5efe2] hover:bg-white/5"
                }`}
              >
                {p === "today" ? "Today" : p === "week" ? "This Week" : "This Month"}
              </button>
            ))}
          </div>

          <button
            onClick={exportReportCsv}
            disabled={!report || report.totalOrders === 0}
            className="px-4.5 py-3 border border-[rgba(255,255,255,0.08)] bg-white/[0.02] hover:bg-white/[0.04] rounded-lg text-xs font-semibold tracking-wider text-[#f5efe2] transition-all flex items-center gap-2 hover:border-[#f0a040] disabled:opacity-50"
          >
            <Download className="size-3.5 text-[#f5efe2]/60" />
            <span>EXPORT REPORT</span>
          </button>
        </div>
      </section>

      {!report || report.totalOrders === 0 ? (
        <div className="bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] rounded-xl p-16 text-center shadow-xl">
          <Activity className="size-12 mx-auto mb-4 text-[#f5efe2]/20 animate-pulse" />
          <h3 className="text-lg font-bold text-[#f5efe2] uppercase tracking-widest">No Order Data Recorded</h3>
          <p className="mt-2 text-sm text-[#f5efe2]/60 font-serif italic max-w-sm mx-auto">
            Operational and transaction reports will generate automatically as orders process.
          </p>
        </div>
      ) : (
        <>
          {/* STAT STRIP - 4-Column Grid with 1px Dividers */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] rounded-xl overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-[rgba(255,255,255,0.08)] relative z-10 shadow-xl">
            {[
              { label: "TOTAL REVENUE", value: inr.format(report.totalRevenue), icon: <DollarSign className="size-3.5 text-[#f0a040]" />, isFeatured: true },
              { label: "TOTAL ORDERS", value: report.totalOrders.toString(), icon: <ShoppingCart className="size-3.5 text-[#f5efe2]/40" /> },
              { label: "AVERAGE TICKET", value: inr.format(report.avgOrderValue), icon: <TrendingUp className="size-3.5 text-[#f5efe2]/40" /> },
              { label: "COMPLETION RATE", value: `${completionRate.toFixed(1)}%`, icon: <PieChartIcon className="size-3.5 text-[#f5efe2]/40" /> }
            ].map((stat, idx) => (
              <div
                key={stat.label}
                className={`p-6 relative group transition-all duration-300 ${
                  stat.isFeatured 
                    ? "bg-gradient-to-br from-[#f0a040]/5 via-transparent to-transparent" 
                    : "hover:bg-white/[0.01]"
                }`}
              >
                {stat.isFeatured && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#f0a040] to-[#e85a2a]" />
                )}
                
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-[0.2em] text-[#f5efe2]/40 uppercase">
                    {stat.label}
                  </span>
                  {stat.icon}
                </div>

                <div className="mt-4 flex items-baseline gap-2">
                  <h3 className="text-3xl md:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/60 font-mono-dashboard leading-none">
                    {stat.value}
                  </h3>
                </div>
              </div>
            ))}
          </section>

          {/* TWO COLUMN CHART AREA */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            
            {/* Revenue Trend Area Chart */}
            <div className="bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] rounded-xl p-6 flex flex-col justify-between shadow-xl min-h-[340px] relative overflow-hidden">
              <div className="flex items-center justify-between mb-4 border-b border-[rgba(255,255,255,0.05)] pb-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold tracking-[0.2em] text-[#f0a040] uppercase">DAILY PROGRESSION</span>
                  <h4 className="text-base font-bold text-[#f5efe2]">Revenue Flow Trends</h4>
                </div>
              </div>

              <div className="flex-1 w-full min-h-[200px] mt-4">
                <ResponsiveContainer width="100%" height={210}>
                  <AreaChart data={report.revenueByDay} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f0a040" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#e85a2a" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="date" stroke="rgba(245, 239, 226, 0.3)" fontSize={9} tickLine={false} fontFamily="JetBrains Mono" />
                    <YAxis tickFormatter={(value) => `₹${value}`} stroke="rgba(245, 239, 226, 0.3)" fontSize={9} tickLine={false} axisLine={false} fontFamily="JetBrains Mono" />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#f0a040"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Items Cards */}
            <div className="bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] rounded-xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-4 border-b border-[rgba(255,255,255,0.05)] pb-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold tracking-[0.2em] text-[#e85a2a] uppercase">TOP SELLERS</span>
                  <h4 className="text-base font-bold text-[#f5efe2]">Dish Revenue Matrix</h4>
                </div>
              </div>

              <div className="flex-1 space-y-3.5">
                {report.topItems.slice(0, 4).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-white/[0.01] border border-[rgba(255,255,255,0.03)] rounded-xl">
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
                      {inr.format(item.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}

function ReportsSkeleton() {
  return (
    <div className="space-y-8 pt-2">
      <div className="h-8 animate-pulse bg-neutral-900 rounded" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="h-28 animate-pulse bg-neutral-950 rounded-xl border border-neutral-800" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, idx) => (
          <div key={idx} className="h-[280px] animate-pulse bg-neutral-950 rounded-xl border border-neutral-800" />
        ))}
      </div>
    </div>
  );
}
