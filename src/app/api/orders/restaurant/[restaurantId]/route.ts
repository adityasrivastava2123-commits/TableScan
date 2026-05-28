import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const statusValues = new Set(Object.values(OrderStatus));

export async function GET(
  request: Request,
  { params }: { params: { restaurantId: string } },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");
  const statuses = statusParam
    ? statusParam
        .split(",")
        .map((status) => status.trim())
        .filter(Boolean)
    : [];

  if (statuses.some((status) => !statusValues.has(status as OrderStatus))) {
    return NextResponse.json({ error: "Invalid status filter" }, { status: 400 });
  }

  try {
    const orders = await prisma.order.findMany({
      where: {
        restaurantId: params.restaurantId,
        ...(statuses.length > 0
          ? { status: { in: statuses as OrderStatus[] } }
          : {}),
      },
      include: {
        items: {
          include: {
            menuItem: {
              select: {
                name: true,
              },
            },
          },
        },
        table: true,
        payment: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch restaurant orders" },
      { status: 500 },
    );
  }
}

