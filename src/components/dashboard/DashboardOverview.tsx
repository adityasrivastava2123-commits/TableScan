"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { formatDistanceToNow } from "date-fns";
import {
  DollarSign,
  ShoppingCart,
  Users,
  Table,
  Utensils,
  LayoutGrid,
  ChefHat,
  QrCode,
  Share2,
  TrendingUp,
  TrendingDown,
  Package,
  UserCheck,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { pusherClient } from "@/lib/pusher-client";
import type { Restaurant, Order } from "@prisma/client";

interface DashboardData {
  todayRevenue: number;
  todayOrders: number;
  activeOrders: number;
  totalTables: number;
  occupiedTables: number;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    totalAmount: number;
    createdAt: Date;
    items: any[];
    table?: { name: string };
  }>;
  lowStockAlert: boolean;
  trialDaysLeft: number;
  revenueChange: number;
  ordersChange: number;
  totalMenuItems: number;
  totalStaff: number;
  restaurantOpen: boolean;
}

interface DashboardOverviewProps {
  restaurant: Restaurant;
  userName: string;
}

export default function DashboardOverview({ restaurant, userName }: DashboardOverviewProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [activeOrders, setActiveOrders] = useState(0);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get(`/api/dashboard?restaurantId=${restaurant.id}`);
      setData(response.data);
      setActiveOrders(response.data.activeOrders);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Subscribe to Pusher for real-time updates
    if (pusherClient) {
      const channel = pusherClient.subscribe(`restaurant-${restaurant.id}`);

      channel.bind("new-order", (data: unknown) => {
        const order = (data as any).order;
        if (order.status === "NEW" || order.status === "PREPARING" || order.status === "READY") {
          setActiveOrders((prev) => prev + 1);
        }
        fetchDashboardData();
      });

      channel.bind("order-updated", (data: unknown) => {
        const status = (data as any).status;
        if (status === "DONE") {
          setActiveOrders((prev) => prev - 1);
        }
        fetchDashboardData();
      });

      return () => {
        channel.unbind_all();
        channel.unsubscribe();
      };
    }
  }, [restaurant.id, fetchDashboardData]);

  const handleShareMenu = () => {
    const menuUrl = `${window.location.origin}/${restaurant.slug}`;
    navigator.clipboard.writeText(menuUrl);
    // Could add toast notification here
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 animate-pulse bg-muted rounded" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {getGreeting()}, {userName}!
          </h1>
          <p className="text-muted-foreground">{restaurant.name}</p>
          <p className="text-sm text-muted-foreground">{currentDate}</p>
        </div>
        {data.trialDaysLeft > 0 && (
          <Badge variant="outline" className="border-orange-500 text-orange-500">
            <AlertCircle className="size-3 mr-1" />
            {data.trialDaysLeft} days left in free trial
          </Badge>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Today's Revenue"
          value={`₹${data.todayRevenue.toFixed(2)}`}
          change={data.revenueChange}
          icon={<DollarSign className="size-4" />}
          color="green"
        />
        <StatCard
          title="Today's Orders"
          value={data.todayOrders.toString()}
          change={data.ordersChange}
          icon={<ShoppingCart className="size-4" />}
          color="blue"
        />
        <StatCard
          title="Active Orders"
          value={activeOrders.toString()}
          icon={<Users className="size-4" />}
          color="purple"
          clickable
          onClick={() => router.push("/orders")}
        />
        <StatCard
          title="Tables Occupied"
          value={`${data.occupiedTables}/${data.totalTables}`}
          icon={<Table className="size-4" />}
          color="orange"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <QuickActionButton
          icon={<ShoppingCart className="size-6" />}
          label="View Orders"
          onClick={() => router.push("/orders")}
        />
        <QuickActionButton
          icon={<Utensils className="size-6" />}
          label="Menu Builder"
          onClick={() => router.push("/menu")}
        />
        <QuickActionButton
          icon={<LayoutGrid className="size-6" />}
          label="Table Manager"
          onClick={() => router.push("/tables")}
        />
        <QuickActionButton
          icon={<ChefHat className="size-6" />}
          label="Kitchen Display"
          onClick={() => window.open("/kitchen", "_blank")}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>Last 5 orders</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.recentOrders.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No orders yet</p>
                ) : (
                  data.recentOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">#{order.orderNumber}</span>
                          <Badge variant={getStatusVariant(order.status)}>
                            {order.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Table: {(order as any).table?.name || "N/A"} • {order.items.length} items
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">₹{order.totalAmount.toFixed(2)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => router.push("/orders")}
              >
                View all orders
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="size-4 text-muted-foreground" />
                  <span className="text-sm">Menu Items</span>
                </div>
                <span className="font-medium">{data.totalMenuItems}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="size-4 text-muted-foreground" />
                  <span className="text-sm">Staff Members</span>
                </div>
                <span className="font-medium">{data.totalStaff}</span>
              </div>
            </CardContent>
          </Card>

          {/* Restaurant Status */}
          <Card>
            <CardHeader>
              <CardTitle>Restaurant Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div
                  className={`size-2 rounded-full ${
                    data.restaurantOpen ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <span className="font-medium">
                  {data.restaurantOpen ? "Open" : "Closed"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Based on operating hours
              </p>
            </CardContent>
          </Card>

          {/* QR Codes */}
          <Card>
            <CardHeader>
              <CardTitle>QR Codes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <QrCode className="size-4 text-muted-foreground" />
                <span className="font-medium">{data.totalTables} Active Tables</span>
              </div>
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => router.push("/tables")}
              >
                Manage QR Codes
              </Button>
            </CardContent>
          </Card>

          {/* Share Menu Link */}
          <Card>
            <CardHeader>
              <CardTitle>Share Menu</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleShareMenu}
              >
                <Share2 className="size-4 mr-2" />
                Copy Menu Link
              </Button>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Share with customers to view menu
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  change?: number;
  icon: React.ReactNode;
  color: "green" | "blue" | "purple" | "orange";
  clickable?: boolean;
  onClick?: () => void;
}

function StatCard({ title, value, change, icon, color, clickable, onClick }: StatCardProps) {
  const colorClasses = {
    green: "bg-green-50 text-green-600 border-green-200",
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    purple: "bg-purple-50 text-purple-600 border-purple-200",
    orange: "bg-orange-50 text-orange-600 border-orange-200",
  };

  const isPositive = change !== undefined && change >= 0;

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${clickable ? "hover:border-orange-500" : ""}`}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>{icon}</div>
          {change !== undefined && (
            <div className={`flex items-center text-xs ${isPositive ? "text-green-600" : "text-red-600"}`}>
              {isPositive ? <TrendingUp className="size-3 mr-1" /> : <TrendingDown className="size-3 mr-1" />}
              {Math.abs(change).toFixed(1)}%
            </div>
          )}
        </div>
        <div className="mt-4">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

interface QuickActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

function QuickActionButton({ icon, label, onClick }: QuickActionButtonProps) {
  return (
    <Button
      variant="outline"
      className="h-24 flex-col gap-2 hover:bg-gradient-to-r hover:from-orange-500 hover:to-amber-500 hover:text-white hover:border-orange-500 transition-all"
      onClick={onClick}
    >
      {icon}
      <span className="text-sm">{label}</span>
    </Button>
  );
}

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "NEW":
      return "default";
    case "PREPARING":
      return "secondary";
    case "READY":
      return "outline";
    case "DONE":
      return "secondary";
    case "CANCELLED":
      return "destructive";
    default:
      return "default";
  }
}
