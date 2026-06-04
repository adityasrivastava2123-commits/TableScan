"use client";

import { useState, useEffect } from "react";
import { Clock, RefreshCw, LayoutGrid, ArrowLeft, ShieldAlert } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { Skeleton } from "@/components/ui/skeleton";
import FloorPlanEditor from "./FloorPlanEditor";

interface Table {
  id: string;
  name: string;
  capacity?: number;
}

interface Staff {
  id: string;
  name: string;
  role: string;
}

interface TableService {
  id: string;
  status: string;
  seatedAt?: Date;
  clearedAt?: Date;
  notes?: string;
  table: Table;
  server?: Staff;
  createdAt: Date;
}

export default function TableServiceManagement({
  restaurantId,
  locationId,
  restaurant
}: {
  restaurantId: string;
  locationId: string;
  restaurant?: any;
}) {
  const [tableServices, setTableServices] = useState<TableService[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [time, setTime] = useState("");
  const [isLiveConnected, setIsLiveConnected] = useState(true);

  // Digital Twin simulated events status tracker
  const [simulationActive, setSimulationActive] = useState(true);

  useEffect(() => {
    // Clock update
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false
        })
      );
    };
    updateTime();
    const clockInterval = setInterval(updateTime, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        await Promise.all([fetchTableServices(), fetchTables(), fetchStaff()]);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    // Live sync polling simulation
    const interval = setInterval(fetchTableServices, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [restaurantId, locationId, filter]);

  async function fetchTableServices() {
    try {
      const response = await axios.get(
        `/api/table-service?restaurantId=${restaurantId}${
          filter !== "all" && filter !== "attention" ? `&status=${filter}` : ""
        }`
      );
      setTableServices(response.data);
      setIsLiveConnected(true);
    } catch (error) {
      console.error("Failed to load table services");
      setIsLiveConnected(false);
    }
  }

  async function fetchTables() {
    try {
      const response = await axios.get(`/api/tables?locationId=${locationId}`);
      setTables(response.data);
    } catch (error) {
      console.error("Failed to load tables");
    }
  }

  async function fetchStaff() {
    try {
      const response = await axios.get(`/api/staff?restaurantId=${restaurantId}`);
      setStaff(response.data);
    } catch (error) {
      console.error("Failed to load staff");
    }
  }

  async function updateTableService(id: string, status: string) {
    try {
      const response = await axios.patch(`/api/table-service/${id}`, { status });
      toast.success(`Table updated to ${status}`);
      fetchTableServices();
      return response.data;
    } catch (error) {
      toast.error("Failed to update table");
      throw error;
    }
  }

  async function assignServer(id: string, serverId: string) {
    try {
      await axios.patch(`/api/table-service/${id}`, { serverId });
      toast.success(serverId ? "Server assigned" : "Server released");
      fetchTableServices();
    } catch (error) {
      toast.error("Failed to assign server");
    }
  }

  const getServiceCall = (notes?: string) => {
    if (!notes) return null;
    try {
      const parsed = JSON.parse(notes);
      return parsed.serviceCall?.status === "OPEN" ? parsed.serviceCall : null;
    } catch {
      return null;
    }
  };

  const activeServiceCalls = tableServices.filter((service) => getServiceCall(service.notes));

  // If a table needs attention (status is ATTENTION or it has open service requests)
  const filteredServices = tableServices.filter((s) => {
    if (filter === "all") return true;
    if (filter === "attention") {
      return s.status === "ATTENTION" || !!getServiceCall(s.notes);
    }
    return s.status === filter;
  });

  const handleManualSync = async () => {
    toast.promise(Promise.all([fetchTableServices(), fetchTables(), fetchStaff()]), {
      loading: "Synchronizing digital twin...",
      success: "Restaurant floor synchronized",
      error: "Sync failed"
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[200] bg-[#0c0a09] flex flex-col items-center justify-center space-y-4">
        <div className="relative">
          <div className="size-16 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black uppercase text-amber-500 tracking-wider">
            LIVE
          </div>
        </div>
        <p className="text-xs font-medium text-[#f5efe2]/50 font-mono-dashboard uppercase tracking-[0.2em] animate-pulse">
          Initializing Digital Twin Floor...
        </p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[150] bg-[#080706] text-[#f5efe2] flex flex-col font-sans select-none overflow-hidden">
      {/* Global CSS overrides to hide layout Sidebar and Topbar chrome completely */}
      <style dangerouslySetInnerHTML={{ __html: `
        aside {
          display: none !important;
        }
        header {
          display: none !important;
        }
        main > nav {
          display: none !important;
        }
        main {
          padding: 0 !important;
          margin: 0 !important;
          max-width: 100% !important;
          overflow: hidden !important;
        }
        .ai-assistant-trigger,
        .ai-assistant-container,
        [class*="AIAssistant"] {
          display: none !important;
        }
      `}} />

      {/* Dynamic Ambient Background Glows */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full bg-amber-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full bg-purple-500/5 blur-[150px] pointer-events-none" />
      
      {/* Sleek Glass Top Header Bar */}
      <div className="h-16 border-b border-white/5 bg-black/40 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0 relative z-20">
        {/* Left Side Info */}
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => window.location.href = "/dashboard"}
            className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all text-xs font-semibold"
          >
            <ArrowLeft className="size-3.5" />
            <span className="hidden sm:inline">Dashboard</span>
          </button>
          
          <div className="hidden sm:block h-4 w-px bg-white/10" />

          <div className="flex items-center gap-2">
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1.5 sm:px-2 py-0.5 rounded">
              LIVE
            </span>
            <h1 className="text-xs sm:text-sm font-bold tracking-tight text-white hidden sm:block">
              {restaurant?.name || "Restaurant Floor"}
            </h1>
          </div>

          <div className="flex items-center gap-1.5 pl-2">
            <span className={`size-1.5 rounded-full ${isLiveConnected ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
            <span className="text-[8px] sm:text-[9px] font-mono-dashboard text-white/40 uppercase tracking-widest hidden xs:block">
              {isLiveConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
        </div>

        {/* Center Filter controls */}
        <div className="hidden lg:flex items-center gap-1 p-0.5 bg-white/5 border border-white/10 rounded-lg">
          {[
            { id: "all", label: "All Tables" },
            { id: "AVAILABLE", label: "Available" },
            { id: "OCCUPIED", label: "Occupied" },
            { id: "RESERVED", label: "Reserved" },
            { id: "DIRTY", label: "Dirty" },
            { id: "attention", label: "Attention Needed" }
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1 rounded-md text-[10px] uppercase tracking-wider font-extrabold transition-all ${
                filter === f.id
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-md shadow-amber-500/15"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Right Status Panel */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Live Clock */}
          <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-white/60 font-mono-dashboard bg-white/5 border border-white/5 px-1.5 sm:px-2.5 py-1 rounded-md">
            <Clock className="size-3 sm:size-3.5 text-amber-500" />
            <span className="font-extrabold hidden sm:block">{time}</span>
          </div>

          {/* Manual Refresh */}
          <button
            onClick={handleManualSync}
            className="p-1.5 sm:p-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white hover:text-amber-500 rounded-lg transition-all"
            title="Force Floor Plan Synchronization"
          >
            <RefreshCw className="size-3.5 sm:size-4" />
          </button>
        </div>
      </div>

      {/* Visual Filter Dropdown for Mobile View */}
      <div className="lg:hidden flex items-center justify-between p-2 sm:p-3 bg-black/20 border-b border-white/5 px-4 sm:px-6">
        <span className="text-[9px] sm:text-[10px] font-black uppercase text-white/40 tracking-wider">Filter</span>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-7 sm:h-8 bg-black/50 border border-white/10 text-white text-[10px] sm:text-xs px-2 sm:px-2.5 rounded-lg focus:border-amber-500 outline-none"
        >
          <option value="all">All Tables</option>
          <option value="AVAILABLE">Available</option>
          <option value="OCCUPIED">Occupied</option>
          <option value="RESERVED">Reserved</option>
          <option value="DIRTY">Dirty</option>
          <option value="attention">Attention Needed</option>
        </select>
      </div>

      {/* Immersive Floor canvas layout */}
      <div className="flex-1 relative overflow-hidden flex flex-col">
        <FloorPlanEditor
          locationId={locationId}
          restaurantId={restaurantId}
          tables={tables}
          tableServices={filteredServices}
          allTableServices={tableServices}
          staff={staff}
          updateTableService={updateTableService}
          assignServer={assignServer}
          onSync={fetchTableServices}
          restaurant={restaurant}
        />
      </div>
    </div>
  );
}
