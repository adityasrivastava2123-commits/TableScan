"use client";

import { useEffect, useState } from "react";
import { useCartStore } from "@/store/cartStore";
import { ArrowLeft, ChevronRight, User, Phone, MessageSquare, CreditCard, Banknote, ShieldCheck, Sparkles, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any;
  }
}

type PaymentMethod = "ONLINE" | "CASH";

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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("ONLINE");
  const [showBillDetails, setShowBillDetails] = useState(false);
  
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
      if (paymentMethod === "ONLINE") {
        const loaded = await loadRazorpayScript();
        if (!loaded) {
          toast.error("Failed to load payment gateway", {
            style: { background: "#13110e", color: "#f5efe2", border: "1px solid rgba(255,255,255,0.08)" }
          });
          setLoading(false);
          return;
        }

        const { data } = await axios.post("/api/orders", {
          tableToken,
          restaurantId,
          customerName: name,
          customerPhone: phone,
          specialNote: note,
          paymentMethod: "ONLINE",
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
                style: { background: "#13110e", color: "#f5efe2", border: "1px solid rgba(255,255,255,0.08)" },
              });
              router.push(`/${slug}/${tableToken}/order-status?orderId=${data.orderId}`);
            } catch {
              toast.error("Payment verification failed", {
                style: { background: "#13110e", color: "#f5efe2", border: "1px solid rgba(255,255,255,0.08)" }
              });
              setLoading(false);
            }
          },
          prefill: { name, contact: phone },
          theme: { color: "#f0a040" },
          modal: { ondismiss: () => setLoading(false) },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        // CASH Payment option
        const { data } = await axios.post("/api/orders", {
          tableToken,
          restaurantId,
          customerName: name,
          customerPhone: phone,
          specialNote: note,
          paymentMethod: "CASH",
          items: cartItems.map((i) => ({
            menuItemId: i.id.includes("-") ? i.id.split("-")[0] : i.id,
            quantity: i.quantity,
            price: i.price,
            note: i.note,
          })),
        });

        clearCart();
        toast.success("Order placed! Pay at counter.", {
          icon: "🪙",
          style: { background: "#13110e", color: "#f5efe2", border: "1px solid rgba(255,255,255,0.08)" },
        });
        router.push(`/${slug}/${tableToken}/order-status?orderId=${data.orderId}`);
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      const errMsg = error.response?.data?.details || error.response?.data?.error || "Failed to create order";
      toast.error(errMsg, {
        style: { background: "#13110e", color: "#f5efe2", border: "1px solid rgba(255,255,255,0.08)" }
      });
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0b0a08] text-[#f5efe2] pb-32 font-sans">
      {/* Processing Loader */}
      <AnimatePresence>
        {loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex flex-col items-center justify-center gap-4 text-white"
          >
            <div className="w-16 h-16 rounded-full border-4 border-[#f0a040]/30 border-t-[#f0a040] animate-spin" />
            <div className="text-center space-y-1">
              <h3 className="font-bold text-lg">Contacting secure servers...</h3>
              <p className="text-sm text-[#f5efe2]/60">Please do not refresh or close this tab.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="bg-[#0b0a08]/85 backdrop-blur-md border-b border-white/[0.06] sticky top-0 z-10 px-4 py-4 flex items-center gap-3">
        <motion.button 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => router.back()} 
          className="p-2 -ml-2 text-[#f5efe2]/60 hover:text-[#f0a040] transition-colors rounded-full hover:bg-white/5 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </motion.button>
        <div>
          <h1 className="font-extrabold text-lg text-white tracking-tight flex items-center gap-1.5">
            Secure Checkout <Sparkles className="w-4 h-4 text-[#f0a040]" />
          </h1>
          <p className="text-[11px] text-[#f5efe2]/60">Table: {tableName} · {restaurantName}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Stepper progress indicator */}
        <div className="flex items-center justify-between px-2 py-1 text-[11px] font-bold text-[#f5efe2]/40 uppercase tracking-widest border-b border-white/[0.06] pb-4">
          <span className="text-[#f5efe2]/60">1. Cart</span>
          <span className="text-[#f5efe2]/40">➔</span>
          <span className="text-[#f0a040] border-b-2 border-[#f0a040] pb-1">2. Checkout</span>
          <span className="text-[#f5efe2]/40">➔</span>
          <span className="text-[#f5efe2]/40">3. Status</span>
        </div>

        {/* Premium Receipt Style Bill Summary */}
        <div className="bg-[#13110e] border border-white/[0.08] rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-center mb-3">
            <p className="text-[11px] font-bold text-[#f5efe2]/60 uppercase tracking-widest">Order Summary</p>
            <button 
              onClick={() => setShowBillDetails(!showBillDetails)} 
              className="text-[11px] font-bold text-[#f0a040] cursor-pointer"
            >
              {showBillDetails ? "Hide Items" : "View Items"}
            </button>
          </div>

          <AnimatePresence>
            {showBillDetails && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden space-y-2 mb-3 pt-1 border-b border-white/[0.04] pb-3"
              >
                {cartItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-[13px] font-medium text-[#f5efe2]/60">
                    <span>{item.name} × {item.quantity}</span>
                    <span className="text-[#f5efe2] tabular-nums">₹{(item.price * item.quantity).toFixed(0)}</span>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-2 text-[13px] font-medium text-[#f5efe2]/60">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="text-[#f5efe2] tabular-nums font-mono-dashboard">₹{subtotal.toFixed(0)}</span>
            </div>
            {taxPercent > 0 && (
              <div className="flex justify-between">
                <span>GST ({taxPercent}%)</span>
                <span className="text-[#f5efe2] tabular-nums font-mono-dashboard">₹{taxAmount.toFixed(0)}</span>
              </div>
            )}
            <div className="flex justify-between font-extrabold text-[16px] border-t border-dashed border-white/[0.08] pt-3 mt-1">
              <span className="text-[#f5efe2]">Total Bill</span>
              <span className="text-[#f0a040] tabular-nums text-lg font-mono-dashboard">₹{total.toFixed(0)}</span>
            </div>
          </div>
        </div>

        {/* Customer Details Form */}
        <div className="bg-[#13110e] border border-white/[0.08] rounded-2xl p-5 shadow-sm space-y-4">
          <p className="text-[11px] font-bold text-[#f5efe2]/60 uppercase tracking-widest">Guest Details <span className="normal-case font-normal text-[#f5efe2]/40">(optional)</span></p>

          <div className="relative group">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#f5efe2]/60 group-focus-within:text-[#f0a040] transition-colors" />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your Name"
              className="w-full bg-[#0b0a08] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-[13px] text-[#f5efe2] placeholder-[#f5efe2]/20 focus:outline-none focus:border-[#f0a040] focus:bg-[#0b0a08]/90 focus:ring-2 focus:ring-[#f0a040]/10 transition-all font-medium"
            />
          </div>

          <div className="relative group">
            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#f5efe2]/60 group-focus-within:text-[#f0a040] transition-colors" />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Mobile Number"
              type="tel"
              className="w-full bg-[#0b0a08] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-[13px] text-[#f5efe2] placeholder-[#f5efe2]/20 focus:outline-none focus:border-[#f0a040] focus:bg-[#0b0a08]/90 focus:ring-2 focus:ring-[#f0a040]/10 transition-all font-medium"
            />
          </div>

          <div className="relative group">
            <MessageSquare className="absolute left-3.5 top-3.5 w-4 h-4 text-[#f5efe2]/60 group-focus-within:text-[#f0a040] transition-colors" />
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Any global cooking notes or table preferences..."
              rows={2}
              className="w-full bg-[#0b0a08] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-[13px] text-[#f5efe2] placeholder-[#f5efe2]/20 focus:outline-none focus:border-[#f0a040] focus:bg-[#0b0a08]/90 focus:ring-2 focus:ring-[#f0a040]/10 transition-all font-medium resize-none text-[13px]"
            />
          </div>
        </div>

        {/* Payment Selection Tray */}
        <div className="bg-[#13110e] border border-white/[0.08] rounded-2xl p-5 shadow-sm space-y-3">
          <p className="text-[11px] font-bold text-[#f5efe2]/60 uppercase tracking-widest">Select Payment Method</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setPaymentMethod("ONLINE")}
              className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all cursor-pointer ${
                paymentMethod === "ONLINE"
                  ? "border-[#f0a040] bg-[#f0a040]/10 text-[#f0a040] font-bold"
                  : "border-white/[0.08] bg-[#181512] text-[#f5efe2]/60 hover:border-white/[0.12]"
              }`}
            >
              <CreditCard className="w-6 h-6" />
              <span className="text-[12px]">UPI / Cards (Online)</span>
            </button>
            <button
              onClick={() => setPaymentMethod("CASH")}
              className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all cursor-pointer ${
                paymentMethod === "CASH"
                  ? "border-[#f0a040] bg-[#f0a040]/10 text-[#f0a040] font-bold"
                  : "border-white/[0.08] bg-[#181512] text-[#f5efe2]/60 hover:border-white/[0.12]"
              }`}
            >
              <Banknote className="w-6 h-6" />
              <span className="text-[12px]">Pay at Counter (Cash)</span>
            </button>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="flex items-center justify-center gap-4 text-[#f5efe2]/40 text-[11px] font-semibold py-2">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-[#52d27a]" /> Secure Checkout
          </span>
          <span>·</span>
          <span>💳 Razorpay Protected</span>
        </div>
      </div>

      {/* Pay button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 z-40 bg-gradient-to-t from-[#0b0a08] via-[#0b0a08]/95 to-transparent border-t border-white/[0.04] backdrop-blur-xs">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full max-w-2xl mx-auto flex items-center justify-between bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-[#0b0a08] px-6 py-4 rounded-2xl shadow-xl shadow-[#f0a040]/10 transition-all font-black tracking-widest uppercase group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110"
          onClick={handleCheckout}
          disabled={loading || cartItems.length === 0}
        >
          <span>
            {loading ? "Processing..." : paymentMethod === "CASH" ? "Place Order (Pay Cash)" : "Pay Now & Place Order"}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-lg tabular-nums font-mono-dashboard">₹{total.toFixed(0)}</span>
            {!loading && <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
          </div>
        </motion.button>
      </div>
    </div>
  );
}
