import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export default async function AdminPage() {
  const { userId } = await auth();
  if (!userId) notFound();

  const dbUser = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  const isSuperAdmin = 
    dbUser?.email === "superadmin@serveaura.com" || 
    (process.env.SUPERADMIN_ID && dbUser?.clerkId === process.env.SUPERADMIN_ID);

  if (isSuperAdmin) {
    redirect("/superadmin");
  }

  notFound();
}
