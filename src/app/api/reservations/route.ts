import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET reservations for a restaurant
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
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      where.date = {
        gte: startDate,
        lt: endDate,
      };
    }

    const reservations = await prisma.reservation.findMany({
      where,
      include: {
        table: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { date: "asc" },
      take: 50,
    });

    return NextResponse.json(reservations);
  } catch (error) {
    console.error("Error fetching reservations:", error);
    return NextResponse.json({ error: "Failed to fetch reservations" }, { status: 500 });
  }
}

// POST create new reservation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerName, customerPhone, customerEmail, date, partySize, specialRequests, tableId, restaurantId } = body;

    if (!customerName || !customerPhone || !date || !partySize || !restaurantId) {
      return NextResponse.json({ error: "Customer name, phone, date, party size, and restaurantId are required" }, { status: 400 });
    }

    const reservation = await prisma.reservation.create({
      data: {
        customerName,
        customerPhone,
        customerEmail,
        date: new Date(date),
        partySize,
        specialRequests,
        tableId,
        restaurantId,
      },
      include: {
        table: true,
      },
    });

    return NextResponse.json(reservation, { status: 201 });
  } catch (error) {
    console.error("Error creating reservation:", error);
    return NextResponse.json({ error: "Failed to create reservation" }, { status: 500 });
  }
}
