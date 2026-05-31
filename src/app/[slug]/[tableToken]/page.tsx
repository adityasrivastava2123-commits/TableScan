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
    include: { location: true },
  });

  if (!table) notFound();

  // Fetch any active order for this table (for status tracker)
  const activeOrder = await prisma.order.findFirst({
    where: {
      tableId: table.id,
      status: { in: ["NEW", "PREPARING", "READY"] },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, orderNumber: true, status: true },
  });

  return (
    <CustomerMenu
      restaurant={restaurant}
      table={table}
      slug={params.slug}
      tableToken={params.tableToken}
      activeOrder={activeOrder}
    />
  );
}