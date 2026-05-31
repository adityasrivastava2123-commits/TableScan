import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET all queue entries for a restaurant
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get("restaurantId");
    const status = searchParams.get("status");
    const type = searchParams.get("type");

    if (!restaurantId) {
      return NextResponse.json({ error: "Restaurant ID is required" }, { status: 400 });
    }

    const where: any = { restaurantId };
    if (status) where.status = status;
    if (type) where.type = type;

    const queueEntries = await prisma.queueEntry.findMany({
      where,
      orderBy: { createdAt: "asc" },
      take: 50,
    });

    return NextResponse.json(queueEntries);
  } catch (error) {
    console.error("Error fetching queue entries:", error);
    return NextResponse.json({ error: "Failed to fetch queue entries" }, { status: 500 });
  }
}

// POST create new queue entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerName, customerPhone, partySize, type, estimatedWaitTime, notes, restaurantId } = body;

    if (!customerName || !customerPhone || !restaurantId) {
      return NextResponse.json({ error: "Customer name, phone, and restaurantId are required" }, { status: 400 });
    }

    const queueEntry = await prisma.queueEntry.create({
      data: {
        customerName,
        customerPhone,
        partySize,
        type: type || "DINE_IN",
        estimatedWaitTime,
        notes,
        restaurantId,
      },
    });

    return NextResponse.json(queueEntry, { status: 201 });
  } catch (error) {
    console.error("Error creating queue entry:", error);
    return NextResponse.json({ error: "Failed to create queue entry" }, { status: 500 });
  }
}
