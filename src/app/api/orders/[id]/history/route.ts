import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      select: { restaurantId: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const logs = await prisma.auditLog.findMany({
      where: {
        restaurantId: order.restaurantId,
        action: "ORDER_EDITED",
        details: {
          contains: params.id,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Failed to fetch order history:", error);
    return NextResponse.json({ error: "Failed to fetch order history" }, { status: 500 });
  }
}
