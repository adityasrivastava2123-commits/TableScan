import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import StaffScheduling from "@/components/staff/StaffScheduling";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Schedule - Serveaura",
  description: "Manage staff shifts and schedules",
};

export default async function SchedulePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const dbUser = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { restaurants: { orderBy: { createdAt: "asc" }, take: 1 } },
  });

  const restaurant = dbUser?.restaurants?.[0];
  if (!restaurant) redirect("/onboarding");

  return (
    <div className="w-full">
      <StaffScheduling restaurantId={restaurant.id} restaurant={restaurant} />
    </div>
  );
}
