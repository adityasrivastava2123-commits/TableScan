"use client";

import { useState, useEffect } from "react";
import { MapPin, User, Clock, CheckCircle, Table as TableIcon, Plus, Check, BellRing } from "lucide-react";
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

interface ServiceCall {
  type: string;
  message?: string | null;
  status: "OPEN" | "RESOLVED";
  requestedAt: string;
}

export default function TableServiceManagement({ restaurantId, locationId, restaurant }: { restaurantId: string; locationId: string; restaurant?: any }) {
  const [tableServices, setTableServices] = useState<TableService[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [minLoading, setMinLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, available, occupied, reserved, dirty
  const [addingTable, setAddingTable] = useState(false);
  const [newTable, setNewTable] = useState({ name: "", capacity: 4 });
  const [viewMode, setViewMode] = useState<"grid" | "floorplan">("floorplan");

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        await Promise.all([
          fetchTableServices(),
          fetchTables(),
          fetchStaff()
        ]);
      } finally {
        if (mounted) {
          setLoading(false);
          setMinLoading(false);
        }
      }
    };

    loadData();

    const interval = setInterval(fetchTableServices, 30000); // Refresh every 30 seconds
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [restaurantId, locationId, filter]);

  async function fetchTableServices() {
    try {
      const response = await axios.get(`/api/table-service?restaurantId=${restaurantId}${filter !== "all" ? `&status=${filter}` : ""}`);
      setTableServices(response.data);
    } catch (error) {
      console.error("Failed to load table services");
    }
  }

  async function createTable() {
    if (!newTable.name) {
      toast.error("Table name is required");
      return;
    }

    try {
      await axios.post("/api/tables", {
        name: newTable.name,
        capacity: newTable.capacity,
        locationId,
      });
      toast.success("Table created and added to service!");
      setNewTable({ name: "", capacity: 4 });
      setAddingTable(false);
      fetchTables();
      fetchTableServices();
    } catch (error: any) {
      console.error("Failed to create table:", error);
      const errorMessage = error.response?.data?.error || error.message || "Failed to create table";
      toast.error(errorMessage);
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
      await axios.patch(`/api/table-service/${id}`, { status });
      toast.success("Table updated");
      fetchTableServices();
    } catch (error) {
      toast.error("Failed to update table");
    }
  }

  async function assignServer(id: string, serverId: string) {
    try {
      await axios.patch(`/api/table-service/${id}`, { serverId });
      toast.success("Server assigned");
      fetchTableServices();
    } catch (error) {
      toast.error("Failed to assign server");
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "AVAILABLE": return "bg-[#52d27a]/10 text-[#52d27a] border border-[#52d27a]/20";
      case "OCCUPIED": return "bg-amber-500/10 text-[#f0a040] border border-amber-500/20";
      case "RESERVED": return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
      case "DIRTY": return "bg-red-500/10 text-red-400 border border-red-500/20";
      case "MAINTENANCE": return "bg-white/5 text-[#f5efe2]/40 border border-white/10";
      default: return "bg-white/5 text-[#f5efe2]/50 border border-white/10";
    }
  };

  const getElapsedTime = (date?: Date) => {
    if (!date) return "-";
    const elapsed = Math.floor((new Date().getTime() - new Date(date).getTime()) / 60000); // minutes
    return elapsed < 60 ? `${elapsed}m` : `${Math.floor(elapsed / 60)}h ${elapsed % 60}m`;
  };

  const getServiceCall = (notes?: string): ServiceCall | null => {
    if (!notes) return null;
    try {
      const parsed = JSON.parse(notes);
      return parsed.serviceCall?.status === "OPEN" ? parsed.serviceCall : null;
    } catch {
      return null;
    }
  };

  async function resolveServiceCall(id: string) {
    try {
      await axios.patch(`/api/table-service/${id}`, { resolveServiceCall: true });
      toast.success("Service call resolved");
      fetchTableServices();
    } catch {
      toast.error("Failed to resolve service call");
    }
  }

  const filteredServices = tableServices.filter((s) => {
    if (filter === "all") return true;
    return s.status === filter;
  });
  const activeServiceCalls = tableServices.filter((service) => getServiceCall(service.notes));

  if (loading) {
    return (
      <div className="space-y-6 pt-2">
        <div className="h-8 animate-pulse bg-neutral-900 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 animate-pulse bg-neutral-950 rounded-xl border border-neutral-800" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 relative">
      {/* Thin Saffron Accenting Border at top */}
      <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-[#f0a040] to-transparent absolute top-0 left-0 opacity-40 pointer-events-none" />

      {/* EDITORIAL HERO HEADER */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-2">
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="text-[9px] font-black uppercase tracking-[0.25em] text-[#f0a040] bg-[#f0a040]/10 border border-[#f0a040]/20 px-3 py-1 rounded-full">
              FLOOR SERVICE
            </span>
            <span className="text-[10px] text-[#f5efe2]/40 font-mono-dashboard">
              {new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" }).toUpperCase()}
            </span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#f5efe2] leading-none">
            Table Service Deck {restaurant?.name && <>at <em className="font-editorial italic font-normal text-[#f0a040]">{restaurant.name}</em></>}
          </h2>
          
          <p className="text-xs sm:text-sm text-[#f5efe2]/60 font-serif italic tracking-wide max-w-xl">
            Live interactive floor plans, dining statuses, and server allocations.
          </p>
        </div>

        {/* Actions panel */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="flex bg-white/5 border border-white/10 p-1 rounded-lg">
            <button
              onClick={() => setViewMode("grid")}
              className={`px-3.5 py-1.5 rounded-md text-[10px] uppercase tracking-wider font-extrabold transition-all ${
                viewMode === "grid"
                  ? "bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-[#0b0a08]"
                  : "text-[#f5efe2]/50 hover:text-[#f5efe2]"
              }`}
            >
              Grid View
            </button>
            <button
              onClick={() => setViewMode("floorplan")}
              className={`px-3.5 py-1.5 rounded-md text-[10px] uppercase tracking-wider font-extrabold transition-all ${
                viewMode === "floorplan"
                  ? "bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-[#0b0a08]"
                  : "text-[#f5efe2]/50 hover:text-[#f5efe2]"
              }`}
            >
              Floor Plan
            </button>
          </div>

          <button
            onClick={() => setAddingTable(true)}
            className="px-4.5 py-3 bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-[#0b0a08] rounded-lg text-xs font-black tracking-wider hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-amber-950/20"
          >
            <Plus className="size-3.5 fill-[#0b0a08]" />
            <span>ADD TABLE</span>
          </button>
        </div>
      </section>

      {/* Add Table Form */}
      {addingTable && (
        <div className="bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] rounded-xl p-6 space-y-4 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#f0a040] to-[#e85a2a]" />
          <h3 className="text-sm font-bold text-[#f5efe2] tracking-wider uppercase">Add Dining Table</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[#f5efe2]/60 text-[11px] font-medium mb-1 block">Table Name *</label>
              <input
                value={newTable.name}
                onChange={(e) => setNewTable({ ...newTable, name: e.target.value })}
                placeholder="e.g., Table 1"
                className="w-full h-10 bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] text-[#f5efe2] placeholder-[#f5efe2]/20 focus:border-[#f0a040] outline-none text-[13px] px-3 transition-colors rounded-lg"
              />
            </div>
            <div>
              <label className="text-[#f5efe2]/60 text-[11px] font-medium mb-1 block">Capacity</label>
              <input
                type="number"
                value={newTable.capacity}
                onChange={(e) => setNewTable({ ...newTable, capacity: parseInt(e.target.value) || 4 })}
                min="1"
                className="w-full h-10 bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] text-[#f5efe2] focus:border-[#f0a040] outline-none text-[13px] px-3 transition-colors rounded-lg"
              />
            </div>
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={createTable}
              className="px-4.5 py-2.5 bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-[#0b0a08] rounded-lg text-xs font-black tracking-wider hover:brightness-110 transition-all shadow-md"
            >
              Create Table
            </button>
            <button
              onClick={() => {
                setAddingTable(false);
                setNewTable({ name: "", capacity: 4 });
              }}
              className="px-4.5 py-2.5 border border-[rgba(255,255,255,0.08)] bg-white/[0.02] hover:bg-white/[0.04] rounded-lg text-xs font-semibold tracking-wider text-[#f5efe2] transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* STAT STRIP - 5-Column Grid with 1px Dividers */}
      <section className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] rounded-xl overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-[rgba(255,255,255,0.08)] relative z-10 shadow-xl">
        {[
          { label: "AVAILABLE TABLES", value: tableServices.filter((s) => s.status === "AVAILABLE").length.toString(), color: "text-[#52d27a]" },
          { label: "OCCUPIED TABLES", value: tableServices.filter((s) => s.status === "OCCUPIED").length.toString(), color: "text-[#f0a040]" },
          { label: "RESERVED TABLES", value: tableServices.filter((s) => s.status === "RESERVED").length.toString(), color: "text-blue-400" },
          { label: "DIRTY / BUSSED", value: tableServices.filter((s) => s.status === "DIRTY").length.toString(), color: "text-red-400" },
          { label: "TOTAL TABLES", value: tables.length.toString(), color: "text-[#f5efe2]" },
        ].map((stat, idx) => (
          <div
            key={stat.label}
            className={`p-6 relative group transition-all duration-300 ${
              idx === 1 
                ? "bg-gradient-to-br from-[#f0a040]/5 via-transparent to-transparent" 
                : "hover:bg-white/[0.01]"
            }`}
          >
            {idx === 1 && (
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#f0a040] to-[#e85a2a]" />
            )}
            
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-[0.2em] text-[#f5efe2]/40 uppercase">
                {stat.label}
              </span>
              <TableIcon className="size-3.5 text-[#f5efe2]/40" />
            </div>

            <div className="mt-4 flex items-baseline gap-2">
              <h3 className={`text-3xl md:text-4xl font-extrabold tracking-tight font-mono-dashboard leading-none ${stat.color}`}>
                {stat.value}
              </h3>
            </div>
          </div>
        ))}
      </section>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1.5 p-1 bg-white/5 border border-white/10 rounded-lg w-fit">
        {["all", "AVAILABLE", "OCCUPIED", "RESERVED", "DIRTY"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3.5 py-1.5 rounded-md text-[10px] uppercase tracking-wider font-extrabold transition-all ${
              filter === f
                ? "bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-[#0b0a08]"
                : "text-[#f5efe2]/55 hover:text-[#f5efe2] hover:bg-white/5"
            }`}
          >
            {f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>
        {activeServiceCalls.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-[#f0a040]/25 bg-[#f0a040]/10 px-3 py-2 text-xs font-bold text-[#f0a040]">
            <BellRing className="size-4" />
            {activeServiceCalls.length} waiter call{activeServiceCalls.length === 1 ? "" : "s"} open
          </div>
        )}
      </div>

      {activeServiceCalls.length > 0 && (
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {activeServiceCalls.map((service) => {
            const call = getServiceCall(service.notes);
            if (!call) return null;

            return (
              <div key={service.id} className="rounded-xl border border-[#f0a040]/25 bg-[#f0a040]/10 p-4 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <BellRing className="size-4 text-[#f0a040]" />
                    <p className="text-xs font-black text-[#f5efe2]">{service.table.name}</p>
                    <span className="rounded-full bg-[#0b0a08] px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#f0a040]">
                      {call.type.replace("_", " ")}
                    </span>
                  </div>
                  {call.message && (
                    <p className="mt-2 text-xs text-[#f5efe2]/60">{call.message}</p>
                  )}
                  <p className="mt-1 text-[10px] text-[#f5efe2]/35 font-mono-dashboard">
                    Requested {getElapsedTime(new Date(call.requestedAt))} ago
                  </p>
                </div>
                <button
                  onClick={() => resolveServiceCall(service.id)}
                  className="rounded-lg bg-[#52d27a] px-3 py-2 text-[10px] font-black uppercase tracking-wider text-[#0b0a08]"
                >
                  Resolve
                </button>
              </div>
            );
          })}
        </section>
      )}

      {/* Tables Layout Display */}
      {viewMode === "floorplan" ? (
        <FloorPlanEditor
          locationId={locationId}
          restaurantId={restaurantId}
          tables={tables}
          tableServices={tableServices}
          staff={staff}
          updateTableService={updateTableService}
          assignServer={assignServer}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredServices.length > 0 ? (
            filteredServices.map((service) => (
              <div
                key={service.id}
                className="bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] rounded-xl p-5 space-y-4 hover:border-[#f0a040]/30 transition-all flex flex-col justify-between shadow-lg"
              >
                {/* Table Header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[18px] font-bold text-[#f5efe2]">{service.table.name}</span>
                      {service.table.capacity && (
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 text-[#f5efe2]/60 font-mono-dashboard">
                          {service.table.capacity} seats
                        </span>
                      )}
                    </div>
                    <span className={`px-2.5 py-0.5 text-[9px] rounded-full font-black uppercase tracking-wider ${getStatusColor(service.status)}`}>
                      {service.status}
                    </span>
                  </div>
                </div>

                {/* Server Assignment */}
                {getServiceCall(service.notes) && (
                  <div className="rounded-xl border border-[#f0a040]/25 bg-[#f0a040]/10 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-[#f0a040]">
                        <BellRing className="size-4" />
                        <span className="text-[10px] font-black uppercase tracking-wider">
                          {getServiceCall(service.notes)?.type.replace("_", " ")}
                        </span>
                      </div>
                      <button
                        onClick={() => resolveServiceCall(service.id)}
                        className="text-[10px] font-black uppercase text-[#52d27a]"
                      >
                        Resolve
                      </button>
                    </div>
                    {getServiceCall(service.notes)?.message && (
                      <p className="mt-2 text-[11px] text-[#f5efe2]/60">{getServiceCall(service.notes)?.message}</p>
                    )}
                  </div>
                )}

                {/* Server Assignment */}
                <div className="pt-2 border-t border-[rgba(255,255,255,0.04)]">
                  {service.server ? (
                    <div className="flex items-center gap-2 text-[12px] text-[#f5efe2]/60">
                      <User className="size-3.5 text-[#f0a040]" />
                      <span>Server: <strong className="text-[#f5efe2]">{service.server.name}</strong></span>
                    </div>
                  ) : (
                    <select
                      onChange={(e) => assignServer(service.id, e.target.value)}
                      className="w-full h-9 bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] text-[#f5efe2] text-[11px] px-2 outline-none focus:border-[#f0a040] rounded-lg transition-all cursor-pointer"
                    >
                      <option value="" className="bg-[#0b0a08]">Assign server</option>
                      {staff.map((person) => (
                        <option key={person.id} value={person.id} className="bg-[#0b0a08]">
                          {person.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Time Info */}
                {service.seatedAt && service.status === "OCCUPIED" && (
                  <div className="flex items-center gap-2 text-[11px] text-[#f5efe2]/40 font-mono-dashboard">
                    <Clock className="size-3.5" />
                    <span>Seated {getElapsedTime(service.seatedAt)} ago</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-[rgba(255,255,255,0.04)]">
                  {service.status === "AVAILABLE" && (
                    <button
                      onClick={() => updateTableService(service.id, "OCCUPIED")}
                      className="flex-1 py-2 rounded-lg bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-[#0b0a08] text-[11px] font-black uppercase tracking-wider hover:brightness-110 transition-all"
                    >
                      Seat
                    </button>
                  )}
                  {service.status === "OCCUPIED" && (
                    <>
                      <button
                        onClick={() => updateTableService(service.id, "DIRTY")}
                        className="flex-1 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-bold hover:bg-red-500/20 transition-all uppercase tracking-wider"
                      >
                        Clear
                      </button>
                      <button
                        onClick={() => updateTableService(service.id, "AVAILABLE")}
                        className="flex-1 py-2 rounded-lg bg-[#52d27a]/10 border border-[#52d27a]/20 text-[#52d27a] text-[11px] font-bold hover:bg-[#52d27a]/20 transition-all uppercase tracking-wider"
                      >
                        Free
                      </button>
                    </>
                  )}
                  {service.status === "DIRTY" && (
                    <button
                      onClick={() => updateTableService(service.id, "AVAILABLE")}
                      className="flex-1 py-2 rounded-lg bg-[#52d27a]/15 border border-[#52d27a]/25 text-[#52d27a] text-[11px] font-black hover:brightness-110 transition-all flex items-center justify-center gap-1 uppercase tracking-wider"
                    >
                      <Check className="size-3" />
                      Clean
                    </button>
                  )}
                  {service.status === "RESERVED" && (
                    <button
                      onClick={() => updateTableService(service.id, "OCCUPIED")}
                      className="flex-1 py-2 rounded-lg bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-[#0b0a08] text-[11px] font-black uppercase tracking-wider hover:brightness-110 transition-all"
                    >
                      Seat Guest
                    </button>
                  )}
                </div>

                {/* Notes */}
                {service.notes && (
                  <div className="text-[11px] text-[#f5efe2]/40 italic font-serif border-t border-[rgba(255,255,255,0.03)] pt-2">{service.notes}</div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-16 col-span-full bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] rounded-xl w-full">
              <MapPin className="size-12 text-[#f5efe2]/20 mx-auto mb-4" />
              <p className="text-[#f5efe2]/40 text-[13px] font-serif italic">No tables in this status</p>
              <p className="text-[#f5efe2]/20 text-[11px] mt-1 font-mono-dashboard">Add tables to get started</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
