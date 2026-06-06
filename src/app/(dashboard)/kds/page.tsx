import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import KitchenDisplaySystem from "@/components/kds/KitchenDisplaySystem";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "KDS - Serveaura",
  description: "Kitchen Display System for order preparation",
};

export default async function KDSPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const dbUser = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { restaurants: { orderBy: { createdAt: "asc" }, take: 1 } },
  });

  const restaurant = dbUser?.restaurants?.[0];
  if (!restaurant) redirect("/onboarding");

  return (
    <div className="w-full">
      <KitchenDisplaySystem restaurantId={restaurant.id} />
    </div>
  );
}
