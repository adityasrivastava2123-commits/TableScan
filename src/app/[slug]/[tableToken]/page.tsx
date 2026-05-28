import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import CustomerMenu from "@/components/customer/CustomerMenu";

interface Props {
  params: {
    slug: string;
    tableToken: string;
  };
}

export default async function CustomerMenuPage({ params }: Props) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug: params.slug },
    include: {
      categories: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        include: {
          menuItems: {
            where: { isAvailable: true },
            orderBy: { sortOrder: "asc" },
            include: { variants: true },
          },
        },
      },
    },
  });

  if (!restaurant) notFound();

  const table = await prisma.table.findUnique({
    where: { qrToken: params.tableToken },
  });

  if (!table) notFound();

  return (
    <CustomerMenu
      restaurant={restaurant}
      table={table}
      slug={params.slug}
      tableToken={params.tableToken}
    />
  );
}