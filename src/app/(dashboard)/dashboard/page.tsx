import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import DashboardOverview from "@/components/dashboard/DashboardOverview";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard - TableScan",
  description: "View your restaurant's performance and recent orders",
};

export default async function DashboardPage() {
  const user = await currentUser();

  const dbUser = await prisma.user.findUnique({
    where: { clerkId: user?.id || "" },
    include: {
      restaurants: {
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
  });

  const restaurant = dbUser?.restaurants?.[0];

  if (!restaurant) {
    return null;
  }

  return (
    <DashboardOverview
      restaurant={restaurant}
      userName={user?.firstName || user?.emailAddresses?.[0]?.emailAddress || "User"}
    />
  );
}
