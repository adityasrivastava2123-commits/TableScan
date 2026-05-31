"use client";

import { useEffect, useState } from "react";
import { useCartStore } from "@/store/cartStore";
import { ArrowLeft, ChevronRight, User, Phone, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import axios from "axios";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any;
  }
}

export default function CheckoutPage({
  slug,
  tableToken,
  tableName,
  restaurantId,
  restaurantName,
  taxPercent = 0,
}: {
  slug: string;
  tableToken: string;
  tableName: string;
  restaurantId: string;
  restaurantName: string;
  taxPercent?: number;
}) {
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const { items, getTotalPrice, clearCart } = useCartStore();
  const router = useRouter();

  useEffect(() => { setMounted(true); }, []);

  const subtotal = mounted ? getTotalPrice() : 0;
  const taxAmount = subtotal * (taxPercent / 100);
  const total = subtotal + taxAmount;
  const cartItems = mounted ? items : [];

  function loadRazorpayScript(): Promise<boolean> {
    return new Promise((resolve) => {
      if (window.Razorpay) { resolve(true); return; }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  async function handleCheckout() {
    if (cartItems.length === 0) return;
    setLoading(true);

    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error("Failed to load payment gateway");
        setLoading(false);
        return;
      }

      const { data } = await axios.post("/api/orders", {
        tableToken,
        restaurantId,
        customerName: name,
        customerPhone: phone,
        specialNote: note,
        items: cartItems.map((i) => ({
          menuItemId: i.id.includes("-") ? i.id.split("-")[0] : i.id,
          quantity: i.quantity,
          price: i.price,
          note: i.note,
        })),
      });

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: data.amount,
        currency: data.currency,
        name: restaurantName,
        description: `Order at ${tableName}`,
        order_id: data.razorpayOrderId,
        handler: async (response: unknown) => {
          try {
            await axios.post("/api/orders/verify", {
              razorpayOrderId: (response as any).razorpay_order_id,
              razorpayPaymentId: (response as any).razorpay_payment_id,
              razorpaySignature: (response as any).razorpay_signature,
              orderId: data.orderId,
            });
            clearCart();
            toast.success("Order placed!", {
              style: { background: "#ffffff", color: "#1a1a1a", border: "1px solid rgba(255,255,255,0.07)" },
            });
            router.push(`/${slug}/${tableToken}/order-status?orderId=${data.orderId}`);
          } catch {
            toast.error("Payment verification failed");
          }
        },
        prefill: { name, contact: phone },
        theme: { color: "#f97316" },
        modal: { ondismiss: () => setLoading(false) },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error: any) {
      console.error("Checkout error:", error);
      const errMsg = error.response?.data?.details || error.response?.data?.error || "Failed to create order";
      toast.error(errMsg);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f5f0] pb-32">
      {/* Header */}
      <div className="bg-[#f5f5f0]/90 backdrop-blur-xl border-b border-[#e8e8e3] sticky top-0 z-10 px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 -ml-2 text-[#6b6b6b] hover:text-[#f97316] transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-bold text-[15px] text-[#1a1a1a]">Checkout</h1>
          <p className="text-[11px] text-[#9a9a9a]">Table: {tableName}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {/* Order Summary */}
        <div className="bg-white border border-[#e8e8e3] rounded-xl p-4">
          <p className="text-[12px] font-semibold text-[#9a9a9a] uppercase tracking-wider mb-3">Order Summary</p>
          <div className="space-y-2 mb-3">
            {cartItems.map((item) => (
              <div key={item.id} className="flex justify-between text-[13px]">
                <span className="text-[#6b6b6b]">{item.name} × {item.quantity}</span>
                <span className="text-[#1a1a1a] font-medium">₹{(item.price * item.quantity).toFixed(0)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-[#e5e5e0] pt-2.5 space-y-1.5">
            <div className="flex justify-between text-[13px]">
              <span className="text-[#6b6b6b]">Subtotal</span>
              <span className="text-[#1a1a1a]">₹{subtotal.toFixed(0)}</span>
            </div>
            {taxPercent > 0 && (
              <div className="flex justify-between text-[13px]">
                <span className="text-[#6b6b6b]">GST ({taxPercent}%)</span>
                <span className="text-[#1a1a1a]">₹{taxAmount.toFixed(0)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-[15px] pt-1">
              <span className="text-[#1a1a1a]">Total</span>
              <span className="text-[#f97316]">₹{total.toFixed(0)}</span>
            </div>
          </div>
        </div>

        {/* Customer Details */}
        <div className="bg-white border border-[#e8e8e3] rounded-xl p-4 space-y-3">
          <p className="text-[12px] font-semibold text-[#9a9a9a] uppercase tracking-wider">Your Details <span className="normal-case font-normal text-[#9a9a9a]">(optional)</span></p>

          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9a9a9a]" />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full bg-[#f0f0eb] border border-[#e5e5e0] rounded-xl pl-9 pr-4 py-2.5 text-[13px] text-[#1a1a1a] placeholder-[#b0b0b0] focus:outline-none focus:border-[#f97316] transition-colors"
            />
          </div>

          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9a9a9a]" />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number"
              type="tel"
              className="w-full bg-[#f0f0eb] border border-[#e5e5e0] rounded-xl pl-9 pr-4 py-2.5 text-[13px] text-[#1a1a1a] placeholder-[#b0b0b0] focus:outline-none focus:border-[#f97316] transition-colors"
            />
          </div>

          <div className="relative">
            <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-[#9a9a9a]" />
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Any special requests for the whole order..."
              rows={2}
              className="w-full bg-[#f0f0eb] border border-[#e5e5e0] rounded-xl pl-9 pr-4 py-2.5 text-[13px] text-[#1a1a1a] placeholder-[#b0b0b0] focus:outline-none focus:border-[#f97316] transition-colors resize-none"
            />
          </div>
        </div>
      </div>

      {/* Pay button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 z-40 bg-[#f5f5f0]/80 backdrop-blur-xl border-t border-[#e8e8e3]">
        <button
          className="w-full max-w-2xl mx-auto flex items-center justify-between bg-[#f97316] hover:bg-[#ea6c0a] disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-3.5 rounded-2xl shadow-2xl shadow-[#f97316]/30 transition-colors"
          onClick={handleCheckout}
          disabled={loading || cartItems.length === 0}
        >
          <span className="font-semibold text-[14px]">
            {loading ? "Processing..." : "Pay Now"}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[15px]">₹{total.toFixed(0)}</span>
            {!loading && <ChevronRight className="w-4 h-4" />}
          </div>
        </button>
      </div>
    </div>
  );
}
