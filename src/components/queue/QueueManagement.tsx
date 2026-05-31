"use client";

import { useState, useEffect } from "react";
import { Users, Clock, Phone, CheckCircle, XCircle, Bell, Plus, UtensilsCrossed, ShoppingBag, X, MessageSquare, Timer, Sparkles } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";

interface QueueEntry {
  id: string;
  customerName: string;
  customerPhone: string;
  partySize: number;
  type: string;
  status: string;
  estimatedWaitTime?: number;
  actualWaitTime?: number;
  calledAt?: string;
  seatedAt?: string;
  notes?: string;
  createdAt: string;
}

export default function QueueManagement({ restaurantId }: { restaurantId: string }) {
  const [queueEntries, setQueueEntries] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [minLoading, setMinLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, WAITING, CALLED, SEATED
  const [typeFilter, setTypeFilter] = useState("all"); // all, DINE_IN, TAKEAWAY, DELIVERY
  const [addingEntry, setAddingEntry] = useState(false);
  const [newEntry, setNewEntry] = useState({
    customerName: "",
    customerPhone: "",
    partySize: 2,
    type: "DINE_IN",
    estimatedWaitTime: 15,
    notes: "",
  });

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        await fetchQueueEntries();
      } finally {
        if (mounted) {
          setLoading(false);
          setMinLoading(false);
        }
      }
    };

    loadData();

    const interval = setInterval(fetchQueueEntries, 15000); // Poll every 15s
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [restaurantId, filter, typeFilter]);

  async function fetchQueueEntries() {
    try {
      const response = await axios.get(`/api/queue?restaurantId=${restaurantId}${filter !== "all" ? `&status=${filter}` : ""}${typeFilter !== "all" ? `&type=${typeFilter}` : ""}`);
      setQueueEntries(response.data);
    } catch (error) {
      console.error("Failed to load queue entries");
    }
  }

  async function addQueueEntry() {
    if (!newEntry.customerName || !newEntry.customerPhone) {
      toast.error("Name and phone are required");
      return;
    }

    try {
      await axios.post("/api/queue", {
        ...newEntry,
        restaurantId,
      });
      toast.success("Added to waitlist!", {
        icon: "📋",
        style: { background: "#ffffff", color: "#1a1a1a", border: "1px solid rgba(0,0,0,0.05)" }
      });
      setNewEntry({
        customerName: "",
        customerPhone: "",
        partySize: 2,
        type: "DINE_IN",
        estimatedWaitTime: 15,
        notes: "",
      });
      setAddingEntry(false);
      fetchQueueEntries();
    } catch (error) {
      toast.error("Failed to add to queue");
    }
  }

  async function updateQueueStatus(id: string, status: string) {
    try {
      await axios.patch(`/api/queue/${id}`, { status });
      toast.success(`Customer status is now ${status.toLowerCase()}!`);
      fetchQueueEntries();
    } catch (error) {
      toast.error("Failed to update queue status");
    }
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "WAITING": return "bg-[#f97316]/10 text-[#f97316] border-[#f97316]/30";
      case "CALLED": return "bg-blue-500/10 text-blue-500 border-blue-500/30";
      case "SEATED": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/30";
      case "CANCELLED": return "bg-neutral-500/10 text-neutral-400 border-neutral-500/20";
      default: return "bg-neutral-500/10 text-neutral-400 border-neutral-500/20";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "DINE_IN": return <UtensilsCrossed className="size-3.5" />;
      case "TAKEAWAY": return <ShoppingBag className="size-3.5" />;
      case "DELIVERY": return <Users className="size-3.5" />;
      default: return <Users className="size-3.5" />;
    }
  };

  const getWaitProgressDetails = (entry: QueueEntry) => {
    const elapsed = Math.floor((new Date().getTime() - new Date(entry.createdAt).getTime()) / 60000); // minutes
    const estimate = entry.estimatedWaitTime || 15;
    const progress = Math.min(100, Math.floor((elapsed / estimate) * 100));
    
    // Choose ring color based on wait progress
    let ringColor = "stroke-emerald-500";
    if (progress >= 100) ringColor = "stroke-rose-500 animate-pulse";
    else if (progress >= 75) ringColor = "stroke-amber-500";

    return { elapsed, progress, ringColor };
  };

  const filteredEntries = queueEntries.filter((e) => {
    if (filter === "all" && typeFilter === "all") return true;
    if (filter !== "all" && typeFilter === "all") return e.status === filter;
    if (filter === "all" && typeFilter !== "all") return e.type === typeFilter;
    return e.status === filter && e.type === typeFilter;
  });

  const triggerSMSAlert = (entry: QueueEntry) => {
    toast.success(`Waitlist alert SMS sent to ${entry.customerName}!`, {
      icon: "✉️",
      style: { background: "#ffffff", color: "#1a1a1a", border: "1px solid rgba(0,0,0,0.05)" }
    });
  };

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
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl bg-neutral-200 dark:bg-neutral-800" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-xl bg-neutral-200 dark:bg-neutral-800" />
          <Skeleton className="h-64 rounded-xl bg-neutral-200 dark:bg-neutral-800" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-7 space-y-6 min-h-screen bg-[#f9f9f6] dark:bg-[#0a0a0a] relative overflow-hidden">
      
      {/* Slide-over Drawer Backdrop */}
      <AnimatePresence>
        {addingEntry && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-40"
            onClick={() => setAddingEntry(false)}
          />
        )}
      </AnimatePresence>

      {/* Slide-over Drawer for Adding Waitlist */}
      <AnimatePresence>
        {addingEntry && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-[#141414] border-l border-neutral-200 dark:border-[rgba(255,255,255,0.06)] shadow-2xl z-50 p-6 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between border-b border-neutral-100 dark:border-[rgba(255,255,255,0.05)] pb-4 mb-6">
                <div>
                  <h2 className="text-lg font-black text-neutral-800 dark:text-white tracking-tight flex items-center gap-1.5">
                    Add Guest to Waitlist <Sparkles className="w-4 h-4 text-[#f97316]" />
                  </h2>
                  <p className="text-[11px] text-neutral-400">Allocate real-time walk-in details</p>
                </div>
                <button 
                  onClick={() => setAddingEntry(false)}
                  className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-[#222] flex items-center justify-center text-neutral-500 hover:text-neutral-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-neutral-500 dark:text-[#9a9488] text-[11px] font-bold uppercase tracking-wider mb-1 block">Customer Name *</label>
                  <input
                    value={newEntry.customerName}
                    onChange={(e) => setNewEntry({ ...newEntry, customerName: e.target.value })}
                    placeholder="e.g. John Doe"
                    className="w-full h-11 bg-neutral-50 dark:bg-[#1c1c1c] border border-neutral-200 dark:border-[rgba(255,255,255,0.08)] rounded-xl text-neutral-800 dark:text-white placeholder-neutral-400 focus:outline-none focus:border-[#f97316] text-[13px] px-3 font-semibold"
                  />
                </div>
                <div>
                  <label className="text-neutral-500 dark:text-[#9a9488] text-[11px] font-bold uppercase tracking-wider mb-1 block">Phone Number *</label>
                  <input
                    value={newEntry.customerPhone}
                    onChange={(e) => setNewEntry({ ...newEntry, customerPhone: e.target.value })}
                    placeholder="e.g. +91 98765 43210"
                    type="tel"
                    className="w-full h-11 bg-neutral-50 dark:bg-[#1c1c1c] border border-neutral-200 dark:border-[rgba(255,255,255,0.08)] rounded-xl text-neutral-800 dark:text-white placeholder-neutral-400 focus:outline-none focus:border-[#f97316] text-[13px] px-3 font-semibold"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-neutral-500 dark:text-[#9a9488] text-[11px] font-bold uppercase tracking-wider mb-1 block">Guests / Seats</label>
                    <input
                      type="number"
                      value={newEntry.partySize}
                      onChange={(e) => setNewEntry({ ...newEntry, partySize: parseInt(e.target.value) || 2 })}
                      min="1"
                      className="w-full h-11 bg-neutral-50 dark:bg-[#1c1c1c] border border-neutral-200 dark:border-[rgba(255,255,255,0.08)] rounded-xl text-neutral-800 dark:text-white focus:outline-none focus:border-[#f97316] text-[13px] px-3 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-neutral-500 dark:text-[#9a9488] text-[11px] font-bold uppercase tracking-wider mb-1 block">Est. Wait (min)</label>
                    <input
                      type="number"
                      value={newEntry.estimatedWaitTime}
                      onChange={(e) => setNewEntry({ ...newEntry, estimatedWaitTime: parseInt(e.target.value) || 15 })}
                      className="w-full h-11 bg-neutral-50 dark:bg-[#1c1c1c] border border-neutral-200 dark:border-[rgba(255,255,255,0.08)] rounded-xl text-neutral-800 dark:text-white focus:outline-none focus:border-[#f97316] text-[13px] px-3 font-semibold"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-neutral-500 dark:text-[#9a9488] text-[11px] font-bold uppercase tracking-wider mb-1 block">Allocation Type</label>
                  <select
                    value={newEntry.type}
                    onChange={(e) => setNewEntry({ ...newEntry, type: e.target.value })}
                    className="w-full h-11 bg-neutral-50 dark:bg-[#1c1c1c] border border-neutral-200 dark:border-[rgba(255,255,255,0.08)] rounded-xl text-neutral-800 dark:text-white focus:outline-none focus:border-[#f97316] text-[13px] px-3 font-bold"
                  >
                    <option value="DINE_IN">Dine In (Table)</option>
                    <option value="TAKEAWAY">Takeaway</option>
                    <option value="DELIVERY">Delivery</option>
                  </select>
                </div>
                <div>
                  <label className="text-neutral-500 dark:text-[#9a9488] text-[11px] font-bold uppercase tracking-wider mb-1 block">Table Preferences / Notes</label>
                  <textarea
                    value={newEntry.notes}
                    onChange={(e) => setNewEntry({ ...newEntry, notes: e.target.value })}
                    placeholder="e.g. Window seat preferred, baby chair needed..."
                    rows={3}
                    className="w-full bg-neutral-50 dark:bg-[#1c1c1c] border border-neutral-200 dark:border-[rgba(255,255,255,0.08)] rounded-xl text-neutral-800 dark:text-white placeholder-neutral-400 focus:outline-none focus:border-[#f97316] text-[13px] px-3 py-2 font-medium resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 border-t border-neutral-100 dark:border-[rgba(255,255,255,0.05)] pt-4">
              <button
                onClick={addQueueEntry}
                className="flex-1 py-3 rounded-xl bg-[#f97316] text-white text-[13px] font-bold hover:bg-[#ea6c0a] transition-colors cursor-pointer shadow-lg shadow-[#f97316]/20"
              >
                Add Guest
              </button>
              <button
                onClick={() => setAddingEntry(false)}
                className="px-5 py-3 rounded-xl bg-neutral-100 dark:bg-[#222] text-neutral-600 dark:text-neutral-300 text-[13px] font-bold hover:bg-neutral-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center gap-3.5 flex-wrap border-b border-neutral-200 dark:border-[rgba(255,255,255,0.06)] pb-5">
        <div className="w-[46px] h-[46px] rounded-xl bg-[#f97316] flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#f97316]/20">
          <Users className="size-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-800 dark:text-[#f0ece4] tracking-tight">Waitlist Manager</h1>
          <p className="text-[12px] text-neutral-500 dark:text-[#9a9488]">Real-time customer queue and table seating</p>
        </div>
        <div className="ml-auto">
          <button
            onClick={() => setAddingEntry(true)}
            className="px-5 py-3 rounded-xl bg-[#f97316] text-white text-[13px] font-bold hover:bg-[#ea6c0a] transition-all cursor-pointer shadow-lg shadow-[#f97316]/20"
          >
            + Add Walk-in Guest
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#141414] border border-neutral-200 dark:border-[rgba(255,255,255,0.06)] rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">Waiting Guests</span>
            <span className="text-2xl font-black text-[#f97316]">{queueEntries.filter((e) => e.status === "WAITING").length}</span>
          </div>
          <Clock className="w-8 h-8 text-[#f97316]/20" />
        </div>
        <div className="bg-white dark:bg-[#141414] border border-neutral-200 dark:border-[rgba(255,255,255,0.06)] rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">Called (Alerted)</span>
            <span className="text-2xl font-black text-blue-500">{queueEntries.filter((e) => e.status === "CALLED").length}</span>
          </div>
          <Bell className="w-8 h-8 text-blue-500/20" />
        </div>
        <div className="bg-white dark:bg-[#141414] border border-neutral-200 dark:border-[rgba(255,255,255,0.06)] rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">Seated Today</span>
            <span className="text-2xl font-black text-emerald-500">{queueEntries.filter((e) => e.status === "SEATED").length}</span>
          </div>
          <CheckCircle className="w-8 h-8 text-emerald-500/20" />
        </div>
        <div className="bg-white dark:bg-[#141414] border border-neutral-200 dark:border-[rgba(255,255,255,0.06)] rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">Total Waitlist</span>
            <span className="text-2xl font-black text-neutral-800 dark:text-[#f0ece4]">{queueEntries.filter((e) => e.status !== "SEATED" && e.status !== "CANCELLED").length}</span>
          </div>
          <Users className="w-8 h-8 text-neutral-400/20" />
        </div>
      </div>

      {/* Filters Segment */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex bg-white dark:bg-[#141414] border border-neutral-200 dark:border-[rgba(255,255,255,0.06)] rounded-xl p-1 shadow-sm">
          {["all", "WAITING", "CALLED", "SEATED"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-[12px] font-bold transition-all cursor-pointer ${
                filter === f
                  ? "bg-[#f97316] text-white shadow-sm"
                  : "text-neutral-500 hover:text-neutral-800 dark:hover:text-white"
              }`}
            >
              {f === "all" ? "All Waitlist" : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        
        <div className="flex bg-white dark:bg-[#141414] border border-neutral-200 dark:border-[rgba(255,255,255,0.06)] rounded-xl p-1 shadow-sm">
          {["all", "DINE_IN", "TAKEAWAY", "DELIVERY"].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-4 py-2 rounded-lg text-[12px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                typeFilter === t
                  ? "bg-[#f97316] text-white shadow-sm"
                  : "text-neutral-500 hover:text-neutral-800 dark:hover:text-white"
              }`}
            >
              {getTypeIcon(t)}
              {t === "all" ? "All Types" : t.replace("_", " ").toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Queue Cards List */}
      <div className="space-y-4 max-w-4xl">
        <AnimatePresence mode="popLayout">
          {filteredEntries.map((entry, index) => {
            const { elapsed, progress, ringColor } = getWaitProgressDetails(entry);

            return (
              <motion.div
                key={entry.id}
                layout
                initial={{ opacity: 0, y: 15, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`bg-white dark:bg-[#141414] border border-neutral-200 dark:border-[rgba(255,255,255,0.06)] rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4`}
              >
                {/* Visual Progress Line Indicator on Card Edge */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                  entry.status === "SEATED" ? "bg-emerald-500" :
                  entry.status === "CALLED" ? "bg-blue-500 animate-pulse" : "bg-[#f97316]"
                }`} />

                <div className="flex items-center gap-4 pl-1">
                  {/* Circular Wait Timer */}
                  {entry.status === "WAITING" && (
                    <div className="relative w-12 h-12 flex items-center justify-center flex-shrink-0">
                      <svg className="absolute w-full h-full -rotate-90">
                        <circle cx="24" cy="24" r="20" className="stroke-neutral-100 dark:stroke-neutral-800 fill-none" strokeWidth="3" />
                        <circle cx="24" cy="24" r="20" className={`${ringColor} fill-none transition-all duration-1000`} strokeWidth="3.5"
                          strokeDasharray={`${2 * Math.PI * 20}`}
                          strokeDashoffset={`${2 * Math.PI * 20 * (1 - progress / 100)}`}
                          strokeLinecap="round" />
                      </svg>
                      <span className="text-[12px] font-extrabold text-neutral-800 dark:text-white tabular-nums">{elapsed}m</span>
                    </div>
                  )}

                  {entry.status !== "WAITING" && (
                    <div className="w-12 h-12 rounded-full bg-neutral-50 dark:bg-[#1e1e1e] flex items-center justify-center flex-shrink-0 border border-neutral-200/50 dark:border-[rgba(255,255,255,0.04)]">
                      <span className="text-sm font-extrabold text-neutral-400">#{index + 1}</span>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-base text-neutral-800 dark:text-[#f0ece4] tracking-tight leading-none">{entry.customerName}</h3>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${getStatusStyle(entry.status)}`}>
                        {entry.status}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3 text-[11px] text-neutral-400 font-bold mt-1.5 flex-wrap">
                      <span className="flex items-center gap-1.5">
                        <Phone className="size-3 text-neutral-300" /> {entry.customerPhone}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1.5 uppercase">
                        {getTypeIcon(entry.type)} {entry.type.replace("_", " ")}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1.5">
                        <Users className="size-3 text-neutral-300" /> {entry.partySize} guests
                      </span>
                    </div>

                    {entry.notes && (
                      <p className="text-[11px] text-neutral-400 italic mt-2 bg-neutral-50 dark:bg-[#1a1a1a] px-2.5 py-1 rounded-lg w-fit border border-neutral-100 dark:border-[rgba(255,255,255,0.04)]">
                        📝 {entry.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Seating controls / Actions */}
                <div className="flex items-center gap-2 pl-5 sm:pl-0 sm:border-l border-neutral-100 dark:border-[rgba(255,255,255,0.04)] sm:py-2 sm:pl-6" onClick={(e) => e.stopPropagation()}>
                  {entry.status === "WAITING" && (
                    <>
                      <button
                        onClick={() => triggerSMSAlert(entry)}
                        className="p-2.5 rounded-xl bg-neutral-50 dark:bg-[#1e1e1e] border border-neutral-200 dark:border-[rgba(255,255,255,0.06)] text-neutral-500 hover:text-[#f97316] transition-colors cursor-pointer"
                        title="Simulate SMS Alert"
                      >
                        <Bell className="size-4" />
                      </button>
                      <button
                        onClick={() => updateQueueStatus(entry.id, "CALLED")}
                        className="py-2.5 px-4 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-[12px] font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/10"
                      >
                        <Timer className="size-3.5" /> Call Guest
                      </button>
                      <button
                        onClick={() => updateQueueStatus(entry.id, "SEATED")}
                        className="py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-[12px] font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/10"
                      >
                        <CheckCircle className="size-3.5" /> Seat Guest
                      </button>
                    </>
                  )}
                  {entry.status === "CALLED" && (
                    <>
                      <button
                        onClick={() => triggerSMSAlert(entry)}
                        className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 transition-colors cursor-pointer animate-bounce"
                        title="Simulate Resend SMS Alert"
                      >
                        <Bell className="size-4" />
                      </button>
                      <button
                        onClick={() => updateQueueStatus(entry.id, "SEATED")}
                        className="py-2.5 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-[12px] font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/10"
                      >
                        <CheckCircle className="size-3.5" /> Seat Guest
                      </button>
                    </>
                  )}
                  {entry.status !== "SEATED" && entry.status !== "CANCELLED" && (
                    <button
                      onClick={() => updateQueueStatus(entry.id, "CANCELLED")}
                      className="p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-500 transition-colors cursor-pointer"
                      title="Cancel Waitlist Entry"
                    >
                      <XCircle className="size-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {filteredEntries.length === 0 && (
        <div className="text-center py-24 bg-white dark:bg-[#141414] border border-neutral-200 dark:border-[rgba(255,255,255,0.06)] rounded-2xl max-w-4xl">
          <Users className="size-14 text-neutral-300 dark:text-[#5a5650] mx-auto mb-4" />
          <p className="text-neutral-800 dark:text-[#f0ece4] font-bold text-lg">Your waitlist is clear</p>
          <p className="text-neutral-400 dark:text-[#9a9488] text-sm mt-1">Click the button in the header to add walk-in customers.</p>
        </div>
      )}
    </div>
  );
}
