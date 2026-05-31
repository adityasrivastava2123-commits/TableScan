"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Plus, Minus, X, Search, ChevronRight, Star, Clock, MapPin, ArrowLeft, Users, Check, Flame } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import axios from "axios";

// ─── Types ────────────────────────────────────────────────────────────────────
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
interface Table { id: string; name: string; qrToken: string; location?: { name: string } | null; capacity?: number | null; }
interface ActiveOrder { id: string; orderNumber: string; status: string; }

interface SplitPerson { id: string; name: string; itemIds: string[]; }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function VegDot({ isVeg }: { isVeg: boolean }) {
  return (
    <span className={`w-[14px] h-[14px] border-2 rounded-[3px] flex-shrink-0 flex items-center justify-center ${isVeg ? "border-[#22c55e]" : "border-[#ef4444]"}`}>
      <span className={`w-[6px] h-[6px] rounded-full ${isVeg ? "bg-[#22c55e]" : "bg-[#ef4444]"}`} />
    </span>
  );
}

function TagBadge({ tag }: { tag: string }) {
  const styles: Record<string, string> = {
    "bestseller": "bg-[rgba(249,115,22,0.15)] text-[#f97316] border-[rgba(249,115,22,0.3)]",
    "top": "bg-[rgba(249,115,22,0.15)] text-[#f97316] border-[rgba(249,115,22,0.3)]",
    "chef special": "bg-[rgba(168,85,247,0.15)] text-[#c084fc] border-[rgba(168,85,247,0.3)]",
    "must try": "bg-[rgba(34,197,94,0.15)] text-[#4ade80] border-[rgba(34,197,94,0.3)]",
    "new": "bg-[rgba(59,130,246,0.15)] text-[#60a5fa] border-[rgba(59,130,246,0.3)]",
    "spicy": "bg-[rgba(239,68,68,0.15)] text-[#f87171] border-[rgba(239,68,68,0.3)]",
  };
  const style = styles[tag.toLowerCase()] ?? "bg-[#ebebeb] text-[#6b6b6b] border-[#e5e5e0]";
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border tracking-wide uppercase ${style}`}>
      {tag}
    </span>
  );
}

const SPICE_LEVELS = ["Mild", "Medium", "Hot", "Extra Hot"];
const STATUS_STEPS = ["NEW", "PREPARING", "READY", "DONE"];
const STATUS_LABELS: Record<string, string> = { NEW: "Placed", PREPARING: "Preparing", READY: "Ready", DONE: "Served" };

// Translations
const translations = {
  en: {
    all: "All",
    bestsellers: "Bestsellers",
    split: "Split",
    table: "Table",
    seats: "seats",
    searchPlaceholder: "Search dishes...",
    results: "results",
    for: "for",
    items: "items",
    noItemsMatch: "No items match your search",
    noItemsHere: "No items here",
    customizeYourDish: "Customize your dish",
    sizeOption: "Size / Option",
    spiceLevel: "Spice Level",
    addOns: "Add-ons",
    specialInstructions: "Special Instructions",
    specialInstructionsPlaceholder: "e.g. less spicy, no onions, extra crispy...",
    itemTotal: "Item Total",
    addToOrder: "Add to Order",
    splitBill: "Split Bill",
    splitBillDesc: "Divide the order among people at your table",
    addItemsFirst: "Add items to your cart first",
    addPerson: "Add Person",
    totalBill: "Total Bill",
    confirmSplit: "Confirm Split & Pay Individually",
    viewOrder: "View Order",
    minTotal: "min total",
    options: "options",
    order: "Order",
    track: "Track",
    pureVeg: "Pure Veg",
  },
  hi: {
    all: "सब",
    bestsellers: "बेस्टसेलर",
    split: "बिल बांटें",
    table: "टेबल",
    seats: "सीटें",
    searchPlaceholder: "व्यंजन खोजें...",
    results: "परिणाम",
    for: "के लिए",
    items: "आइटम",
    noItemsMatch: "कोई आइटम मेल नहीं खाता",
    noItemsHere: "यहां कोई आइटम नहीं",
    customizeYourDish: "अपना व्यंजन कस्टमाइज़ करें",
    sizeOption: "साइज़ / विकल्प",
    spiceLevel: "मसाला स्तर",
    addOns: "अतिरिक्त",
    specialInstructions: "विशेष निर्देश",
    specialInstructionsPlaceholder: "जैसे कम मसालेदार, बिना प्याज़, अतिरिक्त कुरकुरा...",
    itemTotal: "कुल राशि",
    addToOrder: "ऑर्डर में जोड़ें",
    splitBill: "बिल बांटें",
    splitBillDesc: "अपनी टेबल पर लोगों के बीच ऑर्डर बांटें",
    addItemsFirst: "पहले अपनी कार्ट में आइटम जोड़ें",
    addPerson: "व्यक्ति जोड़ें",
    totalBill: "कुल बिल",
    confirmSplit: "पुष्टि करें और अलग से भुगतान करें",
    viewOrder: "ऑर्डर देखें",
    minTotal: "मिनट कुल",
    options: "विकल्प",
    order: "ऑर्डर",
    track: "ट्रैक करें",
    pureVeg: "शुद्ध शाकाहारी",
  },
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CustomerMenu({
  restaurant, table, slug, tableToken, activeOrder: initialActiveOrder,
}: {
  restaurant: Restaurant;
  table: Table; slug: string; tableToken: string;
  activeOrder?: ActiveOrder | null;
}) {
  const router = useRouter();
  const { addItem, items, getTotalItems, getTotalPrice, setTableInfo } = useCartStore();

  // Prevent hydration mismatch — cart is persisted in localStorage, only available client-side
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const cartItems = mounted ? items : [];
  const totalItems = mounted ? getTotalItems() : 0;
  const subtotal = mounted ? getTotalPrice() : 0;

  // Nav
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // Item modal
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [itemQty, setItemQty] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [spiceLevel, setSpiceLevel] = useState("Medium");
  const [addOns, setAddOns] = useState<string[]>([]);
  const [itemNote, setItemNote] = useState("");

  // Split bill
  const [showSplit, setShowSplit] = useState(false);
  const [splitPeople, setSplitPeople] = useState<SplitPerson[]>([
    { id: "me", name: "You", itemIds: [] },
  ]);

  // Live order status
  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(initialActiveOrder ?? null);

  // Language
  const [language, setLanguage] = useState<"en" | "hi">("en");

  const t = translations[language];

  useEffect(() => { setTableInfo(slug, tableToken); }, [slug, tableToken, setTableInfo]);

  // Poll active order status every 15s
  useEffect(() => {
    if (!activeOrder) return;
    const interval = setInterval(async () => {
      try {
        const { data } = await axios.get(`/api/orders/${activeOrder.id}`);
        if (data.status === "DONE" || data.status === "CANCELLED") {
          setActiveOrder(null);
        } else {
          setActiveOrder((prev) => prev ? { ...prev, status: data.status } : prev);
        }
      } catch { /* silent */ }
    }, 15000);
    return () => clearInterval(interval);
  }, [activeOrder]);

  // Reset modal state when item changes
  useEffect(() => {
    if (selectedItem) {
      setSelectedVariant(selectedItem.variants[0] ?? null);
      setItemNote(""); setItemQty(1); setSpiceLevel("Medium"); setAddOns([]);
    }
  }, [selectedItem]);

  const effectivePrice = selectedVariant ? selectedVariant.price : (selectedItem?.price ?? 0);

  // All items flat list
  const allItems = useMemo(() =>
    restaurant.categories.flatMap((c) => c.menuItems),
    [restaurant.categories]
  );

  const bestsellers = useMemo(() =>
    allItems.filter((i) => i.tags.some((t) => ["bestseller", "top", "must try", "chef special"].includes(t.toLowerCase()))),
    [allItems]
  );

  const displayItems = useMemo(() => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return allItems.filter((i) =>
        i.name.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q) ||
        i.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    if (activeCategory === "all") return allItems;
    if (activeCategory === "bestsellers") return bestsellers;
    return restaurant.categories.find((c) => c.id === activeCategory)?.menuItems ?? [];
  }, [searchQuery, activeCategory, allItems, bestsellers, restaurant.categories]);

  const estimatedMinutes = useMemo(() =>
    cartItems.reduce((max) => Math.max(max, 20), 0),
    [cartItems]
  );

  function getItemQtyInCart(itemId: string) {
    return cartItems.filter((i) => i.id === itemId || i.id.startsWith(itemId + "-"))
      .reduce((s, i) => s + i.quantity, 0);
  }

  function handleAddToCart() {
    if (!selectedItem) return;
    const hasSpice = selectedItem.tags.some((t) => ["spicy", "curry", "masala"].includes(t.toLowerCase()));
    const noteParts = [
      hasSpice ? `Spice: ${spiceLevel}` : null,
      addOns.length ? `Add-ons: ${addOns.join(", ")}` : null,
      itemNote || null,
    ].filter(Boolean);

    addItem({
      id: selectedVariant ? `${selectedItem.id}-${selectedVariant.id}` : selectedItem.id,
      name: selectedVariant ? `${selectedItem.name} (${selectedVariant.name})` : selectedItem.name,
      price: effectivePrice,
      quantity: itemQty,
      isVeg: selectedItem.isVeg,
      note: noteParts.join(" · ") || undefined,
    });
    toast.success(`${selectedItem.name} added!`, {
      style: { background: "#ffffff", color: "#1a1a1a", border: "1px solid rgba(255,255,255,0.07)" },
      iconTheme: { primary: "#f97316", secondary: "#fff" },
    });
    setSelectedItem(null);
  }

  // Split bill helpers
  function addSplitPerson() {
    setSplitPeople((p) => [...p, { id: Date.now().toString(), name: `Person ${p.length + 1}`, itemIds: [] }]);
  }
  function toggleItemForPerson(personId: string, itemId: string) {
    setSplitPeople((people) => people.map((p) => {
      if (p.id !== personId) return p;
      return { ...p, itemIds: p.itemIds.includes(itemId) ? p.itemIds.filter((i) => i !== itemId) : [...p.itemIds, itemId] };
    }));
  }
  function getPersonTotal(person: SplitPerson) {
    return cartItems.filter((i) => person.itemIds.includes(i.id))
      .reduce((s, i) => s + i.price * i.quantity, 0);
  }

  return (
    <div className="min-h-screen bg-[#f5f5f0] pb-32 font-sans">

      {/* ── Active Order Status Bar ── */}
      {activeOrder && (
        <div className="bg-white border-b border-[rgba(249,115,22,0.2)] px-4 py-2.5">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <span className="text-[10px] font-bold text-[#f97316] tracking-wider uppercase">Order #{activeOrder.orderNumber}</span>
            <div className="flex items-center gap-1 flex-1">
              {STATUS_STEPS.slice(0, 3).map((s, i) => {
                const idx = STATUS_STEPS.indexOf(activeOrder.status);
                const done = i < idx; const active = i === idx;
                return (
                  <div key={s} className="flex items-center gap-1 flex-1">
                    <div className={`flex items-center gap-1 ${active ? "text-[#f97316]" : done ? "text-[#4ade80]" : "text-[#c0c0c0]"}`}>
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold border ${active ? "border-[#f97316] bg-[rgba(249,115,22,0.15)]" : done ? "border-[#4ade80] bg-[rgba(34,197,94,0.1)]" : "border-[#e0e0db] bg-[#f0f0eb]"}`}>
                        {done ? "✓" : i + 1}
                      </div>
                      <span className="text-[9px] font-medium hidden sm:block">{STATUS_LABELS[s]}</span>
                    </div>
                    {i < 2 && <div className={`flex-1 h-px mx-1 ${done ? "bg-[#4ade80]" : "bg-[#e0e0db]"}`} />}
                  </div>
                );
              })}
            </div>
            <button onClick={() => router.push(`/${slug}/${tableToken}/order-status?orderId=${activeOrder.id}`)}
              className="text-[10px] text-[#f97316] font-semibold flex items-center gap-0.5">
              {t.track} <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="bg-[#f5f5f0]/95 backdrop-blur-xl border-b border-[#e8e8e3] sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-0">
          {/* Top row */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              {restaurant.logo ? (
                <img src={restaurant.logo} alt={restaurant.name} className="w-11 h-11 rounded-xl object-cover border border-[#e5e5e0]" />
              ) : (
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#f97316] to-[#ea6c0a] flex items-center justify-center flex-shrink-0">
                  <span className="text-base font-bold text-white">{restaurant.name[0]}</span>
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-bold text-[16px] text-[#1a1a1a] leading-tight">{restaurant.name}</h1>
                  {restaurant.description?.toLowerCase().includes("veg") && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-[#22c55e] text-[#22c55e] bg-[rgba(34,197,94,0.08)]">{t.pureVeg}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {table.location?.name && (
                    <span className="text-[11px] text-[#9a9a9a] flex items-center gap-1">
                      <MapPin className="w-2.5 h-2.5" />{table.location.name}
                    </span>
                  )}
                  <span className="text-[#c0c0c0]">·</span>
                  <span className="text-[11px] text-[#9a9a9a] flex items-center gap-1">
                    <Star className="w-2.5 h-2.5 fill-[#f97316] text-[#f97316]" />4.5
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLanguage(language === "en" ? "hi" : "en")}
                className="text-[11px] text-[#6b6b6b] bg-[#f0f0eb] border border-[#e5e5e0] px-2.5 py-1.5 rounded-lg hover:border-[#f97316] hover:text-[#f97316] transition-all font-medium"
              >
                {language === "en" ? "हिं" : "EN"}
              </button>
              <button onClick={() => { setShowSplit(true); }}
                className="text-[11px] text-[#6b6b6b] bg-[#f0f0eb] border border-[#e5e5e0] px-2.5 py-1.5 rounded-lg hover:border-[#f97316] hover:text-[#f97316] transition-all flex items-center gap-1">
                <Users className="w-3 h-3" /> {t.split}
              </button>
              <button onClick={() => { setShowSearch(!showSearch); setSearchQuery(""); }}
                className={`p-2 rounded-lg transition-colors ${showSearch ? "bg-[#f97316] text-white" : "bg-[#f0f0eb] text-[#6b6b6b] border border-[#e5e5e0]"}`}>
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Table badge */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[11px] text-[#6b6b6b] bg-[#f0f0eb] border border-[#e5e5e0] px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
              {t.table} {table.name}{table.capacity ? ` · ${table.capacity} ${t.seats}` : ""}
            </span>
          </div>

          {/* Search */}
          {showSearch && (
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9a9a9a]" />
              <input autoFocus type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full bg-[#f0f0eb] border border-[#e5e5e0] rounded-xl pl-9 pr-9 py-2.5 text-[13px] text-[#1a1a1a] placeholder-[#b0b0b0] focus:outline-none focus:border-[#f97316] transition-colors" />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9a9a9a]">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Category tabs */}
          {!searchQuery.trim() && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-3 -mx-4 px-4">
              {[
                { id: "all", name: t.all },
                { id: "bestsellers", name: `⭐ ${t.bestsellers}` },
                ...restaurant.categories.map((c) => ({ id: c.id, name: c.name })),
              ].map((cat) => (
                <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                  className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-all flex-shrink-0 ${
                    activeCategory === cat.id
                      ? "bg-[#f97316] text-white shadow-lg shadow-[#f97316]/20"
                      : "bg-[#f0f0eb] text-[#6b6b6b] border border-[#e5e5e0] hover:border-[#f97316]/40 hover:text-[#1a1a1a]"
                  }`}>
                  {cat.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Menu Items ── */}
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-2">
        {searchQuery.trim() && (
          <p className="text-[12px] text-[#9a9a9a] mb-2">
            {displayItems.length} {t.results} {t.for} &ldquo;{searchQuery}&rdquo;
          </p>
        )}

        {/* Category section headers when showing all */}
        {!searchQuery.trim() && activeCategory === "all" ? (
          restaurant.categories.map((cat) => (
            <div key={cat.id}>
              <div className="flex items-center gap-2 pt-3 pb-2">
                <h2 className="text-[13px] font-bold text-[#1a1a1a]">{cat.name}</h2>
                <span className="text-[10px] text-[#9a9a9a]">{cat.menuItems.length} {t.items}</span>
              </div>
              {cat.menuItems.map((item) => <MenuItemCard key={item.id} item={item} qtyInCart={getItemQtyInCart(item.id)} onSelect={() => setSelectedItem(item)} language={language} />)}
            </div>
          ))
        ) : (
          <>
            {displayItems.length === 0 && (
              <div className="text-center py-16">
                <p className="text-[#9a9a9a] text-sm">{searchQuery.trim() ? t.noItemsMatch : t.noItemsHere}</p>
              </div>
            )}
            {displayItems.map((item) => (
              <MenuItemCard key={item.id} item={item} qtyInCart={getItemQtyInCart(item.id)} onSelect={() => setSelectedItem(item)} language={language} />
            ))}
          </>
        )}
      </div>

      {/* ── Item Modal ── */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-end justify-center" onClick={() => setSelectedItem(null)}>
          <div className="bg-white w-full max-w-2xl rounded-t-2xl overflow-hidden animate-slide-up max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {selectedItem.image && (
              <div className="relative">
                <img src={selectedItem.image} alt={selectedItem.name} className="w-full h-52 object-cover" />
                <button onClick={() => setSelectedItem(null)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur flex items-center justify-center text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="p-5 space-y-4">
              {/* Title */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 flex-1">
                  <VegDot isVeg={selectedItem.isVeg} />
                  <div>
                    <h2 className="text-[17px] font-bold text-[#1a1a1a] leading-tight">{selectedItem.name}</h2>
                    {selectedItem.description && <p className="text-[12px] text-[#6b6b6b] mt-1 leading-relaxed">{selectedItem.description}</p>}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {selectedItem.tags.map((t) => <TagBadge key={t} tag={t} />)}
                    </div>
                  </div>
                </div>
                {!selectedItem.image && (
                  <button onClick={() => setSelectedItem(null)} className="text-[#9a9a9a] hover:text-[#1a1a1a] flex-shrink-0"><X className="w-5 h-5" /></button>
                )}
              </div>

              {/* Customize label */}
              <p className="text-[11px] font-semibold text-[#9a9a9a] uppercase tracking-wider">{t.customizeYourDish}</p>

              {/* Variants */}
              {selectedItem.variants.length > 0 && (
                <div>
                  <p className="text-[12px] font-semibold text-[#6b6b6b] mb-2">{t.sizeOption}</p>
                  <div className="space-y-2">
                    {selectedItem.variants.map((v) => (
                      <button key={v.id} onClick={() => setSelectedVariant(v)}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-[13px] transition-all ${selectedVariant?.id === v.id ? "border-[#f97316] bg-[rgba(249,115,22,0.08)]" : "border-[#e5e5e0] bg-[#f0f0eb] hover:border-[#d5d5d0]"}`}>
                        <span className={`font-medium ${selectedVariant?.id === v.id ? "text-[#1a1a1a]" : "text-[#6b6b6b]"}`}>{v.name}</span>
                        <span className={`font-semibold ${selectedVariant?.id === v.id ? "text-[#f97316]" : "text-[#6b6b6b]"}`}>₹{v.price}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Spice level */}
              <div>
                <p className="text-[12px] font-semibold text-[#6b6b6b] mb-2">🌶️ {t.spiceLevel}</p>
                <div className="flex gap-2 flex-wrap">
                  {SPICE_LEVELS.map((level) => (
                    <button key={level} onClick={() => setSpiceLevel(level)}
                      className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all ${spiceLevel === level ? "border-[#f97316] bg-[rgba(249,115,22,0.1)] text-[#f97316]" : "border-[#e5e5e0] bg-[#f0f0eb] text-[#6b6b6b] hover:border-[#d5d5d0]"}`}>
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Add-ons */}
              <div>
                <p className="text-[12px] font-semibold text-[#6b6b6b] mb-2">➕ {t.addOns}</p>
                <div className="space-y-2">
                  {[
                    { name: "Extra Butter Naan", price: 35 },
                    { name: "Extra Raita", price: 25 },
                    { name: "Extra Gravy", price: 30 },
                  ].map((addon) => (
                    <button key={addon.name} onClick={() => setAddOns((prev) => prev.includes(addon.name) ? prev.filter((a) => a !== addon.name) : [...prev, addon.name])}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-[13px] transition-all ${addOns.includes(addon.name) ? "border-[#f97316] bg-[rgba(249,115,22,0.08)]" : "border-[#e5e5e0] bg-[#f0f0eb] hover:border-[#d5d5d0]"}`}>
                      <span className={`font-medium ${addOns.includes(addon.name) ? "text-[#1a1a1a]" : "text-[#6b6b6b]"}`}>{addon.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[#6b6b6b] text-[12px]">+₹{addon.price}</span>
                        {addOns.includes(addon.name) && <Check className="w-3.5 h-3.5 text-[#f97316]" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Special instructions */}
              <div>
                <p className="text-[12px] font-semibold text-[#6b6b6b] mb-2">📝 {t.specialInstructions}</p>
                <input type="text" value={itemNote} onChange={(e) => setItemNote(e.target.value)}
                  placeholder={t.specialInstructionsPlaceholder}
                  className="w-full bg-[#f0f0eb] border border-[#e5e5e0] rounded-xl px-3.5 py-2.5 text-[13px] text-[#1a1a1a] placeholder-[#b0b0b0] focus:outline-none focus:border-[#f97316] transition-colors" />
              </div>

              {/* Qty + price */}
              <div className="flex items-center justify-between pt-1 border-t border-[#e8e8e3]">
                <span className="text-[12px] text-[#6b6b6b]">{t.itemTotal}</span>
                <span className="text-[16px] font-bold text-[#1a1a1a]">₹{effectivePrice * itemQty}</span>
              </div>

              {/* Qty + Add */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-3 bg-[#f0f0eb] border border-[#e5e5e0] rounded-xl px-3 py-2">
                  <button onClick={() => setItemQty(Math.max(1, itemQty - 1))} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-[#e8e8e3] text-[#1a1a1a]"><Minus className="w-3.5 h-3.5" /></button>
                  <span className="text-[15px] font-bold w-5 text-center text-[#1a1a1a]">{itemQty}</span>
                  <button onClick={() => setItemQty(itemQty + 1)} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-[#e8e8e3] text-[#1a1a1a]"><Plus className="w-3.5 h-3.5" /></button>
                </div>
                <button onClick={handleAddToCart}
                  className="flex-1 py-3 rounded-xl bg-[#f97316] hover:bg-[#ea6c0a] text-white text-[14px] font-bold transition-colors shadow-lg shadow-[#f97316]/20">
                  {t.addToOrder} →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Split Bill Modal ── */}
      {showSplit && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-end justify-center" onClick={() => setShowSplit(false)}>
          <div className="bg-white w-full max-w-2xl rounded-t-2xl overflow-hidden animate-slide-up max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-[#e8e8e3]">
              <div>
                <h2 className="text-[16px] font-bold text-[#1a1a1a]">🧾 {t.splitBill}</h2>
                <p className="text-[11px] text-[#6b6b6b] mt-0.5">{t.splitBillDesc}</p>
              </div>
              <button onClick={() => setShowSplit(false)} className="text-[#9a9a9a] hover:text-[#1a1a1a]"><X className="w-5 h-5" /></button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-3">
              {cartItems.length === 0 ? (
                <p className="text-center text-[#9a9a9a] text-sm py-8">{t.addItemsFirst}</p>
              ) : (
                <>
                  {splitPeople.map((person) => (
                    <div key={person.id} className="bg-[#f0f0eb] border border-[#e5e5e0] rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#f97316] flex items-center justify-center text-[12px] font-bold text-white">
                            {person.name[0].toUpperCase()}
                          </div>
                          <input value={person.name}
                            onChange={(e) => setSplitPeople((p) => p.map((x) => x.id === person.id ? { ...x, name: e.target.value } : x))}
                            className="bg-transparent text-[14px] font-semibold text-[#1a1a1a] outline-none border-b border-transparent focus:border-[#f97316] transition-colors" />
                        </div>
                        <span className="text-[14px] font-bold text-[#f97316]">₹{getPersonTotal(person).toFixed(0)}</span>
                      </div>
                      <div className="space-y-1.5">
                        {cartItems.map((item) => (
                          <button key={item.id} onClick={() => toggleItemForPerson(person.id, item.id)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[12px] border transition-all ${person.itemIds.includes(item.id) ? "border-[#f97316] bg-[rgba(249,115,22,0.08)]" : "border-[#e5e5e0] bg-white hover:border-[#d5d5d0]"}`}>
                            <span className={person.itemIds.includes(item.id) ? "text-[#1a1a1a]" : "text-[#6b6b6b]"}>{item.name} ×{item.quantity}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[#6b6b6b]">₹{(item.price * item.quantity).toFixed(0)}</span>
                              {person.itemIds.includes(item.id) && <Check className="w-3 h-3 text-[#f97316]" />}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            <div className="p-5 border-t border-[#e8e8e3] space-y-3">
              <button onClick={addSplitPerson}
                className="w-full py-2.5 rounded-xl border border-dashed border-[#d5d5d0] text-[#6b6b6b] text-[13px] font-medium hover:border-[#f97316] hover:text-[#f97316] transition-all">
                + {t.addPerson}
              </button>
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-[#6b6b6b]">{t.totalBill}</span>
                <span className="font-bold text-[#1a1a1a]">₹{subtotal.toFixed(0)}</span>
              </div>
              <button onClick={() => { setShowSplit(false); router.push(`/${slug}/${tableToken}/checkout`); }}
                className="w-full py-3 rounded-xl bg-[#f97316] hover:bg-[#ea6c0a] text-white text-[14px] font-bold transition-colors">
                {t.confirmSplit}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Cart Bar ── */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 px-4 pb-4 z-40">
          <div className="max-w-2xl mx-auto bg-[#f0f0eb] border border-[#e0e0db] rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-[#f97316] flex items-center justify-center">
                  <span className="text-[11px] font-bold text-white">{totalItems}</span>
                </div>
                <div>
                  <span className="text-[13px] font-semibold text-[#1a1a1a]">₹{subtotal.toFixed(0)}</span>
                  <span className="text-[11px] text-[#9a9a9a] ml-2 flex items-center gap-1 inline-flex">
                    <Clock className="w-3 h-3" />~{estimatedMinutes} {t.minTotal}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowSplit(true)}
                  className="text-[11px] text-[#6b6b6b] border border-[#d5d5d0] px-2.5 py-1.5 rounded-lg hover:border-[#f97316] hover:text-[#f97316] transition-all">
                  {t.split}
                </button>
                <button onClick={() => router.push(`/${slug}/${tableToken}/cart`)}
                  className="bg-[#f97316] hover:bg-[#ea6c0a] text-white px-4 py-2 rounded-xl text-[13px] font-bold transition-colors flex items-center gap-1.5">
                  {t.viewOrder} <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Menu Item Card ────────────────────────────────────────────────────────────
function MenuItemCard({ item, qtyInCart, onSelect, language }: { item: MenuItem; qtyInCart: number; onSelect: () => void; language: "en" | "hi"; }) {
  const isBestseller = item.tags.some((t) => ["bestseller", "top"].includes(t.toLowerCase()));
  const t = translations[language];
  return (
    <div className={`bg-white border rounded-xl p-3.5 flex items-center gap-3 cursor-pointer transition-all active:scale-[0.99] ${isBestseller ? "border-[rgba(249,115,22,0.2)] hover:border-[rgba(249,115,22,0.4)]" : "border-[#e8e8e3] hover:border-[#e0e0db]"}`}
      onClick={onSelect}>
      <div className="flex items-start gap-2.5 flex-1 min-w-0">
        <VegDot isVeg={item.isVeg} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-semibold text-[14px] text-[#1a1a1a] leading-tight">{item.name}</p>
            {item.tags.slice(0, 2).map((t) => <TagBadge key={t} tag={t} />)}
          </div>
          {item.description && (
            <p className="text-[11px] text-[#9a9a9a] mt-0.5 line-clamp-2 leading-relaxed">{item.description}</p>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            <p className="font-bold text-[13px] text-[#1a1a1a]">₹{item.price}</p>
            {item.variants.length > 0 && (
              <span className="text-[10px] text-[#9a9a9a] bg-[#f0f0eb] border border-[#e5e5e0] px-1.5 py-0.5 rounded">{item.variants.length} {t.options}</span>
            )}
          </div>
        </div>
      </div>
      {item.image ? (
        <div className="relative flex-shrink-0">
          <img src={item.image} alt={item.name} className="w-[72px] h-[72px] rounded-xl object-cover border border-[#e8e8e3]" />
          <div className="absolute -bottom-2 -right-2">
            {qtyInCart > 0 ? (
              <div className="w-7 h-7 rounded-full bg-[#f97316] flex items-center justify-center shadow-lg">
                <span className="text-[11px] font-bold text-white">{qtyInCart}</span>
              </div>
            ) : (
              <div className="w-7 h-7 rounded-full bg-[#f97316] flex items-center justify-center shadow-lg">
                <Plus className="w-3.5 h-3.5 text-white" />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-shrink-0">
          {qtyInCart > 0 ? (
            <div className="w-8 h-8 rounded-full bg-[#f97316] flex items-center justify-center">
              <span className="text-[12px] font-bold text-white">{qtyInCart}</span>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#f97316] flex items-center justify-center">
              <Plus className="w-4 h-4 text-white" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
