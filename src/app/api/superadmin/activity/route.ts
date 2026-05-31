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
    const [orders, users] = await Promise.all([
      prisma.order.findMany({
        take: 20,
        orderBy: { createdAt: "desc" },
        include: { restaurant: { select: { name: true } } },
      }),
      prisma.user.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        select: { name: true, email: true, createdAt: true },
      }),
    ]);

    const events: Array<{
      id: string;
      type: string;
      title: string;
      description: string;
      time: string;
      badge?: string;
    }> = [];

    orders.forEach((o, i) => {
      events.push({
        id: `o-${i}`,
        type: "order",
        title: "New Order Placed",
        description: `${o.restaurant?.name || "Unknown"} — ₹${Number(o.totalAmount || 0).toFixed(0)}`,
        time: o.createdAt.toISOString(),
        badge: o.status,
      });
    });

    users.forEach((u, i) => {
      events.push({
        id: `u-${i}`,
        type: "signup",
        title: "New Business Signup",
        description: `${u.name || u.email} joined the platform`,
        time: u.createdAt.toISOString(),
      });
    });

    events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    return NextResponse.json({ events: events.slice(0, 30) });
  } catch (err) {
    console.error(err);
    return new NextResponse("Server Error", { status: 500 });
  }
}
