import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET all order preparations for a restaurant
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
      where.stage = status;
    }

    const preparations = await prisma.orderPreparation.findMany({
      where,
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
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(preparations);
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
