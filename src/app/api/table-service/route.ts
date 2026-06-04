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
        table: {
          select: {
            id: true,
            name: true,
            capacity: true,
            qrToken: true,
          },
        },
        server: {
          select: {
            id: true,
            name: true,
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            totalAmount: true,
            status: true,
            items: {
              include: {
                menuItem: {
                  select: {
                    name: true,
                    price: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(tableServices);
  } catch (error) {
    console.error("Error fetching table services:", error);
    return NextResponse.json({ error: "Failed to fetch table services" }, { status: 500 });
  }
}

// PUT create or update a waiter/service call for a table.
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { tableId, restaurantId, requestType, message } = body;

    if (!tableId || !restaurantId || !requestType) {
      return NextResponse.json(
        { error: "tableId, restaurantId, and requestType are required" },
        { status: 400 }
      );
    }

    const existing = await prisma.tableService.findFirst({
      where: { tableId, restaurantId },
      orderBy: { createdAt: "desc" },
    });

    const notePayload = JSON.stringify({
      serviceCall: {
        type: String(requestType).toUpperCase(),
        message: message ? String(message).slice(0, 180) : null,
        status: "OPEN",
        requestedAt: new Date().toISOString(),
      },
    });

    const tableService = existing
      ? await prisma.tableService.update({
          where: { id: existing.id },
          data: {
            notes: notePayload,
            status: existing.status === "AVAILABLE" ? "OCCUPIED" : existing.status,
          },
          include: { table: true, server: true, order: true },
        })
      : await prisma.tableService.create({
          data: {
            tableId,
            restaurantId,
            status: "OCCUPIED",
            notes: notePayload,
            seatedAt: new Date(),
          },
          include: { table: true, server: true, order: true },
        });

    return NextResponse.json(tableService);
  } catch (error) {
    console.error("Error creating service call:", error);
    return NextResponse.json({ error: "Failed to create service call" }, { status: 500 });
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
