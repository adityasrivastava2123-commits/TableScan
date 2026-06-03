"use client";

import { useState, useEffect, memo, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  QrCode,
  ChefHat,
  BarChart2,
  Clock,
  Users,
  Settings,
  CreditCard,
  LogOut,
  Menu,
  X,
  Star,
  Package,
  Calendar,
  CalendarCheck,
  Truck,
  UsersRound,
  Brain,
  MessageSquare,
  Sparkles,
  PanelsTopLeft,
} from "lucide-react";
import { useUser } from "@clerk/nextjs";
import type { Restaurant } from "@prisma/client";
import { useAIStore } from "@/store/aiStore";

interface SidebarProps {
  restaurant: Restaurant;
  restaurantOpen: boolean;
}

interface SidebarItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  external?: boolean;
  section: "overview" | "operations" | "catalog" | "account";
}

const sidebarItems: SidebarItem[] = [
  { label: "Dashboard", path: "/dashboard", icon: <LayoutDashboard className="size-4" />, section: "overview" },
  { label: "Role Views", path: "/role-dashboards", icon: <PanelsTopLeft className="size-4" />, section: "overview" },
  { label: "Reports", path: "/reports", icon: <BarChart2 className="size-4" />, section: "overview" },
  { label: "AI Forecast", path: "/forecasting", icon: <Brain className="size-4" />, section: "overview" },
  { label: "History", path: "/history", icon: <Clock className="size-4" />, section: "overview" },
  { label: "Orders", path: "/orders", icon: <ShoppingBag className="size-4" />, section: "operations" },
  { label: "Customers", path: "/customers", icon: <UsersRound className="size-4" />, section: "operations" },
  { label: "Kitchen (KDS)", path: "/kds", icon: <ChefHat className="size-4" />, section: "operations" },
  { label: "Support Chats", path: "/support-chats", icon: <MessageSquare className="size-4" />, section: "operations" },
  { label: "Menu", path: "/menu", icon: <UtensilsCrossed className="size-4" />, section: "catalog" },
  { label: "Tables", path: "/tables", icon: <QrCode className="size-4" />, section: "catalog" },
  { label: "Inventory", path: "/inventory", icon: <Package className="size-4" />, section: "catalog" },
  { label: "Reservations", path: "/reservations", icon: <CalendarCheck className="size-4" />, section: "catalog" },
  { label: "Table Service", path: "/table-service", icon: <UsersRound className="size-4" />, section: "catalog" },
  { label: "Queue", path: "/queue", icon: <UsersRound className="size-4" />, section: "catalog" },
  { label: "Staff", path: "/staff", icon: <Users className="size-4" />, section: "account" },
  { label: "Schedule", path: "/schedule", icon: <Calendar className="size-4" />, section: "account" },
  { label: "Delivery", path: "/delivery", icon: <Truck className="size-4" />, section: "account" },
  { label: "Settings", path: "/settings", icon: <Settings className="size-4" />, section: "account" },
  { label: "Billing", path: "/billing", icon: <CreditCard className="size-4" />, section: "account" },
];

const sectionLabels: Record<string, string> = {
  overview: "Overview",
  operations: "Operations",
  catalog: "Catalog",
  account: "Management",
};

function Sidebar({ restaurant, restaurantOpen }: SidebarProps) {
  const { user } = useUser();
  const userName = user?.firstName || user?.emailAddresses?.[0]?.emailAddress || "User";
  const { toggleOpen, isOpen } = useAIStore();

  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const getInitials = useCallback((name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, []);

  const isActive = useCallback((path: string) => {
    if (path === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(path);
  }, [pathname]);

  const handleNavigation = useCallback((item: SidebarItem) => {
    if (item.external) {
      window.open(item.path, "_blank");
    } else {
      router.push(item.path);
    }
    setMobileOpen(false);
  }, [router]);

  const SidebarContent = () => {
    return (
      <div className="flex flex-col h-full bg-[#0b0a08] text-[#f5efe2] select-none">
        {/* Brand & Branch Section */}
        <div className="p-5 border-b border-[rgba(255,255,255,0.06)] bg-white/[0.01]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#f0a040] to-[#e85a2a] shadow-lg shadow-[#f0a040]/10 border border-[#f0a040]/25 relative overflow-hidden shrink-0">
              <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity" />
              <Sparkles className="size-4.5 text-[#0b0a08] fill-[#0b0a08]" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-[13px] font-extrabold text-[#f5efe2] truncate tracking-wider font-sans uppercase">
                {restaurant.name}
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#52d27a] animate-pulse" />
                <span className="text-[8px] font-mono-dashboard uppercase tracking-widest text-[#52d27a]/90 font-bold">
                  Live System
                </span>
              </div>
            </div>
          </div>

          {/* Active Branch Status Pill */}
          <div className="mt-4 px-3 py-2 bg-[rgba(255,255,255,0.015)] border border-[rgba(255,255,255,0.05)] rounded-xl flex items-center justify-between">
            <span className="text-[9px] font-mono-dashboard text-[#f5efe2]/40 uppercase tracking-widest font-bold">Active Branch</span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#f0a040]/10 border border-[#f0a040]/20 rounded">
              <span className="w-1 h-1 rounded-full bg-[#f0a040] animate-pulse" />
              <span className="text-[9px] font-bold text-[#f0a040] font-mono-dashboard">KANPUR</span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-3 overflow-y-auto space-y-5 scrollbar-thin scrollbar-thumb-white/[0.04]">
          {Object.entries(sectionLabels).map(([section, label]) => {
            const sectionItems = sidebarItems.filter((item) => item.section === section);

            return (
              <div key={section} className="space-y-1.5">
                <div className="px-2 text-[9px] tracking-[0.25em] uppercase text-[#f0a040]/50 font-editorial italic font-bold">
                  {label}
                </div>
                <div className="space-y-1">
                  {sectionItems.map((item) => {
                    const active = isActive(item.path);
                    return (
                      <button
                        key={item.path}
                        onClick={() => handleNavigation(item)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-all relative group ${
                          active
                            ? "bg-gradient-to-r from-[#f0a040]/10 via-[#f0a040]/2 to-transparent border-l-2 border-[#f0a040] text-[#f5efe2] font-extrabold shadow-[inset_1px_0_0_rgba(240,160,64,0.15),0_0_12px_rgba(240,160,64,0.04)]"
                            : "text-[#f5efe2]/40 hover:text-[#f5efe2] hover:bg-white/[0.02] border-l-2 border-transparent"
                        }`}
                      >
                        <span className={`transition-all duration-300 group-hover:scale-110 ${
                          active 
                            ? "text-[#f0a040] drop-shadow-[0_0_6px_rgba(240,160,64,0.4)]" 
                            : "text-[#f5efe2]/35 group-hover:text-[#f5efe2]/60"
                        }`}>
                          {item.icon}
                        </span>
                        <span className="tracking-wide transition-transform duration-200 group-hover:translate-x-0.5">
                          {item.label}
                        </span>

                        {active && (
                          <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-[#f0a040] opacity-80" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* AI Commander Integration */}
        <div className="px-3 mb-2.5">
          <button
            onClick={toggleOpen}
            className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all duration-300 shadow-md relative overflow-hidden group ${
              isOpen
                ? "bg-gradient-to-tr from-[#f0a040]/15 to-[#e85a2a]/10 border-[#f0a040] text-[#f0a040] shadow-[#f0a040]/5"
                : "bg-white/[0.015] hover:bg-white/[0.035] border-[rgba(255,255,255,0.05)] hover:border-[#f0a040]/30 text-[#f5efe2]/50 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-3 relative z-10">
              <div className={`p-1.5 rounded-lg ${isOpen ? "bg-[#f0a040] text-[#0b0a08]" : "bg-[#f0a040]/10 text-[#f0a040] group-hover:bg-[#f0a040] group-hover:text-[#0b0a08]"} transition-colors shadow-sm`}>
                <Sparkles className="size-3.5" />
              </div>
              <div className="text-left">
                <span className="text-[12px] font-black block leading-tight tracking-wide">AI Assistant</span>
                <span className="text-[9px] opacity-60 block mt-0.5 font-mono-dashboard tracking-wider font-bold">OS VOICE CORE</span>
              </div>
            </div>
            <span className="flex h-2.5 w-2.5 relative z-10">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOpen ? "bg-[#f0a040]" : "bg-[#52d27a]"}`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isOpen ? "bg-[#f0a040]" : "bg-[#52d27a]"}`}></span>
            </span>
          </button>
        </div>

        {/* Upgrade Link */}
        <div className="px-3 pb-2.5">
          <button className="flex items-center justify-between w-full p-2.5 rounded-xl border border-white/[0.04] bg-white/[0.005] hover:bg-white/[0.02] hover:border-[#f0a040]/30 transition-all duration-300 text-xs text-[#f5efe2]/50 hover:text-[#f5efe2]">
            <div className="flex items-center gap-2">
              <Star className="size-3.5 text-[#f0a040] fill-[#f0a040] animate-pulse" />
              <span className="font-mono-dashboard tracking-widest text-[9px] uppercase font-bold">Reserve Premium</span>
            </div>
            <span className="text-[10px] text-[#f0a040] font-black">&rarr;</span>
          </button>
        </div>

        {/* User Profile Card */}
        <div className="p-4 border-t border-[rgba(255,255,255,0.06)] bg-white/[0.005]">
          <div className="flex items-center gap-3 mb-3 bg-white/[0.015] border border-white/[0.03] p-2.5 rounded-xl">
            <div className="w-[32px] h-[32px] rounded-full bg-gradient-to-br from-[#f0a040] to-[#e85a2a] text-[#0b0a08] flex items-center justify-center text-[12px] font-extrabold shadow-md shadow-[#f0a040]/10 border border-[#f0a040]/20 select-none shrink-0">
              {userName?.[0] || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-bold text-[#f5efe2] truncate leading-snug">{userName}</p>
              <p className="text-[9px] text-[#f5efe2]/40 font-mono-dashboard uppercase tracking-widest font-bold mt-0.5">Portal Owner</p>
            </div>
          </div>
          <button
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[10px] uppercase font-mono-dashboard tracking-widest font-bold text-[#f5efe2]/35 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all duration-300"
            onClick={() => router.push("/sign-out")}
          >
            <LogOut className="size-3" />
            Sign Out
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-[260px] min-h-screen bg-[#0b0a08] border-r border-[rgba(255,255,255,0.06)] flex-shrink-0 sticky top-0 h-screen overflow-hidden">
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-[rgba(255,255,255,0.06)] bg-[#0b0a08] text-[#f5efe2]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#f0a040] to-[#e85a2a] border border-[#f0a040]/20 shadow-md">
            <span className="text-xs font-black text-[#0b0a08]">{getInitials(restaurant.name)}</span>
          </div>
          <span className="font-semibold text-sm text-[#f5efe2] tracking-wide">{restaurant.name}</span>
        </div>
        <button
          className="p-2 rounded-lg text-[#f5efe2] hover:bg-white/[0.04] transition-colors border border-white/[0.04]"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="size-5" />
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/75 z-40 md:hidden backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-[260px] bg-[#0b0a08] border-r border-[rgba(255,255,255,0.06)] z-50 md:hidden flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b border-[rgba(255,255,255,0.06)] bg-white/[0.01]">
              <span className="font-editorial text-sm italic text-[#f0a040] tracking-wide">Menu Navigation</span>
              <button
                className="p-2 rounded-lg text-[#f5efe2] hover:bg-white/[0.04] transition-colors border border-white/[0.04]"
                onClick={() => setMobileOpen(false)}
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <SidebarContent />
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default memo(Sidebar);
