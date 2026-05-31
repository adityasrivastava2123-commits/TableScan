import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/dashboard/Sidebar";
import Breadcrumbs from "@/components/dashboard/Breadcrumbs";
import BroadcastBanner from "@/components/dashboard/BroadcastBanner";
import type { ReactNode } from "react";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const dbUser = await prisma.user.findUnique({
    where: { clerkId: userId },
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

  // Calculate restaurant open status
  const today = new Date();
  const currentDay = today.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
  const operatingHours = restaurant.operatingHours as Record<string, any> | null;
  let restaurantOpen = false;

  if (operatingHours && operatingHours[currentDay]) {
    const dayHours = operatingHours[currentDay];
    if (dayHours.isOpen) {
      const currentTime = today.getHours() * 60 + today.getMinutes();
      const [openHours, openMinutes] = dayHours.open.split(":").map(Number);
      const [closeHours, closeMinutes] = dayHours.close.split(":").map(Number);
      const openTime = openHours * 60 + openMinutes;
      const closeTime = closeHours * 60 + closeMinutes;
      restaurantOpen = currentTime >= openTime && currentTime <= closeTime;
    }
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#f9f9f6] dark:bg-[#0a0a0a] text-neutral-800 dark:text-[#f0ece4] overflow-hidden">
      <Sidebar
        restaurant={restaurant}
        restaurantOpen={restaurantOpen}
      />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <BroadcastBanner />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Breadcrumbs />
          {children}
        </main>
      </div>
    </div>
  );
}
