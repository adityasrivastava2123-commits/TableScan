import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { OnboardingForm } from "./OnboardingForm";

export default async function OnboardingPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const dbUser = await prisma.user.findUnique({
    where: { clerkId: user.id },
    include: { restaurants: true },
  });

  if (dbUser && dbUser.restaurants.length > 0) {
    redirect("/dashboard");
  }

  return <OnboardingForm />;
}

