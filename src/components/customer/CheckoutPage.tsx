"use client";

import { useEffect, useState } from "react";
import { useCartStore } from "@/store/cartStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
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
}: {
  slug: string;
  tableToken: string;
  tableName: string;
  restaurantId: string;
  restaurantName: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const { items, getTotalPrice, clearCart } = useCartStore();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const total = mounted ? getTotalPrice() : 0;
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
          menuItemId: i.id,
          quantity: i.quantity,
          price: i.price,
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
            toast.success("Order placed successfully!");
            router.push(
              `/${slug}/${tableToken}/order-status?orderId=${data.orderId}`
            );
          } catch {
            toast.error("Payment verification failed");
          }
        },
        prefill: {
          name,
          contact: phone,
        },
        theme: { color: "#f97316" },
        modal: {
          ondismiss: () => setLoading(false),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      toast.error("Failed to create order");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <div className="bg-white sticky top-0 z-10 px-4 py-4 flex items-center gap-3 shadow-sm">
        <button onClick={() => router.back()} className="p-2 -ml-2">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="font-bold text-lg">Checkout</h1>
          <p className="text-sm text-gray-500">Table: {tableName}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Order Summary */}
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-2">
          <h2 className="font-semibold text-gray-700">Order Summary</h2>
          {cartItems.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span>{item.name} × {item.quantity}</span>
              <span>₹{item.price * item.quantity}</span>
            </div>
          ))}
          <div className="border-t pt-2 flex justify-between font-bold">
            <span>Total</span>
            <span>₹{total}</span>
          </div>
        </div>

        {/* Customer Details */}
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-700">
            Your Details (optional)
          </h2>
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="h-12 text-base"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Your phone number"
              type="tel"
              className="h-12 text-base"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">Special Instructions</Label>
            <Input
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Any special requests..."
              className="h-12 text-base"
            />
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-40">
        <Button
          className="w-full max-w-2xl mx-auto py-4 text-lg rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/30"
          onClick={handleCheckout}
          disabled={loading || cartItems.length === 0}
        >
          {loading ? "Processing..." : `Pay ₹${total}`}
        </Button>
      </div>
    </div>
  );
}