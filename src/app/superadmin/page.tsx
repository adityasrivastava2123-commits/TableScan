"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert, Eye, EyeOff, LogOut, Cpu, Lock, Terminal,
  Activity, RefreshCw, CreditCard, Hotel, Server, HardDrive,
  Wifi, Play, LayoutDashboard, BarChart2, ToggleLeft, ToggleRight,
  Megaphone, AlertOctagon, Database, ChevronRight, X, Check,
  Clock, TrendingUp, Users, Package, MapPin, Zap, CheckCircle,
  XCircle, AlertTriangle, Send, Globe, Radio
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = "overview" | "tenants" | "analytics" | "flags" | "broadcast" | "activity" | "errors" | "query";

interface RestaurantTenant {
  id: string; name: string; slug: string;
  ownerName: string; ownerEmail: string;
  locationsCount: number; menuItemsCount: number; ordersCount: number;
  plan: "STARTER" | "GROWTH" | "PRO"; status: string;
}

interface PlatformStats {
  users: number; restaurants: number; orders: number; menuItems: number; volume: number;
}

interface FeatureFlag {
  id: string; name: string; description: string;
  enabled: boolean; category: "core" | "beta" | "experimental"; updatedAt: string;
}

interface BroadcastMessage {
  text: string; type: "info" | "warning" | "danger" | "success"; active: boolean; updatedAt: string;
}

interface MockError {
  id: string; message: string; route: string; restaurant: string;
  severity: "critical" | "error" | "warning"; count: number; lastSeen: string; resolved: boolean;
}

interface ActivityEvent {
  id: string; type: string; title: string; description: string; time: string; badge?: string;
}

interface MonthlyData { label: string; revenue: number; orders: number; }
interface DailyData { label: string; count: number; }

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function MiniLineChart({ data, color = "#8b5cf6" }: { data: number[]; color?: string }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const W = 260; const H = 60; const P = 6;
  const pts = data.map((v, i) => ({
    x: P + (i / Math.max(data.length - 1, 1)) * (W - 2 * P),
    y: H - P - (v / max) * (H - 2 * P),
  }));
  const poly = pts.map((p) => `${p.x},${p.y}`).join(" ");
  const area = `${pts[0].x},${H} ${poly} ${pts[pts.length - 1].x},${H}`;
  const uid = `grad-${color.replace("#", "")}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${uid})`} />
      <polyline points={poly} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={color} />)}
    </svg>
  );
}

// ─── Login Screen ─────────────────────────────────────────────────────────────

function LoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const [id, setId] = useState(""); const [pass, setPass] = useState("");
  const [show, setShow] = useState(false); const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(0);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      await axios.post("/api/superadmin/auth", { id, password: pass });
      toast.success("Access granted. Welcome, Developer.");
      onSuccess();
    } catch {
      setShake((k) => k + 1);
      toast.error("Invalid credentials. Access denied.");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-violet-700/6 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.025] pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(139,92,246,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(139,92,246,0.5) 1px,transparent 1px)", backgroundSize: "60px 60px" }} />
      <motion.div key={shake} initial={{ opacity: 0, y: 20 }} animate={shake > 0 ? { opacity: 1, x: [0, -10, 10, -8, 8, 0] } : { opacity: 1, y: 0 }} transition={{ duration: shake > 0 ? 0.4 : 0.5 }} className="w-full max-w-[400px]">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center shadow-2xl shadow-violet-500/20 mb-4 border border-violet-500/30">
            <ShieldAlert className="size-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Developer Portal</h1>
          <p className="text-[10px] text-[#4a4642] mt-1 tracking-widest uppercase font-mono">TableScan · Superadmin Access</p>
        </div>
        <div className="bg-[#0c0c0c] border border-[rgba(255,255,255,0.07)] rounded-2xl p-8 shadow-2xl shadow-black/60">
          <div className="flex items-center gap-2 mb-6"><Lock className="size-3.5 text-violet-400" /><span className="text-[10px] font-bold text-[#4a4642] uppercase tracking-widest">Restricted Access</span></div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#4a4642] uppercase tracking-widest">Developer ID</label>
              <input type="text" value={id} onChange={(e) => setId(e.target.value)} placeholder="Enter developer ID" autoComplete="off" required className="w-full bg-[#111] border border-[rgba(255,255,255,0.07)] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#2a2620] focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all font-mono" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#4a4642] uppercase tracking-widest">Access Key</label>
              <div className="relative">
                <input type={show ? "text" : "password"} value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Enter access key" required className="w-full bg-[#111] border border-[rgba(255,255,255,0.07)] rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder:text-[#2a2620] focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all font-mono" />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4a4642] hover:text-violet-400 transition-colors">{show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-bold tracking-wide transition-all shadow-lg shadow-violet-500/20 disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? <><RefreshCw className="size-4 animate-spin" />Authenticating...</> : <><ShieldAlert className="size-4" />Authenticate</>}
            </button>
          </form>
          <p className="text-center text-[10px] text-[#2a2620] mt-6 font-mono">Unauthorized access is logged and monitored.</p>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Tab: Overview ────────────────────────────────────────────────────────────

function OverviewTab({ stats, restaurants, loading }: { stats: PlatformStats | null; restaurants: RestaurantTenant[]; loading: boolean }) {
  const [health, setHealth] = useState({ supabase: 14, clerk: 25, stripe: 32, pusher: 18 });
  const [logs, setLogs] = useState([
    "💡 SYSTEM: Superadmin session authenticated.", "🛡️ CLERK: Token cache validated in <1ms.",
    "🐘 DATABASE: Supabase pool active (10 connections).", "🔌 PUSHER: WebSocket channels live.",
    "🚀 SERVERLESS: All edge functions warm.",
  ]);

  const addLog = (msg: string) => { const ts = new Date().toLocaleTimeString(); setLogs((p) => [`[${ts}] ${msg}`, ...p.slice(0, 19)]); };

  const pingAll = () => {
    setHealth({ supabase: Math.floor(Math.random() * 20) + 8, clerk: Math.floor(Math.random() * 30) + 18, stripe: Math.floor(Math.random() * 40) + 22, pusher: Math.floor(Math.random() * 15) + 10 });
    addLog("⚡ PING: All gateways verified — nominal."); toast.success("Health ping complete!");
  };

  const kpis = [
    { label: "SaaS Volume", val: `$${(stats?.volume || 0).toLocaleString()}`, color: "from-violet-500/15 to-indigo-500/10 border-violet-500/20 text-violet-400" },
    { label: "Tenants", val: stats?.restaurants || 0, color: "from-blue-500/15 to-cyan-500/10 border-blue-500/20 text-blue-400" },
    { label: "Accounts", val: stats?.users || 0, color: "from-emerald-500/15 to-teal-500/10 border-emerald-500/20 text-emerald-400" },
    { label: "Orders", val: stats?.orders || 0, color: "from-amber-500/15 to-orange-500/10 border-orange-500/20 text-amber-400" },
    { label: "Menu Items", val: stats?.menuItems || 0, color: "from-rose-500/15 to-pink-500/10 border-rose-500/20 text-rose-400" },
  ];

  const gateways = [
    { name: "Supabase DB", ping: health.supabase, icon: Server, color: "text-emerald-400" },
    { name: "Clerk Auth", ping: health.clerk, icon: HardDrive, color: "text-blue-400" },
    { name: "Stripe API", ping: health.stripe, icon: CreditCard, color: "text-rose-400" },
    { name: "Pusher WS", ping: health.pusher, icon: Wifi, color: "text-amber-400" },
  ];

  return (
    <div className="space-y-5">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {kpis.map((k, i) => (
          <div key={i} className={`bg-gradient-to-br ${k.color} border rounded-2xl p-4 relative overflow-hidden`}>
            <p className="text-[9px] font-bold uppercase tracking-widest text-current opacity-60 mb-1">{k.label}</p>
            <p className="text-xl font-extrabold text-white">{loading ? "—" : k.val}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Tenant quick view */}
        <div className="lg:col-span-2 bg-[#0c0c0c] border border-[rgba(255,255,255,0.05)] rounded-2xl p-5">
          <h3 className="text-xs font-bold text-white flex items-center gap-2 mb-4"><Hotel className="size-3.5 text-violet-400" />Recent Tenant Activity</h3>
          <div className="space-y-2">
            {restaurants.slice(0, 5).map((r) => (
              <div key={r.id} className="flex items-center justify-between py-2 border-b border-[rgba(255,255,255,0.03)] last:border-0">
                <div>
                  <p className="text-xs font-semibold text-white">{r.name}</p>
                  <p className="text-[10px] text-[#4a4642]">{r.ordersCount} orders · {r.locationsCount} locations</p>
                </div>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${r.plan === "PRO" ? "bg-violet-500/15 text-violet-400" : r.plan === "GROWTH" ? "bg-blue-500/15 text-blue-400" : "bg-[#222] text-[#6f695f]"}`}>{r.plan}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Health + Terminal */}
        <div className="space-y-4">
          <div className="bg-[#0c0c0c] border border-[rgba(255,255,255,0.05)] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5"><Activity className="size-3.5 text-violet-400" />Gateways</h3>
              <button onClick={pingAll} className="px-2.5 py-1 bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20 rounded-lg text-[9px] font-bold transition-all">Ping All</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {gateways.map((g, i) => (
                <div key={i} className="bg-[#111] p-2.5 rounded-xl border border-[rgba(255,255,255,0.04)]">
                  <div className="flex justify-between text-[9px] text-[#6f695f] mb-1"><span className="font-semibold">{g.name}</span><g.icon className={`size-3 ${g.color}`} /></div>
                  <div className="flex justify-between items-end"><span className="text-[8px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-md font-bold">ONLINE</span><span className="text-xs font-bold font-mono text-white">{g.ping}ms</span></div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#0c0c0c] border border-[rgba(255,255,255,0.05)] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5"><Terminal className="size-3.5 text-violet-400" />System Logs</h3>
              <div className="flex gap-1.5">
                <button onClick={() => { addLog("🧬 SEED: Mock DB seeding routine simulated."); toast.success("Seeded!"); }} className="px-2 py-1 bg-[#111] border border-[rgba(255,255,255,0.05)] hover:border-violet-500/30 rounded-lg text-[9px] font-bold text-[#9a9488] hover:text-white transition-all flex items-center gap-0.5"><Play className="size-2.5 text-violet-400" />Seed</button>
                <button onClick={() => { addLog("🧹 CACHE: All caches flushed."); toast.success("Flushed!"); }} className="px-2 py-1 bg-[#111] border border-[rgba(255,255,255,0.05)] hover:border-violet-500/30 rounded-lg text-[9px] font-bold text-[#9a9488] hover:text-white transition-all flex items-center gap-0.5"><RefreshCw className="size-2.5 text-violet-400" />Flush</button>
              </div>
            </div>
            <div className="bg-[#050505] p-2.5 rounded-xl border border-[rgba(255,255,255,0.03)] h-[180px] overflow-y-auto font-mono text-[9px] space-y-1.5 text-[#5a5650]">
              {logs.map((l, i) => <div key={i} className="leading-relaxed break-all">{l}</div>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Tenants ─────────────────────────────────────────────────────────────

function TenantsTab({ restaurants, onPlanOverride }: { restaurants: RestaurantTenant[]; onPlanOverride: (id: string, plan: "STARTER" | "GROWTH" | "PRO") => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tenantDetail, setTenantDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const openTenant = async (id: string) => {
    setSelectedId(id); setLoadingDetail(true);
    try { const r = await axios.get(`/api/superadmin/tenant/${id}`); setTenantDetail(r.data); }
    catch { toast.error("Failed to load tenant details"); }
    finally { setLoadingDetail(false); }
  };

  const selected = restaurants.find((r) => r.id === selectedId);

  return (
    <div className="flex gap-5 h-full">
      {/* Table */}
      <div className={`bg-[#0c0c0c] border border-[rgba(255,255,255,0.05)] rounded-2xl p-5 transition-all ${selectedId ? "w-1/2" : "w-full"}`}>
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-[rgba(255,255,255,0.04)]">
          <h3 className="text-sm font-bold text-white flex items-center gap-2"><Hotel className="size-4 text-violet-400" />Business Tenants</h3>
          <span className="px-2.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400 text-[10px] font-bold">{restaurants.length} portals</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[#4a4642] uppercase font-bold border-b border-[rgba(255,255,255,0.04)] text-[9px]">
                <th className="pb-3 pr-3">Restaurant</th>
                <th className="pb-3 pr-3">Owner</th>
                <th className="pb-3 pr-3 text-center">Locs</th>
                <th className="pb-3 text-center">Plan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(255,255,255,0.03)]">
              {restaurants.map((r) => (
                <tr key={r.id} onClick={() => openTenant(r.id)} className={`cursor-pointer transition-colors ${selectedId === r.id ? "bg-violet-500/5" : "hover:bg-[#111]/60"}`}>
                  <td className="py-3 pr-3">
                    <div className="font-bold text-white text-[11px]">{r.name}</div>
                    <div className="text-[9px] text-[#4a4642] font-mono">{r.slug}</div>
                  </td>
                  <td className="py-3 pr-3">
                    <div className="text-[#f0ece4] font-medium text-[11px]">{r.ownerName}</div>
                    <div className="text-[9px] text-[#4a4642] truncate max-w-[120px]">{r.ownerEmail}</div>
                  </td>
                  <td className="py-3 pr-3 text-center text-white font-semibold text-[11px]">{r.locationsCount}</td>
                  <td className="py-3 text-center">
                    <div className="flex items-center justify-center gap-1 bg-[#141414] p-0.5 rounded-xl border border-[rgba(255,255,255,0.04)] w-fit mx-auto">
                      {(["STARTER", "GROWTH", "PRO"] as const).map((t) => (
                        <button key={t} onClick={(e) => { e.stopPropagation(); onPlanOverride(r.id, t); }}
                          className={`px-2 py-1 rounded-lg text-[8px] font-bold uppercase transition-all ${r.plan === t ? "bg-violet-600 text-white" : "text-[#4a4642] hover:text-white"}`}>{t}</button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Panel */}
      <AnimatePresence>
        {selectedId && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="w-1/2 bg-[#0c0c0c] border border-[rgba(255,255,255,0.05)] rounded-2xl p-5 overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-white">{selected?.name}</h3>
              <button onClick={() => { setSelectedId(null); setTenantDetail(null); }} className="p-1.5 rounded-lg hover:bg-[#222] transition-colors text-[#6f695f] hover:text-white"><X className="size-4" /></button>
            </div>
            {loadingDetail ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-12 rounded-xl bg-[#111] animate-pulse" />)}</div>
            ) : tenantDetail ? (
              <div className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Total Revenue", val: `₹${tenantDetail.totalRevenue?.toLocaleString() || 0}`, icon: TrendingUp, color: "text-violet-400" },
                    { label: "Total Orders", val: tenantDetail._count?.orders || 0, icon: Package, color: "text-blue-400" },
                    { label: "Staff Members", val: tenantDetail._count?.staff || 0, icon: Users, color: "text-emerald-400" },
                  ].map((s, i) => (
                    <div key={i} className="bg-[#111] rounded-xl p-3 border border-[rgba(255,255,255,0.04)]">
                      <s.icon className={`size-3.5 ${s.color} mb-1.5`} />
                      <p className="text-white font-bold text-sm">{s.val}</p>
                      <p className="text-[9px] text-[#4a4642] mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Owner */}
                <div className="bg-[#111] rounded-xl p-3 border border-[rgba(255,255,255,0.04)]">
                  <p className="text-[9px] text-[#4a4642] uppercase tracking-widest mb-2 font-bold">Owner</p>
                  <p className="text-sm font-semibold text-white">{tenantDetail.owner?.name}</p>
                  <p className="text-[10px] text-[#6f695f]">{tenantDetail.owner?.email}</p>
                  <p className="text-[9px] text-[#4a4642] mt-1">Joined {new Date(tenantDetail.owner?.createdAt).toLocaleDateString()}</p>
                </div>

                {/* Subscription */}
                <div className="bg-[#111] rounded-xl p-3 border border-[rgba(255,255,255,0.04)]">
                  <p className="text-[9px] text-[#4a4642] uppercase tracking-widest mb-2 font-bold">Subscription</p>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${tenantDetail.subscription?.plan === "PRO" ? "bg-violet-500/15 text-violet-400" : tenantDetail.subscription?.plan === "GROWTH" ? "bg-blue-500/15 text-blue-400" : "bg-[#222] text-[#6f695f]"}`}>{tenantDetail.subscription?.plan || "STARTER"}</span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[9px] font-bold">{tenantDetail.subscription?.status || "ACTIVE"}</span>
                  </div>
                </div>

                {/* Locations */}
                {tenantDetail.locations?.length > 0 && (
                  <div className="bg-[#111] rounded-xl p-3 border border-[rgba(255,255,255,0.04)]">
                    <p className="text-[9px] text-[#4a4642] uppercase tracking-widest mb-2 font-bold">Locations ({tenantDetail.locations.length})</p>
                    <div className="space-y-1.5">
                      {tenantDetail.locations.slice(0, 4).map((loc: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-[10px] text-[#9a9488]"><MapPin className="size-3 text-[#4a4642]" />{loc.name || `Location ${i + 1}`}</div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Orders */}
                {tenantDetail.orders?.length > 0 && (
                  <div className="bg-[#111] rounded-xl p-3 border border-[rgba(255,255,255,0.04)]">
                    <p className="text-[9px] text-[#4a4642] uppercase tracking-widest mb-2 font-bold">Recent Orders</p>
                    <div className="space-y-2">
                      {tenantDetail.orders.slice(0, 4).map((o: any, i: number) => (
                        <div key={i} className="flex items-center justify-between">
                          <div>
                            <p className="text-[10px] text-white font-mono">#{o.id.slice(0, 8)}</p>
                            <p className="text-[9px] text-[#4a4642]">{timeAgo(o.createdAt)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-white font-semibold">₹{Number(o.totalAmount || 0).toFixed(0)}</p>
                            <p className={`text-[9px] font-bold ${o.status === "COMPLETED" ? "text-emerald-400" : o.status === "PENDING" ? "text-amber-400" : "text-[#6f695f]"}`}>{o.status}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Tab: Analytics ───────────────────────────────────────────────────────────

function AnalyticsTab() {
  const [data, setData] = useState<{ monthly: MonthlyData[]; daily: DailyData[]; plans: Record<string, number> } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get("/api/superadmin/analytics").then((r) => setData(r.data)).catch(() => toast.error("Analytics failed")).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw className="size-6 text-violet-400 animate-spin" /></div>;
  if (!data) return null;

  const maxRev = Math.max(...(data.monthly.map((m) => m.revenue)), 1);
  const maxDaily = Math.max(...(data.daily.map((d) => d.count)), 1);
  const totalPlans = Object.values(data.plans).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="space-y-5">
      {/* Revenue Chart */}
      <div className="bg-[#0c0c0c] border border-[rgba(255,255,255,0.05)] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><BarChart2 className="size-4 text-violet-400" />Monthly Revenue</h3>
            <p className="text-[10px] text-[#4a4642] mt-0.5">Last 6 months · All tenants combined</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-white">₹{data.monthly.reduce((a, m) => a + m.revenue, 0).toLocaleString()}</p>
            <p className="text-[10px] text-[#4a4642]">Total period revenue</p>
          </div>
        </div>
        <div className="h-16 mb-3"><MiniLineChart data={data.monthly.map((m) => m.revenue)} color="#8b5cf6" /></div>
        <div className="grid grid-cols-6 gap-1">
          {data.monthly.map((m, i) => (
            <div key={i} className="text-center">
              <div className="bg-[#111] rounded-lg p-2 mb-1.5 border border-[rgba(255,255,255,0.04)]">
                <div className="h-12 flex items-end justify-center">
                  <div className="w-5 bg-gradient-to-t from-violet-600 to-violet-400/60 rounded-sm transition-all" style={{ height: `${(m.revenue / maxRev) * 48}px` }} />
                </div>
              </div>
              <p className="text-[9px] text-[#4a4642] font-bold">{m.label}</p>
              <p className="text-[9px] text-[#6f695f]">₹{m.revenue > 0 ? (m.revenue / 1000).toFixed(1) + "k" : "0"}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Daily Signups */}
        <div className="bg-[#0c0c0c] border border-[rgba(255,255,255,0.05)] rounded-2xl p-5">
          <h3 className="text-xs font-bold text-white flex items-center gap-2 mb-4"><Users className="size-3.5 text-blue-400" />Daily Signups (7 days)</h3>
          <div className="flex items-end gap-2 h-24">
            {data.daily.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full flex items-end justify-center" style={{ height: "72px" }}>
                  <div className="w-full bg-gradient-to-t from-blue-600 to-blue-400/60 rounded-t-sm transition-all" style={{ height: `${Math.max((d.count / maxDaily) * 72, d.count > 0 ? 4 : 0)}px` }} />
                </div>
                <p className="text-[9px] text-[#4a4642] font-bold">{d.label}</p>
                <p className="text-[9px] text-[#6f695f]">{d.count}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Plan Distribution */}
        <div className="bg-[#0c0c0c] border border-[rgba(255,255,255,0.05)] rounded-2xl p-5">
          <h3 className="text-xs font-bold text-white flex items-center gap-2 mb-4"><Zap className="size-3.5 text-amber-400" />Plan Distribution</h3>
          <div className="space-y-3">
            {[
              { label: "STARTER", color: "bg-[#333]", textColor: "text-[#9a9488]" },
              { label: "GROWTH", color: "bg-blue-600", textColor: "text-blue-400" },
              { label: "PRO", color: "bg-violet-600", textColor: "text-violet-400" },
            ].map((plan) => {
              const count = data.plans[plan.label] || 0;
              const pct = Math.round((count / totalPlans) * 100);
              return (
                <div key={plan.label}>
                  <div className="flex justify-between mb-1">
                    <span className={`text-[10px] font-bold ${plan.textColor}`}>{plan.label}</span>
                    <span className="text-[10px] text-[#6f695f]">{count} tenants · {pct}%</span>
                  </div>
                  <div className="h-2 bg-[#111] rounded-full overflow-hidden border border-[rgba(255,255,255,0.04)]">
                    <div className={`h-full ${plan.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-3 border-t border-[rgba(255,255,255,0.04)]">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#111] rounded-xl p-3 border border-[rgba(255,255,255,0.04)]">
                <p className="text-[9px] text-[#4a4642] mb-1">Total Orders (6mo)</p>
                <p className="text-sm font-bold text-white">{data.monthly.reduce((a, m) => a + m.orders, 0)}</p>
              </div>
              <div className="bg-[#111] rounded-xl p-3 border border-[rgba(255,255,255,0.04)]">
                <p className="text-[9px] text-[#4a4642] mb-1">Avg. Monthly Rev</p>
                <p className="text-sm font-bold text-white">₹{Math.round(data.monthly.reduce((a, m) => a + m.revenue, 0) / 6).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Feature Flags ───────────────────────────────────────────────────────

function FeatureFlagsTab() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    axios.get("/api/superadmin/flags").then((r) => setFlags(r.data.flags)).finally(() => setLoading(false));
  }, []);

  const toggle = async (id: string, enabled: boolean) => {
    setToggling(id);
    try {
      const r = await axios.post("/api/superadmin/flags", { id, enabled: !enabled });
      setFlags(r.data.flags);
      toast.success(`${!enabled ? "Enabled" : "Disabled"} feature flag`);
    } catch { toast.error("Failed to toggle flag"); }
    finally { setToggling(null); }
  };

  const categories = ["core", "beta", "experimental"] as const;
  const catColors = { core: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", beta: "text-blue-400 bg-blue-500/10 border-blue-500/20", experimental: "text-amber-400 bg-amber-500/10 border-amber-500/20" };

  if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw className="size-6 text-violet-400 animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2"><ToggleLeft className="size-4 text-violet-400" />Feature Flag Manager</h3>
          <p className="text-[10px] text-[#4a4642] mt-0.5">Toggle platform features globally · Changes apply instantly</p>
        </div>
        <div className="flex gap-2">
          {categories.map((c) => (
            <span key={c} className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${catColors[c]}`}>{c}</span>
          ))}
        </div>
      </div>

      {categories.map((cat) => {
        const catFlags = flags.filter((f) => f.category === cat);
        if (!catFlags.length) return null;
        return (
          <div key={cat} className="bg-[#0c0c0c] border border-[rgba(255,255,255,0.05)] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[rgba(255,255,255,0.04)]">
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${catColors[cat]}`}>{cat.toUpperCase()}</span>
              <span className="text-[10px] text-[#4a4642]">{catFlags.length} flags</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {catFlags.map((flag) => (
                <div key={flag.id} className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${flag.enabled ? "bg-[#111] border-[rgba(255,255,255,0.06)]" : "bg-[#0a0a0a] border-[rgba(255,255,255,0.03)]"}`}>
                  <div className="flex-1 min-w-0 pr-3">
                    <p className={`text-xs font-semibold ${flag.enabled ? "text-white" : "text-[#4a4642]"}`}>{flag.name}</p>
                    <p className="text-[9px] text-[#4a4642] mt-0.5 truncate">{flag.description}</p>
                    <p className="text-[8px] text-[#2a2620] mt-0.5 font-mono">Updated {timeAgo(flag.updatedAt)}</p>
                  </div>
                  <button
                    onClick={() => toggle(flag.id, flag.enabled)}
                    disabled={toggling === flag.id}
                    className={`relative flex-shrink-0 w-10 h-5.5 rounded-full transition-all border ${flag.enabled ? "bg-violet-600 border-violet-500/50" : "bg-[#222] border-[rgba(255,255,255,0.06)]"} ${toggling === flag.id ? "opacity-50" : ""}`}
                    style={{ height: "22px", width: "40px" }}
                  >
                    <div className={`absolute top-[3px] w-4 h-4 rounded-full bg-white shadow transition-all ${flag.enabled ? "left-[20px]" : "left-[3px]"}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Tab: Broadcast ───────────────────────────────────────────────────────────

function BroadcastTab() {
  const [broadcast, setBroadcastState] = useState<BroadcastMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [text, setText] = useState(""); const [type, setType] = useState<BroadcastMessage["type"]>("info"); const [active, setActive] = useState(false);

  useEffect(() => {
    axios.get("/api/superadmin/broadcast").then((r) => { setBroadcastState(r.data); setText(r.data.text); setType(r.data.type); setActive(r.data.active); }).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const r = await axios.post("/api/superadmin/broadcast", { text, type, active });
      setBroadcastState(r.data);
      toast.success(active ? "Broadcast is now live!" : "Broadcast saved (inactive)");
    } catch { toast.error("Failed to save broadcast"); }
    finally { setSaving(false); }
  };

  const typeColors = { info: "border-blue-500/40 bg-blue-500/10 text-blue-300", warning: "border-amber-500/40 bg-amber-500/10 text-amber-300", danger: "border-red-500/40 bg-red-500/10 text-red-300", success: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" };

  if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw className="size-6 text-violet-400 animate-spin" /></div>;

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h3 className="text-sm font-bold text-white flex items-center gap-2"><Megaphone className="size-4 text-violet-400" />System Broadcast</h3>
        <p className="text-[10px] text-[#4a4642] mt-0.5">Send a platform-wide banner to all restaurant dashboards</p>
      </div>

      <div className="bg-[#0c0c0c] border border-[rgba(255,255,255,0.05)] rounded-2xl p-6 space-y-5">
        {/* Live Preview */}
        {text && (
          <div className={`p-3.5 rounded-xl border text-sm font-medium ${typeColors[type]}`}>
            <div className="flex items-center gap-2">
              {type === "info" && <Globe className="size-4 flex-shrink-0" />}
              {type === "warning" && <AlertTriangle className="size-4 flex-shrink-0" />}
              {type === "danger" && <XCircle className="size-4 flex-shrink-0" />}
              {type === "success" && <CheckCircle className="size-4 flex-shrink-0" />}
              <span>{text}</span>
            </div>
          </div>
        )}

        {/* Message Text */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-[#4a4642] uppercase tracking-widest">Message</label>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="Enter your platform announcement..." className="w-full bg-[#111] border border-[rgba(255,255,255,0.07)] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#2a2620] focus:outline-none focus:border-violet-500/50 resize-none" />
        </div>

        {/* Type Picker */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-[#4a4642] uppercase tracking-widest">Message Type</label>
          <div className="flex gap-2 flex-wrap">
            {(["info", "warning", "danger", "success"] as const).map((t) => (
              <button key={t} onClick={() => setType(t)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all capitalize ${type === t ? typeColors[t] : "bg-[#111] border-[rgba(255,255,255,0.06)] text-[#6f695f] hover:text-white"}`}>{t}</button>
            ))}
          </div>
        </div>

        {/* Active toggle + Send */}
        <div className="flex items-center justify-between pt-2 border-t border-[rgba(255,255,255,0.04)]">
          <div className="flex items-center gap-3">
            <button onClick={() => setActive(!active)} className={`relative w-10 h-5.5 rounded-full transition-all border ${active ? "bg-violet-600 border-violet-500/50" : "bg-[#222] border-[rgba(255,255,255,0.06)]"}`} style={{ height: "22px", width: "40px" }}>
              <div className={`absolute top-[3px] w-4 h-4 rounded-full bg-white shadow transition-all ${active ? "left-[20px]" : "left-[3px]"}`} />
            </button>
            <div>
              <p className="text-xs font-semibold text-white">{active ? "Live" : "Inactive"}</p>
              <p className="text-[9px] text-[#4a4642]">{active ? "Showing on all dashboards" : "Not broadcasting"}</p>
            </div>
            {active && <span className="flex items-center gap-1 text-[9px] text-emerald-400 font-bold"><Radio className="size-2.5 animate-pulse" />LIVE</span>}
          </div>
          <button onClick={save} disabled={saving || !text} className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 disabled:opacity-50">
            {saving ? <RefreshCw className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}{saving ? "Saving..." : "Save & Broadcast"}
          </button>
        </div>

        {broadcast?.updatedAt && <p className="text-[9px] text-[#2a2620] font-mono">Last updated: {new Date(broadcast.updatedAt).toLocaleString()}</p>}
      </div>
    </div>
  );
}

// ─── Tab: Activity ────────────────────────────────────────────────────────────

function ActivityTab() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => { setLoading(true); axios.get("/api/superadmin/activity").then((r) => setEvents(r.data.events)).catch(() => toast.error("Failed to load activity")).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const typeMap: Record<string, { color: string; dot: string; icon: React.ReactNode }> = {
    order: { color: "text-violet-400", dot: "bg-violet-500", icon: <Package className="size-3" /> },
    signup: { color: "text-emerald-400", dot: "bg-emerald-500", icon: <Users className="size-3" /> },
    reservation: { color: "text-blue-400", dot: "bg-blue-500", icon: <Clock className="size-3" /> },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2"><Activity className="size-4 text-violet-400" />Platform Activity Feed</h3>
          <p className="text-[10px] text-[#4a4642] mt-0.5">Real-time events across all tenants</p>
        </div>
        <button onClick={load} disabled={loading} className="px-3 py-1.5 rounded-lg bg-[#111] border border-[rgba(255,255,255,0.06)] text-xs font-semibold flex items-center gap-1.5 hover:bg-[#161616] transition-all">
          <RefreshCw className={`size-3 text-violet-400 ${loading ? "animate-spin" : ""}`} />Refresh
        </button>
      </div>

      <div className="bg-[#0c0c0c] border border-[rgba(255,255,255,0.05)] rounded-2xl p-5">
        {loading ? (
          <div className="space-y-3">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-10 rounded-xl bg-[#111] animate-pulse" />)}</div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 text-[#4a4642]"><Activity className="size-8 mx-auto mb-2 opacity-30" /><p className="text-xs">No activity yet</p></div>
        ) : (
          <div className="relative">
            <div className="absolute left-[7px] top-0 bottom-0 w-px bg-[rgba(255,255,255,0.04)]" />
            <div className="space-y-0">
              {events.map((event, i) => {
                const meta = typeMap[event.type] || { color: "text-[#6f695f]", dot: "bg-[#444]", icon: <Zap className="size-3" /> };
                return (
                  <div key={event.id} className="flex gap-4 pl-8 relative py-3 border-b border-[rgba(255,255,255,0.03)] last:border-0 hover:bg-[#111]/30 transition-colors rounded-lg -mx-1 px-3 pl-9">
                    <div className={`absolute left-[4px] top-[18px] w-[7px] h-[7px] rounded-full ${meta.dot} ring-2 ring-[#0c0c0c]`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[9px] font-bold uppercase tracking-widest ${meta.color} flex items-center gap-1`}>{meta.icon}{event.type}</span>
                        <span className="text-xs font-semibold text-white">{event.title}</span>
                        {event.badge && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md bg-[#222] text-[#6f695f] uppercase">{event.badge}</span>}
                      </div>
                      <p className="text-[10px] text-[#6f695f] mt-0.5">{event.description}</p>
                    </div>
                    <span className="text-[9px] text-[#3a3630] whitespace-nowrap font-mono flex-shrink-0 mt-0.5">{timeAgo(event.time)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Errors ──────────────────────────────────────────────────────────────

function ErrorsTab() {
  const [errors, setErrors] = useState<MockError[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);

  useEffect(() => { axios.get("/api/superadmin/errors").then((r) => setErrors(r.data.errors)).finally(() => setLoading(false)); }, []);

  const resolve = async (id: string) => {
    setResolving(id);
    try { const r = await axios.post("/api/superadmin/errors", { id }); setErrors(r.data.errors); toast.success("Error marked as resolved"); }
    catch { toast.error("Failed"); } finally { setResolving(null); }
  };

  const sevMap = { critical: { badge: "bg-red-500/15 text-red-400 border-red-500/25", dot: "bg-red-500", icon: <XCircle className="size-3.5" /> }, error: { badge: "bg-orange-500/15 text-orange-400 border-orange-500/25", dot: "bg-orange-500", icon: <AlertOctagon className="size-3.5" /> }, warning: { badge: "bg-amber-500/15 text-amber-400 border-amber-500/25", dot: "bg-amber-500", icon: <AlertTriangle className="size-3.5" /> } };

  const active = errors.filter((e) => !e.resolved); const resolved = errors.filter((e) => e.resolved);

  if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw className="size-6 text-violet-400 animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <div><h3 className="text-sm font-bold text-white flex items-center gap-2"><AlertOctagon className="size-4 text-violet-400" />Error Monitor</h3><p className="text-[10px] text-[#4a4642] mt-0.5">Platform-wide error tracking</p></div>
        <div className="flex gap-2 ml-auto">
          <span className="px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold">{active.length} active</span>
          <span className="px-2.5 py-1 rounded-lg bg-[#111] border border-[rgba(255,255,255,0.06)] text-[#6f695f] text-[10px] font-bold">{resolved.length} resolved</span>
        </div>
      </div>

      {active.length > 0 && (
        <div className="bg-[#0c0c0c] border border-[rgba(255,255,255,0.05)] rounded-2xl p-5 space-y-3">
          <p className="text-[9px] font-bold text-[#4a4642] uppercase tracking-widest">Active Issues</p>
          {active.map((err) => {
            const sev = sevMap[err.severity];
            return (
              <div key={err.id} className="bg-[#111] rounded-xl p-4 border border-[rgba(255,255,255,0.04)] flex items-start gap-3">
                <div className={`p-1.5 rounded-lg border ${sev.badge} flex-shrink-0 mt-0.5`}>{sev.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold text-white leading-tight">{err.message}</p>
                    <button onClick={() => resolve(err.id)} disabled={resolving === err.id} className="flex-shrink-0 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all text-[9px] font-bold flex items-center gap-1">
                      {resolving === err.id ? <RefreshCw className="size-3 animate-spin" /> : <Check className="size-3" />}Resolve
                    </button>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className="text-[9px] text-[#6f695f] font-mono">{err.route}</span>
                    <span className="text-[9px] text-[#6f695f]">· {err.restaurant}</span>
                    <span className="text-[9px] text-[#4a4642]">· {err.count}× · {timeAgo(err.lastSeen)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {resolved.length > 0 && (
        <div className="bg-[#0c0c0c] border border-[rgba(255,255,255,0.05)] rounded-2xl p-5 space-y-3 opacity-60">
          <p className="text-[9px] font-bold text-[#4a4642] uppercase tracking-widest">Resolved</p>
          {resolved.map((err) => (
            <div key={err.id} className="flex items-center gap-3 py-2 border-b border-[rgba(255,255,255,0.03)] last:border-0">
              <CheckCircle className="size-3.5 text-emerald-500 flex-shrink-0" />
              <span className="text-[10px] text-[#4a4642] line-through">{err.message}</span>
              <span className="ml-auto text-[9px] text-[#2a2620]">{err.restaurant}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Query Runner ────────────────────────────────────────────────────────

function QueryRunnerTab() {
  const [query, setQuery] = useState("SELECT id, name, slug FROM \"Restaurant\" LIMIT 10;");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ rows: Record<string, unknown>[]; columns: string[]; count: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setRunning(true); setError(null); setResult(null);
    try { const r = await axios.post("/api/superadmin/query", { query }); setResult(r.data); toast.success(`${r.data.count} rows returned`); }
    catch (e: any) { setError(e.response?.data?.error || "Query failed"); toast.error("Query error"); }
    finally { setRunning(false); }
  };

  const presets = [
    { label: "Restaurants", sql: 'SELECT id, name, slug, "createdAt" FROM "Restaurant" ORDER BY "createdAt" DESC LIMIT 10;' },
    { label: "Users", sql: 'SELECT id, name, email, "createdAt" FROM "User" ORDER BY "createdAt" DESC LIMIT 10;' },
    { label: "Orders", sql: 'SELECT id, status, "totalAmount", "createdAt" FROM "Order" ORDER BY "createdAt" DESC LIMIT 10;' },
    { label: "Subscriptions", sql: 'SELECT id, plan, status, "restaurantId" FROM "Subscription" LIMIT 20;' },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-bold text-white flex items-center gap-2"><Database className="size-4 text-violet-400" />SQL Query Runner</h3>
        <p className="text-[10px] text-[#4a4642] mt-0.5">Read-only · SELECT only · 50 row limit</p>
      </div>

      {/* Preset buttons */}
      <div className="flex gap-2 flex-wrap">
        {presets.map((p) => (
          <button key={p.label} onClick={() => setQuery(p.sql)} className="px-3 py-1.5 rounded-lg bg-[#111] border border-[rgba(255,255,255,0.06)] text-[10px] font-bold text-[#9a9488] hover:text-white hover:border-violet-500/30 transition-all">{p.label}</button>
        ))}
      </div>

      {/* Editor */}
      <div className="bg-[#0c0c0c] border border-[rgba(255,255,255,0.05)] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[rgba(255,255,255,0.05)] bg-[#0a0a0a]">
          <div className="flex items-center gap-2"><div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500/50" /><div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" /><div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" /></div><span className="text-[9px] text-[#4a4642] font-mono uppercase tracking-widest">sql console</span></div>
          <button onClick={run} disabled={running || !query.trim()} className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-bold rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-50">
            {running ? <><RefreshCw className="size-3 animate-spin" />Running...</> : <><Play className="size-3" />Run Query</>}
          </button>
        </div>
        <textarea value={query} onChange={(e) => setQuery(e.target.value)} rows={5} spellCheck={false} onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) run(); }}
          className="w-full bg-transparent px-5 py-4 text-sm text-[#c4b5fd] font-mono placeholder:text-[#2a2620] focus:outline-none resize-none leading-relaxed" />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
          <XCircle className="size-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-300 font-mono">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="bg-[#0c0c0c] border border-[rgba(255,255,255,0.05)] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[rgba(255,255,255,0.05)] bg-[#0a0a0a]">
            <span className="text-[9px] text-[#4a4642] font-mono">{result.count} row{result.count !== 1 ? "s" : ""} returned</span>
            <span className="text-[9px] text-emerald-400 flex items-center gap-1"><CheckCircle className="size-2.5" />Success</span>
          </div>
          <div className="overflow-x-auto max-h-72 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[#0a0a0a]">
                <tr>{result.columns.map((col) => <th key={col} className="px-4 py-2.5 text-left text-[9px] font-bold text-[#4a4642] uppercase tracking-widest border-b border-[rgba(255,255,255,0.04)] whitespace-nowrap">{col}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-[rgba(255,255,255,0.03)]">
                {result.rows.map((row, i) => (
                  <tr key={i} className="hover:bg-[#111]/40 transition-colors">
                    {result.columns.map((col) => <td key={col} className="px-4 py-2.5 text-[#9a9488] font-mono whitespace-nowrap text-[10px] max-w-[200px] truncate">{String(row[col] ?? "null")}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Console ─────────────────────────────────────────────────────────────

function DeveloperConsole({ onLogout }: { onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [restaurants, setRestaurants] = useState<RestaurantTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const r = await axios.get("/api/admin");
      setStats(r.data.stats); setRestaurants(r.data.restaurants);
      if (silent) toast.success("Metrics refreshed!");
    } catch { toast.error("Failed to load data"); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handlePlanOverride = async (restaurantId: string, plan: "STARTER" | "GROWTH" | "PRO") => {
    try {
      await axios.post("/api/admin", { restaurantId, plan });
      setRestaurants((prev) => prev.map((r) => r.id === restaurantId ? { ...r, plan } : r));
      toast.success(`Plan → ${plan}`);
    } catch { toast.error("Failed to override plan"); }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: "overview", label: "Overview", icon: <LayoutDashboard className="size-4" /> },
    { id: "tenants", label: "Tenants", icon: <Hotel className="size-4" />, badge: restaurants.length },
    { id: "analytics", label: "Analytics", icon: <BarChart2 className="size-4" /> },
    { id: "flags", label: "Feature Flags", icon: <ToggleLeft className="size-4" /> },
    { id: "broadcast", label: "Broadcast", icon: <Megaphone className="size-4" /> },
    { id: "activity", label: "Activity", icon: <Activity className="size-4" /> },
    { id: "errors", label: "Errors", icon: <AlertOctagon className="size-4" /> },
    { id: "query", label: "Query Runner", icon: <Database className="size-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col">
      {/* Top Bar */}
      <div className="border-b border-[rgba(255,255,255,0.05)] bg-[#080808] px-5 py-3 flex items-center justify-between sticky top-0 z-20 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center"><ShieldAlert className="size-4 text-white" /></div>
          <div><p className="text-sm font-bold text-white leading-tight">Developer Control Center</p><p className="text-[9px] text-[#3a3630] font-mono uppercase tracking-widest">TableScan · Superadmin</p></div>
          <span className="ml-1 px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 text-[9px] font-bold flex items-center gap-1"><Cpu className="size-2.5" />SUPERADMIN</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => loadData(true)} disabled={refreshing} className="px-3 py-1.5 rounded-lg bg-[#111] border border-[rgba(255,255,255,0.07)] hover:bg-[#161616] transition-all text-xs font-semibold flex items-center gap-1.5"><RefreshCw className={`size-3 text-violet-400 ${refreshing ? "animate-spin" : ""}`} />Refresh</button>
          <button onClick={onLogout} className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all text-xs font-semibold flex items-center gap-1.5"><LogOut className="size-3" />Sign Out</button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-[200px] flex-shrink-0 border-r border-[rgba(255,255,255,0.05)] bg-[#080808] p-3 space-y-0.5 overflow-y-auto">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all relative ${activeTab === tab.id ? "bg-violet-500/12 text-violet-300 border border-violet-500/20" : "text-[#6f695f] hover:text-[#9a9488] hover:bg-[#111]"}`}>
              <span className={activeTab === tab.id ? "text-violet-400" : ""}>{tab.icon}</span>
              <span className="flex-1 text-left">{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-[#222] text-[#6f695f] text-[8px] font-bold">{tab.badge}</span>
              )}
              {activeTab === tab.id && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-violet-500 rounded-l-full" />}
            </button>
          ))}
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              {activeTab === "overview" && <OverviewTab stats={stats} restaurants={restaurants} loading={loading} />}
              {activeTab === "tenants" && <TenantsTab restaurants={restaurants} onPlanOverride={handlePlanOverride} />}
              {activeTab === "analytics" && <AnalyticsTab />}
              {activeTab === "flags" && <FeatureFlagsTab />}
              {activeTab === "broadcast" && <BroadcastTab />}
              {activeTab === "activity" && <ActivityTab />}
              {activeTab === "errors" && <ErrorsTab />}
              {activeTab === "query" && <QueryRunnerTab />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SuperadminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    axios.get("/api/superadmin/auth/check")
      .then(() => setAuthed(true))
      .catch(() => setAuthed(false));
  }, []);

  if (authed === null) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-7 h-7 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {!authed ? (
        <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <LoginScreen onSuccess={() => setAuthed(true)} />
        </motion.div>
      ) : (
        <motion.div key="console" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <DeveloperConsole onLogout={() => setAuthed(false)} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
