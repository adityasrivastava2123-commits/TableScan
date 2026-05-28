import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { StaffManager } from "@/components/dashboard/StaffManager";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Staff - TableScan",
  description: "Manage your restaurant staff accounts",
};

export default async function StaffPage() {
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
      <StaffManager restaurantId={restaurant.id} />
    </div>
  );
}
