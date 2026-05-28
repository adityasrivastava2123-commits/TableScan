import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { KitchenDisplay } from "@/components/orders/KitchenDisplay";

export default async function KitchenPage() {
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

  return (
    <KitchenDisplay
      restaurantId={restaurant.id}
      restaurantName={restaurant.name}
    />
  );
}

