"use client";

import { useCartStore } from "@/store/cartStore";
import { Minus, Plus, Trash2, ArrowLeft, ShoppingBag, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

function VegIcon({ isVeg }: { isVeg: boolean }) {
  return (
    <span className={`w-4 h-4 border-2 rounded flex-shrink-0 flex items-center justify-center ${isVeg ? "border-[#22c55e]" : "border-[#ef4444]"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isVeg ? "bg-[#22c55e]" : "bg-[#ef4444]"}`} />
    </span>
  );
}

export default function CartPage({
  slug, tableToken, tableName, taxPercent = 0,
}: {
  slug: string; tableToken: string; tableName: string; taxPercent?: number;
}) {
  const { items, updateQuantity, removeItem, getTotalPrice } = useCartStore();
  const router = useRouter();
  const subtotal = getTotalPrice();
  const taxAmount = subtotal * (taxPercent / 100);
  const total = subtotal + taxAmount;

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#f5f5f0] flex flex-col items-center justify-center gap-5 p-6">
        <div className="w-16 h-16 rounded-2xl bg-[#f0f0eb] border border-[#e5e5e0] flex items-center justify-center">
          <ShoppingBag className="w-7 h-7 text-[#9a9a9a]" />
        </div>
        <div className="text-center">
          <p className="text-[#1a1a1a] font-semibold">Your cart is empty</p>
          <p className="text-[#9a9a9a] text-sm mt-1">Add items from the menu to get started</p>
        </div>
        <button
          className="px-6 py-2.5 rounded-xl border border-[#e5e5e0] text-[#1a1a1a] text-[13px] font-medium hover:bg-[#f0f0eb] transition-colors"
          onClick={() => router.push(`/${slug}/${tableToken}`)}
        >
          Back to Menu
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f0] pb-32">
      {/* Header */}
      <div className="bg-[#f5f5f0]/90 backdrop-blur-xl border-b border-[#e8e8e3] sticky top-0 z-10 px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 -ml-2 text-[#6b6b6b] hover:text-[#f97316] transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-bold text-[15px] text-[#1a1a1a]">Your Cart</h1>
          <p className="text-[11px] text-[#9a9a9a]">Table: {tableName}</p>
        </div>
        <span className="ml-auto text-[11px] text-[#6b6b6b] bg-[#f0f0eb] border border-[#e5e5e0] px-2.5 py-1 rounded-full">
          {items.reduce((s, i) => s + i.quantity, 0)} items
        </span>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {/* Items */}
        {items.map((item) => (
          <div key={item.id} className="bg-white border border-[#e8e8e3] rounded-xl p-4">
            <div className="flex items-start gap-2.5 mb-3">
              <VegIcon isVeg={item.isVeg} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[14px] text-[#1a1a1a] leading-tight">{item.name}</p>
                {item.note && (
                  <p className="text-[11px] text-[#9a9a9a] mt-0.5 italic">{item.note}</p>
                )}
                <p className="text-[12px] text-[#6b6b6b] mt-0.5">₹{item.price} each</p>
              </div>
              <button
                onClick={() => removeItem(item.id)}
                className="text-[#9a9a9a] hover:text-[#ef4444] p-1 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 bg-[#f0f0eb] border border-[#e5e5e0] rounded-xl px-3 py-1.5">
                <button
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-[#e8e8e3] transition-colors text-[#1a1a1a]"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-5 text-center font-semibold text-[14px] text-[#1a1a1a]">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-[#e8e8e3] transition-colors text-[#1a1a1a]"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              <p className="font-bold text-[15px] text-[#1a1a1a]">₹{(item.price * item.quantity).toFixed(0)}</p>
            </div>
          </div>
        ))}

        {/* Bill summary */}
        <div className="bg-white border border-[#e8e8e3] rounded-xl p-4 space-y-2.5">
          <p className="text-[12px] font-semibold text-[#9a9a9a] uppercase tracking-wider mb-3">Bill Summary</p>
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
          <div className="flex justify-between font-bold text-[15px] border-t border-[#e5e5e0] pt-2.5 mt-1">
            <span className="text-[#1a1a1a]">Total</span>
            <span className="text-[#f97316]">₹{total.toFixed(0)}</span>
          </div>
        </div>
      </div>

      {/* Checkout button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 z-40 bg-[#f5f5f0]/80 backdrop-blur-xl border-t border-[#e8e8e3]">
        <button
          className="w-full max-w-2xl mx-auto flex items-center justify-between bg-[#f97316] hover:bg-[#ea6c0a] text-white px-5 py-3.5 rounded-2xl shadow-2xl shadow-[#f97316]/30 transition-colors"
          onClick={() => router.push(`/${slug}/${tableToken}/checkout`)}
        >
          <span className="font-semibold text-[14px]">Proceed to Checkout</span>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[15px]">₹{total.toFixed(0)}</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </button>
      </div>
    </div>
  );
}
