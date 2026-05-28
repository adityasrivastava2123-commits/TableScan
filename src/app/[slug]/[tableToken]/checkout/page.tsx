import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import CheckoutPage from "@/components/customer/CheckoutPage";

export default async function Checkout({
  params,
}: {
  params: { slug: string; tableToken: string };
}) {
  const table = await prisma.table.findUnique({
    where: { qrToken: params.tableToken },
    include: { location: { include: { restaurant: true } } },
  });

  if (!table) notFound();

  const restaurant = table.location.restaurant;

  return (
    <CheckoutPage
      slug={params.slug}
      tableToken={params.tableToken}
      tableName={table.name}
      restaurantId={restaurant.id}
      restaurantName={restaurant.name}
    />
  );
}