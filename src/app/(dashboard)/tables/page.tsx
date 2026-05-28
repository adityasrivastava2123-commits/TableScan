import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import TableManager from "@/components/dashboard/TableManager";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tables - TableScan",
  description: "Manage your restaurant tables and QR codes",
};

export default async function TablesPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: {
      restaurants: {
        include: { locations: true },
      },
    },
  });

  if (!user || user.restaurants.length === 0) redirect("/onboarding");

  const restaurant = user.restaurants[0];
  const location = restaurant.locations[0];

  if (!location) {
    return (
      <div className="p-6 text-center text-gray-500">
        No location found. Please complete onboarding.
      </div>
    );
  }

  return (
    <TableManager
      locationId={location.id}
      restaurantSlug={restaurant.slug}
    />
  );
}