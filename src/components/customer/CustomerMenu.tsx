"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Home as HomeIcon,
  UtensilsCrossed,
  Receipt,
  Tag,
  User,
  Search,
  SlidersHorizontal,
  Heart,
  Plus,
  Minus,
  Check,
  Clock,
  Star,
  ShoppingBag,
  Bell,
  Menu as MenuIcon,
  X,
  ChevronRight,
  Flame,
  Sparkles,
  Info,
  Copy,
  Phone,
  MapPin,
  Share2,
  CheckCircle2,
  ArrowRight,
  Filter,
} from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import AIChatWidget from "./AIChatWidget";
import {
  DEFAULT_THEME,
  DEFAULT_BANNER_SLIDES,
  DEFAULT_OFFERS,
  PromoBanner,
  PromoOffer,
} from "@/lib/restaurantTheme";

// ─── Interfaces ─────────────────────────────────────────────────────────────
interface Variant {
  id: string;
  name: string;
  price: number;
}

interface MenuItem {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  isVeg: boolean;
  image?: string | null;
  tags: string[];
  variants: Variant[];
}

interface Category {
  id: string;
  name: string;
  image?: string | null;
  menuItems: MenuItem[];
}

interface Restaurant {
  id: string;
  name: string;
  slug?: string;
  logo?: string | null;
  description?: string | null;
  phone?: string | null;
  taxPercent: number;
  categories: Category[];
}

interface Table {
  id: string;
  name: string;
  qrToken: string;
  location?: { name: string } | null;
  capacity?: number | null;
}

interface ActiveOrder {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount?: number;
  items?: Array<{ name: string; quantity: number; price: number }>;
}

export default function CustomerMenu({
  restaurant,
  table,
  slug,
  tableToken,
  activeOrders: initialActiveOrders = [],
}: {
  restaurant: Restaurant;
  table: Table;
  slug: string;
  tableToken: string;
  activeOrders?: ActiveOrder[];
}) {
  const router = useRouter();
  const { addItem, items, updateQuantity, removeItem, clearCart, getTotalItems, getTotalPrice, setTableInfo } =
    useCartStore();

  // Hydration state
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    setTableInfo(slug, tableToken);
  }, [slug, tableToken, setTableInfo]);

  // Active navigation tab: "home" | "menu" | "orders" | "offers" | "profile"
  const [activeTab, setActiveTab] = useState<"home" | "menu" | "orders" | "offers" | "profile">("home");

  // UI Drawer & Modal States
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [showNavDrawer, setShowNavDrawer] = useState(false);
  const [selectedItemModal, setSelectedItemModal] = useState<MenuItem | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [filterVegOnly, setFilterVegOnly] = useState<boolean | null>(null);
  const [filterSpicyOnly, setFilterSpicyOnly] = useState(false);
  const [filterBestsellerOnly, setFilterBestsellerOnly] = useState(false);
  const [filterMaxPrice, setFilterMaxPrice] = useState<number>(1000);
  const [activeCategory, setActiveCategory] = useState("all");

  // Wishlist / Favorites state
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const toggleFavorite = (itemId: string, name: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
        toast("Removed from favorites", { icon: "🤍" });
      } else {
        next.add(itemId);
        toast.success(`Saved ${name} to favorites! ❤️`);
      }
      return next;
    });
  };

  // Item customization modal state
  const [customQty, setCustomQty] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [itemNote, setItemNote] = useState("");

  useEffect(() => {
    if (selectedItemModal) {
      setCustomQty(1);
      setSelectedVariant(selectedItemModal.variants[0] || null);
      setSelectedAddOns([]);
      setItemNote("");
    }
  }, [selectedItemModal]);

  // Banner carousel index
  const [bannerIndex, setBannerIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % DEFAULT_BANNER_SLIDES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  // Orders state & real-time tracking
  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>(initialActiveOrders);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(initialActiveOrders[0]?.id || null);

  // Poll order status
  useEffect(() => {
    if (activeOrders.length === 0) return;
    const interval = setInterval(async () => {
      try {
        const orderId = selectedOrderId || activeOrders[0].id;
        const { data } = await axios.get(`/api/orders/${orderId}`);
        if (data && data.status) {
          setActiveOrders((prev) =>
            prev.map((o) => (o.id === orderId ? { ...o, status: data.status } : o))
          );
        }
      } catch (err) {
        /* silent */
      }
    }, 12000);
    return () => clearInterval(interval);
  }, [activeOrders, selectedOrderId]);

  // Derived lists
  const allItems = useMemo(() => restaurant.categories.flatMap((c) => c.menuItems), [restaurant.categories]);

  const bestsellers = useMemo(
    () =>
      allItems.filter((i) =>
        i.tags.some((t) => ["bestseller", "popular", "top", "chef special", "must try"].includes(t.toLowerCase()))
      ),
    [allItems]
  );

  // Filtered menu logic
  const filteredItems = useMemo(() => {
    let result = allItems;

    if (activeCategory === "bestsellers") {
      result = bestsellers;
    } else if (activeCategory !== "all") {
      result = restaurant.categories.find((c) => c.id === activeCategory)?.menuItems || [];
    }

    if (filterVegOnly !== null) {
      result = result.filter((i) => i.isVeg === filterVegOnly);
    }
    if (filterSpicyOnly) {
      result = result.filter((i) => i.tags.some((t) => t.toLowerCase().includes("spicy")));
    }
    if (filterBestsellerOnly) {
      result = result.filter((i) =>
        i.tags.some((t) => ["bestseller", "popular", "top"].includes(t.toLowerCase()))
      );
    }
    if (filterMaxPrice < 1000) {
      result = result.filter((i) => i.price <= filterMaxPrice);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          (i.description && i.description.toLowerCase().includes(q)) ||
          i.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    return result;
  }, [
    allItems,
    bestsellers,
    restaurant.categories,
    activeCategory,
    filterVegOnly,
    filterSpicyOnly,
    filterBestsellerOnly,
    filterMaxPrice,
    searchQuery,
  ]);

  // Cart calculations
  const cartItems = mounted ? items : [];
  const totalCartCount = mounted ? getTotalItems() : 0;
  const subtotalPrice = mounted ? getTotalPrice() : 0;
  const taxAmount = subtotalPrice * (restaurant.taxPercent / 100);
  const grandTotalPrice = subtotalPrice + taxAmount;

  // Quick Add Item
  const handleQuickAdd = (item: MenuItem) => {
    if (item.variants.length > 0) {
      setSelectedItemModal(item);
      return;
    }
    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
      isVeg: item.isVeg,
    });
    toast.success(`${item.name} added to cart! 🛒`, {
      style: { background: "#1c1917", color: "#faf5ef", borderRadius: "16px" },
    });
  };

  // Add Item with Customizations
  const handleAddCustomizedItem = () => {
    if (!selectedItemModal) return;
    const effectivePrice = selectedVariant ? selectedVariant.price : selectedItemModal.price;
    const addOnTotal = selectedAddOns.length * 40; // Default add-on pricing
    const finalPrice = effectivePrice + addOnTotal;

    const note = [
      selectedVariant ? `Variant: ${selectedVariant.name}` : null,
      selectedAddOns.length ? `Add-ons: ${selectedAddOns.join(", ")}` : null,
      itemNote ? `Note: ${itemNote}` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    addItem({
      id: selectedVariant ? `${selectedItemModal.id}-${selectedVariant.id}` : selectedItemModal.id,
      name: selectedVariant ? `${selectedItemModal.name} (${selectedVariant.name})` : selectedItemModal.name,
      price: finalPrice,
      quantity: customQty,
      isVeg: selectedItemModal.isVeg,
      note: note || undefined,
    });

    toast.success(`Added ${selectedItemModal.name} to order! 🛒`, {
      style: { background: "#1c1917", color: "#faf5ef", borderRadius: "16px" },
    });
    setSelectedItemModal(null);
  };

  // Floor waiter call handler
  const callWaiter = async (type: string, msg: string) => {
    try {
      await axios.put("/api/table-service", {
        tableId: table.id,
        restaurantId: restaurant.id,
        requestType: type,
        message: msg,
      });
      toast.success("Floor waiter notified! 🔔", {
        style: { background: "#1c1917", color: "#faf5ef" },
      });
    } catch {
      toast.success(`Waiter request sent to Table ${table.name} 🔔`);
    }
  };

  // Category Emojis helper
  const getCategoryIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("burger")) return "🍔";
    if (n.includes("pizza")) return "🍕";
    if (n.includes("starter") || n.includes("tandoor")) return "🍗";
    if (n.includes("biryani") || n.includes("rice")) return "🍲";
    if (n.includes("chinese") || n.includes("noodle")) return "🍜";
    if (n.includes("dessert") || n.includes("sweet")) return "🍰";
    if (n.includes("drink") || n.includes("beverage")) return "🥤";
    if (n.includes("side") || n.includes("bread")) return "🥖";
    return "🍽️";
  };

  return (
    <div className="min-h-screen bg-[#faf5ef] text-[#1c1917] font-sans antialiased selection:bg-[#e85a2a]/20">
      {/* ── DESKTOP & TABLET 3-COLUMN ADAPTER WRAPPER ───────────────────────── */}
      <div className="max-w-7xl mx-auto min-h-screen flex flex-col md:flex-row pb-24 md:pb-6">
        
        {/* ── LEFT DESKTOP SIDEBAR NAVIGATION (Hidden on mobile) ───────────── */}
        <aside className="hidden md:flex flex-col w-64 p-6 bg-white border-r border-amber-950/5 sticky top-0 h-screen flex-shrink-0 justify-between shadow-sm">
          <div className="space-y-6">
            {/* Restaurant Brand Header */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#e85a2a] to-[#f0a040] p-0.5 shadow-md flex items-center justify-center">
                {restaurant.logo ? (
                  <Image src={restaurant.logo} alt={restaurant.name} width={44} height={44} className="rounded-[14px] object-cover" />
                ) : (
                  <span className="text-xl">🍽️</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="font-extrabold text-base leading-tight truncate text-[#1c1917]">{restaurant.name}</h1>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#e85a2a] bg-[#e85a2a]/10 px-2 py-0.5 rounded-full mt-0.5">
                  Table #{table.name}
                </span>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="space-y-1.5 pt-4">
              {[
                { id: "home", label: "Home Feed", icon: HomeIcon },
                { id: "menu", label: "Full Menu", icon: UtensilsCrossed },
                { id: "orders", label: "My Orders", icon: Receipt, badge: activeOrders.length },
                { id: "offers", label: "Offers & Deals", icon: Tag },
                { id: "profile", label: "Table Info", icon: User },
              ].map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as any)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                      active
                        ? "bg-[#e85a2a] text-white shadow-lg shadow-[#e85a2a]/25 scale-[1.02]"
                        : "text-[#78716c] hover:bg-amber-900/5 hover:text-[#1c1917]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge ? (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${active ? "bg-white text-[#e85a2a]" : "bg-[#e85a2a]/15 text-[#e85a2a]"}`}>
                        {item.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Quick Table Service Buttons */}
          <div className="space-y-2 pt-6 border-t border-amber-950/5">
            <p className="text-[10px] font-extrabold uppercase text-[#78716c] tracking-wider px-1">Floor Assistance</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => callWaiter("WATER", "Water request")}
                className="py-2.5 px-3 rounded-xl bg-amber-900/5 hover:bg-amber-900/10 text-[11px] font-bold text-[#1c1917] transition-all flex items-center justify-center gap-1.5"
              >
                💧 Water
              </button>
              <button
                onClick={() => callWaiter("BILL", "Bill request")}
                className="py-2.5 px-3 rounded-xl bg-[#e85a2a]/10 hover:bg-[#e85a2a]/20 text-[11px] font-bold text-[#e85a2a] transition-all flex items-center justify-center gap-1.5"
              >
                🧾 Bill
              </button>
            </div>
          </div>
        </aside>

        {/* ── CENTER MAIN CONTENT FEED ────────────────────────────────────── */}
        <main className="flex-1 min-w-0 px-4 pt-4 md:px-8 md:pt-6 space-y-6">

          {/* ── TOP MOBILE HEADER (Matching Reference Visual) ─────────────── */}
          <header className="flex items-center justify-between gap-3 bg-white/90 backdrop-blur-xl p-3.5 rounded-[28px] shadow-sm border border-amber-950/5 sticky top-2 z-20 md:relative md:top-0 md:bg-transparent md:border-0 md:p-0 md:shadow-none">
            {/* Left Hamburger & Greeting */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowNavDrawer(true)}
                className="w-10 h-10 rounded-2xl bg-white border border-amber-950/10 flex items-center justify-center text-[#1c1917] shadow-sm hover:bg-amber-900/5 active:scale-95 transition-all md:hidden"
              >
                <MenuIcon className="w-5 h-5" />
              </button>
              <div>
                <p className="text-[11px] font-semibold text-[#78716c] flex items-center gap-1.5">
                  Welcome Diner 👋
                  <span className="font-extrabold text-[#e85a2a] bg-[#e85a2a]/10 border border-[#e85a2a]/20 px-2.5 py-0.5 rounded-full text-[10px]">
                    Table #{table.name}
                  </span>
                </p>
                <h2 className="text-base font-black text-[#1c1917] leading-tight md:text-2xl">
                  {restaurant.name}
                </h2>
              </div>
            </div>

            {/* Right Icons: Notifications + Cart */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => toast("Floor team is ready to serve you! 🔔", { icon: "🔔" })}
                className="w-10 h-10 rounded-2xl bg-white border border-amber-950/10 flex items-center justify-center text-[#1c1917] shadow-sm hover:bg-amber-900/5 transition-all relative"
              >
                <Bell className="w-4 h-4 text-[#78716c]" />
                <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#e85a2a] ring-2 ring-white" />
              </button>

              <button
                onClick={() => setShowCartDrawer(true)}
                className="w-10 h-10 rounded-2xl bg-white border border-amber-950/10 flex items-center justify-center text-[#1c1917] shadow-sm hover:bg-amber-900/5 transition-all relative"
              >
                <ShoppingBag className="w-4 h-4 text-[#1c1917]" />
                {totalCartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#e85a2a] text-white text-[10px] font-black flex items-center justify-center shadow-md animate-bounce">
                    {totalCartCount}
                  </span>
                )}
              </button>
            </div>
          </header>

          {/* ── SEARCH & FILTER BAR (Matching Reference Visual) ────────────── */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#78716c]" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search dishes, drinks & specials..."
                className="w-full bg-white border border-amber-950/10 rounded-2xl pl-11 pr-4 py-3.5 text-xs text-[#1c1917] placeholder-[#78716c]/60 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#e85a2a]/20 focus:border-[#e85a2a] transition-all font-medium"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#78716c]">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              onClick={() => setShowFilterModal(true)}
              className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-all shadow-sm ${
                filterVegOnly !== null || filterSpicyOnly || filterBestsellerOnly
                  ? "bg-[#e85a2a] border-[#e85a2a] text-white"
                  : "bg-white border-amber-950/10 text-[#1c1917] hover:bg-amber-900/5"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>

          {/* ── TAB 1: HOME TAB VIEW ────────────────────────────────────────── */}
          {activeTab === "home" && (
            <div className="space-y-6">
              
              {/* ── HERO BANNER CAROUSEL ────────────────────────────────────────────── */}
              <div className="relative rounded-[28px] sm:rounded-[32px] overflow-hidden shadow-xl text-white">
                <AnimatePresence mode="wait">
                  {DEFAULT_BANNER_SLIDES.map((slide, idx) => {
                    if (idx !== bannerIndex) return null;

                    const gradientMap: Record<string, string> = {
                      "banner-1": "linear-gradient(135deg, #7f1d1d 0%, #991b1b 50%, #450a0a 100%)",
                      "banner-2": "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)",
                      "banner-3": "linear-gradient(135deg, #431407 0%, #7c2d12 50%, #9a3412 100%)",
                    };

                    return (
                      <motion.div
                        key={slide.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.4 }}
                        style={{ background: gradientMap[slide.id] || "linear-gradient(135deg, #0f172a 0%, #334155 100%)" }}
                        className="px-5 pt-6 pb-11 sm:px-8 sm:pt-8 sm:pb-12 flex items-center justify-between min-h-[200px] sm:min-h-[220px] relative overflow-hidden rounded-[28px] sm:rounded-[32px] text-white shadow-xl gap-4"
                      >
                        {/* Decorative Background glow */}
                        <div className="absolute -right-12 -bottom-12 w-56 h-56 rounded-full bg-white/10 blur-3xl pointer-events-none" />

                        {/* Content Left */}
                        <div className="max-w-[62%] sm:max-w-[65%] space-y-2 sm:space-y-3 z-10">
                          <div>
                            <span 
                              style={{ color: "#ffffff" }}
                              className="inline-flex items-center px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-white/20 border border-white/30 backdrop-blur-md shadow-sm"
                            >
                              {slide.badge}
                            </span>
                          </div>
                          <h3 
                            style={{ color: "#ffffff" }}
                            className="text-lg sm:text-2xl md:text-3xl font-black leading-tight tracking-tight drop-shadow-md"
                          >
                            {slide.title}
                          </h3>
                          <p className="text-xs sm:text-sm font-semibold text-amber-100/90 line-clamp-2 leading-relaxed drop-shadow-sm">
                            {slide.subtitle}
                          </p>
                          <div className="pt-1">
                            <button
                              onClick={() => setActiveTab("menu")}
                              className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-white text-[#1c1917] font-extrabold text-xs sm:text-sm shadow-lg hover:bg-amber-50 active:scale-95 transition-all inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <span>{slide.ctaText}</span>
                            </button>
                          </div>
                        </div>

                        {/* Image Right */}
                        <div className="w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 rounded-2xl sm:rounded-3xl border-2 sm:border-4 border-white/20 overflow-hidden shadow-2xl flex-shrink-0 relative bg-black/20">
                          <Image src={slide.image} alt={slide.title} fill className="object-cover" priority />
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {/* Carousel Indicators */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
                  {DEFAULT_BANNER_SLIDES.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setBannerIndex(i)}
                      className={`h-1.5 rounded-full transition-all ${
                        i === bannerIndex ? "w-6 bg-white" : "w-1.5 bg-white/40 hover:bg-white/70"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* ── CIRCULAR CATEGORY SELECTOR (Exact Reference Inspired) ──── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-[#1c1917] tracking-tight">Categories</h3>
                  <button onClick={() => setActiveTab("menu")} className="text-xs font-extrabold text-[#e85a2a] flex items-center gap-0.5 hover:underline cursor-pointer">
                    View All <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex gap-4 overflow-x-auto scrollbar-hide py-1 -mx-4 px-4 md:mx-0 md:px-0">
                  {/* "All" category button */}
                  <button
                    onClick={() => setActiveCategory("all")}
                    className="flex flex-col items-center gap-2 flex-shrink-0 group cursor-pointer"
                  >
                    <div
                      className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl transition-all shadow-sm border-2 ${
                        activeCategory === "all"
                          ? "border-[#e85a2a] bg-[#e85a2a]/10 ring-4 ring-[#e85a2a]/15 scale-105"
                          : "border-amber-950/10 bg-white group-hover:border-[#e85a2a]/40"
                      }`}
                    >
                      🍽️
                    </div>
                    <span className={`text-[11px] font-extrabold ${activeCategory === "all" ? "text-[#e85a2a]" : "text-[#78716c]"}`}>
                      All Items
                    </span>
                  </button>

                  {restaurant.categories.map((cat) => {
                    const active = activeCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className="flex flex-col items-center gap-2 flex-shrink-0 group cursor-pointer"
                      >
                        <div
                          className={`w-16 h-16 rounded-full overflow-hidden relative flex items-center justify-center transition-all shadow-sm border-2 ${
                            active
                              ? "border-[#e85a2a] ring-4 ring-[#e85a2a]/15 scale-105"
                              : "border-amber-950/10 bg-white group-hover:border-[#e85a2a]/40"
                          }`}
                        >
                          {cat.image ? (
                            <Image src={cat.image} alt={cat.name} fill className="object-cover" />
                          ) : (
                            <span className="text-2xl">{getCategoryIcon(cat.name)}</span>
                          )}
                        </div>
                        <span className={`text-[11px] font-extrabold truncate max-w-[70px] ${active ? "text-[#e85a2a]" : "text-[#78716c]"}`}>
                          {cat.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── POPULAR CHOICES SECTION (Exact Reference Horizontal Scroll) ──── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-[#e85a2a]" />
                    <h3 className="text-sm font-black text-[#1c1917] tracking-tight">Popular Combos</h3>
                  </div>
                  <button onClick={() => setActiveTab("menu")} className="text-xs font-extrabold text-[#e85a2a] flex items-center gap-0.5 hover:underline cursor-pointer">
                    View All →
                  </button>
                </div>

                <div className="flex gap-4 overflow-x-auto scrollbar-hide py-2 -mx-4 px-4 md:mx-0 md:px-0">
                  {bestsellers.slice(0, 6).map((item) => {
                    const isFav = favorites.has(item.id);
                    return (
                      <div
                        key={item.id}
                        className="w-56 flex-shrink-0 bg-white border border-amber-950/5 rounded-[28px] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col justify-between group"
                      >
                        {/* Image Container with Badges */}
                        <div className="relative h-40 w-full bg-amber-900/5">
                          <Image
                            src={
                              item.image ||
                              "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80"
                            }
                            alt={item.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />

                          {/* Bestseller Badge */}
                          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-gradient-to-r from-[#e85a2a] to-[#ea6c0a] text-white shadow-md">
                            BESTSELLER
                          </span>

                          {/* Wishlist Heart Button */}
                          <button
                            onClick={() => toggleFavorite(item.id, item.name)}
                            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center shadow-md text-[#78716c] hover:text-[#e85a2a] transition-all cursor-pointer hover:scale-110"
                          >
                            <Heart className={`w-4 h-4 ${isFav ? "fill-[#e85a2a] text-[#e85a2a]" : ""}`} />
                          </button>
                        </div>

                        {/* Card Details */}
                        <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center gap-1.5 mb-1">
                              <span
                                className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center flex-shrink-0 ${
                                  item.isVeg ? "border-emerald-600" : "border-red-600"
                                }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? "bg-emerald-600" : "bg-red-600"}`} />
                              </span>
                              <h4 className="font-black text-xs text-[#1c1917] truncate">{item.name}</h4>
                            </div>
                            <p className="text-[10px] font-medium text-[#78716c] line-clamp-1">{item.description || "Chef special selection"}</p>
                          </div>

                          {/* Rating & Price Row */}
                          <div className="pt-2 border-t border-amber-950/5 flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-1 text-[10px] font-extrabold text-amber-500">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                <span>4.8</span>
                                <span className="text-[#78716c] font-normal">(189)</span>
                              </div>
                              <p className="text-xs font-black text-[#1c1917] mt-0.5">₹{item.price}</p>
                            </div>

                            {/* Add Button */}
                            <button
                              onClick={() => handleQuickAdd(item)}
                              className="w-9 h-9 rounded-full bg-gradient-to-r from-[#e85a2a] to-[#ea6c0a] text-white flex items-center justify-center shadow-md shadow-[#e85a2a]/20 hover:scale-110 active:scale-95 transition-all cursor-pointer"
                            >
                              <Plus className="w-4.5 h-4.5 stroke-[3]" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── SECONDARY PROMO DEALS BANNER (Matching Reference) ─────── */}
              <div
                style={{ background: "linear-gradient(135deg, #7f1d1d 0%, #991b1b 50%, #c2410c 100%)" }}
                className="rounded-[32px] p-6 text-white shadow-xl flex items-center justify-between relative overflow-hidden"
              >
                <div className="space-y-2 max-w-[65%] z-10">
                  <div className="flex items-center gap-1 text-xs font-black text-amber-200 drop-shadow-sm">
                    <Flame className="w-4 h-4 fill-amber-200" />
                    <span>Spicy Deals</span>
                  </div>
                  <h3 className="text-base md:text-xl font-black text-white drop-shadow-md">Up to 30% OFF</h3>
                  <p className="text-xs font-bold text-amber-100 leading-relaxed drop-shadow-sm">On selected dining combos & starters</p>
                  <button
                    onClick={() => setActiveTab("offers")}
                    className="px-4 py-2 rounded-full bg-white text-[#e85a2a] font-extrabold text-[11px] shadow-md hover:bg-amber-50 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span>View Deals</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-white text-[#e85a2a] font-black flex flex-col items-center justify-center shadow-2xl rotate-12 border-2 border-amber-200">
                    <span className="text-base leading-none">30%</span>
                    <span className="text-[9px] uppercase tracking-wider">OFF</span>
                  </div>
                </div>
              </div>

              {/* ── CATEGORIZED MENU FEED ───────────────────────────────────── */}
              <div className="space-y-4 pt-2">
                <h3 className="text-sm font-black text-[#1c1917] tracking-tight">Full Restaurant Menu</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
                  {filteredItems.map((item) => {
                    const isFav = favorites.has(item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedItemModal(item)}
                        className="bg-white border border-amber-950/5 rounded-[28px] p-4 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex items-start justify-between gap-4 cursor-pointer group"
                      >
                        {/* Left: Veg/Nonveg + Full Title + Price + Description */}
                        <div className="flex-1 min-w-0 space-y-1.5 pr-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center flex-shrink-0 ${
                                item.isVeg ? "border-emerald-600" : "border-red-600"
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? "bg-emerald-600" : "bg-red-600"}`} />
                            </span>
                            {item.tags.some((t) => t.toLowerCase().includes("bestseller")) && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-[#e85a2a]/10 text-[#e85a2a] border border-[#e85a2a]/20 uppercase tracking-wider">
                                ⭐ Bestseller
                              </span>
                            )}
                          </div>

                          <h4 className="font-black text-sm text-[#1c1917] leading-snug group-hover:text-[#e85a2a] transition-colors">
                            {item.name}
                          </h4>

                          <p className="font-black text-sm text-[#1c1917]">
                            ₹{item.price}
                          </p>

                          <p className="text-xs font-medium text-[#78716c] line-clamp-2 leading-relaxed pt-0.5">
                            {item.description || "Freshly cooked with authentic house spices."}
                          </p>
                        </div>

                        {/* Right: Dish Image with Floating + ADD Button */}
                        <div className="relative flex-shrink-0 pb-3">
                          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-[24px] bg-amber-900/5 overflow-hidden relative shadow-sm border border-amber-950/5">
                            <Image
                              src={
                                item.image ||
                                "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80"
                              }
                              alt={item.name}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(item.id, item.name);
                              }}
                              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center shadow-md text-[#78716c] hover:text-[#e85a2a] transition-all cursor-pointer hover:scale-110"
                            >
                              <Heart className={`w-3.5 h-3.5 ${isFav ? "fill-[#e85a2a] text-[#e85a2a]" : ""}`} />
                            </button>
                          </div>

                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-[85%]">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuickAdd(item);
                              }}
                              className="w-full py-1.5 rounded-xl bg-white border border-amber-950/10 text-[#e85a2a] font-extrabold text-xs tracking-wider uppercase shadow-md hover:bg-[#e85a2a] hover:text-white transition-all duration-200 active:scale-95 cursor-pointer flex items-center justify-center gap-1"
                            >
                              <span>+ ADD</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 2: MENU TAB VIEW ────────────────────────────────────────── */}
          {activeTab === "menu" && (
            <div className="space-y-4">
              {/* Category Pills Header */}
              <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1 -mx-4 px-4 md:mx-0 md:px-0">
                <button
                  onClick={() => setActiveCategory("all")}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                    activeCategory === "all" ? "bg-[#e85a2a] text-white shadow-md" : "bg-white border border-amber-950/10 text-[#78716c]"
                  }`}
                >
                  All Items
                </button>
                {restaurant.categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setActiveCategory(c.id)}
                    className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                      activeCategory === c.id ? "bg-[#e85a2a] text-white shadow-md" : "bg-white border border-amber-950/10 text-[#78716c]"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>

              {/* Menu Listing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
                {filteredItems.map((item) => {
                  const isFav = favorites.has(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItemModal(item)}
                      className="bg-white border border-amber-950/5 rounded-[28px] p-4 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex items-start justify-between gap-4 cursor-pointer group"
                    >
                      <div className="flex-1 min-w-0 space-y-1.5 pr-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center flex-shrink-0 ${
                              item.isVeg ? "border-emerald-600" : "border-red-600"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? "bg-emerald-600" : "bg-red-600"}`} />
                          </span>
                          {item.tags.some((t) => t.toLowerCase().includes("bestseller")) && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-[#e85a2a]/10 text-[#e85a2a] border border-[#e85a2a]/20 uppercase tracking-wider">
                              ⭐ Bestseller
                            </span>
                          )}
                        </div>

                        <h4 className="font-black text-sm text-[#1c1917] leading-snug group-hover:text-[#e85a2a] transition-colors">
                          {item.name}
                        </h4>

                        <p className="font-black text-sm text-[#1c1917]">
                          ₹{item.price}
                        </p>

                        <p className="text-xs font-medium text-[#78716c] line-clamp-2 leading-relaxed pt-0.5">
                          {item.description || "Freshly cooked with authentic house spices."}
                        </p>
                      </div>

                      <div className="relative flex-shrink-0 pb-3">
                        <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-[24px] bg-amber-900/5 overflow-hidden relative shadow-sm border border-amber-950/5">
                          <Image
                            src={
                              item.image ||
                              "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80"
                            }
                            alt={item.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(item.id, item.name);
                            }}
                            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center shadow-md text-[#78716c] hover:text-[#e85a2a] transition-all cursor-pointer hover:scale-110"
                          >
                            <Heart className={`w-3.5 h-3.5 ${isFav ? "fill-[#e85a2a] text-[#e85a2a]" : ""}`} />
                          </button>
                        </div>

                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-[85%]">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickAdd(item);
                            }}
                            className="w-full py-1.5 rounded-xl bg-white border border-amber-950/10 text-[#e85a2a] font-extrabold text-xs tracking-wider uppercase shadow-md hover:bg-[#e85a2a] hover:text-white transition-all duration-200 active:scale-95 cursor-pointer flex items-center justify-center gap-1"
                          >
                            <span>+ ADD</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── TAB 3: ORDERS & LIVE TRACKING VIEW ─────────────────────────── */}
          {activeTab === "orders" && (
            <div className="space-y-6">
              <div className="bg-white border border-amber-950/5 rounded-[28px] p-6 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-amber-950/5 pb-4">
                  <div>
                    <h3 className="font-extrabold text-base text-[#1c1917]">Live Table Tracker</h3>
                    <p className="text-xs text-[#78716c]">Real-time Status for Table #{table.name}</p>
                  </div>
                  {activeOrders.length > 0 && (
                    <span className="px-3 py-1 rounded-full bg-[#e85a2a]/10 text-[#e85a2a] font-extrabold text-xs border border-[#e85a2a]/20">
                      #{activeOrders[0].orderNumber || "SA1024"}
                    </span>
                  )}
                </div>

                {/* Animated Order Progress Timeline */}
                {activeOrders.length > 0 ? (
                  (() => {
                    const status = activeOrders[0].status;
                    const steps = [
                      { label: "Order Received", icon: "🧾", desc: "Sent to kitchen", done: true },
                      { label: "Order Accepted", icon: "✅", desc: "Confirmed by floor", done: status !== "NEW" },
                      { label: "Preparing", icon: "👨‍🍳", desc: "Chef is cooking your dish", done: status === "PREPARING" || status === "READY" || status === "DONE" },
                      { label: "Ready to Serve", icon: "🏁", desc: "Delivered to Table " + table.name, done: status === "READY" || status === "DONE" },
                    ];

                    return (
                      <div className="space-y-4">
                        {steps.map((step, idx) => (
                          <div key={idx} className="flex items-start gap-4">
                            <div
                              className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg flex-shrink-0 shadow-sm transition-all ${
                                step.done
                                  ? "bg-[#e85a2a] text-white shadow-[#e85a2a]/25 scale-105"
                                  : "bg-amber-900/5 text-[#78716c] border border-amber-950/10"
                              }`}
                            >
                              {step.done ? <CheckCircle2 className="w-5 h-5 stroke-[2.5]" /> : step.icon}
                            </div>
                            <div className="pt-1">
                              <h4 className={`text-xs font-extrabold ${step.done ? "text-[#1c1917]" : "text-[#78716c]"}`}>
                                {step.label}
                              </h4>
                              <p className="text-[11px] text-[#78716c]">{step.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()
                ) : (
                  <div className="text-center py-8 space-y-3">
                    <span className="text-4xl">🍳</span>
                    <p className="text-xs font-bold text-[#78716c]">No active orders placed for Table #{table.name} yet.</p>
                    <button
                      onClick={() => setActiveTab("menu")}
                      className="px-5 py-2.5 rounded-full bg-[#e85a2a] text-white font-extrabold text-xs shadow-md hover:scale-105 transition-all"
                    >
                      Browse Menu & Order
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TAB 4: OFFERS & DEALS VIEW ──────────────────────────────────── */}
          {activeTab === "offers" && (
            <div className="space-y-4">
              <h3 className="text-sm font-extrabold text-[#1c1917] tracking-tight">Available Coupons & Offers</h3>

              <div className="space-y-3">
                {DEFAULT_OFFERS.map((offer) => (
                  <div
                    key={offer.id}
                    className="bg-white border border-amber-950/5 rounded-[24px] p-4 shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1 max-w-[65%]">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-[#e85a2a]/10 text-[#e85a2a] border border-[#e85a2a]/20">
                        {offer.discountBadge}
                      </span>
                      <h4 className="font-extrabold text-xs text-[#1c1917]">{offer.title}</h4>
                      <p className="text-[10px] text-[#78716c] leading-relaxed">{offer.description}</p>
                      <div className="pt-1 flex items-center gap-2">
                        <code className="px-2 py-0.5 rounded bg-amber-900/5 text-[#1c1917] font-mono text-[10px] font-bold border border-amber-950/10">
                          {offer.code}
                        </code>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(offer.code);
                            toast.success(`Coupon code ${offer.code} copied! 🎉`);
                          }}
                          className="text-[10px] font-bold text-[#e85a2a] flex items-center gap-1 hover:underline"
                        >
                          <Copy className="w-3 h-3" /> Copy
                        </button>
                      </div>
                    </div>

                    <div className="w-20 h-20 rounded-2xl bg-amber-900/5 relative overflow-hidden flex-shrink-0">
                      <Image src={offer.image} alt={offer.title} fill className="object-cover" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TAB 5: PROFILE & TABLE INFO VIEW ────────────────────────────── */}
          {activeTab === "profile" && (
            <div className="space-y-4">
              <div className="bg-white border border-amber-950/5 rounded-[28px] p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-[#e85a2a]/10 text-[#e85a2a] font-black text-xl flex items-center justify-center">
                    T{table.name}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-[#1c1917]">Table #{table.name}</h3>
                    <p className="text-xs text-[#78716c]">{table.location?.name || "Main Dining Hall"} · Dine-in Session</p>
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-amber-950/5 text-xs text-[#1c1917]">
                  <div className="flex items-center justify-between py-2 border-b border-amber-950/5">
                    <span className="text-[#78716c]">Restaurant</span>
                    <span className="font-bold">{restaurant.name}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-amber-950/5">
                    <span className="text-[#78716c]">Tax Rate</span>
                    <span className="font-bold">{restaurant.taxPercent}% VAT/GST</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-[#78716c]">Favorites Saved</span>
                    <span className="font-bold">{favorites.size} items</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* ── RIGHT DESKTOP STICKY CART (Hidden on mobile) ────────────────── */}
        <aside className="hidden lg:block w-80 p-6 bg-white border-l border-amber-950/5 sticky top-0 h-screen flex-shrink-0 shadow-sm overflow-y-auto space-y-6">
          <div className="flex items-center justify-between border-b border-amber-950/5 pb-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#e85a2a]" />
              <h3 className="font-extrabold text-base text-[#1c1917]">Your Cart Summary</h3>
            </div>
            <span className="text-xs font-bold text-[#e85a2a] bg-[#e85a2a]/10 px-2.5 py-0.5 rounded-full">
              {totalCartCount} items
            </span>
          </div>

          {/* Cart Items List */}
          {cartItems.length > 0 ? (
            <div className="space-y-3">
              {cartItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-2xl bg-amber-900/5 text-xs">
                  <div className="min-w-0 flex-1 pr-2">
                    <h4 className="font-extrabold text-[#1c1917] truncate">{item.name}</h4>
                    <p className="text-[11px] text-[#78716c]">₹{item.price} each</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-6 h-6 rounded-full bg-white text-[#1c1917] font-black flex items-center justify-center shadow-sm">
                      -
                    </button>
                    <span className="font-extrabold">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-6 h-6 rounded-full bg-[#e85a2a] text-white font-black flex items-center justify-center shadow-sm">
                      +
                    </button>
                  </div>
                </div>
              ))}

              <div className="pt-4 border-t border-amber-950/5 space-y-2 text-xs">
                <div className="flex items-center justify-between text-[#78716c]">
                  <span>Subtotal</span>
                  <span>₹{subtotalPrice.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-[#78716c]">
                  <span>Taxes ({restaurant.taxPercent}%)</span>
                  <span>₹{taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between font-black text-sm text-[#1c1917] pt-2 border-t border-amber-950/5">
                  <span>Grand Total</span>
                  <span>₹{grandTotalPrice.toFixed(2)}</span>
                </div>

                <button
                  onClick={() => router.push(`/${slug}/${tableToken}/checkout`)}
                  className="w-full py-3.5 rounded-2xl bg-[#e85a2a] hover:brightness-110 text-white font-extrabold text-xs shadow-lg shadow-[#e85a2a]/25 active:scale-95 transition-all mt-4 cursor-pointer"
                >
                  Proceed to Checkout • ₹{grandTotalPrice.toFixed(2)}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 space-y-2 text-[#78716c]">
              <span className="text-3xl">🛒</span>
              <p className="text-xs font-bold">Your cart is empty.</p>
              <p className="text-[10px]">Add items from the menu to start ordering.</p>
            </div>
          )}
        </aside>
      </div>

      {/* ── FLOATING CART STRIP ON MOBILE (When items in cart) ────────────── */}
      <AnimatePresence>
        {totalCartCount > 0 && !showCartDrawer && (
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-16 left-4 right-4 z-20 md:hidden"
          >
            <button
              onClick={() => setShowCartDrawer(true)}
              className="w-full bg-[#1c1917] text-white p-3.5 rounded-[28px] shadow-2xl flex items-center justify-between border border-amber-950/20 active:scale-[0.98] transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#e85a2a] to-[#ea6c0a] text-white font-black text-xs flex items-center justify-center shadow-md">
                  {totalCartCount}
                </div>
                <div className="text-left">
                  <p className="text-xs font-black leading-tight text-white">{totalCartCount} {totalCartCount === 1 ? "Item" : "Items"} Added</p>
                  <p className="text-[10px] text-amber-200/80 font-bold">Tap to view your order</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-[#e85a2a]">₹{grandTotalPrice.toFixed(0)}</span>
                <span className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#e85a2a] to-[#ea6c0a] text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md">
                  View Cart <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FLOATING MOBILE BOTTOM NAVIGATION BAR (Exact Reference Inspired) ──── */}
      <nav className="fixed bottom-3 left-1/2 -translate-x-1/2 z-30 bg-white/95 backdrop-blur-2xl border border-amber-950/10 shadow-2xl rounded-full px-4 py-2 flex items-center gap-2 md:hidden">
        {[
          { id: "home", label: "Home", icon: HomeIcon },
          { id: "menu", label: "Menu", icon: UtensilsCrossed },
          { id: "orders", label: "Orders", icon: Receipt, badge: activeOrders.length },
          { id: "offers", label: "Offers", icon: Tag },
          { id: "profile", label: "Profile", icon: User },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-full transition-all relative cursor-pointer ${
                active
                  ? "bg-gradient-to-r from-[#e85a2a] to-[#ea6c0a] text-white shadow-lg shadow-[#e85a2a]/30 scale-105"
                  : "text-[#78716c] hover:text-[#1c1917]"
              }`}
            >
              <Icon className="w-4 h-4" />
              {active && <span className="text-xs font-black">{tab.label}</span>}
              {tab.badge ? (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#e85a2a] text-white text-[9px] font-black flex items-center justify-center shadow-md">
                  {tab.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      {/* ── ITEM CUSTOMIZATION BOTTOM SHEET MODAL ───────────────────────── */}
      <AnimatePresence>
        {selectedItemModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setSelectedItemModal(null)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 280 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-lg bg-white rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
            >
              {/* Photo Header */}
              <div className="relative h-56 w-full bg-amber-900/5">
                <Image
                  src={
                    selectedItemModal.image ||
                    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80"
                  }
                  alt={selectedItemModal.name}
                  fill
                  className="object-cover"
                />
                <button
                  onClick={() => setSelectedItemModal(null)}
                  className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur-md hover:bg-black/70 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Details Body */}
              <div className="p-6 overflow-y-auto space-y-5 flex-1">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center ${
                        selectedItemModal.isVeg ? "border-emerald-600" : "border-red-600"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${selectedItemModal.isVeg ? "bg-emerald-600" : "bg-red-600"}`} />
                    </span>
                    <h3 className="font-extrabold text-lg text-[#1c1917]">{selectedItemModal.name}</h3>
                  </div>
                  <p className="text-xs text-[#78716c] leading-relaxed">{selectedItemModal.description || "Freshly cooked dish using authentic ingredients."}</p>
                </div>

                {/* Variants Selection */}
                {selectedItemModal.variants.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-extrabold uppercase text-[#78716c] tracking-wider">Choose Portion Size</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedItemModal.variants.map((v) => (
                        <button
                          key={v.id}
                          onClick={() => setSelectedVariant(v)}
                          className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-between transition-all ${
                            selectedVariant?.id === v.id
                              ? "border-[#e85a2a] bg-[#e85a2a]/10 text-[#e85a2a]"
                              : "border-amber-950/10 bg-white text-[#1c1917]"
                          }`}
                        >
                          <span>{v.name}</span>
                          <span>₹{v.price}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add-ons */}
                <div className="space-y-2">
                  <h4 className="text-xs font-extrabold uppercase text-[#78716c] tracking-wider">Add-ons & Extras</h4>
                  {["Extra Cheese (+₹40)", "Special Dip (+₹20)", "Extra Butter Naan (+₹50)"].map((addon) => {
                    const isSelected = selectedAddOns.includes(addon);
                    return (
                      <button
                        key={addon}
                        onClick={() =>
                          setSelectedAddOns((prev) =>
                            isSelected ? prev.filter((a) => a !== addon) : [...prev, addon]
                          )
                        }
                        className={`w-full p-3 rounded-2xl border text-xs font-bold flex items-center justify-between transition-all ${
                          isSelected ? "border-[#e85a2a] bg-[#e85a2a]/10 text-[#e85a2a]" : "border-amber-950/10 bg-white text-[#1c1917]"
                        }`}
                      >
                        <span>{addon}</span>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? "bg-[#e85a2a] border-[#e85a2a] text-white" : "border-amber-950/20"}`}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Special Instructions */}
                <div className="space-y-1.5">
                  <h4 className="text-xs font-extrabold uppercase text-[#78716c] tracking-wider">Special Instructions</h4>
                  <input
                    value={itemNote}
                    onChange={(e) => setItemNote(e.target.value)}
                    placeholder="e.g. Less spicy, no onion..."
                    className="w-full bg-amber-900/5 border border-amber-950/10 rounded-2xl px-4 py-2.5 text-xs text-[#1c1917] focus:outline-none focus:ring-2 focus:ring-[#e85a2a]/30"
                  />
                </div>
              </div>

              {/* Footer Quantity & Add CTA */}
              <div className="p-4 bg-white border-t border-amber-950/5 flex items-center gap-4">
                <div className="flex items-center gap-3 bg-amber-900/5 rounded-2xl p-1.5 border border-amber-950/10">
                  <button onClick={() => setCustomQty(Math.max(1, customQty - 1))} className="w-8 h-8 rounded-xl bg-white font-black text-sm shadow-sm flex items-center justify-center">
                    -
                  </button>
                  <span className="font-extrabold text-sm px-1">{customQty}</span>
                  <button onClick={() => setCustomQty(customQty + 1)} className="w-8 h-8 rounded-xl bg-[#e85a2a] text-white font-black text-sm shadow-sm flex items-center justify-center">
                    +
                  </button>
                </div>

                <button
                  onClick={handleAddCustomizedItem}
                  className="flex-1 py-3.5 rounded-2xl bg-[#e85a2a] text-white font-extrabold text-xs shadow-lg shadow-[#e85a2a]/25 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>
                    Add to Cart • ₹{((selectedVariant ? selectedVariant.price : selectedItemModal.price) + selectedAddOns.length * 40) * customQty}
                  </span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FILTER OPTIONS MODAL ────────────────────────────────────────── */}
      <AnimatePresence>
        {showFilterModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setShowFilterModal(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-md bg-white rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between border-b border-amber-950/5 pb-4">
                <h3 className="font-extrabold text-base text-[#1c1917]">Filter Menu</h3>
                <button onClick={() => setShowFilterModal(false)} className="w-8 h-8 rounded-full bg-amber-900/5 flex items-center justify-center">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Dietary Filter */}
                <div className="space-y-2">
                  <h4 className="text-xs font-extrabold text-[#78716c]">Dietary Preference</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "All", value: null },
                      { label: "Veg 🟢", value: true },
                      { label: "Non-Veg 🔴", value: false },
                    ].map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => setFilterVegOnly(opt.value)}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                          filterVegOnly === opt.value
                            ? "bg-[#e85a2a] border-[#e85a2a] text-white"
                            : "bg-white border-amber-950/10 text-[#1c1917]"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-extrabold text-[#78716c]">
                    <span>Max Price Budget</span>
                    <span className="text-[#e85a2a]">₹{filterMaxPrice}</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="1000"
                    step="50"
                    value={filterMaxPrice}
                    onChange={(e) => setFilterMaxPrice(parseInt(e.target.value))}
                    className="w-full accent-[#e85a2a]"
                  />
                </div>
              </div>

              <button
                onClick={() => setShowFilterModal(false)}
                className="w-full py-3.5 rounded-2xl bg-[#e85a2a] text-white font-extrabold text-xs shadow-md"
              >
                Apply Filters
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MOBILE & TABLET CART BOTTOM SHEET DRAWER ─────────────────────── */}
      <AnimatePresence>
        {showCartDrawer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center p-0"
            onClick={() => setShowCartDrawer(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 280 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-white rounded-t-[32px] overflow-hidden shadow-2xl max-h-[85vh] flex flex-col"
            >
              {/* Cart Drawer Header */}
              <div className="p-5 border-b border-amber-950/5 flex items-center justify-between bg-amber-900/5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-[#e85a2a] text-white flex items-center justify-center shadow-md">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-[#1c1917]">Your Table Order</h3>
                    <p className="text-[11px] text-[#78716c]">Table #{table.name} · {totalCartCount} items selected</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCartDrawer(false)}
                  className="w-8 h-8 rounded-full bg-white border border-amber-950/10 flex items-center justify-center text-[#1c1917] shadow-sm hover:bg-amber-900/10 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Cart Drawer Items Body */}
              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                {cartItems.length > 0 ? (
                  <div className="space-y-3">
                    {cartItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-900/5 border border-amber-950/5 text-xs"
                      >
                        <div className="min-w-0 flex-1 pr-3">
                          <h4 className="font-extrabold text-[#1c1917] text-xs truncate">{item.name}</h4>
                          <p className="text-[11px] text-[#57534e] font-semibold mt-0.5">₹{item.price} each</p>
                          {item.note && (
                            <p className="text-[10px] text-[#e85a2a] italic mt-1 bg-[#e85a2a]/10 px-2 py-0.5 rounded-md inline-block">
                              {item.note}
                            </p>
                          )}
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-7 h-7 rounded-xl bg-white border border-amber-950/10 text-[#1c1917] font-black flex items-center justify-center shadow-sm hover:bg-amber-900/10 active:scale-95 transition-all"
                          >
                            -
                          </button>
                          <span className="font-black text-xs min-w-[16px] text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-7 h-7 rounded-xl bg-[#e85a2a] text-white font-black flex items-center justify-center shadow-sm hover:brightness-110 active:scale-95 transition-all"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Quick Recommended Add-ons */}
                    <div className="pt-2">
                      <p className="text-[10px] font-extrabold uppercase text-[#78716c] tracking-wider mb-2">People also ordered</p>
                      <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1">
                        {[
                          { id: "add-1", name: "Fresh Lime Soda", price: 60 },
                          { id: "add-2", name: "Cheese Garlic Bread", price: 110 },
                          { id: "add-3", name: "Chocolate Lava Cake", price: 130 },
                        ].map((rec) => (
                          <button
                            key={rec.id}
                            onClick={() => {
                              addItem({ id: rec.id, name: rec.name, price: rec.price, quantity: 1, isVeg: true });
                              toast.success(`Added ${rec.name} to cart!`);
                            }}
                            className="px-3 py-1.5 rounded-full bg-white border border-amber-950/10 text-[10px] font-bold text-[#1c1917] hover:bg-[#e85a2a]/10 hover:text-[#e85a2a] hover:border-[#e85a2a]/30 transition-all flex-shrink-0 flex items-center gap-1 shadow-sm"
                          >
                            <span>+ {rec.name}</span>
                            <span className="font-extrabold text-[#e85a2a]">₹{rec.price}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 space-y-3 text-[#78716c]">
                    <span className="text-4xl">🛒</span>
                    <p className="text-xs font-bold text-[#1c1917]">Your table cart is empty</p>
                    <p className="text-[11px] text-[#78716c]">Select delicious items from the menu to build your order.</p>
                  </div>
                )}
              </div>

              {/* Cart Drawer Bill Summary & Checkout Button */}
              {cartItems.length > 0 && (
                <div className="p-5 bg-white border-t border-amber-950/5 space-y-3">
                  <div className="space-y-1.5 text-xs text-[#78716c]">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="font-bold text-[#1c1917]">₹{subtotalPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Taxes ({restaurant.taxPercent}%)</span>
                      <span className="font-bold text-[#1c1917]">₹{taxAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-black text-sm text-[#1c1917] pt-2 border-t border-amber-950/5">
                      <span>Grand Total</span>
                      <span className="text-[#e85a2a]">₹{grandTotalPrice.toFixed(2)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setShowCartDrawer(false);
                      router.push(`/${slug}/${tableToken}/checkout`);
                    }}
                    className="w-full py-4 rounded-2xl bg-[#e85a2a] hover:brightness-110 text-white font-extrabold text-xs shadow-lg shadow-[#e85a2a]/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Proceed to Order • ₹{grandTotalPrice.toFixed(2)}</span>
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MOBILE HAMBURGER SIDE DRAWER ────────────────────────────────── */}
      <AnimatePresence>
        {showNavDrawer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-start"
            onClick={() => setShowNavDrawer(false)}
          >
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 280 }}
              onClick={(e) => e.stopPropagation()}
              className="w-72 h-full bg-white p-6 shadow-2xl flex flex-col justify-between"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-amber-950/5 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-[#e85a2a] text-white flex items-center justify-center font-extrabold text-lg">
                      🍽️
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-[#1c1917]">{restaurant.name}</h3>
                      <span className="text-[10px] font-bold text-[#e85a2a] bg-[#e85a2a]/10 px-2 py-0.5 rounded-full">
                        Table #{table.name}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => setShowNavDrawer(false)} className="w-8 h-8 rounded-full bg-amber-900/5 flex items-center justify-center">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <nav className="space-y-1.5">
                  {[
                    { id: "home", label: "Home Feed", icon: HomeIcon },
                    { id: "menu", label: "Full Menu", icon: UtensilsCrossed },
                    { id: "orders", label: "My Orders", icon: Receipt, badge: activeOrders.length },
                    { id: "offers", label: "Offers & Deals", icon: Tag },
                    { id: "profile", label: "Table Info", icon: User },
                  ].map((item) => {
                    const Icon = item.icon;
                    const active = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id as any);
                          setShowNavDrawer(false);
                        }}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                          active ? "bg-[#e85a2a] text-white shadow-md" : "text-[#78716c] hover:bg-amber-900/5"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </div>
                        {item.badge ? (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] ${active ? "bg-white text-[#e85a2a]" : "bg-[#e85a2a]/15 text-[#e85a2a]"}`}>
                            {item.badge}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Floor Service Buttons */}
              <div className="space-y-2 pt-4 border-t border-amber-950/5">
                <p className="text-[10px] font-extrabold uppercase text-[#78716c]">Call Floor Waiter</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => callWaiter("WATER", "Water request")} className="py-2.5 rounded-xl bg-amber-900/5 text-xs font-bold text-[#1c1917]">
                    💧 Water
                  </button>
                  <button onClick={() => callWaiter("BILL", "Bill request")} className="py-2.5 rounded-xl bg-[#e85a2a]/10 text-xs font-bold text-[#e85a2a]">
                    🧾 Bill
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── AI ORDER ASSISTANT FLOATING WIDGET ──────────────────────────── */}
      <AIChatWidget
        restaurant={{ ...restaurant, slug }}
        table={table}
        slug={slug}
        tableToken={tableToken}
        onOpenCart={() => setShowCartDrawer(true)}
        onTriggerCheckout={() => setShowCartDrawer(true)}
      />
    </div>
  );
}
