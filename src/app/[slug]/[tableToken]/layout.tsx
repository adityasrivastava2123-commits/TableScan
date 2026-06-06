import type { Metadata } from "next";
import { Poppins } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-poppins",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Order Food | Serveaura",
  description: "Scan, browse and order food right from your table.",
};

export default function CustomerMenuLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${poppins.variable}`}
      style={{ fontFamily: "var(--font-poppins), 'Poppins', sans-serif" }}
    >
      {children}
    </div>
  );
}
