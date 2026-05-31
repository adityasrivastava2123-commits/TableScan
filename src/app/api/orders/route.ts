import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { razorpay } from "@/lib/razorpay";
import { getPusherServer } from "@/lib/pusher";
import { getResend } from "@/lib/resend";
import { z } from "zod";
import OrderConfirmationEmail from "@/lib/emails/orderConfirmation";
import NewOrderAlertEmail from "@/lib/emails/newOrderAlert";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

const orderSchema = z.object({
  tableToken: z.string(),
  restaurantId: z.string(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerEmail: z.string().optional(),
  specialNote: z.string().optional(),
  paymentMethod: z.enum(["ONLINE", "CASH"]).default("ONLINE"),
  items: z.array(z.object({
    menuItemId: z.string(),
    quantity: z.number(),
    price: z.number(),
    note: z.string().optional(),
  })),
});

function generateOrderNumber() {
  return `TS-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

function canTriggerPusher() {
  return Boolean(
    process.env.PUSHER_APP_ID &&
      process.env.PUSHER_APP_KEY &&
      process.env.PUSHER_APP_SECRET &&
      process.env.PUSHER_CLUSTER,
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = orderSchema.parse(body);

    const table = await prisma.table.findUnique({
      where: { qrToken: parsed.tableToken },
    });

    if (!table) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: parsed.restaurantId },
    });

    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const subtotal = parsed.items.reduce(
      (sum, item) => sum + item.price * item.quantity, 0
    );
    const taxAmount = (subtotal * (restaurant.taxPercent ?? 0)) / 100;
    const totalAmount = subtotal + taxAmount;

    let razorpayOrderId: string | null = null;

    if (parsed.paymentMethod === "ONLINE") {
      // Create Razorpay order
      const razorpayOrder = await razorpay.orders.create({
        amount: Math.round(totalAmount * 100), // paise
        currency: "INR",
        receipt: generateOrderNumber(),
      });
      razorpayOrderId = razorpayOrder.id;
    }

    // Create order in DB
    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        tableId: table.id,
        restaurantId: parsed.restaurantId,
        customerName: parsed.customerName,
        customerPhone: parsed.customerPhone,
        specialNote: parsed.specialNote,
        totalAmount,
        taxAmount,
        status: "NEW",
        items: {
          create: parsed.items.map((item) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            price: item.price,
            note: item.note,
          })),
        },
        payment: {
          create: {
            razorpayOrderId,
            amount: totalAmount,
            currency: "INR",
            status: "PENDING",
            method: parsed.paymentMethod,
          },
        },
      },
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
      },
    });

    // Send emails after order creation
    const emailPromises = [];
    const resend = getResend();

    if (resend) {
      // Send order confirmation to customer if email provided
      if (parsed.customerEmail) {
        try {
          const customerEmailPromise = resend.emails.send({
            from: "TableScan <onboarding@resend.dev>",
            to: parsed.customerEmail,
            subject: `Order Confirmation - ${restaurant.name}`,
            react: OrderConfirmationEmail({
              restaurantName: restaurant.name,
              restaurantLogo: restaurant.logo || undefined,
              orderNumber: order.orderNumber,
              tableName: table.name,
              items: order.items.map((item) => ({
                name: item.menuItem.name,
                quantity: item.quantity,
                price: item.price,
              })),
              totalAmount: order.totalAmount,
              taxAmount: order.taxAmount,
            }),
          });
          emailPromises.push(customerEmailPromise);
        } catch (error) {
          console.error("Failed to send customer email:", error);
        }
      }

      // Send new order alert to restaurant owner
      try {
        const restaurantOwner = await prisma.user.findUnique({
          where: { id: restaurant.ownerId },
        });

        if (restaurantOwner) {
          const notificationEmail = (restaurant.notificationEmail as string) || restaurantOwner.email;
          const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/orders`;

          const ownerEmailPromise = resend.emails.send({
            from: "TableScan <onboarding@resend.dev>",
            to: notificationEmail,
            subject: `New Order Received - ${restaurant.name}`,
            react: NewOrderAlertEmail({
              restaurantName: restaurant.name,
              orderNumber: order.orderNumber,
              tableName: table.name,
              items: order.items.map((item) => ({
                name: item.menuItem.name,
                quantity: item.quantity,
                price: item.price,
              })),
              totalAmount: order.totalAmount,
              orderTime: new Date(order.createdAt).toLocaleString(),
              dashboardUrl,
            }),
          });
          emailPromises.push(ownerEmailPromise);
        }
      } catch (error) {
        console.error("Failed to send owner email:", error);
      }
    }

    // Send all emails without blocking the response
    if (emailPromises.length > 0) {
      Promise.allSettled(emailPromises).then((results) => {
        results.forEach((result, index) => {
          if (result.status === "rejected") {
            console.error(`Email ${index} failed:`, result.reason);
          }
        });
      });
    }

    if (canTriggerPusher()) {
      try {
        const pusher = getPusherServer();
        await pusher.trigger(
          `restaurant-${parsed.restaurantId}`,
          "new-order",
          { order },
        );
      } catch (pusherError) {
        // Do not block order creation if real-time delivery fails.
        console.error("Pusher new-order trigger failed:", pusherError);
      }
    }

    return NextResponse.json({
      orderId: order.id,
      razorpayOrderId: razorpayOrderId,
      amount: Math.round(totalAmount * 100),
      currency: "INR",
      paymentMethod: parsed.paymentMethod,
    });
  } catch (error) {
    console.error("Order creation error:", error);
    return NextResponse.json({ 
      error: "Failed to create order",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}