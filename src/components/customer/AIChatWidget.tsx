"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, X, ShoppingBag, CreditCard, Bot, RefreshCw, ChevronRight } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import toast from "react-hot-toast";
import axios from "axios";
import { pusherClient } from "@/lib/pusher-client";

interface AIChatWidgetProps {
  restaurant: {
    id: string;
    name: string;
    slug: string;
    taxPercent: number;
  };
  table: {
    id: string;
    name: string;
    qrToken: string;
  };
  slug: string;
  tableToken: string;
  onOpenCart?: () => void;
  onTriggerCheckout?: () => void;
}

interface MessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  toolActions?: Array<{ tool: string; payload: any }>;
}

const QUICK_PROMPTS = [
  "kuch spicy aur vegetarian chahiye 🌶️",
  "give me something under ₹200 for 2 people 🥗",
  "best selling desserts 🍰",
  "what goes with Butter Chicken? 🫓",
  "view my cart summary 🛒",
];

export default function AIChatWidget({
  restaurant,
  table,
  slug,
  tableToken,
  onOpenCart,
  onTriggerCheckout,
}: AIChatWidgetProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: "welcome-1",
      role: "assistant",
      content: `Namaste! 👋 I'm **Sorial**, your AI Order Assistant for ${restaurant.name}.\n\nTell me what you're craving (e.g. *"spicy veg starters under ₹250"*), or say *"add Paneer Tikka"* to order directly!`,
      timestamp: "Just now",
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { addItem, items, getTotalItems, getTotalPrice } = useCartStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, loading]);

  // Real-time Pusher listener for multi-device AI cart sync
  useEffect(() => {
    if (!pusherClient || !table.id) return;

    const channelName = `table-${table.id}`;
    const channel = pusherClient.subscribe(channelName);

    channel.bind("cart-updated", (data: any) => {
      if (data.source === "ai-assistant" && data.item) {
        addItem({
          id: data.item.id,
          name: data.item.name,
          price: data.item.price,
          quantity: data.item.quantity || 1,
          isVeg: data.item.isVeg ?? true,
        });
      }
    });

    return () => {
      pusherClient.unsubscribe(channelName);
    };
  }, [table.id, addItem]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || loading) return;

    const userMsgId = `user-${Date.now()}`;
    const userMsg: MessageItem = {
      id: userMsgId,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputMessage("");
    setLoading(true);

    try {
      const { data } = await axios.post("/api/ai-assistant/chat", {
        message: text,
        tableToken,
        slug,
        sessionId,
        currentCartItems: items,
        history: messages,
      });

      if (data.sessionId) setSessionId(data.sessionId);

      const assistantMsg: MessageItem = {
        id: `asst-${Date.now()}`,
        role: "assistant",
        content: data.response || "Sorial couldn't fetch a suggestion, please browse the menu manually.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        toolActions: data.toolActions || [],
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Process any client-side tool actions (e.g. addToCart)
      if (data.toolActions && data.toolActions.length > 0) {
        for (const action of data.toolActions) {
          if (action.tool === "addToCart" && action.payload) {
            addItem({
              id: action.payload.id,
              name: action.payload.name,
              price: action.payload.price,
              quantity: action.payload.quantity || 1,
              isVeg: action.payload.isVeg ?? true,
            });
            toast.success(`Added ${action.payload.name} to cart! 🛒`, {
              style: {
                background: "#13110e",
                color: "#f5efe2",
                border: "1px solid rgba(240, 160, 64, 0.3)",
              },
            });
          }
        }
      }
    } catch (err: any) {
      console.error("AI Chat widget send error:", err);
      const errorMsg =
        err.response?.status === 429
          ? "You're typing too fast! Please wait a few seconds before asking again."
          : "Sorial couldn't fetch a suggestion, please browse the menu manually.";

      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: errorMsg,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <>
      {/* ── Floating Launcher Trigger Button ──────────────────────────────── */}
      {!isOpen && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => setIsOpen(true)}
          className="fixed bottom-[88px] right-4 md:bottom-6 md:right-6 z-40 flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-[#0b0a08] font-extrabold text-xs shadow-2xl shadow-amber-950/40 border border-white/20 backdrop-blur-md"
        >
          <div className="w-6 h-6 rounded-full bg-[#0b0a08]/20 flex items-center justify-center animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-[#0b0a08]" />
          </div>
          <span>Ask AI Waiter</span>
          {getTotalItems() > 0 && (
            <span className="bg-[#0b0a08] text-[#f0a040] px-2 py-0.5 rounded-full text-[10px] font-black">
              {getTotalItems()}
            </span>
          )}
        </motion.button>
      )}

      {/* ── Chat Modal / Drawer ───────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: "spring", damping: 22, stiffness: 260 }}
            className="fixed bottom-4 right-4 z-50 w-[92vw] max-w-[420px] h-[580px] max-h-[85vh] bg-[#13110e]/95 border border-white/10 rounded-[28px] shadow-2xl backdrop-blur-2xl flex flex-col overflow-hidden text-[#f5efe2]"
            style={{ fontFamily: "var(--font-poppins, 'Poppins', sans-serif)" }}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#181512] to-[#13110e] px-5 py-4 border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#f0a040] to-[#e85a2a] p-0.5 flex items-center justify-center shadow-lg">
                  <div className="w-full h-full rounded-[14px] bg-[#0b0a08] flex items-center justify-center">
                    <Bot className="w-5 h-5 text-[#f0a040]" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-white">Sorial</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f0a040]/10 text-[#f0a040] border border-[#f0a040]/20">
                      AI Agent
                    </span>
                  </div>
                  <p className="text-[11px] text-[#f5efe2]/60">Table #{table.name} · Live Menu Assistant</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#f5efe2]/60 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Message History List */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 scrollbar-hide">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed font-medium space-y-2 ${
                      msg.role === "user"
                        ? "bg-[#f0a040] text-[#0b0a08] rounded-br-none shadow-md font-semibold"
                        : "bg-[#181512] border border-white/[0.08] text-[#f5efe2] rounded-bl-none shadow-sm"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>

                    {/* Inline Confirmation Card for addToCart tool action */}
                    {msg.toolActions?.map((act, idx) => {
                      if (act.tool === "addToCart" && act.payload) {
                        return (
                          <div
                            key={idx}
                            className="mt-2 pt-2 border-t border-white/15 bg-white/5 rounded-xl p-2.5 space-y-2"
                          >
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-emerald-400">✨ Added to Cart:</span>
                              <span className="font-extrabold text-white">
                                {act.payload.name} x{act.payload.quantity || 1} — ₹{act.payload.price}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                              <button
                                onClick={() => {
                                  if (onOpenCart) onOpenCart();
                                  setIsOpen(false);
                                }}
                                className="flex-1 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-[10px] flex items-center justify-center gap-1 transition-all"
                              >
                                <ShoppingBag className="w-3 h-3 text-[#f0a040]" />
                                View Cart ({getTotalItems()})
                              </button>
                              <button
                                onClick={() => {
                                  if (onTriggerCheckout) onTriggerCheckout();
                                  else if (onOpenCart) onOpenCart();
                                  setIsOpen(false);
                                }}
                                className="flex-1 py-1.5 rounded-lg bg-[#f0a040] hover:brightness-110 text-[#0b0a08] font-extrabold text-[10px] flex items-center justify-center gap-1 shadow-sm transition-all"
                              >
                                <CreditCard className="w-3 h-3" />
                                Proceed to Pay
                              </button>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                  <span className="text-[9px] text-[#f5efe2]/40 mt-1 px-1">{msg.timestamp}</span>
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-2 text-xs text-[#f0a040] bg-[#181512] border border-white/[0.08] p-3 rounded-2xl w-fit">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Sorial is searching menu...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompt Chips */}
            <div className="px-3 py-2 bg-[#0b0a08]/50 border-t border-white/[0.06] flex gap-2 overflow-x-auto scrollbar-hide">
              {QUICK_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(prompt)}
                  disabled={loading}
                  className="whitespace-nowrap px-3 py-1.5 rounded-full bg-[#181512] hover:bg-[#201c18] border border-white/[0.08] text-[11px] text-[#f5efe2]/80 hover:text-[#f0a040] transition-all flex-shrink-0"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Input Footer */}
            <div className="p-3 bg-[#13110e] border-t border-white/[0.08] flex items-center gap-2">
              <input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSendMessage();
                }}
                placeholder="Ask Sorial or say 'add Paneer Tikka'..."
                disabled={loading}
                className="flex-1 bg-[#181512] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-[#f5efe2] placeholder-[#f5efe2]/30 focus:outline-none focus:ring-1 focus:ring-[#f0a040]"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={loading || !inputMessage.trim()}
                className="w-10 h-10 rounded-xl bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-[#0b0a08] flex items-center justify-center font-bold disabled:opacity-40 transition-all shadow-md"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
