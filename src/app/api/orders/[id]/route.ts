import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        items: { include: { menuItem: true } },
        payment: true,
        table: true,
        restaurant: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { status, customerName, customerPhone, specialNote, items } = body;

    const existing = await prisma.order.findUnique({
      where: { id: params.id },
      include: { items: true, restaurant: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const updateData: any = {};
    const changes: Record<string, unknown> = {};

    if (status !== undefined) {
      if (!Object.values(OrderStatus).includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      updateData.status = status;
      changes.status = { from: existing.status, to: status };
    }

    if (customerName !== undefined) {
      updateData.customerName = String(customerName).trim() || null;
      changes.customerName = { from: existing.customerName, to: updateData.customerName };
    }

    if (customerPhone !== undefined) {
      updateData.customerPhone = String(customerPhone).trim() || null;
      changes.customerPhone = { from: existing.customerPhone, to: updateData.customerPhone };
    }

    if (specialNote !== undefined) {
      updateData.specialNote = String(specialNote).trim() || null;
      changes.specialNote = { from: existing.specialNote, to: updateData.specialNote };
    }

    const validItems = Array.isArray(items)
      ? items
          .map((item) => ({
            id: String(item.id),
            quantity: Math.max(0, Number(item.quantity) || 0),
            price: Math.max(0, Number(item.price) || 0),
          }))
          .filter((item) => item.id)
      : [];

    const updated = await prisma.$transaction(async (tx) => {
      if (validItems.length > 0) {
        const existingItemMap = new Map(existing.items.map((item) => [item.id, item]));

        for (const item of validItems) {
          const previous = existingItemMap.get(item.id);
          if (!previous) continue;

          await tx.orderItem.update({
            where: { id: item.id },
            data: {
              quantity: item.quantity,
              price: item.price,
            },
          });
        }

        const nextTotal = validItems.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );
        const taxPercent = existing.restaurant.taxPercent ?? 0;
        updateData.taxAmount = (nextTotal * taxPercent) / 100;
        updateData.totalAmount = nextTotal + updateData.taxAmount;
        changes.items = validItems.map((item) => {
          const previous = existingItemMap.get(item.id);
          return {
            id: item.id,
            quantity: { from: previous?.quantity, to: item.quantity },
            price: { from: previous?.price, to: item.price },
          };
        });
      }

      const order = await tx.order.update({
        where: { id: params.id },
        data: updateData,
        include: {
          items: { include: { menuItem: { select: { name: true } } } },
          table: { select: { name: true } },
          payment: { select: { status: true, method: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          action: "ORDER_EDITED",
          details: JSON.stringify({
            orderId: params.id,
            orderNumber: existing.orderNumber,
            changes,
          }),
          userId,
          userRole: "DASHBOARD",
          restaurantId: existing.restaurantId,
        },
      });

      return order;
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update order:", error);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}
