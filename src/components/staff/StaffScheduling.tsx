"use client";

import { useState, useEffect } from "react";
import { Calendar, Clock, User, Plus, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
}

interface Staff {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Schedule {
  id: string;
  date: Date;
  status: string;
  notes?: string;
  shift: Shift;
  staff: Staff;
}

export default function StaffScheduling({ restaurantId, restaurant }: { restaurantId: string; restaurant?: any }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [minLoading, setMinLoading] = useState(true);
  const [addingShift, setAddingShift] = useState(false);
  const [addingSchedule, setAddingSchedule] = useState(false);

  const [newShift, setNewShift] = useState({
    name: "",
    startTime: "",
    endTime: "",
  });

  const [newSchedule, setNewSchedule] = useState({
    date: "",
    shiftId: "",
    staffId: "",
    notes: "",
  });

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        await Promise.all([
          fetchShifts(),
          fetchStaff(),
          fetchSchedules()
        ]);
      } finally {
        if (mounted) {
          setLoading(false);
          setMinLoading(false);
        }
      }
    };

    loadData();
  }, [restaurantId, currentDate]);

  async function fetchShifts() {
    try {
      const response = await axios.get(`/api/staff/shifts?restaurantId=${restaurantId}`);
      setShifts(response.data);
    } catch (error) {
      console.error("Failed to load shifts");
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

  async function fetchSchedules() {
    try {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const response = await axios.get(`/api/staff/schedules?restaurantId=${restaurantId}&date=${startOfMonth.toISOString()}`);
      setSchedules(response.data);
    } catch (error) {
      console.error("Failed to load schedules");
    }
  }

  async function addShift() {
    if (!newShift.name || !newShift.startTime || !newShift.endTime) {
      toast.error("Name, start time, and end time are required");
      return;
    }

    try {
      await axios.post("/api/staff/shifts", {
        ...newShift,
        restaurantId,
      });
      toast.success("Shift added!");
      setNewShift({ name: "", startTime: "", endTime: "" });
      setAddingShift(false);
      fetchShifts();
    } catch (error) {
      toast.error("Failed to add shift");
    }
  }

  async function addSchedule() {
    if (!newSchedule.date || !newSchedule.shiftId || !newSchedule.staffId) {
      toast.error("Date, shift, and staff are required");
      return;
    }

    try {
      await axios.post("/api/staff/schedules", {
        ...newSchedule,
        restaurantId,
      });
      toast.success("Schedule added!");
      setNewSchedule({ date: "", shiftId: "", staffId: "", notes: "" });
      setAddingSchedule(false);
      fetchSchedules();
    } catch (error) {
      toast.error("Failed to add schedule");
    }
  }

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const monthName = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const getScheduleForDay = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return schedules.filter((s) => new Date(s.date).toDateString() === date.toDateString());
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  if (minLoading) {
    return (
      <div className="space-y-6 pt-2">
        <div className="h-8 animate-pulse bg-neutral-900 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 animate-pulse bg-neutral-950 rounded-xl border border-neutral-800" />
          <div className="h-64 animate-pulse bg-neutral-950 rounded-xl border border-neutral-800" />
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
              STAFF LOGISTICS
            </span>
            <span className="text-[10px] text-[#f5efe2]/40 font-mono-dashboard">
              {new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" }).toUpperCase()}
            </span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#f5efe2] leading-none">
            Staff Scheduling {restaurant?.name && <>at <em className="font-editorial italic font-normal text-[#f0a040]">{restaurant.name}</em></>}
          </h2>
          
          <p className="text-xs sm:text-sm text-[#f5efe2]/60 font-serif italic tracking-wide max-w-xl">
            Roster shifts, assign kitchen staff and servers, and track attendance cycles.
          </p>
        </div>

        {/* Actions panel */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => setAddingShift(true)}
            className="px-4.5 py-3 border border-[rgba(255,255,255,0.08)] bg-white/[0.02] hover:bg-white/[0.04] rounded-lg text-xs font-semibold tracking-wider text-[#f5efe2] transition-all flex items-center gap-2 hover:border-[#f0a040]"
          >
            <span>+ ADD SHIFT</span>
          </button>
          
          <button
            onClick={() => setAddingSchedule(true)}
            className="px-4.5 py-3 bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-[#0b0a08] rounded-lg text-xs font-black tracking-wider hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-amber-950/20"
          >
            <Plus className="size-3.5 fill-[#0b0a08]" />
            <span>ADD SCHEDULE</span>
          </button>
        </div>
      </section>

      {/* Add Shift Form */}
      {addingShift && (
        <div className="bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] rounded-xl p-6 space-y-4 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#f0a040] to-[#e85a2a]" />
          <h3 className="text-sm font-bold text-[#f5efe2] tracking-wider uppercase">Configure Shift Interval</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-[#f5efe2]/60 text-[11px] font-medium mb-1 block">Shift Name *</label>
              <input
                value={newShift.name}
                onChange={(e) => setNewShift({ ...newShift, name: e.target.value })}
                placeholder="e.g. Morning, Evening"
                className="w-full h-10 bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] text-[#f5efe2] placeholder-[#f5efe2]/20 focus:border-[#f0a040] outline-none text-[13px] px-3 transition-colors rounded-lg"
              />
            </div>
            <div>
              <label className="text-[#f5efe2]/60 text-[11px] font-medium mb-1 block">Start Time *</label>
              <input
                type="time"
                value={newShift.startTime}
                onChange={(e) => setNewShift({ ...newShift, startTime: e.target.value })}
                className="w-full h-10 bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] text-[#f5efe2] focus:border-[#f0a040] outline-none text-[13px] px-3 transition-colors rounded-lg cursor-pointer"
              />
            </div>
            <div>
              <label className="text-[#f5efe2]/60 text-[11px] font-medium mb-1 block">End Time *</label>
              <input
                type="time"
                value={newShift.endTime}
                onChange={(e) => setNewShift({ ...newShift, endTime: e.target.value })}
                className="w-full h-10 bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] text-[#f5efe2] focus:border-[#f0a040] outline-none text-[13px] px-3 transition-colors rounded-lg cursor-pointer"
              />
            </div>
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={addShift}
              className="px-4.5 py-2.5 bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-[#0b0a08] rounded-lg text-xs font-black tracking-wider hover:brightness-110 transition-all shadow-md"
            >
              Save Shift
            </button>
            <button
              onClick={() => {
                setAddingShift(false);
                setNewShift({ name: "", startTime: "", endTime: "" });
              }}
              className="px-4.5 py-2.5 border border-[rgba(255,255,255,0.08)] bg-white/[0.02] hover:bg-white/[0.04] rounded-lg text-xs font-semibold tracking-wider text-[#f5efe2] transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Add Schedule Form */}
      {addingSchedule && (
        <div className="bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] rounded-xl p-6 space-y-4 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#f0a040] to-[#e85a2a]" />
          <h3 className="text-sm font-bold text-[#f5efe2] tracking-wider uppercase">Assign Shift Schedule</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-[#f5efe2]/60 text-[11px] font-medium mb-1 block">Date *</label>
              <input
                type="date"
                value={newSchedule.date}
                onChange={(e) => setNewSchedule({ ...newSchedule, date: e.target.value })}
                className="w-full h-10 bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] text-[#f5efe2] focus:border-[#f0a040] outline-none text-[13px] px-3 transition-colors rounded-lg cursor-pointer"
              />
            </div>
            <div>
              <label className="text-[#f5efe2]/60 text-[11px] font-medium mb-1 block">Shift *</label>
              <select
                value={newSchedule.shiftId}
                onChange={(e) => setNewSchedule({ ...newSchedule, shiftId: e.target.value })}
                className="w-full h-10 bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] text-[#f5efe2] text-[13px] px-3 outline-none cursor-pointer focus:border-[#f0a040] transition-colors rounded-lg"
              >
                <option value="" className="bg-[#0b0a08]">Select shift</option>
                {shifts.map((shift) => (
                  <option key={shift.id} value={shift.id} className="bg-[#0b0a08]">
                    {shift.name} ({shift.startTime} - {shift.endTime})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[#f5efe2]/60 text-[11px] font-medium mb-1 block">Staff *</label>
              <select
                value={newSchedule.staffId}
                onChange={(e) => setNewSchedule({ ...newSchedule, staffId: e.target.value })}
                className="w-full h-10 bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] text-[#f5efe2] text-[13px] px-3 outline-none cursor-pointer focus:border-[#f0a040] transition-colors rounded-lg"
              >
                <option value="" className="bg-[#0b0a08]">Select staff</option>
                {staff.map((person) => (
                  <option key={person.id} value={person.id} className="bg-[#0b0a08]">
                    {person.name} ({person.role})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[#f5efe2]/60 text-[11px] font-medium mb-1 block">Notes</label>
            <input
              value={newSchedule.notes}
              onChange={(e) => setNewSchedule({ ...newSchedule, notes: e.target.value })}
              placeholder="Optional notes"
              className="w-full h-10 bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] text-[#f5efe2] placeholder-[#f5efe2]/20 focus:border-[#f0a040] outline-none text-[13px] px-3 transition-colors rounded-lg"
            />
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={addSchedule}
              className="px-4.5 py-2.5 bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-[#0b0a08] rounded-lg text-xs font-black tracking-wider hover:brightness-110 transition-all shadow-md"
            >
              Save Schedule
            </button>
            <button
              onClick={() => {
                setAddingSchedule(false);
                setNewSchedule({ date: "", shiftId: "", staffId: "", notes: "" });
              }}
              className="px-4.5 py-2.5 border border-[rgba(255,255,255,0.08)] bg-white/[0.02] hover:bg-white/[0.04] rounded-lg text-xs font-semibold tracking-wider text-[#f5efe2] transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Calendar card */}
      <div className="bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] rounded-xl p-6 shadow-xl relative overflow-hidden">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-6 border-b border-[rgba(255,255,255,0.05)] pb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={goToPreviousMonth}
              className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <ChevronLeft className="size-5 text-[#f5efe2]/60 hover:text-white" />
            </button>
            <h2 className="text-sm font-bold tracking-widest text-[#f5efe2] min-w-[150px] text-center font-mono-dashboard uppercase">
              {monthName}
            </h2>
            <button
              onClick={goToNextMonth}
              className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <ChevronRight className="size-5 text-[#f5efe2]/60 hover:text-white" />
            </button>
          </div>

          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#52d27a] pulse-dot inline-block" />
            <span className="text-[9px] font-black uppercase tracking-wider text-[#52d27a] font-mono-dashboard">Roster Active</span>
          </div>
        </div>

        <div className="overflow-x-auto pb-2 custom-scrollbar">
          <div className="min-w-[600px]">
            {/* Calendar Grid Header */}
            <div className="grid grid-cols-7 gap-1.5 mb-2 text-center">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="text-[10px] font-bold text-[#f5efe2]/40 uppercase tracking-wider font-mono-dashboard py-1">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {/* Empty cells */}
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square opacity-0 pointer-events-none" />
              ))}

              {/* Days of the month */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const daySchedules = getScheduleForDay(day);
                const isDayToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();

                return (
                  <div
                    key={day}
                    className={`aspect-square border rounded-lg p-2.5 transition-all text-left flex flex-col justify-between ${
                      isDayToday 
                        ? "bg-[#f0a040]/10 border-[#f0a040] ring-1 ring-[#f0a040]" 
                        : "bg-white/[0.01] border-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.12)]"
                    }`}
                  >
                    <div className="text-[10px] font-bold text-[#f5efe2] font-mono-dashboard">{day}</div>
                    <div className="space-y-1 mt-1 flex-1 overflow-y-auto custom-scrollbar">
                      {daySchedules.slice(0, 2).map((schedule) => (
                        <div
                          key={schedule.id}
                          className="text-[8px] px-1 py-0.5 rounded bg-white/5 border border-white/5 text-[#f5efe2]/60 truncate font-mono-dashboard uppercase font-bold"
                          title={`${schedule.staff.name} - ${schedule.shift.name}`}
                        >
                          {schedule.staff.name.split(" ")[0]}
                        </div>
                      ))}
                      {daySchedules.length > 2 && (
                        <div className="text-[7px] text-[#f5efe2]/30 font-black text-right pr-0.5">
                          +{daySchedules.length - 2} MORE
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Shifts List */}
      <div className="bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] rounded-xl p-6 shadow-xl relative overflow-hidden">
        <h3 className="text-xs font-bold text-[#f5efe2] tracking-wider uppercase mb-4 border-b border-[rgba(255,255,255,0.05)] pb-3">Available Shift Intervals</h3>
        {shifts.length === 0 ? (
          <div className="text-center py-8 bg-white/[0.01] border border-[rgba(255,255,255,0.04)] rounded-xl">
            <Clock className="size-8 text-[#f5efe2]/20 mx-auto mb-3" />
            <p className="text-[12px] text-[#f5efe2]/40 font-serif italic">No shifts configured yet</p>
            <p className="text-[11px] text-[#f5efe2]/20 mt-1 font-mono-dashboard">Add shifts to start scheduling</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {shifts.map((shift) => (
              <div key={shift.id} className="bg-white/[0.01] border border-[rgba(255,255,255,0.05)] rounded-xl p-4 shadow-sm hover:border-[#f0a040]/30 transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="size-4 text-[#f0a040]" />
                  <span className="text-[12px] font-black uppercase tracking-wider text-[#f5efe2]">{shift.name}</span>
                </div>
                <div className="text-[11px] text-[#f5efe2]/60 font-mono-dashboard">
                  {shift.startTime} - {shift.endTime}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
