"use client";

import { useState, useEffect } from "react";
import { Clock, ChefHat, CheckCircle, AlertTriangle, Play, Pause } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";

interface OrderItem {
  id: string;
  quantity: number;
  menuItem: {
    name: string;
  };
}

interface Order {
  id: string;
  orderNumber: string;
  items: OrderItem[];
  table?: {
    name: string;
  };
}

interface OrderPreparation {
  id: string;
  stage: string;
  startedAt?: Date;
  completedAt?: Date;
  estimatedPrepTime?: number;
  actualPrepTime?: number;
  priority: string;
  notes?: string;
  order: Order;
  createdAt: Date;
}

export default function KitchenDisplaySystem({ restaurantId }: { restaurantId: string }) {
  const [preparations, setPreparations] = useState<OrderPreparation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, received, preparing, ready

  useEffect(() => {
    fetchPreparations();
    const interval = setInterval(fetchPreparations, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [restaurantId, filter]);

  async function fetchPreparations() {
    try {
      const response = await axios.get(`/api/kds/order-preparations?restaurantId=${restaurantId}${filter !== "all" ? `&status=${filter}` : ""}`);
      setPreparations(response.data);
    } catch (error) {
      console.error("Failed to load preparations");
    } finally {
      setLoading(false);
    }
  }

  async function updateStage(id: string, stage: string) {
    try {
      await axios.patch(`/api/kds/order-preparations/${id}`, { stage });
      toast.success("Order updated");
      fetchPreparations();
    } catch (error) {
      toast.error("Failed to update order");
    }
  }

  async function updatePriority(id: string, priority: string) {
    try {
      await axios.patch(`/api/kds/order-preparations/${id}`, { priority });
      toast.success("Priority updated");
      fetchPreparations();
    } catch (error) {
      toast.error("Failed to update priority");
    }
  }

  const getElapsedTime = (startedAt?: Date) => {
    if (!startedAt) return 0;
    const elapsed = Math.floor((new Date().getTime() - new Date(startedAt).getTime()) / 60000); // minutes
    return elapsed;
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case "RECEIVED": return "bg-[rgba(59,130,246,0.1)] text-[#60a5fa] border-[rgba(59,130,246,0.3)]";
      case "PREPARING": return "bg-[rgba(249,115,22,0.1)] text-[#f97316] border-[rgba(249,115,22,0.3)]";
      case "READY": return "bg-[rgba(34,197,94,0.1)] text-[#4ade80] border-[rgba(34,197,94,0.3)]";
      case "SERVED": return "bg-[rgba(100,116,139,0.1)] text-[#94a3b8] border-[rgba(100,116,139,0.3)]";
      default: return "bg-[rgba(255,255,255,0.05)] text-[#9a9488] border-[rgba(255,255,255,0.1)]";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT": return "text-[#f87171]";
      case "HIGH": return "text-[#fb923c]";
      case "NORMAL": return "text-[#f97316]";
      case "LOW": return "text-[#9a9488]";
      default: return "text-[#9a9488]";
    }
  };

  const filteredPreparations = preparations.filter((p) => {
    if (filter === "all") return true;
    return p.stage === filter;
  });

  if (loading) {
    return <div className="text-center py-12 text-[#9a9488]">Loading kitchen display...</div>;
  }

  return (
    <div className="p-7 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3.5 flex-wrap">
        <div className="w-[46px] h-[46px] rounded-xl bg-[#f97316] flex items-center justify-center flex-shrink-0">
          <ChefHat className="size-5 text-white" />
        </div>
        <div>
          <h1 className="text-[20px] font-bold text-[#f0ece4]">Kitchen Display System</h1>
          <p className="text-[12px] text-[#9a9488]">Real-time order preparation tracking</p>
        </div>
        <div className="ml-auto flex gap-2">
          {["all", "RECEIVED", "PREPARING", "READY"].map((f) => (
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
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
        <div className="bg-[#111111] border border-[rgba(255,255,255,0.07)] rounded-xl p-5">
          <div className="text-[11px] text-[#5a5650] mb-1">Received</div>
          <div className="text-[26px] font-bold text-[#60a5fa]">{preparations.filter((p) => p.stage === "RECEIVED").length}</div>
        </div>
        <div className="bg-[#111111] border border-[rgba(255,255,255,0.07)] rounded-xl p-5">
          <div className="text-[11px] text-[#5a5650] mb-1">Preparing</div>
          <div className="text-[26px] font-bold text-[#f97316]">{preparations.filter((p) => p.stage === "PREPARING").length}</div>
        </div>
        <div className="bg-[#111111] border border-[rgba(255,255,255,0.07)] rounded-xl p-5">
          <div className="text-[11px] text-[#5a5650] mb-1">Ready</div>
          <div className="text-[26px] font-bold text-[#4ade80]">{preparations.filter((p) => p.stage === "READY").length}</div>
        </div>
        <div className="bg-[#111111] border border-[rgba(255,255,255,0.07)] rounded-xl p-5">
          <div className="text-[11px] text-[#5a5650] mb-1">Urgent</div>
          <div className="text-[26px] font-bold text-[#f87171]">{preparations.filter((p) => p.priority === "URGENT").length}</div>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPreparations.map((preparation) => (
          <div
            key={preparation.id}
            className={`bg-[#111111] border ${getStageColor(preparation.stage)} rounded-xl p-5 space-y-4`}
          >
            {/* Order Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[16px] font-bold text-[#f0ece4]">#{preparation.order.orderNumber}</span>
                  {preparation.priority !== "NORMAL" && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getPriorityColor(preparation.priority)}`}>
                      {preparation.priority}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-[#9a9488]">
                  {preparation.order.table?.name || "Takeaway"} · {new Date(preparation.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
              <div className={`text-[10px] px-2 py-1 rounded-lg font-medium ${getStageColor(preparation.stage)}`}>
                {preparation.stage}
              </div>
            </div>

            {/* Items */}
            <div className="space-y-2">
              {preparation.order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-[13px]">
                  <span className="text-[#f0ece4]">{item.quantity}x {item.menuItem.name}</span>
                </div>
              ))}
            </div>

            {/* Timer */}
            {preparation.stage === "PREPARING" && preparation.startedAt && (
              <div className="flex items-center gap-2 text-[11px] text-[#9a9488]">
                <Clock className="size-3" />
                <span>{getElapsedTime(preparation.startedAt)} min elapsed</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              {preparation.stage === "RECEIVED" && (
                <button
                  onClick={() => updateStage(preparation.id, "PREPARING")}
                  className="flex-1 py-2 rounded-lg bg-[#f97316] text-white text-[12px] font-semibold hover:bg-[#ea6c0a] transition-colors flex items-center justify-center gap-1"
                >
                  <Play className="size-3" />
                  Start
                </button>
              )}
              {preparation.stage === "PREPARING" && (
                <button
                  onClick={() => updateStage(preparation.id, "READY")}
                  className="flex-1 py-2 rounded-lg bg-[#4ade80] text-white text-[12px] font-semibold hover:bg-[#22c55e] transition-colors flex items-center justify-center gap-1"
                >
                  <CheckCircle className="size-3" />
                  Ready
                </button>
              )}
              {preparation.stage === "READY" && (
                <button
                  onClick={() => updateStage(preparation.id, "SERVED")}
                  className="flex-1 py-2 rounded-lg bg-[#222222] border border-[rgba(255,255,255,0.12)] text-[#f0ece4] text-[12px] font-semibold hover:bg-[#181818] transition-colors"
                >
                  Served
                </button>
              )}
              <button
                onClick={() => {
                  const priorities = ["LOW", "NORMAL", "HIGH", "URGENT"];
                  const currentIndex = priorities.indexOf(preparation.priority);
                  const nextPriority = priorities[(currentIndex + 1) % priorities.length];
                  updatePriority(preparation.id, nextPriority);
                }}
                className="px-3 py-2 rounded-lg bg-[#222222] border border-[rgba(255,255,255,0.12)] text-[#f0ece4] hover:bg-[#181818] transition-colors"
                title="Change priority"
              >
                <AlertTriangle className="size-4" />
              </button>
            </div>

            {/* Notes */}
            {preparation.notes && (
              <div className="text-[11px] text-[#9a9488] italic">{preparation.notes}</div>
            )}
          </div>
        ))}
      </div>

      {filteredPreparations.length === 0 && (
        <div className="text-center py-12 text-[#5a5650] text-[13px]">
          No orders in this stage
        </div>
      )}
    </div>
  );
}
