"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export default function PrintQRPage() {
  const searchParams = useSearchParams();
  const slug = searchParams.get("slug");
  const token = searchParams.get("token");
  const name = searchParams.get("name");
  const [qrUrl, setQrUrl] = useState("");

  useEffect(() => {
    if (slug && token) {
      const url = `${window.location.origin}/${slug}/${token}`;
      QRCode.toDataURL(url, { width: 400, margin: 2 }).then(setQrUrl);
    }
  }, [slug, token]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="text-center space-y-4 print:shadow-none">
        <h1 className="text-2xl font-bold">TableScan</h1>
        <p className="text-gray-500">Scan to order</p>
        {qrUrl && <img src={qrUrl} alt="QR Code" className="w-64 h-64 mx-auto" />}
        <p className="text-xl font-semibold">{name}</p>
        <p className="text-sm text-gray-400">Scan the QR code to view menu & order</p>
      </div>
      <Button
        className="mt-8 gap-2 print:hidden"
        onClick={() => window.print()}
      >
        <Printer size={16} /> Print This Page
      </Button>
    </div>
  );
}