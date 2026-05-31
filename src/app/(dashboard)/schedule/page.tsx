import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import StaffScheduling from "@/components/staff/StaffScheduling";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Schedule - TableScan",
  description: "Manage staff shifts and schedules",
};

export default async function SchedulePage() {
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
      <StaffScheduling restaurantId={restaurant.id} />
    </div>
  );
}
