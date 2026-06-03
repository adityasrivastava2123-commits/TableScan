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
      <div className="min-h-screen bg-[#0b0a08] text-[#f5efe2] flex flex-col items-center justify-center gap-6 p-6 font-sans">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 15 }}
          className="relative w-24 h-24 rounded-3xl bg-[#13110e] border border-white/[0.08] shadow-2xl flex items-center justify-center"
        >
          <ShoppingBag className="w-10 h-10 text-[#f0a040]" />
          <motion.div 
            animate={{ scale: [1, 1.2, 1] }} 
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#f0a040]"
          />
        </motion.div>
        <div className="text-center space-y-1.5">
          <h2 className="text-xl font-bold text-white tracking-tight">Your cart is empty</h2>
          <p className="text-[#f5efe2]/60 text-sm max-w-xs mx-auto">Explore our culinary masterworks and add items to your table to get started.</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-7 py-3 rounded-2xl bg-[#f0a040] text-[#0b0a08] text-[13px] font-black uppercase tracking-wider shadow-lg shadow-[#f0a040]/10 cursor-pointer hover:brightness-110"
          onClick={() => router.push(`/${slug}/${tableToken}`)}
        >
          Explore Menu
        </motion.button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0a08] text-[#f5efe2] pb-36 font-sans">
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
            Your Cart <Sparkles className="w-4 h-4 text-[#f0a040]" />
          </h1>
          <p className="text-[11px] text-[#f5efe2]/60">Table: {tableName}</p>
        </div>
        <motion.span 
          layoutId="cart-badge"
          className="ml-auto text-[11px] font-bold text-[#f0a040] bg-[#f0a040]/10 border border-[#f0a040]/20 px-3 py-1 rounded-full flex items-center gap-1"
        >
          <ShoppingCart className="w-3 h-3 text-[#f0a040]" />
          {items.reduce((s, i) => s + i.quantity, 0)} Items
        </motion.span>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Items Container */}
        <div className="space-y-3">
          <p className="text-[11px] font-bold text-[#f5efe2]/60 uppercase tracking-widest px-1">Selected Dishes</p>
          <AnimatePresence mode="popLayout">
            {items.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, x: -30 }}
                transition={{ type: "spring", damping: 20 }}
                className="bg-[#13110e] border border-white/[0.08] rounded-2xl p-4 shadow-sm hover:border-white/[0.12] transition-all relative overflow-hidden group"
              >
                <div className="flex items-start gap-3">
                  <VegIcon isVeg={item.isVeg} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[15px] text-white leading-snug tracking-tight">{item.name}</p>
                    <p className="text-[12px] text-[#f5efe2]/60 mt-0.5 font-medium">₹{item.price} each</p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1, color: "#e85a2a" }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => removeItem(item.id)}
                    className="text-white/40 hover:text-orange-400 p-1.5 transition-colors rounded-full hover:bg-[#e85a2a]/10 cursor-pointer"
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
                        className="flex-1 bg-[#0b0a08] border border-white/[0.08] rounded-xl px-3 py-2 text-[12px] text-[#f5efe2] placeholder-[#f5efe2]/20 focus:outline-none focus:border-[#f0a040]"
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
                        <p className="text-[11px] text-[#f5efe2]/60 font-medium italic flex items-center gap-1.5 bg-[#0b0a08] border border-white/[0.08] px-2.5 py-1.5 rounded-lg max-w-[85%] truncate">
                          <MessageSquare className="w-3.5 h-3.5 text-[#f0a040] flex-shrink-0" />
                          {item.note}
                        </p>
                      ) : (
                        <span className="text-[11px] text-[#f5efe2]/40">No requests added</span>
                      )}
                      <button 
                        onClick={() => handleStartEditing(item.id, item.note)}
                        className="text-[11px] font-bold text-[#f0a040] hover:text-[#ea6c0a] flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" />
                        {item.note ? "Edit" : "Add Instructions"}
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.04]">
                  <div className="flex items-center gap-3 bg-[#0b0a08] border border-white/[0.08] rounded-xl px-2 py-1">
                    <motion.button
                      whileTap={{ scale: 0.8 }}
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors text-[#f5efe2]/60 hover:text-white cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </motion.button>
                    <span className="w-5 text-center font-bold text-[14px] text-white tabular-nums">{item.quantity}</span>
                    <motion.button
                      whileTap={{ scale: 0.8 }}
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors text-[#f5efe2]/60 hover:text-white cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </motion.button>
                  </div>
                  <p className="font-extrabold text-[16px] text-[#f5efe2] tabular-nums font-mono-dashboard">
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
          className="w-full py-3.5 rounded-2xl border-2 border-dashed border-white/[0.08] text-[#f5efe2]/60 hover:text-[#f0a040] hover:border-[#f0a040]/50 text-[13px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer bg-[#13110e]/40 shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          Add More Items to Table
        </motion.button>

        {/* Frequently Ordered / Recommendations Tray */}
        <div className="space-y-3">
          <p className="text-[11px] font-bold text-[#f5efe2]/60 uppercase tracking-widest px-1">Frequently Ordered Add-ons</p>
          <div className="flex gap-3 overflow-x-auto pb-2 pt-1 -mx-4 px-4 scrollbar-hide">
            {POPULAR_RECOMMENDATIONS.map((rec) => {
              const inCart = items.some((i) => i.id === rec.id);
              return (
                <motion.div
                  key={rec.id}
                  whileHover={{ y: -2 }}
                  className="bg-[#13110e] border border-white/[0.08] rounded-2xl p-3 flex flex-col justify-between w-[150px] flex-shrink-0 shadow-sm relative overflow-hidden"
                >
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <VegIcon isVeg={rec.isVeg} />
                      <span className="text-[10px] font-bold text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20">POPULAR</span>
                    </div>
                    <p className="font-bold text-[13px] text-white leading-snug tracking-tight">{rec.name}</p>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-[13px] font-extrabold text-[#f5efe2] font-mono-dashboard">₹{rec.price}</span>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        addItem({ id: rec.id, name: rec.name, price: rec.price, quantity: 1, isVeg: rec.isVeg });
                      }}
                      className="px-2.5 py-1 rounded-xl bg-[#f0a040]/10 hover:bg-[#f0a040] hover:text-[#0b0a08] text-[#f0a040] text-[11px] font-bold border border-[#f0a040]/20 transition-all cursor-pointer"
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
          className="bg-[#13110e] border border-white/[0.08] rounded-2xl p-5 shadow-sm space-y-3.5"
        >
          <p className="text-[11px] font-bold text-[#f5efe2]/60 uppercase tracking-widest">Pricing Details</p>
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
          </div>
          <div className="flex justify-between font-extrabold text-[16px] border-t border-white/[0.08] pt-3.5 mt-2">
            <span className="text-[#f5efe2]">Grand Total</span>
            <span className="text-[#f0a040] tabular-nums text-lg font-mono-dashboard">₹{total.toFixed(0)}</span>
          </div>
        </motion.div>
      </div>

      {/* Checkout button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 z-40 bg-gradient-to-t from-[#0b0a08] via-[#0b0a08]/95 to-transparent border-t border-white/[0.04] backdrop-blur-xs">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full max-w-2xl mx-auto flex items-center justify-between bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-[#0b0a08] px-6 py-4 rounded-2xl shadow-xl shadow-[#f0a040]/10 transition-all font-black tracking-widest uppercase group cursor-pointer hover:brightness-110"
          onClick={() => router.push(`/${slug}/${tableToken}/checkout`)}
        >
          <span>Proceed to Checkout</span>
          <div className="flex items-center gap-2">
            <span className="text-lg font-black font-sans">₹{total.toFixed(0)}</span>
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </div>
        </motion.button>
      </div>
    </div>
  );
}
