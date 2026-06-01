import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import SupportChatsManagement from "@/components/support/SupportChatsManagement";

export default async function SupportChatsPage() {
  const { userId } = await auth();

  if (!userId) {
    return <div className="p-7 text-[#9a9488]">Please sign in to view the support desk.</div>;
  }

  const dbUser = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: {
      restaurants: {
        take: 1,
      },
    },
  });

  const restaurant = dbUser?.restaurants?.[0];

  if (!restaurant) {
    return <div className="p-7 text-[#9a9488]">No restaurant profile found.</div>;
  }

  return (
    <div className="w-full">
      <SupportChatsManagement restaurantId={restaurant.id} />
    </div>
  );
}
