import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { OrderStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getPusherServer } from "@/lib/pusher";
import { getResend } from "@/lib/resend";
import OrderReadyEmail from "@/lib/emails/orderReady";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";



const updateStatusSchema = z.object({
  status: z.enum(["PREPARING", "READY", "DONE", "CANCELLED"]),
});

function canTriggerPusher() {
  return Boolean(
    process.env.PUSHER_APP_ID &&
      process.env.PUSHER_APP_KEY &&
      process.env.PUSHER_APP_SECRET &&
      process.env.PUSHER_CLUSTER,
  );
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = updateStatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const updatedOrder = await prisma.order.update({
      where: { id: params.id },
      data: { status: parsed.data.status as OrderStatus },
      include: {
        items: {
          include: {
            menuItem: {
              select: { name: true },
            },
          },
        },
        table: true,
        payment: true,
        restaurant: true,
      },
    });

    if (canTriggerPusher()) {
      try {
        const pusher = getPusherServer();
        await pusher.trigger(
          `restaurant-${updatedOrder.restaurantId}`,
          "order-updated",
          { order: updatedOrder },
        );

        await pusher.trigger(
          `order-${updatedOrder.id}`,
          "order-updated",
          { status: updatedOrder.status },
        );
      } catch (pusherError) {
        // Do not block status update if real-time delivery fails.
        console.error("Pusher order-updated trigger failed:", pusherError);
      }
    }

    // Send "Order Ready" email to customer when status changes to READY
    if (parsed.data.status === "READY" && updatedOrder.customerPhone) {
      try {
        // Try to find customer email from order or use phone as identifier
        const customerEmail = updatedOrder.customerPhone.includes("@")
          ? updatedOrder.customerPhone
          : null;

        if (customerEmail) {
          const resend = getResend();
          await resend.emails.send({
            from: "TableScan <onboarding@resend.dev>",
            to: customerEmail,
            subject: `Your Order is Ready! - ${updatedOrder.restaurant.name}`,
            react: OrderReadyEmail({
              restaurantName: updatedOrder.restaurant.name,
              orderNumber: updatedOrder.orderNumber,
              tableName: updatedOrder.table.name,
            }),
          });
        }
      } catch (error) {
        // Do not block status update if email sending fails
        console.error("Failed to send order ready email:", error);
      }
    }

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update order status" }, { status: 500 });
  }
}

