"use client";

import { useState, useEffect, memo, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "next-themes";
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
  ArrowRight,
  Package,
  Calendar,
  CalendarCheck,
  Truck,
  Monitor,
  UsersRound,
  Brain,
  Sun,
  Moon,
} from "lucide-react";
import { useUser } from "@clerk/nextjs";
import type { Restaurant } from "@prisma/client";

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
  { label: "Reports", path: "/reports", icon: <BarChart2 className="size-4" />, section: "overview" },
  { label: "AI Forecast", path: "/forecasting", icon: <Brain className="size-4" />, section: "overview" },
  { label: "History", path: "/history", icon: <Clock className="size-4" />, section: "overview" },
  { label: "Orders", path: "/orders", icon: <ShoppingBag className="size-4" />, section: "operations" },
  { label: "Customers", path: "/customers", icon: <UsersRound className="size-4" />, section: "operations" },
  { label: "Kitchen", path: "/kitchen", icon: <ChefHat className="size-4" />, external: true, section: "operations" },
  { label: "KDS", path: "/kds", icon: <Monitor className="size-4" />, section: "operations" },
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
  account: "Account",
};

function Sidebar({ restaurant, restaurantOpen }: SidebarProps) {
  const { user } = useUser();
  const userName = user?.firstName || user?.emailAddresses?.[0]?.emailAddress || "User";
  const userImageUrl = user?.imageUrl;
  const userEmail = user?.emailAddresses?.[0]?.emailAddress;

  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
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
      .slice(0, 1);
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
      <div className="flex flex-col h-full bg-[#fcfcf9] dark:bg-[#0e0e0e] text-neutral-800 dark:text-[#f0ece4]">
        {/* Brand Section */}
        <div className="p-5 border-b border-neutral-200 dark:border-[rgba(255,255,255,0.07)]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f97316]">
              <span className="text-sm font-bold text-white">{getInitials(restaurant.name)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-neutral-800 dark:text-[#f0ece4] tracking-tight">{restaurant.name}</h2>
              <p className="text-[9px] tracking-wider text-neutral-400 dark:text-[#5a5650] uppercase">Restaurant OS</p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-2.5 overflow-y-auto">
          {Object.entries(sectionLabels).map(([section, label]) => {
            const sectionItems = sidebarItems.filter((item) => item.section === section);

            return (
              <div key={section} className="mb-1">
                <div className="px-2 py-3 text-[9px] tracking-wider uppercase text-neutral-400 dark:text-[#5a5650] font-bold">
                  {label}
                </div>
                <div className="space-y-1">
                  {sectionItems.map((item) => (
                    <button
                      key={item.path}
                      onClick={() => handleNavigation(item)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all relative ${
                        isActive(item.path)
                          ? "bg-[#f97316]/10 dark:bg-[rgba(249,115,22,0.12)] text-[#f97316] font-bold"
                          : "text-neutral-500 dark:text-[#9a9488] hover:bg-neutral-100 dark:hover:bg-[#181818] hover:text-neutral-800 dark:hover:text-[#f0ece4]"
                      }`}
                    >
                      {isActive(item.path) && (
                        <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-[3px] h-4 bg-[#f97316] rounded-l-[2px]" />
                      )}
                      <span
                        className="text-[15px] transition-all duration-200"
                        style={isActive(item.path) ? { filter: "drop-shadow(0 0 6px #f97316)" } : {}}
                      >
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                      {isActive(item.path) && (
                        <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-[#f97316] shadow-[0_0_4px_#f97316]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Dynamic Light/Dark Switch Toggle */}
        <div className="p-3">
          <div className="flex items-center justify-between p-2.5 bg-neutral-100 dark:bg-[#141414]/80 border border-neutral-200 dark:border-[rgba(255,255,255,0.06)] rounded-xl">
            <span className="text-[10px] font-bold text-neutral-400 dark:text-[#5a5650] uppercase tracking-wider flex items-center gap-1.5">
              <Sun className="size-3 text-[#f97316]" /> Theme Mode
            </span>
            {mounted ? (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="relative flex items-center gap-1 p-1 bg-neutral-200 dark:bg-[#1c1c1c] rounded-lg border border-neutral-300 dark:border-[rgba(255,255,255,0.07)] cursor-pointer focus:outline-none"
                title="Toggle Light/Dark Theme"
              >
                <div className={`p-1 rounded-md transition-all ${theme === "light" ? "bg-[#f97316] text-white" : "text-[#5a5650]"}`}>
                  <Sun className="size-3" />
                </div>
                <div className={`p-1 rounded-md transition-all ${theme === "dark" ? "bg-[#f97316] text-white" : "text-[#5a5650]"}`}>
                  <Moon className="size-3" />
                </div>
              </button>
            ) : (
              <div className="w-12 h-6 bg-neutral-200 dark:bg-[#1c1c1c] animate-pulse rounded-lg" />
            )}
          </div>
        </div>

        {/* Upgrade Card */}
        <div className="p-2.5">
          <div className="relative overflow-hidden bg-gradient-to-br from-[#f97316]/5 dark:from-[rgba(249,115,22,0.1)] to-[rgba(249,115,22,0.05)] border border-[#f97316]/20 rounded-xl p-3.5">
            {/* Shimmer sweep */}
            <div
              className="absolute inset-0 -translate-x-full animate-[shimmerSweep_2.5s_infinite] bg-gradient-to-r from-transparent via-[rgba(249,115,22,0.08)] to-transparent pointer-events-none"
            />
            <div className="relative">
              <div className="flex items-center gap-1.5 mb-1">
                <Star className="size-3 text-[#f97316]" />
                <h3 className="text-[12px] font-bold text-neutral-800 dark:text-[#f0ece4]">Upgrade to Pro</h3>
              </div>
              <p className="text-[10px] text-neutral-500 dark:text-[#9a9488] leading-relaxed mb-2.5">Unlock advanced features and analytics</p>
              <button className="w-full py-2 bg-transparent border border-[#f97316] rounded-lg text-[#f97316] text-[11px] font-semibold tracking-wider hover:bg-[#f97316] hover:text-white transition-all">
                UPGRADE →
              </button>
            </div>
          </div>
        </div>

        {/* User Section */}
        <div className="p-3.5 border-t border-neutral-200 dark:border-[rgba(255,255,255,0.07)]">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-[30px] h-[30px] rounded-full bg-neutral-200 dark:bg-[#222222] flex items-center justify-center text-[11px] font-bold text-[#f97316] border border-[#f97316]/30">
              {userName?.[0] || userEmail?.[0] || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-bold text-neutral-800 dark:text-[#f0ece4] truncate">{userName}</p>
              <p className="text-[10px] text-neutral-400 dark:text-[#5a5650]">Owner</p>
            </div>
          </div>
          <button
            className="w-full flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] text-neutral-400 dark:text-[#5a5650] hover:text-[#ef4444] hover:bg-red-50 dark:hover:bg-[rgba(239,68,68,0.07)] transition-all"
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
      <aside className="hidden md:flex flex-col w-[220px] min-h-screen bg-[#fcfcf9] dark:bg-[#0e0e0e] border-r border-neutral-200 dark:border-[rgba(255,255,255,0.07)] flex-shrink-0 sticky top-0 h-screen overflow-hidden">
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-neutral-200 dark:border-[rgba(255,255,255,0.07)] bg-[#fcfcf9] dark:bg-[#0e0e0e]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f97316]">
            <span className="text-xs font-bold text-white">{getInitials(restaurant.name)}</span>
          </div>
          <span className="font-semibold text-sm text-neutral-800 dark:text-[#f0ece4]">{restaurant.name}</span>
        </div>
        <button
          className="p-2 rounded-lg text-neutral-800 dark:text-[#f0ece4] hover:bg-neutral-100 dark:hover:bg-[#181818] transition-colors"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="size-5" />
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-[220px] bg-[#fcfcf9] dark:bg-[#0e0e0e] border-r border-neutral-200 dark:border-[rgba(255,255,255,0.07)] z-50 md:hidden">
            <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-[rgba(255,255,255,0.07)]">
              <span className="font-semibold text-neutral-800 dark:text-[#f0ece4]">Menu</span>
              <button
                className="p-2 rounded-lg text-neutral-800 dark:text-[#f0ece4] hover:bg-neutral-100 dark:hover:bg-[#181818] transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                <X className="size-5" />
              </button>
            </div>
            <SidebarContent />
          </div>
        </>
      )}
    </>
  );
}

export default memo(Sidebar);
