import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import RoleDashboards from "@/components/dashboard/RoleDashboards";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Role Dashboards - Serveaura",
  description: "Role-specific restaurant dashboards for owners, cashiers, kitchen, and waiters",
};

export default async function RoleDashboardsPage() {
  const { userId } = await auth();

  const dbUser = await prisma.user.findUnique({
    where: { clerkId: userId || "" },
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

  return <RoleDashboards restaurant={restaurant} />;
}
