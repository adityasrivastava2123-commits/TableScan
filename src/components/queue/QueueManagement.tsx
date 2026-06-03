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
        style: { background: "#0b0a08", color: "#f5efe2", border: "1px solid rgba(255,255,255,0.08)" }
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
      case "WAITING": return "bg-[#f0a040]/10 text-[#f0a040] border-[#f0a040]/30";
      case "CALLED": return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
      case "SEATED": return "bg-[#52d27a]/10 text-[#52d27a] border border-[#52d27a]/20";
      case "CANCELLED": return "bg-white/5 text-[#f5efe2]/50 border border-white/10";
      default: return "bg-white/5 text-[#f5efe2]/50 border border-white/10";
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
    let ringColor = "stroke-[#52d27a]";
    if (progress >= 100) ringColor = "stroke-rose-500 animate-pulse";
    else if (progress >= 75) ringColor = "stroke-[#f0a040]";

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
      style: { background: "#0b0a08", color: "#f5efe2", border: "1px solid rgba(255,255,255,0.08)" }
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
    <div className="space-y-8 relative">
      
      {/* Slide-over Drawer Backdrop */}
      <AnimatePresence>
        {addingEntry && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-xs z-40"
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
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[#0b0a08] border-l border-[rgba(255,255,255,0.08)] shadow-2xl z-50 p-6 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-4 mb-6">
                <div>
                  <h2 className="text-[14px] font-mono-dashboard font-black text-[#f0a040] uppercase tracking-wider flex items-center gap-1.5">
                    Add Guest <Sparkles className="w-4 h-4 text-[#f0a040]" />
                  </h2>
                  <p className="text-[11px] text-[#f5efe2]/40 font-serif italic mt-0.5">Allocate real-time walk-in details</p>
                </div>
                <button 
                  onClick={() => setAddingEntry(false)}
                  className="w-8 h-8 rounded-full bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.08)] flex items-center justify-center text-[#f5efe2] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[#f5efe2]/40 text-[9px] font-mono-dashboard font-bold uppercase tracking-wider mb-1.5 block">Customer Name *</label>
                  <input
                    value={newEntry.customerName}
                    onChange={(e) => setNewEntry({ ...newEntry, customerName: e.target.value })}
                    placeholder="e.g. John Doe"
                    className="w-full h-10 bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] rounded-xl text-[#f5efe2] placeholder-[#f5efe2]/20 focus:outline-none focus:border-[#f0a040] text-[13px] px-3 font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[#f5efe2]/40 text-[9px] font-mono-dashboard font-bold uppercase tracking-wider mb-1.5 block">Phone Number *</label>
                  <input
                    value={newEntry.customerPhone}
                    onChange={(e) => setNewEntry({ ...newEntry, customerPhone: e.target.value })}
                    placeholder="e.g. +91 98765 43210"
                    type="tel"
                    className="w-full h-10 bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] rounded-xl text-[#f5efe2] placeholder-[#f5efe2]/20 focus:outline-none focus:border-[#f0a040] text-[13px] px-3 font-mono-dashboard"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[#f5efe2]/40 text-[9px] font-mono-dashboard font-bold uppercase tracking-wider mb-1.5 block">Guests / Seats</label>
                    <input
                      type="number"
                      value={newEntry.partySize}
                      onChange={(e) => setNewEntry({ ...newEntry, partySize: parseInt(e.target.value) || 2 })}
                      min="1"
                      className="w-full h-10 bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] rounded-xl text-[#f5efe2] focus:outline-none focus:border-[#f0a040] text-[13px] px-3 font-mono-dashboard"
                    />
                  </div>
                  <div>
                    <label className="text-[#f5efe2]/40 text-[9px] font-mono-dashboard font-bold uppercase tracking-wider mb-1.5 block">Est. Wait (min)</label>
                    <input
                      type="number"
                      value={newEntry.estimatedWaitTime}
                      onChange={(e) => setNewEntry({ ...newEntry, estimatedWaitTime: parseInt(e.target.value) || 15 })}
                      className="w-full h-10 bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] rounded-xl text-[#f5efe2] focus:outline-none focus:border-[#f0a040] text-[13px] px-3 font-mono-dashboard"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[#f5efe2]/40 text-[9px] font-mono-dashboard font-bold uppercase tracking-wider mb-1.5 block">Allocation Type</label>
                  <select
                    value={newEntry.type}
                    onChange={(e) => setNewEntry({ ...newEntry, type: e.target.value })}
                    className="w-full h-10 bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] rounded-xl text-[#f5efe2] focus:outline-none focus:border-[#f0a040] text-xs px-3 font-mono-dashboard uppercase"
                  >
                    <option value="DINE_IN">Dine In (Table)</option>
                    <option value="TAKEAWAY">Takeaway</option>
                    <option value="DELIVERY">Delivery</option>
                  </select>
                </div>
                <div>
                  <label className="text-[#f5efe2]/40 text-[9px] font-mono-dashboard font-bold uppercase tracking-wider mb-1.5 block">Table Preferences / Notes</label>
                  <textarea
                    value={newEntry.notes}
                    onChange={(e) => setNewEntry({ ...newEntry, notes: e.target.value })}
                    placeholder="e.g. Window seat preferred, baby chair needed..."
                    rows={3}
                    className="w-full bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] rounded-xl text-[#f5efe2] placeholder-[#f5efe2]/20 focus:outline-none focus:border-[#f0a040] text-[13px] px-3 py-2 font-medium resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 border-t border-[rgba(255,255,255,0.08)] pt-4">
              <button
                onClick={addQueueEntry}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-white text-[10px] font-mono-dashboard uppercase tracking-wider font-bold hover:brightness-110 shadow-lg shadow-[#f0a040]/10 transition-all"
              >
                Add Guest
              </button>
              <button
                onClick={() => setAddingEntry(false)}
                className="px-5 py-2.5 rounded-xl bg-transparent border border-[rgba(255,255,255,0.08)] text-[#f5efe2]/60 hover:text-white hover:bg-[rgba(255,255,255,0.02)] transition-colors text-[10px] font-mono-dashboard font-bold uppercase tracking-wider"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[rgba(255,255,255,0.08)] pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-[50px] h-[50px] rounded-2xl bg-gradient-to-tr from-[#f0a040] to-[#e85a2a] flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#f0a040]/15 border border-[#f0a040]/20">
            <Users className="size-5 text-white" />
          </div>
          <div>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#f0a040]">WAITLIST ARCHITECT</span>
            <h1 className="text-2xl font-bold tracking-tight text-[#f5efe2] font-editorial italic mt-0.5">
              Queue & Seating
            </h1>
            <p className="text-[11px] text-[#f5efe2]/50 font-serif italic mt-0.5">
              Real-time walk-in guest records, guest calling, and table seats layout tracking
            </p>
          </div>
        </div>
        <div>
          <button
            onClick={() => setAddingEntry(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-white text-[10px] font-mono-dashboard uppercase tracking-wider font-bold hover:brightness-110 shadow-lg shadow-[#f0a040]/10 transition-all"
          >
            <Plus className="size-4" /> Add Walk-in Guest
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0b0a08]/40 border border-[rgba(255,255,255,0.08)] backdrop-blur-md rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[9px] uppercase tracking-widest text-[#f5efe2]/40 font-mono-dashboard block mb-1">Waiting Guests</span>
            <span className="text-xl font-bold text-[#f0a040] font-mono-dashboard">{queueEntries.filter((e) => e.status === "WAITING").length}</span>
          </div>
          <Clock className="w-8 h-8 text-[#f0a040]/15" />
        </div>
        <div className="bg-[#0b0a08]/40 border border-[rgba(255,255,255,0.08)] backdrop-blur-md rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[9px] uppercase tracking-widest text-[#f5efe2]/40 font-mono-dashboard block mb-1">Called (Alerted)</span>
            <span className="text-xl font-bold text-blue-400 font-mono-dashboard">{queueEntries.filter((e) => e.status === "CALLED").length}</span>
          </div>
          <Bell className="w-8 h-8 text-blue-500/15" />
        </div>
        <div className="bg-[#0b0a08]/40 border border-[rgba(255,255,255,0.08)] backdrop-blur-md rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[9px] uppercase tracking-widest text-[#f5efe2]/40 font-mono-dashboard block mb-1">Seated Today</span>
            <span className="text-xl font-bold text-[#52d27a] font-mono-dashboard">{queueEntries.filter((e) => e.status === "SEATED").length}</span>
          </div>
          <CheckCircle className="w-8 h-8 text-[#52d27a]/15" />
        </div>
        <div className="bg-[#0b0a08]/40 border border-[rgba(255,255,255,0.08)] backdrop-blur-md rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[9px] uppercase tracking-widest text-[#f5efe2]/40 font-mono-dashboard block mb-1">Total Queue</span>
            <span className="text-xl font-bold text-[#f5efe2] font-mono-dashboard">{queueEntries.filter((e) => e.status !== "SEATED" && e.status !== "CANCELLED").length}</span>
          </div>
          <Users className="w-8 h-8 text-white/10" />
        </div>
      </div>

      {/* Filters Segment */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] rounded-xl p-1 shadow-sm">
          {["all", "WAITING", "CALLED", "SEATED"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-mono-dashboard font-black uppercase tracking-wider transition-all ${
                filter === f
                  ? "bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-white shadow-sm"
                  : "text-[#f5efe2]/40 hover:text-white"
              }`}
            >
              {f === "all" ? "All Waitlist" : f}
            </button>
          ))}
        </div>
        
        <div className="flex bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] rounded-xl p-1 shadow-sm">
          {["all", "DINE_IN", "TAKEAWAY", "DELIVERY"].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-mono-dashboard font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                typeFilter === t
                  ? "bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-white shadow-sm"
                  : "text-[#f5efe2]/40 hover:text-white"
              }`}
            >
              {getTypeIcon(t)}
              {t === "all" ? "All Types" : t.replace("_", " ")}
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
                className={`bg-[#0b0a08]/40 border border-[rgba(255,255,255,0.08)] backdrop-blur-md rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4`}
              >
                {/* Visual Progress Line Indicator on Card Edge */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                  entry.status === "SEATED" ? "bg-[#52d27a]" :
                  entry.status === "CALLED" ? "bg-blue-500 animate-pulse" : "bg-[#f0a040]"
                }`} />

                <div className="flex items-center gap-4 pl-1">
                  {/* Circular Wait Timer */}
                  {entry.status === "WAITING" && (
                    <div className="relative w-12 h-12 flex items-center justify-center flex-shrink-0">
                      <svg className="absolute w-full h-full -rotate-90">
                        <circle cx="24" cy="24" r="20" className="stroke-[rgba(255,255,255,0.04)] fill-none" strokeWidth="3" />
                        <circle cx="24" cy="24" r="20" className={`${ringColor} fill-none transition-all duration-1000`} strokeWidth="3.5"
                          strokeDasharray={`${2 * Math.PI * 20}`}
                          strokeDashoffset={`${2 * Math.PI * 20 * (1 - progress / 100)}`}
                          strokeLinecap="round" />
                      </svg>
                      <span className="text-[11px] font-black text-[#f5efe2] font-mono-dashboard tabular-nums">{elapsed}M</span>
                    </div>
                  )}

                  {entry.status !== "WAITING" && (
                    <div className="w-12 h-12 rounded-full bg-[#0b0a08] flex items-center justify-center flex-shrink-0 border border-[rgba(255,255,255,0.08)]">
                      <span className="text-[10px] font-mono-dashboard font-black text-[#f5efe2]/40">#{index + 1}</span>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-base text-[#f5efe2] tracking-tight leading-none">{entry.customerName}</h3>
                      <span className={`text-[8px] px-2 py-0.5 rounded-full font-mono-dashboard font-black uppercase tracking-wider ${getStatusStyle(entry.status)}`}>
                        {entry.status}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3 text-[10px] font-mono-dashboard font-bold mt-1.5 flex-wrap text-[#f5efe2]/40">
                      <span className="flex items-center gap-1.5">
                        <Phone className="size-3 text-[#f5efe2]/30" /> {entry.customerPhone}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1.5 uppercase">
                        {getTypeIcon(entry.type)} {entry.type.replace("_", " ")}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1.5">
                        <Users className="size-3 text-[#f5efe2]/30" /> {entry.partySize} GUESTS
                      </span>
                    </div>

                    {entry.notes && (
                      <p className="text-[10px] text-[#f5efe2]/60 font-serif italic mt-2 bg-[#0b0a08] px-2.5 py-1 rounded-lg w-fit border border-[rgba(255,255,255,0.06)]">
                        📝 {entry.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Seating controls / Actions */}
                <div className="flex items-center gap-2 pl-5 sm:pl-0 sm:border-l border-[rgba(255,255,255,0.08)] sm:py-2 sm:pl-6" onClick={(e) => e.stopPropagation()}>
                  {entry.status === "WAITING" && (
                    <>
                      <button
                        onClick={() => triggerSMSAlert(entry)}
                        className="p-2.5 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.08)] text-[#f5efe2]/50 hover:text-[#f0a040] transition-colors"
                        title="Simulate SMS Alert"
                      >
                        <Bell className="size-4" />
                      </button>
                      <button
                        onClick={() => updateQueueStatus(entry.id, "CALLED")}
                        className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-mono-dashboard font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-md shadow-blue-500/10"
                      >
                        <Timer className="size-3.5" /> Call Guest
                      </button>
                      <button
                        onClick={() => updateQueueStatus(entry.id, "SEATED")}
                        className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#52d27a] to-emerald-600 text-white text-[10px] font-mono-dashboard font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-md shadow-emerald-500/10"
                      >
                        <CheckCircle className="size-3.5" /> Seat Guest
                      </button>
                    </>
                  )}
                  {entry.status === "CALLED" && (
                    <>
                      <button
                        onClick={() => triggerSMSAlert(entry)}
                        className="p-2.5 rounded-xl bg-[rgba(240,160,64,0.05)] border border-[rgba(240,160,64,0.2)] text-[#f0a040] transition-colors animate-bounce"
                        title="Simulate Resend SMS Alert"
                      >
                        <Bell className="size-4" />
                      </button>
                      <button
                        onClick={() => updateQueueStatus(entry.id, "SEATED")}
                        className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-[#52d27a] to-emerald-600 text-white text-[10px] font-mono-dashboard font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-md shadow-emerald-500/10"
                      >
                        <CheckCircle className="size-3.5" /> Seat Guest
                      </button>
                    </>
                  )}
                  {entry.status !== "SEATED" && entry.status !== "CANCELLED" && (
                    <button
                      onClick={() => updateQueueStatus(entry.id, "CANCELLED")}
                      className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-500 transition-colors"
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
        <div className="text-center py-24 bg-[#0b0a08]/40 border border-[rgba(255,255,255,0.08)] backdrop-blur-md rounded-2xl max-w-4xl">
          <Users className="size-14 text-[#f5efe2]/20 mx-auto mb-4" />
          <p className="text-[#f5efe2] font-editorial italic text-lg leading-none">Your waitlist is clear</p>
          <p className="text-[#f5efe2]/40 font-serif italic text-sm mt-2">Click the Add Walk-in Guest button to add walk-in customers.</p>
        </div>
      )}
    </div>
  );
}
