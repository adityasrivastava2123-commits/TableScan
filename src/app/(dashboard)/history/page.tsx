import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { OrderHistoryTable } from "@/components/dashboard/OrderHistoryTable";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Order History - TableScan",
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
        <h1 className="text-2xl font-semibold">Order History</h1>
        <p className="text-sm text-muted-foreground">
          Browse, filter, and export past orders.
        </p>
      </div>
      <OrderHistoryTable restaurantId={restaurant.id} />
    </div>
  );
}
