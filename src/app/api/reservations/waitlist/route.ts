import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET waitlist for a restaurant
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get("restaurantId");

    if (!restaurantId) {
      return NextResponse.json({ error: "Restaurant ID is required" }, { status: 400 });
    }

    const waitlist = await prisma.waitlist.findMany({
      where: { restaurantId, status: "WAITING" },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(waitlist);
  } catch (error) {
    console.error("Error fetching waitlist:", error);
    return NextResponse.json({ error: "Failed to fetch waitlist" }, { status: 500 });
  }
}

// POST add to waitlist
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerName, customerPhone, partySize, estimatedTime, notes, restaurantId } = body;

    if (!customerName || !customerPhone || !partySize || !restaurantId) {
      return NextResponse.json({ error: "Customer name, phone, party size, and restaurantId are required" }, { status: 400 });
    }

    const waitlistEntry = await prisma.waitlist.create({
      data: {
        customerName,
        customerPhone,
        partySize,
        estimatedTime,
        notes,
        restaurantId,
      },
    });

    return NextResponse.json(waitlistEntry, { status: 201 });
  } catch (error) {
    console.error("Error adding to waitlist:", error);
    return NextResponse.json({ error: "Failed to add to waitlist" }, { status: 500 });
  }
}
