"use client";

import { useState, useEffect } from "react";
import { Calendar, Clock, Users, Plus, Phone, Mail, Check, X } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface Table {
  id: string;
  name: string;
  capacity?: number;
}

interface Reservation {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  date: Date;
  partySize: number;
  status: string;
  specialRequests?: string;
  table?: Table;
}

interface WaitlistEntry {
  id: string;
  customerName: string;
  customerPhone: string;
  partySize: number;
  estimatedTime?: number;
  status: string;
  notes?: string;
  createdAt: Date;
}

export default function ReservationBooking({ restaurantId, locationId }: { restaurantId: string; locationId: string }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [minLoading, setMinLoading] = useState(true);
  const [addingReservation, setAddingReservation] = useState(false);
  const [addingWaitlist, setAddingWaitlist] = useState(false);

  const [newReservation, setNewReservation] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    date: "",
    time: "",
    partySize: 2,
    specialRequests: "",
    tableId: "",
  });

  const [newWaitlist, setNewWaitlist] = useState({
    customerName: "",
    customerPhone: "",
    partySize: 2,
    estimatedTime: 30,
    notes: "",
  });

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        await Promise.all([
          fetchReservations(),
          fetchWaitlist(),
          fetchTables()
        ]);
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
  }, [restaurantId, currentDate, locationId]);

  async function fetchReservations() {
    try {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const response = await axios.get(`/api/reservations?restaurantId=${restaurantId}&date=${startOfMonth.toISOString()}`);
      setReservations(response.data);
    } catch (error) {
      console.error("Failed to load reservations");
    }
  }

  async function fetchWaitlist() {
    try {
      const response = await axios.get(`/api/reservations/waitlist?restaurantId=${restaurantId}`);
      setWaitlist(response.data);
    } catch (error) {
      console.error("Failed to load waitlist");
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

  async function addReservation() {
    if (!newReservation.customerName || !newReservation.customerPhone || !newReservation.date || !newReservation.time) {
      toast.error("Name, phone, date, and time are required");
      return;
    }

    try {
      const dateTime = new Date(`${newReservation.date}T${newReservation.time}`);
      await axios.post("/api/reservations", {
        ...newReservation,
        date: dateTime.toISOString(),
        restaurantId,
      });
      toast.success("Reservation added!");
      setNewReservation({
        customerName: "",
        customerPhone: "",
        customerEmail: "",
        date: "",
        time: "",
        partySize: 2,
        specialRequests: "",
        tableId: "",
      });
      setAddingReservation(false);
      fetchReservations();
    } catch (error) {
      toast.error("Failed to add reservation");
    }
  }

  async function addWaitlist() {
    if (!newWaitlist.customerName || !newWaitlist.customerPhone) {
      toast.error("Name and phone are required");
      return;
    }

    try {
      await axios.post("/api/reservations/waitlist", {
        ...newWaitlist,
        restaurantId,
      });
      toast.success("Added to waitlist!");
      setNewWaitlist({
        customerName: "",
        customerPhone: "",
        partySize: 2,
        estimatedTime: 30,
        notes: "",
      });
      setAddingWaitlist(false);
      fetchWaitlist();
    } catch (error) {
      toast.error("Failed to add to waitlist");
    }
  }

  async function updateReservationStatus(id: string, status: string) {
    try {
      await axios.patch(`/api/reservations/${id}`, { status });
      toast.success("Reservation updated");
      fetchReservations();
    } catch (error) {
      toast.error("Failed to update reservation");
    }
  }

  async function seatWaitlistEntry(id: string) {
    try {
      await axios.patch(`/api/reservations/waitlist/${id}`, { status: "SEATED" });
      toast.success("Customer seated");
      fetchWaitlist();
    } catch (error) {
      toast.error("Failed to seat customer");
    }
  }

  const monthName = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const todayReservations = reservations.filter((r) => new Date(r.date).toDateString() === new Date().toDateString());

  if (minLoading) {
    return (
      <div className="p-7 space-y-6">
        <div className="flex items-center gap-3.5 flex-wrap">
          <Skeleton className="w-[46px] h-[46px] rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {[1, 2, 3].map((i) => (
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
          <Calendar className="size-5 text-white" />
        </div>
        <div>
          <h1 className="text-[20px] font-bold text-[#f0ece4]">Reservations</h1>
          <p className="text-[12px] text-[#9a9488]">Manage bookings and waitlist</p>
        </div>
        <div className="ml-auto flex gap-2.5">
          <button
            onClick={() => setAddingWaitlist(true)}
            className="px-4 py-2.5 rounded-lg bg-[#222222] border border-[rgba(255,255,255,0.12)] text-[#f0ece4] text-[12px] font-semibold hover:border-[#f97316] hover:text-[#f97316] transition-all"
          >
            + Waitlist
          </button>
          <button
            onClick={() => setAddingReservation(true)}
            className="px-4 py-2.5 rounded-lg bg-[#f97316] text-white text-[12px] font-semibold hover:bg-[#ea6c0a] transition-all"
          >
            + Reservation
          </button>
        </div>
      </div>

      {/* Today's Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-[#111111] border border-[rgba(255,255,255,0.07)] rounded-xl p-5">
          <div className="text-[11px] text-[#5a5650] mb-1">Today's Reservations</div>
          <div className="text-[26px] font-bold text-[#f0ece4]">{todayReservations.length}</div>
        </div>
        <div className="bg-[#111111] border border-[rgba(255,255,255,0.07)] rounded-xl p-5">
          <div className="text-[11px] text-[#5a5650] mb-1">Waitlist</div>
          <div className="text-[26px] font-bold text-[#f0ece4]">{waitlist.length}</div>
        </div>
        <div className="bg-[#111111] border border-[rgba(255,255,255,0.07)] rounded-xl p-5">
          <div className="text-[11px] text-[#5a5650] mb-1">Total Guests</div>
          <div className="text-[26px] font-bold text-[#f0ece4]">
            {todayReservations.reduce((sum, r) => sum + r.partySize, 0)}
          </div>
        </div>
      </div>

      {/* Add Reservation Form */}
      {addingReservation && (
        <div className="bg-[#111111] border border-[rgba(255,255,255,0.07)] rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[#f0ece4] text-[12px] font-medium mb-1 block">Customer Name *</label>
              <input
                value={newReservation.customerName}
                onChange={(e) => setNewReservation({ ...newReservation, customerName: e.target.value })}
                placeholder="Full name"
                className="w-full h-10 bg-[#222222] border-[rgba(255,255,255,0.12)] text-[#f0ece4] placeholder-[#5a5650] focus:border-[#f97316] text-[13px] px-3"
              />
            </div>
            <div>
              <label className="text-[#f0ece4] text-[12px] font-medium mb-1 block">Phone *</label>
              <input
                value={newReservation.customerPhone}
                onChange={(e) => setNewReservation({ ...newReservation, customerPhone: e.target.value })}
                placeholder="Phone number"
                className="w-full h-10 bg-[#222222] border-[rgba(255,255,255,0.12)] text-[#f0ece4] placeholder-[#5a5650] focus:border-[#f97316] text-[13px] px-3"
              />
            </div>
            <div>
              <label className="text-[#f0ece4] text-[12px] font-medium mb-1 block">Email</label>
              <input
                type="email"
                value={newReservation.customerEmail}
                onChange={(e) => setNewReservation({ ...newReservation, customerEmail: e.target.value })}
                placeholder="email@example.com"
                className="w-full h-10 bg-[#222222] border-[rgba(255,255,255,0.12)] text-[#f0ece4] placeholder-[#5a5650] focus:border-[#f97316] text-[13px] px-3"
              />
            </div>
            <div>
              <label className="text-[#f0ece4] text-[12px] font-medium mb-1 block">Party Size</label>
              <input
                type="number"
                value={newReservation.partySize}
                onChange={(e) => setNewReservation({ ...newReservation, partySize: parseInt(e.target.value) || 2 })}
                min="1"
                className="w-full h-10 bg-[#222222] border-[rgba(255,255,255,0.12)] text-[#f0ece4] placeholder-[#5a5650] focus:border-[#f97316] text-[13px] px-3"
              />
            </div>
            <div>
              <label className="text-[#f0ece4] text-[12px] font-medium mb-1 block">Date *</label>
              <input
                type="date"
                value={newReservation.date}
                onChange={(e) => setNewReservation({ ...newReservation, date: e.target.value })}
                className="w-full h-10 bg-[#222222] border-[rgba(255,255,255,0.12)] text-[#f0ece4] placeholder-[#5a5650] focus:border-[#f97316] text-[13px] px-3"
              />
            </div>
            <div>
              <label className="text-[#f0ece4] text-[12px] font-medium mb-1 block">Time *</label>
              <input
                type="time"
                value={newReservation.time}
                onChange={(e) => setNewReservation({ ...newReservation, time: e.target.value })}
                className="w-full h-10 bg-[#222222] border-[rgba(255,255,255,0.12)] text-[#f0ece4] placeholder-[#5a5650] focus:border-[#f97316] text-[13px] px-3"
              />
            </div>
            <div>
              <label className="text-[#f0ece4] text-[12px] font-medium mb-1 block">Table</label>
              <select
                value={newReservation.tableId}
                onChange={(e) => setNewReservation({ ...newReservation, tableId: e.target.value })}
                className="w-full h-10 bg-[#222222] border-[rgba(255,255,255,0.12)] text-[#f0ece4] text-[13px] px-3 outline-none"
              >
                <option value="">Select table</option>
                {tables.map((table) => (
                  <option key={table.id} value={table.id}>
                    {table.name} {table.capacity && `(${table.capacity} seats)`}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[#f0ece4] text-[12px] font-medium mb-1 block">Special Requests</label>
            <input
              value={newReservation.specialRequests}
              onChange={(e) => setNewReservation({ ...newReservation, specialRequests: e.target.value })}
              placeholder="Dietary restrictions, special occasions, etc."
              className="w-full h-10 bg-[#222222] border-[rgba(255,255,255,0.12)] text-[#f0ece4] placeholder-[#5a5650] focus:border-[#f97316] text-[13px] px-3"
            />
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={addReservation}
              className="px-4 py-2 rounded-lg bg-[#f97316] text-white text-[12px] font-semibold hover:bg-[#ea6c0a] transition-colors"
            >
              Save Reservation
            </button>
            <button
              onClick={() => {
                setAddingReservation(false);
                setNewReservation({
                  customerName: "",
                  customerPhone: "",
                  customerEmail: "",
                  date: "",
                  time: "",
                  partySize: 2,
                  specialRequests: "",
                  tableId: "",
                });
              }}
              className="px-4 py-2 rounded-lg bg-[#222222] border border-[rgba(255,255,255,0.12)] text-[#f0ece4] hover:bg-[#181818] transition-colors text-[12px]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Add Waitlist Form */}
      {addingWaitlist && (
        <div className="bg-[#111111] border border-[rgba(255,255,255,0.07)] rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[#f0ece4] text-[12px] font-medium mb-1 block">Customer Name *</label>
              <input
                value={newWaitlist.customerName}
                onChange={(e) => setNewWaitlist({ ...newWaitlist, customerName: e.target.value })}
                placeholder="Full name"
                className="w-full h-10 bg-[#222222] border-[rgba(255,255,255,0.12)] text-[#f0ece4] placeholder-[#5a5650] focus:border-[#f97316] text-[13px] px-3"
              />
            </div>
            <div>
              <label className="text-[#f0ece4] text-[12px] font-medium mb-1 block">Phone *</label>
              <input
                value={newWaitlist.customerPhone}
                onChange={(e) => setNewWaitlist({ ...newWaitlist, customerPhone: e.target.value })}
                placeholder="Phone number"
                className="w-full h-10 bg-[#222222] border-[rgba(255,255,255,0.12)] text-[#f0ece4] placeholder-[#5a5650] focus:border-[#f97316] text-[13px] px-3"
              />
            </div>
            <div>
              <label className="text-[#f0ece4] text-[12px] font-medium mb-1 block">Party Size</label>
              <input
                type="number"
                value={newWaitlist.partySize}
                onChange={(e) => setNewWaitlist({ ...newWaitlist, partySize: parseInt(e.target.value) || 2 })}
                min="1"
                className="w-full h-10 bg-[#222222] border-[rgba(255,255,255,0.12)] text-[#f0ece4] placeholder-[#5a5650] focus:border-[#f97316] text-[13px] px-3"
              />
            </div>
            <div>
              <label className="text-[#f0ece4] text-[12px] font-medium mb-1 block">Estimated Time (min)</label>
              <input
                type="number"
                value={newWaitlist.estimatedTime}
                onChange={(e) => setNewWaitlist({ ...newWaitlist, estimatedTime: parseInt(e.target.value) || 30 })}
                className="w-full h-10 bg-[#222222] border-[rgba(255,255,255,0.12)] text-[#f0ece4] placeholder-[#5a5650] focus:border-[#f97316] text-[13px] px-3"
              />
            </div>
          </div>
          <div>
            <label className="text-[#f0ece4] text-[12px] font-medium mb-1 block">Notes</label>
            <input
              value={newWaitlist.notes}
              onChange={(e) => setNewWaitlist({ ...newWaitlist, notes: e.target.value })}
              placeholder="Any special notes"
              className="w-full h-10 bg-[#222222] border-[rgba(255,255,255,0.12)] text-[#f0ece4] placeholder-[#5a5650] focus:border-[#f97316] text-[13px] px-3"
            />
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={addWaitlist}
              className="px-4 py-2 rounded-lg bg-[#f97316] text-white text-[12px] font-semibold hover:bg-[#ea6c0a] transition-colors"
            >
              Add to Waitlist
            </button>
            <button
              onClick={() => {
                setAddingWaitlist(false);
                setNewWaitlist({
                  customerName: "",
                  customerPhone: "",
                  partySize: 2,
                  estimatedTime: 30,
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

      {/* Today's Reservations */}
      <div className="bg-[#111111] border border-[rgba(255,255,255,0.07)] rounded-xl p-5">
        <h3 className="text-[14px] font-semibold text-[#f0ece4] mb-4">Today's Reservations</h3>
        {todayReservations.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="size-8 text-[#5a5650] mx-auto mb-3" />
            <p className="text-[12px] text-[#5a5650]">No reservations for today</p>
            <p className="text-[11px] text-[#5a5650] mt-1">Add a reservation to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayReservations.map((reservation) => (
              <div key={reservation.id} className="flex items-center justify-between p-3 bg-[#222222] border border-[rgba(255,255,255,0.07)] rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-[36px] h-[36px] rounded-lg bg-[rgba(249,115,22,0.1)] flex items-center justify-center">
                    <Users className="size-4 text-[#f97316]" />
                  </div>
                  <div>
                    <div className="text-[13px] font-medium text-[#f0ece4]">{reservation.customerName}</div>
                    <div className="text-[11px] text-[#9a9488] flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        <Phone className="size-3" />
                        {reservation.customerPhone}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {new Date(reservation.date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right mr-4">
                    <div className="text-[12px] text-[#9a9488]">{reservation.partySize} guests</div>
                    <div className="text-[11px] text-[#5a5650]">{reservation.table?.name || "No table"}</div>
                  </div>
                  <div className="flex gap-1">
                    {reservation.status === "CONFIRMED" && (
                      <button
                        onClick={() => updateReservationStatus(reservation.id, "COMPLETED")}
                        className="w-8 h-8 rounded-lg bg-[rgba(34,197,94,0.1)] text-[#4ade80] hover:bg-[rgba(34,197,94,0.2)] transition-colors flex items-center justify-center"
                      >
                        <Check className="size-4" />
                      </button>
                    )}
                    <button
                      onClick={() => updateReservationStatus(reservation.id, "CANCELLED")}
                      className="w-8 h-8 rounded-lg bg-[rgba(239,68,68,0.1)] text-[#f87171] hover:bg-[rgba(239,68,68,0.2)] transition-colors flex items-center justify-center"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Waitlist */}
      <div className="bg-[#111111] border border-[rgba(255,255,255,0.07)] rounded-xl p-5">
        <h3 className="text-[14px] font-semibold text-[#f0ece4] mb-4">Current Waitlist</h3>
        {waitlist.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="size-8 text-[#5a5650] mx-auto mb-3" />
            <p className="text-[12px] text-[#5a5650]">No customers on waitlist</p>
            <p className="text-[11px] text-[#5a5650] mt-1">Add customers to waitlist as needed</p>
          </div>
        ) : (
          <div className="space-y-2">
            {waitlist.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-3 bg-[#222222] border border-[rgba(255,255,255,0.07)] rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-[36px] h-[36px] rounded-lg bg-[rgba(249,115,22,0.1)] flex items-center justify-center">
                    <Clock className="size-4 text-[#f97316]" />
                  </div>
                  <div>
                    <div className="text-[13px] font-medium text-[#f0ece4]">{entry.customerName}</div>
                    <div className="text-[11px] text-[#9a9488] flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        <Phone className="size-3" />
                        {entry.customerPhone}
                      </span>
                      <span>·</span>
                      <span>{entry.partySize} guests</span>
                      {entry.estimatedTime && <span>· ~{entry.estimatedTime} min</span>}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => seatWaitlistEntry(entry.id)}
                  className="px-3 py-1.5 rounded-lg bg-[#f97316] text-white text-[11px] font-semibold hover:bg-[#ea6c0a] transition-colors"
                >
                  Seat
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
