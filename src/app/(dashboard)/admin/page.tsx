import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import DeveloperConsole from "@/components/admin/DeveloperConsole";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Superadmin Control Center - TableScan",
  description: "Global SaaS developer console and metrics dashboard",
};

export default async function AdminPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <div className="w-full">
      <DeveloperConsole />
    </div>
  );
}
