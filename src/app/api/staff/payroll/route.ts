import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET payroll records for a restaurant
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get("restaurantId");
    const staffId = searchParams.get("staffId");

    if (!restaurantId) {
      return NextResponse.json({ error: "Restaurant ID is required" }, { status: 400 });
    }

    const where: any = { restaurantId };
    if (staffId) {
      where.staffId = staffId;
    }

    const payrollRecords = await prisma.payrollRecord.findMany({
      where,
      include: {
        staff: true,
      },
      orderBy: { period: "desc" },
    });

    return NextResponse.json(payrollRecords);
  } catch (error) {
    console.error("Error fetching payroll records:", error);
    return NextResponse.json({ error: "Failed to fetch payroll records" }, { status: 500 });
  }
}

// POST create new payroll record
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { period, baseSalary, overtime, bonuses, deductions, totalPay, staffId, restaurantId } = body;

    if (!period || !baseSalary || !staffId || !restaurantId) {
      return NextResponse.json({ error: "Period, baseSalary, staffId, and restaurantId are required" }, { status: 400 });
    }

    const payrollRecord = await prisma.payrollRecord.create({
      data: {
        period,
        baseSalary,
        overtime: overtime || 0,
        bonuses: bonuses || 0,
        deductions: deductions || 0,
        totalPay: totalPay || baseSalary,
        staffId,
        restaurantId,
      },
      include: {
        staff: true,
      },
    });

    return NextResponse.json(payrollRecord, { status: 201 });
  } catch (error) {
    console.error("Error creating payroll record:", error);
    return NextResponse.json({ error: "Failed to create payroll record" }, { status: 500 });
  }
}
