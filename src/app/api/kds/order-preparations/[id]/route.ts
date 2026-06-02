import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPusherServer } from "@/lib/pusher";
import { withRateLimit } from "@/lib/rate-limit";

// PATCH update order preparation status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Rate limiting: 60 updates per minute per IP
  const rateLimitResult = await withRateLimit(request, { windowMs: 60000, maxRequests: 60 });
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { stage, priority, notes, completedItems } = body;

    // Update item-level completion status if provided
    if (completedItems && Array.isArray(completedItems)) {
      for (const item of completedItems) {
        await prisma.orderItem.update({
          where: { id: item.itemId },
          data: { isCompleted: item.isCompleted },
        });
      }
    }

    const updateData: any = {};
    if (stage) {
      updateData.stage = stage;
      
      // Update timestamps based on stage
      if (stage === "PREPARING" && !updateData.startedAt) {
        updateData.startedAt = new Date();
      } else if (stage === "READY" || stage === "SERVED") {
        updateData.completedAt = new Date();
        
        // Calculate actual prep time
        const preparation = await prisma.orderPreparation.findUnique({
          where: { id: params.id },
        });
        if (preparation && preparation.startedAt) {
          const prepTime = Math.floor((new Date().getTime() - preparation.startedAt.getTime()) / 60000); // minutes
          updateData.actualPrepTime = prepTime;
        }
      }
    }
    if (priority) updateData.priority = priority;
    if (notes) updateData.notes = notes;

    const preparation = await prisma.orderPreparation.update({
      where: { id: params.id },
      data: updateData,
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

    // Sync Order status based on OrderPreparation stage
    if (stage) {
      const stageToOrderStatus: Record<string, "NEW" | "PREPARING" | "READY" | "DONE" | "CANCELLED"> = {
        "RECEIVED": "NEW",
        "PREPARING": "PREPARING",
        "READY": "READY",
        "SERVED": "DONE",
      };
      
      const orderStatus = stageToOrderStatus[stage];
      if (orderStatus) {
        await prisma.order.update({
          where: { id: preparation.orderId },
          data: { status: orderStatus },
        });

        // Trigger Pusher event for real-time customer updates
        try {
          const pusher = getPusherServer();
          await pusher.trigger(`order-${preparation.orderId}`, "order-updated", {
            status: orderStatus,
            orderNumber: preparation.order.orderNumber,
          });

          // Also trigger restaurant channel for other kitchen/waiter panels
          await pusher.trigger(`restaurant-${preparation.restaurantId}`, "order-updated", {
            order: preparation.order,
          });
        } catch (pusherError) {
          console.error("Pusher event trigger failed:", pusherError);
          // Don't fail the update if Pusher fails
        }
      }
    }

    return NextResponse.json(preparation);
  } catch (error) {
    console.error("Error updating order preparation:", error);
    return NextResponse.json({ error: "Failed to update order preparation" }, { status: 500 });
  }
}

// DELETE order preparation
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.orderPreparation.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting order preparation:", error);
    return NextResponse.json({ error: "Failed to delete order preparation" }, { status: 500 });
  }
}
