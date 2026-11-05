import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import { Sora } from "next/font/google";
import { AppProviders } from "./providers";
import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Serveaura",
  description: "QR-based restaurant ordering platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={sora.variable} suppressHydrationWarning>
      <body className="min-h-screen antialiased font-sans">
        <AppProviders
          publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? ""}
        >
          {children}
        </AppProviders>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
