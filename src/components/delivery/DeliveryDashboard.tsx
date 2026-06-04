"use client";

import { useState, useEffect } from "react";
import { Truck, MapPin, Clock, User, CheckCircle, XCircle, Plus, Navigation, Sparkles } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicleInfo?: string;
  isAvailable: boolean;
  rating: number;
  totalDeliveries: number;
}

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
  totalAmount: number;
  items: OrderItem[];
}

interface Delivery {
  id: string;
  status: string;
  pickupAddress: string;
  deliveryAddress: string;
  pickupTime?: Date;
  deliveryTime?: Date;
  estimatedTime?: number;
  distance?: number;
  notes?: string;
  order: Order;
  driver?: Driver;
  createdAt: Date;
}

export default function DeliveryDashboard({ restaurantId, restaurant }: { restaurantId: string; restaurant?: any }) {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [minLoading, setMinLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, pending, assigned, in_transit, delivered
  const [addingDriver, setAddingDriver] = useState(false);
  const [newDriver, setNewDriver] = useState({ name: "", phone: "", email: "", vehicleInfo: "" });

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        await Promise.all([
          fetchDeliveries(),
          fetchDrivers()
        ]);
      } finally {
        if (mounted) {
          setLoading(false);
          setMinLoading(false);
        }
      }
    };

    loadData();

    const interval = setInterval(fetchDeliveries, 30000); // Refresh every 30 seconds
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [restaurantId, filter]);

  async function fetchDeliveries() {
    try {
      const response = await axios.get(`/api/delivery/deliveries?restaurantId=${restaurantId}${filter !== "all" ? `&status=${filter}` : ""}`);
      setDeliveries(response.data);
    } catch (error) {
      console.error("Failed to load deliveries");
    }
  }

  async function fetchDrivers() {
    try {
      const response = await axios.get(`/api/delivery/drivers?restaurantId=${restaurantId}`);
      setDrivers(response.data);
    } catch (error) {
      console.error("Failed to load drivers");
    }
  }

  async function assignDriver(deliveryId: string, driverId: string) {
    try {
      await axios.patch(`/api/delivery/deliveries/${deliveryId}`, { driverId, status: "ASSIGNED" });
      toast.success("Driver assigned");
      fetchDeliveries();
    } catch (error) {
      toast.error("Failed to assign driver");
    }
  }

  async function updateDeliveryStatus(id: string, status: string) {
    try {
      await axios.patch(`/api/delivery/deliveries/${id}`, { status });
      toast.success("Delivery updated");
      fetchDeliveries();
    } catch (error) {
      toast.error("Failed to update delivery");
    }
  }

  async function addDriver() {
    if (!newDriver.name || !newDriver.phone) {
      toast.error("Name and phone are required");
      return;
    }

    try {
      await axios.post("/api/delivery/drivers", {
        ...newDriver,
        restaurantId,
      });
      toast.success("Driver added!");
      setNewDriver({ name: "", phone: "", email: "", vehicleInfo: "" });
      setAddingDriver(false);
      fetchDrivers();
    } catch (error) {
      toast.error("Failed to add driver");
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING": return "bg-red-500/10 text-red-400 border border-red-500/20";
      case "ASSIGNED": return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
      case "PICKED_UP": return "bg-amber-500/10 text-[#f0a040] border border-amber-500/20";
      case "IN_TRANSIT": return "bg-purple-500/10 text-purple-400 border border-purple-500/20";
      case "DELIVERED": return "bg-[#52d27a]/10 text-[#52d27a] border border-[#52d27a]/20";
      case "CANCELLED": return "bg-white/5 text-[#f5efe2]/40 border border-white/10";
      default: return "bg-white/5 text-[#f5efe2]/50 border border-white/10";
    }
  };

  const filteredDeliveries = deliveries.filter((d) => {
    if (filter === "all") return true;
    return d.status === filter;
  });

  if (minLoading) {
    return (
      <div className="space-y-6 pt-2">
        <div className="h-8 animate-pulse bg-neutral-900 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse bg-neutral-950 rounded-xl border border-neutral-800"
            />
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
              DELIVERY CONTROL
            </span>
            <span className="text-[10px] text-[#f5efe2]/40 font-mono-dashboard">
              {new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" }).toUpperCase()}
            </span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#f5efe2] leading-none">
            Delivery Dashboard {restaurant?.name && <>at <em className="font-editorial italic font-normal text-[#f0a040]">{restaurant.name}</em></>}
          </h2>
          
          <p className="text-xs sm:text-sm text-[#f5efe2]/60 font-serif italic tracking-wide max-w-xl">
            Real-time delivery management system. Dispatch orders and monitor driver assignments.
          </p>
        </div>

        {/* Actions panel */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setAddingDriver(true)}
            className="px-4.5 py-3 bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-[#0b0a08] rounded-lg text-xs font-black tracking-wider hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-amber-950/20"
          >
            <Plus className="size-3.5 fill-[#0b0a08]" />
            <span>ADD DRIVER</span>
          </button>
        </div>
      </section>

      {/* Add Driver Form */}
      {addingDriver && (
        <div className="bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] rounded-xl p-6 space-y-4 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#f0a040] to-[#e85a2a]" />
          <h3 className="text-sm font-bold text-[#f5efe2] tracking-wider uppercase">Register New Rider</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[#f5efe2]/60 text-[11px] font-medium mb-1 block">Name *</label>
              <input
                value={newDriver.name}
                onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })}
                placeholder="Driver name"
                className="w-full h-10 bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] text-[#f5efe2] placeholder-[#f5efe2]/20 focus:border-[#f0a040] outline-none text-[13px] px-3 transition-colors rounded-lg"
              />
            </div>
            <div>
              <label className="text-[#f5efe2]/60 text-[11px] font-medium mb-1 block">Phone *</label>
              <input
                value={newDriver.phone}
                onChange={(e) => setNewDriver({ ...newDriver, phone: e.target.value })}
                placeholder="Phone number"
                className="w-full h-10 bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] text-[#f5efe2] placeholder-[#f5efe2]/20 focus:border-[#f0a040] outline-none text-[13px] px-3 transition-colors rounded-lg"
              />
            </div>
            <div>
              <label className="text-[#f5efe2]/60 text-[11px] font-medium mb-1 block">Email</label>
              <input
                type="email"
                value={newDriver.email}
                onChange={(e) => setNewDriver({ ...newDriver, email: e.target.value })}
                placeholder="Email"
                className="w-full h-10 bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] text-[#f5efe2] placeholder-[#f5efe2]/20 focus:border-[#f0a040] outline-none text-[13px] px-3 transition-colors rounded-lg"
              />
            </div>
            <div>
              <label className="text-[#f5efe2]/60 text-[11px] font-medium mb-1 block">Vehicle Info</label>
              <input
                value={newDriver.vehicleInfo}
                onChange={(e) => setNewDriver({ ...newDriver, vehicleInfo: e.target.value })}
                placeholder="Vehicle make/model, plate number"
                className="w-full h-10 bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] text-[#f5efe2] placeholder-[#f5efe2]/20 focus:border-[#f0a040] outline-none text-[13px] px-3 transition-colors rounded-lg"
              />
            </div>
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={addDriver}
              className="px-4.5 py-2.5 bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-[#0b0a08] rounded-lg text-xs font-black tracking-wider hover:brightness-110 transition-all shadow-md"
            >
              Save Driver
            </button>
            <button
              onClick={() => {
                setAddingDriver(false);
                setNewDriver({ name: "", phone: "", email: "", vehicleInfo: "" });
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
          { label: "PENDING DISPATCH", value: deliveries.filter((d) => d.status === "PENDING").length.toString(), color: "text-red-400" },
          { label: "IN TRANSIT", value: deliveries.filter((d) => d.status === "IN_TRANSIT").length.toString(), color: "text-purple-400" },
          { label: "DELIVERED TODAY", value: deliveries.filter((d) => d.status === "DELIVERED").length.toString(), color: "text-[#52d27a]" },
          { label: "ACTIVE DRIVERS", value: drivers.filter((d) => d.isAvailable).length.toString(), color: "text-[#f5efe2]" },
          { label: "TOTAL FLEET", value: drivers.length.toString(), color: "text-[#f5efe2]" },
        ].map((stat, idx) => (
          <div
            key={stat.label}
            className={`p-6 relative group transition-all duration-300 ${
              idx === 0 
                ? "bg-gradient-to-br from-[#f0a040]/5 via-transparent to-transparent" 
                : "hover:bg-white/[0.01]"
            }`}
          >
            {idx === 0 && (
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#f0a040] to-[#e85a2a]" />
            )}
            
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-[0.2em] text-[#f5efe2]/40 uppercase">
                {stat.label}
              </span>
              <Truck className="size-3.5 text-[#f5efe2]/40" />
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
      <div className="max-w-full overflow-x-auto whitespace-nowrap scrollbar-none">
        <div className="flex items-center gap-1.5 p-1 bg-white/5 border border-white/10 rounded-lg w-fit">
          {["all", "PENDING", "ASSIGNED", "IN_TRANSIT", "DELIVERED"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 rounded-md text-[10px] uppercase tracking-wider font-extrabold transition-all ${
                filter === f
                  ? "bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-[#0b0a08]"
                  : "text-[#f5efe2]/50 hover:text-[#f5efe2] hover:bg-white/5"
              }`}
            >
              {f.charAt(0) + f.slice(1).toLowerCase().replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Deliveries List */}
      <div className="space-y-4">
        {filteredDeliveries.map((delivery) => (
          <div
            key={delivery.id}
            className="bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] rounded-xl p-6 shadow-md transition-all hover:border-[#f0a040]/30"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[16px] font-bold text-[#f5efe2] font-mono-dashboard">#{delivery.order.orderNumber}</span>
                  <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider ${getStatusColor(delivery.status)}`}>
                    {delivery.status.replace("_", " ")}
                  </span>
                </div>
                <div className="text-[11px] text-[#f5efe2]/60 font-mono-dashboard">
                  ₹{delivery.order.totalAmount.toFixed(2)} · {delivery.order.items.length} {delivery.order.items.length === 1 ? "item" : "items"}
                </div>
              </div>
              {delivery.driver && (
                <div className="flex items-center gap-2 text-[12px] text-[#f5efe2]/60">
                  <User className="size-3.5 text-[#f0a040]" />
                  <span className="font-bold text-[#f5efe2]">{delivery.driver.name}</span>
                  <span className="text-[10px] font-mono-dashboard">★ {delivery.driver.rating.toFixed(1)}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 border-y border-[rgba(255,255,255,0.05)] py-4">
              <div className="flex items-start gap-2">
                <MapPin className="size-4 text-[#f0a040] mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-[10px] font-bold tracking-wider text-[#f5efe2]/40 uppercase mb-0.5">Pickup Address</div>
                  <div className="text-[12px] text-[#f5efe2]">{delivery.pickupAddress}</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Navigation className="size-4 text-[#52d27a] mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-[10px] font-bold tracking-wider text-[#f5efe2]/40 uppercase mb-0.5">Delivery Address</div>
                  <div className="text-[12px] text-[#f5efe2]">{delivery.deliveryAddress}</div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-[11px] text-[#f5efe2]/40 font-mono-dashboard">
                {delivery.distance && (
                  <div className="flex items-center gap-1">
                    <Navigation className="size-3" />
                    <span>{delivery.distance} km</span>
                  </div>
                )}
                {delivery.estimatedTime && (
                  <div className="flex items-center gap-1">
                    <Clock className="size-3" />
                    <span>~{delivery.estimatedTime} min</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {delivery.status === "PENDING" && (
                  <select
                    onChange={(e) => assignDriver(delivery.id, e.target.value)}
                    className="h-9 bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] text-[#f5efe2] text-[12px] px-3 outline-none focus:border-[#f0a040] rounded-lg transition-colors"
                  >
                    <option value="">Assign driver</option>
                    {drivers.filter((d) => d.isAvailable).map((driver) => (
                      <option key={driver.id} value={driver.id} className="bg-[#0b0a08] text-[#f5efe2]">
                        {driver.name} ★ {driver.rating.toFixed(1)}
                      </option>
                    ))}
                  </select>
                )}
                {delivery.status === "ASSIGNED" && (
                  <button
                    onClick={() => updateDeliveryStatus(delivery.id, "PICKED_UP")}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-[#0b0a08] text-[11px] font-black uppercase tracking-wider hover:brightness-110 transition-all"
                  >
                    Picked Up
                  </button>
                )}
                {delivery.status === "PICKED_UP" && (
                  <button
                    onClick={() => updateDeliveryStatus(delivery.id, "IN_TRANSIT")}
                    className="px-4 py-2 rounded-lg bg-[rgba(168,85,247,0.2)] border border-[rgba(168,85,247,0.3)] text-[#c084fc] text-[11px] font-black uppercase tracking-wider hover:bg-[rgba(168,85,247,0.3)] transition-all"
                  >
                    In Transit
                  </button>
                )}
                {delivery.status === "IN_TRANSIT" && (
                  <button
                    onClick={() => updateDeliveryStatus(delivery.id, "DELIVERED")}
                    className="px-4 py-2 rounded-lg bg-[rgba(82,210,122,0.15)] border border-[rgba(82,210,122,0.25)] text-[#52d27a] text-[11px] font-black uppercase tracking-wider hover:bg-[rgba(82,210,122,0.25)] transition-all flex items-center justify-center gap-1"
                  >
                    <CheckCircle className="size-3" />
                    Delivered
                  </button>
                )}
                {delivery.status !== "DELIVERED" && delivery.status !== "CANCELLED" && (
                  <button
                    onClick={() => updateDeliveryStatus(delivery.id, "CANCELLED")}
                    className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all text-xs font-semibold"
                  >
                    <XCircle className="size-3.5" />
                  </button>
                )}
              </div>
            </div>

            {delivery.notes && (
              <div className="mt-3 text-[11px] text-[#f5efe2]/40 italic font-serif border-t border-[rgba(255,255,255,0.03)] pt-2.5">{delivery.notes}</div>
            )}
          </div>
        ))}
      </div>

      {filteredDeliveries.length === 0 && (
        <div className="text-center py-16 bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] rounded-xl">
          <Truck className="size-12 text-[#f5efe2]/20 mx-auto mb-4" />
          <p className="text-[13px] text-[#f5efe2]/40 font-serif italic">No deliveries in this status</p>
          <p className="text-[11px] text-[#f5efe2]/20 mt-1 font-mono-dashboard">Deliveries will appear here when created</p>
        </div>
      )}
    </div>
  );
}
