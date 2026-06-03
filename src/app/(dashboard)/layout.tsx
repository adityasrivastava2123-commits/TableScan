import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import AIAssistant from "@/components/dashboard/AIAssistant";
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
    <div className="flex flex-col md:flex-row h-screen bg-[#0b0a08] text-[#f5efe2] overflow-hidden relative">
      {/* ── Google Fonts & custom styles for all dashboard sub-pages ── */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400;1,600&family=JetBrains+Mono:wght@300;400;500;600;700&display=swap');
        .font-editorial {
          font-family: 'Cormorant Garamond', serif;
        }
        .font-mono-dashboard {
          font-family: 'JetBrains Mono', monospace;
        }
      `}} />

      {/* ── Ambient Background Glows ── */}
      <div className="pointer-events-none fixed top-[-100px] left-[-100px] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-[#e8923a]/10 to-transparent blur-[140px] z-0" />
      <div className="pointer-events-none fixed bottom-[-150px] right-[-100px] w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-[#b1421a]/8 to-transparent blur-[140px] z-0" />

      <Sidebar
        restaurant={restaurant}
        restaurantOpen={restaurantOpen}
      />
      <AIAssistant restaurant={restaurant} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 relative z-10">
        <BroadcastBanner />
        <Topbar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 relative">
          <Breadcrumbs />
          {children}
        </main>
      </div>
    </div>
  );
}
