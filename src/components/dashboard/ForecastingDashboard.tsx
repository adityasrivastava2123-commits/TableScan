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
  if (value < 20) return "rgba(240, 160, 64, 0.08)";
  if (value < 40) return "rgba(240, 160, 64, 0.2)";
  if (value < 60) return "rgba(240, 160, 64, 0.38)";
  if (value < 80) return "rgba(240, 160, 64, 0.58)";
  return "rgba(240, 160, 64, 0.85)";
}

function getImpactColor(impact: string) {
  if (impact === "high") return { bg: "rgba(239,68,68,0.1)", text: "#f87171", dot: "#ef4444" };
  if (impact === "medium") return { bg: "rgba(240,160,64,0.1)", text: "#f0a040", dot: "#f0a040" };
  return { bg: "rgba(59,130,246,0.1)", text: "#60a5fa", dot: "#3b82f6" };
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0b0a08] border border-[rgba(240,160,64,0.3)] rounded-lg p-3.5 shadow-xl text-[12px] font-mono-dashboard">
      <p className="text-[#f5efe2]/40 mb-2 font-medium uppercase tracking-widest">{label}</p>
      {payload.map((entry: any, i: number) => (
        entry.value !== null && entry.value !== undefined && (
          <div key={i} className="flex items-center justify-between gap-6 mb-1 text-xs">
            <span className="text-[#f5efe2]/60">{entry.name === "actual" ? "Actual" : entry.name === "forecast" ? "Forecast" : entry.name}:</span>
            <span className="text-[#f5efe2] font-black">
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
      <div className="space-y-6 pt-2">
        <div className="h-8 animate-pulse bg-neutral-900 rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse bg-neutral-950 rounded-xl border border-neutral-800" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertTriangle className="w-12 h-12 text-[#f0a040] mb-4" />
        <h2 className="text-xl font-bold text-[#f5efe2] mb-2">Failed to Load Forecast</h2>
        <p className="text-[#f5efe2]/40 mb-6 text-sm">There was an error computing your forecast data.</p>
        <button
          onClick={fetchForecast}
          className="px-6 py-3 bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-[#0b0a08] rounded-lg text-xs font-black tracking-wider hover:brightness-110 transition-all flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          TRY AGAIN
        </button>
      </div>
    );
  }

  if (!data) return null;

  if (!data.hasEnoughData) {
    return (
      <div className="space-y-8 relative">
        <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-[#f0a040] to-transparent absolute top-0 left-0 opacity-40 pointer-events-none" />
        
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-2">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="text-[9px] font-black uppercase tracking-[0.25em] text-[#f0a040] bg-[#f0a040]/10 border border-[#f0a040]/20 px-3 py-1 rounded-full">
                AI FORECASTING
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#f5efe2]">
              Operational Intelligence
            </h2>
          </div>
        </section>

        <div className="bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] rounded-xl p-12 text-center shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#f0a040]/10 to-[#e85a2a]/10 border border-[#f0a040]/20 flex items-center justify-center mx-auto mb-5">
            <Brain className="w-8 h-8 text-[#f0a040]" />
          </div>
          <h2 className="text-xl font-bold text-[#f5efe2] mb-3">Insufficient Order History</h2>
          <p className="text-[#f5efe2]/60 text-sm max-w-md mx-auto leading-relaxed mb-2 font-serif italic">
            Predictive modeling requires at least 5 orders to identify food patterns. Currently analyzed: <span className="text-[#f0a040] font-bold">{data.totalOrdersAnalyzed} order{data.totalOrdersAnalyzed !== 1 ? "s" : ""}</span>.
          </p>
          <p className="text-[#f5efe2]/30 text-xs font-mono-dashboard">As order volumes scale, forecasting algorithms will automatically kick in.</p>
        </div>
      </div>
    );
  }

  const { kpis, chartData, heatmap, topItems, recommendations } = data;
  const todayLabel = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div className="space-y-8 relative">
      {/* Thin Saffron Accenting Border at top */}
      <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-[#f0a040] to-transparent absolute top-0 left-0 opacity-40 pointer-events-none" />

      {/* EDITORIAL HERO HEADER */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-2">
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="text-[9px] font-black uppercase tracking-[0.25em] text-[#f0a040] bg-[#f0a040]/10 border border-[#f0a040]/20 px-3 py-1 rounded-full">
              PREDICTIVE ENGINE
            </span>
            <span className="text-[10px] text-[#f5efe2]/40 font-mono-dashboard">
              {new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" }).toUpperCase()}
            </span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#f5efe2] leading-none">
            AI Forecasting Dashboard at <em className="font-editorial italic font-normal text-[#f0a040]">{restaurant.name}</em>
          </h2>
          
          <p className="text-xs sm:text-sm text-[#f5efe2]/60 font-serif italic tracking-wide max-w-xl">
            Forecast next-day revenue volume, identify traffic peaks, and optimize food inventories.
          </p>
        </div>

        {/* Actions panel */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={fetchForecast}
            className="px-4.5 py-3 border border-[rgba(255,255,255,0.08)] bg-white/[0.02] hover:bg-white/[0.04] rounded-lg text-xs font-semibold tracking-wider text-[#f5efe2] transition-all flex items-center gap-2 hover:border-[#f0a040]"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>REFRESH ENGINE</span>
          </button>
        </div>
      </section>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ForecastKPICard
          label="PREDICTED REVENUE"
          sublabel="Tomorrow"
          value={inr.format(kpis.predictedRevenue)}
          accentColor="#52d27a"
        />
        <ForecastKPICard
          label="PREDICTED COVERS"
          sublabel="Tomorrow"
          value={kpis.predictedOrders.toString()}
          accentColor="#60a5fa"
        />
        <ForecastKPICard
          label="BUSIEST HOUR"
          sublabel="Peak traffic slot"
          value={kpis.busiestHour}
          accentColor="#f0a040"
        />
        <ForecastKPICard
          label="LOW-STOCK RISK"
          sublabel={kpis.lowStockRiskCount > 0 ? kpis.lowStockRiskItems[0] : "All items stable"}
          value={`${kpis.lowStockRiskCount} item${kpis.lowStockRiskCount !== 1 ? "s" : ""}`}
          accentColor={kpis.lowStockRiskCount > 0 ? "#ef4444" : "#52d27a"}
        />
      </div>

      {/* Demand Forecast Chart & Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.65fr_1fr] gap-6 items-stretch">
        
        {/* Forecast Line Plot */}
        <div className="bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] rounded-xl p-6 flex flex-col justify-between shadow-xl min-h-[350px] relative overflow-hidden">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-[rgba(255,255,255,0.05)] pb-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold tracking-[0.2em] text-[#f0a040] uppercase">REVENUE FORECAST</span>
                <h4 className="text-base font-bold text-[#f5efe2]">14 Days Actual + 3 Day AI Projection</h4>
              </div>
              <div className="flex items-center gap-4 text-[10px] font-mono-dashboard uppercase">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-4 h-1.5 bg-[#f0a040]" />
                  <span className="text-[#f5efe2]/40">Actual</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-4 h-0.5 border-t-2 border-dashed border-[#f0a040]" />
                  <span className="text-[#f5efe2]/40">Forecast</span>
                </span>
              </div>
            </div>

            <div className="flex-1 w-full min-h-[220px] mt-4">
              <ResponsiveContainer width="100%" height={210}>
                <ComposedChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="fg-actual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f0a040" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#e85a2a" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="fg-forecast" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f0a040" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#e85a2a" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis
                    dataKey="date"
                    stroke="rgba(245, 239, 226, 0.3)"
                    fontSize={9}
                    tickLine={false}
                    interval={2}
                    fontFamily="JetBrains Mono"
                  />
                  <YAxis
                    stroke="rgba(245, 239, 226, 0.3)"
                    fontSize={9}
                    tickLine={false}
                    axisLine={false}
                    fontFamily="JetBrains Mono"
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine x={todayLabel} stroke="rgba(240, 160, 64, 0.4)" strokeDasharray="4 2" label={{ value: "Today", fontSize: 8, fill: "#f0a040", position: "insideTop", fontFamily: "JetBrains Mono" }} />
                  <Area
                    type="monotone"
                    dataKey="actual"
                    stroke="#f0a040"
                    strokeWidth={2}
                    fill="url(#fg-actual)"
                    connectNulls={false}
                    dot={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="forecastHigh"
                    stroke="transparent"
                    fill="url(#fg-forecast)"
                    connectNulls={false}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="forecast"
                    stroke="#f0a040"
                    strokeWidth={2}
                    strokeDasharray="6 3"
                    dot={{ r: 3, fill: "#f0a040", strokeWidth: 0 }}
                    connectNulls={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Heatmap Card */}
        <div className="bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] rounded-xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1 border-b border-[rgba(255,255,255,0.05)] pb-4">
              <span className="text-[10px] font-bold tracking-[0.2em] text-[#e85a2a] uppercase">PEAK HOURS MAP</span>
            </div>
            <p className="text-[11px] text-[#f5efe2]/40 font-serif italic mb-4">Order density matrix by day & hour</p>

            <div className="overflow-x-auto custom-scrollbar">
              <div className="min-w-[500px]">
                {/* Hour labels */}
                <div className="flex gap-[2px] mb-1 pl-8">
                  {heatmap.hours.map((h, i) => (
                    <div
                      key={i}
                      className="text-[7px] text-[#f5efe2]/30 text-center flex-1 min-w-[10px] font-mono-dashboard"
                      style={{ display: [0, 6, 12, 18].includes(i) ? "block" : "none" }}
                    >
                      {h}
                    </div>
                  ))}
                </div>
                {heatmap.data.map((row, dayIdx) => (
                  <div key={dayIdx} className="flex items-center gap-[2px] mb-[2px]">
                    <div className="text-[9px] text-[#f5efe2]/40 w-7 flex-shrink-0 text-right pr-1.5 font-mono-dashboard uppercase">
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
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-end gap-2 mt-4 text-[9px] font-mono-dashboard uppercase text-[#f5efe2]/40">
            <span>Low</span>
            {[0, 20, 40, 60, 80].map((v) => (
              <div
                key={v}
                className="w-4 h-3 rounded-[2px]"
                style={{ background: getHeatmapColor(v) }}
              />
            ))}
            <span>High</span>
          </div>
        </div>
      </div>

      {/* Top Selling Items & AI Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Item Demand Forecast */}
        <div className="bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] rounded-xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-[rgba(255,255,255,0.05)] pb-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold tracking-[0.2em] text-[#f0a040] uppercase">ITEM DEMAND FORECAST</span>
                <h4 className="text-base font-bold text-[#f5efe2]">Dish Performance Metrics</h4>
              </div>
            </div>

            <div className="space-y-1">
              {topItems.slice(0, 5).map((item, idx) => {
                const isUp = item.trend > 5;
                const isDown = item.trend < -5;
                const maxRevenue = topItems[0]?.revenue || 1;

                return (
                  <div
                    key={idx}
                    className="flex items-center gap-3.5 py-3.5 border-b border-[rgba(255,255,255,0.05)] last:border-0"
                  >
                    <span className="w-6 h-6 rounded-lg bg-[rgba(240,160,64,0.1)] border border-[rgba(240,160,64,0.15)] flex items-center justify-center text-[10px] font-extrabold text-[#f0a040] flex-shrink-0">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-[#f5efe2] truncate">{item.name}</span>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2 font-mono-dashboard">
                          <span
                            className={`flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                              isUp
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : isDown
                                ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                : "bg-white/5 text-[#f5efe2]/40 border border-white/10"
                            }`}
                          >
                            {isUp ? <ChevronUp className="w-2.5 h-2.5" /> : isDown ? <ChevronDown className="w-2.5 h-2.5" /> : null}
                            {Math.abs(item.trend)}%
                          </span>
                          <span className="text-[10px] text-[#f5efe2]/40">~{item.predictedTomorrow} tmrw</span>
                        </div>
                      </div>
                      <div className="bg-white/5 rounded-full h-1">
                        <div
                          className="h-1 rounded-full bg-gradient-to-r from-[#f0a040] to-[#e85a2a] transition-all duration-700"
                          style={{ width: `${Math.max(4, (item.revenue / maxRevenue) * 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-1 text-[9px] font-mono-dashboard text-[#f5efe2]/40">
                        <span>{item.total} sold today</span>
                        <span>{inr.format(item.revenue)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] rounded-xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-[rgba(255,255,255,0.05)] pb-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold tracking-[0.2em] text-[#e85a2a] uppercase">AI INSIGHTS</span>
                <h4 className="text-base font-bold text-[#f5efe2]">Optimization Advisory</h4>
              </div>
            </div>

            <div className="space-y-3.5">
              {recommendations.slice(0, 4).map((rec, idx) => {
                const colors = getImpactColor(rec.impact);
                return (
                  <div
                    key={idx}
                    className="flex gap-3.5 p-4 rounded-xl border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] transition-colors"
                    style={{ background: colors.bg }}
                  >
                    <span className="text-[18px] flex-shrink-0 mt-0.5">{rec.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[#f5efe2] leading-snug">{rec.title}</p>
                        <span
                          className="text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded-full uppercase flex-shrink-0 font-mono-dashboard"
                          style={{ background: `${colors.dot}20`, color: colors.text }}
                        >
                          {rec.impact} impact
                        </span>
                      </div>
                      <p className="text-[11px] text-[#f5efe2]/60 leading-relaxed font-serif italic">{rec.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function ForecastKPICard({
  label,
  sublabel,
  value,
  accentColor,
}: {
  label: string;
  sublabel: string;
  value: string;
  accentColor: string;
}) {
  return (
    <div className="bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] rounded-xl p-5 relative overflow-hidden group shadow-xl">
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-xl"
        style={{ background: `radial-gradient(circle at 30% 50%, ${accentColor}08 0%, transparent 70%)` }}
      />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3.5 border-b border-[rgba(255,255,255,0.05)] pb-3">
          <span className="text-[10px] font-bold tracking-[0.2em] text-[#f5efe2]/40 uppercase">{label}</span>
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: accentColor, boxShadow: `0 0 6px ${accentColor}` }}
          />
        </div>
        <p className="text-2xl md:text-3xl font-extrabold text-[#f5efe2] tracking-tight leading-none mb-1.5 font-mono-dashboard">
          {value}
        </p>
        <p className="text-[10px] text-[#f5efe2]/40 font-serif italic">{sublabel}</p>
      </div>
    </div>
  );
}
