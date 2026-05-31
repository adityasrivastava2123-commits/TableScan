import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET all suppliers for a restaurant
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get("restaurantId");

    if (!restaurantId) {
      return NextResponse.json({ error: "Restaurant ID is required" }, { status: 400 });
    }

    const suppliers = await prisma.supplier.findMany({
      where: { restaurantId },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(suppliers);
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    return NextResponse.json({ error: "Failed to fetch suppliers" }, { status: 500 });
  }
}

// POST create new supplier
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, contactName, email, phone, address, leadTime, restaurantId } = body;

    if (!name || !restaurantId) {
      return NextResponse.json({ error: "Name and restaurantId are required" }, { status: 400 });
    }

    const supplier = await prisma.supplier.create({
      data: {
        name,
        contactName,
        email,
        phone,
        address,
        leadTime,
        restaurantId,
      },
    });

    return NextResponse.json(supplier, { status: 201 });
  } catch (error) {
    console.error("Error creating supplier:", error);
    return NextResponse.json({ error: "Failed to create supplier" }, { status: 500 });
  }
}
