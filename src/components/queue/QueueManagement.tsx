"use client";

import { useState, useEffect } from "react";
import { Users, Clock, Phone, CheckCircle, XCircle, Bell, Plus, UtensilsCrossed, ShoppingBag } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface QueueEntry {
  id: string;
  customerName: string;
  customerPhone: string;
  partySize: number;
  type: string;
  status: string;
  estimatedWaitTime?: number;
  actualWaitTime?: number;
  calledAt?: Date;
  seatedAt?: Date;
  notes?: string;
  createdAt: Date;
}

export default function QueueManagement({ restaurantId }: { restaurantId: string }) {
  const [queueEntries, setQueueEntries] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [minLoading, setMinLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, waiting, called, seated
  const [typeFilter, setTypeFilter] = useState("all"); // all, dine_in, takeaway, delivery
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
          setTimeout(() => {
            if (mounted) {
              setLoading(false);
              setMinLoading(false);
            }
          }, 300);
        }
      }
    };

    loadData();

    const interval = setInterval(fetchQueueEntries, 30000); // Refresh every 30 seconds
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
      toast.success("Added to queue!");
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
      toast.success("Queue updated");
      fetchQueueEntries();
    } catch (error) {
      toast.error("Failed to update queue");
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "WAITING": return "bg-[rgba(249,115,22,0.1)] text-[#f97316] border-[rgba(249,115,22,0.3)]";
      case "CALLED": return "bg-[rgba(59,130,246,0.1)] text-[#60a5fa] border-[rgba(59,130,246,0.3)]";
      case "SEATED": return "bg-[rgba(34,197,94,0.1)] text-[#4ade80] border-[rgba(34,197,94,0.3)]";
      case "CANCELLED": return "bg-[rgba(100,116,139,0.1)] text-[#94a3b8] border-[rgba(100,116,139,0.3)]";
      default: return "bg-[rgba(255,255,255,0.05)] text-[#9a9488] border-[rgba(255,255,255,0.1)]";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "DINE_IN": return <UtensilsCrossed className="size-3" />;
      case "TAKEAWAY": return <ShoppingBag className="size-3" />;
      case "DELIVERY": return <Users className="size-3" />;
      default: return <Users className="size-3" />;
    }
  };

  const getWaitTime = (entry: QueueEntry) => {
    if (entry.actualWaitTime) return `${entry.actualWaitTime}m`;
    if (entry.estimatedWaitTime) return `~${entry.estimatedWaitTime}m`;
    const elapsed = Math.floor((new Date().getTime() - new Date(entry.createdAt).getTime()) / 60000);
    return `${elapsed}m`;
  };

  const filteredEntries = queueEntries.filter((e) => {
    if (filter === "all" && typeFilter === "all") return true;
    if (filter !== "all" && typeFilter === "all") return e.status === filter;
    if (filter === "all" && typeFilter !== "all") return e.type === typeFilter;
    return e.status === filter && e.type === typeFilter;
  });

  if (minLoading) {
    return (
      <div className="p-7 space-y-6">
        <div className="flex items-center gap-3.5 flex-wrap">
          <Skeleton className="w-[46px] h-[46px] rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-7 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3.5 flex-wrap">
        <div className="w-[46px] h-[46px] rounded-xl bg-[#f97316] flex items-center justify-center flex-shrink-0">
          <Users className="size-5 text-white" />
        </div>
        <div>
          <h1 className="text-[20px] font-bold text-[#f0ece4]">Queue Management</h1>
          <p className="text-[12px] text-[#9a9488]">Real-time wait time tracking</p>
        </div>
        <div className="ml-auto flex gap-2.5">
          <button
            onClick={() => setAddingEntry(true)}
            className="px-4 py-2.5 rounded-lg bg-[#f97316] text-white text-[12px] font-semibold hover:bg-[#ea6c0a] transition-all"
          >
            + Add to Queue
          </button>
        </div>
      </div>

      {/* Add Entry Form */}
      {addingEntry && (
        <div className="bg-[#111111] border border-[rgba(255,255,255,0.07)] rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[#f0ece4] text-[12px] font-medium mb-1 block">Customer Name *</label>
              <input
                value={newEntry.customerName}
                onChange={(e) => setNewEntry({ ...newEntry, customerName: e.target.value })}
                placeholder="Full name"
                className="w-full h-10 bg-[#222222] border-[rgba(255,255,255,0.12)] text-[#f0ece4] placeholder-[#5a5650] focus:border-[#f97316] text-[13px] px-3"
              />
            </div>
            <div>
              <label className="text-[#f0ece4] text-[12px] font-medium mb-1 block">Phone *</label>
              <input
                value={newEntry.customerPhone}
                onChange={(e) => setNewEntry({ ...newEntry, customerPhone: e.target.value })}
                placeholder="Phone number"
                className="w-full h-10 bg-[#222222] border-[rgba(255,255,255,0.12)] text-[#f0ece4] placeholder-[#5a5650] focus:border-[#f97316] text-[13px] px-3"
              />
            </div>
            <div>
              <label className="text-[#f0ece4] text-[12px] font-medium mb-1 block">Party Size</label>
              <input
                type="number"
                value={newEntry.partySize}
                onChange={(e) => setNewEntry({ ...newEntry, partySize: parseInt(e.target.value) || 2 })}
                min="1"
                className="w-full h-10 bg-[#222222] border-[rgba(255,255,255,0.12)] text-[#f0ece4] placeholder-[#5a5650] focus:border-[#f97316] text-[13px] px-3"
              />
            </div>
            <div>
              <label className="text-[#f0ece4] text-[12px] font-medium mb-1 block">Type</label>
              <select
                value={newEntry.type}
                onChange={(e) => setNewEntry({ ...newEntry, type: e.target.value })}
                className="w-full h-10 bg-[#222222] border-[rgba(255,255,255,0.12)] text-[#f0ece4] text-[13px] px-3 outline-none"
              >
                <option value="DINE_IN">Dine In</option>
                <option value="TAKEAWAY">Takeaway</option>
                <option value="DELIVERY">Delivery</option>
              </select>
            </div>
            <div>
              <label className="text-[#f0ece4] text-[12px] font-medium mb-1 block">Estimated Wait (min)</label>
              <input
                type="number"
                value={newEntry.estimatedWaitTime}
                onChange={(e) => setNewEntry({ ...newEntry, estimatedWaitTime: parseInt(e.target.value) || 15 })}
                className="w-full h-10 bg-[#222222] border-[rgba(255,255,255,0.12)] text-[#f0ece4] placeholder-[#5a5650] focus:border-[#f97316] text-[13px] px-3"
              />
            </div>
          </div>
          <div>
            <label className="text-[#f0ece4] text-[12px] font-medium mb-1 block">Notes</label>
            <input
              value={newEntry.notes}
              onChange={(e) => setNewEntry({ ...newEntry, notes: e.target.value })}
              placeholder="Any special notes"
              className="w-full h-10 bg-[#222222] border-[rgba(255,255,255,0.12)] text-[#f0ece4] placeholder-[#5a5650] focus:border-[#f97316] text-[13px] px-3"
            />
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={addQueueEntry}
              className="px-4 py-2 rounded-lg bg-[#f97316] text-white text-[12px] font-semibold hover:bg-[#ea6c0a] transition-colors"
            >
              Add to Queue
            </button>
            <button
              onClick={() => {
                setAddingEntry(false);
                setNewEntry({
                  customerName: "",
                  customerPhone: "",
                  partySize: 2,
                  type: "DINE_IN",
                  estimatedWaitTime: 15,
                  notes: "",
                });
              }}
              className="px-4 py-2 rounded-lg bg-[#222222] border border-[rgba(255,255,255,0.12)] text-[#f0ece4] hover:bg-[#181818] transition-colors text-[12px]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
        <div className="bg-[#111111] border border-[rgba(255,255,255,0.07)] rounded-xl p-5">
          <div className="text-[11px] text-[#5a5650] mb-1">Waiting</div>
          <div className="text-[26px] font-bold text-[#f97316]">{queueEntries.filter((e) => e.status === "WAITING").length}</div>
        </div>
        <div className="bg-[#111111] border border-[rgba(255,255,255,0.07)] rounded-xl p-5">
          <div className="text-[11px] text-[#5a5650] mb-1">Called</div>
          <div className="text-[26px] font-bold text-[#60a5fa]">{queueEntries.filter((e) => e.status === "CALLED").length}</div>
        </div>
        <div className="bg-[#111111] border border-[rgba(255,255,255,0.07)] rounded-xl p-5">
          <div className="text-[11px] text-[#5a5650] mb-1">Seated</div>
          <div className="text-[26px] font-bold text-[#4ade80]">{queueEntries.filter((e) => e.status === "SEATED").length}</div>
        </div>
        <div className="bg-[#111111] border border-[rgba(255,255,255,0.07)] rounded-xl p-5">
          <div className="text-[11px] text-[#5a5650] mb-1">Total in Queue</div>
          <div className="text-[26px] font-bold text-[#f0ece4]">{queueEntries.filter((e) => e.status !== "SEATED" && e.status !== "CANCELLED").length}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex gap-2">
          {["all", "WAITING", "CALLED", "SEATED"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-[12px] font-semibold transition-all ${
                filter === f
                  ? "bg-[#f97316] text-white"
                  : "bg-[#222222] border border-[rgba(255,255,255,0.12)] text-[#f0ece4] hover:border-[#f97316]"
              }`}
            >
              {f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {["all", "DINE_IN", "TAKEAWAY", "DELIVERY"].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-4 py-2 rounded-lg text-[12px] font-semibold transition-all flex items-center gap-1 ${
                typeFilter === t
                  ? "bg-[#f97316] text-white"
                  : "bg-[#222222] border border-[rgba(255,255,255,0.12)] text-[#f0ece4] hover:border-[#f97316]"
              }`}
            >
              {getTypeIcon(t)}
              {t === "all" ? "All" : t.charAt(0) + t.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Queue List */}
      <div className="space-y-3">
        {filteredEntries.map((entry, index) => (
          <div
            key={entry.id}
            className={`bg-[#111111] border ${getStatusColor(entry.status)} rounded-xl p-5`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-[40px] h-[40px] rounded-lg bg-[#222222] flex items-center justify-center">
                  <span className="text-[18px] font-bold text-[#f0ece4]">#{index + 1}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[16px] font-semibold text-[#f0ece4]">{entry.customerName}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-lg font-medium ${getStatusColor(entry.status)}`}>
                      {entry.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-[#9a9488]">
                    <span className="flex items-center gap-1">
                      <Phone className="size-3" />
                      {entry.customerPhone}
                    </span>
                    <span className="flex items-center gap-1">
                      {getTypeIcon(entry.type)}
                      {entry.type.replace("_", " ")}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="size-3" />
                      {entry.partySize} guests
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-[11px] text-[#9a9488]">
                  <Clock className="size-3" />
                  <span>{getWaitTime(entry)}</span>
                </div>
                <div className="text-[10px] text-[#5a5650] mt-1">
                  {new Date(entry.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {entry.status === "WAITING" && (
                <>
                  <button
                    onClick={() => updateQueueStatus(entry.id, "CALLED")}
                    className="flex-1 py-2 rounded-lg bg-[#60a5fa] text-white text-[12px] font-semibold hover:bg-[#3b82f6] transition-colors flex items-center justify-center gap-1"
                  >
                    <Bell className="size-3" />
                    Call
                  </button>
                  <button
                    onClick={() => updateQueueStatus(entry.id, "SEATED")}
                    className="flex-1 py-2 rounded-lg bg-[#4ade80] text-white text-[12px] font-semibold hover:bg-[#22c55e] transition-colors flex items-center justify-center gap-1"
                  >
                    <CheckCircle className="size-3" />
                    Seat
                  </button>
                </>
              )}
              {entry.status === "CALLED" && (
                <button
                  onClick={() => updateQueueStatus(entry.id, "SEATED")}
                  className="flex-1 py-2 rounded-lg bg-[#4ade80] text-white text-[12px] font-semibold hover:bg-[#22c55e] transition-colors flex items-center justify-center gap-1"
                >
                  <CheckCircle className="size-3" />
                  Seat
                </button>
              )}
              {entry.status !== "SEATED" && entry.status !== "CANCELLED" && (
                <button
                  onClick={() => updateQueueStatus(entry.id, "CANCELLED")}
                  className="px-3 py-2 rounded-lg bg-[#f87171] text-white text-[12px] font-semibold hover:bg-[#ef4444] transition-colors"
                >
                  <XCircle className="size-3" />
                </button>
              )}
            </div>

            {entry.notes && (
              <div className="mt-3 text-[11px] text-[#9a9488] italic">{entry.notes}</div>
            )}
          </div>
        ))}
      </div>

      {filteredEntries.length === 0 && (
        <div className="text-center py-16">
          <Users className="size-12 text-[#5a5650] mx-auto mb-4" />
          <p className="text-[12px] text-[#5a5650]">No entries in queue</p>
          <p className="text-[11px] text-[#5a5650] mt-1">Add customers to start managing the queue</p>
        </div>
      )}
    </div>
  );
}
