import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

async function checkAuth() {
  const cookieStore = await cookies();
  return !!cookieStore.get("sa_token")?.value;
}

export async function GET() {
  if (!(await checkAuth())) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [orders, users, planCounts] = await Promise.all([
      prisma.order.findMany({
        where: { createdAt: { gte: sixMonthsAgo } },
        select: { createdAt: true, totalAmount: true },
      }),
      prisma.user.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { createdAt: true },
      }),
      prisma.subscription.groupBy({
        by: ["plan"],
        _count: { plan: true },
      }),
    ]);

    // Monthly revenue & order count (last 6 months)
    const monthly: { label: string; revenue: number; orders: number; year: number; month: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      monthly.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        label: d.toLocaleString("default", { month: "short" }),
        revenue: 0,
        orders: 0,
      });
    }

    orders.forEach((o) => {
      const d = new Date(o.createdAt);
      const bucket = monthly.find((m) => m.year === d.getFullYear() && m.month === d.getMonth());
      if (bucket) {
        bucket.revenue += Number(o.totalAmount || 0);
        bucket.orders += 1;
      }
    });

    // Daily signups (last 7 days)
    const daily: { label: string; count: number; date: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      daily.push({
        label: d.toLocaleDateString("default", { weekday: "short" }),
        date: d.toDateString(),
        count: 0,
      });
    }

    users.forEach((u) => {
      const d = new Date(u.createdAt).toDateString();
      const bucket = daily.find((day) => day.date === d);
      if (bucket) bucket.count += 1;
    });

    // Plan distribution
    const planMap: Record<string, number> = {};
    planCounts.forEach((p) => { planMap[p.plan] = p._count.plan; });

    return NextResponse.json({ monthly, daily, plans: planMap });
  } catch (err) {
    console.error(err);
    return new NextResponse("Server Error", { status: 500 });
  }
}
