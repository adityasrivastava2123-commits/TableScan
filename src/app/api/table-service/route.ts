import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET all table services for a restaurant
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get("restaurantId");
    const status = searchParams.get("status");

    if (!restaurantId) {
      return NextResponse.json({ error: "Restaurant ID is required" }, { status: 400 });
    }

    const where: any = { restaurantId };
    if (status) {
      where.status = status;
    }

    const tableServices = await prisma.tableService.findMany({
      where,
      include: {
        table: true,
        server: true,
        order: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(tableServices);
  } catch (error) {
    console.error("Error fetching table services:", error);
    return NextResponse.json({ error: "Failed to fetch table services" }, { status: 500 });
  }
}

// POST create new table service
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tableId, status, serverId, orderId, notes, restaurantId } = body;

    if (!tableId || !restaurantId) {
      return NextResponse.json({ error: "TableId and restaurantId are required" }, { status: 400 });
    }

    const tableService = await prisma.tableService.create({
      data: {
        tableId,
        status: status || "AVAILABLE",
        serverId,
        orderId,
        notes,
        restaurantId,
        seatedAt: status === "OCCUPIED" ? new Date() : null,
      },
      include: {
        table: true,
        server: true,
        order: true,
      },
    });

    return NextResponse.json(tableService, { status: 201 });
  } catch (error) {
    console.error("Error creating table service:", error);
    return NextResponse.json({ error: "Failed to create table service" }, { status: 500 });
  }
}
