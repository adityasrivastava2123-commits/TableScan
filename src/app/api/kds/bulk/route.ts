import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getPusherServer } from "@/lib/pusher";
import { withRateLimit } from "@/lib/rate-limit";

// POST bulk update order preparations status
export async function POST(request: NextRequest) {
  // Rate limiting: 60 updates per minute per IP
  const rateLimitResult = await withRateLimit(request, { windowMs: 60000, maxRequests: 60 });
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { preparationIds, stage } = body;

    if (!preparationIds || !Array.isArray(preparationIds) || preparationIds.length === 0) {
      return NextResponse.json({ error: "preparationIds array is required" }, { status: 400 });
    }

    if (!stage || !["RECEIVED", "PREPARING", "READY", "SERVED"].includes(stage)) {
      return NextResponse.json({ error: "Valid stage is required" }, { status: 400 });
    }

    // Resolve user details
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    });
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const stageToOrderStatus: Record<string, "NEW" | "PREPARING" | "READY" | "DONE" | "CANCELLED"> = {
      "RECEIVED": "NEW",
      "PREPARING": "PREPARING",
      "READY": "READY",
      "SERVED": "DONE",
    };
    const orderStatus = stageToOrderStatus[stage];

    const updatedPreps = [];

    // Loop through each preparation and perform updates
    for (const id of preparationIds) {
      const prep = await prisma.orderPreparation.findUnique({
        where: { id },
      });

      if (!prep) continue;

      const updateData: any = { stage };
      
      // Update timestamps based on stage
      if (stage === "PREPARING" && !prep.startedAt) {
        updateData.startedAt = new Date();
      } else if (stage === "READY" || stage === "SERVED") {
        updateData.completedAt = new Date();
        
        if (prep.startedAt) {
          const prepTime = Math.floor((new Date().getTime() - prep.startedAt.getTime()) / 60000); // minutes
          updateData.actualPrepTime = prepTime;
        }
      }

      const updatedPrep = await prisma.orderPreparation.update({
        where: { id },
        data: updateData,
      });

      if (orderStatus) {
        await prisma.order.update({
          where: { id: prep.orderId },
          data: { status: orderStatus },
        });

        // Trigger Pusher event for customer/individual order updates
        try {
          const pusher = getPusherServer();
          await pusher.trigger(`order-${prep.orderId}`, "order-updated", {
            status: orderStatus,
          });
        } catch (pusherError) {
          console.error(`Pusher individual trigger failed for order ${prep.orderId}:`, pusherError);
        }
      }

      updatedPreps.push(updatedPrep);
    }

    // Trigger Pusher event for KDS screens sync
    if (updatedPreps.length > 0) {
      try {
        const pusher = getPusherServer();
        const restaurantId = updatedPreps[0].restaurantId;
        await pusher.trigger(`restaurant-${restaurantId}`, "order-updated", {
          bulk: true,
          stage,
        });
      } catch (pusherError) {
        console.error("Pusher restaurant trigger failed:", pusherError);
      }
    }

    return NextResponse.json({ success: true, count: updatedPreps.length });
  } catch (error) {
    console.error("Error performing KDS bulk update:", error);
    return NextResponse.json({ error: "Failed to perform bulk updates" }, { status: 500 });
  }
}
