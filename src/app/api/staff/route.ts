import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

const createStaffSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format"),
  role: z.enum(["ADMIN", "MANAGER", "WAITER", "KITCHEN"]),
  restaurantId: z.string().min(1),
});

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get("restaurantId");

  if (!restaurantId) {
    return NextResponse.json({ error: "restaurantId is required" }, { status: 400 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const restaurant = await prisma.restaurant.findFirst({
    where: {
      id: restaurantId,
      ownerId: dbUser.id,
    },
  });

  if (!restaurant) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const staff = await prisma.staff.findMany({
    where: { restaurantId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(staff);
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = createStaffSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { name, email, role, restaurantId } = parsed.data;

  const restaurant = await prisma.restaurant.findFirst({
    where: {
      id: restaurantId,
      ownerId: dbUser.id,
    },
  });

  if (!restaurant) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.staff.findFirst({
    where: {
      restaurantId,
      email: email.toLowerCase(),
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "A staff member with this email already exists." },
      { status: 409 },
    );
  }

  const staff = await prisma.staff.create({
    data: {
      name,
      email: email.toLowerCase(),
      role: role as Role,
      restaurantId,
    },
  });

  return NextResponse.json(staff, { status: 201 });
}

