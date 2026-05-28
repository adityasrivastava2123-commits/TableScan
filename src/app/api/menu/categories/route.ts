import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = 'force-dynamic';

const categorySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  restaurantId: z.string(),
});

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get("restaurantId");

    if (!restaurantId) return NextResponse.json({ error: "restaurantId required" }, { status: 400 });

    const categories = await prisma.category.findMany({
      where: { restaurantId },
      include: { menuItems: true },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(categories);
  } catch {
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = categorySchema.parse(body);

    const category = await prisma.category.create({
      data: {
        name: parsed.name,
        description: parsed.description,
        restaurantId: parsed.restaurantId,
      },
    });

    return NextResponse.json(category);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}