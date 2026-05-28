import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { OrdersBoard } from "@/components/orders/OrdersBoard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Orders - TableScan",
  description: "Live orders board for your restaurant",
};

export default async function OrdersPage() {
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
        <h1 className="text-2xl font-semibold">Live Orders Board</h1>
        <p className="text-sm text-muted-foreground">
          Track and update orders in real time with 10-second polling.
        </p>
      </div>
      <OrdersBoard restaurantId={restaurant.id} />
    </div>
  );
}
