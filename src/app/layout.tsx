import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "react-hot-toast";
import { Sora } from "next/font/google";
import { ReactQueryProvider } from "@/lib/react-query-provider";
import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "TableScan",
  description: "QR-based restaurant ordering platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/onboarding"
    >
      <html lang="en" className={sora.variable} suppressHydrationWarning>
        <body className="min-h-screen antialiased font-sans">
          <ReactQueryProvider>
            {children}
          </ReactQueryProvider>
          <Toaster position="top-right" />
        </body>
      </html>
    </ClerkProvider>
  );
}
