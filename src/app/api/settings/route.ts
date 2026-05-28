import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const operatingHoursSchema = z.object({
  open: z.string(),
  close: z.string(),
  isOpen: z.boolean(),
});

const settingsSchema = z.object({
  name: z.string().min(1, "Restaurant name is required"),
  description: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  notificationEmail: z.string().email().optional().or(z.literal("")),
  logo: z.string().optional(),
  taxPercent: z.number().min(0).max(30),
  theme: z.enum(["default", "warm", "fresh", "bold"]),
  operatingHours: z.record(z.string(), operatingHoursSchema),
});

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

    const restaurant = await prisma.restaurant.findFirst({
      where: {
        id: restaurantId,
        ownerId: userId,
      },
    });

    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    return NextResponse.json(restaurant);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = settingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { restaurantId, ...data } = body;

    if (!restaurantId) {
      return NextResponse.json({ error: "restaurantId required" }, { status: 400 });
    }

    const restaurant = await prisma.restaurant.findFirst({
      where: {
        id: restaurantId,
        ownerId: userId,
      },
    });

    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const updatedRestaurant = await prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        name: data.name,
        description: data.description || null,
        phone: data.phone || null,
        email: data.email || null,
        notificationEmail: data.notificationEmail || null,
        logo: data.logo || null,
        taxPercent: data.taxPercent,
        theme: data.theme,
        operatingHours: data.operatingHours,
      },
    });

    return NextResponse.json(updatedRestaurant);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
