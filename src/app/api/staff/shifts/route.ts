import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET all shifts for a restaurant
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get("restaurantId");

    if (!restaurantId) {
      return NextResponse.json({ error: "Restaurant ID is required" }, { status: 400 });
    }

    const shifts = await prisma.shift.findMany({
      where: { restaurantId },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(shifts);
  } catch (error) {
    console.error("Error fetching shifts:", error);
    return NextResponse.json({ error: "Failed to fetch shifts" }, { status: 500 });
  }
}

// POST create new shift
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, startTime, endTime, restaurantId } = body;

    if (!name || !startTime || !endTime || !restaurantId) {
      return NextResponse.json({ error: "Name, startTime, endTime, and restaurantId are required" }, { status: 400 });
    }

    const shift = await prisma.shift.create({
      data: {
        name,
        startTime,
        endTime,
        restaurantId,
      },
    });

    return NextResponse.json(shift, { status: 201 });
  } catch (error) {
    console.error("Error creating shift:", error);
    return NextResponse.json({ error: "Failed to create shift" }, { status: 500 });
  }
}
