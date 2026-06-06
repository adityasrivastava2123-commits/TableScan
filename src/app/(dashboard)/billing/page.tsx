import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Billing - Serveaura",
  description: "Manage your subscription and billing",
};

export default function BillingPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-white">Billing</h1>
        <p className="text-sm text-[#999999]">Manage your subscription and billing</p>
      </div>
      <div className="text-center py-16 text-[#555555]">
        <p>Billing page coming soon</p>
      </div>
    </div>
  );
}
