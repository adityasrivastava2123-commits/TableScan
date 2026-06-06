"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";
import {
  Sparkles,
  ChevronDown,
  ChevronRight,
  Search,
  Bell,
  Command,
  DollarSign,
  ShoppingBag,
  Users,
  Clock,
  ArrowUpRight,
  Download,
  TrendingUp,
  LogOut,
  MapPin,
  Activity,
  Flame,
  Sliders,
  ShieldAlert,
  Moon,
  Sun,
  Layers,
  Utensils,
  BookOpen,
  ArrowRight,
  Plus,
  CheckCircle,
  HelpCircle,
  X,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
} from "recharts";

// ─── Custom Styles & Fonts Loading ──────────────────────────────────────────
const customStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400;1,600&family=Sora:wght@100;200;300;400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500;600;700&display=swap');

  .font-editorial {
    font-family: 'Cormorant Garamond', serif;
  }
  .font-sans-dashboard {
    font-family: 'Sora', sans-serif;
  }
  .font-mono-dashboard {
    font-family: 'JetBrains Mono', monospace;
  }

  /* Custom Scrollbar for premium dark feel */
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(11, 10, 8, 0.5);
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(240, 160, 64, 0.15);
    border-radius: 999px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(240, 160, 64, 0.3);
  }
`;

// ─── Types and Interfaces ──────────────────────────────────────────────────
interface Branch {
  id: string;
  name: string;
  location: string;
  currency: string;
  currencySymbol: string;
}

interface Order {
  id: string;
  table: string;
  items: string;
  amount: number;
  status: "PREPARING" | "READY" | "DONE" | "CANCELLED" | "NEW";
  time: string;
  isLive?: boolean;
}

interface Stat {
  label: string;
  value: string;
  change: string;
  isPositive: boolean;
  featured?: boolean;
}

// ─── Mock Data ─────────────────────────────────────────────────────────────
const BRANCHES: Branch[] = [
  { id: "delhi", name: "The Saffron Room", location: "Kanpur, Uttar Pradesh", currency: "INR", currencySymbol: "₹" },
  { id: "mumbai", name: "The Saffron Room", location: "Colaba, Mumbai", currency: "INR", currencySymbol: "₹" },
  { id: "london", name: "The Saffron Room", location: "Mayfair, London", currency: "GBP", currencySymbol: "£" },
];

const MOCK_STATS_BY_BRANCH: Record<string, Stat[]> = {
  delhi: [
    { label: "NET REVENUE", value: "₹2,84,650", change: "+14.8%", isPositive: true, featured: true },
    { label: "TOTAL COVERS", value: "312", change: "+8.2%", isPositive: true },
    { label: "TABLE OCCUPANCY", value: "84%", change: "+5.1%", isPositive: true },
    { label: "AVERAGE TICKET", value: "₹912", change: "-1.4%", isPositive: false },
  ],
  mumbai: [
    { label: "NET REVENUE", value: "₹3,12,400", change: "+18.2%", isPositive: true, featured: true },
    { label: "TOTAL COVERS", value: "294", change: "+12.4%", isPositive: true },
    { label: "TABLE OCCUPANCY", value: "91%", change: "+6.8%", isPositive: true },
    { label: "AVERAGE TICKET", value: "₹1,062", change: "+3.5%", isPositive: true },
  ],
  london: [
    { label: "NET REVENUE", value: "£4,850", change: "+22.4%", isPositive: true, featured: true },
    { label: "TOTAL COVERS", value: "188", change: "+4.1%", isPositive: true },
    { label: "TABLE OCCUPANCY", value: "78%", change: "+2.3%", isPositive: true },
    { label: "AVERAGE TICKET", value: "£25.80", change: "+1.8%", isPositive: true },
  ],
};

const MOCK_HOURLY_DATA: Record<string, { hour: string; revenue: number; orders: number }[]> = {
  delhi: [
    { hour: "12:00", revenue: 14000, orders: 12 },
    { hour: "13:00", revenue: 28000, orders: 22 },
    { hour: "14:00", revenue: 34000, orders: 28 },
    { hour: "15:00", revenue: 18000, orders: 15 },
    { hour: "16:00", revenue: 12000, orders: 10 },
    { hour: "17:00", revenue: 19000, orders: 14 },
    { hour: "18:00", revenue: 42000, orders: 35 },
    { hour: "19:00", revenue: 65000, orders: 52 },
    { hour: "20:00", revenue: 89000, orders: 74 },
    { hour: "21:00", revenue: 78000, orders: 60 },
    { hour: "22:00", revenue: 45000, orders: 38 },
  ],
  mumbai: [
    { hour: "12:00", revenue: 18000, orders: 15 },
    { hour: "13:00", revenue: 32000, orders: 26 },
    { hour: "14:00", revenue: 38000, orders: 30 },
    { hour: "15:00", revenue: 21000, orders: 18 },
    { hour: "16:00", revenue: 15000, orders: 12 },
    { hour: "17:00", revenue: 24000, orders: 19 },
    { hour: "18:00", revenue: 48000, orders: 40 },
    { hour: "19:00", revenue: 72000, orders: 58 },
    { hour: "20:00", revenue: 98000, orders: 82 },
    { hour: "21:00", revenue: 86000, orders: 68 },
    { hour: "22:00", revenue: 52000, orders: 44 },
  ],
  london: [
    { hour: "12:00", revenue: 280, orders: 10 },
    { hour: "13:00", revenue: 560, orders: 18 },
    { hour: "14:00", revenue: 620, orders: 22 },
    { hour: "15:00", revenue: 310, orders: 12 },
    { hour: "16:00", revenue: 190, orders: 8 },
    { hour: "17:00", revenue: 350, orders: 14 },
    { hour: "18:00", revenue: 720, orders: 28 },
    { hour: "19:00", revenue: 1150, orders: 44 },
    { hour: "20:00", revenue: 1420, orders: 55 },
    { hour: "21:00", revenue: 1210, orders: 48 },
    { hour: "22:00", revenue: 810, orders: 32 },
  ],
};

const INITIAL_ORDERS: Record<string, Order[]> = {
  delhi: [
    { id: "TS-7209", table: "Table 14", items: "1x Truffle Kebab, 2x Dal Saffron, 1x Garlic Naan", amount: 4850, status: "PREPARING", time: "3 mins ago" },
    { id: "TS-7208", table: "Table 4", items: "1x Paneer Tikka, 1x Biryani Feast, 3x Rumali Roti", amount: 3200, status: "READY", time: "8 mins ago" },
    { id: "TS-7207", table: "Table 21", items: "2x Butter Chicken, 2x Laccha Paratha, 2x Mango Lassi", amount: 4100, status: "DONE", time: "15 mins ago" },
    { id: "TS-7206", table: "Table 9", items: "1x Tandoori Broccoli, 1x Lentil Curry Bowl, 1x Diet Cola", amount: 1850, status: "CANCELLED", time: "22 mins ago" },
    { id: "TS-7205", table: "Table 11", items: "1x Galouti Slider, 2x Saffron Pilaf, 1x Rose Kulfi", amount: 2950, status: "DONE", time: "30 mins ago" },
  ],
  mumbai: [
    { id: "TS-8512", table: "Table 2", items: "2x Lobster Masala, 1x Kokum Fizz, 1x Truffle Naan", amount: 7200, status: "PREPARING", time: "1 min ago" },
    { id: "TS-8511", table: "Table 8", items: "1x Mumbai Toastie, 2x Cutting Chai, 1x Keema Pav", amount: 1950, status: "READY", time: "5 mins ago" },
    { id: "TS-8510", table: "Table 18", items: "1x Pomfret Fry, 1x Steamed Rice, 2x Sol Kadhi", amount: 3400, status: "DONE", time: "12 mins ago" },
    { id: "TS-8509", table: "Table 6", items: "1x Veg Platter, 4x Butter Roti, 2x Sweet Lassi", amount: 2800, status: "DONE", time: "25 mins ago" },
  ],
  london: [
    { id: "TS-4091", table: "Table 12", items: "1x Saffron Lobster, 1x Royal Champagne, 1x Caviar Roti", amount: 185.0, status: "PREPARING", time: "2 mins ago" },
    { id: "TS-4090", table: "Table 5", items: "2x Chicken Tikka Sizzler, 2x Garlic Naan, 2x IPA Beer", amount: 92.5, status: "READY", time: "7 mins ago" },
    { id: "TS-4089", table: "Table 19", items: "1x Lamb Shank Curry, 1x Basmati Rice, 1x Rose Petal Kulfi", amount: 68.0, status: "DONE", time: "18 mins ago" },
    { id: "TS-4088", table: "Table 3", items: "1x Veg Samosa Chat, 1x Masala Chai Mocktail", amount: 28.5, status: "CANCELLED", time: "29 mins ago" },
  ],
};

const MOCK_NOTIFICATIONS = [
  { id: 1, text: "Table 14 requested the bill", time: "Just now", type: "bill", read: false },
  { id: 2, text: "Low stock alert: Cardamom Pods (under 200g)", time: "10 mins ago", type: "alert", read: false },
  { id: 3, text: "New reservation: Party of 6 for 8:30 PM", time: "25 mins ago", type: "booking", read: true },
  { id: 4, text: "System check: KDS screen 2 reconnected", time: "1 hour ago", type: "system", read: true },
];

const PREDICTIVE_INSIGHTS = [
  {
    title: "Projected Busy Hour Peak",
    desc: "Predictive model forecasts high occupancy (94%) tonight between 7:45 PM and 9:15 PM. Recommend opening auxiliary station B.",
    category: "Operations",
    confidence: "92%",
  },
  {
    title: "Smart Menu Recommendation",
    desc: "Saffron Biryani demand is up 18% on Tuesdays. Suggest pre-portioning 40 units of saffron marinade before dinner shift starts.",
    category: "Inventory",
    confidence: "88%",
  },
  {
    title: "Optimized staffing pattern",
    desc: "Weather prediction suggests rain at 8 PM. Delivery volume expected to spike by 35%. Suggest shifting 2 floor runners to dispatch.",
    category: "Staffing",
    confidence: "76%",
  },
];

export default function PremiumDashboard() {
  const { user } = useUser();
  const [activeBranch, setActiveBranch] = useState<Branch>(BRANCHES[0]);
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("Overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [aiInsightsOpen, setAiInsightsOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const [orders, setOrders] = useState<Record<string, Order[]>>(INITIAL_ORDERS);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [chartMetric, setChartMetric] = useState<"revenue" | "orders">("revenue");
  
  // Real-time Simulation clock
  const [simulatedTime, setSimulatedTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const date = new Date();
      setSimulatedTime(
        date.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        }) +
          " · " +
          date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
          })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcut listener for Command Palette (Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Branch switched notifications
  const handleBranchSwitch = (branch: Branch) => {
    setActiveBranch(branch);
    setBranchDropdownOpen(false);
    toast.success(`Switched active environment to ${branch.location}`, {
      style: {
        background: "#0b0a08",
        color: "#f5efe2",
        border: "1px solid rgba(240, 160, 64, 0.3)",
        fontFamily: "Sora, sans-serif",
        fontSize: "12px",
      },
      iconTheme: {
        primary: "#f0a040",
        secondary: "#0b0a08",
      },
    });
  };

  // Add simulated live order
  const triggerLiveOrderSimulation = () => {
    const tableNum = Math.floor(Math.random() * 25) + 1;
    const randomItemsList = [
      "1x Saffron Pilaf, 2x Lamb Rogan Josh, 3x Garlic Naan",
      "2x Truffle Paneer Tikka, 1x Dal Makhani, 2x Lachha Paratha",
      "1x Tandoori Lobster, 1x Rose Petal Cooler, 1x Kesar Phirni",
      "2x Chicken Dum Biryani, 1x Burani Raita, 1x Double Ka Meetha",
    ];
    const items = randomItemsList[Math.floor(Math.random() * randomItemsList.length)];
    const price = activeBranch.currency === "GBP" ? parseFloat((Math.random() * 80 + 20).toFixed(2)) : Math.floor(Math.random() * 4000) + 1200;
    const orderId = `TS-${Math.floor(Math.random() * 9000) + 1000}`;
    
    const newOrder: Order = {
      id: orderId,
      table: `Table ${tableNum}`,
      items,
      amount: price,
      status: "NEW",
      time: "Just now",
      isLive: true,
    };

    setOrders((prev) => ({
      ...prev,
      [activeBranch.id]: [newOrder, ...prev[activeBranch.id]],
    }));

    // Add notification too
    const newNotif = {
      id: Date.now(),
      text: `Incoming Live Order ${orderId} at Table ${tableNum}`,
      time: "Just now",
      type: "alert",
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);

    toast.success(`Incoming Live Order ${orderId} - ${newOrder.table}`, {
      style: {
        background: "#0b0a08",
        color: "#f5efe2",
        border: "1px solid #52d27a",
        fontFamily: "Sora, sans-serif",
        fontSize: "12px",
      },
      icon: "🔥",
      duration: 5000,
    });
  };

  // CSV Export
  const exportCsvReport = () => {
    const activeStats = MOCK_STATS_BY_BRANCH[activeBranch.id];
    const branchOrders = orders[activeBranch.id];
    
    let csvRows = [];
    csvRows.push([`Serveaura Premium Admin Dashboard - ${activeBranch.name}`]);
    csvRows.push([`Branch Location,${activeBranch.location}`]);
    csvRows.push([`Exported Time,${new Date().toLocaleString()}`]);
    csvRows.push([]);
    csvRows.push(["KEY METRICS"]);
    activeStats.forEach((stat) => {
      csvRows.push([stat.label, stat.value, stat.change]);
    });
    csvRows.push([]);
    csvRows.push(["RECENT LIVE ORDERS"]);
    csvRows.push(["Order ID", "Table", "Items Ordered", `Total Amount (${activeBranch.currency})`, "Status", "Timestamp"]);
    branchOrders.forEach((o) => {
      csvRows.push([o.id, o.table, o.items, o.amount, o.status, o.time]);
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map((e) => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `serveaura_report_${activeBranch.id}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("CSV report downloaded successfully!");
  };

  // Filter menu items for Command Palette
  const [commandQuery, setCommandQuery] = useState("");
  const filteredCommands = useMemo(() => {
    const baseCommands = [
      { name: "View Live Orders Queue", action: () => { setActiveTab("Operations"); setCommandPaletteOpen(false); } },
      { name: "View Menu Catalog", action: () => { setActiveTab("Catalog"); setCommandPaletteOpen(false); } },
      { name: "Simulate New Live Order", action: () => { triggerLiveOrderSimulation(); setCommandPaletteOpen(false); } },
      { name: "Trigger CSV Export Data", action: () => { exportCsvReport(); setCommandPaletteOpen(false); } },
      { name: "Show AI Sommelier Insights", action: () => { setAiInsightsOpen(true); setCommandPaletteOpen(false); } },
      { name: "Switch to Kanpur, Uttar Pradesh", action: () => handleBranchSwitch(BRANCHES[0]) },
      { name: "Switch to Colaba, Mumbai", action: () => handleBranchSwitch(BRANCHES[1]) },
      { name: "Switch to Mayfair, London", action: () => handleBranchSwitch(BRANCHES[2]) },
    ];
    if (!commandQuery) return baseCommands;
    return baseCommands.filter((c) => c.name.toLowerCase().includes(commandQuery.toLowerCase()));
  }, [commandQuery, activeBranch]);

  // Clean unread count
  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success("Marked all notifications as read");
  };

  // Chart Data preparation
  const chartData = MOCK_HOURLY_DATA[activeBranch.id];
  const activeStats = MOCK_STATS_BY_BRANCH[activeBranch.id];

  return (
    <div className="min-h-screen bg-[#0b0a08] text-[#f5efe2] font-sans-dashboard antialiased overflow-x-hidden relative flex">
      <style dangerouslySetInnerHTML={{ __html: customStyles }} />
      <Toaster position="bottom-right" />

      {/* ── Ambient Glow Background Elements (Fixed) ───────────────────────── */}
      <div className="pointer-events-none fixed top-[-100px] left-[-100px] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-[#e8923a]/10 to-transparent blur-[140px] z-0" />
      <div className="pointer-events-none fixed bottom-[-150px] right-[-100px] w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-[#b1421a]/8 to-transparent blur-[140px] z-0" />

      {/* ── TWO-COLUMN SHELL: LEFT SIDEBAR (260px Fixed) ───────────────────── */}
      <aside className="hidden lg:flex w-[260px] border-r border-[rgba(255,255,255,0.08)] bg-[#0b0a08] flex-col shrink-0 relative z-20 justify-between h-screen sticky top-0">
        
        {/* Top sidebar header & branch switcher */}
        <div className="p-5 space-y-6">
          {/* Brand/Logo */}
          <div className="flex items-center gap-2 px-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#f0a040] to-[#e85a2a] flex items-center justify-center text-[#0b0a08] font-bold shadow-md shadow-amber-900/25">
              <Sparkles className="size-4" />
            </div>
            <div>
              <h1 className="text-sm font-black uppercase tracking-widest text-[#f5efe2]">Serveaura</h1>
              <p className="text-[9px] text-[#f5efe2]/40 font-semibold tracking-wider">PREMIUM OPERATING OS</p>
            </div>
          </div>

          {/* Branch Switcher Card */}
          <div className="relative">
            <button
              onClick={() => setBranchDropdownOpen(!branchDropdownOpen)}
              className="w-full flex items-center justify-between p-3.5 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] rounded-xl hover:bg-white/[0.03] transition-all text-left"
            >
              <div className="min-w-0">
                <p className="text-[9px] font-bold text-[#f5efe2]/40 uppercase tracking-widest">Active Branch</p>
                <h4 className="text-[12px] font-bold text-[#f5efe2] truncate mt-0.5">{activeBranch.name}</h4>
                <p className="text-[10px] text-[#f5efe2]/60 truncate font-mono-dashboard">{activeBranch.location.split(",")[0]}</p>
              </div>
              <ChevronDown className={`size-4 text-[#f5efe2]/50 transition-transform ${branchDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {branchDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute left-0 right-0 mt-2 bg-[#0b0a08] border border-[rgba(255,255,255,0.12)] rounded-xl overflow-hidden shadow-2xl z-30"
                >
                  {BRANCHES.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => handleBranchSwitch(b)}
                      className={`w-full p-3.5 text-left border-b border-[rgba(255,255,255,0.05)] last:border-0 hover:bg-white/[0.03] transition-colors flex flex-col ${
                        activeBranch.id === b.id ? "bg-white/[0.02]" : ""
                      }`}
                    >
                      <span className="text-[12px] font-bold text-[#f5efe2]">{b.name}</span>
                      <span className="text-[10px] text-[#f5efe2]/50 mt-0.5">{b.location}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Grouped Navigation */}
          <nav className="space-y-6 pt-2">
            {[
              {
                title: "CORE PLATFORM",
                items: [
                  { name: "Overview", icon: Utensils },
                  { name: "Operations", icon: Activity, badge: orders[activeBranch.id].filter(o => o.status === "PREPARING" || o.status === "NEW").length },
                  { name: "Catalog", icon: BookOpen },
                ]
              },
              {
                title: "SYSTEM MANAGEMENT",
                items: [
                  { name: "Account", icon: Sliders },
                ]
              }
            ].map((group) => (
              <div key={group.title} className="space-y-2">
                <h5 className="text-[9px] uppercase tracking-[0.25em] text-[#f5efe2]/40 font-bold px-1">{group.title}</h5>
                <ul className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.name;
                    return (
                      <li key={item.name}>
                        <button
                          onClick={() => {
                            setActiveTab(item.name);
                            if (item.name === "Operations") {
                              toast.loading("Loading real-time order streams...", { id: "op-load", duration: 1000 });
                            }
                          }}
                          className={`w-full flex items-center justify-between py-2 px-3 rounded-lg text-xs transition-all relative ${
                            isActive
                              ? "bg-white/[0.06] text-[#f5efe2] font-semibold"
                              : "text-[#f5efe2]/60 hover:text-[#f5efe2] hover:bg-white/[0.03]"
                          }`}
                        >
                          {isActive && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-gradient-to-b from-[#f0a040] to-[#e85a2a]" />
                          )}
                          <div className="flex items-center gap-2.5">
                            <Icon className={`size-4 ${isActive ? "text-[#f0a040]" : "text-[#f5efe2]/40"}`} />
                            <span>{item.name}</span>
                          </div>
                          {item.badge !== undefined && item.badge > 0 && (
                            <span className="text-[9px] px-1.5 py-0.5 bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-[#0b0a08] font-black rounded-full tabular-nums">
                              {item.badge}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* Bottom Saffron Upgrade Card & User Profile Footer */}
        <div className="p-4 space-y-4 border-t border-[rgba(255,255,255,0.08)] bg-gradient-to-b from-transparent to-[#0b0a08]">
          {/* Premium Upgrade card */}
          <div className="p-4 bg-[rgba(240,160,64,0.03)] border border-[rgba(240,160,64,0.15)] rounded-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#f0a040]/5 rounded-full blur-xl pointer-events-none group-hover:bg-[#f0a040]/10 transition-colors" />
            <span className="text-[9px] uppercase tracking-widest text-[#f0a040] font-black bg-[#f0a040]/10 border border-[#f0a040]/25 px-2 py-0.5 rounded-full inline-block mb-2">RESERVE tier</span>
            <h5 className="text-[11px] font-bold text-[#f5efe2] leading-snug">AI Sommelier & Forecasting</h5>
            <p className="text-[10px] text-[#f5efe2]/50 mt-1 leading-normal">Optimize inventory and predict high-volume rush periods.</p>
            <button
              onClick={() => toast.success("Welcome to Reserve Club! Enterprise features unlocked.")}
              className="w-full mt-3 py-2 text-[10px] uppercase tracking-wider font-extrabold text-[#0b0a08] bg-gradient-to-r from-[#f0a040] to-[#e85a2a] rounded-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1 shadow-lg shadow-amber-950/20"
            >
              <span>UPGRADE PLAN</span>
              <ArrowRight className="size-3" />
            </button>
          </div>

          {/* User profile footer */}
          <div className="flex items-center justify-between p-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#f0a040]/20 to-[#e85a2a]/20 border border-[rgba(240,160,64,0.25)] flex items-center justify-center text-sm font-semibold select-none flex-shrink-0 text-[#f0a040]">
                {user?.firstName?.charAt(0) || "M"}
              </div>
              <div className="min-w-0">
                <h5 className="text-[11px] font-bold text-[#f5efe2] truncate leading-tight">
                  {user?.firstName ? `${user.firstName} ${user.lastName || ""}` : "Chef Marco Pierre"}
                </h5>
                <p className="text-[9px] text-[#f5efe2]/40 font-mono-dashboard truncate mt-0.5">DIRECTOR OF OPERATIONS</p>
              </div>
            </div>
            <button 
              onClick={() => toast.error("System logging out... (Mock Action)")}
              className="text-[#f5efe2]/40 hover:text-white p-1 transition-colors"
              title="Logout"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── FLUID MAIN AREA ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        
        {/* Sticky Topbar with Backdrop Blur */}
        <header className="sticky top-0 bg-[#0b0a08]/70 backdrop-blur-md border-b border-[rgba(255,255,255,0.08)] z-10 flex items-center justify-between px-6 py-4">
          
          {/* Left search input trigger pill */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="flex items-center gap-2.5 px-3.5 py-2 bg-[rgba(255,255,255,0.02)] hover:bg-white/[0.04] border border-[rgba(255,255,255,0.08)] rounded-full text-xs text-[#f5efe2]/40 transition-colors w-[240px] md:w-[280px] text-left relative"
            >
              <Search className="size-3.5 text-[#f5efe2]/40" />
              <span className="truncate">Search system or branch...</span>
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-[9px] font-mono-dashboard text-[#f5efe2]/40">
                ⌘K
              </kbd>
            </button>
            
            {/* Live pulsing order generator simulator button for developers */}
            <button
              onClick={triggerLiveOrderSimulation}
              className="hidden md:flex items-center gap-1.5 px-3.5 py-2 bg-[rgba(82,210,122,0.05)] border border-[rgba(82,210,122,0.2)] hover:bg-[rgba(82,210,122,0.1)] rounded-full text-[10px] tracking-wider uppercase font-extrabold text-[#52d27a] transition-all active:scale-95 shadow-sm shadow-green-950/20"
            >
              <Plus className="size-3" />
              <span>Simulate Order</span>
            </button>
          </div>

          {/* Right utility panel */}
          <div className="flex items-center gap-4">
            
            {/* Clock display */}
            <div className="hidden sm:block text-right">
              <p className="text-[10px] font-mono-dashboard text-[#f5efe2]/40 uppercase tracking-widest">Real-time Clock</p>
              <p className="text-[11px] font-mono-dashboard text-[#f5efe2] mt-0.5 font-bold tabular-nums">
                {simulatedTime || "Synchronizing..."}
              </p>
            </div>

            {/* Notification bell dropdown toggle */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="w-10 h-10 rounded-full border border-[rgba(255,255,255,0.08)] bg-white/[0.01] hover:bg-white/[0.04] transition-all flex items-center justify-center relative text-[#f5efe2]/80 hover:text-white"
              >
                <Bell className="size-4" />
                {unreadNotifCount > 0 && (
                  <span className="absolute top-2 right-2.5 w-2 h-2 bg-[#e85a2a] rounded-full animate-pulse" />
                )}
              </button>

              {/* Notifications panel dropdown */}
              <AnimatePresence>
                {notificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-3 w-80 bg-[#0b0a08] border border-[rgba(255,255,255,0.12)] rounded-xl shadow-2xl z-40 overflow-hidden"
                  >
                    <div className="p-4 border-b border-[rgba(255,255,255,0.08)] bg-white/[0.01] flex items-center justify-between">
                      <h4 className="text-[11px] uppercase tracking-wider font-extrabold text-[#f5efe2]">ALERTS & NOTIFICATIONS</h4>
                      {unreadNotifCount > 0 && (
                        <button
                          onClick={markAllNotificationsRead}
                          className="text-[9px] uppercase tracking-widest text-[#f0a040] hover:underline"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-60 overflow-y-auto custom-scrollbar divide-y divide-[rgba(255,255,255,0.05)]">
                      {notifications.length === 0 ? (
                        <p className="text-center text-[11px] text-[#f5efe2]/40 py-6">No notifications currently.</p>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            className={`p-3.5 text-xs transition-colors hover:bg-white/[0.02] flex items-start gap-2.5 ${
                              !notif.read ? "bg-[rgba(240,160,64,0.02)]" : ""
                            }`}
                          >
                            <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 bg-[#f0a040]" />
                            <div className="flex-1 min-w-0">
                              <p className={`text-[11px] leading-relaxed ${!notif.read ? "text-[#f5efe2]" : "text-[#f5efe2]/60"}`}>
                                {notif.text}
                              </p>
                              <span className="text-[9px] text-[#f5efe2]/40 font-mono-dashboard mt-1 block">{notif.time}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Live operational badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 border border-[rgba(82,210,122,0.15)] bg-[rgba(82,210,122,0.05)] rounded-full">
              <span className="w-2 h-2 rounded-full bg-[#52d27a] pulse-dot inline-block shrink-0" />
              <span className="text-[9px] font-black uppercase tracking-widest text-[#52d27a]">Live stream</span>
            </div>

          </div>

        </header>

        {/* ── MAIN CONTENT (Overview/Operations dashboard) ──────────────────── */}
        <main className="flex-1 p-6 md:p-8 space-y-8 overflow-y-auto custom-scrollbar relative">
          
          {/* Thin Saffron Accenting Border at top */}
          <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-[#f0a040] to-transparent absolute top-0 left-0 opacity-40 pointer-events-none" />

          {/* EDITORIAL HERO HEADER */}
          <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-2">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <span className="text-[9px] font-black uppercase tracking-[0.25em] text-[#f0a040] bg-[#f0a040]/10 border border-[#f0a040]/20 px-3 py-1 rounded-full">
                  OPERATIONAL CONTROL
                </span>
                <span className="text-[10px] text-[#f5efe2]/40 font-mono-dashboard">
                  {new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" }).toUpperCase()}
                </span>
              </div>
              
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#f5efe2] leading-none">
                Good day at <em className="font-editorial italic font-normal text-[#f0a040]">{activeBranch.name}</em>
              </h2>
              
              <p className="text-xs sm:text-sm text-[#f5efe2]/60 font-serif italic tracking-wide max-w-xl">
                Real-time pulse of your operations. System status healthy across 24 kitchen terminals.
              </p>
            </div>

            {/* Actions panel */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={exportCsvReport}
                className="px-4.5 py-3 border border-[rgba(255,255,255,0.08)] bg-white/[0.02] hover:bg-white/[0.04] rounded-lg text-xs font-semibold tracking-wider text-[#f5efe2] transition-all flex items-center gap-2 hover:border-[#f0a040]"
              >
                <Download className="size-3.5 text-[#f5efe2]/60" />
                <span>EXPORT REPORT</span>
              </button>
              
              <button
                onClick={() => setAiInsightsOpen(true)}
                className="px-4.5 py-3 bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-[#0b0a08] rounded-lg text-xs font-black tracking-wider hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-amber-950/20"
              >
                <Sparkles className="size-3.5 fill-[#0b0a08]" />
                <span>AI INSIGHTS</span>
                <ArrowRight className="size-3.5" />
              </button>
            </div>
          </section>

          {/* STAT STRIP - 4-Column Grid with 1px Dividers */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] rounded-xl overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-[rgba(255,255,255,0.08)] relative z-10 shadow-xl">
            {activeStats.map((stat, idx) => (
              <div
                key={stat.label}
                className={`p-6 relative group transition-all duration-300 ${
                  stat.featured 
                    ? "bg-gradient-to-br from-[#f0a040]/5 via-transparent to-transparent" 
                    : "hover:bg-white/[0.01]"
                }`}
              >
                {/* Glow border overlay for featured */}
                {stat.featured && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#f0a040] to-[#e85a2a]" />
                )}
                
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-[0.2em] text-[#f5efe2]/40 uppercase">
                    {stat.label}
                  </span>
                  
                  {/* Icon representations */}
                  {idx === 0 && <DollarSign className="size-3.5 text-[#f0a040]" />}
                  {idx === 1 && <Users className="size-3.5 text-[#f5efe2]/40" />}
                  {idx === 2 && <Activity className="size-3.5 text-[#f5efe2]/40" />}
                  {idx === 3 && <Clock className="size-3.5 text-[#f5efe2]/40" />}
                </div>

                {/* Big figure with gradient mask */}
                <div className="mt-4 flex items-baseline gap-2">
                  <h3 className="text-3xl md:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/60 font-mono-dashboard leading-none">
                    {stat.value}
                  </h3>
                </div>

                <div className="mt-2.5 flex items-center gap-1.5 text-[10px]">
                  <span className={`font-black ${stat.isPositive ? "text-[#52d27a]" : "text-[#e85a2a]"}`}>
                    {stat.change}
                  </span>
                  <span className="text-[#f5efe2]/40">vs last Tuesday</span>
                </div>
              </div>
            ))}
          </section>

          {/* TWO COLUMN CHART & ANALYTICS AREA */}
          <section className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-6 items-stretch">
            
            {/* Chart: Sales Hourly Volume bar chart */}
            <div className="bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] rounded-xl p-6 flex flex-col justify-between shadow-xl min-h-[360px] relative overflow-hidden">
              
              {/* Header inside card */}
              <div className="flex items-center justify-between mb-4 border-b border-[rgba(255,255,255,0.05)] pb-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold tracking-[0.2em] text-[#f0a040] uppercase">HOURLY PROGRESSION</span>
                  <h4 className="text-base font-bold text-[#f5efe2]">Real-time Sales & Covers Volume</h4>
                </div>

                {/* Metric toggle controls */}
                <div className="flex items-center gap-1.5 p-1 bg-white/5 border border-white/10 rounded-lg">
                  <button
                    onClick={() => setChartMetric("revenue")}
                    className={`px-3 py-1.5 rounded-md text-[10px] uppercase tracking-wider font-extrabold transition-all ${
                      chartMetric === "revenue"
                        ? "bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-[#0b0a08]"
                        : "text-[#f5efe2]/50 hover:text-[#f5efe2]"
                    }`}
                  >
                    Sales
                  </button>
                  <button
                    onClick={() => setChartMetric("orders")}
                    className={`px-3 py-1.5 rounded-md text-[10px] uppercase tracking-wider font-extrabold transition-all ${
                      chartMetric === "orders"
                        ? "bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-[#0b0a08]"
                        : "text-[#f5efe2]/50 hover:text-[#f5efe2]"
                    }`}
                  >
                    Covers
                  </button>
                </div>
              </div>

              {/* Graphic Plotting */}
              <div className="flex-1 w-full min-h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f0a040" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#e85a2a" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    {/* Hidden X axis as requested */}
                    <XAxis dataKey="hour" hide />
                    <YAxis
                      stroke="rgba(245, 239, 226, 0.3)"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      fontFamily="JetBrains Mono"
                      tickFormatter={(val) => 
                        chartMetric === "revenue" 
                          ? `${activeBranch.currencySymbol}${val >= 1000 ? (val / 1000).toFixed(0) + "k" : val}`
                          : val
                      }
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(240, 160, 64, 0.05)", radius: 4 }}
                      contentStyle={{
                        backgroundColor: "#0b0a08",
                        border: "1px solid rgba(240, 160, 64, 0.3)",
                        borderRadius: "8px",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                      }}
                      labelClassName="text-[10px] font-mono-dashboard text-[#f0a040] tracking-wider"
                      itemStyle={{
                        color: "#f5efe2",
                        fontSize: "12px",
                        fontFamily: "JetBrains Mono",
                      }}
                      formatter={(value: any) => [
                        chartMetric === "revenue" 
                          ? `${activeBranch.currencySymbol}${parseFloat(value).toLocaleString()}` 
                          : `${value} orders`,
                        chartMetric === "revenue" ? "Revenue" : "Covers"
                      ]}
                    />
                    <Bar 
                      dataKey={chartMetric === "revenue" ? "revenue" : "orders"} 
                      fill="url(#barGradient)" 
                      radius={[4, 4, 0, 0]}
                    >
                      {chartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          className="hover:brightness-110 transition-all cursor-pointer"
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Bottom indicators */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-[rgba(255,255,255,0.05)] text-[10px] text-[#f5efe2]/40 font-mono-dashboard uppercase tracking-widest">
                <span>Shift Start (12:00 PM)</span>
                <span>Peak Rush (8:00 PM)</span>
                <span>Closing (11:00 PM)</span>
              </div>

            </div>

            {/* Smart Inventory / Quick alerts */}
            <div className="bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] rounded-xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden">
              <div className="space-y-1 border-b border-[rgba(255,255,255,0.05)] pb-4 mb-4">
                <span className="text-[10px] font-bold tracking-[0.2em] text-[#e85a2a] uppercase">SYSTEM VITALITY</span>
                <h4 className="text-base font-bold text-[#f5efe2]">KDS & Inventory Status</h4>
              </div>

              <div className="flex-1 space-y-4">
                {/* KDS Health indicator */}
                <div className="p-4 bg-white/[0.01] border border-[rgba(255,255,255,0.05)] rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold tracking-wider text-[#f5efe2]/50 uppercase">Kitchen display network</span>
                    <span className="text-[9px] font-black text-[#52d27a] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-[#52d27a] rounded-full inline-block animate-ping" />
                      SECURE
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="w-[100%] h-full bg-gradient-to-r from-[#f0a040] to-[#e85a2a] rounded-full" />
                    </div>
                    <span className="text-[10px] font-mono-dashboard text-[#f5efe2]/60">5/5 Connected</span>
                  </div>
                </div>

                {/* Live Stock Indicators */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold tracking-wider text-[#f5efe2]/50 uppercase">Critically Low Ingredients</span>
                  <div className="space-y-2">
                    {[
                      { name: "Saffron Filaments (Grade A)", level: "12g remaining", pct: 15, color: "#e85a2a" },
                      { name: "Organic Basmati Grain", level: "4.5kg remaining", pct: 35, color: "#f0a040" },
                      { name: "Green Cardamom Shells", level: "250g remaining", pct: 40, color: "#f0a040" },
                    ].map((item) => (
                      <div key={item.name} className="p-3 bg-white/[0.01] border border-[rgba(255,255,255,0.03)] rounded-lg flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#f5efe2] truncate">{item.name}</p>
                          <p className="text-[9px] text-[#f5efe2]/40 font-mono-dashboard mt-0.5">{item.level}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${item.pct}%`, backgroundColor: item.color }} />
                          </div>
                          <span className="text-[10px] font-mono-dashboard text-[#e85a2a] font-bold">{item.pct}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              <div className="mt-4 pt-3 border-t border-[rgba(255,255,255,0.05)]">
                <button
                  onClick={() => toast.loading("Restocking order dispatched to supplier S1...", { duration: 1500 })}
                  className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-extrabold uppercase tracking-widest text-[#f0a040] transition-colors"
                >
                  DISPATCH SUPPLIER RESTOCK ORDER
                </button>
              </div>

            </div>

          </section>

          {/* RECENT ORDERS PANEL */}
          <section className="bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] rounded-xl p-6 shadow-xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[rgba(255,255,255,0.05)] pb-4 mb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold tracking-[0.2em] text-[#f0a040] uppercase">LIVE STREAM</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#52d27a] pulse-dot inline-block" />
                </div>
                <h4 className="text-base font-bold text-[#f5efe2]">Recent Dining & Delivery Orders</h4>
              </div>

              {/* Quick Filters */}
              <div className="flex flex-wrap items-center gap-2">
                {["ALL", "NEW", "PREPARING", "READY", "DONE"].map((st) => (
                  <button
                    key={st}
                    className="px-3 py-1.5 rounded-md text-[9px] uppercase tracking-wider font-extrabold border border-white/10 bg-white/5 text-[#f5efe2]/60 hover:text-white transition-all"
                    onClick={() => {
                      toast.success(`Filter applied: ${st}`);
                    }}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Table layout */}
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[rgba(255,255,255,0.05)] text-[10px] font-bold uppercase tracking-widest text-[#f5efe2]/40">
                    <th className="py-3 px-4">Order ID</th>
                    <th className="py-3 px-4">Table / Channel</th>
                    <th className="py-3 px-4">Items Ordered</th>
                    <th className="py-3 px-4 text-right">Price</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Timer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(255,255,255,0.05)] text-xs">
                  {orders[activeBranch.id].map((order) => (
                    <tr
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      className={`hover:bg-white/[0.03] transition-colors cursor-pointer group ${
                        order.isLive ? "bg-[rgba(82,210,122,0.02)] animate-pulse" : ""
                      }`}
                    >
                      <td className="py-4 px-4 font-mono-dashboard text-[#f0a040] font-semibold">
                        {order.id}
                      </td>
                      <td className="py-4 px-4 font-bold text-[#f5efe2]">
                        {order.table}
                      </td>
                      <td className="py-4 px-4 text-[#f5efe2]/80 max-w-xs truncate group-hover:text-white transition-colors">
                        {order.items}
                      </td>
                      <td className="py-4 px-4 text-right font-mono-dashboard text-[#f5efe2] font-medium">
                        {activeBranch.currencySymbol}{order.amount.toLocaleString()}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            order.status === "NEW"
                              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              : order.status === "PREPARING"
                              ? "bg-amber-500/10 text-[#f0a040] border border-amber-500/20"
                              : order.status === "READY"
                              ? "bg-[#52d27a]/10 text-[#52d27a] border border-[#52d27a]/20"
                              : order.status === "DONE"
                              ? "bg-white/5 text-[#f5efe2]/50 border border-white/10"
                              : "bg-red-500/10 text-red-400 border border-red-500/20"
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right text-[10px] text-[#f5efe2]/40 font-mono-dashboard">
                        {order.time}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </section>

        </main>
      </div>

      {/* ── COMMAND PALETTE OVERLAY MODAL (⌘K) ──────────────────────────────── */}
      <AnimatePresence>
        {commandPaletteOpen && (
          <div className="fixed inset-0 bg-[#0b0a08]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0b0a08] border border-[rgba(255,255,255,0.12)] w-full max-w-lg rounded-xl overflow-hidden shadow-2xl flex flex-col"
            >
              {/* Search Bar */}
              <div className="p-4 border-b border-[rgba(255,255,255,0.08)] flex items-center gap-3 bg-white/[0.01]">
                <Command className="size-4 text-[#f0a040]" />
                <input
                  type="text"
                  placeholder="Type a command or branch name to navigate..."
                  value={commandQuery}
                  onChange={(e) => setCommandQuery(e.target.value)}
                  className="flex-1 bg-transparent border-0 outline-none text-xs text-[#f5efe2] placeholder-[#f5efe2]/30"
                  autoFocus
                />
                <button
                  onClick={() => setCommandPaletteOpen(false)}
                  className="text-[#f5efe2]/40 hover:text-white"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Suggestions */}
              <div className="p-2 max-h-72 overflow-y-auto custom-scrollbar">
                <span className="text-[9px] uppercase tracking-widest text-[#f5efe2]/40 font-bold px-3 py-1.5 block">
                  AVAILABLE OS COMMANDS
                </span>
                
                <div className="space-y-1">
                  {filteredCommands.map((cmd, idx) => (
                    <button
                      key={idx}
                      onClick={cmd.action}
                      className="w-full text-left px-3 py-2.5 rounded-lg text-xs text-[#f5efe2]/80 hover:text-white hover:bg-white/[0.03] transition-all flex items-center justify-between"
                    >
                      <span>{cmd.name}</span>
                      <ChevronRight className="size-3 text-[#f5efe2]/30" />
                    </button>
                  ))}
                  {filteredCommands.length === 0 && (
                    <p className="text-center text-xs text-[#f5efe2]/40 py-4">No matching commands found.</p>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-3 bg-white/5 border-t border-[rgba(255,255,255,0.08)] text-[9px] text-[#f5efe2]/40 font-mono-dashboard flex items-center justify-between">
                <span>Use ↑↓ to navigate</span>
                <span>ESC to dismiss</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── AI INSIGHTS SLIDING DRAWER PANEL ────────────────────────────────── */}
      <AnimatePresence>
        {aiInsightsOpen && (
          <div className="fixed inset-0 bg-[#0b0a08]/40 backdrop-blur-xs z-50 flex justify-end">
            {/* Backdrop click dismiss */}
            <div className="absolute inset-0" onClick={() => setAiInsightsOpen(false)} />
            
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="w-full max-w-md bg-[#0b0a08] border-l border-[rgba(255,255,255,0.12)] h-full relative z-10 flex flex-col justify-between shadow-2xl p-6"
            >
              <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                
                {/* Header info */}
                <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-[#f0a040]" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[#f5efe2]">PREDICTIVE AI COPILOT</h3>
                  </div>
                  
                  <button
                    onClick={() => setAiInsightsOpen(false)}
                    className="w-8 h-8 rounded-full border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-[#f5efe2]/60 hover:text-white"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <p className="text-xs text-[#f5efe2]/60 leading-relaxed italic">
                  Running automated forecasting models based on historically logged patterns, local weather predictions, and real-time order speeds.
                </p>

                {/* Predictions list */}
                <div className="space-y-4 pt-2">
                  {PREDICTIVE_INSIGHTS.map((insight, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-[rgba(240,160,64,0.02)] border border-[rgba(240,160,64,0.12)] rounded-xl space-y-2.5 relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 p-2 text-[9px] font-black uppercase text-[#f0a040]">
                        Conf: {insight.confidence}
                      </div>

                      <span className="text-[9px] uppercase tracking-wider text-[#f5efe2]/40 font-bold">
                        {insight.category}
                      </span>
                      
                      <h4 className="text-xs font-black text-[#f5efe2]">{insight.title}</h4>
                      
                      <p className="text-[11px] text-[#f5efe2]/75 leading-relaxed">
                        {insight.desc}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Recommendation prompt */}
                <div className="p-4 bg-[#52d27a]/5 border border-[#52d27a]/20 rounded-xl space-y-2">
                  <h5 className="text-xs font-bold text-[#52d27a] flex items-center gap-1.5">
                    <CheckCircle className="size-3.5" />
                    Operational Recommendations
                  </h5>
                  <p className="text-[11px] text-[#f5efe2]/80 leading-relaxed">
                    Floor runner staffing level is optimal for current volume. No inventory delays registered in spice category supply chains.
                  </p>
                </div>

              </div>

              {/* Bottom Drawer actions */}
              <div className="border-t border-[rgba(255,255,255,0.08)] pt-4 mt-6">
                <button
                  onClick={() => {
                    toast.success("AI model recalibrated successfully!");
                    setAiInsightsOpen(false);
                  }}
                  className="w-full py-3 bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-[#0b0a08] text-xs font-black tracking-wider uppercase rounded-lg hover:brightness-110 active:scale-95 transition-all"
                >
                  RE-CALIBRATE FORECAST MODEL
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── SELECTED ORDER DETAILS DIALOG MODAL ─────────────────────────────── */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 bg-[#0b0a08]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0b0a08] border border-[rgba(255,255,255,0.12)] w-full max-w-md rounded-xl overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-4 border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between bg-white/[0.01]">
                <div>
                  <span className="text-[9px] uppercase tracking-widest text-[#f5efe2]/40 font-bold">ORDER SLIP DETAIL</span>
                  <h4 className="text-sm font-bold text-[#f5efe2] font-mono-dashboard mt-0.5">{selectedOrder.id}</h4>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-[#f5efe2]/40 hover:text-white"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="flex justify-between border-b border-[rgba(255,255,255,0.05)] pb-3">
                  <span className="text-xs text-[#f5efe2]/50">Dining Table</span>
                  <span className="text-xs font-bold text-[#f5efe2]">{selectedOrder.table}</span>
                </div>

                <div className="flex justify-between border-b border-[rgba(255,255,255,0.05)] pb-3">
                  <span className="text-xs text-[#f5efe2]/50">Time Elapsed</span>
                  <span className="text-xs font-medium text-[#f5efe2]">{selectedOrder.time}</span>
                </div>

                <div className="space-y-1.5 border-b border-[rgba(255,255,255,0.05)] pb-3">
                  <span className="text-xs text-[#f5efe2]/50">Curated Dishes</span>
                  <p className="text-xs font-semibold text-[#f0a040] leading-relaxed">
                    {selectedOrder.items}
                  </p>
                </div>

                <div className="flex justify-between items-baseline pt-2">
                  <span className="text-xs text-[#f5efe2]/50">Order Total</span>
                  <span className="text-lg font-extrabold text-[#f5efe2] font-mono-dashboard">
                    {activeBranch.currencySymbol}{selectedOrder.amount.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Status Update Actions */}
              <div className="p-4 bg-white/5 border-t border-[rgba(255,255,255,0.08)] grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setOrders((prev) => ({
                      ...prev,
                      [activeBranch.id]: prev[activeBranch.id].map((o) =>
                        o.id === selectedOrder.id ? { ...o, status: "READY" } : o
                      ),
                    }));
                    toast.success(`Order ${selectedOrder.id} marked as READY`);
                    setSelectedOrder(null);
                  }}
                  className="py-2.5 bg-[#52d27a]/10 hover:bg-[#52d27a]/15 text-[#52d27a] border border-[#52d27a]/20 text-[10px] font-extrabold uppercase tracking-wider rounded-lg transition-colors"
                >
                  Mark Ready
                </button>
                
                <button
                  onClick={() => {
                    setOrders((prev) => ({
                      ...prev,
                      [activeBranch.id]: prev[activeBranch.id].map((o) =>
                        o.id === selectedOrder.id ? { ...o, status: "DONE" } : o
                      ),
                    }));
                    toast.success(`Order ${selectedOrder.id} completed!`);
                    setSelectedOrder(null);
                  }}
                  className="py-2.5 bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-[#0b0a08] text-[10px] font-black uppercase tracking-wider rounded-lg transition-all hover:brightness-110"
                >
                  Complete Order
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
