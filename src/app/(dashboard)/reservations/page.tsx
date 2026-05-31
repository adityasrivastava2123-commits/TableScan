import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import ReservationBooking from "@/components/reservations/ReservationBooking";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reservations - TableScan",
  description: "Manage table reservations and bookings",
};

export default async function ReservationsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const dbUser = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: {
      restaurants: {
        include: { locations: { take: 1 } },
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
  });

  const restaurant = dbUser?.restaurants?.[0];
  const location = restaurant?.locations?.[0];

  if (!restaurant) redirect("/onboarding");

  if (!location) {
    return (
      <div className="p-6 text-center text-[#555555]">
        No location found. Please complete onboarding.
      </div>
    );
  }

  return (
    <div className="w-full">
      <ReservationBooking restaurantId={restaurant.id} locationId={location.id} />
    </div>
  );
}
