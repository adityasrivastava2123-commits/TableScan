"use client";

import { useState, useEffect, useRef } from "react";
import { Clock, ChefHat, CheckCircle, AlertTriangle, Play, Bell, Info, Award, Sparkles } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";

interface OrderItem {
  id: string;
  quantity: number;
  menuItem: {
    name: string;
  };
  note?: string | null;
}

interface Order {
  id: string;
  orderNumber: string;
  items: OrderItem[];
  specialNote?: string | null;
  table?: {
    name: string;
  };
}

interface OrderPreparation {
  id: string;
  stage: string;
  startedAt?: string;
  completedAt?: string;
  estimatedPrepTime?: number;
  actualPrepTime?: number;
  priority: string;
  notes?: string;
  order: Order;
  createdAt: string;
}

export default function KitchenDisplaySystem({ restaurantId }: { restaurantId: string }) {
  const [preparations, setPreparations] = useState<OrderPreparation[]>([]);
  const [loading, setLoading] = useState(true);
  const [minLoading, setMinLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, RECEIVED, PREPARING, READY
  const [selectedPrep, setSelectedPrep] = useState<OrderPreparation | null>(null);
  
  // Track previous preparations count to play audio on new orders
  const prevCountRef = useRef<number>(0);

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        await fetchPreparations(true);
      } finally {
        if (mounted) {
          setLoading(false);
          setMinLoading(false);
        }
      }
    };

    loadData();

    const interval = setInterval(() => fetchPreparations(false), 10000); // Poll every 10s
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [restaurantId, filter]);

  // Audio alert tone generator using Web Audio API (Fail-safe, no external files)
  const playKitchenBell = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      // Double chime
      const chime = (delay: number, freq: number) => {
        setTimeout(() => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, ctx.currentTime);
          
          gain.gain.setValueAtTime(0.15, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.start();
          osc.stop(ctx.currentTime + 1.2);
        }, delay);
      };
      
      chime(0, 880); // High A note
      chime(150, 1109); // High C# note (Major triad chime)
    } catch (e) {
      console.warn("Web Audio API blocked by browser policy:", e);
    }
  };

  async function fetchPreparations(isFirstLoad: boolean = false) {
    try {
      const response = await axios.get(`/api/kds/order-preparations?restaurantId=${restaurantId}${filter !== "all" ? `&status=${filter}` : ""}`);
      const data = response.data as OrderPreparation[];
      setPreparations(data);
      
      // Play chime if new orders arrived since last poll (except on initial load)
      if (!isFirstLoad && data.length > prevCountRef.current) {
        const hasNewReceived = data.some(p => p.stage === "RECEIVED" && !preparations.some(prev => prev.id === p.id));
        if (hasNewReceived) {
          playKitchenBell();
          toast("New Order in Kitchen!", {
            icon: "🔔",
            style: { background: "#1f2937", color: "#fff", fontWeight: "bold" }
          });
        }
      }
      prevCountRef.current = data.length;
    } catch (error) {
      console.error("Failed to load preparations");
    }
  }

  async function updateStage(id: string, stage: string) {
    try {
      await axios.patch(`/api/kds/order-preparations/${id}`, { stage });
      toast.success(`Ticket marked ${stage.toLowerCase()}!`);
      if (selectedPrep?.id === id) {
        setSelectedPrep(null);
      }
      fetchPreparations(true);
    } catch (error) {
      toast.error("Failed to update order stage");
    }
  }

  async function updatePriority(id: string, priority: string) {
    try {
      await axios.patch(`/api/kds/order-preparations/${id}`, { priority });
      toast.success(`Priority updated to ${priority}`);
      if (selectedPrep?.id === id) {
        setSelectedPrep(prev => prev ? { ...prev, priority } : prev);
      }
      fetchPreparations(true);
    } catch (error) {
      toast.error("Failed to update priority");
    }
  }

  const getElapsedTime = (startedAt?: string) => {
    if (!startedAt) return 0;
    const elapsed = Math.floor((new Date().getTime() - new Date(startedAt).getTime()) / 60000); // minutes
    return elapsed;
  };

  const getStageStyle = (stage: string) => {
    switch (stage) {
      case "RECEIVED": return "bg-blue-500/10 text-blue-500 border-blue-500/30";
      case "PREPARING": return "bg-[#f97316]/10 text-[#f97316] border-[#f97316]/30";
      case "READY": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/30";
      case "SERVED": return "bg-neutral-500/10 text-neutral-400 border-neutral-500/20";
      default: return "bg-neutral-500/10 text-neutral-400 border-neutral-500/20";
    }
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case "URGENT": return "bg-rose-500 text-white shadow-lg shadow-rose-500/30 font-extrabold";
      case "HIGH": return "bg-[#ea6c0a] text-white font-bold";
      case "NORMAL": return "bg-[#f97316]/10 text-[#f97316] border border-[#f97316]/20 font-semibold";
      case "LOW": return "bg-neutral-100 dark:bg-[#1a1a1a] text-neutral-400 font-medium";
      default: return "bg-neutral-100 dark:bg-[#1a1a1a] text-neutral-400";
    }
  };

  const filteredPreparations = preparations.filter((p) => {
    if (filter === "all") return true;
    return p.stage === filter;
  });

  if (minLoading) {
    return (
      <div className="p-7 space-y-6">
        <div className="flex items-center gap-3.5 flex-wrap">
          <Skeleton className="w-[46px] h-[46px] rounded-xl bg-neutral-200 dark:bg-neutral-800" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48 bg-neutral-200 dark:bg-neutral-800" />
            <Skeleton className="h-4 w-64 bg-neutral-200 dark:bg-neutral-800" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-64 rounded-xl bg-neutral-200 dark:bg-neutral-800" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-7 space-y-6 min-h-screen bg-[#f9f9f6] dark:bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex items-center gap-3.5 flex-wrap border-b border-neutral-200 dark:border-[rgba(255,255,255,0.06)] pb-5">
        <div className="w-[46px] h-[46px] rounded-xl bg-[#f97316] flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#f97316]/20 animate-pulse">
          <ChefHat className="size-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-800 dark:text-[#f0ece4] tracking-tight">Kitchen Screen</h1>
          <p className="text-[12px] text-neutral-400 dark:text-[#9a9488]">Touch-optimized real-time chef display</p>
        </div>
        <div className="ml-auto flex gap-2">
          {["all", "RECEIVED", "PREPARING", "READY"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2.5 rounded-xl text-[12px] font-bold transition-all cursor-pointer border ${
                filter === f
                  ? "bg-[#f97316] border-[#f97316] text-white shadow-md shadow-[#f97316]/20"
                  : "bg-white dark:bg-[#141414] border-neutral-200 dark:border-[rgba(255,255,255,0.08)] text-neutral-700 dark:text-[#f0ece4] hover:border-[#f97316]"
              }`}
            >
              {f === "all" ? "All Tickets" : f}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#141414] border border-neutral-200 dark:border-[rgba(255,255,255,0.06)] rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">New Orders</span>
            <span className="text-2xl font-black text-blue-500">{preparations.filter((p) => p.stage === "RECEIVED").length}</span>
          </div>
          <Bell className="w-8 h-8 text-blue-500/20" />
        </div>
        <div className="bg-white dark:bg-[#141414] border border-neutral-200 dark:border-[rgba(255,255,255,0.06)] rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">On Stove</span>
            <span className="text-2xl font-black text-[#f97316]">{preparations.filter((p) => p.stage === "PREPARING").length}</span>
          </div>
          <ChefHat className="w-8 h-8 text-[#f97316]/20" />
        </div>
        <div className="bg-white dark:bg-[#141414] border border-neutral-200 dark:border-[rgba(255,255,255,0.06)] rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">Pass (Ready)</span>
            <span className="text-2xl font-black text-emerald-500">{preparations.filter((p) => p.stage === "READY").length}</span>
          </div>
          <CheckCircle className="w-8 h-8 text-emerald-500/20" />
        </div>
        <div className="bg-white dark:bg-[#141414] border border-neutral-200 dark:border-[rgba(255,255,255,0.06)] rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">Urgent Rush</span>
            <span className="text-2xl font-black text-rose-500">{preparations.filter((p) => p.priority === "URGENT").length}</span>
          </div>
          <AlertTriangle className="w-8 h-8 text-rose-500/20" />
        </div>
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <AnimatePresence mode="popLayout">
          {filteredPreparations.map((prep) => (
            <motion.div
              key={prep.id}
              layout
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-[#141414] border border-neutral-200 dark:border-[rgba(255,255,255,0.06)] rounded-2xl shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col justify-between h-[300px] relative overflow-hidden group cursor-pointer"
              onClick={() => setSelectedPrep(prep)}
            >
              {/* Card Ribbon for Urgency */}
              {prep.priority === "URGENT" && (
                <div className="absolute top-0 right-0 left-0 h-1.5 bg-rose-500" />
              )}

              <div>
                {/* Header */}
                <div className="flex items-start justify-between mb-3.5">
                  <div>
                    <h3 className="text-lg font-black text-neutral-800 dark:text-[#f0ece4] tracking-tight">#{prep.order.orderNumber.split("-")[2] || prep.order.orderNumber}</h3>
                    <p className="text-[11px] font-bold text-neutral-400 uppercase mt-0.5">
                      Table: <span className="text-neutral-700 dark:text-[#f0ece4]">{prep.order.table?.name || "Takeaway"}</span>
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5 items-end">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${getStageStyle(prep.stage)}`}>
                      {prep.stage}
                    </span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${getPriorityStyle(prep.priority)}`}>
                      {prep.priority}
                    </span>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-2 mt-4 overflow-y-auto max-h-[110px] pr-1">
                  {prep.order.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center gap-2 border-b border-neutral-100 dark:border-[rgba(255,255,255,0.04)] pb-1.5">
                      <span className="text-[14px] font-bold text-neutral-800 dark:text-[#f0ece4]">
                        {item.quantity}x <span className="font-semibold">{item.menuItem.name}</span>
                      </span>
                      {item.note && (
                        <span className="text-[10px] text-[#f97316] font-bold max-w-[50%] truncate">
                          {item.note}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                {/* Timer info */}
                <div className="flex items-center justify-between text-[11px] text-neutral-400 font-bold border-t border-neutral-100 dark:border-[rgba(255,255,255,0.04)] pt-3 mt-3">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#f97316]" />
                    {prep.stage === "PREPARING" && prep.startedAt
                      ? `${getElapsedTime(prep.startedAt)} min cooking`
                      : `${new Date(prep.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`}
                  </span>
                  <Info className="w-4 h-4 text-neutral-300 hover:text-[#f97316]" />
                </div>

                {/* KDS Control Button Row */}
                <div className="flex gap-2 mt-3.5" onClick={(e) => e.stopPropagation()}>
                  {prep.stage === "RECEIVED" && (
                    <button
                      onClick={() => updateStage(prep.id, "PREPARING")}
                      className="flex-1 py-2 rounded-xl bg-[#f97316] text-white text-[12px] font-bold hover:bg-[#ea6c0a] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-[#f97316]/20"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" /> Start Prep
                    </button>
                  )}
                  {prep.stage === "PREPARING" && (
                    <button
                      onClick={() => updateStage(prep.id, "READY")}
                      className="flex-1 py-2 rounded-xl bg-emerald-500 text-white text-[12px] font-bold hover:bg-emerald-600 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-emerald-500/20"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Mark Ready
                    </button>
                  )}
                  {prep.stage === "READY" && (
                    <button
                      onClick={() => updateStage(prep.id, "SERVED")}
                      className="flex-1 py-2 rounded-xl bg-neutral-100 dark:bg-[#222] text-neutral-800 dark:text-neutral-200 text-[12px] font-bold hover:bg-neutral-200 transition-all cursor-pointer"
                    >
                      Out to Table
                    </button>
                  )}
                  <button
                    onClick={() => {
                      const priorities = ["LOW", "NORMAL", "HIGH", "URGENT"];
                      const currentIndex = priorities.indexOf(prep.priority);
                      const nextPriority = priorities[(currentIndex + 1) % priorities.length];
                      updatePriority(prep.id, nextPriority);
                    }}
                    className="px-3 py-2 rounded-xl bg-neutral-50 dark:bg-[#1a1a1a] border border-neutral-200 dark:border-[rgba(255,255,255,0.06)] text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 cursor-pointer"
                    title="Toggle Ticket Priority"
                  >
                    <AlertTriangle className="size-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Ticket Details Overlay Modal */}
      <AnimatePresence>
        {selectedPrep && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-neutral-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedPrep(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-[#141414] border border-neutral-200 dark:border-[rgba(255,255,255,0.08)] rounded-3xl p-6 w-full max-w-lg shadow-2xl relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {selectedPrep.priority === "URGENT" && (
                <div className="absolute top-0 right-0 left-0 h-2 bg-rose-500" />
              )}
              
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-black text-neutral-800 dark:text-white tracking-tight">Order Details</h2>
                  <p className="text-sm font-bold text-neutral-400 uppercase mt-0.5">Table: <span className="text-[#f97316]">{selectedPrep.order.table?.name || "Takeaway"}</span></p>
                </div>
                <button 
                  onClick={() => setSelectedPrep(null)}
                  className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-[#222] flex items-center justify-center text-neutral-500 hover:text-neutral-800 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Items List */}
              <div className="space-y-3.5 mb-6 max-h-[300px] overflow-y-auto pr-1">
                {selectedPrep.order.items.map((item) => (
                  <div key={item.id} className="p-3 bg-neutral-50 dark:bg-[#1e1e1e] border border-neutral-200/50 dark:border-[rgba(255,255,255,0.04)] rounded-2xl flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[17px] font-black text-neutral-800 dark:text-white">{item.quantity}x {item.menuItem.name}</span>
                      <Award className="w-5 h-5 text-[#f97316]/20" />
                    </div>
                    {item.note && (
                      <p className="text-[12px] font-bold text-[#f97316] bg-[#f97316]/10 px-3 py-1.5 rounded-xl border border-[#f97316]/20 w-fit flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" /> Note: {item.note}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Instructions */}
              {selectedPrep.order.specialNote && (
                <div className="mb-6 p-4 bg-orange-50/50 dark:bg-orange-500/5 border border-[#f97316]/25 rounded-2xl">
                  <p className="text-[11px] font-bold text-[#f97316] uppercase tracking-wider mb-1">Global Cooking Instructions</p>
                  <p className="text-[13px] font-medium text-neutral-700 dark:text-[#9a9488] italic">&ldquo;{selectedPrep.order.specialNote}&rdquo;</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-3">
                {selectedPrep.stage === "RECEIVED" && (
                  <button
                    onClick={() => updateStage(selectedPrep.id, "PREPARING")}
                    className="py-3 rounded-2xl bg-[#f97316] text-white font-bold hover:bg-[#ea6c0a] transition-all cursor-pointer"
                  >
                    Start Cooking
                  </button>
                )}
                {selectedPrep.stage === "PREPARING" && (
                  <button
                    onClick={() => updateStage(selectedPrep.id, "READY")}
                    className="py-3 rounded-2xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-all cursor-pointer"
                  >
                    Ready for Service
                  </button>
                )}
                {selectedPrep.stage === "READY" && (
                  <button
                    onClick={() => updateStage(selectedPrep.id, "SERVED")}
                    className="py-3 rounded-2xl bg-blue-500 text-white font-bold hover:bg-blue-600 transition-all cursor-pointer"
                  >
                    Serve to Guest
                  </button>
                )}
                <button
                  onClick={() => {
                    const nextPri = selectedPrep.priority === "NORMAL" ? "URGENT" : "NORMAL";
                    updatePriority(selectedPrep.id, nextPri);
                  }}
                  className={`py-3 rounded-2xl font-bold border transition-all cursor-pointer ${
                    selectedPrep.priority === "URGENT"
                      ? "border-rose-500 text-rose-500 bg-rose-500/5"
                      : "border-neutral-200 dark:border-[rgba(255,255,255,0.08)] text-neutral-600 dark:text-neutral-300"
                  }`}
                >
                  {selectedPrep.priority === "URGENT" ? "Lower Priority" : "Make Urgent 🚨"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {filteredPreparations.length === 0 && (
        <div className="text-center py-24 bg-white dark:bg-[#141414] border border-neutral-200 dark:border-[rgba(255,255,255,0.06)] rounded-2xl">
          <ChefHat className="size-14 text-neutral-300 dark:text-[#5a5650] mx-auto mb-4" />
          <p className="text-neutral-800 dark:text-[#f0ece4] font-bold text-lg">No tickets active</p>
          <p className="text-neutral-400 dark:text-[#9a9488] text-sm mt-1">Orders will chime here automatically when placed.</p>
        </div>
      )}
    </div>
  );
}
