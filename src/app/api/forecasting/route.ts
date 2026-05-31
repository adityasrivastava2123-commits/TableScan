import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay, subDays, format, getHours, getDay } from "date-fns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get("restaurantId");

    if (!restaurantId) {
      return NextResponse.json({ error: "restaurantId required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify ownership
    const restaurant = await prisma.restaurant.findFirst({
      where: { id: restaurantId, ownerId: user.id },
    });
    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const now = new Date();
    const thirtyDaysAgo = startOfDay(subDays(now, 30));

    // Fetch last 30 days of orders with items
    const orders = await prisma.order.findMany({
      where: {
        restaurantId,
        createdAt: { gte: thirtyDaysAgo },
        status: { not: "CANCELLED" },
      },
      include: {
        items: {
          include: { menuItem: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const hasEnoughData = orders.length >= 5;

    // ── Revenue by day (last 14 days actual + 3 day forecast) ──────────────
    const revenueByDay: Record<string, { revenue: number; orders: number; date: Date }> = {};
    for (let i = 13; i >= 0; i--) {
      const d = startOfDay(subDays(now, i));
      const key = format(d, "MMM d");
      revenueByDay[key] = { revenue: 0, orders: 0, date: d };
    }

    for (const order of orders) {
      const key = format(new Date(order.createdAt), "MMM d");
      if (revenueByDay[key]) {
        revenueByDay[key].revenue += order.totalAmount;
        revenueByDay[key].orders += 1;
      }
    }

    // Day-of-week averages for forecasting
    const dowRevenue: number[] = [0, 0, 0, 0, 0, 0, 0];
    const dowCount: number[] = [0, 0, 0, 0, 0, 0, 0];
    for (const order of orders) {
      const dow = getDay(new Date(order.createdAt));
      dowRevenue[dow] += order.totalAmount;
      dowCount[dow] += 1;
    }
    const dowAvgRevenue = dowRevenue.map((r, i) => (dowCount[i] > 0 ? r / dowCount[i] : 0));
    const dowAvgOrders = dowCount.map((c) => {
      const weeks = Math.max(1, Math.ceil(orders.length > 0 ? 30 / 7 : 1));
      return c / weeks;
    });

    // Build chart data: actual + forecast
    const chartData = Object.entries(revenueByDay).map(([dateStr, val]) => ({
      date: dateStr,
      actual: Math.round(val.revenue),
      orders: val.orders,
      forecast: null as number | null,
      forecastHigh: null as number | null,
      forecastLow: null as number | null,
    }));

    // Add 3 future forecast days
    for (let i = 1; i <= 3; i++) {
      const futureDate = subDays(now, -i);
      const dow = getDay(futureDate);
      const predicted = Math.round(dowAvgRevenue[dow] || 0);
      const variance = Math.round(predicted * 0.18);
      chartData.push({
        date: format(futureDate, "MMM d"),
        actual: null as any,
        orders: null as any,
        forecast: predicted,
        forecastHigh: predicted + variance,
        forecastLow: Math.max(0, predicted - variance),
      });
    }

    // ── Peak Hours Heatmap ─────────────────────────────────────────────────
    // 7 days × 24 hours grid
    const heatmap: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0));
    const heatmapCount: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0));

    for (const order of orders) {
      const d = new Date(order.createdAt);
      const dow = getDay(d);
      const hour = getHours(d);
      heatmap[dow][hour] += order.totalAmount;
      heatmapCount[dow][hour] += 1;
    }

    // Normalize to 0–100 scale
    const maxHeatVal = Math.max(1, ...heatmap.flat());
    const heatmapNormalized = heatmap.map((row) =>
      row.map((val) => Math.round((val / maxHeatVal) * 100))
    );

    // Find predicted busiest hour tomorrow
    const tomorrowDow = getDay(subDays(now, -1));
    const tomorrowHours = heatmap[tomorrowDow];
    const busiestHourIdx = tomorrowHours.indexOf(Math.max(...tomorrowHours));
    const busiestHour =
      busiestHourIdx === 0
        ? "12 AM"
        : busiestHourIdx < 12
        ? `${busiestHourIdx} AM`
        : busiestHourIdx === 12
        ? "12 PM"
        : `${busiestHourIdx - 12} PM`;

    // ── Top Item Demand Forecast ──────────────────────────────────────────
    const itemVelocity: Record<
      string,
      { name: string; recent7: number; prior7: number; total: number; revenue: number }
    > = {};

    const sevenDaysAgo = startOfDay(subDays(now, 7));
    const fourteenDaysAgo = startOfDay(subDays(now, 14));

    for (const order of orders) {
      const orderDate = new Date(order.createdAt);
      for (const item of order.items) {
        const name = item.menuItem?.name || "Unknown";
        if (!itemVelocity[name]) {
          itemVelocity[name] = { name, recent7: 0, prior7: 0, total: 0, revenue: 0 };
        }
        itemVelocity[name].total += item.quantity;
        itemVelocity[name].revenue += item.price * item.quantity;
        if (orderDate >= sevenDaysAgo) {
          itemVelocity[name].recent7 += item.quantity;
        } else if (orderDate >= fourteenDaysAgo) {
          itemVelocity[name].prior7 += item.quantity;
        }
      }
    }

    const topItems = Object.values(itemVelocity)
      .sort((a, b) => b.total - a.total)
      .slice(0, 6)
      .map((item) => {
        const trend =
          item.prior7 > 0
            ? ((item.recent7 - item.prior7) / item.prior7) * 100
            : item.recent7 > 0
            ? 100
            : 0;
        // Predict tomorrow: use recent7 daily average
        const predictedTomorrow = Math.round((item.recent7 / 7) * 1.05);
        return {
          name: item.name,
          total: item.total,
          recent7: item.recent7,
          revenue: Math.round(item.revenue),
          trend: Math.round(trend),
          predictedTomorrow,
        };
      });

    // ── KPI Predictions ──────────────────────────────────────────────────
    const tomorrowDowRevAvg = dowAvgRevenue[tomorrowDow];
    const tomorrowDowOrdAvg = dowAvgOrders[tomorrowDow];

    // Last 7 days revenue avg to scale the prediction
    const last7Revenue = Object.values(revenueByDay)
      .slice(-7)
      .reduce((s, v) => s + v.revenue, 0);
    const last7Avg = last7Revenue / 7;
    const scaledPrediction = last7Avg > 0 && tomorrowDowRevAvg > 0
      ? (tomorrowDowRevAvg + last7Avg) / 2
      : last7Avg || tomorrowDowRevAvg;

    const predictedRevenue = Math.round(scaledPrediction);
    const predictedOrders = Math.round(tomorrowDowOrdAvg || orders.length / 30);

    // Low stock risk: items with >20% velocity spike
    const lowStockRiskItems = topItems
      .filter((item) => item.trend > 20)
      .map((item) => item.name)
      .slice(0, 3);

    // ── AI Recommendations ─────────────────────────────────────────────
    const recommendations: Array<{
      type: "stock" | "staff" | "promo" | "timing" | "revenue";
      title: string;
      description: string;
      impact: "high" | "medium" | "low";
      icon: string;
    }> = [];

    // Recommendation 1: Stock alert for trending items
    if (lowStockRiskItems.length > 0) {
      recommendations.push({
        type: "stock",
        title: `Stock up on ${lowStockRiskItems[0]}`,
        description: `Demand for ${lowStockRiskItems[0]} has surged ${topItems.find(i => i.name === lowStockRiskItems[0])?.trend ?? 0}% in the last 7 days. Ensure adequate inventory before tomorrow's predicted peak.`,
        impact: "high",
        icon: "📦",
      });
    }

    // Recommendation 2: Staff scheduling
    if (busiestHourIdx > 0) {
      const startHour = busiestHourIdx > 1 ? busiestHourIdx - 1 : busiestHourIdx;
      const endHour = busiestHourIdx < 23 ? busiestHourIdx + 2 : busiestHourIdx;
      const startLabel = startHour < 12 ? `${startHour} AM` : `${startHour - 12} PM`;
      const endLabel = endHour < 12 ? `${endHour} AM` : `${endHour - 12} PM`;
      recommendations.push({
        type: "staff",
        title: `Schedule extra staff ${startLabel}–${endLabel} tomorrow`,
        description: `Historical data shows ${DAY_NAMES[tomorrowDow]} has its peak order volume around ${busiestHour}. Adding 1–2 extra servers during this window can reduce wait times significantly.`,
        impact: "high",
        icon: "👥",
      });
    }

    // Recommendation 3: Promote underperforming item with growth potential
    const growthItems = topItems.filter(item => item.trend > 5 && item.total < topItems[0]?.total * 0.4);
    if (growthItems.length > 0) {
      recommendations.push({
        type: "promo",
        title: `Promote ${growthItems[0].name} — rising trend`,
        description: `${growthItems[0].name} shows a ${growthItems[0].trend}% demand increase but is still underdiscovered. A featured placement or a combo offer could accelerate its growth.`,
        impact: "medium",
        icon: "🌟",
      });
    }

    // Recommendation 4: Revenue timing
    const weekendDow = [5, 6]; // Fri, Sat
    const weekendAvg = weekendDow.reduce((s, d) => s + (dowAvgRevenue[d] || 0), 0) / 2;
    const weekdayAvg = [1, 2, 3, 4].reduce((s, d) => s + (dowAvgRevenue[d] || 0), 0) / 4;
    if (weekendAvg > weekdayAvg * 1.3) {
      recommendations.push({
        type: "timing",
        title: "Weekend revenue 30%+ higher — plan accordingly",
        description: `Your Fri–Sat revenue averages ₹${Math.round(weekendAvg).toLocaleString("en-IN")} vs ₹${Math.round(weekdayAvg).toLocaleString("en-IN")} on weekdays. Consider weekend-only specials to further capitalize on this traffic.`,
        impact: "medium",
        icon: "📅",
      });
    }

    // Recommendation 5: Revenue target
    if (predictedRevenue > 0) {
      recommendations.push({
        type: "revenue",
        title: `Target ₹${Math.round(predictedRevenue * 1.1).toLocaleString("en-IN")} tomorrow`,
        description: `Base forecast is ₹${predictedRevenue.toLocaleString("en-IN")}. A 10% stretch goal is achievable by upselling desserts and beverages — typically worth ₹80–150 extra per table.`,
        impact: "medium",
        icon: "🎯",
      });
    }

    return NextResponse.json({
      hasEnoughData,
      totalOrdersAnalyzed: orders.length,
      kpis: {
        predictedRevenue,
        predictedOrders,
        busiestHour,
        lowStockRiskCount: lowStockRiskItems.length,
        lowStockRiskItems,
      },
      chartData,
      heatmap: {
        data: heatmapNormalized,
        days: DAY_NAMES,
        hours: Array.from({ length: 24 }, (_, i) =>
          i === 0 ? "12a" : i < 12 ? `${i}a` : i === 12 ? "12p" : `${i - 12}p`
        ),
      },
      topItems,
      recommendations,
    });
  } catch (error) {
    console.error("Forecasting API error:", error);
    return NextResponse.json({ error: "Failed to compute forecast" }, { status: 500 });
  }
}
