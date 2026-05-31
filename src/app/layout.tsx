import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "react-hot-toast";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
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
      <html lang="en" className={inter.variable}>
        <body className="min-h-screen antialiased font-sans">
          {children}
          <Toaster position="top-right" />
        </body>
      </html>
    </ClerkProvider>
  );
}
