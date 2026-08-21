"use client";

import { useEffect, useState } from "react";
import { useCartStore } from "@/store/cartStore";
import {
  ArrowLeft,
  ChevronRight,
  User,
  Phone,
  MessageSquare,
  CreditCard,
  Banknote,
  ShieldCheck,
  Sparkles,
  ShoppingCart,
  ChevronDown,
} from "lucide-react";
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

function VegIcon({ isVeg }: { isVeg: boolean }) {
  return (
    <span
      className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center flex-shrink-0 ${
        isVeg ? "border-emerald-600" : "border-red-600"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isVeg ? "bg-emerald-600" : "bg-red-600"}`} />
    </span>
  );
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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("ONLINE");
  const [showBillDetails, setShowBillDetails] = useState(false);
  const [formTouched, setFormTouched] = useState(false);

  const { items, getTotalPrice, clearCart } = useCartStore();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const subtotal = mounted ? getTotalPrice() : 0;
  const taxAmount = subtotal * (taxPercent / 100);
  const total = subtotal + taxAmount;
  const cartItems = mounted ? items : [];

  function loadRazorpayScript(): Promise<boolean> {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  async function handleCheckout() {
    if (cartItems.length === 0) return;
    setFormTouched(true);

    if (!name.trim()) {
      toast.error("Please enter your name to place the order.", {
        style: { background: "#ffffff", color: "#1c1917", border: "1px solid rgba(0,0,0,0.08)" },
      });
      return;
    }

    if (!phone.trim() || phone.trim().length < 10) {
      toast.error("Please enter a valid 10-digit mobile number.", {
        style: { background: "#ffffff", color: "#1c1917", border: "1px solid rgba(0,0,0,0.08)" },
      });
      return;
    }

    setLoading(true);

    try {
      if (paymentMethod === "ONLINE") {
        const loaded = await loadRazorpayScript();
        if (!loaded) {
          toast.error("Failed to load payment gateway", {
            style: { background: "#ffffff", color: "#1c1917", border: "1px solid rgba(0,0,0,0.08)" },
          });
          setLoading(false);
          return;
        }

        const { data } = await axios.post("/api/orders", {
          tableToken,
          restaurantId,
          customerName: name.trim(),
          customerPhone: phone.trim(),
          specialNote: note.trim(),
          paymentMethod: "ONLINE",
          items: cartItems.map((i) => ({
            menuItemId: i.id.includes("-") ? i.id.split("-")[0] : i.id,
            quantity: i.quantity,
            price: i.price,
            note: i.note,
          })),
        });

        // Hide full-screen overlay so payment modal can be interacted with
        setLoading(false);

        if (!data.razorpayOrderId) {
          clearCart();
          toast.success("Order placed successfully!", {
            style: { background: "#ffffff", color: "#1c1917", border: "1px solid rgba(0,0,0,0.08)" },
          });
          router.push(`/${slug}/${tableToken}/order-status?orderId=${data.orderId}`);
          return;
        }

        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_Ss6ZtATbi3kAp4",
          amount: data.amount,
          currency: data.currency || "INR",
          name: restaurantName,
          description: `Order at ${tableName}`,
          order_id: data.razorpayOrderId,
          handler: async (response: unknown) => {
            setLoading(true);
            try {
              await axios.post("/api/orders/verify", {
                razorpayOrderId: (response as any).razorpay_order_id,
                razorpayPaymentId: (response as any).razorpay_payment_id,
                razorpaySignature: (response as any).razorpay_signature,
                orderId: data.orderId,
              });
              clearCart();
              toast.success("Order placed!", {
                style: { background: "#ffffff", color: "#1c1917", border: "1px solid rgba(0,0,0,0.08)" },
              });
              router.push(`/${slug}/${tableToken}/order-status?orderId=${data.orderId}`);
            } catch {
              toast.error("Payment verification failed", {
                style: { background: "#ffffff", color: "#1c1917", border: "1px solid rgba(0,0,0,0.08)" },
              });
              setLoading(false);
            }
          },
          prefill: { name: name.trim(), contact: phone.trim() },
          theme: { color: "#e85a2a" },
          modal: { ondismiss: () => setLoading(false) },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        const { data } = await axios.post("/api/orders", {
          tableToken,
          restaurantId,
          customerName: name.trim(),
          customerPhone: phone.trim(),
          specialNote: note.trim(),
          paymentMethod: "CASH",
          items: cartItems.map((i) => ({
            menuItemId: i.id.includes("-") ? i.id.split("-")[0] : i.id,
            quantity: i.quantity,
            price: i.price,
            note: i.note,
          })),
        });

        clearCart();
        setLoading(false);
        toast.success("Order placed! Pay at counter.", {
          icon: "🪙",
          style: { background: "#ffffff", color: "#1c1917", border: "1px solid rgba(0,0,0,0.08)" },
        });
        router.push(`/${slug}/${tableToken}/order-status?orderId=${data.orderId}`);
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      setLoading(false);
      const errMsg = error.response?.data?.details || error.response?.data?.error || "Failed to create order";
      toast.error(errMsg, {
        style: { background: "#ffffff", color: "#1c1917", border: "1px solid rgba(0,0,0,0.08)" },
      });
    }
  }

  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#1c1917] pb-36 font-sans">
      {/* Processing Loader Overlay */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4 text-white"
          >
            <div className="relative w-14 h-14">
              <div className="w-14 h-14 rounded-full border-4 border-white/20 border-t-[#e85a2a] animate-spin" />
              <ShieldCheck className="absolute inset-0 m-auto w-6 h-6 text-[#e85a2a]" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-extrabold text-base tracking-tight">Contacting secure servers...</h3>
              <p className="text-xs text-white/70">Please do not refresh or close this tab.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md border-b border-amber-950/5 sticky top-0 z-10 px-4 py-4 flex items-center gap-3">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => router.back()}
          className="p-2 -ml-2 text-[#78716c] hover:text-[#e85a2a] transition-colors rounded-full hover:bg-amber-900/5 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </motion.button>
        <div>
          <h1 className="font-extrabold text-base text-[#1c1917] tracking-tight flex items-center gap-1.5">
            Secure Checkout <Sparkles className="w-4 h-4 text-[#e85a2a]" />
          </h1>
          <p className="text-[11px] text-[#78716c]">Table #{tableName} · {restaurantName}</p>
        </div>
        <motion.span className="ml-auto text-[11px] font-extrabold text-[#e85a2a] bg-[#e85a2a]/10 border border-[#e85a2a]/20 px-3 py-1 rounded-full flex items-center gap-1">
          <ShoppingCart className="w-3.5 h-3.5 text-[#e85a2a]" />
          {cartItems.reduce((s, i) => s + i.quantity, 0)} Items
        </motion.span>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Progress Stepper */}
        <div className="flex items-center gap-2 px-1">
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-[#e85a2a]/10 border border-[#e85a2a]/30 flex items-center justify-center text-[#e85a2a] text-[10px] font-black">
              ✓
            </span>
            <span className="text-[11px] font-extrabold text-[#78716c] uppercase tracking-widest">Cart</span>
          </div>
          <div className="flex-1 h-px bg-amber-950/10" />
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-[#e85a2a] flex items-center justify-center text-white text-[10px] font-black shadow-md shadow-[#e85a2a]/25">
              2
            </span>
            <span className="text-[11px] font-extrabold text-[#e85a2a] uppercase tracking-widest border-b-2 border-[#e85a2a] pb-px">
              Checkout
            </span>
          </div>
          <div className="flex-1 h-px bg-amber-950/10" />
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-amber-900/5 border border-amber-950/10 flex items-center justify-center text-[#78716c] text-[10px] font-black">
              3
            </span>
            <span className="text-[11px] font-bold text-[#78716c] uppercase tracking-widest">Status</span>
          </div>
        </div>

        {/* Order Summary Card */}
        <motion.div
          layout
          className="bg-white border border-amber-950/5 rounded-[28px] p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden"
        >
          <div className="flex justify-between items-center mb-3">
            <p className="text-[11px] font-extrabold text-[#78716c] uppercase tracking-widest">Order Summary</p>
            <button
              onClick={() => setShowBillDetails(!showBillDetails)}
              className="flex items-center gap-1 text-[11px] font-extrabold text-[#e85a2a] hover:underline cursor-pointer"
            >
              {showBillDetails ? "Hide Items" : "View Items"}
              <motion.span animate={{ rotate: showBillDetails ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown className="w-3.5 h-3.5" />
              </motion.span>
            </button>
          </div>

          <AnimatePresence>
            {showBillDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="space-y-2.5 mb-3.5 pb-3.5 border-b border-amber-950/5">
                  {cartItems.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-2.5 p-2 rounded-xl bg-amber-900/5 text-xs"
                    >
                      <VegIcon isVeg={item.isVeg ?? true} />
                      <span className="flex-1 font-bold text-[#1c1917] truncate">
                        {item.name}
                        <span className="text-[#78716c] font-normal ml-1.5">× {item.quantity}</span>
                      </span>
                      <span className="font-extrabold text-[#1c1917] tabular-nums">
                        ₹{(item.price * item.quantity).toFixed(0)}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-2 text-xs font-medium text-[#78716c]">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-extrabold text-[#1c1917]">₹{subtotal.toFixed(0)}</span>
            </div>
            {taxPercent > 0 && (
              <div className="flex justify-between">
                <span>Taxes ({taxPercent}%)</span>
                <span className="font-extrabold text-[#1c1917]">₹{taxAmount.toFixed(0)}</span>
              </div>
            )}
          </div>
          <div className="flex justify-between font-black text-base text-[#1c1917] border-t border-amber-950/5 pt-3 mt-3">
            <span>Grand Total</span>
            <span className="text-[#e85a2a] text-lg">₹{total.toFixed(0)}</span>
          </div>
        </motion.div>

        {/* Guest Details Form */}
        <div className="bg-white border border-amber-950/5 rounded-[28px] p-5 shadow-sm hover:shadow-md transition-all space-y-4">
          <p className="text-[11px] font-extrabold text-[#78716c] uppercase tracking-widest flex items-center gap-1">
            Guest Details <span className="text-red-500 font-extrabold text-sm">*</span>
            <span className="normal-case font-extrabold text-[#e85a2a] text-[10px] ml-1 bg-[#e85a2a]/10 px-2 py-0.5 rounded-full">Required</span>
          </p>

          <div className="relative group">
            <User className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${formTouched && !name.trim() ? "text-red-500" : "text-[#78716c] group-focus-within:text-[#e85a2a]"}`} />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your Name *"
              required
              className={`w-full bg-[#faf8f5] border rounded-2xl pl-10 pr-4 py-3 text-xs text-[#1c1917] placeholder-[#78716c]/50 focus:outline-none transition-all font-medium ${
                formTouched && !name.trim()
                  ? "border-red-500 ring-2 ring-red-500/10"
                  : "border-amber-950/10 focus:border-[#e85a2a] focus:ring-2 focus:ring-[#e85a2a]/20"
              }`}
            />
            {formTouched && !name.trim() && (
              <span className="text-[10px] text-red-500 font-bold mt-1 block px-1">Name is required to place your order.</span>
            )}
          </div>

          <div className="relative group">
            <Phone className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${formTouched && (!phone.trim() || phone.trim().length < 10) ? "text-red-500" : "text-[#78716c] group-focus-within:text-[#e85a2a]"}`} />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Mobile Number (10 digits) *"
              type="tel"
              required
              className={`w-full bg-[#faf8f5] border rounded-2xl pl-10 pr-4 py-3 text-xs text-[#1c1917] placeholder-[#78716c]/50 focus:outline-none transition-all font-medium ${
                formTouched && (!phone.trim() || phone.trim().length < 10)
                  ? "border-red-500 ring-2 ring-red-500/10"
                  : "border-amber-950/10 focus:border-[#e85a2a] focus:ring-2 focus:ring-[#e85a2a]/20"
              }`}
            />
            {formTouched && (!phone.trim() || phone.trim().length < 10) && (
              <span className="text-[10px] text-red-500 font-bold mt-1 block px-1">Valid 10-digit mobile number is required.</span>
            )}
          </div>

          <div className="relative group">
            <MessageSquare className="absolute left-3.5 top-3.5 w-4 h-4 text-[#78716c] group-focus-within:text-[#e85a2a] transition-colors" />
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Any cooking notes or special preferences... (optional)"
              rows={2}
              className="w-full bg-[#faf8f5] border border-amber-950/10 rounded-2xl pl-10 pr-4 py-3 text-xs text-[#1c1917] placeholder-[#78716c]/50 focus:outline-none focus:border-[#e85a2a] focus:ring-2 focus:ring-[#e85a2a]/20 transition-all font-medium resize-none"
            />
          </div>
        </div>

        {/* Payment Method */}
        <div className="bg-white border border-amber-950/5 rounded-[28px] p-5 shadow-sm hover:shadow-md transition-all space-y-3">
          <p className="text-[11px] font-extrabold text-[#78716c] uppercase tracking-widest">Select Payment Method</p>
          <div className="grid grid-cols-2 gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setPaymentMethod("ONLINE")}
              className={`relative p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all cursor-pointer overflow-hidden ${
                paymentMethod === "ONLINE"
                  ? "border-[#e85a2a] bg-[#e85a2a]/10 text-[#e85a2a] font-extrabold shadow-sm"
                  : "border-amber-950/10 bg-white text-[#78716c] hover:border-amber-950/20"
              }`}
            >
              <CreditCard className={`w-6 h-6 ${paymentMethod === "ONLINE" ? "text-[#e85a2a]" : "text-[#78716c]"}`} />
              <span className="text-xs text-center leading-snug">
                UPI / Cards
                <span className="block text-[10px] font-medium opacity-70">Pay Online</span>
              </span>
              {paymentMethod === "ONLINE" && (
                <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#e85a2a]" />
              )}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setPaymentMethod("CASH")}
              className={`relative p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all cursor-pointer overflow-hidden ${
                paymentMethod === "CASH"
                  ? "border-[#e85a2a] bg-[#e85a2a]/10 text-[#e85a2a] font-extrabold shadow-sm"
                  : "border-amber-950/10 bg-white text-[#78716c] hover:border-amber-950/20"
              }`}
            >
              <Banknote className={`w-6 h-6 ${paymentMethod === "CASH" ? "text-[#e85a2a]" : "text-[#78716c]"}`} />
              <span className="text-xs text-center leading-snug">
                Pay at Counter
                <span className="block text-[10px] font-medium opacity-70">Cash</span>
              </span>
              {paymentMethod === "CASH" && (
                <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#e85a2a]" />
              )}
            </motion.button>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="bg-white border border-amber-950/5 rounded-2xl px-5 py-3.5 flex items-center justify-center gap-4 text-[11px] font-bold text-[#78716c] shadow-sm">
          <span className="flex items-center gap-1.5 text-emerald-700">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Secure Checkout
          </span>
          <span className="w-px h-4 bg-amber-950/10" />
          <span>💳 Razorpay Protected</span>
          <span className="w-px h-4 bg-amber-950/10" />
          <span>🔒 256-bit SSL</span>
        </div>
      </div>

      {/* Fixed Pay Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 z-40 bg-gradient-to-t from-[#faf8f5] via-[#faf8f5]/95 to-transparent border-t border-amber-950/5 backdrop-blur-xs">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full max-w-2xl mx-auto flex items-center justify-between bg-[#e85a2a] hover:brightness-110 text-white px-6 py-4 rounded-2xl shadow-xl shadow-[#e85a2a]/25 transition-all font-black tracking-wider uppercase group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleCheckout}
          disabled={loading || cartItems.length === 0}
        >
          <span>
            {loading
              ? "Processing..."
              : paymentMethod === "CASH"
              ? "Place Order (Pay Cash)"
              : "Pay Now & Place Order"}
          </span>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-base tabular-nums">₹{total.toFixed(0)}</span>
            {!loading && <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
          </div>
        </motion.button>
      </div>
    </div>
  );
}
