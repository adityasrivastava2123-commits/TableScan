import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import SettingsForm from "@/components/dashboard/SettingsForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings - TableScan",
  description: "Manage your restaurant settings",
};

export default async function SettingsPage() {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-800 dark:text-white">Settings</h1>
        <p className="text-neutral-500 dark:text-[#999999]">Manage your restaurant settings</p>
      </div>
      <SettingsForm restaurant={restaurant} />
    </div>
  );
}
