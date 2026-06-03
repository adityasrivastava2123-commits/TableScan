import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { ReportsDashboard } from "@/components/dashboard/ReportsDashboard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reports - TableScan",
  description: "Revenue and order performance insights",
};

export default async function ReportsPage() {
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
    <div className="w-full">
      <ReportsDashboard restaurantId={restaurant.id} restaurant={restaurant} />
    </div>
  );
}
