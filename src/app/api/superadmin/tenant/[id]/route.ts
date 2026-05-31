import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

async function checkAuth() {
  const cookieStore = await cookies();
  return !!cookieStore.get("sa_token")?.value;
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkAuth())) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;

  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      include: {
        owner: { select: { name: true, email: true, createdAt: true } },
        locations: { select: { id: true, name: true } },
        subscription: { select: { plan: true, status: true, createdAt: true } },
        orders: {
          take: 6,
          orderBy: { createdAt: "desc" },
          select: { id: true, totalAmount: true, status: true, createdAt: true },
        },
        _count: {
          select: { menuItems: true, orders: true, staff: true },
        },
      },
    });

    if (!restaurant) return new NextResponse("Not Found", { status: 404 });

    const totalRevenue = await prisma.order.aggregate({
      where: { restaurantId: id },
      _sum: { totalAmount: true },
    });

    return NextResponse.json({
      ...restaurant,
      totalRevenue: Number(totalRevenue._sum.totalAmount || 0),
    });
  } catch (err) {
    console.error(err);
    return new NextResponse("Server Error", { status: 500 });
  }
}
