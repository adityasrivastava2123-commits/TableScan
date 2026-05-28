import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/dashboard/Sidebar";
import Breadcrumbs from "@/components/dashboard/Breadcrumbs";
import type { ReactNode } from "react";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
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
    <div className="flex h-screen bg-background">
      <Sidebar
        restaurant={restaurant}
        restaurantOpen={restaurantOpen}
        userName={user?.firstName || user?.emailAddresses?.[0]?.emailAddress || "User"}
        userImageUrl={user?.imageUrl}
        userEmail={user?.emailAddresses?.[0]?.emailAddress}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">
          <Breadcrumbs />
          {children}
        </main>
      </div>
    </div>
  );
}
