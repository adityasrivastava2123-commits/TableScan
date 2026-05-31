import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import InventoryManagement from "@/components/inventory/InventoryManagement";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inventory - TableScan",
  description: "Manage ingredients, stock levels, and suppliers",
};

export default async function InventoryPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const dbUser = await prisma.user.findUnique({
    where: { clerkId: user.id },
    include: { restaurants: { orderBy: { createdAt: "asc" }, take: 1 } },
  });

  const restaurant = dbUser?.restaurants?.[0];
  if (!restaurant) redirect("/onboarding");

  return (
    <div className="w-full">
      <InventoryManagement restaurantId={restaurant.id} />
    </div>
  );
}
