import { prisma } from "@/lib/prisma";

interface StaffPerformance {
  staffId: string;
  staffName: string;
  role: string;
  totalShifts: number;
  totalHours: number;
  onTimeShifts: number;
  attendanceRate: number;
  averageRating?: number;
  totalOrdersProcessed?: number;
  averageOrderTime?: number;
}

interface PerformanceTrend {
  period: string;
  totalShifts: number;
  totalHours: number;
  attendanceRate: number;
}

export async function getStaffPerformance(staffId: string, days: number = 30): Promise<StaffPerformance> {
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
  });

  if (!staff) {
    throw new Error("Staff not found");
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const schedules = await prisma.schedule.findMany({
    where: {
      staffId,
      date: {
        gte: startDate,
      },
    },
    include: {
      shift: true,
    },
  });

  let totalHours = 0;
  let onTimeShifts = 0;

  for (const schedule of schedules) {
    const [startHour, startMin] = schedule.shift.startTime.split(":").map(Number);
    const [endHour, endMin] = schedule.shift.endTime.split(":").map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    let shiftHours = (endMinutes - startMinutes) / 60;
    
    if (shiftHours < 0) {
      shiftHours += 24;
    }

    totalHours += shiftHours;

    // Assume on-time if status is COMPLETED
    if (schedule.status === "COMPLETED") {
      onTimeShifts++;
    }
  }

  const attendanceRate = schedules.length > 0 ? (onTimeShifts / schedules.length) * 100 : 0;

  // Get order processing metrics (if applicable)
  const ordersProcessed = await prisma.order.findMany({
    where: {
      createdAt: {
        gte: startDate,
      },
    },
    take: 100,
  });

  // This is a simplified calculation - in reality you'd track which staff processed which orders
  const totalOrdersProcessed = Math.floor(ordersProcessed.length / (schedules.length || 1));
  const averageOrderTime = 15; // Placeholder - would need actual order timing data

  return {
    staffId,
    staffName: staff.name,
    role: staff.role,
    totalShifts: schedules.length,
    totalHours,
    onTimeShifts,
    attendanceRate,
    averageRating: 4.5, // Placeholder - would need rating system
    totalOrdersProcessed,
    averageOrderTime,
  };
}

export async function getTeamPerformance(restaurantId: string, days: number = 30) {
  const staff = await prisma.staff.findMany({
    where: { restaurantId },
  });

  const performances: StaffPerformance[] = [];

  for (const person of staff) {
    try {
      const performance = await getStaffPerformance(person.id, days);
      performances.push(performance);
    } catch (error) {
      console.error(`Error getting performance for ${person.name}:`, error);
    }
  }

  // Calculate team averages
  const totalShifts = performances.reduce((sum, p) => sum + p.totalShifts, 0);
  const totalHours = performances.reduce((sum, p) => sum + p.totalHours, 0);
  const averageAttendance = performances.reduce((sum, p) => sum + p.attendanceRate, 0) / performances.length;

  return {
    performances,
    teamStats: {
      totalStaff: staff.length,
      totalShifts,
      totalHours,
      averageAttendance,
    },
  };
}

export async function getStaffPerformanceTrend(staffId: string, months: number = 6) {
  const trends: PerformanceTrend[] = [];

  for (let i = 0; i < months; i++) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    
    const period = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    
    const performance = await getStaffPerformance(staffId, daysInMonth);
    
    trends.push({
      period,
      totalShifts: performance.totalShifts,
      totalHours: performance.totalHours,
      attendanceRate: performance.attendanceRate,
    });
  }

  return trends.reverse();
}

export async function getTopPerformers(restaurantId: string, days: number = 30, limit: number = 5) {
  const teamPerformance = await getTeamPerformance(restaurantId, days);
  
  const sorted = teamPerformance.performances.sort((a, b) => {
    // Sort by attendance rate first, then total hours
    if (b.attendanceRate !== a.attendanceRate) {
      return b.attendanceRate - a.attendanceRate;
    }
    return b.totalHours - a.totalHours;
  });

  return sorted.slice(0, limit);
}

export async function getStaffEfficiencyMetrics(restaurantId: string) {
  const staff = await prisma.staff.findMany({
    where: { restaurantId },
  });

  const metrics = {
    totalStaff: staff.length,
    activeStaff: staff.filter((s) => s.isActive).length,
    byRole: {} as Record<string, number>,
  };

  for (const person of staff) {
    metrics.byRole[person.role] = (metrics.byRole[person.role] || 0) + 1;
  }

  return metrics;
}
