import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET all drivers for a restaurant
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get("restaurantId");
    const available = searchParams.get("available");

    if (!restaurantId) {
      return NextResponse.json({ error: "Restaurant ID is required" }, { status: 400 });
    }

    const where: any = { restaurantId };
    if (available === "true") {
      where.isAvailable = true;
    }

    const drivers = await prisma.driver.findMany({
      where,
      orderBy: { name: "asc" },
    });

    return NextResponse.json(drivers);
  } catch (error) {
    console.error("Error fetching drivers:", error);
    return NextResponse.json({ error: "Failed to fetch drivers" }, { status: 500 });
  }
}

// POST create new driver
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, email, vehicleInfo, restaurantId } = body;

    if (!name || !phone || !restaurantId) {
      return NextResponse.json({ error: "Name, phone, and restaurantId are required" }, { status: 400 });
    }

    const driver = await prisma.driver.create({
      data: {
        name,
        phone,
        email,
        vehicleInfo,
        restaurantId,
      },
    });

    return NextResponse.json(driver, { status: 201 });
  } catch (error) {
    console.error("Error creating driver:", error);
    return NextResponse.json({ error: "Failed to create driver" }, { status: 500 });
  }
}
