import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import CartPage from "@/components/customer/CartPage";

export default async function Cart({
  params,
}: {
  params: { slug: string; tableToken: string };
}) {
  const table = await prisma.table.findUnique({
    where: { qrToken: params.tableToken },
  });

  if (!table) notFound();

  return (
    <CartPage
      slug={params.slug}
      tableToken={params.tableToken}
      tableName={table.name}
    />
  );
}