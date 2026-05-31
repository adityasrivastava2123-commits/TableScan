"use client";

import { useCartStore } from "@/store/cartStore";
import { Minus, Plus, Trash2, ArrowLeft, ShoppingBag, ChevronRight, ShoppingCart, Sparkles, MessageSquare, PlusCircle, Edit2, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

function VegIcon({ isVeg }: { isVeg: boolean }) {
  return (
    <span className={`w-4 h-4 border-2 rounded flex-shrink-0 flex items-center justify-center ${isVeg ? "border-emerald-500" : "border-rose-500"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isVeg ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
    </span>
  );
}

const POPULAR_RECOMMENDATIONS = [
  { id: "rec1", name: "Fresh Lime Soda", price: 60, isVeg: true },
  { id: "rec2", name: "Cheese Garlic Bread", price: 110, isVeg: true },
  { id: "rec3", name: "Crispy French Fries", price: 90, isVeg: true },
  { id: "rec4", name: "Chocolate Lava Cake", price: 130, isVeg: true },
];

export default function CartPage({
  slug, tableToken, tableName, taxPercent = 0,
}: {
  slug: string; tableToken: string; tableName: string; taxPercent?: number;
}) {
  const { items, updateQuantity, removeItem, getTotalPrice, updateNote, addItem } = useCartStore();
  const router = useRouter();
  const subtotal = getTotalPrice();
  const taxAmount = subtotal * (taxPercent / 100);
  const total = subtotal + taxAmount;

  // Track which item note is currently being edited
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [tempNote, setTempNote] = useState("");

  const handleStartEditing = (itemId: string, currentNote: string = "") => {
    setEditingNoteId(itemId);
    setTempNote(currentNote);
  };

  const handleSaveNote = (itemId: string) => {
    updateNote(itemId, tempNote);
    setEditingNoteId(null);
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f9f9f6] to-[#f4f4ee] flex flex-col items-center justify-center gap-6 p-6 font-sans">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 15 }}
          className="relative w-24 h-24 rounded-3xl bg-white shadow-xl shadow-neutral-200/50 flex items-center justify-center border border-neutral-100"
        >
          <ShoppingBag className="w-10 h-10 text-[#f97316]" />
          <motion.div 
            animate={{ scale: [1, 1.2, 1] }} 
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#f97316]"
          />
        </motion.div>
        <div className="text-center space-y-1.5">
          <h2 className="text-xl font-bold text-neutral-800 tracking-tight">Your cart is empty</h2>
          <p className="text-neutral-400 text-sm max-w-xs mx-auto">Explore our culinary masterworks and add items to your table to get started.</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-7 py-3 rounded-2xl bg-[#f97316] text-white text-[13px] font-bold shadow-lg shadow-[#f97316]/20 cursor-pointer"
          onClick={() => router.push(`/${slug}/${tableToken}`)}
        >
          Explore Menu
        </motion.button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9f9f6] pb-36 font-sans">
      {/* Header */}
      <div className="bg-[#f9f9f6]/85 backdrop-blur-md border-b border-neutral-200/50 sticky top-0 z-10 px-4 py-4 flex items-center gap-3">
        <motion.button 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => router.back()} 
          className="p-2 -ml-2 text-neutral-500 hover:text-[#f97316] transition-colors rounded-full hover:bg-neutral-100 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </motion.button>
        <div>
          <h1 className="font-extrabold text-lg text-neutral-800 tracking-tight flex items-center gap-1.5">
            Your Cart <Sparkles className="w-4 h-4 text-[#f97316]" />
          </h1>
          <p className="text-[11px] text-[#9a9a9a]">Table: {tableName}</p>
        </div>
        <motion.span 
          layoutId="cart-badge"
          className="ml-auto text-[11px] font-bold text-[#f97316] bg-[#f97316]/10 border border-[#f97316]/20 px-3 py-1 rounded-full flex items-center gap-1"
        >
          <ShoppingCart className="w-3 h-3" />
          {items.reduce((s, i) => s + i.quantity, 0)} Items
        </motion.span>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Items Container */}
        <div className="space-y-3">
          <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest px-1">Selected Dishes</p>
          <AnimatePresence mode="popLayout">
            {items.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, x: -30 }}
                transition={{ type: "spring", damping: 20 }}
                className="bg-white border border-neutral-200/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
              >
                <div className="flex items-start gap-3">
                  <VegIcon isVeg={item.isVeg} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[15px] text-neutral-800 leading-snug tracking-tight">{item.name}</p>
                    <p className="text-[12px] text-neutral-400 mt-0.5 font-medium">₹{item.price} each</p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1, color: "#ef4444" }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => removeItem(item.id)}
                    className="text-neutral-300 hover:text-rose-500 p-1.5 transition-colors rounded-full hover:bg-rose-50 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </motion.button>
                </div>

                {/* Inline Notes Editor */}
                <div className="mt-3">
                  {editingNoteId === item.id ? (
                    <motion.div 
                      initial={{ opacity: 0, y: -5 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      className="flex gap-2 items-center"
                    >
                      <input 
                        value={tempNote}
                        onChange={(e) => setTempNote(e.target.value)}
                        placeholder="e.g., less spicy, extra hot, no onions..."
                        className="flex-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-[12px] text-neutral-800 focus:outline-none focus:border-[#f97316]"
                        autoFocus
                        onKeyDown={(e) => e.key === "Enter" && handleSaveNote(item.id)}
                      />
                      <button 
                        onClick={() => handleSaveNote(item.id)}
                        className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white transition-colors cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ) : (
                    <div className="flex items-center justify-between">
                      {item.note ? (
                        <p className="text-[11px] text-neutral-500 font-medium italic flex items-center gap-1.5 bg-neutral-50 px-2.5 py-1.5 rounded-lg border border-neutral-100/80 max-w-[85%] truncate">
                          <MessageSquare className="w-3.5 h-3.5 text-[#f97316] flex-shrink-0" />
                          {item.note}
                        </p>
                      ) : (
                        <span className="text-[11px] text-neutral-400">No requests added</span>
                      )}
                      <button 
                        onClick={() => handleStartEditing(item.id, item.note)}
                        className="text-[11px] font-bold text-[#f97316] hover:text-[#ea6c0a] flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" />
                        {item.note ? "Edit" : "Add Instructions"}
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-neutral-100">
                  <div className="flex items-center gap-3 bg-neutral-50 border border-neutral-200/60 rounded-xl px-2 py-1">
                    <motion.button
                      whileTap={{ scale: 0.8 }}
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-neutral-200/60 transition-colors text-neutral-600 hover:text-neutral-800 cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </motion.button>
                    <span className="w-5 text-center font-bold text-[14px] text-neutral-800 tabular-nums">{item.quantity}</span>
                    <motion.button
                      whileTap={{ scale: 0.8 }}
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-neutral-200/60 transition-colors text-neutral-600 hover:text-neutral-800 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </motion.button>
                  </div>
                  <p className="font-extrabold text-[16px] text-neutral-800 tabular-nums">
                    ₹{(item.price * item.quantity).toFixed(0)}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Add More Items Link */}
        <motion.button 
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => router.push(`/${slug}/${tableToken}`)}
          className="w-full py-3.5 rounded-2xl border-2 border-dashed border-neutral-200 text-neutral-500 hover:text-[#f97316] hover:border-[#f97316]/50 text-[13px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer bg-white/40 shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          Add More Items to Table
        </motion.button>

        {/* Frequently Ordered / Recommendations Tray */}
        <div className="space-y-3">
          <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest px-1">Frequently Ordered Add-ons</p>
          <div className="flex gap-3 overflow-x-auto pb-2 pt-1 -mx-4 px-4 scrollbar-hide">
            {POPULAR_RECOMMENDATIONS.map((rec) => {
              const inCart = items.some((i) => i.id === rec.id);
              return (
                <motion.div
                  key={rec.id}
                  whileHover={{ y: -2 }}
                  className="bg-white border border-neutral-200/70 rounded-2xl p-3 flex flex-col justify-between w-[150px] flex-shrink-0 shadow-sm relative overflow-hidden"
                >
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <VegIcon isVeg={rec.isVeg} />
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">POPULAR</span>
                    </div>
                    <p className="font-bold text-[13px] text-neutral-800 leading-snug tracking-tight">{rec.name}</p>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-[13px] font-extrabold text-neutral-800">₹{rec.price}</span>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        addItem({ id: rec.id, name: rec.name, price: rec.price, quantity: 1, isVeg: rec.isVeg });
                      }}
                      className="px-2.5 py-1 rounded-xl bg-[#f97316]/10 hover:bg-[#f97316] hover:text-white text-[#f97316] text-[11px] font-bold border border-[#f97316]/20 transition-all cursor-pointer"
                    >
                      {inCart ? "Add +1" : "Add"}
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Bill summary */}
        <motion.div 
          layout
          className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm space-y-3.5"
        >
          <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Pricing Details</p>
          <div className="space-y-2 text-[13px] font-medium text-neutral-500">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="text-neutral-800 tabular-nums">₹{subtotal.toFixed(0)}</span>
            </div>
            {taxPercent > 0 && (
              <div className="flex justify-between">
                <span>GST ({taxPercent}%)</span>
                <span className="text-neutral-800 tabular-nums">₹{taxAmount.toFixed(0)}</span>
              </div>
            )}
          </div>
          <div className="flex justify-between font-extrabold text-[16px] border-t border-neutral-100 pt-3.5 mt-2">
            <span className="text-neutral-800">Grand Total</span>
            <span className="text-[#f97316] tabular-nums text-lg">₹{total.toFixed(0)}</span>
          </div>
        </motion.div>
      </div>

      {/* Checkout button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 z-40 bg-gradient-to-t from-[#f9f9f6] via-[#f9f9f6]/95 to-transparent border-t border-neutral-200/20 backdrop-blur-sm">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full max-w-2xl mx-auto flex items-center justify-between bg-gradient-to-r from-[#f97316] to-[#ea6c0a] text-white px-6 py-4 rounded-2xl shadow-xl shadow-[#f97316]/20 transition-all font-bold group cursor-pointer"
          onClick={() => router.push(`/${slug}/${tableToken}/checkout`)}
        >
          <span className="text-[14px] tracking-wide uppercase">Proceed to Checkout</span>
          <div className="flex items-center gap-2">
            <span className="text-lg font-black">₹{total.toFixed(0)}</span>
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </div>
        </motion.button>
      </div>
    </div>
  );
}
