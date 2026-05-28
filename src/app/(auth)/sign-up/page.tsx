import { SignUp } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export default async function SignUpPage() {
  const user = await currentUser();

  if (user) {
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: user.id },
      include: { restaurants: true },
    });

    if (dbUser && dbUser.restaurants.length > 0) {
      redirect("/dashboard");
    }

    redirect("/onboarding");
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <SignUp afterSignUpUrl="/onboarding" />
    </main>
  );
}
