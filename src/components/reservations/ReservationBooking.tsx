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
  UsersRound, 
  Sparkles, 
  Table as TableIcon,
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
  subDays
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

export default function ReservationBooking({ restaurantId, locationId, restaurant }: { restaurantId: string; locationId: string; restaurant?: any }) {
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
      <div className="space-y-6 pt-2">
        <div className="h-8 animate-pulse bg-neutral-900 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse bg-neutral-950 rounded-xl border border-neutral-800" />
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
              RESERVATIONS DECK
            </span>
            <span className="text-[10px] text-[#f5efe2]/40 font-mono-dashboard">
              {new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" }).toUpperCase()}
            </span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#f5efe2] leading-none">
            Reservations Calendar {restaurant?.name && <>at <em className="font-editorial italic font-normal text-[#f0a040]">{restaurant.name}</em></>}
          </h2>
          
          <p className="text-xs sm:text-sm text-[#f5efe2]/60 font-serif italic tracking-wide max-w-xl">
            Hostess deck for interactive table bookings, seating tracking, and walk-in queue management.
          </p>
        </div>

        {/* View Toggles & Actions */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="flex bg-white/5 border border-white/10 p-1 rounded-lg">
            {(["month", "week", "day"] as CalendarView[]).map((v) => (
              <button
                key={v}
                onClick={() => {
                  setView(v);
                  if (v === "day") setSelectedDate(currentDate);
                }}
                className={`px-3 py-1 rounded-md text-[10px] uppercase tracking-wider font-extrabold transition-all ${
                  view === v 
                    ? "bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-[#0b0a08]" 
                    : "text-[#f5efe2]/50 hover:text-[#f5efe2]"
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          <button
            onClick={() => setAddingWaitlist(true)}
            className="px-4.5 py-3 border border-[rgba(255,255,255,0.08)] bg-white/[0.02] hover:bg-white/[0.04] rounded-lg text-xs font-semibold tracking-wider text-[#f5efe2] transition-all flex items-center gap-2 hover:border-[#f0a040]"
          >
            <UsersRound className="size-3.5 text-[#f0a040]" />
            <span>+ WALK-IN QUEUE</span>
          </button>
          
          <button
            onClick={() => setAddingReservation(true)}
            className="px-4.5 py-3 bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-[#0b0a08] rounded-lg text-xs font-black tracking-wider hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-amber-950/20"
          >
            <Plus className="size-3.5 fill-[#0b0a08]" />
            <span>ADD BOOKING</span>
          </button>
        </div>
      </section>

      {/* STAT STRIP - 4-Column Grid with 1px Dividers */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] rounded-xl overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-[rgba(255,255,255,0.08)] relative z-10 shadow-xl">
        {[
          { label: "TODAY'S BOOKINGS", value: todayReservations.length.toString(), desc: `${todayReservations.filter(r => r.status === "COMPLETED").length} completed / ${todayReservations.filter(r => r.status === "CANCELLED").length} cancelled`, isFeatured: false },
          { label: "WAITLIST SIZE", value: waitlist.length.toString(), desc: "Active walk-in queues", isFeatured: true },
          { label: "GUESTS SEATED TODAY", value: todayReservations.filter(r => r.status === "SEATED" || r.status === "COMPLETED").reduce((sum, r) => sum + r.partySize, 0).toString(), desc: "Total diner volume", isFeatured: false },
          { label: "CAPACITY OCCUPANCY", value: `${occupancyPercentage}%`, desc: `${todayOccupancySeats} / ${totalLocationCapacity} seats occupied`, isFeatured: false, progress: occupancyPercentage }
        ].map((item, idx) => (
          <div
            key={item.label}
            className={`p-6 relative group transition-all duration-300 ${
              item.isFeatured 
                ? "bg-gradient-to-br from-[#f0a040]/5 via-transparent to-transparent" 
                : "hover:bg-white/[0.01]"
            }`}
          >
            {item.isFeatured && (
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#f0a040] to-[#e85a2a]" />
            )}
            
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-[0.2em] text-[#f5efe2]/40 uppercase">
                {item.label}
              </span>
              <CalendarIcon className="size-3.5 text-[#f5efe2]/40" />
            </div>

            <div className="mt-4 flex items-baseline gap-2">
              <h3 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#f5efe2] font-mono-dashboard leading-none">
                {item.value}
              </h3>
            </div>

            <div className="mt-2.5 text-[10px] text-[#f5efe2]/40 font-mono-dashboard">
              {item.progress !== undefined ? (
                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-1.5">
                  <div 
                    className="bg-gradient-to-r from-[#f0a040] to-[#e85a2a] h-full rounded-full transition-all duration-500" 
                    style={{ width: `${item.progress}%` }} 
                  />
                </div>
              ) : (
                item.desc
              )}
            </div>
          </div>
        ))}
      </section>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        
        {/* Calendar Grid Area */}
        <div className="lg:col-span-2 bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] rounded-xl p-6 flex flex-col justify-between shadow-xl min-h-[460px] relative overflow-hidden">
          
          {/* Calendar Controller Header */}
          <div className="flex items-center justify-between mb-4 border-b border-[rgba(255,255,255,0.05)] pb-4">
            <div className="flex items-center gap-2">
              <button 
                onClick={handlePrev}
                className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                <ChevronLeft className="size-4 text-[#f5efe2]" />
              </button>
              <h2 className="text-sm font-bold tracking-widest text-[#f5efe2] min-w-[150px] text-center font-mono-dashboard uppercase">
                {view === "month" && format(currentDate, "MMMM yyyy")}
                {view === "week" && `Week of ${format(startOfWeek(currentDate), "MMM d, yyyy")}`}
                {view === "day" && format(currentDate, "EEEE, MMMM d, yyyy")}
              </h2>
              <button 
                onClick={handleNext}
                className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                <ChevronRight className="size-4 text-[#f5efe2]" />
              </button>
            </div>

            <button
              onClick={setToday}
              className="px-3.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold text-[#f0a040] hover:bg-white/10 transition-colors"
            >
              Today
            </button>
          </div>

          {/* MONTH VIEW */}
          {view === "month" && (
            <div className="overflow-x-auto -mx-6 px-6 lg:mx-0 lg:px-0 scrollbar-none">
              <div className="min-w-[700px] lg:min-w-0 space-y-2 flex-1">
                <div className="grid grid-cols-7 gap-1 text-center">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div key={day} className="text-[10px] font-bold text-[#f5efe2]/40 py-2 uppercase tracking-wider font-mono-dashboard">
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
                        className={`min-h-[85px] p-2 rounded-lg border flex flex-col justify-between transition-all relative text-left ${
                          isDaySelected 
                            ? "bg-[#f0a040]/10 border-[#f0a040] ring-1 ring-[#f0a040]" 
                            : isToday(day)
                            ? "bg-white/5 border-[#f0a040]/40"
                            : isCurrentMonth
                            ? "bg-white/[0.01] border-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.12)]"
                            : "bg-transparent border-transparent opacity-20 pointer-events-none"
                        }`}
                      >
                        <div className="flex justify-between items-center w-full">
                          <span className={`text-[10px] font-bold font-mono-dashboard ${
                            isToday(day) ? "text-[#f0a040] bg-[#f0a040]/10 px-1 rounded-md" : "text-[#f5efe2]"
                          }`}>
                            {format(day, "d")}
                          </span>
                          {dayBookings.length > 0 && (
                            <span className="w-4.5 h-4.5 rounded-full bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-[#0b0a08] text-[9px] font-black flex items-center justify-center">
                              {dayBookings.length}
                            </span>
                          )}
                        </div>
                        
                        <div className="w-full space-y-1 mt-2">
                          {dayBookings.slice(0, 2).map((booking) => (
                            <div 
                              key={booking.id} 
                              className={`text-[8px] px-1 py-0.5 rounded truncate font-mono-dashboard uppercase font-bold ${
                                booking.status === "SEATED" 
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                                  : booking.status === "CANCELLED"
                                  ? "bg-red-500/10 text-red-400/60 line-through border border-red-500/10"
                                  : booking.status === "COMPLETED"
                                  ? "bg-blue-500/10 text-blue-400"
                                  : "bg-white/5 text-[#f5efe2]/60 border border-white/5"
                              }`}
                            >
                              {booking.customerName.split(" ")[0]} ({booking.partySize})
                            </div>
                          ))}
                          {dayBookings.length > 2 && (
                            <div className="text-[7px] text-[#f5efe2]/30 text-right font-black">
                              +{dayBookings.length - 2} MORE
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* WEEK VIEW */}
          {view === "week" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 flex-1">
              {getWeekDays().map((day, idx) => {
                const dayBookings = reservations.filter((r) => isSameDay(new Date(r.date), day));
                const isDayToday = isToday(day);

                return (
                  <div 
                    key={idx} 
                    className={`bg-white/[0.01] border rounded-xl p-3.5 space-y-3 min-h-[120px] sm:min-h-[350px] flex flex-col ${
                      isDayToday ? "border-[#f0a040] bg-[#f0a040]/5" : "border-[rgba(255,255,255,0.06)]"
                    }`}
                  >
                    <div className="text-center pb-2 border-b border-[rgba(255,255,255,0.05)]">
                      <div className={`text-[9px] uppercase font-bold tracking-widest font-mono-dashboard ${isDayToday ? "text-[#f0a040]" : "text-[#f5efe2]/40"}`}>
                        {format(day, "eee")}
                      </div>
                      <div className="text-xs font-extrabold text-[#f5efe2] mt-0.5 font-mono-dashboard">{format(day, "MMM d")}</div>
                    </div>

                    <div className="flex-1 space-y-2 overflow-y-auto max-h-[280px] custom-scrollbar">
                      {dayBookings.length === 0 ? (
                        <div className="text-[9px] text-[#f5efe2]/20 text-center pt-8 font-mono-dashboard uppercase tracking-wider">Empty</div>
                      ) : (
                        dayBookings.map((booking) => (
                          <div 
                            key={booking.id} 
                            onClick={() => {
                              setSelectedDate(day);
                              setView("day");
                            }}
                            className="bg-[#0b0a08] border border-[rgba(255,255,255,0.04)] hover:border-[#f0a040]/40 p-2 rounded-lg transition-all cursor-pointer space-y-1.5"
                          >
                            <div className="text-[10px] font-bold text-[#f5efe2] truncate">{booking.customerName}</div>
                            <div className="flex items-center justify-between text-[8px] text-[#f5efe2]/40 font-mono-dashboard">
                              <span className="flex items-center gap-0.5 text-[#f0a040]">
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
            <div className="space-y-4 flex-1">
              <div className="flex justify-between items-center border-b border-[rgba(255,255,255,0.05)] pb-4">
                <h3 className="text-xs font-bold text-[#f5efe2] flex items-center gap-2 uppercase tracking-wider">
                  <CalendarDays className="size-4 text-[#f0a040]" />
                  Schedule for {format(selectedDate, "MMMM d, yyyy")}
                </h3>
                <span className="text-[10px] text-[#f5efe2]/40 font-mono-dashboard uppercase tracking-widest">
                  {selectedDayReservations.length} Bookings listed
                </span>
              </div>

              {selectedDayReservations.length === 0 ? (
                <div className="text-center py-20 bg-white/[0.01] border border-[rgba(255,255,255,0.05)] rounded-xl">
                  <Clock className="size-10 text-[#f5efe2]/20 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-[#f5efe2] uppercase tracking-widest">No Bookings Scheduled</h4>
                  <p className="text-xs text-[#f5efe2]/40 mt-1 font-serif italic">Use "+ BOOKING" button to reserve slots for this date.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedDayReservations.map((res) => (
                    <div 
                      key={res.id} 
                      className={`p-4 bg-white/[0.01] border rounded-xl flex flex-col justify-between space-y-4 hover:border-[rgba(255,255,255,0.12)] transition-all ${
                        res.status === "SEATED" 
                          ? "border-emerald-500/20 shadow-lg shadow-emerald-500/5" 
                          : res.status === "CANCELLED" 
                          ? "border-red-500/10 opacity-60"
                          : res.status === "COMPLETED"
                          ? "border-blue-500/20"
                          : "border-[rgba(255,255,255,0.06)]"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider ${
                            res.status === "CONFIRMED" 
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : res.status === "SEATED"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : res.status === "COMPLETED"
                              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              : "bg-red-500/10 text-red-400 border border-red-500/20"
                          }`}>
                            {res.status}
                          </span>
                          <h4 className="text-sm font-bold text-[#f5efe2] mt-2">{res.customerName}</h4>
                          <div className="text-xs text-[#f5efe2]/60 flex items-center gap-3 font-mono-dashboard">
                            <span className="flex items-center gap-1"><Phone className="size-3 text-[#f0a040]" /> {res.customerPhone}</span>
                            {res.customerEmail && <span className="flex items-center gap-1"><Mail className="size-3" /> {res.customerEmail}</span>}
                          </div>
                        </div>
                        <div className="text-right space-y-1 font-mono-dashboard">
                          <div className="text-[#f0a040] font-bold text-xs flex items-center justify-end gap-1">
                            <Clock className="size-3" />
                            {format(new Date(res.date), "h:mm a")}
                          </div>
                          <div className="text-[11px] text-[#f5efe2] flex items-center justify-end gap-1 font-semibold">
                            <Users className="size-3 text-[#f5efe2]/40" />
                            {res.partySize} Guests
                          </div>
                          <div className="text-[10px] text-[#f5efe2]/40 flex items-center justify-end gap-1">
                            <TableIcon className="size-3" />
                            {res.table?.name || "Unassigned"}
                          </div>
                        </div>
                      </div>

                      {res.specialRequests && (
                        <div className="bg-white/[0.02] border border-[rgba(255,255,255,0.04)] p-2.5 rounded-lg text-xs text-[#f5efe2]/60 flex items-start gap-1.5">
                          <FileText className="size-3.5 text-[#f0a040] shrink-0 mt-0.5" />
                          <span>Special request: <strong className="text-[#f5efe2]">{res.specialRequests}</strong></span>
                        </div>
                      )}

                      <div className="flex gap-2 justify-end border-t border-[rgba(255,255,255,0.04)] pt-3">
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
                            className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all text-xs font-semibold flex items-center gap-1"
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
        <div className="bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] rounded-xl p-6 space-y-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-6 flex-1">
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.05)] pb-4">
              <h3 className="text-xs font-bold text-[#f5efe2] flex items-center gap-2 uppercase tracking-wider">
                <UsersRound className="size-4 text-[#f0a040]" />
                Active Waitlist
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-[#f0a040]/10 border border-[#f0a040]/20 text-[#f0a040] text-[9px] font-black font-mono-dashboard">
                {waitlist.length} QUEUED
              </span>
            </div>

            {waitlist.length === 0 ? (
              <div className="text-center py-16 bg-white/[0.01] border border-[rgba(255,255,255,0.05)] rounded-xl">
                <Clock className="size-8 text-[#f5efe2]/20 mx-auto mb-3" />
                <h4 className="text-xs font-bold text-[#f5efe2] uppercase tracking-widest">Waitlist Empty</h4>
                <p className="text-[10px] text-[#f5efe2]/40 mt-1 font-serif italic">No walk-in reservations in queue.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1 custom-scrollbar">
                {waitlist.map((entry) => (
                  <div key={entry.id} className="p-4 bg-white/[0.01] border border-[rgba(255,255,255,0.04)] rounded-xl space-y-3 hover:border-[rgba(255,255,255,0.12)] transition-all">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-bold text-[#f5efe2]">{entry.customerName}</h4>
                        <div className="text-[10px] text-[#f5efe2]/60 flex items-center gap-1.5 mt-1 font-mono-dashboard">
                          <Phone className="size-3 text-[#f0a040]" />
                          {entry.customerPhone}
                        </div>
                      </div>
                      <div className="text-right font-mono-dashboard">
                        <div className="text-[#f5efe2] text-xs font-bold flex items-center justify-end gap-1">
                          <Users className="size-3 text-[#f0a040]" />
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
                      <div className="text-[10px] text-[#f5efe2]/40 bg-white/[0.02] p-2 rounded-lg font-serif italic">
                        Note: <strong className="text-[#f5efe2]/60 not-italic font-sans">{entry.notes}</strong>
                      </div>
                    )}

                    <div className="flex justify-end pt-2 border-t border-[rgba(255,255,255,0.03)]">
                      <button
                        onClick={() => seatWaitlistEntry(entry.id)}
                        className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-[#0b0a08] text-[10px] font-black uppercase tracking-wider hover:brightness-110 transition-all flex items-center gap-1"
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
      </div>

      {/* Drawers */}
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
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[#0b0a08] border-l border-[rgba(255,255,255,0.08)] p-6 z-50 overflow-y-auto space-y-6 shadow-2xl"
            >
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#f0a040] to-[#e85a2a]" />
              <div className="flex justify-between items-center border-b border-[rgba(255,255,255,0.06)] pb-4 pt-2">
                <div>
                  <h3 className="text-sm font-bold text-[#f5efe2] uppercase tracking-wider">Create Table Reservation</h3>
                  <p className="text-xs text-[#f5efe2]/60 mt-0.5 font-serif italic">Fill details to confirm booking slot</p>
                </div>
                <button 
                  onClick={() => setAddingReservation(false)}
                  className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <X className="size-4 text-[#f5efe2]" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[#f5efe2]/60 text-[10px] font-bold uppercase tracking-wider mb-1.5 block">Customer Name *</label>
                  <input
                    value={newReservation.customerName}
                    onChange={(e) => setNewReservation({ ...newReservation, customerName: e.target.value })}
                    placeholder="Full name"
                    className="w-full h-10 bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] text-[#f5efe2] placeholder-[#f5efe2]/20 focus:border-[#f0a040] outline-none text-[13px] px-3 transition-colors rounded-lg"
                  />
                </div>

                <div>
                  <label className="text-[#f5efe2]/60 text-[10px] font-bold uppercase tracking-wider mb-1.5 block">Phone Number *</label>
                  <input
                    value={newReservation.customerPhone}
                    onChange={(e) => setNewReservation({ ...newReservation, customerPhone: e.target.value })}
                    placeholder="Customer phone"
                    className="w-full h-10 bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] text-[#f5efe2] placeholder-[#f5efe2]/20 focus:border-[#f0a040] outline-none text-[13px] px-3 transition-colors rounded-lg"
                  />
                </div>

                <div>
                  <label className="text-[#f5efe2]/60 text-[10px] font-bold uppercase tracking-wider mb-1.5 block">Email Address</label>
                  <input
                    type="email"
                    value={newReservation.customerEmail}
                    onChange={(e) => setNewReservation({ ...newReservation, customerEmail: e.target.value })}
                    placeholder="email@example.com"
                    className="w-full h-10 bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] text-[#f5efe2] placeholder-[#f5efe2]/20 focus:border-[#f0a040] outline-none text-[13px] px-3 transition-colors rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[#f5efe2]/60 text-[10px] font-bold uppercase tracking-wider mb-1.5 block">Date *</label>
                    <input
                      type="date"
                      value={newReservation.date}
                      onChange={(e) => setNewReservation({ ...newReservation, date: e.target.value })}
                      className="w-full h-10 bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] text-[#f5efe2] focus:border-[#f0a040] outline-none text-[13px] px-3 transition-colors rounded-lg cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-[#f5efe2]/60 text-[10px] font-bold uppercase tracking-wider mb-1.5 block">Time *</label>
                    <input
                      type="time"
                      value={newReservation.time}
                      onChange={(e) => setNewReservation({ ...newReservation, time: e.target.value })}
                      className="w-full h-10 bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] text-[#f5efe2] focus:border-[#f0a040] outline-none text-[13px] px-3 transition-colors rounded-lg cursor-pointer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[#f5efe2]/60 text-[10px] font-bold uppercase tracking-wider mb-1.5 block">Party Size</label>
                    <input
                      type="number"
                      value={newReservation.partySize}
                      onChange={(e) => setNewReservation({ ...newReservation, partySize: parseInt(e.target.value) || 2 })}
                      min="1"
                      className="w-full h-10 bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] text-[#f5efe2] focus:border-[#f0a040] outline-none text-[13px] px-3 transition-colors rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-[#f5efe2]/60 text-[10px] font-bold uppercase tracking-wider mb-1.5 block">Select Table</label>
                    <select
                      value={newReservation.tableId}
                      onChange={(e) => setNewReservation({ ...newReservation, tableId: e.target.value })}
                      className="w-full h-10 bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] text-[#f5efe2] text-[13px] px-3 outline-none cursor-pointer focus:border-[#f0a040] transition-colors rounded-lg"
                    >
                      <option value="" className="bg-[#0b0a08]">Select table</option>
                      {tables.map((table) => (
                        <option key={table.id} value={table.id} className="bg-[#0b0a08]">
                          {table.name} {table.capacity && `(${table.capacity} seats)`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[#f5efe2]/60 text-[10px] font-bold uppercase tracking-wider mb-1.5 block">Special Requests</label>
                  <textarea
                    value={newReservation.specialRequests}
                    onChange={(e) => setNewReservation({ ...newReservation, specialRequests: e.target.value })}
                    placeholder="Dietary requests, window seat request, anniversaries etc."
                    className="w-full h-24 bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] text-[#f5efe2] placeholder-[#f5efe2]/20 focus:border-[#f0a040] outline-none text-[13px] p-3 transition-colors rounded-lg resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3.5 pt-4 border-t border-[rgba(255,255,255,0.06)]">
                <button
                  onClick={addReservation}
                  className="flex-1 py-3 rounded-lg bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-[#0b0a08] text-xs font-black uppercase tracking-wider hover:brightness-110 transition-all shadow-md"
                >
                  Confirm Reservation
                </button>
                <button
                  onClick={() => setAddingReservation(false)}
                  className="px-5 py-3 border border-[rgba(255,255,255,0.08)] bg-white/[0.02] hover:bg-white/[0.04] rounded-lg text-xs font-semibold tracking-wider text-[#f5efe2] transition-all"
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
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[#0b0a08] border-l border-[rgba(255,255,255,0.08)] p-6 z-50 overflow-y-auto space-y-6 shadow-2xl"
            >
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#f0a040] to-[#e85a2a]" />
              <div className="flex justify-between items-center border-b border-[rgba(255,255,255,0.06)] pb-4 pt-2">
                <div>
                  <h3 className="text-sm font-bold text-[#f5efe2] uppercase tracking-wider">Add to Active Waitlist</h3>
                  <p className="text-xs text-[#f5efe2]/60 mt-0.5 font-serif italic">Walk-in queue management</p>
                </div>
                <button 
                  onClick={() => setAddingWaitlist(false)}
                  className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <X className="size-4 text-[#f5efe2]" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[#f5efe2]/60 text-[10px] font-bold uppercase tracking-wider mb-1.5 block">Customer Name *</label>
                  <input
                    value={newWaitlist.customerName}
                    onChange={(e) => setNewWaitlist({ ...newWaitlist, customerName: e.target.value })}
                    placeholder="Diner name"
                    className="w-full h-10 bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] text-[#f5efe2] placeholder-[#f5efe2]/20 focus:border-[#f0a040] outline-none text-[13px] px-3 transition-colors rounded-lg"
                  />
                </div>

                <div>
                  <label className="text-[#f5efe2]/60 text-[10px] font-bold uppercase tracking-wider mb-1.5 block">Phone Number *</label>
                  <input
                    value={newWaitlist.customerPhone}
                    onChange={(e) => setNewWaitlist({ ...newWaitlist, customerPhone: e.target.value })}
                    placeholder="Customer phone"
                    className="w-full h-10 bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] text-[#f5efe2] placeholder-[#f5efe2]/20 focus:border-[#f0a040] outline-none text-[13px] px-3 transition-colors rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[#f5efe2]/60 text-[10px] font-bold uppercase tracking-wider mb-1.5 block">Party Size</label>
                    <input
                      type="number"
                      value={newWaitlist.partySize}
                      onChange={(e) => setNewWaitlist({ ...newWaitlist, partySize: parseInt(e.target.value) || 2 })}
                      min="1"
                      className="w-full h-10 bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] text-[#f5efe2] focus:border-[#f0a040] outline-none text-[13px] px-3 transition-colors rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-[#f5efe2]/60 text-[10px] font-bold uppercase tracking-wider mb-1.5 block">Estimated Wait (min)</label>
                    <input
                      type="number"
                      value={newWaitlist.estimatedTime}
                      onChange={(e) => setNewWaitlist({ ...newWaitlist, estimatedTime: parseInt(e.target.value) || 30 })}
                      className="w-full h-10 bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] text-[#f5efe2] focus:border-[#f0a040] outline-none text-[13px] px-3 transition-colors rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[#f5efe2]/60 text-[10px] font-bold uppercase tracking-wider mb-1.5 block">Notes</label>
                  <textarea
                    value={newWaitlist.notes}
                    onChange={(e) => setNewWaitlist({ ...newWaitlist, notes: e.target.value })}
                    placeholder="Prefer high chairs, near window etc."
                    className="w-full h-24 bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] text-[#f5efe2] placeholder-[#f5efe2]/20 focus:border-[#f0a040] outline-none text-[13px] p-3 transition-colors rounded-lg resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3.5 pt-4 border-t border-[rgba(255,255,255,0.06)]">
                <button
                  onClick={addWaitlist}
                  className="flex-1 py-3 rounded-lg bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-[#0b0a08] text-xs font-black uppercase tracking-wider hover:brightness-110 transition-all shadow-md"
                >
                  Join Waitlist
                </button>
                <button
                  onClick={() => setAddingWaitlist(false)}
                  className="px-5 py-3 border border-[rgba(255,255,255,0.08)] bg-white/[0.02] hover:bg-white/[0.04] rounded-lg text-xs font-semibold tracking-wider text-[#f5efe2] transition-all"
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
