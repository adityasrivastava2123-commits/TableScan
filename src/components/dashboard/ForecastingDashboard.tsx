"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  RefreshCw,
  Brain,
  ChevronUp,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import type { Restaurant } from "@prisma/client";

interface ForecastKPIs {
  predictedRevenue: number;
  predictedOrders: number;
  busiestHour: string;
  lowStockRiskCount: number;
  lowStockRiskItems: string[];
}

interface ChartPoint {
  date: string;
  actual: number | null;
  orders: number | null;
  forecast: number | null;
  forecastHigh: number | null;
  forecastLow: number | null;
}

interface TopItem {
  name: string;
  total: number;
  recent7: number;
  revenue: number;
  trend: number;
  predictedTomorrow: number;
}

interface Recommendation {
  type: "stock" | "staff" | "promo" | "timing" | "revenue";
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  icon: string;
}

interface ForecastData {
  hasEnoughData: boolean;
  totalOrdersAnalyzed: number;
  kpis: ForecastKPIs;
  chartData: ChartPoint[];
  heatmap: { data: number[][]; days: string[]; hours: string[] };
  topItems: TopItem[];
  recommendations: Recommendation[];
}

interface Props {
  restaurant: Restaurant;
}

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function getHeatmapColor(value: number): string {
  if (value === 0) return "rgba(255,255,255,0.03)";
  if (value < 20) return "rgba(249,115,22,0.08)";
  if (value < 40) return "rgba(249,115,22,0.2)";
  if (value < 60) return "rgba(249,115,22,0.38)";
  if (value < 80) return "rgba(249,115,22,0.58)";
  return "rgba(249,115,22,0.85)";
}

function getImpactColor(impact: string) {
  if (impact === "high") return { bg: "rgba(239,68,68,0.1)", text: "#f87171", dot: "#ef4444" };
  if (impact === "medium") return { bg: "rgba(249,115,22,0.1)", text: "#f97316", dot: "#f97316" };
  return { bg: "rgba(59,130,246,0.1)", text: "#60a5fa", dot: "#3b82f6" };
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-[rgba(255,255,255,0.1)] rounded-xl p-3 shadow-xl text-[12px]">
      <p className="text-neutral-500 dark:text-[#9a9488] mb-2 font-medium">{label}</p>
      {payload.map((entry: any, i: number) => (
        entry.value !== null && entry.value !== undefined && (
          <div key={i} className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
            <span className="text-neutral-500 dark:text-[#9a9488]">{entry.name === "actual" ? "Actual" : entry.name === "forecast" ? "Forecast" : entry.name}:</span>
            <span className="text-neutral-800 dark:text-[#f0ece4] font-semibold">
              {typeof entry.value === "number" && entry.name !== "orders" && entry.name !== "forecastHigh" && entry.name !== "forecastLow"
                ? inr.format(entry.value)
                : entry.value}
            </span>
          </div>
        )
      ))}
    </div>
  );
};

function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-neutral-100 dark:bg-[#111111] border border-neutral-200 dark:border-[rgba(255,255,255,0.07)] rounded-xl animate-pulse ${className}`} />
  );
}

export default function ForecastingDashboard({ restaurant }: Props) {
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchForecast = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await axios.get<ForecastData>(`/api/forecasting?restaurantId=${restaurant.id}`);
      setData(res.data);
      setLastUpdated(new Date());
    } catch (e) {
      console.error(e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [restaurant.id]);

  useEffect(() => {
    fetchForecast();
  }, [fetchForecast]);

  if (loading) {
    return (
      <div className="space-y-5">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-64 bg-[#141414] rounded-lg animate-pulse mb-2" />
            <div className="h-4 w-48 bg-[#141414] rounded animate-pulse" />
          </div>
          <div className="h-9 w-28 bg-[#141414] rounded-lg animate-pulse" />
        </div>
        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} className="h-28" />)}
        </div>
        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-3.5">
          <SkeletonCard className="h-72" />
          <SkeletonCard className="h-72" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
          <SkeletonCard className="h-56" />
          <SkeletonCard className="h-56" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertTriangle className="w-12 h-12 text-[#f97316] mb-4" />
        <h2 className="text-xl font-bold text-[#f0ece4] mb-2">Failed to load forecast</h2>
        <p className="text-[#9a9488] mb-6 text-sm">There was an error computing your forecast data.</p>
        <button
          onClick={fetchForecast}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#f97316] text-white rounded-lg text-sm font-semibold hover:bg-[#ea6c0a] transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    );
  }

  if (!data) return null;

  if (!data.hasEnoughData) {
    return (
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f97316] to-[#d97706] flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-800 dark:text-[#f0ece4] tracking-tight">AI Forecasting</h1>
            <p className="text-[13px] text-neutral-500 dark:text-[#9a9488]">Predictive intelligence for your restaurant</p>
          </div>
        </div>
        <div className="bg-white dark:bg-[#111111] border border-neutral-200 dark:border-[rgba(255,255,255,0.07)] rounded-2xl p-12 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[rgba(249,115,22,0.15)] to-[rgba(249,115,22,0.05)] border border-[rgba(249,115,22,0.2)] flex items-center justify-center mx-auto mb-5">
            <Brain className="w-8 h-8 text-[#f97316]" />
          </div>
          <h2 className="text-xl font-bold text-neutral-800 dark:text-[#f0ece4] mb-3">Not enough data yet</h2>
          <p className="text-neutral-600 dark:text-[#9a9488] text-sm max-w-md mx-auto leading-relaxed mb-2">
            AI forecasting needs at least 5 orders to start detecting patterns. Right now you have <span className="text-[#f97316] font-semibold">{data.totalOrdersAnalyzed} order{data.totalOrdersAnalyzed !== 1 ? "s" : ""}</span>.
          </p>
          <p className="text-neutral-400 dark:text-[#5a5650] text-xs">As your restaurant takes more orders, the AI will start predicting revenue, demand peaks, and smart recommendations.</p>
        </div>
      </div>
    );
  }

  const { kpis, chartData, heatmap, topItems, recommendations } = data;

  // Split chart into actual vs forecast zones
  const todayLabel = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div className="space-y-5">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f97316] to-[#d97706] flex items-center justify-center shadow-lg shadow-[#f97316]/20 flex-shrink-0">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-neutral-800 dark:text-[#f0ece4] tracking-tight">AI Forecasting</h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-gradient-to-r from-[rgba(249,115,22,0.15)] to-[rgba(249,115,22,0.08)] border border-[rgba(249,115,22,0.25)] rounded-full text-[10px] font-bold tracking-wider text-[#f97316]">
                <Sparkles className="w-2.5 h-2.5" />
                AI POWERED
              </span>
            </div>
            <p className="text-[13px] text-neutral-500 dark:text-[#9a9488] mt-0.5">
              Based on {data.totalOrdersAnalyzed} orders · Updated {lastUpdated?.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) || "just now"}
            </p>
          </div>
        </div>
        <button
          onClick={fetchForecast}
          className="flex items-center gap-2 px-4 py-2.5 border border-neutral-200 dark:border-[rgba(255,255,255,0.12)] rounded-lg bg-transparent text-neutral-700 dark:text-[#f0ece4] text-[12px] font-medium hover:border-[#f97316] hover:text-[#f97316] transition-all self-start"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Forecast
        </button>
      </div>

      {/* ── KPI Strip ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <ForecastKPICard
          label="PREDICTED REVENUE"
          sublabel="Tomorrow"
          value={inr.format(kpis.predictedRevenue)}
          icon="📈"
          accentColor="#22c55e"
          delay="0ms"
        />
        <ForecastKPICard
          label="PREDICTED ORDERS"
          sublabel="Tomorrow"
          value={kpis.predictedOrders.toString()}
          icon="🍽️"
          accentColor="#3b82f6"
          delay="75ms"
        />
        <ForecastKPICard
          label="BUSIEST HOUR"
          sublabel="Peak predicted"
          value={kpis.busiestHour}
          icon="⏰"
          accentColor="#f97316"
          delay="150ms"
        />
        <ForecastKPICard
          label="LOW-STOCK RISK"
          sublabel={kpis.lowStockRiskCount > 0 ? kpis.lowStockRiskItems[0] : "All items stable"}
          value={`${kpis.lowStockRiskCount} item${kpis.lowStockRiskCount !== 1 ? "s" : ""}`}
          icon="📦"
          accentColor={kpis.lowStockRiskCount > 0 ? "#ef4444" : "#22c55e"}
          delay="225ms"
        />
      </div>

      {/* ── Demand Forecast Chart + Heatmap ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.65fr_1fr] gap-3.5">
        {/* Forecast Chart */}
        <div className="bg-white dark:bg-[#111111] border border-neutral-200 dark:border-[rgba(255,255,255,0.07)] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-[14px] text-[#f97316]">♦</span>
              <span className="text-[14px] font-semibold text-neutral-800 dark:text-[#f0ece4]">Revenue Forecast</span>
            </div>
            <div className="flex items-center gap-4 text-[10px]">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-6 h-0.5 bg-[#f97316]" />
                <span className="text-[#9a9488]">Actual</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-6 h-0.5 bg-[#f97316] opacity-50 border-dashed" style={{ borderTop: "2px dashed #f97316", height: "0px" }} />
                <span className="text-[#9a9488]">Forecast</span>
              </span>
            </div>
          </div>
          <p className="text-[11px] text-[#5a5650] mb-4">14 days actual + 3 day AI projection</p>

          <ResponsiveContainer width="100%" height={210}>
            <ComposedChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="fg-actual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#f97316" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="fg-forecast" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#f97316" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="date"
                stroke="#5a5650"
                fontSize={8}
                tickLine={false}
                interval={2}
              />
              <YAxis
                stroke="#5a5650"
                fontSize={8}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine x={todayLabel} stroke="rgba(249,115,22,0.4)" strokeDasharray="4 2" label={{ value: "Today", fontSize: 8, fill: "#f97316", position: "insideTop" }} />
              {/* Actual area */}
              <Area
                type="monotone"
                dataKey="actual"
                stroke="#f97316"
                strokeWidth={2}
                fill="url(#fg-actual)"
                connectNulls={false}
                dot={false}
                activeDot={{ r: 4, fill: "#f97316" }}
              />
              {/* Confidence band */}
              <Area
                type="monotone"
                dataKey="forecastHigh"
                stroke="transparent"
                fill="url(#fg-forecast)"
                connectNulls={false}
                dot={false}
                activeDot={false}
              />
              {/* Forecast line */}
              <Line
                type="monotone"
                dataKey="forecast"
                stroke="#f97316"
                strokeWidth={2}
                strokeDasharray="6 3"
                dot={{ r: 3, fill: "#f97316", strokeWidth: 0 }}
                connectNulls={false}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Peak Hours Heatmap */}
        <div className="bg-white dark:bg-[#111111] border border-neutral-200 dark:border-[rgba(255,255,255,0.07)] rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[14px]">🔥</span>
            <span className="text-[14px] font-semibold text-neutral-800 dark:text-[#f0ece4]">Peak Hours Map</span>
          </div>
          <p className="text-[11px] text-neutral-400 dark:text-[#5a5650] mb-4">Order density by day & hour</p>

          <div className="overflow-x-auto">
            {/* Hour labels — only show a subset to avoid crowding */}
            <div className="flex gap-[2px] mb-1 pl-8">
              {heatmap.hours.map((h, i) => (
                <div
                  key={i}
                  className="text-[7px] text-[#5a5650] text-center flex-1 min-w-[10px]"
                  style={{ display: [0, 6, 12, 18].includes(i) ? "block" : "none" }}
                >
                  {h}
                </div>
              ))}
            </div>
            {heatmap.data.map((row, dayIdx) => (
              <div key={dayIdx} className="flex items-center gap-[2px] mb-[2px]">
                <div className="text-[9px] text-[#5a5650] w-7 flex-shrink-0 text-right pr-1">
                  {heatmap.days[dayIdx]}
                </div>
                {row.map((val, hourIdx) => (
                  <div
                    key={hourIdx}
                    className="flex-1 h-[18px] rounded-[2px] min-w-[10px]"
                    style={{ background: getHeatmapColor(val) }}
                    title={`${heatmap.days[dayIdx]} ${heatmap.hours[hourIdx]}: ${val}% intensity`}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-end gap-2 mt-3">
            <span className="text-[9px] text-[#5a5650]">Low</span>
            {[0, 20, 40, 60, 80].map((v) => (
              <div
                key={v}
                className="w-4 h-3 rounded-[2px]"
                style={{ background: getHeatmapColor(v) }}
              />
            ))}
            <span className="text-[9px] text-[#5a5650]">High</span>
          </div>
        </div>
      </div>

      {/* ── Top Items + Recommendations ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {/* Top Item Demand */}
        <div className="bg-white dark:bg-[#111111] border border-neutral-200 dark:border-[rgba(255,255,255,0.07)] rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[14px]">🍽️</span>
            <span className="text-[14px] font-semibold text-neutral-800 dark:text-[#f0ece4]">Item Demand Forecast</span>
          </div>
          <p className="text-[11px] text-neutral-400 dark:text-[#5a5650] mb-4">Top items with predicted demand & trend vs. last 7 days</p>

          <div className="space-y-0">
            {topItems.slice(0, 5).map((item, idx) => {
              const isUp = item.trend > 5;
              const isDown = item.trend < -5;
              const maxRevenue = topItems[0]?.revenue || 1;

              return (
                <div
                  key={idx}
                  className="flex items-center gap-3 py-3 border-b border-[rgba(255,255,255,0.06)] last:border-0"
                >
                  <span className="w-5 h-5 rounded-full bg-[#1a1a1a] flex items-center justify-center text-[9px] font-bold text-[#5a5650] flex-shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[13px] text-[#f0ece4] font-medium truncate">{item.name}</span>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <span
                          className={`flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                            isUp
                              ? "bg-[rgba(34,197,94,0.15)] text-[#4ade80]"
                              : isDown
                              ? "bg-[rgba(239,68,68,0.15)] text-[#f87171]"
                              : "bg-[rgba(255,255,255,0.06)] text-[#9a9488]"
                          }`}
                        >
                          {isUp ? <ChevronUp className="w-3 h-3" /> : isDown ? <ChevronDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                          {Math.abs(item.trend)}%
                        </span>
                        <span className="text-[11px] text-[#5a5650]">~{item.predictedTomorrow} tmrw</span>
                      </div>
                    </div>
                    <div className="bg-[#1a1a1a] rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-gradient-to-r from-[#f97316] to-[#f59e0b] transition-all duration-700"
                        style={{ width: `${Math.max(4, (item.revenue / maxRevenue) * 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[9px] text-[#5a5650]">{item.total} sold</span>
                      <span className="text-[9px] text-[#5a5650]">{inr.format(item.revenue)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="bg-white dark:bg-[#111111] border border-neutral-200 dark:border-[rgba(255,255,255,0.07)] rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[14px]">✦</span>
            <span className="text-[14px] font-semibold text-neutral-800 dark:text-[#f0ece4]">AI Recommendations</span>
          </div>
          <p className="text-[11px] text-neutral-400 dark:text-[#5a5650] mb-4">Actionable insights from your data patterns</p>

          <div className="space-y-3">
            {recommendations.slice(0, 4).map((rec, idx) => {
              const colors = getImpactColor(rec.impact);
              return (
                <div
                  key={idx}
                  className="flex gap-3 p-3 rounded-xl border border-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.1)] transition-colors"
                  style={{ background: colors.bg }}
                >
                  <span className="text-[18px] flex-shrink-0 mt-0.5">{rec.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-[12px] font-semibold text-[#f0ece4] leading-snug">{rec.title}</p>
                      <span
                        className="text-[8px] font-bold tracking-widest px-1.5 py-0.5 rounded uppercase flex-shrink-0"
                        style={{ background: `${colors.dot}20`, color: colors.text }}
                      >
                        {rec.impact}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#9a9488] leading-relaxed">{rec.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── KPI Card ─────────────────────────────────────────────────────────────────

function ForecastKPICard({
  label,
  sublabel,
  value,
  icon,
  accentColor,
  delay,
}: {
  label: string;
  sublabel: string;
  value: string;
  icon: string;
  accentColor: string;
  delay: string;
}) {
  return (
    <div
      className="bg-white dark:bg-[#111111] border border-neutral-200 dark:border-[rgba(255,255,255,0.07)] rounded-xl p-[18px_20px] relative overflow-hidden hover:border-neutral-300 dark:hover:border-[rgba(255,255,255,0.13)] shadow-sm transition-all group"
      style={{ animationDelay: delay }}
    >
      {/* Glow background on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-xl"
        style={{ background: `radial-gradient(circle at 30% 50%, ${accentColor}12 0%, transparent 70%)` }}
      />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[20px]">{icon}</span>
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: accentColor, boxShadow: `0 0 6px ${accentColor}` }}
          />
        </div>
        <p className="text-[10px] tracking-wider uppercase text-neutral-400 dark:text-[#5a5650] mb-1.5">{label}</p>
        <p className="text-[24px] font-bold text-neutral-800 dark:text-[#f0ece4] tracking-tight leading-none mb-1.5">
          {value}
        </p>
        <p className="text-[11px] text-neutral-500 dark:text-[#5a5650]">{sublabel}</p>
      </div>
    </div>
  );
}
