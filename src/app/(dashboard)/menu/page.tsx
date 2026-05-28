import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import MenuBuilder from "@/components/menu/MenuBuilder";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Menu Builder - TableScan",
  description: "Create and manage your restaurant's menu",
};

export default async function MenuPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { restaurants: true },
  });

  if (!user || user.restaurants.length === 0) redirect("/onboarding");

  const restaurant = user.restaurants[0];

  return <MenuBuilder restaurantId={restaurant.id} />;
}