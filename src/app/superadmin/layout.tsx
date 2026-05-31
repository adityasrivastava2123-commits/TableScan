import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Developer Portal — TableScan",
  description: "Superadmin control center",
  robots: { index: false, follow: false },
};

export default function SuperadminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#050505] text-[#f0ece4]">
      {children}
    </div>
  );
}
