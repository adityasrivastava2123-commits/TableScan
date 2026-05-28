import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: params.slug },
      include: {
        categories: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
          include: {
            menuItems: {
              where: { isAvailable: true },
              orderBy: { sortOrder: "asc" },
              include: { variants: true },
            },
          },
        },
      },
    });

    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    return NextResponse.json(restaurant);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch restaurant" }, { status: 500 });
  }
}