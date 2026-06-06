import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import ForecastingDashboard from "@/components/dashboard/ForecastingDashboard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Forecasting - Serveaura",
  description: "AI-powered sales and demand forecasting for your restaurant",
};

export default async function ForecastingPage() {
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

  return <ForecastingDashboard restaurant={restaurant} />;
}
