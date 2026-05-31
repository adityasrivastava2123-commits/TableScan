import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import TableServiceManagement from "@/components/table-service/TableServiceManagement";

export default async function TableServicePage() {
  const { userId } = await auth();

  if (!userId) {
    return <div>Please sign in</div>;
  }

  const dbUser = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: {
      restaurants: {
        include: {
          locations: {
            take: 1,
          },
        },
        take: 1,
      },
    },
  });

  const restaurant = dbUser?.restaurants?.[0];
  const location = restaurant?.locations?.[0];

  if (!restaurant || !location) {
    return <div>No restaurant or location found</div>;
  }

  return (
    <div className="w-full">
      <TableServiceManagement restaurantId={restaurant.id} locationId={location.id} />
    </div>
  );
}
