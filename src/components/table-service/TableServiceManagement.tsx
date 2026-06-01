"use client";

import { useState, useEffect } from "react";
import { MapPin, User, Clock, CheckCircle, XCircle, AlertCircle, Users, Plus, MessageSquare, Send, Check } from "lucide-react";
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

export default function TableServiceManagement({ restaurantId, locationId }: { restaurantId: string; locationId: string }) {
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
      const response = await axios.post("/api/tables", {
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
      case "AVAILABLE": return "bg-[rgba(34,197,94,0.1)] text-[#4ade80] border-[rgba(34,197,94,0.3)]";
      case "OCCUPIED": return "bg-[rgba(249,115,22,0.1)] text-[#f97316] border-[rgba(249,115,22,0.3)]";
      case "RESERVED": return "bg-[rgba(59,130,246,0.1)] text-[#60a5fa] border-[rgba(59,130,246,0.3)]";
      case "DIRTY": return "bg-[rgba(239,68,68,0.1)] text-[#f87171] border-[rgba(239,68,68,0.3)]";
      case "MAINTENANCE": return "bg-[rgba(100,116,139,0.1)] text-[#94a3b8] border-[rgba(100,116,139,0.3)]";
      default: return "bg-[rgba(255,255,255,0.05)] text-[#9a9488] border-[rgba(255,255,255,0.1)]";
    }
  };

  const getElapsedTime = (date?: Date) => {
    if (!date) return "-";
    const elapsed = Math.floor((new Date().getTime() - new Date(date).getTime()) / 60000); // minutes
    return elapsed < 60 ? `${elapsed}m` : `${Math.floor(elapsed / 60)}h ${elapsed % 60}m`;
  };

  const filteredServices = tableServices.filter((s) => {
    if (filter === "all") return true;
    return s.status === filter;
  });

  if (loading) {
    return <div className="text-center py-12 text-[#9a9488]">Loading table service...</div>;
  }

  return (
    <div className="p-7 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3.5 flex-wrap">
        <div className="w-[46px] h-[46px] rounded-xl bg-[#f97316] flex items-center justify-center flex-shrink-0">
          <MapPin className="size-5 text-white" />
        </div>
        <div>
          <h1 className="text-[20px] font-bold text-[#f0ece4]">Table Service</h1>
          <p className="text-[12px] text-[#9a9488]">Track table status and server assignments</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto sm:ml-auto">
          <div className="flex bg-[#222222] border border-[rgba(255,255,255,0.12)] p-1 rounded-lg">
            <button
              onClick={() => setViewMode("grid")}
              className={`px-3.5 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                viewMode === "grid"
                  ? "bg-[#f97316] text-white shadow-sm"
                  : "text-[#9a9488] hover:text-[#f0ece4]"
              }`}
            >
              Grid View
            </button>
            <button
              onClick={() => setViewMode("floorplan")}
              className={`px-3.5 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                viewMode === "floorplan"
                  ? "bg-[#f97316] text-white shadow-sm"
                  : "text-[#9a9488] hover:text-[#f0ece4]"
              }`}
            >
              Floor Plan
            </button>
          </div>
          <button
            onClick={() => setAddingTable(true)}
            className="px-4 py-2 rounded-lg bg-[#f97316] text-white text-[12px] font-semibold hover:bg-[#ea6c0a] transition-all flex-shrink-0"
          >
            + Add Table
          </button>
          {["all", "AVAILABLE", "OCCUPIED", "RESERVED", "DIRTY"].map((f) => (
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

      {/* Add Table Form */}
      {addingTable && (
        <div className="bg-[#111111] border border-[rgba(255,255,255,0.07)] rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[#f0ece4] text-[12px] font-medium mb-1 block">Table Name *</label>
              <input
                value={newTable.name}
                onChange={(e) => setNewTable({ ...newTable, name: e.target.value })}
                placeholder="e.g., Table 1"
                className="w-full h-10 bg-[#222222] border-[rgba(255,255,255,0.12)] text-[#f0ece4] placeholder-[#5a5650] focus:border-[#f97316] text-[13px] px-3"
              />
            </div>
            <div>
              <label className="text-[#f0ece4] text-[12px] font-medium mb-1 block">Capacity</label>
              <input
                type="number"
                value={newTable.capacity}
                onChange={(e) => setNewTable({ ...newTable, capacity: parseInt(e.target.value) || 4 })}
                min="1"
                className="w-full h-10 bg-[#222222] border-[rgba(255,255,255,0.12)] text-[#f0ece4] placeholder-[#5a5650] focus:border-[#f97316] text-[13px] px-3"
              />
            </div>
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={createTable}
              className="px-4 py-2 rounded-lg bg-[#f97316] text-white text-[12px] font-semibold hover:bg-[#ea6c0a] transition-colors"
            >
              Create Table
            </button>
            <button
              onClick={() => {
                setAddingTable(false);
                setNewTable({ name: "", capacity: 4 });
              }}
              className="px-4 py-2 rounded-lg bg-[#222222] border border-[rgba(255,255,255,0.12)] text-[#f0ece4] hover:bg-[#181818] transition-colors text-[12px]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      {minLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3.5">
          <div className="bg-[#111111] border border-[rgba(255,255,255,0.07)] rounded-xl p-5">
            <div className="text-[11px] text-[#5a5650] mb-1">Available</div>
            <div className="text-[26px] font-bold text-[#4ade80]">{tableServices.filter((s) => s.status === "AVAILABLE").length}</div>
          </div>
          <div className="bg-[#111111] border border-[rgba(255,255,255,0.07)] rounded-xl p-5">
            <div className="text-[11px] text-[#5a5650] mb-1">Occupied</div>
            <div className="text-[26px] font-bold text-[#f97316]">{tableServices.filter((s) => s.status === "OCCUPIED").length}</div>
          </div>
          <div className="bg-[#111111] border border-[rgba(255,255,255,0.07)] rounded-xl p-5">
            <div className="text-[11px] text-[#5a5650] mb-1">Reserved</div>
            <div className="text-[26px] font-bold text-[#60a5fa]">{tableServices.filter((s) => s.status === "RESERVED").length}</div>
          </div>
          <div className="bg-[#111111] border border-[rgba(255,255,255,0.07)] rounded-xl p-5">
            <div className="text-[11px] text-[#5a5650] mb-1">Dirty</div>
            <div className="text-[26px] font-bold text-[#f87171]">{tableServices.filter((s) => s.status === "DIRTY").length}</div>
          </div>
          <div className="bg-[#111111] border border-[rgba(255,255,255,0.07)] rounded-xl p-5">
            <div className="text-[11px] text-[#5a5650] mb-1">Total Tables</div>
            <div className="text-[26px] font-bold text-[#f0ece4]">{tables.length}</div>
          </div>
        </div>
      )}

      {/* Tables Display */}
      {minLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl bg-neutral-100 dark:bg-[#141414]" />
          ))}
        </div>
      ) : viewMode === "floorplan" ? (
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
                className={`bg-[#111111] border ${getStatusColor(service.status)} rounded-xl p-5 space-y-4`}
              >
                {/* Table Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[18px] font-bold text-[#f0ece4]">{service.table.name}</span>
                      {service.table.capacity && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.1)] text-[#9a9488]">
                          {service.table.capacity} seats
                        </span>
                      )}
                    </div>
                    <div className={`text-[10px] px-2 py-1 rounded-lg font-medium ${getStatusColor(service.status)}`}>
                      {service.status}
                    </div>
                  </div>
                </div>

                {/* Server Assignment */}
                {service.server ? (
                  <div className="flex items-center gap-2 text-[12px] text-[#9a9488]">
                    <User className="size-3" />
                    <span>{service.server.name}</span>
                  </div>
                ) : (
                  <select
                    onChange={(e) => assignServer(service.id, e.target.value)}
                    className="w-full h-8 bg-[#222222] border-[rgba(255,255,255,0.12)] text-[#f0ece4] text-[11px] px-2 outline-none"
                  >
                    <option value="">Assign server</option>
                    {staff.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.name}
                      </option>
                    ))}
                  </select>
                )}

                {/* Time Info */}
                {service.seatedAt && service.status === "OCCUPIED" && (
                  <div className="flex items-center gap-2 text-[11px] text-[#9a9488]">
                    <Clock className="size-3" />
                    <span>Seated {getElapsedTime(service.seatedAt)} ago</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {service.status === "AVAILABLE" && (
                    <button
                      onClick={() => updateTableService(service.id, "OCCUPIED")}
                      className="flex-1 py-2 rounded-lg bg-[#f97316] text-white text-[11px] font-semibold hover:bg-[#ea6c0a] transition-colors"
                    >
                      Seat
                    </button>
                  )}
                  {service.status === "OCCUPIED" && (
                    <>
                      <button
                        onClick={() => updateTableService(service.id, "DIRTY")}
                        className="flex-1 py-2 rounded-lg bg-[#f87171] text-white text-[11px] font-semibold hover:bg-[#ef4444] transition-colors"
                      >
                        Clear
                      </button>
                      <button
                        onClick={() => updateTableService(service.id, "AVAILABLE")}
                        className="flex-1 py-2 rounded-lg bg-[#4ade80] text-white text-[11px] font-semibold hover:bg-[#22c55e] transition-colors"
                      >
                        Free
                      </button>
                    </>
                  )}
                  {service.status === "DIRTY" && (
                    <button
                      onClick={() => updateTableService(service.id, "AVAILABLE")}
                      className="flex-1 py-2 rounded-lg bg-[#4ade80] text-white text-[11px] font-semibold hover:bg-[#22c55e] transition-colors flex items-center justify-center gap-1"
                    >
                      <CheckCircle className="size-3" />
                      Clean
                    </button>
                  )}
                  {service.status === "RESERVED" && (
                    <button
                      onClick={() => updateTableService(service.id, "OCCUPIED")}
                      className="flex-1 py-2 rounded-lg bg-[#f97316] text-white text-[11px] font-semibold hover:bg-[#ea6c0a] transition-colors"
                    >
                      Seat Guest
                    </button>
                  )}
                </div>

                {/* Notes */}
                {service.notes && (
                  <div className="text-[11px] text-[#9a9488] italic">{service.notes}</div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-16">
              <MapPin className="size-12 text-[#5a5650] mx-auto mb-4" />
              <p className="text-[#5a5650] text-[13px]">No tables in this status</p>
              <p className="text-[#5a5650] text-[11px] mt-2">Add tables to get started</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
