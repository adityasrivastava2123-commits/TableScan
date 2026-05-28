"use client";

import { useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { Restaurant } from "@prisma/client";

interface SidebarProps {
  restaurant: Restaurant;
  restaurantOpen: boolean;
  userName: string;
  userImageUrl?: string;
  userEmail?: string;
}

interface SidebarItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  external?: boolean;
}

const sidebarItems: SidebarItem[] = [
  { label: "Dashboard", path: "/dashboard", icon: <LayoutDashboard className="size-4" /> },
  { label: "Orders", path: "/orders", icon: <ShoppingBag className="size-4" /> },
  { label: "Menu", path: "/menu", icon: <UtensilsCrossed className="size-4" /> },
  { label: "Tables", path: "/tables", icon: <QrCode className="size-4" /> },
  { label: "Kitchen", path: "/kitchen", icon: <ChefHat className="size-4" />, external: true },
  { label: "Reports", path: "/reports", icon: <BarChart2 className="size-4" /> },
  { label: "History", path: "/history", icon: <Clock className="size-4" /> },
  { label: "Staff", path: "/staff", icon: <Users className="size-4" /> },
  { label: "Settings", path: "/settings", icon: <Settings className="size-4" /> },
  { label: "Billing", path: "/billing", icon: <CreditCard className="size-4" /> },
];

export default function Sidebar({ restaurant, restaurantOpen, userName, userImageUrl, userEmail }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const isActive = (path: string) => {
    if (path === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(path);
  };

  const handleNavigation = (item: SidebarItem) => {
    if (item.external) {
      window.open(item.path, "_blank");
    } else {
      router.push(item.path);
    }
    setMobileOpen(false);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Restaurant Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          {restaurant.logo ? (
            <Avatar className="size-10">
              <AvatarImage src={restaurant.logo} alt={restaurant.name} />
              <AvatarFallback>{getInitials(restaurant.name)}</AvatarFallback>
            </Avatar>
          ) : (
            <Avatar className="size-10">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getInitials(restaurant.name)}
              </AvatarFallback>
            </Avatar>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold truncate">{restaurant.name}</h2>
            <Badge variant={restaurantOpen ? "default" : "secondary"} className="text-xs">
              {restaurantOpen ? "Open" : "Closed"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {sidebarItems.map((item) => (
          <button
            key={item.path}
            onClick={() => handleNavigation(item)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive(item.path)
                ? "bg-black text-white"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t">
        <div className="flex items-center gap-3 mb-3">
          <Avatar>
            <AvatarImage src={userImageUrl} alt={userName} />
            <AvatarFallback>
              {userName?.[0] || userEmail?.[0] || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{userName}</p>
            <p className="text-xs text-muted-foreground truncate">Owner</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => router.push("/sign-out")}
        >
          <LogOut className="size-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 h-full bg-white border-r">
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b bg-white">
        <div className="flex items-center gap-3">
          {restaurant.logo ? (
            <Avatar className="size-8">
              <AvatarImage src={restaurant.logo} alt={restaurant.name} />
              <AvatarFallback>{getInitials(restaurant.name)}</AvatarFallback>
            </Avatar>
          ) : (
            <Avatar className="size-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {getInitials(restaurant.name)}
              </AvatarFallback>
            </Avatar>
          )}
          <span className="font-semibold text-sm">{restaurant.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={restaurantOpen ? "default" : "secondary"} className="text-xs">
            {restaurantOpen ? "Open" : "Closed"}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-5" />
          </Button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-64 bg-white z-50 md:hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <span className="font-semibold">Menu</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileOpen(false)}
              >
                <X className="size-5" />
              </Button>
            </div>
            <SidebarContent />
          </div>
        </>
      )}
    </>
  );
}
