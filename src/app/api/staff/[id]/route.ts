import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const updateStaffSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(["ADMIN", "MANAGER", "WAITER", "KITCHEN"]).optional(),
  isActive: z.boolean().optional(),
});

async function getAuthorizedContext(userId: string, staffId: string) {
  const dbUser = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!dbUser) return { error: "User not found", status: 404 as const };

  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    include: {
      restaurant: true,
    },
  });

  if (!staff) return { error: "Staff member not found", status: 404 as const };

  if (staff.restaurant.ownerId !== dbUser.id) {
    return { error: "Forbidden", status: 403 as const };
  }

  return { dbUser, staff };
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const context = await getAuthorizedContext(userId, params.id);
  if ("error" in context) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  const body = await request.json();
  const parsed = updateStaffSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updates = parsed.data;

  const updated = await prisma.staff.update({
    where: { id: params.id },
    data: {
      ...(updates.name ? { name: updates.name } : {}),
      ...(updates.role ? { role: updates.role as Role } : {}),
      ...(typeof updates.isActive === "boolean"
        ? { isActive: updates.isActive }
        : {}),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const context = await getAuthorizedContext(userId, params.id);
  if ("error" in context) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  const clerkUser = await currentUser();
  const currentEmail = clerkUser?.emailAddresses?.[0]?.emailAddress?.toLowerCase();
  if (currentEmail && context.staff.email.toLowerCase() === currentEmail) {
    return NextResponse.json(
      { error: "You cannot delete your own staff account." },
      { status: 400 },
    );
  }

  await prisma.staff.delete({
    where: { id: params.id },
  });

  return NextResponse.json({ success: true });
}

