import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SubscriptionStatus } from "@prisma/client";
import { differenceInDays, startOfDay, endOfDay } from "date-fns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get("restaurantId");

    if (!restaurantId) {
      return NextResponse.json(
        { error: "restaurantId required" },
        { status: 400 }
      );
    }

    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);
    const yesterdayStart = startOfDay(
      new Date(today.getTime() - 24 * 60 * 60 * 1000)
    );
    const yesterdayEnd = endOfDay(
      new Date(today.getTime() - 24 * 60 * 60 * 1000)
    );

    // Fetch user first
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Run independent queries in parallel for better performance
    const [restaurant, todayOrders, yesterdayOrders, activeOrders, recentOrders, totalMenuItems, totalStaff, occupiedTablesResult] = await Promise.all([
      prisma.restaurant.findFirst({
        where: {
          id: restaurantId,
          ownerId: user.id,
        },
        include: {
          subscription: true,
          locations: {
            include: {
              tables: {
                where: { isActive: true },
                select: { id: true },
              },
            },
          },
        },
      }),
      prisma.order.findMany({
        where: {
          restaurantId,
          createdAt: { gte: todayStart, lte: todayEnd },
          status: { not: "CANCELLED" },
        },
        select: { totalAmount: true },
      }),
      prisma.order.findMany({
        where: {
          restaurantId,
          createdAt: { gte: yesterdayStart, lte: yesterdayEnd },
          status: { not: "CANCELLED" },
        },
        select: { totalAmount: true },
      }),
      prisma.order.count({
        where: {
          restaurantId,
          status: { in: ["NEW", "PREPARING", "READY"] },
        },
      }),
      prisma.order.findMany({
        where: { restaurantId },
        include: { table: { select: { name: true } }, items: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.menuItem.count({
        where: { restaurantId, isAvailable: true },
      }),
      prisma.staff.count({
        where: { restaurantId, isActive: true },
      }),
      prisma.order.findMany({
        where: {
          restaurantId,
          status: { in: ["NEW", "PREPARING", "READY"] },
          createdAt: { gte: todayStart },
        },
        distinct: ["tableId"],
        select: { tableId: true },
      }),
    ]);

    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 }
      );
    }

    const todayRevenue = todayOrders.reduce(
      (sum, order) => sum + order.totalAmount,
      0
    );
    const todayOrdersCount = todayOrders.length;

    const yesterdayRevenue = yesterdayOrders.reduce(
      (sum, order) => sum + order.totalAmount,
      0
    );
    const yesterdayOrdersCount = yesterdayOrders.length;

    // Percentage changes
    const revenueChange =
      yesterdayRevenue > 0
        ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
        : 0;
    const ordersChange =
      yesterdayOrdersCount > 0
        ? ((todayOrdersCount - yesterdayOrdersCount) / yesterdayOrdersCount) *
          100
        : 0;

    // Tables
    const totalTables = restaurant.locations.reduce(
      (sum, location) => sum + location.tables.length,
      0
    );

    const occupiedTables = occupiedTablesResult.length;

    // Trial days left
    let trialDaysLeft = 0;
    if (
      restaurant.subscription?.status === SubscriptionStatus.TRIALING &&
      restaurant.subscription.trialEndsAt
    ) {
      trialDaysLeft = differenceInDays(
        restaurant.subscription.trialEndsAt,
        new Date()
      );
      if (trialDaysLeft < 0) trialDaysLeft = 0;
    }

    // Restaurant open status
    const currentDay = today
      .toLocaleDateString("en-US", { weekday: "long" })
      .toLowerCase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const operatingHours = restaurant.operatingHours as Record<
      string,
      any
    > | null;
    let restaurantOpen = false;

    if (operatingHours && operatingHours[currentDay]) {
      const dayHours = operatingHours[currentDay];
      if (dayHours.isOpen) {
        const currentTime = today.getHours() * 60 + today.getMinutes();
        const [openHours, openMinutes] = dayHours.open.split(":").map(Number);
        const [closeHours, closeMinutes] = dayHours.close
          .split(":")
          .map(Number);
        const openTime = openHours * 60 + openMinutes;
        const closeTime = closeHours * 60 + closeMinutes;
        restaurantOpen =
          currentTime >= openTime && currentTime <= closeTime;
      }
    }

    return NextResponse.json({
      todayRevenue,
      todayOrders: todayOrdersCount,
      activeOrders,
      totalTables,
      occupiedTables,
      recentOrders,
      lowStockAlert: false,
      trialDaysLeft,
      revenueChange,
      ordersChange,
      totalMenuItems,
      totalStaff,
      restaurantOpen,
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}