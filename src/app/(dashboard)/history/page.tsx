import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { OrderHistoryTable } from "@/components/dashboard/OrderHistoryTable";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Order History - Serveaura",
  description: "Browse, filter, and export past orders",
};

export default async function HistoryPage() {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const dbUser = await prisma.user.findUnique({
    where: { clerkId: user.id },
    include: {
      restaurants: {
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
  });

  const restaurant = dbUser?.restaurants?.[0];
  if (!restaurant) {
    redirect("/onboarding");
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-800 dark:text-white">Order History</h1>
        <p className="text-sm text-neutral-500 dark:text-[#999999]">
          Browse, filter, and export past orders.
        </p>
      </div>
      <OrderHistoryTable restaurantId={restaurant.id} />
    </div>
  );
}
