import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import CustomersDashboard from "@/components/customers/CustomersDashboard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Customers CRM - TableScan",
  description: "View customer profiles, spend data, loyalty groups, and visit timelines",
};

export default async function CustomersPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const dbUser = await prisma.user.findUnique({
    where: { clerkId: user.id },
    include: { restaurants: { orderBy: { createdAt: "asc" }, take: 1 } },
  });

  const restaurant = dbUser?.restaurants?.[0];
  if (!restaurant) redirect("/onboarding");

  return (
    <div className="w-full">
      <CustomersDashboard restaurant={restaurant} />
    </div>
  );
}
