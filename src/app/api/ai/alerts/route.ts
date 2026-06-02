import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay, subDays, subHours } from "date-fns";
import { triggerRealtimeEvent } from "@/lib/realtime";

export const dynamic = "force-dynamic";

export interface ProactiveAlert {
  id: string;
  type: "KITCHEN_BACKLOG" | "REVENUE_DROP" | "SLOW_SERVICE" | "CANCELLATION_SPIKE" | "STOCK_SHORTAGE";
  severity: "CRITICAL" | "WARNING" | "INFO";
  title: string;
  message: string;
  timestamp: Date;
}

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get("restaurantId");

    if (!restaurantId) {
      return NextResponse.json({ error: "restaurantId parameter is required" }, { status: 400 });
    }

    // Verify user ownership or staff access
    const dbUser = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const restaurant = await prisma.restaurant.findFirst({
      where: {
        id: restaurantId,
        OR: [
          { ownerId: dbUser.id },
          { staff: { some: { email: dbUser.email, isActive: true } } }
        ]
      }
    });

    if (!restaurant) {
      return NextResponse.json({ error: "Forbidden restaurant access" }, { status: 403 });
    }

    const alerts: ProactiveAlert[] = [];
    const now = new Date();

    // ── 1. KITCHEN BACKLOG MONITOR ──────────────────────────────────────────
    // Check preparations taking more than 20 minutes
    const backlogCutoff = new Date(now.getTime() - 20 * 60 * 1000);
    const delayedPreps = await prisma.orderPreparation.findMany({
      where: {
        restaurantId,
        stage: "PREPARING",
        startedAt: { lte: backlogCutoff }
      },
      include: { order: { select: { orderNumber: true } } }
    });

    if (delayedPreps.length > 0) {
      alerts.push({
        id: `backlog-${Date.now()}`,
        type: "KITCHEN_BACKLOG",
        severity: delayedPreps.length > 3 ? "CRITICAL" : "WARNING",
        title: "Kitchen Backlog Detected",
        message: `${delayedPreps.length} orders (such as #${delayedPreps[0].order?.orderNumber}) have been in preparation for over 20 minutes.`,
        timestamp: now
      });
    }

    // ── 2. SLOW SERVICE WARNING ──────────────────────────────────────────────
    // Check orders marked as READY but not served (stage === "READY") for over 15 minutes
    const slowServiceCutoff = new Date(now.getTime() - 15 * 60 * 1000);
    const slowOrders = await prisma.orderPreparation.findMany({
      where: {
        restaurantId,
        stage: "READY",
        updatedAt: { lte: slowServiceCutoff }
      },
      include: { order: { select: { orderNumber: true } } }
    });

    if (slowOrders.length > 0) {
      alerts.push({
        id: `slow-service-${Date.now()}`,
        type: "SLOW_SERVICE",
        severity: "WARNING",
        title: "Slow Service Warning",
        message: `${slowOrders.length} orders are ready but have not been served for over 15 minutes. Please dispatch waiter staff.`,
        timestamp: now
      });
    }

    // ── 3. UNUSUAL CANCELLATIONS SPIKE ───────────────────────────────────────
    // Count orders in last 2 hours and calculate percentage of cancellations
    const twoHoursAgo = subHours(now, 2);
    const recentOrders = await prisma.order.findMany({
      where: {
        restaurantId,
        createdAt: { gte: twoHoursAgo }
      },
      select: { status: true }
    });

    if (recentOrders.length >= 5) {
      const cancelledCount = recentOrders.filter(o => o.status === "CANCELLED").length;
      const cancellationRate = (cancelledCount / recentOrders.length) * 100;

      if (cancellationRate > 15) {
        alerts.push({
          id: `cancellations-${Date.now()}`,
          type: "CANCELLATION_SPIKE",
          severity: cancellationRate > 30 ? "CRITICAL" : "WARNING",
          title: "High Order Cancellation Rate",
          message: `${Math.round(cancellationRate)}% of orders have been cancelled in the last 2 hours (${cancelledCount} cancellations). Inspect kitchen logs.`,
          timestamp: now
        });
      }
    }

    // ── 4. INVENTORY STOCKOUT WARNINGS ───────────────────────────────────────
    // Fetch ingredients and check if current stock is below minimum stock
    const ingredients = await prisma.ingredient.findMany({
      where: { restaurantId }
    });

    const lowStockIngredients = ingredients.filter(
      ing => ing.currentStock <= ing.minStock && ing.minStock > 0
    );

    if (lowStockIngredients.length > 0) {
      alerts.push({
        id: `stock-${Date.now()}`,
        type: "STOCK_SHORTAGE",
        severity: "WARNING",
        title: "Inventory Shortage Risk",
        message: `Stock level for ${lowStockIngredients.map(i => i.name).slice(0, 3).join(", ")} is at or below minimum threshold. Reorder suggested.`,
        timestamp: now
      });
    }

    // ── 5. REVENUE DROP MONITOR ──────────────────────────────────────────────
    // Compare today's revenue (excluding today) vs average daily revenue of the last 7 days
    const todayStart = startOfDay(now);
    const last7DaysStart = startOfDay(subDays(now, 7));

    const todayOrders = await prisma.order.findMany({
      where: {
        restaurantId,
        createdAt: { gte: todayStart },
        status: { not: "CANCELLED" }
      },
      select: { totalAmount: true }
    });
    const todayRevenue = todayOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    const pastOrders = await prisma.order.findMany({
      where: {
        restaurantId,
        createdAt: { gte: last7DaysStart, lt: todayStart },
        status: { not: "CANCELLED" }
      },
      select: { totalAmount: true }
    });
    const past7DaysRevenue = pastOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const dailyAverage = past7DaysRevenue / 7;

    // Check revenue drop only after lunch hours (e.g. after 3 PM / 15:00)
    if (now.getHours() >= 15 && dailyAverage > 1000) {
      const expectedRevenueSoFar = dailyAverage * 0.6; // We expect at least 60% of average by 3 PM
      if (todayRevenue < expectedRevenueSoFar * 0.7) { // 30% or more below expected
        alerts.push({
          id: `revenue-drop-${Date.now()}`,
          type: "REVENUE_DROP",
          severity: "WARNING",
          title: "Revenue Drop Detected",
          message: `Today's revenue is ₹${todayRevenue.toLocaleString("en-IN")}, which is significantly below the weekly expectations for this hour. Consider launching a promo coupon.`,
          timestamp: now
        });
      }
    }

    // Broadcast first alert over Pusher if new alerts exist and it is not an options request
    if (alerts.length > 0 && req.method === "GET") {
      try {
        await triggerRealtimeEvent({
          type: "QUEUE_UPDATED", // We can use Queue event or just trigger custom, wait, the client listens to general restaurant channel
          restaurantId,
          data: {
            alert: alerts[0]
          },
          timestamp: now
        });
      } catch (err) {
        console.error("Failed to broadcast alert over Pusher:", err);
      }
    }

    return NextResponse.json({ alerts });
  } catch (error: any) {
    console.error("AI Alerts Engine failure:", error);
    return NextResponse.json({ error: "Failed to generate alerts", details: error.message }, { status: 500 });
  }
}
