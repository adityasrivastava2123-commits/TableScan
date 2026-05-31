import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET all deliveries for a restaurant
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get("restaurantId");
    const status = searchParams.get("status");
    const driverId = searchParams.get("driverId");

    if (!restaurantId) {
      return NextResponse.json({ error: "Restaurant ID is required" }, { status: 400 });
    }

    const where: any = { restaurantId };
    if (status) where.status = status;
    if (driverId) where.driverId = driverId;

    const deliveries = await prisma.delivery.findMany({
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
        driver: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(deliveries);
  } catch (error) {
    console.error("Error fetching deliveries:", error);
    return NextResponse.json({ error: "Failed to fetch deliveries" }, { status: 500 });
  }
}

// POST create new delivery
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, pickupAddress, deliveryAddress, estimatedTime, distance, restaurantId } = body;

    if (!orderId || !pickupAddress || !deliveryAddress || !restaurantId) {
      return NextResponse.json({ error: "OrderId, pickup address, delivery address, and restaurantId are required" }, { status: 400 });
    }

    const delivery = await prisma.delivery.create({
      data: {
        orderId,
        pickupAddress,
        deliveryAddress,
        estimatedTime,
        distance,
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
        driver: true,
      },
    });

    return NextResponse.json(delivery, { status: 201 });
  } catch (error) {
    console.error("Error creating delivery:", error);
    return NextResponse.json({ error: "Failed to create delivery" }, { status: 500 });
  }
}
