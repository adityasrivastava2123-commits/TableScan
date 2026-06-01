"use client";

import {
  useState, useEffect, useMemo, useCallback, memo,
} from "react";
import {
  Plus, Minus, X, Search, Check, Flame, ShoppingBag,
  Utensils, Heart, BellRing, Grid3X3, ChevronRight,
  ArrowLeft, Star, Clock, MessageSquare, Send,
} from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ─────────────────────────────────────────────────────────────────
interface Variant { id: string; name: string; price: number; }
interface MenuItem {
  id: string; name: string; description?: string | null;
  price: number; isVeg: boolean; image?: string | null;
  tags: string[]; variants: Variant[];
}
interface Category { id: string; name: string; menuItems: MenuItem[]; }
interface Restaurant {
  id: string; name: string; logo?: string | null;
  description?: string | null; taxPercent: number;
  categories: Category[];
}
interface Table {
  id: string; name: string; qrToken: string;
  location?: { name: string } | null; capacity?: number | null;
}
interface ActiveOrder { id: string; orderNumber: string; status: string; }
interface SplitPerson { id: string; name: string; itemIds: string[]; }

// ─── Design Tokens ──────────────────────────────────────────────────────────
const G = "#3D7A5A";        // Primary green
const G_DARK = "#2d5e44";   // Darker green on press

// ─── Helpers ────────────────────────────────────────────────────────────────
function getCategoryEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("burger"))  return "🍔";
  if (n.includes("sushi"))   return "🍣";
  if (n.includes("seafood") || n.includes("fish")) return "🦐";
  if (n.includes("drink") || n.includes("juice"))  return "🥤";
  if (n.includes("bakery") || n.includes("bread")) return "🥖";
  if (n.includes("pizza"))   return "🍕";
  if (n.includes("pasta"))   return "🍝";
  if (n.includes("veg") || n.includes("salad"))    return "🥗";
  if (n.includes("chicken") || n.includes("meat")) return "🍗";
  if (n.includes("dessert") || n.includes("sweet")) return "🍰";
  return "🍽️";
}

function getCalories(item: MenuItem): number {
  let h = 0;
  for (let i = 0; i < item.id.length; i++) h = item.id.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h % 300) + 220;
}

function getIngredients(item: MenuItem): { emoji: string; name: string }[] {
  const pool = [
    { emoji: "🍅", name: "Tomato" }, { emoji: "🧀", name: "Cheese" },
    { emoji: "🧄", name: "Garlic" }, { emoji: "🌶️", name: "Chili" },
    { emoji: "🥑", name: "Avocado" }, { emoji: "🍃", name: "Basil" },
    { emoji: "🍄", name: "Mushroom" }, { emoji: "🍤", name: "Shrimp" },
    { emoji: "🌽", name: "Corn" }, { emoji: "🧅", name: "Onion" },
  ];
  let h = 0;
  for (let i = 0; i < item.id.length; i++) h = item.id.charCodeAt(i) + ((h << 5) - h);
  const a = Math.abs(h) % pool.length;
  const b = Math.abs(h + 3) % pool.length;
  const c = Math.abs(h + 7) % pool.length;
  const result = [pool[a]];
  if (b !== a) result.push(pool[b]);
  if (c !== a && c !== b) result.push(pool[c]);
  return result;
}

// Veg / Non-Veg indicator (matching Indian food standard dot-in-box)
function VegBadge({ isVeg }: { isVeg: boolean }) {
  return (
    <span
      className={`inline-flex items-center justify-center w-4 h-4 rounded-sm border-[1.5px] flex-shrink-0
        ${isVeg ? "border-[#3D7A5A]" : "border-red-500"}`}
    >
      <span className={`w-2 h-2 rounded-full ${isVeg ? "bg-[#3D7A5A]" : "bg-red-500"}`} />
    </span>
  );
}

const SPICE_LEVELS = ["Mild", "Medium", "Hot", "Extra Hot"];

// ─── Main Component ─────────────────────────────────────────────────────────
export default function CustomerMenu({
  restaurant, table, slug, tableToken, activeOrders: initialActiveOrders,
}: {
  restaurant: Restaurant; table: Table;
  slug: string; tableToken: string;
  activeOrders?: ActiveOrder[];
}) {
  const router = useRouter();
  const {
    addItem, items, updateQuantity, removeItem,
    clearCart, getTotalItems, getTotalPrice, setTableInfo,
  } = useCartStore();

  // Hydration guard
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const cartItems  = mounted ? items : [];
  const totalItems = mounted ? getTotalItems() : 0;
  const subtotal   = mounted ? getTotalPrice() : 0;
  const tax        = subtotal * (restaurant.taxPercent / 100);
  const grandTotal = subtotal + tax;

  // ── UI State ────────────────────────────────────────────────────────────
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery,    setSearchQuery]    = useState("");
  const [showSearch,     setShowSearch]     = useState(false);
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [selectedItem,   setSelectedItem]   = useState<MenuItem | null>(null);
  const [placedOrder,      setPlacedOrder]      = useState<ActiveOrder | null>(null);
  const [activeOrders,     setActiveOrders]     = useState<ActiveOrder[]>(initialActiveOrders ?? []);
  const [selectedOrderId,  setSelectedOrderId]  = useState<string | null>(initialActiveOrders?.[0]?.id ?? null);
  const [showOrderBanner,  setShowOrderBanner]  = useState<boolean>(!!(initialActiveOrders?.length));

  // Item customisation
  const [itemQty,          setItemQty]          = useState(1);
  const [selectedVariant,  setSelectedVariant]  = useState<Variant | null>(null);
  const [spiceLevel,       setSpiceLevel]        = useState("Medium");
  const [addOns,           setAddOns]            = useState<string[]>([]);
  const [itemNote,         setItemNote]          = useState("");
  const [orderNote,        setOrderNote]         = useState("");
  const [isFav,            setIsFav]             = useState(false);
  const [paymentMethod,    setPaymentMethod]     = useState<"CASH" | "ONLINE">("CASH");
  const [isPlacing,        setIsPlacing]         = useState(false);

  // Derived lists moved up to avoid temporal dead zone / reference errors
  const allItems = useMemo(
    () => restaurant.categories.flatMap(c => c.menuItems),
    [restaurant.categories],
  );
  const bestsellers = useMemo(
    () => allItems.filter(i => i.tags.some(t =>
      ["bestseller","top","must try","chef special"].includes(t.toLowerCase()))),
    [allItems],
  );
  const spotlightItem = bestsellers[0] ?? allItems[0] ?? null;

  // Pairing recommendations & smart upsell states
  const [showPairingSheet, setShowPairingSheet] = useState(false);
  const [lastAddedItem, setLastAddedItem] = useState<MenuItem | null>(null);

  const pairingItems = useMemo(() => {
    if (!lastAddedItem) return [];
    
    const pairingCat = restaurant.categories.find(c =>
      /drink|beverage|mocktail|juice|shake|dessert|side/i.test(c.name)
    );
    let items = pairingCat ? pairingCat.menuItems : [];
    
    if (items.length < 2) {
      items = allItems.filter(i => i.id !== lastAddedItem.id).slice(0, 3);
    }
    
    return items.filter(i => i.id !== lastAddedItem.id).slice(0, 3);
  }, [lastAddedItem, restaurant.categories, allItems]);

  // Customer details
  const [customerName,    setCustomerName]     = useState("");
  const [customerPhone,   setCustomerPhone]    = useState("");
  const [customerEmail,   setCustomerEmail]    = useState("");

  // Split bill
  const [splitPeople, setSplitPeople] = useState<SplitPerson[]>([
    { id: "me", name: "You", itemIds: [] },
  ]);

  useEffect(() => { setTableInfo(slug, tableToken); }, [slug, tableToken, setTableInfo]);

  // Local storage backup for the last order placed on this device
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [sessionOrderIds, setSessionOrderIds] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`tablescan_last_order_${tableToken}`);
      if (saved) setLastOrderId(saved);
      try {
        const savedList = JSON.parse(localStorage.getItem(`tablescan_orders_${tableToken}`) || "[]");
        if (Array.isArray(savedList)) setSessionOrderIds(savedList);
      } catch (e) {}
    }
  }, [tableToken, placedOrder, activeOrders]);

  // Support Chat Drawer State
  const [showChatDrawer, setShowChatDrawer] = useState(false);
  const [chatMessages, setChatMessages] = useState<
    { sender: "user" | "staff"; text: string; time: string }[]
  >([]);

  // Default welcome message on mount
  useEffect(() => {
    setChatMessages([
      {
        sender: "staff" as const,
        text: `Welcome to TableScan Support! 👋 Let us know how we can assist you at Table #${table.name} today.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  }, [table.name]);

  // Poll support chat messages in real time
  useEffect(() => {
    if (!showChatDrawer) return;

    const fetchChat = async () => {
      try {
        const { data } = await axios.get(`/api/support?restaurantId=${restaurant.id}&tableName=${table.name}`);
        if (data && data.messages && data.messages.length > 0) {
          setChatMessages(data.messages);
        }
      } catch { /* silent */ }
    };

    void fetchChat();
    const interval = setInterval(fetchChat, 3000);
    return () => clearInterval(interval);
  }, [showChatDrawer, restaurant.id, table.name]);

  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || chatInput).trim();
    if (!text) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    // Local optimistic update
    setChatMessages(prev => [...prev, { sender: "user" as const, text, time: timeStr }]);
    if (!textToSend) setChatInput("");

    try {
      await axios.post("/api/support", {
        restaurantId: restaurant.id,
        tableName: table.name,
        text,
        sender: "user",
      });

      // Instantly pull updated logs (including any auto-reply triggered on backend)
      const { data } = await axios.get(`/api/support?restaurantId=${restaurant.id}&tableName=${table.name}`);
      if (data && data.messages) {
        setChatMessages(data.messages);
      }
    } catch {
      toast.error("Failed to contact support desk.");
    }
  };

  // Poll order status
  useEffect(() => {
    const selectedOrder = activeOrders.find(o => o.id === selectedOrderId) || placedOrder;
    if (!selectedOrder) return;
    const id = setInterval(async () => {
      try {
        const { data } = await axios.get(`/api/orders/${selectedOrder.id}`);
        if (data.status === "DONE" || data.status === "CANCELLED") {
          setActiveOrders(prev => prev.filter(o => o.id !== selectedOrder.id));
          if (selectedOrderId === selectedOrder.id) {
            setSelectedOrderId(activeOrders[0]?.id ?? null);
          }
          if (placedOrder?.id === selectedOrder.id) {
            setPlacedOrder(null);
          }
        } else {
          placedOrder?.id === selectedOrder.id
            ? setPlacedOrder(p => p ? { ...p, status: data.status } : p)
            : setActiveOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, status: data.status } : o));
        }
      } catch { /* silent */ }
    }, 15000);
    return () => clearInterval(id);
  }, [activeOrders, selectedOrderId, placedOrder]);

  // Reset item modal state on item change
  useEffect(() => {
    if (!selectedItem) return;
    setSelectedVariant(selectedItem.variants[0] ?? null);
    setItemQty(1); setSpiceLevel("Medium"); setAddOns([]); setItemNote(""); setIsFav(false);
  }, [selectedItem]);

  const effectivePrice = selectedVariant ? selectedVariant.price : (selectedItem?.price ?? 0);

  // Derived lists are declared above

  const displayItems = useMemo(() => {
    let base = allItems;
    if (activeCategory === "bestsellers") base = bestsellers;
    else if (activeCategory !== "all")
      base = restaurant.categories.find(c => c.id === activeCategory)?.menuItems ?? [];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      base = allItems.filter(i =>
        i.name.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q) ||
        i.tags.some(t => t.toLowerCase().includes(q)));
    }
    return base;
  }, [searchQuery, activeCategory, allItems, bestsellers, restaurant.categories]);

  // Cart helpers
  function qtyInCart(itemId: string) {
    return cartItems
      .filter(i => i.id === itemId || i.id.startsWith(itemId + "-"))
      .reduce((s, i) => s + i.quantity, 0);
  }

  const handleAddToCart = useCallback(() => {
    if (!selectedItem) return;
    const hasSpice = selectedItem.tags.some(t =>
      ["spicy","curry","masala"].includes(t.toLowerCase()));
    const note = [
      hasSpice ? `Spice: ${spiceLevel}` : null,
      addOns.length ? `Add-ons: ${addOns.join(", ")}` : null,
      itemNote || null,
    ].filter(Boolean).join(" · ") || undefined;

    addItem({
      id: selectedVariant
        ? `${selectedItem.id}-${selectedVariant.id}`
        : selectedItem.id,
      name: selectedVariant
        ? `${selectedItem.name} (${selectedVariant.name})`
        : selectedItem.name,
      price: effectivePrice,
      quantity: itemQty,
      isVeg: selectedItem.isVeg,
      note,
    });
    toast.success(`${selectedItem.name} added!`, {
      style: { background: G, color: "#fff", borderRadius: "16px", fontFamily: "inherit" },
      iconTheme: { primary: "#fff", secondary: G },
    });

    // SMART UPSELL TRIGGER: check if item added is a main food item, then show pairings drawer
    const category = restaurant.categories.find(c =>
      c.menuItems.some(i => i.id === selectedItem.id)
    );
    const catName = category ? category.name.toLowerCase() : "";
    const isExcluded = /drink|beverage|mocktail|juice|shake|dessert|sweet|side|sauce|addon|add-on/i.test(catName) ||
                       /drink|beverage|mocktail|juice|shake|dessert|sweet|side|sauce/i.test(selectedItem.name);
    if (!isExcluded) {
      setLastAddedItem(selectedItem);
      setShowPairingSheet(true);
    }

    setSelectedItem(null);
  }, [selectedItem, spiceLevel, addOns, itemNote, selectedVariant, effectivePrice, itemQty, addItem, restaurant.categories]);

  const handleQuickAdd = (item: MenuItem) => {
    const needsModal = item.variants.length > 0 ||
      item.tags.some(t => ["spicy","curry","masala"].includes(t.toLowerCase()));
    if (needsModal) { setSelectedItem(item); return; }
    addItem({ id: item.id, name: item.name, price: item.price, quantity: 1, isVeg: item.isVeg });
    toast.success(`${item.name} added!`, {
      style: { background: G, color: "#fff", borderRadius: "16px" },
      iconTheme: { primary: "#fff", secondary: G },
    });

    // SMART UPSELL TRIGGER: check if item added is a main food item, then show pairings drawer
    const category = restaurant.categories.find(c =>
      c.menuItems.some(i => i.id === item.id)
    );
    const catName = category ? category.name.toLowerCase() : "";
    const isExcluded = /drink|beverage|mocktail|juice|shake|dessert|sweet|side|sauce|addon|add-on/i.test(catName) ||
                       /drink|beverage|mocktail|juice|shake|dessert|sweet|side|sauce/i.test(item.name);
    if (!isExcluded) {
      setLastAddedItem(item);
      setShowPairingSheet(true);
    }
  };

  // Load Razorpay script lazily
  function loadRazorpayScript(): Promise<boolean> {
    return new Promise(resolve => {
      if ((window as any).Razorpay) { resolve(true); return; }
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload  = () => resolve(true);
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    });
  }

  const handlePlaceOrder = async () => {
    if (!cartItems.length || isPlacing) return;
    setIsPlacing(true);
    try {
      // 1. Create order on server (also creates Razorpay order if ONLINE)
      const { data } = await axios.post("/api/orders", {
        tableToken, restaurantId: restaurant.id, specialNote: orderNote,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        customerEmail: customerEmail.trim() || undefined,
        paymentMethod,
        items: cartItems.map(i => ({
          menuItemId: i.id.split("-")[0],
          quantity: i.quantity, price: i.price, note: i.note,
        })),
      });

      if (paymentMethod === "ONLINE" && data.razorpayOrderId) {
        // 2. Load Razorpay SDK
        const ok = await loadRazorpayScript();
        if (!ok) {
          toast.error("Could not load Razorpay. Check your connection.");
          setIsPlacing(false);
          return;
        }

        // 3. Open Razorpay checkout
        const rzpOptions = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: data.amount,
          currency: data.currency ?? "INR",
          name: restaurant.name,
          description: `Table #${table.name} · ${cartItems.length} item(s)`,
          order_id: data.razorpayOrderId,
          theme: { color: G },
          handler: async (response: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            // 4. Verify signature on server
            try {
              await axios.post("/api/orders/verify", {
                razorpayOrderId:  response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                orderId: data.orderId,
              });
              const newOrder = {
                id: data.orderId,
                orderNumber: data.orderId.substring(0, 8).toUpperCase(),
                status: "NEW",
              };
              setPlacedOrder(newOrder);
              setActiveOrders(prev => [...prev, newOrder]);
              setSelectedOrderId(data.orderId);
              setLastOrderId(data.orderId);
              if (typeof window !== "undefined") {
                localStorage.setItem(`tablescan_last_order_${tableToken}`, data.orderId);
              }
              clearCart(); setShowCartDrawer(false);
              toast.success("Payment successful! 🎉", {
                style: { background: G, color: "#fff", borderRadius: "16px" },
              });
            } catch {
              toast.error("Payment verification failed. Contact staff.");
            } finally {
              setIsPlacing(false);
            }
          },
          modal: {
            ondismiss: () => {
              toast("Payment cancelled.", { icon: "ℹ️" });
              setIsPlacing(false);
            },
          },
        };
        const rzp = new (window as any).Razorpay(rzpOptions);
        rzp.open();
        // isPlacing will be reset inside handler / ondismiss
        return;
      }

      // CASH path
      const newOrder = {
        id: data.orderId,
        orderNumber: data.orderId.substring(0, 8).toUpperCase(),
        status: "NEW",
      };
      setPlacedOrder(newOrder);
      setActiveOrders(prev => [...prev, newOrder]);
      setSelectedOrderId(data.orderId);
      setLastOrderId(data.orderId);
      if (typeof window !== "undefined") {
        localStorage.setItem(`tablescan_last_order_${tableToken}`, data.orderId);
      }
      clearCart(); setShowCartDrawer(false);
      toast.success("Order placed! 🎉", {
        style: { background: G, color: "#fff", borderRadius: "16px" },
      });
    } catch (e) {
      toast.error("Failed to place order. Please try again.");
    } finally {
      setIsPlacing(false);
    }
  };

  // ── Placed order success screen (only for orders placed THIS session) ────
  const trackOrder = placedOrder;          // never hijack with a pre-existing activeOrder
  if (trackOrder) {
    const steps = [
      { label: "Order Received",    icon: "🧾", desc: "Your order has been received" },
      { label: "Preparing",         icon: "👨‍🍳", desc: "Our chef is cooking your food" },
      { label: "Quality Check",     icon: "🔍", desc: "Quality verified – almost ready!" },
      { label: "Served",            icon: "🏁", desc: `Delivered to Table ${table.name}` },
    ];
    const statusMap: Record<string,number> = { NEW:0, PREPARING:1, READY:2, DONE:3 };
    const currentStep = statusMap[trackOrder.status] ?? 0;

    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm bg-white rounded-[28px] shadow-xl p-8 space-y-6">
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 12, stiffness: 150 }}
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto text-4xl"
            style={{ background: `${G}20` }}
          >
            ✅
          </motion.div>
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold text-gray-900">Order Confirmed!</h2>
            <p className="text-xs font-semibold text-[#3D7A5A] bg-[#3D7A5A]/10 px-3 py-1 rounded-full w-fit mx-auto">
              #{trackOrder.orderNumber}
            </p>
          </div>
          <div className="space-y-4">
            {steps.map((s, i) => {
              const done   = i < currentStep;
              const active = i === currentStep;
              return (
                <div key={i} className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0
                    ${done ? "bg-[#3D7A5A] text-white" : active ? "bg-[#3D7A5A]/15 border-2 border-[#3D7A5A]" : "bg-gray-100"}`}>
                    {done ? <Check className="w-4 h-4 stroke-[3]" /> : <span>{s.icon}</span>}
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${active ? "text-[#3D7A5A]" : done ? "text-gray-900" : "text-gray-400"}`}>
                      {s.label}
                    </p>
                    <p className="text-xs text-gray-400">{s.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="space-y-2.5">
            {trackOrder.status === "DONE" && (
              <button
                onClick={() => {
                  router.push(`/${slug}/${tableToken}/order-status?orderId=${trackOrder.id}&showReceipt=true`);
                }}
                className="w-full py-3.5 rounded-2xl text-white text-sm font-extrabold flex items-center justify-center gap-2 shadow-lg"
                style={{ background: G }}
              >
                🧾 View Bill Receipt
              </button>
            )}
            <button
              onClick={() => {
                if (placedOrder) {
                  setActiveOrders(prev => [...prev, placedOrder]);
                  setSelectedOrderId(placedOrder.id);
                }
                setPlacedOrder(null);
                setShowOrderBanner(true);
              }}
              className={`w-full py-3.5 rounded-2xl text-sm font-bold ${
                trackOrder.status === "DONE"
                  ? "bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold"
                  : "text-white"
              }`}
              style={trackOrder.status === "DONE" ? {} : { background: G }}
            >
              Continue Ordering
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Category list ────────────────────────────────────────────────────────
  const categories = [
    { id: "all",         name: "All" },
    { id: "bestsellers", name: "Popular" },
    ...restaurant.categories.map(c => ({ id: c.id, name: c.name })),
  ];

  // ── MAIN RENDER ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-32" style={{ fontFamily: "var(--font-poppins, 'Poppins', sans-serif)" }}>

      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div className="bg-white px-5 pt-6 pb-4 sticky top-0 z-30 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        {/* Row 1: greeting + icons */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-gray-400 font-medium">Hi, Diner! 👋</p>
            <h1 className="text-[22px] font-extrabold text-gray-900 leading-tight">
              Find your best food<br />
              <span className="text-[#3D7A5A]">Order & Eat</span> 😎
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSearch(s => !s)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all
                ${showSearch ? "bg-[#3D7A5A] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Support Chat Button */}
            <button
              onClick={() => setShowChatDrawer(true)}
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all"
              title="Support Chat"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
            {totalItems > 0 && (
              <button
                onClick={() => setShowCartDrawer(true)}
                className="relative w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 text-gray-500 hover:bg-gray-200"
              >
                <ShoppingBag className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-white text-[9px] font-black flex items-center justify-center"
                  style={{ background: G }}>
                  {totalItems}
                </span>
              </button>
            )}
            <button
              onClick={() => toast.success(`Waiter called to Table ${table.name} 🔔`, {
                style: { background: "#222", color: "#fff", borderRadius: "14px" }
              })}
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 text-gray-500 hover:bg-gray-200"
            >
              <BellRing className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Table badge */}
        <div className="flex items-center gap-1.5 mb-3">
          <span className="text-xs font-bold px-3 py-1 rounded-full text-white" style={{ background: G }}>
            Table #{table.name}
          </span>
        </div>

        {/* Search field */}
        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-3"
            >
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search your food..."
                  className="w-full bg-gray-100 rounded-2xl pl-9 pr-9 py-2.5 text-sm text-gray-800
                    placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3D7A5A]/30"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-5 px-5">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`whitespace-nowrap flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border transition-all
                ${activeCategory === cat.id
                  ? "text-white border-transparent shadow-sm"
                  : "bg-white border-gray-200 text-gray-500 hover:border-[#3D7A5A]/40"}`}
              style={activeCategory === cat.id ? { background: G, borderColor: G } : {}}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Body ────────────────────────────────────────────────────────── */}
      <div className="px-5 pt-5 space-y-6">

        {/* ── Active order status banner (pre-existing order, non-blocking) ── */}
        <AnimatePresence>
          {(activeOrders.length > 0 || sessionOrderIds.length > 0) && showOrderBanner && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="bg-[#3D7A5A] text-white rounded-2xl shadow-md overflow-hidden"
            >
              {/* Main banner - clickable to view order status */}
              <div
                onClick={() => {
                  const targetId = selectedOrderId || sessionOrderIds[sessionOrderIds.length - 1];
                  router.push(`/${slug}/${tableToken}/order-status?orderId=${targetId}`);
                }}
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#3D7A5A]/95 transition-all duration-200"
              >
                <span className="text-lg">🍳</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold">
                    {activeOrders.length > 1 ? `${activeOrders.length} Active Orders!` : "Order in progress!"}
                  </p>
                  <p className="text-[10px] opacity-80 truncate">
                    {activeOrders.length > 1 
                      ? "Tap to trace all active dining orders"
                      : (() => {
                          const order = activeOrders.find(o => o.id === selectedOrderId) || activeOrders[0];
                          return `#${order?.orderNumber || ""} · ${order?.status === "NEW" ? "Received" : order?.status === "PREPARING" ? "Being prepared" : "Almost ready"}`;
                        })()}
                  </p>
                </div>
                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <ChevronRight className="w-4 h-4 text-white" />
                </div>
              </div>

              {/* Multiple orders selector - shown when there are multiple orders */}
              {activeOrders.length > 1 && (
                <div className="px-4 pb-3 pt-1 border-t border-white/10">
                  <p className="text-[9px] font-black opacity-70 uppercase tracking-widest mb-2">
                    Switch Order
                  </p>
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                    {activeOrders.map((order) => (
                      <button
                        key={order.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrderId(order.id);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all duration-200 flex-shrink-0 flex items-center gap-1.5 border ${
                          selectedOrderId === order.id
                            ? "bg-white text-[#3D7A5A] border-transparent shadow-sm"
                            : "bg-white/10 text-white border-white/20 hover:bg-white/20"
                        }`}
                      >
                        <span>#{order.orderNumber.substring(order.orderNumber.length - 4)}</span>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          order.status === "DONE" ? "bg-emerald-400" : order.status === "CANCELLED" ? "bg-red-400" : "bg-orange-400 animate-pulse"
                        }`} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── "Special for you" banner ──────────────────────────────────── */}
        {spotlightItem && !searchQuery && activeCategory === "all" && (
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
              Special for you
            </p>
            <div
              className="bg-white rounded-[24px] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.07)]
                flex items-center gap-4 relative overflow-hidden cursor-pointer"
              onClick={() => setSelectedItem(spotlightItem)}
            >
              {/* Green decorative blob */}
              <div className="absolute -right-4 -top-4 w-28 h-28 rounded-full opacity-5"
                style={{ background: G }} />

              {/* Circular food image */}
              <div className="w-20 h-20 rounded-full flex-shrink-0 overflow-hidden bg-gray-50
                border-2 border-white shadow-md flex items-center justify-center">
                {spotlightItem.image ? (
                  <img src={spotlightItem.image} alt={spotlightItem.name}
                    className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl">🍽️</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-red-500 mb-0.5">
                  Only today 25% OFF!
                </p>
                <h3 className="text-sm font-bold text-gray-900 truncate">{spotlightItem.name}</h3>
                <p className="text-xs text-gray-400 truncate mt-0.5">
                  {spotlightItem.description ?? "Chef's special pick"}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs text-gray-300 line-through">
                    ₹{(spotlightItem.price * 1.33).toFixed(0)}
                  </span>
                  <span className="text-sm font-extrabold" style={{ color: G }}>
                    ₹{spotlightItem.price}
                  </span>
                </div>
              </div>

              {/* Add button */}
              <button
                onClick={e => { e.stopPropagation(); handleQuickAdd(spotlightItem); }}
                className="w-9 h-9 rounded-full flex items-center justify-center text-white flex-shrink-0
                  shadow-md active:scale-95 transition-transform"
                style={{ background: G }}
              >
                <Plus className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        )}

        {/* ── Popular / Category items ───────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-base font-extrabold text-gray-900">
              {activeCategory === "all" ? "Popular" :
               activeCategory === "bestsellers" ? "Bestsellers" :
               restaurant.categories.find(c => c.id === activeCategory)?.name ?? "Menu"}
            </p>
            <button
              onClick={() => {}}
              className="text-xs font-semibold"
              style={{ color: G }}
            >
              See all
            </button>
          </div>

          {displayItems.length === 0 && (
            <div className="text-center py-16 text-gray-300">
              <Utensils className="w-10 h-10 mx-auto mb-2" />
              <p className="text-sm font-semibold">No items found</p>
            </div>
          )}

          <div className="space-y-3">
            {displayItems.map(item => {
              const qty      = qtyInCart(item.id);
              const calories = getCalories(item);
              const popular  = item.tags.some(t =>
                ["bestseller","top","chef special","must try"].includes(t.toLowerCase()));

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-[20px] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)]
                    flex items-center gap-4"
                >
                  {/* Left: text */}
                  <div className="flex-1 min-w-0 space-y-1 cursor-pointer"
                    onClick={() => setSelectedItem(item)}>
                    <div className="flex items-center gap-1.5">
                      <VegBadge isVeg={item.isVeg} />
                      {popular && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded
                          bg-amber-50 text-amber-600 border border-amber-200">
                          ⭐ Popular
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-gray-900 truncate">{item.name}</h4>
                    <p className="text-[11px] text-gray-400 truncate">
                      {item.description ?? "Freshly prepared just for you"}
                    </p>
                    <p className="text-[10px] font-semibold text-red-400 flex items-center gap-0.5">
                      <Flame className="w-3 h-3" />
                      {calories} Calories
                    </p>
                    <p className="text-sm font-extrabold" style={{ color: G }}>
                      ₹{item.price}
                    </p>
                  </div>

                  {/* Right: circular image + add button */}
                  <div className="relative flex-shrink-0">
                    <div
                      className="w-[78px] h-[78px] rounded-full overflow-hidden bg-gray-50
                        border-2 border-white shadow-md flex items-center justify-center cursor-pointer"
                      onClick={() => setSelectedItem(item)}
                    >
                      {item.image ? (
                        <img src={item.image} alt={item.name}
                          className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-3xl">🍽️</span>
                      )}
                    </div>
                    {/* Overlapping add / qty toggle */}
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                      {qty > 0 ? (
                        <div className="flex items-center gap-1.5 bg-white border border-[#3D7A5A]/30
                          rounded-2xl px-2 py-1 shadow-md">
                          <button onClick={() => updateQuantity(item.id, Math.max(0, qty - 1))}
                            className="w-5 h-5 rounded-full flex items-center justify-center text-white"
                            style={{ background: G }}>
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-[11px] font-black text-gray-800 w-3 text-center">
                            {qty}
                          </span>
                          <button onClick={() => updateQuantity(item.id, qty + 1)}
                            className="w-5 h-5 rounded-full flex items-center justify-center text-white"
                            style={{ background: G }}>
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleQuickAdd(item)}
                          className="w-8 h-8 rounded-full text-white flex items-center justify-center
                            shadow-lg active:scale-95 transition-transform"
                          style={{ background: G }}
                        >
                          <Plus className="w-4 h-4 text-white" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Floating Cart Button ─────────────────────────────────────────── */}
      <AnimatePresence>
        {totalItems > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40"
          >
            <button
              onClick={() => setShowCartDrawer(true)}
              className="flex items-center gap-3 pl-4 pr-5 py-3.5 rounded-2xl text-white shadow-xl
                active:scale-95 transition-transform"
              style={{ background: G }}
            >
              <span className="w-6 h-6 rounded-xl bg-white/20 flex items-center justify-center
                text-[11px] font-black">
                {totalItems}
              </span>
              <span className="text-sm font-bold">View Cart</span>
              <span className="text-sm font-bold ml-1">· ₹{subtotal.toFixed(0)}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Floating Order Tracker Button ────────────────────────────────── */}
      <AnimatePresence>
        {(activeOrders.length > 0 || sessionOrderIds.length > 0) && (
          <motion.div
            layout
            initial={{ scale: 0, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0, y: 50 }}
            className={`fixed right-6 z-40 transition-all duration-300 ${
              totalItems > 0 ? "bottom-24" : "bottom-6"
            }`}
          >
            <button
              onClick={() => {
                const targetId = selectedOrderId || sessionOrderIds[sessionOrderIds.length - 1];
                router.push(`/${slug}/${tableToken}/order-status?orderId=${targetId}`);
              }}
              className="flex items-center gap-2 px-4 py-3.5 rounded-2xl text-white shadow-xl
                active:scale-95 transition-transform border border-white/10 font-bold text-xs"
              style={{ background: G }}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
              <span>
                {sessionOrderIds.length > 1 
                  ? `Track ${sessionOrderIds.length} Orders` 
                  : "Track Order"}
              </span>
              <span className="text-sm">🍳</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Product Detail Sheet ─────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-end" onClick={() => setSelectedItem(null)}>
            <div className="absolute inset-0 bg-black/50" />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="relative w-full bg-[#FAFAFA] rounded-t-[32px] max-h-[92vh] flex flex-col overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Header strip */}
              <div className="bg-white px-5 py-4 flex items-center justify-between border-b border-gray-100">
                <button onClick={() => setSelectedItem(null)}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <ArrowLeft className="w-4 h-4 text-gray-600" />
                </button>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Item Details
                </span>
                <button onClick={() => setIsFav(v => !v)}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <Heart className={`w-4 h-4 ${isFav ? "fill-rose-500 text-rose-500" : "text-gray-400"}`} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {/* Large circular food image */}
                <div className="bg-white pb-6 flex flex-col items-center pt-6 px-5">
                  <div className="w-44 h-44 rounded-full overflow-hidden bg-gray-50
                    border-4 border-white shadow-xl flex items-center justify-center">
                    {selectedItem.image ? (
                      <img src={selectedItem.image} alt={selectedItem.name}
                        className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-7xl">🍽️</span>
                    )}
                  </div>

                  {/* Name & price */}
                  <div className="text-center mt-5 space-y-1">
                    <div className="flex items-center justify-center gap-2">
                      <VegBadge isVeg={selectedItem.isVeg} />
                      <h2 className="text-xl font-extrabold text-gray-900">{selectedItem.name}</h2>
                    </div>
                    {selectedItem.description && (
                      <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
                        {selectedItem.description}
                      </p>
                    )}
                    <p className="text-2xl font-black mt-2" style={{ color: G }}>
                      ₹{(effectivePrice * itemQty).toFixed(0)}
                    </p>
                  </div>

                  {/* Qty stepper – green square buttons matching mockup */}
                  <div className="flex items-center gap-4 mt-4">
                    <button
                      onClick={() => setItemQty(q => Math.max(1, q - 1))}
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-lg"
                      style={{ background: G }}
                    >
                      −
                    </button>
                    <span className="text-xl font-black text-gray-900 w-6 text-center">
                      {itemQty}
                    </span>
                    <button
                      onClick={() => setItemQty(q => q + 1)}
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-lg"
                      style={{ background: G }}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="px-5 py-4 space-y-5">
                  {/* Ingredients pills */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Ingredients
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {getIngredients(selectedItem).map(ing => (
                        <span key={ing.name}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-2xl
                            border border-gray-100 shadow-sm text-xs font-semibold text-gray-700">
                          {ing.emoji} {ing.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Variants */}
                  {selectedItem.variants.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Size / Option
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedItem.variants.map(v => (
                          <button key={v.id} onClick={() => setSelectedVariant(v)}
                            className={`px-4 py-3 rounded-2xl border text-sm transition-all text-left
                              ${selectedVariant?.id === v.id
                                ? "border-transparent text-white font-bold"
                                : "bg-white border-gray-200 text-gray-600"}`}
                            style={selectedVariant?.id === v.id
                              ? { background: G } : {}}
                          >
                            <span className="block font-semibold">{v.name}</span>
                            <span className="text-xs mt-0.5 block opacity-80">₹{v.price}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Spice level */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                      🌶️ Spice Level
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {SPICE_LEVELS.map(lv => (
                        <button key={lv} onClick={() => setSpiceLevel(lv)}
                          className={`px-4 py-2 rounded-2xl border text-xs font-semibold transition-all
                            ${spiceLevel === lv
                              ? "border-transparent text-white"
                              : "bg-white border-gray-200 text-gray-500"}`}
                          style={spiceLevel === lv ? { background: G } : {}}>
                          {lv}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Add-ons */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      ➕ Add-ons
                    </p>
                    <div className="space-y-2">
                      {[
                        { name: "Extra Cheese", price: 49 },
                        { name: "Garlic Bread", price: 79 },
                        { name: "Extra Sauce",  price: 29 },
                      ].map(a => {
                        const active = addOns.includes(a.name);
                        return (
                          <button key={a.name}
                            onClick={() => setAddOns(prev =>
                              prev.includes(a.name)
                                ? prev.filter(x => x !== a.name)
                                : [...prev, a.name])}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl
                              border text-sm transition-all
                              ${active ? "border-transparent text-white" : "bg-white border-gray-200 text-gray-700"}`}
                            style={active ? { background: G } : {}}>
                            <span className="font-medium">{a.name}</span>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs ${active ? "text-white/80" : "text-gray-400"}`}>
                                +₹{a.price}
                              </span>
                              {active && <Check className="w-4 h-4" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Special note */}
                  <div className="space-y-2 pb-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      📝 Special Instructions
                    </p>
                    <input
                      type="text" value={itemNote}
                      onChange={e => setItemNote(e.target.value)}
                      placeholder="e.g. less spicy, no onions…"
                      className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm
                        text-gray-800 placeholder-gray-300 focus:outline-none focus:border-[#3D7A5A]
                        transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Sticky CTA */}
              <div className="bg-white px-5 py-4 border-t border-gray-100">
                <button
                  onClick={handleAddToCart}
                  className="w-full py-4 rounded-2xl text-white font-bold text-sm tracking-wide
                    shadow-lg active:scale-95 transition-transform"
                  style={{ background: G }}
                >
                  ADD TO CART · ₹{(effectivePrice * itemQty).toFixed(0)}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Support Chat Drawer ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showChatDrawer && (
          <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowChatDrawer(false)}>
            <div className="absolute inset-0 bg-black/50" />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="relative w-full bg-[#FAFAFA] rounded-t-[32px] max-h-[85vh] flex flex-col overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-white px-5 py-4 flex items-center justify-between border-b border-gray-100 flex-shrink-0">
                <button onClick={() => setShowChatDrawer(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <ArrowLeft className="w-4 h-4 text-gray-600" />
                </button>
                <div className="text-center">
                  <span className="text-sm font-extrabold text-gray-900 block">Table Support Chat</span>
                  <div className="flex items-center gap-1 justify-center mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#3D7A5A] animate-pulse" />
                    <span className="text-[10px] font-bold text-[#3D7A5A] uppercase tracking-wider">Live assistant</span>
                  </div>
                </div>
                <div className="w-8 h-8 flex-shrink-0" /> {/* Spacer */}
              </div>

              {/* Chat Viewport */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {chatMessages.map((msg, index) => {
                  const isStaff = msg.sender === "staff";
                  return (
                    <div key={index} className={`flex ${isStaff ? "justify-start" : "justify-end"}`}>
                      <div className={`max-w-[75%] rounded-[20px] px-4 py-3 shadow-sm ${
                        isStaff ? "bg-white text-gray-800 rounded-tl-sm" : "text-white rounded-tr-sm"
                      }`} style={!isStaff ? { background: G } : {}}>
                        <p className="text-xs font-medium leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                        <span className={`text-[9px] block text-right mt-1.5 font-bold ${
                          isStaff ? "text-gray-400" : "text-white/60"
                        }`}>{msg.time}</span>
                      </div>
                    </div>
                  );
                })}

                {/* Simulated typing indicator */}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white max-w-[70%] rounded-[20px] rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Drawer Actions & Inputs */}
              <div className="bg-white border-t border-gray-100 p-4 space-y-3 flex-shrink-0">
                {/* Quick actions slider */}
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                  {[
                    "🥛 Need water / glasses",
                    "🍴 Need extra cutlery",
                    "👨‍🍳 Customise my cooking",
                    "💳 Razorpay payment issue",
                    "🤵 Call floor manager",
                  ].map(act => (
                    <button
                      key={act}
                      onClick={() => handleSendMessage(act)}
                      className="whitespace-nowrap flex-shrink-0 px-3 py-1.5 bg-gray-50 border border-gray-100
                        rounded-xl text-[11px] font-bold text-gray-600 hover:bg-gray-100 active:scale-95 transition-all"
                    >
                      {act}
                    </button>
                  ))}
                </div>

                {/* Text input area */}
                <form
                  onSubmit={e => { e.preventDefault(); handleSendMessage(); }}
                  className="flex items-center gap-2"
                >
                  <input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    placeholder="Type your message here..."
                    className="flex-1 bg-gray-50 rounded-2xl px-4 py-3 text-xs text-gray-800 placeholder-gray-400
                      border border-transparent focus:outline-none focus:border-[#3D7A5A]/30 focus:ring-1 focus:ring-[#3D7A5A]/30"
                  />
                  <button
                    type="submit"
                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-white active:scale-95 transition-all flex-shrink-0"
                    style={{ background: G }}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Cart Drawer ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showCartDrawer && (
          <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowCartDrawer(false)}>
            <div className="absolute inset-0 bg-black/50" />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="relative w-full bg-[#FAFAFA] rounded-t-[32px] max-h-[85vh] flex flex-col overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Drawer handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-gray-200" />
              </div>

              {/* Header */}
              <div className="px-5 pb-3 pt-2 flex items-center justify-between border-b border-gray-100 bg-white">
                <h2 className="text-base font-extrabold text-gray-900">Your Order</h2>
                <button onClick={() => setShowCartDrawer(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              {/* Items */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {cartItems.map(item => (
                  <div key={item.id}
                    className="bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.05)]
                      flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{item.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">₹{item.price} each</p>
                      {item.note && (
                        <p className="text-[10px] text-gray-400 mt-0.5 truncate">{item.note}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-2 py-1">
                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="text-gray-400 hover:text-gray-700">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-black text-gray-800 w-4 text-center">
                          {item.quantity}
                        </span>
                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="text-gray-400 hover:text-gray-700">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="text-sm font-bold text-gray-800 w-12 text-right">
                        ₹{(item.price * item.quantity).toFixed(0)}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Customer Details */}
                <div className="bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.05)] space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base">👤</span>
                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Your Details</p>
                    <span className="text-[9px] bg-red-50 text-red-400 border border-red-100 font-bold px-1.5 py-0.5 rounded-full ml-auto">
                      Required
                    </span>
                  </div>

                  {/* Name */}
                  <div className="relative">
                    <label className="text-[10px] font-semibold text-gray-400 mb-1 block">Full Name *</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className={`w-full bg-gray-50 border rounded-xl px-3 py-2.5 text-sm
                        text-gray-800 placeholder-gray-300 focus:outline-none transition-all
                        ${customerName.trim() ? "border-[#3D7A5A]/40" : "border-gray-200 focus:border-[#3D7A5A]"}`}
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="text-[10px] font-semibold text-gray-400 mb-1 block">Phone Number *</label>
                    <div className="flex gap-2">
                      <span className="flex items-center px-3 bg-gray-100 border border-gray-200 rounded-xl text-xs font-semibold text-gray-500 flex-shrink-0">
                        🇮🇳 +91
                      </span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        value={customerPhone}
                        onChange={e => setCustomerPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        placeholder="9876543210"
                        className={`flex-1 bg-gray-50 border rounded-xl px-3 py-2.5 text-sm
                          text-gray-800 placeholder-gray-300 focus:outline-none transition-all
                          ${customerPhone.length === 10 ? "border-[#3D7A5A]/40" : "border-gray-200 focus:border-[#3D7A5A]"}`}
                      />
                    </div>
                  </div>

                  {/* Email (optional) */}
                  <div>
                    <label className="text-[10px] font-semibold text-gray-400 mb-1 block">
                      Email <span className="text-gray-300 font-normal">(optional — for receipt)</span>
                    </label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={e => setCustomerEmail(e.target.value)}
                      placeholder="rahul@example.com"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                        text-gray-800 placeholder-gray-300 focus:outline-none focus:border-[#3D7A5A] transition-all"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
                  <p className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">
                    📝 Kitchen Notes
                  </p>
                  <input
                    value={orderNote}
                    onChange={e => setOrderNote(e.target.value)}
                    placeholder="Any requests for the kitchen…"
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs
                      text-gray-700 placeholder-gray-300 focus:outline-none focus:border-[#3D7A5A]"
                  />
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="px-5 pb-4 space-y-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">💳 Payment Method</p>
                <div className="grid grid-cols-2 gap-3">
                  {/* Cash */}
                  <button
                    onClick={() => setPaymentMethod("CASH")}
                    className={`flex flex-col items-center justify-center gap-2 py-4 rounded-2xl
                      border-2 transition-all duration-200
                      ${paymentMethod === "CASH"
                        ? "border-[#3D7A5A] bg-[#3D7A5A]/8 shadow-sm"
                        : "border-gray-100 bg-white hover:border-gray-200"}`}
                  >
                    <span className="text-2xl">💵</span>
                    <span className={`text-xs font-bold ${
                      paymentMethod === "CASH" ? "text-[#3D7A5A]" : "text-gray-500"}`}>
                      Pay at Counter
                    </span>
                    {paymentMethod === "CASH" && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#3D7A5A]" />
                    )}
                  </button>

                  {/* Razorpay */}
                  <button
                    onClick={() => setPaymentMethod("ONLINE")}
                    className={`flex flex-col items-center justify-center gap-2 py-4 rounded-2xl
                      border-2 transition-all duration-200 relative overflow-hidden
                      ${paymentMethod === "ONLINE"
                        ? "border-[#3D7A5A] bg-[#3D7A5A]/8 shadow-sm"
                        : "border-gray-100 bg-white hover:border-gray-200"}`}
                  >
                    {/* Razorpay wordmark */}
                    <div className="flex items-center gap-1">
                      <span className="text-[15px] font-black tracking-tight"
                        style={{ color: paymentMethod === "ONLINE" ? G : "#528FF0" }}>
                        razor
                      </span>
                      <span className="text-[15px] font-black tracking-tight text-gray-800">
                        pay
                      </span>
                    </div>
                    <span className={`text-[10px] font-semibold ${
                      paymentMethod === "ONLINE" ? "text-[#3D7A5A]" : "text-gray-400"}`}>
                      UPI · Cards · Netbanking
                    </span>
                    {paymentMethod === "ONLINE" && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#3D7A5A]" />
                    )}
                  </button>
                </div>

                {/* Razorpay info hint */}
                <AnimatePresence>
                  {paymentMethod === "ONLINE" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-[#3D7A5A]/6 rounded-2xl p-3 flex items-start gap-3"
                    >
                      <span className="text-lg mt-0.5">🔒</span>
                      <p className="text-[11px] text-[#3D7A5A] font-semibold leading-relaxed">
                        Secure payment via Razorpay. Supports UPI, credit/debit cards, net banking &amp; wallets.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Bill breakdown + CTA */}
              <div className="bg-white px-5 pt-4 pb-6 border-t border-gray-100 space-y-3">
                <div className="space-y-1.5 text-xs text-gray-500">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="text-gray-800 font-semibold">₹{subtotal.toFixed(0)}</span>
                  </div>
                  {restaurant.taxPercent > 0 && (
                    <div className="flex justify-between">
                      <span>GST ({restaurant.taxPercent}%)</span>
                      <span className="text-gray-800 font-semibold">₹{tax.toFixed(0)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-extrabold text-sm pt-2
                    border-t border-gray-100">
                    <span className="text-gray-900">Total</span>
                    <span style={{ color: G }}>₹{grandTotal.toFixed(0)}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setShowCartDrawer(false)}
                    className="py-3.5 rounded-2xl border border-gray-200 text-sm font-semibold
                      text-gray-500 hover:bg-gray-50 transition-all">
                    Keep Ordering
                  </button>
                  <button
                    onClick={handlePlaceOrder}
                    disabled={isPlacing || !customerName.trim() || customerPhone.length < 10}
                    className="py-3.5 rounded-2xl text-white text-sm font-bold shadow-md
                      active:scale-95 transition-all disabled:opacity-40 flex items-center
                      justify-center gap-2"
                    style={{ background: G }}
                  >
                    {isPlacing ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/40 border-t-white
                          rounded-full animate-spin" />
                        Placing…
                      </>
                    ) : !customerName.trim() || customerPhone.length < 10 ? (
                      <>Fill your details above ↑</>
                    ) : (
                      <>{paymentMethod === "CASH" ? "💵 Place Order" : "🔒 Pay with Razorpay"}</>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Interactive Drink Pairing & Smart Upselling Sheet ───────────── */}
      <AnimatePresence>
        {showPairingSheet && lastAddedItem && pairingItems.length > 0 && (
          <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowPairingSheet(false)}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="relative w-full bg-white rounded-t-[32px] max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              {/* Decorative handle bar */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-12 h-1.5 rounded-full bg-gray-200" />
              </div>

              {/* Header section with cute gamified sparks */}
              <div className="px-6 pt-3 pb-4 text-center border-b border-gray-100 relative bg-gradient-to-b from-[#3D7A5A]/5 to-transparent">
                <div className="absolute top-2 right-6 text-xl animate-bounce">✨</div>
                <div className="absolute top-4 left-6 text-lg animate-pulse">🥤</div>
                
                <h3 className="text-lg font-black text-gray-900 tracking-tight flex items-center justify-center gap-1.5">
                  Chef's Perfect Pairing! 🍳
                </h3>
                <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto leading-relaxed">
                  Diners who ordered <strong className="text-[#3D7A5A]">{lastAddedItem.name}</strong> loved pairing it with these handpicked selections!
                </p>
              </div>

              {/* Upsell choices */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                <div className="space-y-3">
                  {pairingItems.map(item => {
                    const alreadyInCart = qtyInCart(item.id) > 0;
                    const calories = getCalories(item);
                    return (
                      <motion.div
                        key={item.id}
                        whileHover={{ y: -2 }}
                        className={`flex items-center gap-4 p-3.5 bg-[#FAFAFA] rounded-[24px] border-2 transition-all duration-200 ${
                          alreadyInCart ? "border-[#3D7A5A]/30 bg-[#3D7A5A]/2" : "border-gray-100"
                        }`}
                      >
                        {/* Circular Image with nice fallback emoji */}
                        <div className="w-16 h-16 rounded-full overflow-hidden bg-white border-2 border-white shadow-md flex-shrink-0 flex items-center justify-center">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-2xl">🥤</span>
                          )}
                        </div>

                        {/* Text / details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <VegBadge isVeg={item.isVeg} />
                            <span className="text-[9px] font-extrabold text-[#3D7A5A] bg-[#3D7A5A]/10 px-1.5 py-0.5 rounded">
                              RECOMMENDED
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-gray-900 truncate">{item.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-extrabold" style={{ color: G }}>
                              ₹{item.price}
                            </span>
                            <span className="text-[10px] text-gray-400">· {calories} kcal</span>
                          </div>
                        </div>

                        {/* Fast Quick Add Button with checkmark states */}
                        <div className="flex-shrink-0">
                          {alreadyInCart ? (
                            <div className="flex items-center gap-1.5 bg-[#3D7A5A] text-white rounded-full px-3.5 py-1.5 text-xs font-bold shadow-sm">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Added</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                handleQuickAdd(item);
                              }}
                              className="flex items-center gap-1 bg-gray-900 text-white rounded-full px-3.5 py-1.5 text-xs font-bold hover:bg-gray-800 transition-all active:scale-95 shadow-md"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add</span>
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons: Dismiss & Checkout */}
              <div className="bg-white border-t border-gray-100 p-5 space-y-3 flex-shrink-0">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setShowPairingSheet(false)}
                    className="py-3.5 rounded-2xl border border-gray-200 text-xs font-bold text-gray-500 hover:bg-gray-50 transition-all"
                  >
                    No thanks, close
                  </button>
                  <button
                    onClick={() => {
                      setShowPairingSheet(false);
                      setShowCartDrawer(true);
                    }}
                    className="py-3.5 rounded-2xl text-white text-xs font-bold shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-1.5"
                    style={{ background: G }}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>View Cart &amp; Checkout</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
