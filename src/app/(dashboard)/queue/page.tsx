import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import QueueManagement from "@/components/queue/QueueManagement";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Queue - Serveaura",
  description: "Manage customer queue and waitlist",
};

export default async function QueuePage() {
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
      <QueueManagement restaurantId={restaurant.id} />
    </div>
  );
}
