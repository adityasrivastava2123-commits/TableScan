import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { OrderStatus } from "@prisma/client";
import {
  eachDayOfInterval,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

type Period = "today" | "week" | "month";

function getPeriodStart(period: Period) {
  const now = new Date();
  if (period === "today") return startOfDay(now);
  if (period === "week") return startOfWeek(now, { weekStartsOn: 1 });
  return startOfMonth(now);
}

function getSeriesDays(period: Period) {
  return period === "month" ? 30 : 7;
}

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get("restaurantId");
  const periodParam = searchParams.get("period") as Period | null;
  const period: Period = periodParam === "week" || periodParam === "month" ? periodParam : "today";

  if (!restaurantId) {
    return NextResponse.json({ error: "restaurantId is required" }, { status: 400 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const restaurant = await prisma.restaurant.findFirst({
    where: {
      id: restaurantId,
      ownerId: dbUser.id,
    },
  });

  if (!restaurant) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const periodStart = getPeriodStart(period);
  const now = new Date();
  const seriesDays = getSeriesDays(period);
  const seriesStart = startOfDay(subDays(now, seriesDays - 1));

  const orders = await prisma.order.findMany({
    where: {
      restaurantId,
      createdAt: {
        gte: periodStart,
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
    },
  });

  const allOrdersForSeries = await prisma.order.findMany({
    where: {
      restaurantId,
      createdAt: {
        gte: seriesStart,
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
    },
  });

  const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
  const totalOrders = orders.length;
  const avgOrderValue = totalOrders ? totalRevenue / totalOrders : 0;

  const itemMap = new Map<string, { name: string; quantity: number; revenue: number }>();
  for (const order of orders) {
    for (const item of order.items) {
      const key = item.menuItem.name;
      const current = itemMap.get(key) ?? { name: key, quantity: 0, revenue: 0 };
      current.quantity += item.quantity;
      current.revenue += item.price * item.quantity;
      itemMap.set(key, current);
    }
  }

  const topItems = Array.from(itemMap.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  const dayBuckets = new Map<string, { date: string; revenue: number; orders: number }>();
  const dayLabels = eachDayOfInterval({ start: seriesStart, end: now }).map((date) =>
    format(date, "yyyy-MM-dd"),
  );

  for (const dayLabel of dayLabels) {
    dayBuckets.set(dayLabel, { date: dayLabel, revenue: 0, orders: 0 });
  }

  for (const order of allOrdersForSeries) {
    const key = format(order.createdAt, "yyyy-MM-dd");
    const bucket = dayBuckets.get(key);
    if (!bucket) continue;
    bucket.revenue += order.totalAmount;
    bucket.orders += 1;
  }

  const revenueByDay = Array.from(dayBuckets.values());

  const ordersByStatus: Record<OrderStatus, number> = {
    NEW: 0,
    PREPARING: 0,
    READY: 0,
    DONE: 0,
    CANCELLED: 0,
  };

  for (const order of orders) {
    ordersByStatus[order.status] += 1;
  }

  const peakHours = Array.from({ length: 24 }, (_, hour) => ({ hour, orders: 0 }));
  for (const order of orders) {
    peakHours[order.createdAt.getHours()].orders += 1;
  }

  return NextResponse.json({
    totalRevenue,
    totalOrders,
    avgOrderValue,
    topItems,
    revenueByDay,
    ordersByStatus,
    peakHours,
  });
}

