"use client";

import { useState, useEffect } from "react";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Users, 
  Plus, 
  Phone, 
  Mail, 
  Check, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  CalendarDays, 
  ListTodo, 
  UsersRound, 
  Sparkles, 
  Table as TableIcon,
  HelpCircle,
  FileText
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay, 
  isToday, 
  addMonths, 
  subMonths, 
  addWeeks, 
  subWeeks, 
  addDays, 
  subDays,
  parseISO
} from "date-fns";

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

type CalendarView = "month" | "week" | "day";

export default function ReservationBooking({ restaurantId, locationId }: { restaurantId: string; locationId: string }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>("month");
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
          setLoading(false);
          setMinLoading(false);
        }
      }
    };

    loadData();
  }, [restaurantId, currentDate, locationId]);

  async function fetchReservations() {
    try {
      const startOfActiveMonth = startOfMonth(currentDate);
      const response = await axios.get(`/api/reservations?restaurantId=${restaurantId}&date=${startOfActiveMonth.toISOString()}`);
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
      toast.success(`Reservation status updated to ${status}`);
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

  // Navigation handlers
  const handlePrev = () => {
    if (view === "month") {
      setCurrentDate(subMonths(currentDate, 1));
    } else if (view === "week") {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subDays(currentDate, 1));
    }
  };

  const handleNext = () => {
    if (view === "month") {
      setCurrentDate(addMonths(currentDate, 1));
    } else if (view === "week") {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addDays(currentDate, 1));
    }
  };

  const setToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  // Helper selectors
  const totalLocationCapacity = tables.reduce((acc, table) => acc + (table.capacity || 0), 0);
  
  const todayReservations = reservations.filter((r) => 
    isSameDay(new Date(r.date), new Date())
  );

  const selectedDayReservations = reservations.filter((r) => 
    isSameDay(new Date(r.date), selectedDate)
  );

  const activeReservationsToday = todayReservations.filter(
    (r) => r.status === "CONFIRMED" || r.status === "SEATED"
  );
  
  const todayOccupancySeats = activeReservationsToday.reduce((sum, r) => sum + r.partySize, 0);
  const occupancyPercentage = totalLocationCapacity > 0 
    ? Math.min(Math.round((todayOccupancySeats / totalLocationCapacity) * 100), 100) 
    : 0;

  // Calendar dates builders
  const getMonthDays = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: startDate, end: endDate });
  };

  const getWeekDays = () => {
    const startDate = startOfWeek(currentDate);
    const endDate = endOfWeek(currentDate);
    return eachDayOfInterval({ start: startDate, end: endDate });
  };

  if (minLoading) {
    return (
      <div className="p-7 space-y-6">
        <div className="flex items-center gap-3.5 flex-wrap">
          <Skeleton className="w-[46px] h-[46px] rounded-xl bg-[#222]" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-40 bg-[#222]" />
            <Skeleton className="h-4 w-56 bg-[#222]" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl bg-[#222]" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-96 rounded-xl bg-[#222]" />
          <Skeleton className="h-96 rounded-xl bg-[#222]" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-7 space-y-6 max-w-7xl mx-auto text-[#f0ece4] min-h-screen">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[rgba(255,255,255,0.06)] pb-6">
        <div className="flex items-center gap-4">
          <div className="w-[50px] h-[50px] rounded-2xl bg-gradient-to-tr from-[#f97316] to-[#fb923c] flex items-center justify-center shadow-lg shadow-[rgba(249,115,22,0.15)]">
            <CalendarIcon className="size-6 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-[#f0ece4] to-[#a8a29e] bg-clip-text text-transparent">
                Reservations Calendar
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-[#f97316]/10 text-[#f97316] border border-[#f97316]/20 text-[10px] font-bold flex items-center gap-1">
                <Sparkles className="size-2.5" /> LIVE
              </span>
            </div>
            <p className="text-[12px] text-[#9a9488] mt-0.5">
              Hostess control deck for interactive bookings, seating arrangements, and live queues
            </p>
          </div>
        </div>

        {/* View Toggles & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-[#161616] p-1 rounded-xl border border-[rgba(255,255,255,0.05)]">
            {(["month", "week", "day"] as CalendarView[]).map((v) => (
              <button
                key={v}
                onClick={() => {
                  setView(v);
                  if (v === "day") setSelectedDate(currentDate);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                  view === v 
                    ? "bg-[#f97316] text-white shadow-md" 
                    : "text-[#9a9488] hover:text-white"
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          <button
            onClick={() => setAddingWaitlist(true)}
            className="px-4 py-2.5 rounded-xl bg-[#1a1a1a] border border-[rgba(255,255,255,0.08)] text-[#f0ece4] text-xs font-bold hover:border-[#f97316]/60 hover:text-white transition-all flex items-center gap-1.5"
          >
            <UsersRound className="size-3.5 text-[#f97316]" />
            + Waitlist
          </button>
          <button
            onClick={() => setAddingReservation(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#f97316] to-[#fb923c] text-white text-xs font-bold hover:brightness-110 shadow-lg shadow-[rgba(249,115,22,0.1)] transition-all flex items-center gap-1.5"
          >
            <Plus className="size-4" />
            + Booking
          </button>
        </div>
      </div>

      {/* Premium Stat Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { 
            title: "Today's Bookings", 
            val: todayReservations.length, 
            desc: `${todayReservations.filter(r => r.status === "COMPLETED").length} completed / ${todayReservations.filter(r => r.status === "CANCELLED").length} cancelled`, 
            color: "from-blue-500/10 to-indigo-500/10 border-blue-500/20 text-blue-400" 
          },
          { 
            title: "Waitlist Size", 
            val: waitlist.length, 
            desc: "Active walk-in queues", 
            color: "from-amber-500/10 to-orange-500/10 border-orange-500/20 text-[#f97316]" 
          },
          { 
            title: "Guests Seated Today", 
            val: todayReservations.filter(r => r.status === "SEATED" || r.status === "COMPLETED").reduce((sum, r) => sum + r.partySize, 0), 
            desc: "Total diner volume", 
            color: "from-emerald-500/10 to-teal-500/10 border-emerald-500/20 text-emerald-400" 
          },
          { 
            title: "Capacity Occupancy", 
            val: `${occupancyPercentage}%`, 
            desc: `${todayOccupancySeats} / ${totalLocationCapacity} seats occupied`, 
            color: "from-rose-500/10 to-pink-500/10 border-rose-500/20 text-rose-400",
            progress: occupancyPercentage
          }
        ].map((item, idx) => (
          <div key={idx} className="bg-[#111111] border border-[rgba(255,255,255,0.04)] rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between group hover:border-[rgba(255,255,255,0.08)] transition-all">
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${item.color} blur-2xl opacity-30`} />
            <div>
              <span className="text-[11px] font-semibold text-[#6f695f] uppercase tracking-widest">{item.title}</span>
              <div className="text-3xl font-extrabold tracking-tight text-white mt-1.5">{item.val}</div>
            </div>
            <div className="mt-3 text-[11px] text-[#9a9488] flex items-center gap-1">
              {item.progress !== undefined ? (
                <div className="w-full bg-[#222] h-1.5 rounded-full overflow-hidden mt-1">
                  <div 
                    className="bg-gradient-to-r from-[#f97316] to-[#fb923c] h-full rounded-full transition-all duration-500" 
                    style={{ width: `${item.progress}%` }} 
                  />
                </div>
              ) : (
                item.desc
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Main Board Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Calendar Grid Area */}
        <div className="lg:col-span-2 bg-[#0c0c0c] border border-[rgba(255,255,255,0.05)] rounded-2xl p-6 space-y-6">
          
          {/* Calendar Controller Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button 
                onClick={handlePrev}
                className="w-9 h-9 rounded-xl bg-[#161616] border border-[rgba(255,255,255,0.06)] flex items-center justify-center hover:bg-[#222] transition-colors"
              >
                <ChevronLeft className="size-4 text-[#f0ece4]" />
              </button>
              <h2 className="text-lg font-bold tracking-tight text-white min-w-[150px] text-center">
                {view === "month" && format(currentDate, "MMMM yyyy")}
                {view === "week" && `Week of ${format(startOfWeek(currentDate), "MMM d, yyyy")}`}
                {view === "day" && format(currentDate, "EEEE, MMMM d, yyyy")}
              </h2>
              <button 
                onClick={handleNext}
                className="w-9 h-9 rounded-xl bg-[#161616] border border-[rgba(255,255,255,0.06)] flex items-center justify-center hover:bg-[#222] transition-colors"
              >
                <ChevronRight className="size-4 text-[#f0ece4]" />
              </button>
            </div>

            <button
              onClick={setToday}
              className="px-3.5 py-1.5 rounded-lg bg-[#161616] border border-[rgba(255,255,255,0.06)] text-xs font-semibold text-[#f97316] hover:bg-[#222] transition-colors"
            >
              Today
            </button>
          </div>

          {/* MONTH VIEW */}
          {view === "month" && (
            <div className="space-y-2">
              <div className="grid grid-cols-7 gap-1 text-center">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="text-[11px] font-bold text-[#6f695f] py-2 uppercase tracking-wider">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {getMonthDays().map((day, idx) => {
                  const dayBookings = reservations.filter((r) => isSameDay(new Date(r.date), day));
                  const isDaySelected = isSameDay(day, selectedDate);
                  const isCurrentMonth = day.getMonth() === currentDate.getMonth();

                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedDate(day)}
                      className={`min-h-[90px] p-2.5 rounded-xl border flex flex-col justify-between transition-all relative group text-left ${
                        isDaySelected 
                          ? "bg-[#f97316]/10 border-[#f97316] ring-1 ring-[#f97316]" 
                          : isToday(day)
                          ? "bg-[#181818] border-orange-500/40"
                          : isCurrentMonth
                          ? "bg-[#111111] border-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.12)]"
                          : "bg-transparent border-transparent opacity-30 pointer-events-none"
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className={`text-[12px] font-bold ${
                          isToday(day) ? "text-[#f97316] bg-[#f97316]/10 px-1.5 py-0.5 rounded-md" : "text-white"
                        }`}>
                          {format(day, "d")}
                        </span>
                        {dayBookings.length > 0 && (
                          <span className="w-4 h-4 rounded-full bg-[#f97316] text-[9px] font-extrabold flex items-center justify-center text-white">
                            {dayBookings.length}
                          </span>
                        )}
                      </div>
                      
                      {/* Mini list / indicators */}
                      <div className="w-full space-y-1 mt-2">
                        {dayBookings.slice(0, 2).map((booking) => (
                          <div 
                            key={booking.id} 
                            className={`text-[9px] px-1.5 py-0.5 rounded truncate font-medium ${
                              booking.status === "SEATED" 
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                                : booking.status === "CANCELLED"
                                ? "bg-rose-500/10 text-rose-400 line-through"
                                : booking.status === "COMPLETED"
                                ? "bg-blue-500/10 text-blue-400"
                                : "bg-[#222] text-[#f0ece4] border border-[rgba(255,255,255,0.05)]"
                            }`}
                          >
                            {booking.customerName.split(" ")[0]} ({booking.partySize})
                          </div>
                        ))}
                        {dayBookings.length > 2 && (
                          <div className="text-[8px] text-[#6f695f] text-right font-medium pr-1">
                            +{dayBookings.length - 2} more
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* WEEK VIEW */}
          {view === "week" && (
            <div className="grid grid-cols-7 gap-3">
              {getWeekDays().map((day, idx) => {
                const dayBookings = reservations.filter((r) => isSameDay(new Date(r.date), day));
                const isDayToday = isToday(day);

                return (
                  <div 
                    key={idx} 
                    className={`bg-[#111111] border rounded-2xl p-3 space-y-3 min-h-[380px] flex flex-col ${
                      isDayToday ? "border-[#f97316] bg-[#f97316]/5" : "border-[rgba(255,255,255,0.04)]"
                    }`}
                  >
                    <div className="text-center pb-2 border-b border-[rgba(255,255,255,0.04)]">
                      <div className={`text-[10px] uppercase font-bold tracking-widest ${isDayToday ? "text-[#f97316]" : "text-[#6f695f]"}`}>
                        {format(day, "eee")}
                      </div>
                      <div className="text-sm font-extrabold text-white mt-0.5">{format(day, "MMM d")}</div>
                    </div>

                    <div className="flex-1 space-y-2 overflow-y-auto max-h-[300px] scrollbar-thin">
                      {dayBookings.length === 0 ? (
                        <div className="text-[10px] text-[#555] text-center pt-8">No events</div>
                      ) : (
                        dayBookings.map((booking) => (
                          <div 
                            key={booking.id} 
                            onClick={() => {
                              setSelectedDate(day);
                              setView("day");
                            }}
                            className="bg-[#1c1c1c] border border-[rgba(255,255,255,0.04)] hover:border-[#f97316]/40 p-2 rounded-xl transition-all cursor-pointer space-y-1.5"
                          >
                            <div className="text-[11px] font-bold text-white truncate">{booking.customerName}</div>
                            <div className="flex items-center justify-between text-[9px] text-[#9a9488]">
                              <span className="flex items-center gap-0.5 font-semibold text-[#f97316]">
                                <Clock className="size-2.5" />
                                {format(new Date(booking.date), "h:mm a")}
                              </span>
                              <span className="flex items-center gap-0.5">
                                <Users className="size-2.5" />
                                {booking.partySize}p
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* DAY VIEW */}
          {view === "day" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-[rgba(255,255,255,0.04)] pb-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <CalendarDays className="size-4 text-[#f97316]" />
                  Schedule for {format(selectedDate, "MMMM d, yyyy")}
                </h3>
                <span className="text-xs text-[#9a9488]">
                  {selectedDayReservations.length} total bookings listed
                </span>
              </div>

              {selectedDayReservations.length === 0 ? (
                <div className="text-center py-20 bg-[#111] border border-[rgba(255,255,255,0.04)] rounded-2xl">
                  <Clock className="size-10 text-[#6f695f] mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-white">No Bookings Scheduled</h4>
                  <p className="text-xs text-[#6f695f] mt-1">Click "+ Booking" to reserve a table for this date.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {selectedDayReservations.map((res) => (
                    <div 
                      key={res.id} 
                      className={`p-4 bg-[#111] border rounded-2xl flex flex-col justify-between space-y-4 hover:border-[rgba(255,255,255,0.08)] transition-all ${
                        res.status === "SEATED" 
                          ? "border-emerald-500/20 shadow-lg shadow-emerald-500/5" 
                          : res.status === "CANCELLED" 
                          ? "border-rose-500/10 opacity-60"
                          : res.status === "COMPLETED"
                          ? "border-blue-500/20"
                          : "border-[rgba(255,255,255,0.05)]"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            res.status === "CONFIRMED" 
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : res.status === "SEATED"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : res.status === "COMPLETED"
                              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}>
                            {res.status}
                          </span>
                          <h4 className="text-sm font-bold text-white mt-2">{res.customerName}</h4>
                          <div className="text-xs text-[#9a9488] flex items-center gap-3">
                            <span className="flex items-center gap-1"><Phone className="size-3 text-[#f97316]" /> {res.customerPhone}</span>
                            {res.customerEmail && <span className="flex items-center gap-1"><Mail className="size-3" /> {res.customerEmail}</span>}
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <div className="text-[#f97316] font-bold text-xs flex items-center justify-end gap-1">
                            <Clock className="size-3" />
                            {format(new Date(res.date), "h:mm a")}
                          </div>
                          <div className="text-[11px] text-[#f0ece4] flex items-center justify-end gap-1 font-semibold">
                            <Users className="size-3 text-[#6f695f]" />
                            {res.partySize} Guests
                          </div>
                          <div className="text-[10px] text-[#6f695f] flex items-center justify-end gap-1">
                            <TableIcon className="size-3" />
                            {res.table?.name || "Unassigned"}
                          </div>
                        </div>
                      </div>

                      {res.specialRequests && (
                        <div className="bg-[#181818] border border-[rgba(255,255,255,0.03)] p-2.5 rounded-xl text-xs text-[#9a9488] flex items-start gap-1.5">
                          <FileText className="size-3.5 text-[#f97316] shrink-0 mt-0.5" />
                          <span>Special request: <strong className="text-white">{res.specialRequests}</strong></span>
                        </div>
                      )}

                      <div className="flex gap-2 justify-end border-t border-[rgba(255,255,255,0.04)] pt-3.5">
                        {res.status === "CONFIRMED" && (
                          <>
                            <button
                              onClick={() => updateReservationStatus(res.id, "SEATED")}
                              className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all text-xs font-semibold flex items-center gap-1"
                            >
                              <Check className="size-3.5" /> Seated
                            </button>
                            <button
                              onClick={() => updateReservationStatus(res.id, "COMPLETED")}
                              className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all text-xs font-semibold flex items-center gap-1"
                            >
                              <Check className="size-3.5" /> Done
                            </button>
                          </>
                        )}
                        {res.status === "SEATED" && (
                          <button
                            onClick={() => updateReservationStatus(res.id, "COMPLETED")}
                            className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all text-xs font-semibold flex items-center gap-1"
                          >
                            <Check className="size-3.5" /> Complete Session
                          </button>
                        )}
                        {res.status !== "CANCELLED" && res.status !== "COMPLETED" && (
                          <button
                            onClick={() => updateReservationStatus(res.id, "CANCELLED")}
                            className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-all text-xs font-semibold flex items-center gap-1"
                          >
                            <X className="size-3.5" /> Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Waitlist Side deck */}
        <div className="bg-[#0c0c0c] border border-[rgba(255,255,255,0.05)] rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.04)] pb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <UsersRound className="size-4 text-[#f97316]" />
              Active Waitlist
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-[#f97316]/10 text-[#f97316] text-[10px] font-bold">
              {waitlist.length} guests
            </span>
          </div>

          {waitlist.length === 0 ? (
            <div className="text-center py-16 bg-[#111] border border-[rgba(255,255,255,0.04)] rounded-2xl">
              <Clock className="size-8 text-[#6f695f] mx-auto mb-3" />
              <h4 className="text-xs font-bold text-white">Waitlist is Empty</h4>
              <p className="text-[10px] text-[#6f695f] mt-1">No walk-in reservations in queue.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
              {waitlist.map((entry) => (
                <div key={entry.id} className="p-4 bg-[#111] border border-[rgba(255,255,255,0.04)] rounded-2xl space-y-3 hover:border-[rgba(255,255,255,0.08)] transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xs font-bold text-white">{entry.customerName}</h4>
                      <div className="text-[10px] text-[#9a9488] flex items-center gap-1.5 mt-1">
                        <Phone className="size-3 text-[#f97316]" />
                        {entry.customerPhone}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white text-xs font-bold flex items-center justify-end gap-1">
                        <Users className="size-3 text-[#f97316]" />
                        {entry.partySize} Guests
                      </div>
                      {entry.estimatedTime && (
                        <div className="text-[10px] text-amber-400 font-semibold mt-0.5 flex items-center justify-end gap-1">
                          <Clock className="size-2.5" />
                          ~{entry.estimatedTime} min
                        </div>
                      )}
                    </div>
                  </div>

                  {entry.notes && (
                    <div className="text-[10px] text-[#6f695f] bg-[#181818] p-2 rounded-lg">
                      Note: <strong className="text-[#9a9488]">{entry.notes}</strong>
                    </div>
                  )}

                  <div className="flex justify-end pt-2 border-t border-[rgba(255,255,255,0.03)]">
                    <button
                      onClick={() => seatWaitlistEntry(entry.id)}
                      className="px-3.5 py-1.5 rounded-lg bg-[#f97316] text-white text-[11px] font-bold hover:bg-[#ea6c0a] transition-all flex items-center gap-1"
                    >
                      <Check className="size-3" /> Seat Customer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Slide-over Drawers using Framer Motion */}
      <AnimatePresence>
        {/* ADD RESERVATION DRAWER */}
        {addingReservation && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAddingReservation(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 cursor-pointer"
            />
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[#0c0c0c] border-l border-[rgba(255,255,255,0.08)] p-6 z-50 overflow-y-auto space-y-6 shadow-2xl"
            >
              <div className="flex justify-between items-center border-b border-[rgba(255,255,255,0.06)] pb-4">
                <div>
                  <h3 className="text-base font-bold text-white">Create Table Reservation</h3>
                  <p className="text-xs text-[#9a9488] mt-0.5">Fill details to confirm booking slot</p>
                </div>
                <button 
                  onClick={() => setAddingReservation(false)}
                  className="w-8 h-8 rounded-lg bg-[#161616] flex items-center justify-center hover:bg-[#222] transition-colors"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[#9a9488] text-[11px] font-bold uppercase tracking-wider mb-1.5 block">Customer Name *</label>
                  <input
                    value={newReservation.customerName}
                    onChange={(e) => setNewReservation({ ...newReservation, customerName: e.target.value })}
                    placeholder="Full name"
                    className="w-full h-11 bg-[#161616] rounded-xl border border-[rgba(255,255,255,0.08)] text-[#f0ece4] placeholder-[#5a5650] focus:border-[#f97316] text-[13px] px-3.5 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="text-[#9a9488] text-[11px] font-bold uppercase tracking-wider mb-1.5 block">Phone Number *</label>
                  <input
                    value={newReservation.customerPhone}
                    onChange={(e) => setNewReservation({ ...newReservation, customerPhone: e.target.value })}
                    placeholder="Customer phone"
                    className="w-full h-11 bg-[#161616] rounded-xl border border-[rgba(255,255,255,0.08)] text-[#f0ece4] placeholder-[#5a5650] focus:border-[#f97316] text-[13px] px-3.5 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="text-[#9a9488] text-[11px] font-bold uppercase tracking-wider mb-1.5 block">Email Address</label>
                  <input
                    type="email"
                    value={newReservation.customerEmail}
                    onChange={(e) => setNewReservation({ ...newReservation, customerEmail: e.target.value })}
                    placeholder="email@example.com"
                    className="w-full h-11 bg-[#161616] rounded-xl border border-[rgba(255,255,255,0.08)] text-[#f0ece4] placeholder-[#5a5650] focus:border-[#f97316] text-[13px] px-3.5 outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[#9a9488] text-[11px] font-bold uppercase tracking-wider mb-1.5 block">Date *</label>
                    <input
                      type="date"
                      value={newReservation.date}
                      onChange={(e) => setNewReservation({ ...newReservation, date: e.target.value })}
                      className="w-full h-11 bg-[#161616] rounded-xl border border-[rgba(255,255,255,0.08)] text-[#f0ece4] focus:border-[#f97316] text-[13px] px-3.5 outline-none transition-all cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-[#9a9488] text-[11px] font-bold uppercase tracking-wider mb-1.5 block">Time *</label>
                    <input
                      type="time"
                      value={newReservation.time}
                      onChange={(e) => setNewReservation({ ...newReservation, time: e.target.value })}
                      className="w-full h-11 bg-[#161616] rounded-xl border border-[rgba(255,255,255,0.08)] text-[#f0ece4] focus:border-[#f97316] text-[13px] px-3.5 outline-none transition-all cursor-pointer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[#9a9488] text-[11px] font-bold uppercase tracking-wider mb-1.5 block">Party Size</label>
                    <input
                      type="number"
                      value={newReservation.partySize}
                      onChange={(e) => setNewReservation({ ...newReservation, partySize: parseInt(e.target.value) || 2 })}
                      min="1"
                      className="w-full h-11 bg-[#161616] rounded-xl border border-[rgba(255,255,255,0.08)] text-[#f0ece4] focus:border-[#f97316] text-[13px] px-3.5 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[#9a9488] text-[11px] font-bold uppercase tracking-wider mb-1.5 block">Select Table</label>
                    <select
                      value={newReservation.tableId}
                      onChange={(e) => setNewReservation({ ...newReservation, tableId: e.target.value })}
                      className="w-full h-11 bg-[#161616] rounded-xl border border-[rgba(255,255,255,0.08)] text-[#f0ece4] text-[13px] px-3 outline-none cursor-pointer"
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
                  <label className="text-[#9a9488] text-[11px] font-bold uppercase tracking-wider mb-1.5 block">Special Requests</label>
                  <textarea
                    value={newReservation.specialRequests}
                    onChange={(e) => setNewReservation({ ...newReservation, specialRequests: e.target.value })}
                    placeholder="Dietary requests, window seat request, anniversaries etc."
                    className="w-full h-24 bg-[#161616] rounded-xl border border-[rgba(255,255,255,0.08)] text-[#f0ece4] placeholder-[#5a5650] focus:border-[#f97316] text-[13px] p-3.5 outline-none transition-all resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3.5 pt-4 border-t border-[rgba(255,255,255,0.06)]">
                <button
                  onClick={addReservation}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#f97316] to-[#fb923c] text-white text-xs font-bold hover:brightness-110 shadow-lg shadow-[rgba(249,115,22,0.15)] transition-all"
                >
                  Confirm Reservation
                </button>
                <button
                  onClick={() => setAddingReservation(false)}
                  className="px-5 py-3 rounded-xl bg-[#161616] border border-[rgba(255,255,255,0.08)] text-[#f0ece4] hover:bg-[#222] transition-colors text-xs font-bold"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </>
        )}

        {/* ADD WAITLIST DRAWER */}
        {addingWaitlist && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAddingWaitlist(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 cursor-pointer"
            />
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[#0c0c0c] border-l border-[rgba(255,255,255,0.08)] p-6 z-50 overflow-y-auto space-y-6 shadow-2xl"
            >
              <div className="flex justify-between items-center border-b border-[rgba(255,255,255,0.06)] pb-4">
                <div>
                  <h3 className="text-base font-bold text-white">Add to Active Waitlist</h3>
                  <p className="text-xs text-[#9a9488] mt-0.5">Walk-in queue management</p>
                </div>
                <button 
                  onClick={() => setAddingWaitlist(false)}
                  className="w-8 h-8 rounded-lg bg-[#161616] flex items-center justify-center hover:bg-[#222] transition-colors"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[#9a9488] text-[11px] font-bold uppercase tracking-wider mb-1.5 block">Customer Name *</label>
                  <input
                    value={newWaitlist.customerName}
                    onChange={(e) => setNewWaitlist({ ...newWaitlist, customerName: e.target.value })}
                    placeholder="Diner name"
                    className="w-full h-11 bg-[#161616] rounded-xl border border-[rgba(255,255,255,0.08)] text-[#f0ece4] placeholder-[#5a5650] focus:border-[#f97316] text-[13px] px-3.5 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="text-[#9a9488] text-[11px] font-bold uppercase tracking-wider mb-1.5 block">Phone Number *</label>
                  <input
                    value={newWaitlist.customerPhone}
                    onChange={(e) => setNewWaitlist({ ...newWaitlist, customerPhone: e.target.value })}
                    placeholder="Customer phone"
                    className="w-full h-11 bg-[#161616] rounded-xl border border-[rgba(255,255,255,0.08)] text-[#f0ece4] placeholder-[#5a5650] focus:border-[#f97316] text-[13px] px-3.5 outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[#9a9488] text-[11px] font-bold uppercase tracking-wider mb-1.5 block">Party Size</label>
                    <input
                      type="number"
                      value={newWaitlist.partySize}
                      onChange={(e) => setNewWaitlist({ ...newWaitlist, partySize: parseInt(e.target.value) || 2 })}
                      min="1"
                      className="w-full h-11 bg-[#161616] rounded-xl border border-[rgba(255,255,255,0.08)] text-[#f0ece4] focus:border-[#f97316] text-[13px] px-3.5 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[#9a9488] text-[11px] font-bold uppercase tracking-wider mb-1.5 block">Estimated Wait (min)</label>
                    <input
                      type="number"
                      value={newWaitlist.estimatedTime}
                      onChange={(e) => setNewWaitlist({ ...newWaitlist, estimatedTime: parseInt(e.target.value) || 30 })}
                      className="w-full h-11 bg-[#161616] rounded-xl border border-[rgba(255,255,255,0.08)] text-[#f0ece4] focus:border-[#f97316] text-[13px] px-3.5 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[#9a9488] text-[11px] font-bold uppercase tracking-wider mb-1.5 block">Notes</label>
                  <textarea
                    value={newWaitlist.notes}
                    onChange={(e) => setNewWaitlist({ ...newWaitlist, notes: e.target.value })}
                    placeholder="Prefer high chairs, near window etc."
                    className="w-full h-24 bg-[#161616] rounded-xl border border-[rgba(255,255,255,0.08)] text-[#f0ece4] placeholder-[#5a5650] focus:border-[#f97316] text-[13px] p-3.5 outline-none transition-all resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3.5 pt-4 border-t border-[rgba(255,255,255,0.06)]">
                <button
                  onClick={addWaitlist}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#f97316] to-[#fb923c] text-white text-xs font-bold hover:brightness-110 shadow-lg shadow-[rgba(249,115,22,0.15)] transition-all"
                >
                  Join Waitlist
                </button>
                <button
                  onClick={() => setAddingWaitlist(false)}
                  className="px-5 py-3 rounded-xl bg-[#161616] border border-[rgba(255,255,255,0.08)] text-[#f0ece4] hover:bg-[#222] transition-colors text-xs font-bold"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

