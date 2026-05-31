"use client";

import { useState, useEffect } from "react";
import { Truck, MapPin, Clock, User, CheckCircle, XCircle, Plus, Navigation } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";

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

export default function DeliveryDashboard({ restaurantId }: { restaurantId: string }) {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, pending, assigned, in_transit, delivered
  const [addingDriver, setAddingDriver] = useState(false);
  const [newDriver, setNewDriver] = useState({ name: "", phone: "", email: "", vehicleInfo: "" });

  useEffect(() => {
    fetchDeliveries();
    fetchDrivers();
    const interval = setInterval(fetchDeliveries, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [restaurantId, filter]);

  async function fetchDeliveries() {
    try {
      const response = await axios.get(`/api/delivery/deliveries?restaurantId=${restaurantId}${filter !== "all" ? `&status=${filter}` : ""}`);
      setDeliveries(response.data);
    } catch (error) {
      console.error("Failed to load deliveries");
    } finally {
      setLoading(false);
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
      case "PENDING": return "bg-[rgba(239,68,68,0.1)] text-[#f87171] border-[rgba(239,68,68,0.3)]";
      case "ASSIGNED": return "bg-[rgba(59,130,246,0.1)] text-[#60a5fa] border-[rgba(59,130,246,0.3)]";
      case "PICKED_UP": return "bg-[rgba(249,115,22,0.1)] text-[#f97316] border-[rgba(249,115,22,0.3)]";
      case "IN_TRANSIT": return "bg-[rgba(168,85,247,0.1)] text-[#a855f7] border-[rgba(168,85,247,0.3)]";
      case "DELIVERED": return "bg-[rgba(34,197,94,0.1)] text-[#4ade80] border-[rgba(34,197,94,0.3)]";
      case "CANCELLED": return "bg-[rgba(100,116,139,0.1)] text-[#94a3b8] border-[rgba(100,116,139,0.3)]";
      default: return "bg-[rgba(255,255,255,0.05)] text-[#9a9488] border-[rgba(255,255,255,0.1)]";
    }
  };

  const filteredDeliveries = deliveries.filter((d) => {
    if (filter === "all") return true;
    return d.status === filter;
  });

  if (loading) {
    return <div className="text-center py-12 text-[#9a9488]">Loading deliveries...</div>;
  }

  return (
    <div className="p-7 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3.5 flex-wrap">
        <div className="w-[46px] h-[46px] rounded-xl bg-[#f97316] flex items-center justify-center flex-shrink-0">
          <Truck className="size-5 text-white" />
        </div>
        <div>
          <h1 className="text-[20px] font-bold text-[#f0ece4]">Delivery Management</h1>
          <p className="text-[12px] text-[#9a9488]">Track deliveries and manage drivers</p>
        </div>
        <div className="ml-auto flex gap-2.5">
          <button
            onClick={() => setAddingDriver(true)}
            className="px-4 py-2.5 rounded-lg bg-[#222222] border border-[rgba(255,255,255,0.12)] text-[#f0ece4] text-[12px] font-semibold hover:border-[#f97316] hover:text-[#f97316] transition-all"
          >
            + Add Driver
          </button>
        </div>
      </div>

      {/* Add Driver Form */}
      {addingDriver && (
        <div className="bg-[#111111] border border-[rgba(255,255,255,0.07)] rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[#f0ece4] text-[12px] font-medium mb-1 block">Name *</label>
              <input
                value={newDriver.name}
                onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })}
                placeholder="Driver name"
                className="w-full h-10 bg-[#222222] border-[rgba(255,255,255,0.12)] text-[#f0ece4] placeholder-[#5a5650] focus:border-[#f97316] text-[13px] px-3"
              />
            </div>
            <div>
              <label className="text-[#f0ece4] text-[12px] font-medium mb-1 block">Phone *</label>
              <input
                value={newDriver.phone}
                onChange={(e) => setNewDriver({ ...newDriver, phone: e.target.value })}
                placeholder="Phone number"
                className="w-full h-10 bg-[#222222] border-[rgba(255,255,255,0.12)] text-[#f0ece4] placeholder-[#5a5650] focus:border-[#f97316] text-[13px] px-3"
              />
            </div>
            <div>
              <label className="text-[#f0ece4] text-[12px] font-medium mb-1 block">Email</label>
              <input
                type="email"
                value={newDriver.email}
                onChange={(e) => setNewDriver({ ...newDriver, email: e.target.value })}
                placeholder="Email"
                className="w-full h-10 bg-[#222222] border-[rgba(255,255,255,0.12)] text-[#f0ece4] placeholder-[#5a5650] focus:border-[#f97316] text-[13px] px-3"
              />
            </div>
            <div>
              <label className="text-[#f0ece4] text-[12px] font-medium mb-1 block">Vehicle Info</label>
              <input
                value={newDriver.vehicleInfo}
                onChange={(e) => setNewDriver({ ...newDriver, vehicleInfo: e.target.value })}
                placeholder="Vehicle make/model, plate number"
                className="w-full h-10 bg-[#222222] border-[rgba(255,255,255,0.12)] text-[#f0ece4] placeholder-[#5a5650] focus:border-[#f97316] text-[13px] px-3"
              />
            </div>
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={addDriver}
              className="px-4 py-2 rounded-lg bg-[#f97316] text-white text-[12px] font-semibold hover:bg-[#ea6c0a] transition-colors"
            >
              Save Driver
            </button>
            <button
              onClick={() => {
                setAddingDriver(false);
                setNewDriver({ name: "", phone: "", email: "", vehicleInfo: "" });
              }}
              className="px-4 py-2 rounded-lg bg-[#222222] border border-[rgba(255,255,255,0.12)] text-[#f0ece4] hover:bg-[#181818] transition-colors text-[12px]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3.5">
        <div className="bg-[#111111] border border-[rgba(255,255,255,0.07)] rounded-xl p-5">
          <div className="text-[11px] text-[#5a5650] mb-1">Pending</div>
          <div className="text-[26px] font-bold text-[#f87171]">{deliveries.filter((d) => d.status === "PENDING").length}</div>
        </div>
        <div className="bg-[#111111] border border-[rgba(255,255,255,0.07)] rounded-xl p-5">
          <div className="text-[11px] text-[#5a5650] mb-1">In Transit</div>
          <div className="text-[26px] font-bold text-[#a855f7]">{deliveries.filter((d) => d.status === "IN_TRANSIT").length}</div>
        </div>
        <div className="bg-[#111111] border border-[rgba(255,255,255,0.07)] rounded-xl p-5">
          <div className="text-[11px] text-[#5a5650] mb-1">Delivered</div>
          <div className="text-[26px] font-bold text-[#4ade80]">{deliveries.filter((d) => d.status === "DELIVERED").length}</div>
        </div>
        <div className="bg-[#111111] border border-[rgba(255,255,255,0.07)] rounded-xl p-5">
          <div className="text-[11px] text-[#5a5650] mb-1">Active Drivers</div>
          <div className="text-[26px] font-bold text-[#f0ece4]">{drivers.filter((d) => d.isAvailable).length}</div>
        </div>
        <div className="bg-[#111111] border border-[rgba(255,255,255,0.07)] rounded-xl p-5">
          <div className="text-[11px] text-[#5a5650] mb-1">Total Drivers</div>
          <div className="text-[26px] font-bold text-[#f0ece4]">{drivers.length}</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {["all", "PENDING", "ASSIGNED", "IN_TRANSIT", "DELIVERED"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-[12px] font-semibold transition-all ${
              filter === f
                ? "bg-[#f97316] text-white"
                : "bg-[#222222] border border-[rgba(255,255,255,0.12)] text-[#f0ece4] hover:border-[#f97316]"
            }`}
          >
            {f.charAt(0) + f.slice(1).toLowerCase().replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Deliveries List */}
      <div className="space-y-3">
        {filteredDeliveries.map((delivery) => (
          <div
            key={delivery.id}
            className={`bg-[#111111] border ${getStatusColor(delivery.status)} rounded-xl p-5`}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[16px] font-bold text-[#f0ece4]">#{delivery.order.orderNumber}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-lg font-medium ${getStatusColor(delivery.status)}`}>
                    {delivery.status.replace("_", " ")}
                  </span>
                </div>
                <div className="text-[11px] text-[#9a9488]">
                  ₹{delivery.order.totalAmount.toFixed(2)} · {delivery.order.items.length} items
                </div>
              </div>
              {delivery.driver && (
                <div className="flex items-center gap-2 text-[12px] text-[#9a9488]">
                  <User className="size-3" />
                  <span>{delivery.driver.name}</span>
                  <span className="text-[10px]">★ {delivery.driver.rating.toFixed(1)}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="flex items-start gap-2">
                <MapPin className="size-4 text-[#f97316] mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-[11px] text-[#5a5650] mb-0.5">Pickup</div>
                  <div className="text-[12px] text-[#f0ece4]">{delivery.pickupAddress}</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Navigation className="size-4 text-[#4ade80] mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-[11px] text-[#5a5650] mb-0.5">Delivery</div>
                  <div className="text-[12px] text-[#f0ece4]">{delivery.deliveryAddress}</div>
                </div>
              </div>
            </div>

            {delivery.distance && delivery.estimatedTime && (
              <div className="flex items-center gap-4 text-[11px] text-[#9a9488] mb-4">
                <div className="flex items-center gap-1">
                  <Navigation className="size-3" />
                  <span>{delivery.distance} km</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="size-3" />
                  <span>~{delivery.estimatedTime} min</span>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {delivery.status === "PENDING" && (
                <select
                  onChange={(e) => assignDriver(delivery.id, e.target.value)}
                  className="flex-1 h-9 bg-[#222222] border-[rgba(255,255,255,0.12)] text-[#f0ece4] text-[12px] px-3 outline-none"
                >
                  <option value="">Assign driver</option>
                  {drivers.filter((d) => d.isAvailable).map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.name} ★ {driver.rating.toFixed(1)}
                    </option>
                  ))}
                </select>
              )}
              {delivery.status === "ASSIGNED" && (
                <button
                  onClick={() => updateDeliveryStatus(delivery.id, "PICKED_UP")}
                  className="flex-1 py-2 rounded-lg bg-[#f97316] text-white text-[12px] font-semibold hover:bg-[#ea6c0a] transition-colors"
                >
                  Picked Up
                </button>
              )}
              {delivery.status === "PICKED_UP" && (
                <button
                  onClick={() => updateDeliveryStatus(delivery.id, "IN_TRANSIT")}
                  className="flex-1 py-2 rounded-lg bg-[#a855f7] text-white text-[12px] font-semibold hover:bg-[#9333ea] transition-colors"
                >
                  In Transit
                </button>
              )}
              {delivery.status === "IN_TRANSIT" && (
                <button
                  onClick={() => updateDeliveryStatus(delivery.id, "DELIVERED")}
                  className="flex-1 py-2 rounded-lg bg-[#4ade80] text-white text-[12px] font-semibold hover:bg-[#22c55e] transition-colors flex items-center justify-center gap-1"
                >
                  <CheckCircle className="size-3" />
                  Delivered
                </button>
              )}
              {delivery.status !== "DELIVERED" && delivery.status !== "CANCELLED" && (
                <button
                  onClick={() => updateDeliveryStatus(delivery.id, "CANCELLED")}
                  className="px-3 py-2 rounded-lg bg-[#f87171] text-white text-[12px] font-semibold hover:bg-[#ef4444] transition-colors"
                >
                  <XCircle className="size-3" />
                </button>
              )}
            </div>

            {delivery.notes && (
              <div className="mt-3 text-[11px] text-[#9a9488] italic">{delivery.notes}</div>
            )}
          </div>
        ))}
      </div>

      {filteredDeliveries.length === 0 && (
        <div className="text-center py-12 text-[#5a5650] text-[13px]">
          No deliveries in this status
        </div>
      )}
    </div>
  );
}
