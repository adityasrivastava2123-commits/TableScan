import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { z } from "zod";
import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { generateSlug } from "@/lib/utils";
import { Plan, SubscriptionStatus } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";



const OnboardingSchema = z.object({
  restaurantName: z.string().min(1),
  description: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  logo: z.string().nullable().optional(),
  locationName: z.string().min(1),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  plan: z.enum(["STARTER", "GROWTH", "PRO"]),
});

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json();

  const parsed = OnboardingSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;

  let user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user) {
    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses?.[0]?.emailAddress;

    if (!clerkUser || !email) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const name = [clerkUser.firstName, clerkUser.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

    user = await prisma.user.upsert({
      where: { clerkId: userId },
      update: {
        email,
        name: name || null,
      },
      create: {
        clerkId: userId,
        email,
        name: name || null,
      },
    });
  }

  try {
    const restaurant = await prisma.restaurant.create({
      data: {
        name: data.restaurantName,
        slug: generateSlug(data.restaurantName),
        description: data.description ?? undefined,
        phone: data.phone ?? undefined,
        logo: data.logo ?? undefined,
        ownerId: user.id,
        locations: {
          create: {
            name: data.locationName,
            address: data.address ?? undefined,
            city: data.city ?? undefined,
            state: data.state ?? undefined,
          },
        },
        subscription: {
          create: {
            plan: data.plan as Plan,
            status: SubscriptionStatus.TRIALING,
            trialEndsAt: addDays(new Date(), 30),
          },
        },
      },
    });

    return NextResponse.json({ slug: restaurant.slug });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to complete onboarding",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

