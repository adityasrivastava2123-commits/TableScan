import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import DeliveryDashboard from "@/components/delivery/DeliveryDashboard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Delivery - TableScan",
  description: "Manage deliveries and drivers",
};

export default async function DeliveryPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const dbUser = await prisma.user.findUnique({
    where: { clerkId: user.id },
    include: { restaurants: { orderBy: { createdAt: "asc" }, take: 1 } },
  });

  const restaurant = dbUser?.restaurants?.[0];
  if (!restaurant) redirect("/onboarding");

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <DeliveryDashboard restaurantId={restaurant.id} />
    </div>
  );
}
