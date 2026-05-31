import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET schedules for a restaurant
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get("restaurantId");
    const date = searchParams.get("date");

    if (!restaurantId) {
      return NextResponse.json({ error: "Restaurant ID is required" }, { status: 400 });
    }

    const where: any = { restaurantId };
    if (date) {
      where.date = new Date(date);
    }

    const schedules = await prisma.schedule.findMany({
      where,
      include: {
        staff: true,
        shift: true,
      },
      orderBy: { date: "asc" },
    });

    return NextResponse.json(schedules);
  } catch (error) {
    console.error("Error fetching schedules:", error);
    return NextResponse.json({ error: "Failed to fetch schedules" }, { status: 500 });
  }
}

// POST create new schedule
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, shiftId, staffId, notes, restaurantId } = body;

    if (!date || !shiftId || !staffId || !restaurantId) {
      return NextResponse.json({ error: "Date, shiftId, staffId, and restaurantId are required" }, { status: 400 });
    }

    const schedule = await prisma.schedule.create({
      data: {
        date: new Date(date),
        shiftId,
        staffId,
        notes,
        restaurantId,
      },
      include: {
        staff: true,
        shift: true,
      },
    });

    return NextResponse.json(schedule, { status: 201 });
  } catch (error) {
    console.error("Error creating schedule:", error);
    return NextResponse.json({ error: "Failed to create schedule" }, { status: 500 });
  }
}
