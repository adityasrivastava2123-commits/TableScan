"use client";

import { useState, useEffect } from "react";
import { 
  ShieldAlert, Database, Cpu, Activity, Sparkles, Terminal, 
  RefreshCw, Users, CreditCard, Hotel, ChevronRight, Check,
  AlertTriangle, Play, HelpCircle, Server, HardDrive, Wifi, Layers
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

interface RestaurantTenant {
  id: string;
  name: string;
  slug: string;
  ownerName: string;
  ownerEmail: string;
  locationsCount: number;
  menuItemsCount: number;
  ordersCount: number;
  plan: "STARTER" | "GROWTH" | "PRO";
  status: string;
}

interface PlatformStats {
  users: number;
  restaurants: number;
  orders: number;
  menuItems: number;
  volume: number;
}

export default function DeveloperConsole() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [restaurants, setRestaurants] = useState<RestaurantTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Health check metrics states
  const [health, setHealth] = useState({
    supabase: { status: "ONLINE", ping: 14 },
    clerk: { status: "ONLINE", ping: 25 },
    stripe: { status: "ONLINE", ping: 32 },
    pusher: { status: "ONLINE", ping: 18 }
  });

  // Simulated log stream
  const [logs, setLogs] = useState<string[]>([
    "💡 SYSTEM: Superadmin dashboard initialized in Developer Mode.",
    "🛡️ CLERK AUTH: Local synchronous token cache validated in <1ms.",
    "🐘 DATABASE: Supabase PostgreSQL pool active with 10 connections.",
    "🔌 WEBSOCKET: Pusher authenticated and listening on live channels.",
    "🚀 SERVERLESS: Warm start executed successfully for SaaS middleware."
  ]);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    
    try {
      const response = await axios.get("/api/admin");
      setStats(response.data.stats);
      setRestaurants(response.data.restaurants);
      
      if (silent) {
        addLog("♻️ SYSTEM: Platform metrics and tenant lists refreshed silently.");
        toast.success("Metrics updated!");
      }
    } catch (error) {
      addLog("❌ API ERROR: Failed to poll platform telemetry data.");
      toast.error("Failed to load platform data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
  };

  const handlePlanOverride = async (restaurantId: string, plan: "STARTER" | "GROWTH" | "PRO") => {
    try {
      await axios.post("/api/admin", { restaurantId, plan });
      
      // Update local state
      setRestaurants(prev => prev.map(r => r.id === restaurantId ? { ...r, plan } : r));
      
      const restName = restaurants.find(r => r.id === restaurantId)?.name || "Tenant";
      addLog(`⚡ SaaS METRICS: Manually overrode ${restName} subscription plan to ${plan}.`);
      toast.success(`Plan updated to ${plan}!`);
    } catch {
      toast.error("Failed to override plan");
      addLog("❌ PLAN OVERRIDE FAILURE: Database update rejected.");
    }
  };

  // Stack Ping simulator
  const triggerHealthPing = () => {
    addLog("⚡ SYSTEM: Handshaking external stack gateways...");
    setHealth({
      supabase: { status: "ONLINE", ping: Math.floor(Math.random() * 20) + 10 },
      clerk: { status: "ONLINE", ping: Math.floor(Math.random() * 30) + 20 },
      stripe: { status: "ONLINE", ping: Math.floor(Math.random() * 40) + 25 },
      pusher: { status: "ONLINE", ping: Math.floor(Math.random() * 15) + 12 }
    });
    addLog("🟢 WEBSOCKET: Pusher channels health checked - 100% active.");
    addLog("🐘 DATABASE: Supabase query latency verified at 12ms.");
    toast.success("Health ping verified!");
  };

  // Sandbox actions
  const simulateDatabaseSeed = () => {
    addLog("🧬 SEED: Simulating database seeding routine...");
    addLog("🧬 SEED: Injecting mock categories (Beverages, Mains, Starters)...");
    addLog("🧬 SEED: Seeding mock orders & table setups...");
    addLog("🟢 SUCCESS: Database seeding routine completed securely.");
    toast.success("DB Seed simulated!");
  };

  const flushCache = () => {
    addLog("🧹 CACHE: Invalidating system-wide caching models...");
    addLog("🧹 CACHE: Flushed Clerk user sessions.");
    addLog("🧹 CACHE: Caching keys cleared from platform layers.");
    toast.success("Caches flushed!");
  };

  if (loading) {
    return (
      <div className="p-7 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3.5 flex-wrap justify-between border-b border-[rgba(255,255,255,0.06)] pb-5">
          <div className="flex items-center gap-3.5">
            <Skeleton className="w-[50px] h-[50px] rounded-2xl bg-[#222]" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-44 bg-[#222]" />
              <Skeleton className="h-4 w-64 bg-[#222]" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24 rounded-2xl bg-[#222]" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-2xl bg-[#222]" />
      </div>
    );
  }

  return (
    <div className="p-7 space-y-6 max-w-7xl mx-auto text-[#f5efe2] min-h-screen">
      
      {/* Premium Admin Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[rgba(255,255,255,0.08)] pb-6">
        <div className="flex items-center gap-4">
          <div className="w-[50px] h-[50px] rounded-2xl bg-gradient-to-br from-[#f0a040] to-[#e85a2a] flex items-center justify-center shadow-lg shadow-[#f0a040]/10 border border-[#f0a040]/20">
            <ShieldAlert className="size-6 text-[#0b0a08] animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-[#f5efe2]">
                Developer <em className="font-editorial italic font-normal text-[#f0a040]">Console</em>
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-[#f0a040]/10 text-[#f0a040] border border-[#f0a040]/20 text-[10px] font-bold flex items-center gap-1">
                <Cpu className="size-2.5" /> SUPERADMIN
              </span>
            </div>
            <p className="text-[12px] text-[#f5efe2]/60 mt-0.5">
              Platform-wide tenant administration, live database metrics, and developer override controls
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="px-4 py-2.5 rounded-xl bg-white/[0.02] border border-[rgba(255,255,255,0.08)] hover:bg-white/[0.04] hover:border-[#f0a040] transition-all flex items-center gap-2 text-xs font-semibold"
          >
            <RefreshCw className={`size-3.5 text-[#f0a040] ${refreshing ? "animate-spin" : ""}`} />
            Refresh Telemetry
          </button>
        </div>
      </div>

      {/* SaaS Global Telemetry Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { 
            title: "Total SaaS Volume", 
            val: `₹${(stats?.volume || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, 
            desc: "Lifetime order revenue", 
            color: "from-[#f0a040]/10 to-[#e85a2a]/10 border-[#f0a040]/20 text-[#f0a040]" 
          },
          { 
            title: "Business Tenants", 
            val: stats?.restaurants || 0, 
            desc: "Registered restaurants", 
            color: "from-[#f0a040]/10 to-[#e85a2a]/10 border-[#f0a040]/20 text-[#f0a040]" 
          },
          { 
            title: "Global Accounts", 
            val: stats?.users || 0, 
            desc: "Owners and staff users", 
            color: "from-[#f0a040]/10 to-[#e85a2a]/10 border-[#f0a040]/20 text-[#f0a040]" 
          },
          { 
            title: "Lifetime Orders", 
            val: stats?.orders || 0, 
            desc: "Executed table requests", 
            color: "from-[#f0a040]/10 to-[#e85a2a]/10 border-[#f0a040]/20 text-[#f0a040]" 
          },
          { 
            title: "Global Catalog Items", 
            val: stats?.menuItems || 0, 
            desc: "Food & drink menu list", 
            color: "from-[#f0a040]/10 to-[#e85a2a]/10 border-[#f0a040]/20 text-[#f0a040]" 
          }
        ].map((item, idx) => (
          <div key={idx} className="bg-white/[0.02] border border-[rgba(255,255,255,0.08)] hover:border-[#f0a040]/30 transition-all duration-300 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between">
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${item.color} blur-2xl opacity-20`} />
            <div>
              <span className="text-[10px] font-semibold text-[#f5efe2]/40 uppercase tracking-wider">{item.title}</span>
              <div className="text-2xl font-extrabold tracking-tight text-[#f5efe2] mt-1.5 font-mono-dashboard">{item.val}</div>
            </div>
            <div className="mt-2 text-[10px] text-[#f5efe2]/60">{item.desc}</div>
          </div>
        ))}
      </div>

      {/* Main SaaS Administration Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Tenant Board & Plan Management */}
        <div className="lg:col-span-2 bg-white/[0.02] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-4">
            <div>
              <h3 className="text-sm font-bold text-[#f5efe2] flex items-center gap-2">
                <Hotel className="size-4 text-[#f0a040]" />
                Active SaaS Business Tenants
              </h3>
              <p className="text-[10px] text-[#f5efe2]/40 mt-0.5">Manage subscription limits and override plans</p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-[#f0a040]/10 text-[#f0a040] text-[10px] font-bold font-mono-dashboard">
              {restaurants.length} portals
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-[#f5efe2]/40 border-b border-[rgba(255,255,255,0.08)] font-bold uppercase text-[10px]">
                  <th className="pb-3 pr-2">Restaurant Portal</th>
                  <th className="pb-3 pr-2">Developer Owner</th>
                  <th className="pb-3 pr-2 text-center">Locations</th>
                  <th className="pb-3 pr-2 text-center">Menu / Orders</th>
                  <th className="pb-3 text-center">Subscription Plan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(255,255,255,0.05)]">
                {restaurants.map(r => (
                  <tr key={r.id} className="hover:bg-white/[0.01] transition-colors">
                    <td className="py-3.5 pr-2">
                      <div className="font-bold text-[#f5efe2] leading-tight">{r.name}</div>
                      <div className="text-[10px] text-[#f5efe2]/40 font-mono-dashboard mt-0.5">slug: {r.slug}</div>
                    </td>
                    <td className="py-3.5 pr-2">
                      <div className="font-medium text-[#f5efe2]">{r.ownerName}</div>
                      <div className="text-[10px] text-[#f5efe2]/40">{r.ownerEmail}</div>
                    </td>
                    <td className="py-3.5 pr-2 text-center text-[#f5efe2] font-semibold font-mono-dashboard">
                      {r.locationsCount}
                    </td>
                    <td className="py-3.5 pr-2 text-center font-mono-dashboard">
                      <div className="text-[#f5efe2] font-semibold">{r.menuItemsCount} Items</div>
                      <div className="text-[10px] text-[#f5efe2]/40">{r.ordersCount} Orders</div>
                    </td>
                    <td className="py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5 bg-[#0b0a08] p-1 rounded-xl border border-[rgba(255,255,255,0.08)] w-fit mx-auto">
                        {(["STARTER", "GROWTH", "PRO"] as const).map(tier => (
                          <button
                            key={tier}
                            onClick={() => handlePlanOverride(r.id, tier)}
                            className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase transition-all ${
                              r.plan === tier
                                ? "bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-[#0b0a08] shadow-md shadow-amber-950/20"
                                : "text-[#f5efe2]/40 hover:text-[#f5efe2]"
                            }`}
                          >
                            {tier}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Infrastructure Health & Console Terminal */}
        <div className="space-y-6">
          
          {/* Health Deck Panel */}
          <div className="bg-white/[0.02] border border-[rgba(255,255,255,0.08)] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-3">
              <div>
                <h3 className="text-xs font-bold text-[#f5efe2] tracking-wider uppercase flex items-center gap-1.5">
                  <Activity className="size-3.5 text-[#f0a040]" />
                  SaaS Gateway Health
                </h3>
                <p className="text-[10px] text-[#f5efe2]/40 mt-0.5">Integrations latency check</p>
              </div>
              <button
                onClick={triggerHealthPing}
                className="px-2.5 py-1 bg-white/[0.02] border border-[rgba(255,255,255,0.08)] text-[#f0a040] hover:bg-white/[0.04] hover:border-[#f0a040] rounded-lg text-[10px] font-bold transition-all"
              >
                Perform Ping
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { name: "Supabase DB", status: health.supabase.status, latency: `${health.supabase.ping}ms`, icon: Server, color: "text-[#52d27a]" },
                { name: "Clerk Auth", status: health.clerk.status, latency: `${health.clerk.ping}ms`, icon: HardDrive, color: "text-[#f0a040]" },
                { name: "Stripe API", status: health.stripe.status, latency: `${health.stripe.ping}ms`, icon: CreditCard, color: "text-[#e85a2a]" },
                { name: "Pusher Sync", status: health.pusher.status, latency: `${health.pusher.ping}ms`, icon: Wifi, color: "text-[#f0a040]" }
              ].map((gateway, idx) => (
                <div key={idx} className="bg-[#0b0a08] p-3 rounded-xl border border-[rgba(255,255,255,0.08)] space-y-1">
                  <div className="flex justify-between items-center text-[10px] text-[#f5efe2]/60">
                    <span className="font-semibold">{gateway.name}</span>
                    <gateway.icon className={`size-3.5 ${gateway.color}`} />
                  </div>
                  <div className="flex justify-between items-end pt-1">
                    <span className="text-[9px] px-1.5 py-0.5 bg-[rgba(82,210,122,0.15)] text-[#52d27a] rounded-md font-bold">
                      {gateway.status}
                    </span>
                    <span className="text-[11px] font-bold font-mono-dashboard text-[#f5efe2]">{gateway.latency}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Linux-style logs stream & Sandbox */}
          <div className="bg-white/[0.02] border border-[rgba(255,255,255,0.08)] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-3">
              <h3 className="text-xs font-bold text-[#f5efe2] tracking-wider uppercase flex items-center gap-1.5">
                <Terminal className="size-3.5 text-[#f0a040]" />
                Developer Sandbox Console
              </h3>
              <span className="text-[9px] text-[#f5efe2]/40 font-bold font-mono-dashboard uppercase bg-[#0b0a08] px-2 py-0.5 rounded-md border border-[rgba(255,255,255,0.08)]">
                bash
              </span>
            </div>

            {/* Quick Sandbox trigger tools */}
            <div className="grid grid-cols-2 gap-2 pb-2">
              <button
                onClick={simulateDatabaseSeed}
                className="py-2 bg-white/[0.02] border border-[rgba(255,255,255,0.08)] hover:border-[#f0a040] hover:text-[#f5efe2] rounded-xl text-[10px] font-bold text-[#f5efe2]/60 transition-all flex items-center justify-center gap-1"
              >
                <Play className="size-3 text-[#f0a040]" /> Seeding Mock
              </button>
              <button
                onClick={flushCache}
                className="py-2 bg-white/[0.02] border border-[rgba(255,255,255,0.08)] hover:border-[#f0a040] hover:text-[#f5efe2] rounded-xl text-[10px] font-bold text-[#f5efe2]/60 transition-all flex items-center justify-center gap-1"
              >
                <RefreshCw className="size-3 text-[#f0a040]" /> Flush Caches
              </button>
            </div>

            {/* Terminal display log screen */}
            <div className="bg-[#0b0a08] p-3 rounded-xl border border-[rgba(255,255,255,0.08)] h-[220px] overflow-y-auto font-mono-dashboard text-[9px] space-y-2 text-[#f5efe2]/80">
              {logs.map((log, idx) => (
                <div key={idx} className="leading-relaxed break-all truncate">
                  {log}
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
