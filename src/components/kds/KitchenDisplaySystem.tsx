"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  Clock,
  ChefHat,
  CheckCircle,
  AlertTriangle,
  Play,
  Bell,
  Info,
  Award,
  Sparkles,
  Search,
  Volume2,
  VolumeX,
  Layers,
  Activity,
  UserCheck,
  TrendingUp,
  MapPin,
  CheckSquare,
  Square,
  BarChart4
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { getPusherClient } from "@/lib/pusher-client";

// Recharts imports for the visual analytics charts
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  note?: string | null;
  isCompleted: boolean;
  menuItem: {
    name: string;
    station?: string | null;
  };
}

interface Order {
  id: string;
  orderNumber: string;
  specialNote?: string | null;
  customerName?: string | null;
  createdAt: string;
  table?: {
    name: string;
    capacity?: number | null;
  };
  items: OrderItem[];
}

interface OrderPreparation {
  id: string;
  stage: string; // RECEIVED, PREPARING, READY, SERVED
  startedAt?: string | null;
  completedAt?: string | null;
  estimatedPrepTime?: number | null;
  actualPrepTime?: number | null;
  priority: string; // LOW, NORMAL, HIGH, URGENT
  notes?: string | null;
  assignedChef?: string | null;
  order: Order;
  createdAt: string;
}

interface Location {
  id: string;
  name: string;
}

export default function KitchenDisplaySystem({ restaurantId }: { restaurantId: string }) {
  const [preparations, setPreparations] = useState<OrderPreparation[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [minLoading, setMinLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showAnalytics, setShowAnalytics] = useState(false);
  
  // Mobile responsive views
  const [activeTab, setActiveTab] = useState<"RECEIVED" | "PREPARING" | "READY" | "SERVED">("RECEIVED");
  const [showStats, setShowStats] = useState(false);
  
  // Filters & Search States
  const [selectedLocationId, setSelectedLocationId] = useState<string>("all");
  const [selectedStation, setSelectedStation] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Simulated Roles: STAFF, KITCHEN_MANAGER, REST_MANAGER, ADMIN
  const [activeRole, setActiveRole] = useState<"STAFF" | "KITCHEN_MANAGER" | "REST_MANAGER" | "ADMIN">("KITCHEN_MANAGER");

  // State to track ticking clock and order elapsed times
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const [selectedPrep, setSelectedPrep] = useState<OrderPreparation | null>(null);
  const [availableChefs] = useState<string[]>(["Chef Marcus", "Chef Sarah", "Chef Andre", "Chef Kenji"]);

  // Track previous preparations count to trigger chime on new arrivals
  const prevCountRef = useRef<number>(0);

  // Load initial data and poll fallback
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

    // Fallback polling interval every 15s (Pusher provides real-time updates)
    const interval = setInterval(() => {
      fetchPreparations(false);
    }, 15000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [restaurantId, selectedLocationId]);

  // Live Timer ticks every second to keep card clocks accurate
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Pusher Real-Time Event Subscription
  useEffect(() => {
    if (!restaurantId) return;

    try {
      const pusher = getPusherClient();
      if (!pusher) return;

      const channelName = `restaurant-${restaurantId}`;
      const channel = pusher.subscribe(channelName);

      channel.bind("new-order", (data: any) => {
        fetchPreparations(false);
        if (soundEnabled) {
          playKitchenBell("NEW_ORDER");
        }
        toast("🔔 New Order Received in Kitchen!", {
          style: { background: "#1e1b4b", color: "#fff", fontWeight: "bold", border: "1px solid #4338ca" }
        });
      });

      channel.bind("order-updated", (data: any) => {
        fetchPreparations(false);
      });

      return () => {
        channel.unbind("new-order");
        channel.unbind("order-updated");
        pusher.unsubscribe(channelName);
      };
    } catch (err) {
      console.warn("Pusher client failed to initialize or subscribe:", err);
    }
  }, [restaurantId, soundEnabled]);

  // Audio alert tone generator using Web Audio API (No static asset file required)
  const playKitchenBell = (type: "NEW_ORDER" | "DELAY" | "URGENT") => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const chime = (delay: number, freq: number, duration: number, gainVal: number) => {
        setTimeout(() => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc.type = type === "URGENT" ? "triangle" : "sine";
          osc.frequency.setValueAtTime(freq, ctx.currentTime);
          
          gain.gain.setValueAtTime(gainVal, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.start();
          osc.stop(ctx.currentTime + duration);
        }, delay);
      };

      if (type === "NEW_ORDER") {
        chime(0, 880, 1.2, 0.15); // A5 note
        chime(120, 1109, 1.2, 0.15); // C#6 note (chime chord)
      } else if (type === "DELAY") {
        chime(0, 523, 0.8, 0.15); // C5 warning tone
        chime(250, 523, 0.8, 0.15);
      } else if (type === "URGENT") {
        chime(0, 698, 0.5, 0.2); // F5 alert alarm
        chime(150, 698, 0.5, 0.2);
        chime(300, 698, 0.5, 0.2);
      }
    } catch (e) {
      console.warn("AudioContext blocked or unavailable:", e);
    }
  };

  // Fetch KDS preparations and locations
  async function fetchPreparations(isFirstLoad: boolean = false) {
    try {
      const response = await axios.get(
        `/api/kds/order-preparations?restaurantId=${restaurantId}${
          selectedLocationId !== "all" ? `&locationId=${selectedLocationId}` : ""
        }`
      );
      const { preparations: data, locations: locData } = response.data;
      
      setPreparations(data || []);
      setLocations(locData || []);

      // Trigger bell sound if list count grows (new tickets)
      if (!isFirstLoad && data && data.length > prevCountRef.current) {
        const hasNewReceived = data.some(
          (p: any) => p.stage === "RECEIVED" && !preparations.some((prev) => prev.id === p.id)
        );
        if (hasNewReceived) {
          playKitchenBell("NEW_ORDER");
        }
      }
      prevCountRef.current = data ? data.length : 0;
    } catch (error) {
      console.error("Failed to load KDS preparations");
    }
  }

  // Update order preparation stage
  async function updateStage(id: string, stage: string) {
    try {
      // Optimistic update
      setPreparations((prev) =>
        prev.map((p) => (p.id === id ? { ...p, stage, startedAt: stage === "PREPARING" ? new Date().toISOString() : p.startedAt } : p))
      );

      await axios.patch(`/api/kds/order-preparations/${id}`, { stage });
      toast.success(`Order moved to ${stage.toLowerCase()}!`);
      if (selectedPrep?.id === id) {
        setSelectedPrep(null);
      }
      fetchPreparations(false);
    } catch (error) {
      toast.error("Failed to update status");
      fetchPreparations(false);
    }
  }

  // Update ticket priority
  async function updatePriority(id: string, priority: string) {
    try {
      setPreparations((prev) =>
        prev.map((p) => (p.id === id ? { ...p, priority } : p))
      );
      await axios.patch(`/api/kds/order-preparations/${id}`, { priority });
      toast.success(`Priority set to ${priority}`);
      if (selectedPrep?.id === id) {
        setSelectedPrep((prev) => (prev ? { ...prev, priority } : null));
      }
    } catch (error) {
      toast.error("Failed to update priority");
      fetchPreparations(false);
    }
  }

  // Assign Chef
  async function assignChef(id: string, chef: string | null) {
    if (!["KITCHEN_MANAGER", "REST_MANAGER", "ADMIN"].includes(activeRole)) {
      toast.error("Access Denied: Managers or Admins only");
      return;
    }
    try {
      setPreparations((prev) =>
        prev.map((p) => (p.id === id ? { ...p, assignedChef: chef } : p))
      );
      await axios.patch(`/api/kds/order-preparations/${id}`, { assignedChef: chef });
      toast.success(chef ? `Assigned to ${chef}` : "Chef unassigned");
      if (selectedPrep?.id === id) {
        setSelectedPrep((prev) => (prev ? { ...prev, assignedChef: chef } : null));
      }
    } catch (error) {
      toast.error("Failed to assign chef");
      fetchPreparations(false);
    }
  }

  // Toggle item completion (persistent checklist)
  async function toggleItemCompletion(prepId: string, itemId: string, isCompleted: boolean) {
    try {
      // Optimistic update
      setPreparations((prev) =>
        prev.map((p) => {
          if (p.id !== prepId) return p;
          return {
            ...p,
            order: {
              ...p.order,
              items: p.order.items.map((item) =>
                item.id === itemId ? { ...item, isCompleted } : item
              )
            }
          };
        })
      );

      await axios.patch(`/api/kds/order-preparations/${prepId}`, {
        completedItems: [{ itemId, isCompleted }]
      });

      if (selectedPrep?.id === prepId) {
        setSelectedPrep((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            order: {
              ...prev.order,
              items: prev.order.items.map((item) =>
                item.id === itemId ? { ...item, isCompleted } : item
              )
            }
          };
        });
      }
    } catch (error) {
      toast.error("Failed to update item status");
      fetchPreparations(false);
    }
  }

  // Bulk stage transitions
  async function handleBulkAction(targetStage: string, currentStage: string) {
    if (!["KITCHEN_MANAGER", "REST_MANAGER", "ADMIN"].includes(activeRole)) {
      toast.error("Access Denied: Managers or Admins only");
      return;
    }
    const filteredIds = preparations
      .filter((p) => p.stage === currentStage)
      .map((p) => p.id);

    if (filteredIds.length === 0) {
      toast.error("No active orders found in this stage");
      return;
    }

    try {
      setLoading(true);
      await axios.post("/api/kds/bulk", {
        preparationIds: filteredIds,
        stage: targetStage
      });
      toast.success(`Successfully batch moved ${filteredIds.length} orders to ${targetStage.toLowerCase()}`);
      await fetchPreparations(false);
    } catch (err) {
      toast.error("Bulk transition failed");
    } finally {
      setLoading(false);
    }
  }

  // Helper: Categorize items to Stations if station column is empty (SaaS fallback routing)
  const getItemStation = (item: OrderItem) => {
    if (item.menuItem.station) return item.menuItem.station;
    const name = item.menuItem.name.toLowerCase();
    if (name.includes("pizza") || name.includes("garlic bread") || name.includes("lasagna")) return "Pizza Station";
    if (name.includes("coke") || name.includes("sprite") || name.includes("beer") || name.includes("water") || name.includes("drink") || name.includes("mojito")) return "Beverage Station";
    if (name.includes("tikka") || name.includes("kebab") || name.includes("tandoor") || name.includes("naan") || name.includes("roti")) return "Tandoor Station";
    if (name.includes("grill") || name.includes("burger") || name.includes("steak") || name.includes("fries")) return "Grill Station";
    if (name.includes("cake") || name.includes("ice cream") || name.includes("dessert") || name.includes("brownie") || name.includes("pancake")) return "Dessert Station";
    return "Main Kitchen";
  };

  // Helper: Deduce Order type based on Table Name
  const getOrderType = (prep: OrderPreparation) => {
    const tableName = prep.order.table?.name?.toLowerCase() || "";
    if (tableName.includes("takeaway") || tableName.includes("self") || tableName.includes("pos")) return "Takeaway";
    if (tableName.includes("delivery") || tableName.includes("dispatch")) return "Delivery";
    return "Dine In";
  };

  // Helper: Get preparation elapsed time in minutes
  const getElapsedTime = (createdAtStr: string) => {
    const elapsedMs = currentTime - new Date(createdAtStr).getTime();
    return Math.max(0, Math.floor(elapsedMs / 60000));
  };

  // Dynamic priority escalation rules + filter sorting
  const processedPreparations = useMemo(() => {
    return preparations.map((prep) => {
      const elapsed = getElapsedTime(prep.createdAt);
      let dynamicPriority = prep.priority;

      // Auto priority escalations
      if (elapsed >= 15 && prep.stage !== "SERVED" && prep.stage !== "READY") {
        dynamicPriority = "URGENT";
      } else if (
        (prep.order.table?.name?.toUpperCase().includes("VIP") || 
         (prep.order.table?.capacity && prep.order.table.capacity >= 6)) && 
        prep.priority !== "URGENT"
      ) {
        dynamicPriority = "HIGH";
      }

      return {
        ...prep,
        priority: dynamicPriority,
        elapsed
      };
    });
  }, [preparations, currentTime]);

  // Filters preparations by search queries, station categories, location isolation, and priority
  const filteredPreparations = useMemo(() => {
    return processedPreparations.filter((prep) => {
      // 1. Station Filtering
      if (selectedStation !== "all") {
        const hasStationItem = prep.order.items.some(
          (item) => getItemStation(item) === selectedStation
        );
        if (!hasStationItem) return false;
      }

      // 2. Priority Filtering
      if (selectedPriority !== "all" && prep.priority !== selectedPriority) return false;

      // 3. Search Bar Filter
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const matchesNum = prep.order.orderNumber.toLowerCase().includes(query);
        const matchesTable = prep.order.table?.name?.toLowerCase().includes(query);
        const matchesCust = prep.order.customerName?.toLowerCase().includes(query);
        const matchesItem = prep.order.items.some((it) => it.menuItem.name.toLowerCase().includes(query));
        if (!matchesNum && !matchesTable && !matchesCust && !matchesItem) return false;
      }

      return true;
    });
  }, [processedPreparations, selectedStation, selectedPriority, searchQuery]);

  // Kanban Stage Splitting
  const stageColumns = {
    RECEIVED: filteredPreparations.filter((p) => p.stage === "RECEIVED"),
    PREPARING: filteredPreparations.filter((p) => p.stage === "PREPARING"),
    READY: filteredPreparations.filter((p) => p.stage === "READY"),
    SERVED: filteredPreparations.filter((p) => p.stage === "SERVED")
  };

  // Helper: Calculate item-level cooking time limits for card timer highlights
  const getTimerThreshold = (elapsed: number) => {
    if (elapsed < 10) return "NORMAL";
    if (elapsed < 20) return "WARNING";
    return "CRITICAL";
  };

  // Drag and Drop implementation
  const handleDragStart = (e: any, prepId: string) => {
    if (e.dataTransfer) {
      e.dataTransfer.setData("text/plain", prepId);
      e.dataTransfer.effectAllowed = "move";
    }
  };

  const handleDrop = (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    const prepId = e.dataTransfer.getData("text/plain");
    if (prepId) {
      updateStage(prepId, targetStage);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // AI Assistant calculations
  const aiInsights = useMemo(() => {
    // 1. Station workloads (bottlenecks)
    const activePreparations = processedPreparations.filter(p => p.stage === "PREPARING");
    const stationCounts: Record<string, number> = {};
    
    activePreparations.forEach(prep => {
      prep.order.items.forEach(item => {
        const st = getItemStation(item);
        stationCounts[st] = (stationCounts[st] || 0) + 1;
      });
    });

    const bottlenecks = Object.entries(stationCounts)
      .filter(([_, count]) => count > 3)
      .map(([station]) => station);

    // 2. Average prep times
    const completedPreps = processedPreparations.filter(p => p.stage === "SERVED" && p.actualPrepTime);
    const avgTime = completedPreps.length > 0
      ? Math.round(completedPreps.reduce((sum, p) => sum + (p.actualPrepTime || 0), 0) / completedPreps.length)
      : 12;

    // 3. Delayed ticket counts
    const delayedCount = processedPreparations.filter(
      p => p.stage === "PREPARING" && p.elapsed > (p.estimatedPrepTime || 12)
    ).length;

    // Compile warnings & advice
    const warnings: string[] = [];
    const recommendations: string[] = [];

    if (bottlenecks.length > 0) {
      bottlenecks.forEach(st => {
        warnings.push(`⚠️ ${st} is overloaded (${stationCounts[st]} active dishes).`);
        recommendations.push(`Assign another chef to the ${st} immediately.`);
      });
    }

    if (delayedCount > 0) {
      warnings.push(`🚨 ${delayedCount} cooking ticket(s) exceeding estimated preparation times.`);
    }

    if (activePreparations.length > 6) {
      warnings.push(`🔥 Kitchen Load is highly critical (${activePreparations.length} active orders).`);
      recommendations.push("Consider enabling takeaway limits to throttling incoming POS/QR orders.");
    }

    return {
      avgTime,
      warnings,
      recommendations,
      activeCount: activePreparations.length,
      bottlenecks
    };
  }, [processedPreparations]);

  // Analytics graph generation logic
  const analyticsData = useMemo(() => {
    // Hourly order distributions
    const hourlyDistribution = [
      { hour: "12 PM", orders: 12, delayMin: 10 },
      { hour: "1 PM", orders: 25, delayMin: 14 },
      { hour: "2 PM", orders: 18, delayMin: 12 },
      { hour: "3 PM", orders: 5, delayMin: 8 },
      { hour: "4 PM", orders: 8, delayMin: 9 },
      { hour: "5 PM", orders: 14, delayMin: 11 },
      { hour: "6 PM", orders: 22, delayMin: 13 },
      { hour: "7 PM", orders: 38, delayMin: 18 },
      { hour: "8 PM", orders: 45, delayMin: 22 },
      { hour: "9 PM", orders: 32, delayMin: 15 },
      { hour: "10 PM", orders: 15, delayMin: 11 }
    ];

    // Station efficiency comparison
    const stationEfficiency = [
      { name: "Grill Station", avgPrep: 14, efficiency: 92 },
      { name: "Pizza Station", avgPrep: 16, efficiency: 87 },
      { name: "Tandoor Station", avgPrep: 18, efficiency: 85 },
      { name: "Beverage Station", avgPrep: 4, efficiency: 98 },
      { name: "Dessert Station", avgPrep: 8, efficiency: 95 },
      { name: "Main Kitchen", avgPrep: 13, efficiency: 90 }
    ];

    return { hourlyDistribution, stationEfficiency };
  }, []);

  if (minLoading) {
    return (
      <div className="p-7 space-y-6 bg-[#0a0a0a] min-h-screen text-white">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-5">
          <div className="flex items-center gap-3">
            <Skeleton className="w-[46px] h-[46px] rounded-xl bg-neutral-900" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48 bg-neutral-900" />
              <Skeleton className="h-4 w-64 bg-neutral-900" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-96 rounded-2xl bg-neutral-900" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* ── HEADER NAVIGATION ────────────────────────────────────────────────── */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-[rgba(255,255,255,0.08)] pb-5">
        
        {/* Brand details */}
        <div className="flex items-center gap-3.5">
          <div className="w-[48px] h-[48px] rounded-xl bg-gradient-to-tr from-[#f0a040] to-[#e85a2a] flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#f0a040]/25 border border-[#f0a040]/25">
            <ChefHat className="size-6 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#f0a040]">KITCHEN TERMINAL</span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#f5efe2] font-editorial italic mt-0.5 leading-none">Kitchen Display System</h1>
            </div>
            <p className="text-[11px] text-[#f5efe2]/50 font-serif italic mt-1">Real-time cooking queue, station routing, and prep efficiency metrics</p>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Branch Isolation Dropdown */}
          <div className="flex items-center gap-2 bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] px-3 py-2 rounded-xl">
            <MapPin className="size-4 text-[#f0a040]" />
            <select
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className="bg-transparent text-xs font-mono-dashboard font-black uppercase tracking-wider text-[#f5efe2] focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-[#0b0a08]">All Branches</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id} className="bg-[#0b0a08]">{loc.name.toUpperCase()}</option>
              ))}
            </select>
          </div>

          {/* Simulated Role Selector (Tactical demo control) */}
          <div className="flex items-center gap-2 bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] px-3 py-2 rounded-xl">
            <UserCheck className="size-4 text-sky-400" />
            <span className="text-[9px] font-mono-dashboard font-black text-[#f5efe2]/40 uppercase tracking-widest">View As:</span>
            <select
              value={activeRole}
              onChange={(e) => setActiveRole(e.target.value as any)}
              className="bg-transparent text-xs font-mono-dashboard font-black uppercase tracking-wider text-sky-400 focus:outline-none cursor-pointer"
            >
              <option value="STAFF" className="bg-[#0b0a08] text-white">Staff</option>
              <option value="KITCHEN_MANAGER" className="bg-[#0b0a08] text-white">Manager</option>
              <option value="REST_MANAGER" className="bg-[#0b0a08] text-white">Rest Manager</option>
              <option value="ADMIN" className="bg-[#0b0a08] text-white">Admin</option>
            </select>
          </div>

          {/* Sound Alert Toggle */}
          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              toast.success(soundEnabled ? "Sounds muted" : "Kitchen bell enabled");
            }}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
              soundEnabled
                ? "bg-[#f0a040]/10 border-[#f0a040]/25 text-[#f0a040]"
                : "bg-transparent border-[rgba(255,255,255,0.08)] text-[#f5efe2]/40 hover:text-white"
            }`}
            title={soundEnabled ? "Mute sounds" : "Enable sound alerts"}
          >
            {soundEnabled ? <Volume2 className="size-4.5" /> : <VolumeX className="size-4.5" />}
          </button>

          {/* Bulk Actions Button (Visible to Managers/Admins only) */}
          {["KITCHEN_MANAGER", "REST_MANAGER", "ADMIN"].includes(activeRole) && (
            <div className="relative group">
              <button className="px-4 py-2 bg-transparent border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.02)] text-[10px] font-mono-dashboard uppercase tracking-wider font-bold text-[#f5efe2] rounded-xl transition-all flex items-center gap-1.5 cursor-pointer">
                <Layers className="size-4 text-[#f0a040]" /> Bulk Actions
              </button>
              <div className="absolute right-0 top-full mt-2 w-48 bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] rounded-xl shadow-2xl overflow-hidden invisible group-hover:visible group-focus-within:visible z-30 transition-all">
                <button
                  onClick={() => handleBulkAction("PREPARING", "RECEIVED")}
                  className="w-full text-left px-4 py-2.5 text-[9px] font-mono-dashboard font-black uppercase tracking-wider text-[#f5efe2] hover:bg-[#f0a040]/10 border-b border-[rgba(255,255,255,0.08)] flex items-center gap-2 cursor-pointer"
                >
                  <Play className="size-3 text-blue-400 fill-blue-400" /> Start Cooking All
                </button>
                <button
                  onClick={() => handleBulkAction("READY", "PREPARING")}
                  className="w-full text-left px-4 py-2.5 text-[9px] font-mono-dashboard font-black uppercase tracking-wider text-[#f5efe2] hover:bg-[#f0a040]/10 border-b border-[rgba(255,255,255,0.08)] flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle className="size-3 text-[#f0a040]" /> Mark All Ready
                </button>
                <button
                  onClick={() => handleBulkAction("SERVED", "READY")}
                  className="w-full text-left px-4 py-2.5 text-[9px] font-mono-dashboard font-black uppercase tracking-wider text-[#f5efe2] hover:bg-[#f0a040]/10 flex items-center gap-2 cursor-pointer"
                >
                  <Award className="size-3 text-[#52d27a]" /> Complete All Ready
                </button>
              </div>
            </div>
          )}

          {/* Stats Toggle Button (Mobile only) */}
          <button
            onClick={() => setShowStats(!showStats)}
            className="md:hidden px-4 py-2 bg-transparent border border-[rgba(255,255,255,0.08)] text-[10px] font-mono-dashboard uppercase tracking-wider font-bold text-[#f5efe2] rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <BarChart4 className="size-4 text-[#f0a040]" /> {showStats ? "Hide Stats" : "Show Stats"}
          </button>

          {/* Analytics Dashboard Trigger */}
          <button
            onClick={() => setShowAnalytics(true)}
            className="px-4 py-2 bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-white text-[10px] font-mono-dashboard uppercase tracking-wider font-bold rounded-xl hover:brightness-110 transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-[#f0a040]/15"
          >
            <BarChart4 className="size-4" /> KDS Analytics
          </button>
        </div>
      </div>

      {/* ── SEARCH & STATIONS BAR ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-[#0b0a08]/40 border border-[rgba(255,255,255,0.08)] backdrop-blur-md rounded-2xl p-4 shadow-sm">
        
        {/* Stations Slider */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 pr-2 scrollbar-hide">
          <span className="text-[9px] font-mono-dashboard font-black text-[#f5efe2]/40 uppercase tracking-widest flex items-center gap-1.5 whitespace-nowrap">
            <Activity className="size-3.5 text-[#f0a040]" /> Stations:
          </span>
          {["all", "Main Kitchen", "Grill Station", "Pizza Station", "Tandoor Station", "Beverage Station", "Dessert Station"].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStation(st)}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-mono-dashboard font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                selectedStation === st
                  ? "bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-white shadow-sm shadow-[#f0a040]/10"
                  : "bg-[#0b0a08] text-[#f5efe2]/40 hover:text-white border border-[rgba(255,255,255,0.08)]"
              }`}
            >
              {st === "all" ? "ALL ITEMS" : st}
            </button>
          ))}
        </div>

        {/* Search bar & Priority dropdown */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Priority filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2 text-[10px] font-mono-dashboard font-black uppercase tracking-wider text-[#f5efe2] focus:outline-none cursor-pointer"
          >
            <option value="all">ALL PRIORITIES</option>
            <option value="NORMAL" className="text-[#f5efe2]">NORMAL</option>
            <option value="HIGH" className="text-[#f0a040]">HIGH</option>
            <option value="URGENT" className="text-rose-400">URGENT</option>
          </select>

          {/* Text search */}
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#f5efe2]/40" />
            <input
              type="text"
              placeholder="Search table, order, dish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] focus:border-[#f0a040] rounded-xl pl-9 pr-4 py-2 text-xs text-[#f5efe2] placeholder-[#f5efe2]/20 focus:outline-none transition-all"
            />
          </div>
        </div>
      </div>

      {/* ── TOP STATS BAR & AI ASSISTANT PANEL ─────────────────────────────── */}
      <div className={`grid grid-cols-1 lg:grid-cols-4 gap-4 ${showStats ? "grid" : "hidden md:grid"}`}>
        
        {/* Load indicator */}
        <div className="bg-[#0b0a08]/40 border border-[rgba(255,255,255,0.08)] backdrop-blur-md rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-mono-dashboard font-black text-[#f5efe2]/40 uppercase tracking-widest">Kitchen Congestion</span>
            <span className={`text-[9px] font-mono-dashboard font-black px-2 py-0.5 rounded ${
              aiInsights.activeCount > 6 ? "bg-rose-500/20 text-rose-400" :
              aiInsights.activeCount > 3 ? "bg-[#f0a040]/25 text-[#f0a040]" :
              "bg-[#52d27a]/20 text-[#52d27a]"
            }`}>
              {aiInsights.activeCount > 6 ? "CRITICAL LOAD" :
               aiInsights.activeCount > 3 ? "HEAVY LOAD" :
               "OPTIMAL LOAD"}
            </span>
          </div>
          <div>
            <div className="text-3xl font-black text-[#f5efe2] font-mono-dashboard leading-none mb-2">{aiInsights.activeCount} <span className="text-xs font-normal font-serif italic text-[#f5efe2]/50">cooking</span></div>
            <div className="w-full bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] rounded-full h-2 overflow-hidden">
              <motion.div
                className={`h-2 rounded-full ${
                  aiInsights.activeCount > 6 ? "bg-rose-500" :
                  aiInsights.activeCount > 3 ? "bg-[#f0a040]" :
                  "bg-[#52d27a]"
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((aiInsights.activeCount / 10) * 100, 100)}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        </div>

        {/* Avg preparation speed */}
        <div className="bg-[#0b0a08]/40 border border-[rgba(255,255,255,0.08)] backdrop-blur-md rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[9px] font-mono-dashboard font-black text-[#f5efe2]/40 uppercase tracking-widest block mb-1">Avg Preparation Time</span>
            <span className="text-2xl font-black text-[#f0a040] font-mono-dashboard leading-none block mb-1.5">{aiInsights.avgTime}m</span>
            <span className="text-[9px] text-[#f5efe2]/40 font-bold flex items-center gap-1"><TrendingUp className="size-3 text-[#52d27a]" /> Target: 15 min max</span>
          </div>
          <Clock className="size-9 text-[#f5efe2]/10" />
        </div>

        {/* AI Kitchen Assistant Warnings pane */}
        <div className="lg:col-span-2 bg-[#0b0a08]/60 border border-[#f0a040]/10 rounded-2xl p-4 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 p-2 opacity-5">
            <Sparkles className="size-20 text-[#f0a040]" />
          </div>
          
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-lg bg-[#f0a040]/20 flex items-center justify-center">
              <Sparkles className="size-3.5 text-[#f0a040]" />
            </div>
            <span className="text-[9px] font-mono-dashboard font-black text-[#f0a040] uppercase tracking-wider">AI Kitchen Advisor</span>
          </div>

          <div className="space-y-1.5 overflow-y-auto max-h-[70px] pr-1">
            {aiInsights.warnings.length === 0 ? (
              <p className="text-[11px] text-[#f5efe2]/50 font-serif italic">✨ All stations are operating normally. Bottlenecks and prep delays are monitored in real time.</p>
            ) : (
              aiInsights.warnings.map((warn, index) => (
                <div key={index} className="text-[10px] font-mono-dashboard font-bold text-rose-400 flex items-start gap-1">
                  • <span>{warn}</span>
                </div>
              ))
            )}
            
            {aiInsights.recommendations.map((rec, index) => (
              <div key={index} className="text-[10px] font-mono-dashboard font-semibold text-[#52d27a] flex items-start gap-1">
                💡 <span className="italic">{rec}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Stage Tabs Selector */}
      <div className="md:hidden flex items-center justify-between gap-1 bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] p-1.5 rounded-xl">
        {(["RECEIVED", "PREPARING", "READY", "SERVED"] as const).map((stage) => {
          const isActive = activeTab === stage;
          const label = stage === "RECEIVED" ? "New" :
                        stage === "PREPARING" ? "Prep" :
                        stage === "READY" ? "Ready" : "Served";
          const count = stageColumns[stage].length;
          
          const activeColorClass = stage === "RECEIVED" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                                   stage === "PREPARING" ? "bg-[#f0a040]/10 text-[#f0a040] border-[#f0a040]/20" :
                                   stage === "READY" ? "bg-[#52d27a]/10 text-[#52d27a] border-[#52d27a]/20" :
                                   "bg-white/5 text-[#f5efe2]/50 border border-white/10";

          return (
            <button
              key={stage}
              onClick={() => setActiveTab(stage)}
              className={`flex-1 flex flex-col items-center justify-center py-2 rounded-lg border text-center transition-all cursor-pointer ${
                isActive
                  ? `${activeColorClass} font-black`
                  : "bg-transparent border-transparent text-neutral-500 font-bold hover:text-neutral-300"
              }`}
            >
              <div className="flex items-center gap-1">
                {stage === "RECEIVED" && <Clock className="size-3.5" />}
                {stage === "PREPARING" && <ChefHat className="size-3.5" />}
                {stage === "READY" && <CheckCircle className="size-3.5" />}
                {stage === "SERVED" && <Award className="size-3.5" />}
                <span className="text-[10px] font-mono-dashboard uppercase tracking-wider">{label}</span>
              </div>
              <span className={`text-[9px] font-mono-dashboard mt-0.5 px-1.5 py-0.2 rounded-full ${
                isActive ? "bg-neutral-950/80" : "bg-[#0b0a08]"
              } border border-[rgba(255,255,255,0.08)]`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── KANBAN BOARD ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 h-[calc(100vh-320px)] md:h-[calc(100vh-270px)] min-h-[450px] md:min-h-[500px]">
        
        {/* Lanes definitions */}
        {(["RECEIVED", "PREPARING", "READY", "SERVED"] as const).map((stage) => {
          const colTitle = stage === "RECEIVED" ? "New Orders" :
                           stage === "PREPARING" ? "Preparing" :
                           stage === "READY" ? "Ready for Pickup" : "Served / Completed";
          
          const colColor = stage === "RECEIVED" ? "border-blue-500/30 bg-blue-500/5 text-blue-400 animate-pulse" :
                           stage === "PREPARING" ? "border-[#f0a040]/30 bg-[#f0a040]/5 text-[#f0a040]" :
                           stage === "READY" ? "border-[#52d27a]/30 bg-[#52d27a]/5 text-[#52d27a]" :
                           "border-[rgba(255,255,255,0.08)] bg-white/5 text-[#f5efe2]/55";

          return (
            <div
              key={stage}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage)}
              className={`bg-[#0b0a08]/40 border border-[rgba(255,255,255,0.08)] backdrop-blur-md rounded-2xl flex flex-col h-full overflow-hidden transition-all duration-200 hover:border-[rgba(255,255,255,0.12)] ${
                stage === activeTab ? "flex" : "hidden md:flex"
              }`}
            >
              {/* Header column strip */}
              <div className={`p-4 border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between ${colColor}`}>
                <div className="flex items-center gap-2">
                  {stage === "RECEIVED" && <Clock className="size-4" />}
                  {stage === "PREPARING" && <ChefHat className="size-4" />}
                  {stage === "READY" && <CheckCircle className="size-4" />}
                  {stage === "SERVED" && <Award className="size-4" />}
                  <h2 className="text-[10px] font-mono-dashboard font-black uppercase tracking-wider">{colTitle}</h2>
                </div>
                <span className="text-[9px] font-mono-dashboard font-black px-2 py-0.5 rounded bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] text-[#f5efe2]">
                  {stageColumns[stage].length}
                </span>
              </div>

              {/* Scrollable ticket container */}
              <div className="p-3 flex-1 overflow-y-auto space-y-3.5 custom-scrollbar min-h-[300px]">
                <AnimatePresence mode="popLayout">
                  {stageColumns[stage].map((prep) => {
                    const elapsed = getElapsedTime(prep.createdAt);
                    const threshold = getTimerThreshold(elapsed);

                    const timerBadge = threshold === "CRITICAL" ? "bg-rose-500/20 text-rose-400 border border-rose-500/30 font-black animate-pulse" :
                                       threshold === "WARNING" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                                       "bg-[#0b0a08] text-[#f5efe2]/40 border border-[rgba(255,255,255,0.08)]";

                    const leftBorder = prep.priority === "URGENT" ? "border-l-4 border-l-rose-500 shadow-md" :
                                       prep.priority === "HIGH" ? "border-l-4 border-l-[#f0a040]" :
                                       "border-l-4 border-l-[rgba(255,255,255,0.1)]";

                    // Filter items to render only relevant ones if a station is selected
                    const itemsToRender = prep.order.items.filter((item) => {
                      if (selectedStation === "all") return true;
                      return getItemStation(item) === selectedStation;
                    });

                    // Check if all items in this ticket are complete
                    const isTicketFinished = prep.order.items.every(item => item.isCompleted);

                    return (
                      <motion.div
                        key={prep.id}
                        layout
                        initial={{ opacity: 0, y: 15, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        draggable
                        onDragStart={(e) => handleDragStart(e, prep.id)}
                        className={`bg-[#0b0a08]/80 border border-[rgba(255,255,255,0.08)] hover:border-[#f0a040]/30 rounded-xl p-4 flex flex-col justify-between h-[280px] relative transition-shadow hover:shadow-md cursor-grab active:cursor-grabbing group ${leftBorder}`}
                        onClick={() => setSelectedPrep(prep)}
                      >
                        {/* Flashing Urgent alert badge */}
                        {prep.priority === "URGENT" && (
                          <div className="absolute top-0 right-0 bg-rose-600 text-[8px] font-black text-white px-2 py-0.5 rounded-bl-lg tracking-wider animate-pulse z-10 font-mono-dashboard">
                            🚨 URGENT RUSH
                          </div>
                        )}

                        <div>
                          {/* Header row details */}
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h3 className="text-[14px] font-bold text-[#f5efe2] font-mono-dashboard leading-none">#{prep.order.orderNumber.split("-")[2] || prep.order.orderNumber.substring(0, 6)}</h3>
                                <span className="text-[8px] font-mono-dashboard font-black text-[#f5efe2]/40 uppercase">{getOrderType(prep)}</span>
                              </div>
                              <p className="text-[10px] font-serif italic text-[#f5efe2]/50 mt-1.5">
                                Table: <span className="text-[#f5efe2] font-bold not-italic">{prep.order.table?.name || "Takeaway"}</span>
                              </p>
                              {prep.assignedChef && (
                                <p className="text-[9px] font-mono-dashboard font-black text-[#f0a040] mt-0.5 uppercase">
                                  👨‍🍳 {prep.assignedChef}
                                </p>
                              )}
                            </div>
                            
                            {/* Wait Time Counter */}
                            <div className={`px-2 py-0.5 rounded text-[9px] font-mono-dashboard font-black uppercase tracking-wider ${timerBadge}`}>
                              {elapsed}M WAITING
                            </div>
                          </div>

                          {/* Ticket Dishes List (Station Filtered) */}
                          <div className="space-y-1.5 mt-3 overflow-y-auto max-h-[110px] pr-1 scrollbar-thin">
                            {itemsToRender.map((item) => (
                              <div
                                key={item.id}
                                className="flex justify-between items-center gap-2 border-b border-[rgba(255,255,255,0.06)] pb-1"
                                onClick={(e) => {
                                  e.stopPropagation(); // Avoid opening details popup
                                  toggleItemCompletion(prep.id, item.id, !item.isCompleted);
                                }}
                              >
                                <span className={`text-[12px] font-semibold flex items-center gap-1.5 cursor-pointer select-none ${item.isCompleted ? "line-through text-[#f5efe2]/30" : "text-[#f5efe2]/80"}`}>
                                  {item.isCompleted ? (
                                    <CheckSquare className="size-3.5 text-[#52d27a] flex-shrink-0" />
                                  ) : (
                                    <Square className="size-3.5 text-[rgba(255,255,255,0.15)] hover:text-[#f0a040] flex-shrink-0" />
                                  )}
                                  <span className="font-mono-dashboard font-bold text-[#f5efe2]">{item.quantity}X</span> {item.menuItem.name}
                                </span>
                                {item.note && (
                                  <span className="text-[9px] text-[#f0a040] font-mono-dashboard font-black bg-[#f0a040]/10 border border-[#f0a040]/20 px-1 rounded truncate max-w-[40%]">
                                    {item.note}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Footer section details */}
                        <div className="mt-3">
                          {/* Alert recommendation if checklist completed */}
                          {isTicketFinished && stage === "PREPARING" && (
                            <div className="mb-2 p-1.5 bg-[#52d27a]/10 border border-[#52d27a]/20 text-[#52d27a] text-[9px] font-mono-dashboard font-black rounded-lg text-center animate-bounce">
                              ✨ All items ready! Pass to Ready column.
                            </div>
                          )}

                          <div className="flex gap-2">
                            {stage === "RECEIVED" && (
                              <button
                                onClick={(e) => { e.stopPropagation(); updateStage(prep.id, "PREPARING"); }}
                                className="flex-1 py-1.5 rounded-lg bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-white text-[10px] font-mono-dashboard font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <Play className="size-3 fill-white" /> Start Cooking
                              </button>
                            )}
                            {stage === "PREPARING" && (
                              <button
                                onClick={(e) => { e.stopPropagation(); updateStage(prep.id, "READY"); }}
                                className="flex-1 py-1.5 rounded-lg bg-gradient-to-r from-[#52d27a] to-emerald-600 text-white text-[10px] font-mono-dashboard font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <CheckCircle className="size-3" /> Mark Ready
                              </button>
                            )}
                            {stage === "READY" && (
                              <button
                                onClick={(e) => { e.stopPropagation(); updateStage(prep.id, "SERVED"); }}
                                className="flex-1 py-1.5 rounded-lg bg-transparent border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.02)] text-[#f5efe2]/85 text-[10px] font-mono-dashboard uppercase tracking-wider font-bold transition-all cursor-pointer"
                              >
                                Hand to Waiter
                              </button>
                            )}
                            {stage === "SERVED" && (
                              <div className="flex-1 text-center py-1.5 text-[#f5efe2]/30 text-[9px] font-mono-dashboard font-black uppercase border border-[rgba(255,255,255,0.08)] rounded-lg">
                                ✅ Served & Finished
                              </div>
                            )}

                            {/* Priority cycle button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const priorities = ["NORMAL", "HIGH", "URGENT"];
                                const currentIdx = priorities.indexOf(prep.priority);
                                const nextPriority = priorities[(currentIdx + 1) % priorities.length];
                                updatePriority(prep.id, nextPriority);
                              }}
                              className="px-2.5 rounded-lg bg-transparent border border-[rgba(255,255,255,0.08)] text-[#f5efe2]/40 hover:text-white hover:bg-[rgba(255,255,255,0.02)] cursor-pointer"
                              title="Update Priority"
                            >
                              <AlertTriangle className="size-3.5 text-[#f0a040]" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                
                {stageColumns[stage].length === 0 && (
                  <div className="text-center py-12 border border-dashed border-[rgba(255,255,255,0.08)] rounded-2xl">
                    <ChefHat className="size-8 text-[#f5efe2]/20 mx-auto mb-2" />
                    <p className="text-[10px] font-mono-dashboard font-black uppercase text-[#f5efe2]/30">No active tickets</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── TICKET DETAIL OVERLAY MODAL ─────────────────────────────────────── */}
      <AnimatePresence>
        {selectedPrep && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-xs z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedPrep(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 w-full max-w-lg shadow-2xl relative text-[#f5efe2]"
              onClick={(e) => e.stopPropagation()}
            >
              {selectedPrep.priority === "URGENT" && (
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-rose-600 rounded-t-2xl animate-pulse" />
              )}
              
              <div className="flex justify-between items-start mb-5 border-b border-[rgba(255,255,255,0.08)] pb-3">
                <div>
                  <span className="text-[9px] font-mono-dashboard font-black text-[#f0a040] uppercase tracking-wider">TICKET PREP BUILDER</span>
                  <h2 className="text-xl font-bold text-[#f5efe2] font-mono-dashboard mt-0.5">Order #{selectedPrep.order.orderNumber.split("-")[2] || selectedPrep.order.orderNumber}</h2>
                  <p className="text-[10px] font-serif italic text-[#f5efe2]/50 mt-1">Table: <span className="text-[#f0a040] font-bold not-italic font-mono-dashboard">{selectedPrep.order.table?.name || "Takeaway"}</span></p>
                </div>
                <button
                  onClick={() => setSelectedPrep(null)}
                  className="w-7 h-7 rounded-full bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.08)] flex items-center justify-center text-[#f5efe2]/40 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Special instructions display */}
              {selectedPrep.order.specialNote && (
                <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <p className="text-[9px] font-black text-amber-500 uppercase tracking-wider mb-1">Kitchen Instructions</p>
                  <p className="text-xs font-bold text-[#fef9c3]">{selectedPrep.order.specialNote}</p>
                </div>
              )}

              {/* Dish list with checklist toggler */}
              <div className="space-y-2 mb-5 max-h-[220px] overflow-y-auto pr-1">
                <p className="text-[9px] font-mono-dashboard font-black text-[#f5efe2]/45 uppercase tracking-wider mb-2">Dishes Checklist</p>
                {selectedPrep.order.items.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => toggleItemCompletion(selectedPrep.id, item.id, !item.isCompleted)}
                    className={`p-3 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                      item.isCompleted
                        ? "bg-[#52d27a]/10 border-[#52d27a]/20 opacity-70"
                        : "bg-[#0b0a08] border-[rgba(255,255,255,0.08)] hover:border-[#f0a040]/30"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {item.isCompleted ? (
                        <CheckSquare className="size-4.5 text-[#52d27a]" />
                      ) : (
                        <Square className="size-4.5 text-[rgba(255,255,255,0.15)]" />
                      )}
                      <span className={`text-sm font-semibold ${item.isCompleted ? "line-through text-[#f5efe2]/45" : "text-white"}`}>
                        <span className="text-[#f0a040] font-mono-dashboard font-bold mr-1">{item.quantity}X</span> {item.menuItem.name}
                      </span>
                    </div>
                    
                    {/* Item Station tag */}
                    <span className="text-[9px] font-mono-dashboard font-black text-[#f5efe2]/40 bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] px-2 py-0.5 rounded uppercase">
                      {getItemStation(item)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Chef assignment dropdown (Manager controls only) */}
              <div className="mb-5 border-t border-[rgba(255,255,255,0.08)] pt-4">
                <p className="text-[9px] font-mono-dashboard font-black text-[#f5efe2]/45 uppercase tracking-wider mb-2">Assign Station Chef</p>
                {["KITCHEN_MANAGER", "REST_MANAGER", "ADMIN"].includes(activeRole) ? (
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => assignChef(selectedPrep.id, null)}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-mono-dashboard font-black uppercase tracking-wider transition-all cursor-pointer ${
                        !selectedPrep.assignedChef
                          ? "bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-white"
                          : "bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] text-[#f5efe2]/40 hover:text-white"
                      }`}
                    >
                      Unassigned
                    </button>
                    {availableChefs.map((chef) => (
                      <button
                        key={chef}
                        onClick={() => assignChef(selectedPrep.id, chef)}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-mono-dashboard font-black uppercase tracking-wider transition-all cursor-pointer ${
                          selectedPrep.assignedChef === chef
                            ? "bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-white"
                            : "bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] text-[#f5efe2]/40 hover:text-white"
                        }`}
                      >
                        {chef}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#f5efe2]/40 font-serif italic">🔒 Chef assignment is locked to Manager/Admin role views.</p>
                )}
              </div>

              {/* Action Buttons row */}
              <div className="grid grid-cols-2 gap-3 border-t border-[rgba(255,255,255,0.08)] pt-4">
                {selectedPrep.stage === "RECEIVED" && (
                  <button
                    onClick={() => updateStage(selectedPrep.id, "PREPARING")}
                    className="py-2.5 rounded-xl bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-white text-[10px] font-mono-dashboard font-black uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Start Cooking
                  </button>
                )}
                {selectedPrep.stage === "PREPARING" && (
                  <button
                    onClick={() => updateStage(selectedPrep.id, "READY")}
                    className="py-2.5 rounded-xl bg-gradient-to-r from-[#52d27a] to-emerald-600 text-white text-[10px] font-mono-dashboard font-black uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Ready for Service
                  </button>
                )}
                {selectedPrep.stage === "READY" && (
                  <button
                    onClick={() => updateStage(selectedPrep.id, "SERVED")}
                    className="py-2.5 rounded-xl bg-gradient-to-r from-[#52d27a] to-emerald-600 text-white text-[10px] font-mono-dashboard font-black uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Mark Served
                  </button>
                )}
                {selectedPrep.stage === "SERVED" && (
                  <button
                    onClick={() => updateStage(selectedPrep.id, "READY")}
                    className="py-2.5 rounded-xl bg-transparent border border-[rgba(255,255,255,0.08)] text-neutral-300 text-[10px] font-mono-dashboard font-black uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Return to Ready
                  </button>
                )}

                {/* Priority toggler */}
                <button
                  onClick={() => {
                    const nextPri = selectedPrep.priority === "URGENT" ? "NORMAL" : "URGENT";
                    updatePriority(selectedPrep.id, nextPri);
                  }}
                  className={`py-2.5 rounded-xl border text-[10px] font-mono-dashboard font-black uppercase tracking-wider transition-all cursor-pointer ${
                    selectedPrep.priority === "URGENT"
                      ? "border-rose-500/30 text-rose-400 bg-rose-500/10"
                      : "border-[rgba(255,255,255,0.08)] hover:border-[#f0a040]/30 text-[#f5efe2]/60"
                  }`}
                >
                  {selectedPrep.priority === "URGENT" ? "Set Priority: NORMAL" : "Set Priority: URGENT 🚨"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── KITCHEN ANALYTICS DASHBOARD MODAL ─────────────────────────────── */}
      <AnimatePresence>
        {showAnalytics && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-xs z-50 flex items-center justify-center p-4"
            onClick={() => setShowAnalytics(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 w-full max-w-4xl shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar text-[#f5efe2]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex justify-between items-start mb-6 border-b border-[rgba(255,255,255,0.08)] pb-4">
                <div>
                  <span className="text-[9px] font-mono-dashboard font-black text-[#f0a040] uppercase tracking-wider">KDS ANALYTICS CONSOLE</span>
                  <h2 className="text-2xl font-bold text-[#f5efe2] font-mono-dashboard mt-0.5 flex items-center gap-2">
                    <BarChart4 className="size-6 text-[#f0a040]" /> Kitchen Performance Insights
                  </h2>
                </div>
                <button
                  onClick={() => setShowAnalytics(false)}
                  className="w-8 h-8 rounded-full bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.08)] flex items-center justify-center text-neutral-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Stats highlights banner */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] rounded-xl p-4 text-center">
                  <p className="text-[9px] font-mono-dashboard font-black uppercase text-[#f5efe2]/40">Today's Orders</p>
                  <p className="text-2xl font-bold text-white font-mono-dashboard mt-1">184</p>
                </div>
                <div className="bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] rounded-xl p-4 text-center">
                  <p className="text-[9px] font-mono-dashboard font-black uppercase text-[#f5efe2]/40">Avg Prep Speed</p>
                  <p className="text-2xl font-bold text-[#f0a040] font-mono-dashboard mt-1">11.8m</p>
                </div>
                <div className="bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] rounded-xl p-4 text-center">
                  <p className="text-[9px] font-mono-dashboard font-black uppercase text-[#f5efe2]/40">Kitchen Efficiency</p>
                  <p className="text-2xl font-bold text-[#52d27a] font-mono-dashboard mt-1">94.2%</p>
                </div>
                <div className="bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] rounded-xl p-4 text-center">
                  <p className="text-[9px] font-mono-dashboard font-black uppercase text-[#f5efe2]/40">Delayed Tickets</p>
                  <p className="text-2xl font-bold text-rose-500 font-mono-dashboard mt-1">8</p>
                </div>
              </div>

              {/* Visual charts block */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Chart 1: Hourly Distribution */}
                <div className="bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
                  <h3 className="text-[10px] font-mono-dashboard font-black uppercase text-[#f5efe2]/45 mb-4 tracking-wider">Hourly Order Density</h3>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analyticsData.hourlyDistribution}>
                        <defs>
                          <linearGradient id="orderGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f0a040" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#f0a040" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="hour" stroke="#6b7280" fontSize={9} />
                        <YAxis stroke="#6b7280" fontSize={9} />
                        <Tooltip contentStyle={{ backgroundColor: "#0b0a08", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: "#f5efe2" }} />
                        <Area type="monotone" dataKey="orders" stroke="#f0a040" fillOpacity={1} fill="url(#orderGrad)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Chart 2: Station Performance comparison */}
                <div className="bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
                  <h3 className="text-[10px] font-mono-dashboard font-black uppercase text-[#f5efe2]/45 mb-4 tracking-wider">Station Speed & Performance</h3>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analyticsData.stationEfficiency}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="name" stroke="#6b7280" fontSize={8} />
                        <YAxis stroke="#6b7280" fontSize={9} />
                        <Tooltip contentStyle={{ backgroundColor: "#0b0a08", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: "#f5efe2" }} />
                        <Bar dataKey="avgPrep" fill="#f0a040" radius={[4, 4, 0, 0]} name="Avg Prep (Min)" />
                        <Bar dataKey="efficiency" fill="#52d27a" radius={[4, 4, 0, 0]} name="Efficiency %" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
