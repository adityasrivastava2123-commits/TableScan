import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET all order preparations for a restaurant
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get("restaurantId");
    const status = searchParams.get("status");
    const locationId = searchParams.get("locationId");

    if (!restaurantId) {
      return NextResponse.json({ error: "Restaurant ID is required" }, { status: 400 });
    }

    const where: any = { restaurantId };
    if (status && status !== "all") {
      where.stage = status;
    }
    if (locationId && locationId !== "all") {
      where.order = {
        table: {
          locationId: locationId
        }
      };
    }

    const preparations = await prisma.orderPreparation.findMany({
      where,
      include: {
        order: {
          include: {
            items: {
              include: {
                menuItem: {
                  select: {
                    name: true,
                    station: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 50,
    });

    // Also fetch locations for branch filtering
    const locations = await prisma.location.findMany({
      where: { restaurantId, isActive: true },
      select: { id: true, name: true },
    });

    return NextResponse.json({ preparations, locations });
  } catch (error) {
    console.error("Error fetching order preparations:", error);
    return NextResponse.json({ error: "Failed to fetch order preparations" }, { status: 500 });
  }
}

// POST create new order preparation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, estimatedPrepTime, priority, restaurantId } = body;

    if (!orderId || !restaurantId) {
      return NextResponse.json({ error: "OrderId and restaurantId are required" }, { status: 400 });
    }

    const preparation = await prisma.orderPreparation.create({
      data: {
        orderId,
        estimatedPrepTime,
        priority: priority || "NORMAL",
        restaurantId,
      },
      include: {
        order: {
          include: {
            items: {
              include: {
                menuItem: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(preparation, { status: 201 });
  } catch (error) {
    console.error("Error creating order preparation:", error);
    return NextResponse.json({ error: "Failed to create order preparation" }, { status: 500 });
  }
}
