"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Plus, Minus, X, Search, ChevronRight, Star, Clock, 
  MapPin, Check, Flame, ShoppingBag, Utensils, Heart, BellRing, Grid, ArrowRight, CreditCard, User, LogIn, Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";

// ─── Curated Mock Food Items ──────────────────────────────────────────────────
interface FoodItem {
  id: string;
  name: string;
  subtitle: string;
  price: number;
  calories: number;
  category: string;
  image: string;
  ingredients: { emoji: string; name: string }[];
}

const MOCK_ITEMS: FoodItem[] = [
  {
    id: "pizza-1",
    name: "Fresh Pizza",
    subtitle: "Gourmet Margherita pizza with fresh basil",
    price: 9.96,
    calories: 480,
    category: "Bakery",
    image: "🍕",
    ingredients: [
      { emoji: "🍅", name: "Tomato Sauce" },
      { emoji: "🧀", name: "Mozzarella" },
      { emoji: "🍃", name: "Fresh Basil" }
    ]
  },
  {
    id: "curry-1",
    name: "Lentil Curry",
    subtitle: "Warm high-protein lentil curry bowl",
    price: 9.99,
    calories: 375,
    category: "Seafood", // Fits Dribbble category tabs
    image: "🍲",
    ingredients: [
      { emoji: "🥔", name: "Red Lentils" },
      { emoji: "🧅", name: "Sweet Onions" },
      { emoji: "🌶️", name: "Indian Spices" }
    ]
  },
  {
    id: "sushi-1",
    name: "Salmon Sushi",
    subtitle: "Fresh Atlantic salmon nigiri platter",
    price: 12.50,
    calories: 310,
    category: "Sushi",
    image: "🍣",
    ingredients: [
      { emoji: "🐟", name: "Fresh Salmon" },
      { emoji: "🍚", name: "Vinegar Rice" },
      { emoji: "🥢", name: "Wasabi" }
    ]
  },
  {
    id: "burger-1",
    name: "Gourmet Burger",
    subtitle: "Handcrafted double cheese beef burger",
    price: 8.95,
    calories: 510,
    category: "All",
    image: "🍔",
    ingredients: [
      { emoji: "🥩", name: "Angus Beef" },
      { emoji: "🧀", name: "Cheddar" },
      { emoji: "🥬", name: "Crisp Lettuce" }
    ]
  },
  {
    id: "drink-1",
    name: "Matcha Latte",
    subtitle: "Ceremonial grade iced matcha latte",
    price: 4.99,
    calories: 150,
    category: "Drink",
    image: "🍹",
    ingredients: [
      { emoji: "🍃", name: "Matcha Powder" },
      { emoji: "🥛", name: "Oat Milk" },
      { emoji: "🍯", name: "Honey" }
    ]
  }
];

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export default function DribbbleShowcase() {
  // Navigation Screens State
  // "onboarding" | "login" | "home" | "discovery" | "details" | "checkout" | "tracking"
  const [activeScreen, setActiveScreen] = useState<string>("onboarding");

  // Dynamic Interactive States
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<string[]>(["pizza-1"]);
  const [selectedItem, setSelectedItem] = useState<FoodItem>(MOCK_ITEMS[0]);
  const [detailQty, setDetailQty] = useState(2);
  const [emailInput, setEmailInput] = useState("hi.kitsbase@gmail.com");
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Checkout selections
  const [shippingAddress, setShippingAddress] = useState<"home" | "office">("home");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "paypal">("card");

  // Cart operations
  const addToCart = (item: FoodItem, quantity: number = 1) => {
    setCart((prev) => {
      const existing = prev.find((ci) => ci.id === item.id);
      if (existing) {
        return prev.map((ci) => ci.id === item.id ? { ...ci, quantity: ci.quantity + quantity } : ci);
      }
      return [...prev, { id: item.id, name: item.name, price: item.price, quantity, image: item.image }];
    });
    toast.success(`${item.name} added to cart!`, {
      style: { background: "#2F7D57", color: "#fff", borderRadius: "18px", fontFamily: "Poppins" }
    });
  };

  const updateCartQty = (id: string, delta: number) => {
    setCart((prev) => prev.map((ci) => {
      if (ci.id === id) {
        const newQty = ci.quantity + delta;
        return newQty > 0 ? { ...ci, quantity: newQty } : null;
      }
      return ci;
    }).filter(Boolean) as CartItem[]);
  };

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => prev.includes(id) ? prev.filter((fid) => fid !== id) : [...prev, id]);
    toast.success(favorites.includes(id) ? "Removed from Favorites" : "Added to Favorites", {
      style: { background: "#111", color: "#fff", borderRadius: "18px", fontFamily: "Poppins" }
    });
  };

  const cartSubtotal = cart.reduce((sum, ci) => sum + ci.price * ci.quantity, 0);
  const totalCartItems = cart.reduce((sum, ci) => sum + ci.quantity, 0);

  // Filter items for Home
  const filteredHomeItems = useMemo(() => {
    let base = MOCK_ITEMS;
    if (activeCategory !== "All") {
      base = MOCK_ITEMS.filter((item) => item.category === activeCategory);
    }
    if (searchQuery.trim()) {
      base = base.filter((item) => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return base;
  }, [activeCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-[#111827] flex font-sans antialiased overflow-x-hidden relative">
      <Toaster position="bottom-center" />

      {/* ── Poppins Typography Loader ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap');
        .font-poppins {
          font-family: 'Poppins', sans-serif;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* ── LEFT HALF: Premium Design Playground (Desktop Only) ── */}
      <aside className="hidden lg:flex w-2/5 xl:w-[35%] bg-white border-r border-slate-200/60 p-8 flex-col justify-between overflow-y-auto scrollbar-hide">
        <div className="space-y-8">
          {/* Brand Header */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-[14px] bg-gradient-to-br from-[#2F7D57] to-[#1E5A44] flex items-center justify-center text-white text-lg shadow-md shadow-emerald-950/15">
              <Sparkles className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight font-poppins text-slate-900 leading-tight">Dribbble UI Lab</h2>
              <p className="text-[10px] text-[#8A8A8A] font-extrabold uppercase tracking-widest mt-0.5">Premium Interactive Kit</p>
            </div>
          </div>

          <div className="h-px bg-slate-100" />

          {/* Interactive Screen Navigator */}
          <div className="space-y-3">
            <p className="text-[10px] font-extrabold text-[#8A8A8A] uppercase tracking-widest">Select Active Screen</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "onboarding", label: "04 Onboarding", icon: "✨" },
                { id: "login", label: "07 Login Auth", icon: "🔑" },
                { id: "home", label: "01 Home Feed", icon: "🏡" },
                { id: "discovery", label: "02 Discovery", icon: "🔍" },
                { id: "details", label: "03 Food Details", icon: "🍕" },
                { id: "checkout", label: "06 Checkout Billing", icon: "🧾" },
                { id: "tracking", label: "05 Live Tracking Map", icon: "📍" }
              ].map((scr) => (
                <button
                  key={scr.id}
                  onClick={() => {
                    setActiveScreen(scr.id);
                    if (scr.id === "details") setDetailQty(2);
                  }}
                  className={`flex items-center gap-2.5 px-4 py-3 rounded-[16px] text-xs font-bold border transition-all text-left ${
                    activeScreen === scr.id
                      ? "bg-[#2F7D57] border-[#2F7D57] text-white shadow-lg shadow-emerald-950/15"
                      : "bg-slate-50 border-slate-200/60 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <span className="text-sm">{scr.icon}</span>
                  <span className="font-poppins">{scr.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Design System Spec Sheet */}
          <div className="space-y-4">
            <p className="text-[10px] font-extrabold text-[#8A8A8A] uppercase tracking-widest">Visual Guidelines</p>
            <div className="bg-slate-50 border border-slate-100 rounded-[24px] p-5 space-y-4 font-poppins">
              <div className="space-y-2">
                <span className="text-[10px] font-extrabold text-slate-400 block uppercase">Palette Colors</span>
                <div className="flex gap-2">
                  <div className="flex-1 flex flex-col items-center p-2 rounded-xl bg-white border border-slate-200/50">
                    <span className="w-6 h-6 rounded-full bg-[#2F7D57] block shadow-inner" />
                    <span className="text-[9px] font-black text-slate-800 mt-1">#2F7D57</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center p-2 rounded-xl bg-white border border-slate-200/50">
                    <span className="w-6 h-6 rounded-full bg-[#FAFAFA] block shadow-inner border border-slate-200" />
                    <span className="text-[9px] font-black text-slate-800 mt-1">#FAFAFA</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center p-2 rounded-xl bg-white border border-slate-200/50">
                    <span className="w-6 h-6 rounded-full bg-[#8A8A8A] block shadow-inner" />
                    <span className="text-[9px] font-black text-slate-800 mt-1">#8A8A8A</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-600">
                <div className="space-y-1">
                  <span className="text-[9px] font-extrabold text-slate-400 block uppercase">Typography</span>
                  <p className="font-poppins text-slate-800">Poppins Stack</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-extrabold text-slate-400 block uppercase">Soft Shadows</span>
                  <p className="text-slate-800">Apple Glass Blur</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Session State Monitor */}
        <div className="bg-slate-900 text-white rounded-[24px] p-5 space-y-3.5 font-poppins">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-extrabold text-[#8A8A8A] uppercase tracking-widest">Active Cart Store</span>
            <span className="text-[10px] font-black bg-[#2F7D57] px-2 py-0.5 rounded-full">{totalCartItems} items</span>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Cart Total:</span>
              <span className="font-bold text-[#2F7D57]">${cartSubtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Shipping Address:</span>
              <span className="font-bold uppercase text-slate-200">{shippingAddress}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Payment:</span>
              <span className="font-bold uppercase text-slate-200">{paymentMethod}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ── RIGHT HALF: Immersive Phone Device Frame Showcase (Centered on desktop, full-screen on mobile) ── */}
      <main className="flex-1 flex items-center justify-center p-4 lg:p-8">
        
        {/* Apple-style iPhone Frame (renders full screen on actual mobile devices) */}
        <div className="w-full max-w-sm sm:h-[844px] sm:rounded-[55px] bg-[#FAFAFA] sm:border-[12px] border-slate-950 sm:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.2)] overflow-hidden relative flex flex-col font-poppins">
          
          {/* iPhone Notch Speaker & Camera (Desktop only) */}
          <div className="hidden sm:block absolute top-0 left-1/2 -translate-x-1/2 w-40 h-7 bg-slate-950 rounded-b-[20px] z-50">
            <div className="absolute top-2 left-12 w-16 h-1 bg-zinc-800 rounded-full" />
            <div className="absolute top-1.5 right-12 w-2 h-2 bg-zinc-900 rounded-full" />
          </div>

          {/* Screen Content Wrapper */}
          <div className="flex-1 overflow-hidden relative flex flex-col bg-[#FAFAFA]">
            <AnimatePresence mode="wait">
              
              {/* SCREEN 4 - ONBOARDING */}
              {activeScreen === "onboarding" && (
                <motion.div
                  key="onboarding"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 flex flex-col justify-between p-7 bg-[#FAFAFA]"
                >
                  <div className="flex justify-between items-center pt-4">
                    <span className="text-[12px] font-black text-[#2F7D57] tracking-widest uppercase">FoodHub</span>
                    <button onClick={() => setActiveScreen("home")} className="text-xs font-bold text-[#8A8A8A] hover:text-[#111827]">
                      Skip
                    </button>
                  </div>

                  {/* Centered Graphic Composition */}
                  <div className="flex-1 flex flex-col justify-center items-center py-6 text-center space-y-6">
                    <div className="relative w-48 h-48 bg-emerald-500/5 rounded-full flex items-center justify-center shadow-inner">
                      <div className="absolute w-36 h-36 bg-[#2F7D57]/10 rounded-full blur-[20px] animate-pulse" />
                      <span className="text-8xl relative z-10 filter drop-shadow-xl animate-bounce">🍔</span>
                    </div>
                    <div className="space-y-3.5 px-2">
                      <h2 className="text-2xl font-black text-slate-900 leading-tight tracking-tight">
                        Choose Your Menu<br />& Order Directly
                      </h2>
                      <p className="text-xs text-[#8A8A8A] leading-relaxed font-medium">
                        Order your desired food from our menu and get easily.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 pb-2">
                    <button
                      onClick={() => setActiveScreen("login")}
                      className="w-full py-4 bg-[#2F7D57] hover:bg-[#256345] text-white rounded-[18px] text-xs font-bold tracking-widest uppercase shadow-lg shadow-emerald-950/15 flex items-center justify-center gap-2 transition-transform active:scale-95"
                    >
                      <span>Get Started</span>
                      <ArrowRight className="size-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* SCREEN 7 - LOGIN */}
              {activeScreen === "login" && (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 flex flex-col justify-between p-7 bg-[#FAFAFA]"
                >
                  <div className="pt-4">
                    <button onClick={() => setActiveScreen("onboarding")} className="text-xs font-bold text-[#8A8A8A] hover:text-slate-900">
                      ← Back
                    </button>
                  </div>

                  <div className="flex-1 flex flex-col justify-center space-y-6">
                    <div className="text-center space-y-2">
                      <div className="w-14 h-14 bg-[#2F7D57]/10 border border-[#2F7D57]/20 rounded-[20px] flex items-center justify-center text-2xl mx-auto shadow-sm">
                        🔑
                      </div>
                      <h2 className="text-2xl font-black text-slate-900 tracking-tight pt-2">Welcome Back</h2>
                      <p className="text-xs text-[#8A8A8A] font-semibold">Hello there, sign in to continue!</p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Email Address</label>
                        <input
                          type="email"
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          placeholder="yourname@domain.com"
                          className="w-full bg-white border border-slate-200/80 rounded-[18px] px-4 py-3.5 text-xs text-slate-800 focus:outline-none focus:border-[#2F7D57] focus:ring-4 focus:ring-[#2F7D57]/5 transition-all font-semibold shadow-sm"
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        toast.success("Successfully logged in!");
                        setActiveScreen("home");
                      }}
                      className="w-full py-4 bg-[#2F7D57] hover:bg-[#256345] text-white rounded-[18px] text-xs font-bold tracking-widest uppercase shadow-lg shadow-emerald-950/15 transition-all active:scale-95"
                    >
                      Sign In
                    </button>
                  </div>

                  <div className="text-center pb-2">
                    <p className="text-[10px] text-[#8A8A8A] font-bold">Inspired by premium Dribbble concepts</p>
                  </div>
                </motion.div>
              )}

              {/* SCREEN 1 - HOME */}
              {activeScreen === "home" && (
                <motion.div
                  key="home"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col justify-between bg-[#FAFAFA] pb-24"
                >
                  <div className="flex-1 overflow-y-auto scrollbar-hide p-6 space-y-6">
                    {/* Top Section */}
                    <div className="flex justify-between items-center pt-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-[14px] bg-slate-200 overflow-hidden border border-slate-200 shadow-sm flex items-center justify-center text-lg">
                          👨‍💻
                        </div>
                        <div>
                          <p className="text-[9px] font-extrabold text-[#8A8A8A] uppercase tracking-widest">Welcome</p>
                          <h4 className="text-xs font-black text-slate-900 leading-tight">Hi, John!</h4>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button onClick={() => setActiveScreen("discovery")} className="p-2.5 rounded-[16px] bg-white border border-slate-200/60 shadow-sm text-slate-600 hover:text-slate-800">
                          <Search className="w-4 h-4" />
                        </button>
                        <button className="p-2.5 rounded-[16px] bg-white border border-slate-200/60 shadow-sm text-slate-600">
                          <Grid className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Headline banner */}
                    <div className="space-y-1">
                      <h1 className="text-2xl font-black text-slate-900 leading-tight tracking-tight">
                        Find your best food<br />Order & Eat 😎
                      </h1>
                    </div>

                    {/* Horizontal scroll category tabs */}
                    <div className="overflow-x-auto scrollbar-hide -mx-6 px-6">
                      <div className="flex gap-2.5 py-1">
                        {["All", "Sushi", "Seafood", "Drink", "Bakery"].map((cat) => (
                          <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`whitespace-nowrap px-4 py-2.5 rounded-full text-xs font-bold border transition-all ${
                              activeCategory === cat
                                ? "bg-[#2F7D57] border-[#2F7D57] text-white shadow-md shadow-emerald-950/10"
                                : "bg-white border-slate-200/60 text-[#8A8A8A] hover:border-slate-350"
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Food cards list layout */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-[#2F7D57] bg-[#2F7D57]/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider">Recommendations</span>
                        <button onClick={() => setActiveScreen("discovery")} className="text-[10px] font-bold text-[#8A8A8A] hover:text-[#111827]">See All</button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {filteredHomeItems.map((item) => (
                          <div
                            key={item.id}
                            className="bg-white border border-slate-100 rounded-[24px] p-3.5 space-y-3.5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between"
                          >
                            <div className="flex justify-between items-start">
                              <span className="text-xl bg-slate-50 rounded-full w-8 h-8 flex items-center justify-center shadow-sm select-none">
                                {item.image}
                              </span>
                              <button 
                                onClick={() => toggleFavorite(item.id)}
                                className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center"
                              >
                                <Heart className={`size-3.5 ${favorites.includes(item.id) ? "fill-rose-500 text-rose-500" : "text-slate-400"}`} />
                              </button>
                            </div>

                            <div 
                              onClick={() => {
                                setSelectedItem(item);
                                setDetailQty(2);
                                setActiveScreen("details");
                              }}
                              className="cursor-pointer space-y-1"
                            >
                              <h4 className="font-extrabold text-[12px] text-slate-900 leading-tight tracking-tight line-clamp-1 hover:text-[#2F7D57] transition-colors">{item.name}</h4>
                              <p className="text-[10px] text-[#8A8A8A] font-semibold">${item.price}</p>
                            </div>

                            {/* Floating black add button */}
                            <button
                              onClick={() => addToCart(item, 1)}
                              className="absolute bottom-2.5 right-2.5 w-7.5 h-7.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform text-lg"
                            >
                              +
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Special Offer Promotional Card */}
                    {spotlightItem && (
                      <div className="bg-white border border-slate-100 rounded-[24px] p-4.5 shadow-sm relative overflow-hidden flex items-center justify-between gap-3">
                        <div className="space-y-2.5 flex-1 min-w-0">
                          <span className="text-[9px] font-extrabold bg-rose-500/10 text-rose-500 border border-rose-500/15 px-2.5 py-0.5 rounded-md uppercase tracking-wider block w-fit">
                            Only today 25% OFF!
                          </span>
                          <div>
                            <h4 className="text-[13px] font-black text-slate-900 line-clamp-1 leading-tight">{spotlightItem.name}</h4>
                            <p className="text-[10px] text-[#8A8A8A] mt-0.5 font-semibold line-clamp-1">{spotlightItem.subtitle}</p>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <span className="text-[11px] text-slate-400 line-through">${(spotlightItem.price * 1.33).toFixed(2)}</span>
                            <span className="text-sm font-black text-[#2F7D57]">${spotlightItem.price}</span>
                          </div>
                        </div>

                        <div className="relative w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-4xl shadow-inner border border-slate-100 flex-shrink-0 select-none">
                          {spotlightItem.image}
                          <button
                            onClick={() => {
                              setSelectedItem(spotlightItem);
                              setDetailQty(2);
                              setActiveScreen("details");
                            }}
                            className="absolute -bottom-1 right-1/2 translate-x-1/2 w-6 h-6 rounded-full bg-[#2F7D57] hover:bg-[#256345] text-white flex items-center justify-center shadow-md text-sm animate-pulse"
                          >
                            →
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <BottomNav active="home" onSelect={setActiveScreen} totalItems={totalCartItems} />
                </motion.div>
              )}

              {/* SCREEN 2 - DISCOVERY PAGE */}
              {activeScreen === "discovery" && (
                <motion.div
                  key="discovery"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col justify-between bg-[#FAFAFA] pb-24"
                >
                  <div className="flex-1 overflow-y-auto scrollbar-hide p-6 space-y-6">
                    <div className="space-y-1 pt-2">
                      <p className="text-[9px] font-extrabold text-[#8A8A8A] uppercase tracking-widest">Discovery</p>
                      <h2 className="text-xl font-black text-slate-900 leading-tight tracking-tight">
                        Hello John!<br />Let's find quality food 😎
                      </h2>
                    </div>

                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search your food..."
                          className="w-full bg-white border border-slate-200/80 rounded-[18px] pl-11 pr-10 py-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#2F7D57] transition-all font-semibold shadow-sm"
                        />
                        {searchQuery && (
                          <button onClick={() => setSearchQuery("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-450">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <button 
                        className="w-11 h-11 rounded-[18px] border border-[#2F7D57]/30 bg-[#2F7D57]/5 text-[#2F7D57] flex items-center justify-center shadow-sm"
                      >
                        🥗
                      </button>
                    </div>

                    {/* Category Pills (Vertical design scroll) */}
                    <div className="overflow-x-auto scrollbar-hide -mx-6 px-6">
                      <div className="flex gap-3 py-1">
                        {[
                          { id: "burger", name: "Burger", emoji: "🍔" },
                          { id: "vegan", name: "Vegan", emoji: "🥗" },
                          { id: "fruits", name: "Fruits", emoji: "🍎" },
                          { id: "all", name: "All Food", emoji: "🍱" }
                        ].map((pill) => (
                          <button
                            key={pill.id}
                            onClick={() => {
                              if (pill.id === "all") setActiveCategory("All");
                              else if (pill.id === "vegan") setActiveCategory("Seafood");
                              else if (pill.id === "fruits") setActiveCategory("Drink");
                              else if (pill.id === "burger") setActiveCategory("Bakery");
                            }}
                            className="flex flex-col items-center p-2 rounded-[20px] min-w-[64px] border border-slate-200/50 bg-white shadow-sm hover:border-[#2F7D57] transition-all"
                          >
                            <span className="w-9 h-9 rounded-full bg-slate-50 border border-slate-200/50 flex items-center justify-center text-lg mb-1.5 shadow-sm">{pill.emoji}</span>
                            <span className="text-[9px] font-black tracking-wider uppercase text-slate-800">{pill.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Popular list cards */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-[#2F7D57] bg-[#2F7D57]/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider">Popular Dishes</span>
                      </div>

                      <div className="space-y-3">
                        {MOCK_ITEMS.map((item) => (
                          <div
                            key={item.id}
                            className="bg-white border border-slate-100 rounded-[24px] p-4 flex items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
                          >
                            <div className="flex-1 min-w-0 space-y-1">
                              <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded border border-rose-500/20 text-rose-500 bg-rose-500/5 uppercase tracking-wider flex items-center gap-0.5 w-fit">
                                <Flame className="w-2.5 h-2.5" /> {item.calories} Calories
                              </span>
                              <h4 
                                onClick={() => {
                                  setSelectedItem(item);
                                  setDetailQty(2);
                                  setActiveScreen("details");
                                }}
                                className="font-extrabold text-[13px] text-slate-900 leading-tight tracking-tight line-clamp-1 cursor-pointer hover:text-[#2F7D57] transition-colors"
                              >
                                {item.name}
                              </h4>
                              <p className="text-[10px] text-[#8A8A8A] font-semibold leading-relaxed line-clamp-1">{item.subtitle}</p>
                              <div className="pt-1">
                                <span className="font-black text-xs text-[#2F7D57]">${item.price}</span>
                              </div>
                            </div>

                            {/* Circular food photography right-aligned */}
                            <div className="relative w-18 h-18 rounded-full bg-slate-50 border border-slate-200/50 shadow-inner flex items-center justify-center text-3xl select-none flex-shrink-0">
                              {item.image}
                              <button
                                onClick={() => addToCart(item, 1)}
                                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-md text-sm active:scale-90 transition-transform"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <BottomNav active="discovery" onSelect={setActiveScreen} totalItems={totalCartItems} />
                </motion.div>
              )}

              {/* SCREEN 3 - PRODUCT DETAILS */}
              {activeScreen === "details" && selectedItem && (
                <motion.div
                  key="details"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 30 }}
                  className="absolute inset-0 flex flex-col justify-between bg-[#FAFAFA]"
                >
                  <div className="p-6 flex items-center justify-between border-b border-slate-100 bg-white">
                    <button onClick={() => setActiveScreen("home")} className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-800 shadow-sm">
                      ←
                    </button>
                    <span className="text-[11px] font-black tracking-widest text-[#2F7D57] bg-[#2F7D57]/10 px-3 py-1 rounded-full uppercase">
                      Ingredients Details
                    </span>
                    <button onClick={() => toggleFavorite(selectedItem.id)} className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200/60 flex items-center justify-center shadow-sm">
                      <Heart className={`size-4 ${favorites.includes(selectedItem.id) ? "fill-rose-500 text-rose-500" : "text-slate-400"}`} />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                    {/* Large centered product image */}
                    <div className="flex flex-col items-center py-4">
                      <motion.div 
                        animate={{ y: [0, -8, 0] }}
                        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                        className="w-40 h-40 rounded-full bg-white shadow-xl shadow-slate-200/50 flex items-center justify-center text-7xl select-none relative border border-slate-100"
                      >
                        {selectedItem.image}
                      </motion.div>

                      {/* Quantity Stepper (Green square buttons stepper) */}
                      <div className="flex items-center gap-4 bg-[#2F7D57] rounded-xl px-4.5 py-1.5 mt-6 shadow-md shadow-emerald-950/10 text-white select-none">
                        <button onClick={() => setDetailQty(Math.max(1, detailQty - 1))} className="hover:opacity-85 text-xs font-black p-0.5">[-]</button>
                        <span className="text-xs font-black w-4 text-center tabular-nums">{detailQty}</span>
                        <button onClick={() => setDetailQty(detailQty + 1)} className="hover:opacity-85 text-xs font-black p-0.5">[+]</button>
                      </div>
                    </div>

                    {/* Food Name & Price info */}
                    <div className="text-center space-y-2">
                      <h2 className="text-xl font-black text-slate-900 tracking-tight leading-tight">{selectedItem.name}</h2>
                      <p className="text-xs text-[#8A8A8A] font-semibold max-w-xs mx-auto leading-relaxed">{selectedItem.subtitle}</p>
                      <div className="pt-1">
                        <span className="text-2xl font-black text-[#2F7D57]">${(selectedItem.price * detailQty).toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Ingredients Section */}
                    <div className="space-y-3">
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Ingredients list</p>
                      <div className="flex gap-2 flex-wrap">
                        {selectedItem.ingredients.map((ing) => (
                          <div
                            key={ing.name}
                            className="px-3.5 py-2 bg-white border border-slate-100 rounded-full text-[10px] font-bold text-slate-800 flex items-center gap-1.5 shadow-sm"
                          >
                            <span>{ing.emoji}</span>
                            <span>{ing.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Nutrition card */}
                    <div className="bg-white border border-slate-100 rounded-[24px] p-4 space-y-2 shadow-sm font-poppins">
                      <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Nutrition Facts</span>
                      <div className="flex justify-between text-[11px] font-semibold text-slate-500">
                        <span>Dynamic Calories:</span>
                        <span className="text-[#2F7D57] font-bold">🔥 {selectedItem.calories} Calories</span>
                      </div>
                    </div>
                  </div>

                  {/* Sticky Bottom CTA */}
                  <div className="p-6 border-t border-slate-100 bg-white flex-shrink-0">
                    <button
                      onClick={() => {
                        addToCart(selectedItem, detailQty);
                        setActiveScreen("home");
                      }}
                      className="w-full py-4 bg-[#2F7D57] hover:bg-[#256345] text-white text-xs font-bold tracking-widest uppercase rounded-[18px] shadow-lg shadow-emerald-950/10 active:scale-95 transition-transform"
                    >
                      ADD TO CART
                    </button>
                  </div>
                </motion.div>
              )}

              {/* SCREEN 6 - CHECKOUT */}
              {activeScreen === "checkout" && (
                <motion.div
                  key="checkout"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col justify-between bg-[#FAFAFA]"
                >
                  <div className="p-6 flex items-center justify-between border-b border-slate-100 bg-white">
                    <button onClick={() => setActiveScreen("home")} className="text-xs font-bold text-[#8A8A8A] hover:text-slate-900">
                      ← Back
                    </button>
                    <h2 className="text-sm font-black text-slate-900 tracking-tight uppercase">Checkout</h2>
                    <button onClick={() => setCart([])} className="text-[10px] font-bold text-rose-500 hover:opacity-80">
                      Clear
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-hide">
                    {/* Shipping Address rounded selectors */}
                    <div className="space-y-3.5">
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Shipping Addresses</p>
                      
                      <div className="space-y-2">
                        {[
                          { id: "home", label: "Home Address", desc: "Sadia Villa, Habiganj", marker: "🏠" },
                          { id: "office", label: "Office Building", desc: "5361 Elgin St. Habiganj", marker: "🏢" }
                        ].map((addr) => (
                          <div
                            key={addr.id}
                            onClick={() => setShippingAddress(addr.id as any)}
                            className={`p-4 bg-white border rounded-[24px] shadow-sm flex items-center justify-between cursor-pointer transition-all ${
                              shippingAddress === addr.id
                                ? "border-[#2F7D57] ring-4 ring-[#2F7D57]/5"
                                : "border-slate-100 hover:border-slate-200"
                            }`}
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <span className="text-lg mt-0.5">{addr.marker}</span>
                              <div className="min-w-0">
                                <h4 className="text-xs font-black text-slate-800 leading-tight">{addr.label}</h4>
                                <p className="text-[10px] text-[#8A8A8A] mt-1 font-semibold leading-relaxed truncate">{addr.desc}</p>
                              </div>
                            </div>
                            <div className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center transition-all ${
                              shippingAddress === addr.id ? "bg-[#2F7D57] border-[#2F7D57]" : "border-slate-300"
                            }`}>
                              {shippingAddress === addr.id && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Payment methods selectors */}
                    <div className="space-y-3.5">
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Payment Methods</p>
                      
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { id: "card", name: "Credit Card", icon: "💳" },
                          { id: "paypal", name: "Paypal", icon: "💎" }
                        ].map((pay) => (
                          <div
                            key={pay.id}
                            onClick={() => setPaymentMethod(pay.id as any)}
                            className={`p-3.5 bg-white border rounded-[20px] shadow-sm text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 ${
                              paymentMethod === pay.id
                                ? "border-[#2F7D57] ring-4 ring-[#2F7D57]/5"
                                : "border-slate-100 hover:border-slate-200"
                            }`}
                          >
                            <span className="text-lg">{pay.icon}</span>
                            <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider">{pay.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Order summary section */}
                    <div className="space-y-3.5">
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Order Summary</p>
                      
                      {cart.length === 0 ? (
                        <div className="p-6 bg-white border border-slate-150 rounded-[24px] text-center text-xs text-slate-400 font-semibold">
                          Your shopping cart is empty
                        </div>
                      ) : (
                        <div className="bg-white border border-slate-100 rounded-[24px] p-4.5 space-y-3.5 shadow-sm font-poppins">
                          {cart.map((item) => (
                            <div key={item.id} className="flex justify-between items-center text-xs">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-lg select-none">{item.image}</span>
                                <span className="font-extrabold text-slate-900 leading-tight truncate">{item.name} ×{item.quantity}</span>
                              </div>
                              <span className="font-black text-slate-800 flex-shrink-0">${(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                          <div className="h-px bg-slate-100" />
                          <div className="space-y-1.5 text-[11px] font-semibold text-slate-500 pt-1">
                            <div className="flex justify-between">
                              <span>Subtotal:</span>
                              <span className="text-slate-800">${cartSubtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Standard Delivery:</span>
                              <span className="text-slate-800">$2.50</span>
                            </div>
                            <div className="flex justify-between text-xs font-black text-slate-950 pt-2 border-t border-slate-100 mt-2">
                              <span>Grand Total:</span>
                              <span className="text-[#2F7D57]">${(cartSubtotal + 2.50).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-6 border-t border-slate-100 bg-white flex-shrink-0">
                    <button
                      onClick={() => {
                        if (cart.length === 0) {
                          toast.error("Please add items to your cart first!");
                          return;
                        }
                        toast.success("Order confirmed!");
                        setActiveScreen("tracking");
                      }}
                      className="w-full py-4 bg-[#2F7D57] hover:bg-[#256345] text-white text-xs font-bold tracking-widest uppercase rounded-[18px] shadow-lg shadow-emerald-950/10 transition-all active:scale-95"
                    >
                      Confirm Order
                    </button>
                  </div>
                </motion.div>
              )}

              {/* SCREEN 5 - MAP TRACKING */}
              {activeScreen === "tracking" && (
                <motion.div
                  key="tracking"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute inset-0 flex flex-col justify-between bg-slate-50"
                >
                  {/* Floating top header bar */}
                  <div className="absolute top-5 left-5 right-5 flex justify-between items-center z-10">
                    <button onClick={() => { setCart([]); setActiveScreen("home"); }} className="w-10 h-10 rounded-full bg-white border border-slate-200/60 shadow-md flex items-center justify-center text-slate-800 hover:border-slate-350">
                      ←
                    </button>
                    <span className="text-[10px] font-black text-slate-800 bg-white border border-slate-200/60 px-3.5 py-2.5 rounded-full shadow-md uppercase tracking-wider">
                      Live Transit Map
                    </span>
                    <div className="w-10 h-10 rounded-full bg-white border border-slate-200/60 shadow-md flex items-center justify-center text-lg select-none">
                      👨‍🍳
                    </div>
                  </div>

                  {/* Pastel Vector Map Grid Showcase */}
                  <div className="flex-1 bg-[#E8F0EC] relative overflow-hidden flex items-center justify-center">
                    
                    {/* Abstract road patterns */}
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#2F7D57_1px,transparent_1px)] [background-size:16px_16px]" />
                    <div className="absolute top-1/3 left-0 right-0 h-4 bg-white/40 rotate-12 blur-[1px]" />
                    <div className="absolute top-0 bottom-0 left-1/3 w-4 bg-white/40 -rotate-45 blur-[1px]" />

                    {/* Animated curved dotted route */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 380 700">
                      <path
                        id="route-path"
                        d="M 60 500 Q 190 350 320 200"
                        fill="none"
                        stroke="#2F7D57"
                        strokeWidth="3"
                        strokeDasharray="8 6"
                        className="opacity-75"
                      />
                    </svg>

                    {/* Restaurant Marker */}
                    <div className="absolute left-[45px] top-[480px] z-10 flex flex-col items-center">
                      <div className="w-9 h-9 rounded-full bg-slate-900 border-2 border-white flex items-center justify-center text-base shadow-lg animate-pulse select-none">
                        🏡
                      </div>
                      <span className="text-[8px] font-black bg-slate-900 text-white px-1.5 py-0.5 rounded-md mt-1 shadow-sm uppercase tracking-wider">Hub</span>
                    </div>

                    {/* Customer Marker */}
                    <div className="absolute right-[45px] top-[180px] z-10 flex flex-col items-center">
                      <div className="w-9 h-9 rounded-full bg-[#2F7D57] border-2 border-white flex items-center justify-center text-base shadow-lg select-none">
                        🍕
                      </div>
                      <span className="text-[8px] font-black bg-[#2F7D57] text-white px-1.5 py-0.5 rounded-md mt-1 shadow-sm uppercase tracking-wider">You</span>
                    </div>

                    {/* Animating Delivery Rider */}
                    <motion.div 
                      className="absolute w-12 h-12 rounded-full bg-white border-2 border-[#2F7D57] shadow-xl flex items-center justify-center text-2xl z-20 select-none"
                      animate={{
                        x: [60, 190, 320],
                        y: [480, 325, 180]
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 8,
                        ease: "easeInOut"
                      }}
                    >
                      🚴
                    </motion.div>
                  </div>

                  {/* Bottom tracking status details card */}
                  <div className="p-6 bg-white border-t border-slate-100 rounded-t-[32px] shadow-[0_-12px_36px_-6px_rgba(0,0,0,0.06)] space-y-4.5 z-10 relative">
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <span className="text-[9px] font-extrabold text-[#2F7D57] bg-[#2F7D57]/10 px-2 py-0.5 rounded uppercase tracking-wider">On The Way</span>
                        <h3 className="text-base font-black text-slate-900 leading-tight">Order in transit!</h3>
                        <p className="text-[10px] text-[#8A8A8A] font-semibold leading-relaxed">Estimated transit time: <span className="font-bold text-slate-800">10 mins</span></p>
                      </div>
                      
                      <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5 text-center flex-shrink-0">
                        <span className="text-xs font-black text-[#2F7D57] block">🎯 A-Class</span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mt-0.5">Rating</span>
                      </div>
                    </div>

                    <div className="h-px bg-slate-100" />

                    <div className="flex gap-3">
                      <button 
                        onClick={() => { setCart([]); setActiveScreen("home"); }}
                        className="flex-1 py-3.5 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-extrabold tracking-widest uppercase rounded-[18px] shadow-lg active:scale-95 transition-transform"
                      >
                        Back to Home
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

        </div>

      </main>
    </div>
  );
}

// ─── Bottom Navigation bar ──────────────────────────────────────────────────────
interface BottomNavProps {
  active: "home" | "discovery" | "checkout";
  onSelect: (screen: string) => void;
  totalItems: number;
}

function BottomNav({ active, onSelect, totalItems }: BottomNavProps) {
  return (
    <nav className="absolute bottom-0 left-0 right-0 h-22 bg-white border-t border-slate-100 flex items-center justify-around px-4 select-none z-35 shadow-[0_-8px_24px_rgba(0,0,0,0.02)]">
      
      <button 
        onClick={() => onSelect("home")} 
        className={`flex flex-col items-center gap-1 transition-all ${active === "home" ? "text-[#2F7D57]" : "text-[#8A8A8A] hover:text-slate-800"}`}
      >
        <span className="text-xl">🏡</span>
        <span className="text-[9px] font-black uppercase tracking-wider">Home</span>
      </button>

      <button 
        onClick={() => onSelect("discovery")} 
        className={`flex flex-col items-center gap-1 transition-all ${active === "discovery" ? "text-[#2F7D57]" : "text-[#8A8A8A] hover:text-slate-800"}`}
      >
        <span className="text-xl">🔍</span>
        <span className="text-[9px] font-black uppercase tracking-wider">Discover</span>
      </button>

      {/* Elevated Centered Floating Cart FAB */}
      <div className="relative -mt-10">
        <button 
          onClick={() => onSelect("checkout")}
          className="w-14 h-14 bg-gradient-to-r from-[#2F7D57] to-[#1E5A44] hover:from-[#1E5A44] hover:to-[#2F7D57] text-white rounded-full flex items-center justify-center shadow-xl shadow-emerald-950/20 border-4 border-white active:scale-95 transition-transform"
        >
          <ShoppingBag className="size-5" />
        </button>
        {totalItems > 0 && (
          <span className="absolute -top-1 -right-1 bg-rose-500 border-2 border-white text-white rounded-full w-5 h-5 flex items-center justify-center text-[9px] font-extrabold select-none">
            {totalItems}
          </span>
        )}
      </div>

      <button 
        onClick={() => onSelect("home")}
        className="flex flex-col items-center gap-1 text-[#8A8A8A] hover:text-slate-800"
      >
        <span className="text-xl">❤️</span>
        <span className="text-[9px] font-black uppercase tracking-wider">Favs</span>
      </button>

      <button 
        onClick={() => onSelect("login")}
        className="flex flex-col items-center gap-1 text-[#8A8A8A] hover:text-slate-800"
      >
        <span className="text-xl">👤</span>
        <span className="text-[9px] font-black uppercase tracking-wider">Profile</span>
      </button>

    </nav>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const spotlightItem = MOCK_ITEMS[0];
const bestsellers = MOCK_ITEMS;
const vegOnly = false;
const nonVegOnly = false;
