"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { ReactNode } from "react";
import { ReactQueryProvider } from "@/lib/react-query-provider";

export function AppProviders({
  children,
  publishableKey,
}: {
  children: ReactNode;
  publishableKey: string;
}) {
  const content = <ReactQueryProvider>{children}</ReactQueryProvider>;

  if (!publishableKey) {
    return content;
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/onboarding"
    >
      {content}
    </ClerkProvider>
  );
}
