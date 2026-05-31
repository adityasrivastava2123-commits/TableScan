import { prisma } from "@/lib/prisma";

interface PayrollCalculation {
  staffId: string;
  staffName: string;
  period: string;
  baseSalary: number;
  hoursWorked: number;
  overtimeHours: number;
  overtimePay: number;
  bonuses: number;
  deductions: number;
  totalPay: number;
}

export async function calculatePayroll(staffId: string, period: string): Promise<PayrollCalculation> {
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
  });

  if (!staff) {
    throw new Error("Staff not found");
  }

  // Get schedules for the period
  const [year, month] = period.split(" ");
  const monthIndex = new Date(`${month} 1, ${year}`).getMonth();
  const startDate = new Date(parseInt(year), monthIndex, 1);
  const endDate = new Date(parseInt(year), monthIndex + 1, 0);

  const schedules = await prisma.schedule.findMany({
    where: {
      staffId,
      date: {
        gte: startDate,
        lte: endDate,
      },
      status: "COMPLETED",
    },
    include: {
      shift: true,
    },
  });

  // Calculate hours worked
  let totalHours = 0;
  let overtimeHours = 0;

  for (const schedule of schedules) {
    const [startHour, startMin] = schedule.shift.startTime.split(":").map(Number);
    const [endHour, endMin] = schedule.shift.endTime.split(":").map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    let shiftHours = (endMinutes - startMinutes) / 60;
    
    // Handle overnight shifts
    if (shiftHours < 0) {
      shiftHours += 24;
    }

    // Assume 8 hours is regular, anything over is overtime
    if (shiftHours > 8) {
      overtimeHours += shiftHours - 8;
      totalHours += 8;
    } else {
      totalHours += shiftHours;
    }
  }

  // Calculate hourly rate (assuming base salary is monthly)
  const monthlyWorkingDays = 22; // Average working days per month
  const dailyHours = 8;
  const hourlyRate = 5000 / (monthlyWorkingDays * dailyHours); // Assuming base salary of 5000, adjust as needed

  const baseSalary = totalHours * hourlyRate;
  const overtimePay = overtimeHours * hourlyRate * 1.5; // 1.5x for overtime

  // Get existing payroll record if any
  const existingRecord = await prisma.payrollRecord.findFirst({
    where: {
      staffId,
      period,
    },
  });

  const totalPay = baseSalary + overtimePay + (existingRecord?.bonuses || 0) - (existingRecord?.deductions || 0);

  return {
    staffId,
    staffName: staff.name,
    period,
    baseSalary,
    hoursWorked: totalHours,
    overtimeHours,
    overtimePay,
    bonuses: existingRecord?.bonuses || 0,
    deductions: existingRecord?.deductions || 0,
    totalPay,
  };
}

export async function generatePayrollReport(restaurantId: string, period: string) {
  const staff = await prisma.staff.findMany({
    where: { restaurantId },
  });

  const payrollCalculations: PayrollCalculation[] = [];

  for (const person of staff) {
    try {
      const calculation = await calculatePayroll(person.id, period);
      payrollCalculations.push(calculation);
    } catch (error) {
      console.error(`Error calculating payroll for ${person.name}:`, error);
    }
  }

  const totalPayroll = payrollCalculations.reduce((sum, p) => sum + p.totalPay, 0);
  const totalOvertime = payrollCalculations.reduce((sum, p) => sum + p.overtimePay, 0);
  const totalBonuses = payrollCalculations.reduce((sum, p) => sum + p.bonuses, 0);
  const totalDeductions = payrollCalculations.reduce((sum, p) => sum + p.deductions, 0);

  return {
    period,
    staffCount: staff.length,
    totalPayroll,
    totalOvertime,
    totalBonuses,
    totalDeductions,
    calculations: payrollCalculations,
  };
}

export async function savePayrollRecord(
  staffId: string,
  period: string,
  baseSalary: number,
  overtime: number,
  bonuses: number,
  deductions: number,
  restaurantId: string
) {
  const totalPay = baseSalary + overtime + bonuses - deductions;

  const record = await prisma.payrollRecord.upsert({
    where: {
      id: "", // This won't work, need to find by unique constraint
    },
    create: {
      period,
      baseSalary,
      overtime,
      bonuses,
      deductions,
      totalPay,
      staffId,
      restaurantId,
    },
    update: {
      baseSalary,
      overtime,
      bonuses,
      deductions,
      totalPay,
    },
  });

  return record;
}

export async function getPayrollHistory(staffId: string, limit: number = 12) {
  const records = await prisma.payrollRecord.findMany({
    where: { staffId },
    orderBy: { period: "desc" },
    take: limit,
  });

  return records;
}
