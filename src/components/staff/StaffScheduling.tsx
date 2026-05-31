"use client";

import { useState, useEffect } from "react";
import { Calendar, Clock, User, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";

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

export default function StaffScheduling({ restaurantId }: { restaurantId: string }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
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
    fetchShifts();
    fetchStaff();
    fetchSchedules();
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
    } finally {
      setLoading(false);
    }
  }

  async function fetchSchedules() {
    try {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
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

  if (loading) {
    return <div className="text-center py-12 text-[#9a9488]">Loading schedule...</div>;
  }

  return (
    <div className="p-7 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3.5 flex-wrap">
        <div className="w-[46px] h-[46px] rounded-xl bg-[#f97316] flex items-center justify-center flex-shrink-0">
          <Calendar className="size-5 text-white" />
        </div>
        <div>
          <h1 className="text-[20px] font-bold text-[#f0ece4]">Staff Scheduling</h1>
          <p className="text-[12px] text-[#9a9488]">Manage shifts and staff assignments</p>
        </div>
        <div className="ml-auto flex gap-2.5">
          <button
            onClick={() => setAddingShift(true)}
            className="px-4 py-2.5 rounded-lg bg-[#222222] border border-[rgba(255,255,255,0.12)] text-[#f0ece4] text-[12px] font-semibold hover:border-[#f97316] hover:text-[#f97316] transition-all"
          >
            + Add Shift
          </button>
          <button
            onClick={() => setAddingSchedule(true)}
            className="px-4 py-2.5 rounded-lg bg-[#f97316] text-white text-[12px] font-semibold hover:bg-[#ea6c0a] transition-all"
          >
            + Add Schedule
          </button>
        </div>
      </div>

      {/* Add Shift Form */}
      {addingShift && (
        <div className="bg-[#111111] border border-[rgba(255,255,255,0.07)] rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-[#f0ece4] text-[12px] font-medium mb-1 block">Shift Name *</label>
              <input
                value={newShift.name}
                onChange={(e) => setNewShift({ ...newShift, name: e.target.value })}
                placeholder="e.g. Morning, Evening"
                className="w-full h-10 bg-[#222222] border-[rgba(255,255,255,0.12)] text-[#f0ece4] placeholder-[#5a5650] focus:border-[#f97316] text-[13px] px-3"
              />
            </div>
            <div>
              <label className="text-[#f0ece4] text-[12px] font-medium mb-1 block">Start Time *</label>
              <input
                type="time"
                value={newShift.startTime}
                onChange={(e) => setNewShift({ ...newShift, startTime: e.target.value })}
                className="w-full h-10 bg-[#222222] border-[rgba(255,255,255,0.12)] text-[#f0ece4] placeholder-[#5a5650] focus:border-[#f97316] text-[13px] px-3"
              />
            </div>
            <div>
              <label className="text-[#f0ece4] text-[12px] font-medium mb-1 block">End Time *</label>
              <input
                type="time"
                value={newShift.endTime}
                onChange={(e) => setNewShift({ ...newShift, endTime: e.target.value })}
                className="w-full h-10 bg-[#222222] border-[rgba(255,255,255,0.12)] text-[#f0ece4] placeholder-[#5a5650] focus:border-[#f97316] text-[13px] px-3"
              />
            </div>
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={addShift}
              className="px-4 py-2 rounded-lg bg-[#f97316] text-white text-[12px] font-semibold hover:bg-[#ea6c0a] transition-colors"
            >
              Save Shift
            </button>
            <button
              onClick={() => {
                setAddingShift(false);
                setNewShift({ name: "", startTime: "", endTime: "" });
              }}
              className="px-4 py-2 rounded-lg bg-[#222222] border border-[rgba(255,255,255,0.12)] text-[#f0ece4] hover:bg-[#181818] transition-colors text-[12px]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Add Schedule Form */}
      {addingSchedule && (
        <div className="bg-[#111111] border border-[rgba(255,255,255,0.07)] rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-[#f0ece4] text-[12px] font-medium mb-1 block">Date *</label>
              <input
                type="date"
                value={newSchedule.date}
                onChange={(e) => setNewSchedule({ ...newSchedule, date: e.target.value })}
                className="w-full h-10 bg-[#222222] border-[rgba(255,255,255,0.12)] text-[#f0ece4] placeholder-[#5a5650] focus:border-[#f97316] text-[13px] px-3"
              />
            </div>
            <div>
              <label className="text-[#f0ece4] text-[12px] font-medium mb-1 block">Shift *</label>
              <select
                value={newSchedule.shiftId}
                onChange={(e) => setNewSchedule({ ...newSchedule, shiftId: e.target.value })}
                className="w-full h-10 bg-[#222222] border-[rgba(255,255,255,0.12)] text-[#f0ece4] text-[13px] px-3 outline-none"
              >
                <option value="">Select shift</option>
                {shifts.map((shift) => (
                  <option key={shift.id} value={shift.id}>
                    {shift.name} ({shift.startTime} - {shift.endTime})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[#f0ece4] text-[12px] font-medium mb-1 block">Staff *</label>
              <select
                value={newSchedule.staffId}
                onChange={(e) => setNewSchedule({ ...newSchedule, staffId: e.target.value })}
                className="w-full h-10 bg-[#222222] border-[rgba(255,255,255,0.12)] text-[#f0ece4] text-[13px] px-3 outline-none"
              >
                <option value="">Select staff</option>
                {staff.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name} ({person.role})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[#f0ece4] text-[12px] font-medium mb-1 block">Notes</label>
            <input
              value={newSchedule.notes}
              onChange={(e) => setNewSchedule({ ...newSchedule, notes: e.target.value })}
              placeholder="Optional notes"
              className="w-full h-10 bg-[#222222] border-[rgba(255,255,255,0.12)] text-[#f0ece4] placeholder-[#5a5650] focus:border-[#f97316] text-[13px] px-3"
            />
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={addSchedule}
              className="px-4 py-2 rounded-lg bg-[#f97316] text-white text-[12px] font-semibold hover:bg-[#ea6c0a] transition-colors"
            >
              Save Schedule
            </button>
            <button
              onClick={() => {
                setAddingSchedule(false);
                setNewSchedule({ date: "", shiftId: "", staffId: "", notes: "" });
              }}
              className="px-4 py-2 rounded-lg bg-[#222222] border border-[rgba(255,255,255,0.12)] text-[#f0ece4] hover:bg-[#181818] transition-colors text-[12px]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Calendar */}
      <div className="bg-[#111111] border border-[rgba(255,255,255,0.07)] rounded-xl p-5">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={goToPreviousMonth}
            className="p-2 rounded-lg hover:bg-[#181818] transition-colors"
          >
            <ChevronLeft className="size-5 text-[#9a9488]" />
          </button>
          <h2 className="text-[16px] font-semibold text-[#f0ece4]">{monthName}</h2>
          <button
            onClick={goToNextMonth}
            className="p-2 rounded-lg hover:bg-[#181818] transition-colors"
          >
            <ChevronRight className="size-5 text-[#9a9488]" />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="text-center text-[11px] text-[#5a5650] font-medium py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for days before first day of month */}
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {/* Days of the month */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const daySchedules = getScheduleForDay(day);
            const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();

            return (
              <div
                key={day}
                className={`aspect-square border border-[rgba(255,255,255,0.07)] rounded-lg p-1.5 hover:border-[rgba(255,255,255,0.12)] transition-colors ${
                  isToday ? "bg-[rgba(249,115,22,0.1)] border-[#f97316]" : ""
                }`}
              >
                <div className="text-[11px] font-medium text-[#f0ece4] mb-1">{day}</div>
                <div className="space-y-0.5">
                  {daySchedules.slice(0, 2).map((schedule) => (
                    <div
                      key={schedule.id}
                      className="text-[9px] px-1 py-0.5 rounded bg-[#222222] text-[#9a9488] truncate"
                      title={`${schedule.staff.name} - ${schedule.shift.name}`}
                    >
                      {schedule.staff.name}
                    </div>
                  ))}
                  {daySchedules.length > 2 && (
                    <div className="text-[9px] text-[#5a5650]">+{daySchedules.length - 2}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Shifts List */}
      <div className="bg-[#111111] border border-[rgba(255,255,255,0.07)] rounded-xl p-5">
        <h3 className="text-[14px] font-semibold text-[#f0ece4] mb-4">Available Shifts</h3>
        {shifts.length === 0 ? (
          <p className="text-[12px] text-[#5a5650]">No shifts configured yet</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {shifts.map((shift) => (
              <div key={shift.id} className="bg-[#222222] border border-[rgba(255,255,255,0.07)] rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="size-4 text-[#f97316]" />
                  <span className="text-[13px] font-semibold text-[#f0ece4]">{shift.name}</span>
                </div>
                <div className="text-[11px] text-[#9a9488]">
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
