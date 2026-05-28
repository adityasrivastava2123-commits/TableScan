import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const itemSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().min(0),
  image: z.string().optional(),
  isVeg: z.boolean().default(true),
  categoryId: z.string(),
  restaurantId: z.string(),
  tags: z.array(z.string()).optional(),
});

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get("restaurantId");

    if (!restaurantId) return NextResponse.json({ error: "restaurantId required" }, { status: 400 });

    const items = await prisma.menuItem.findMany({
      where: { restaurantId },
      include: { category: true, variants: true },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch items" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = itemSchema.parse(body);

    const item = await prisma.menuItem.create({
      data: {
        name: parsed.name,
        description: parsed.description,
        price: parsed.price,
        image: parsed.image,
        isVeg: parsed.isVeg,
        categoryId: parsed.categoryId,
        restaurantId: parsed.restaurantId,
        tags: parsed.tags ?? [],
      },
      include: { category: true, variants: true },
    });

    return NextResponse.json(item);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create item" }, { status: 500 });
  }
}