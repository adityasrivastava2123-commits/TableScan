"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  BarChart3,
  BellRing,
  ChefHat,
  ClipboardList,
  CreditCard,
  IndianRupee,
  ReceiptText,
  ShieldCheck,
  Table2,
  Timer,
  TrendingUp,
  UserRoundCheck,
  Users,
  WalletCards,
} from "lucide-react";
import type { Restaurant } from "@prisma/client";

interface RoleDashboardsProps {
  restaurant: Restaurant;
}

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
    createdAt: string;
    items: Array<unknown>;
    table?: { name: string };
  }>;
  topItems: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
  revenueChange: number;
  ordersChange: number;
  totalMenuItems: number;
  totalStaff: number;
  restaurantOpen: boolean;
}

type RoleKey = "owner" | "cashier" | "kitchen" | "waiter";

const roles: Array<{
  key: RoleKey;
  label: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    key: "owner",
    label: "Owner",
    description: "Revenue, trends, staffing, and operating health.",
    icon: <ShieldCheck className="size-4" />,
  },
  {
    key: "cashier",
    label: "Cashier",
    description: "Payments, receipts, checkout queue, and settlements.",
    icon: <WalletCards className="size-4" />,
  },
  {
    key: "kitchen",
    label: "Kitchen",
    description: "Live tickets, prep pressure, and dish priorities.",
    icon: <ChefHat className="size-4" />,
  },
  {
    key: "waiter",
    label: "Waiter",
    description: "Assigned tables, service calls, and ready orders.",
    icon: <UserRoundCheck className="size-4" />,
  },
];

const statusStyles: Record<string, string> = {
  NEW: "border-blue-500/20 bg-blue-500/10 text-blue-300",
  PREPARING: "border-[#f0a040]/25 bg-[#f0a040]/10 text-[#f0a040]",
  READY: "border-[#52d27a]/25 bg-[#52d27a]/10 text-[#52d27a]",
  DONE: "border-white/10 bg-white/5 text-[#f5efe2]/50",
  CANCELLED: "border-red-500/20 bg-red-500/10 text-red-300",
};

function formatMoney(value: number) {
  return `INR ${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function StatCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.018] p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#f5efe2]/40">
          {label}
        </span>
        <span className="rounded-lg border border-[#f0a040]/20 bg-[#f0a040]/10 p-2 text-[#f0a040]">
          {icon}
        </span>
      </div>
      <div className="mt-4 text-2xl font-black tracking-tight text-[#f5efe2] font-mono-dashboard">
        {value}
      </div>
      <p className="mt-2 text-xs text-[#f5efe2]/45">{detail}</p>
    </div>
  );
}

function TaskList({ items }: { items: string[] }) {
  return (
    <div className="space-y-2.5">
      {items.map((item) => (
        <div
          key={item}
          className="flex items-center gap-3 rounded-lg border border-white/[0.05] bg-[#0b0a08] px-3.5 py-3 text-xs text-[#f5efe2]/70"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#f0a040]" />
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}

export default function RoleDashboards({ restaurant }: RoleDashboardsProps) {
  const [activeRole, setActiveRole] = useState<RoleKey>("owner");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await axios.get<DashboardData>(
          `/api/dashboard?restaurantId=${restaurant.id}`
        );
        setData(response.data);
      } catch (error) {
        console.error("Failed to fetch role dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [restaurant.id]);

  const occupancyRate = data
    ? Math.round((data.occupiedTables / (data.totalTables || 1)) * 100)
    : 0;

  const activeRoleMeta = roles.find((role) => role.key === activeRole) ?? roles[0];

  const roleContent = useMemo(() => {
    if (!data) return null;

    const pendingPayments = data.recentOrders.filter(
      (order) => order.status !== "DONE" && order.status !== "CANCELLED"
    );
    const kitchenOrders = data.recentOrders.filter((order) =>
      ["NEW", "PREPARING"].includes(order.status)
    );
    const readyOrders = data.recentOrders.filter((order) => order.status === "READY");

    if (activeRole === "cashier") {
      return {
        stats: [
          {
            label: "Cash collected",
            value: formatMoney(data.todayRevenue),
            detail: `${data.todayOrders} orders billed today`,
            icon: <IndianRupee className="size-4" />,
          },
          {
            label: "Checkout queue",
            value: pendingPayments.length.toString(),
            detail: "Open bills needing attention",
            icon: <ReceiptText className="size-4" />,
          },
          {
            label: "Avg bill",
            value: formatMoney(data.todayOrders ? data.todayRevenue / data.todayOrders : 0),
            detail: "Per completed customer order",
            icon: <CreditCard className="size-4" />,
          },
        ],
        tasks: [
          "Verify open bills before closing tables.",
          "Print or share receipts for settled orders.",
          "Watch high-value tables for payment confirmation.",
          "Flag cancelled bills for manager review.",
        ],
      };
    }

    if (activeRole === "kitchen") {
      return {
        stats: [
          {
            label: "Live tickets",
            value: kitchenOrders.length.toString(),
            detail: "New or preparing orders",
            icon: <ChefHat className="size-4" />,
          },
          {
            label: "Ready pass",
            value: readyOrders.length.toString(),
            detail: "Orders waiting to be served",
            icon: <BellRing className="size-4" />,
          },
          {
            label: "Top dish",
            value: data.topItems[0]?.name ?? "No orders",
            detail: data.topItems[0]
              ? `${data.topItems[0].quantity} portions today`
              : "Kitchen demand will appear here",
            icon: <ClipboardList className="size-4" />,
          },
        ],
        tasks: [
          "Start NEW tickets before lower-priority prep work.",
          "Mark READY orders the moment plating is complete.",
          "Use top dish demand to prep backups early.",
          "Escalate delayed tickets to the floor team.",
        ],
      };
    }

    if (activeRole === "waiter") {
      return {
        stats: [
          {
            label: "Occupied tables",
            value: `${data.occupiedTables}/${data.totalTables}`,
            detail: `${occupancyRate}% current floor occupancy`,
            icon: <Table2 className="size-4" />,
          },
          {
            label: "Ready orders",
            value: readyOrders.length.toString(),
            detail: "Pick up from kitchen pass",
            icon: <BellRing className="size-4" />,
          },
          {
            label: "Active service",
            value: data.activeOrders.toString(),
            detail: "Tables with live orders",
            icon: <Users className="size-4" />,
          },
        ],
        tasks: [
          "Serve READY orders before taking new table requests.",
          "Check occupied tables with long-running active orders.",
          "Clear completed tables quickly for the next seating.",
          "Confirm special notes with kitchen before serving.",
        ],
      };
    }

    return {
      stats: [
        {
          label: "Net revenue",
          value: formatMoney(data.todayRevenue),
          detail: `${data.revenueChange >= 0 ? "+" : ""}${data.revenueChange.toFixed(1)}% vs yesterday`,
          icon: <TrendingUp className="size-4" />,
        },
        {
          label: "Active orders",
          value: data.activeOrders.toString(),
          detail: "Live operations load",
          icon: <Timer className="size-4" />,
        },
        {
          label: "Staff online",
          value: data.totalStaff.toString(),
          detail: `${data.totalMenuItems} active menu items`,
          icon: <Users className="size-4" />,
        },
      ],
      tasks: [
        "Review revenue movement and table occupancy.",
        "Check active order pressure before peak hours.",
        "Audit top-selling items against inventory levels.",
        "Use staff count and order load to rebalance roles.",
      ],
    };
  }, [activeRole, data, occupancyRate]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-24 animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.02]" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-36 animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.02]"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!data || !roleContent) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-6 text-sm text-[#f5efe2]/55">
        Role dashboard data is unavailable right now.
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <section className="flex flex-col gap-5 border-b border-white/[0.06] pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <span className="inline-flex rounded-full border border-[#f0a040]/20 bg-[#f0a040]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#f0a040]">
            Role Command Center
          </span>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-[#f5efe2] md:text-5xl">
              Role dashboards for {restaurant.name}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#f5efe2]/55">
              Switch the floor view by responsibility so every team member sees
              only the metrics, queues, and next actions that matter to their shift.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-white/[0.018] px-4 py-3">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#f5efe2]/35">
            Restaurant status
          </div>
          <div className="mt-1 flex items-center gap-2 text-sm font-bold text-[#f5efe2]">
            <span
              className={`h-2 w-2 rounded-full ${
                data.restaurantOpen ? "bg-[#52d27a]" : "bg-[#e85a2a]"
              }`}
            />
            {data.restaurantOpen ? "Open now" : "Closed now"}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-4">
        {roles.map((role) => {
          const active = role.key === activeRole;

          return (
            <button
              key={role.key}
              onClick={() => setActiveRole(role.key)}
              className={`min-h-[118px] rounded-xl border p-4 text-left transition-all ${
                active
                  ? "border-[#f0a040]/50 bg-[#f0a040]/10 shadow-lg shadow-[#f0a040]/5"
                  : "border-white/[0.07] bg-white/[0.015] hover:border-white/15 hover:bg-white/[0.03]"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  className={`rounded-lg p-2 ${
                    active
                      ? "bg-[#f0a040] text-[#0b0a08]"
                      : "bg-white/[0.05] text-[#f5efe2]/50"
                  }`}
                >
                  {role.icon}
                </span>
                {active && (
                  <span className="rounded-full bg-[#52d27a]/10 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-[#52d27a]">
                    Active
                  </span>
                )}
              </div>
              <h2 className="mt-4 text-sm font-black text-[#f5efe2]">{role.label}</h2>
              <p className="mt-1 text-xs leading-5 text-[#f5efe2]/45">
                {role.description}
              </p>
            </button>
          );
        })}
      </section>

      <section className="rounded-xl border border-white/[0.08] bg-[#0b0a08] p-5">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[#f0a040]">
              {activeRoleMeta.icon}
              <span className="text-[10px] font-black uppercase tracking-[0.22em]">
                {activeRoleMeta.label} workspace
              </span>
            </div>
            <h2 className="mt-2 text-xl font-black text-[#f5efe2]">
              Shift-level priorities
            </h2>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-xs text-[#f5efe2]/45">
            <BarChart3 className="size-4 text-[#f0a040]" />
            Live data from today
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {roleContent.stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.018] p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#f0a040]">
                Live queue
              </span>
              <h2 className="mt-1 text-lg font-black text-[#f5efe2]">
                Recent orders by role context
              </h2>
            </div>
            <span className="text-xs text-[#f5efe2]/40">
              {data.recentOrders.length} latest
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/[0.06] text-[10px] uppercase tracking-widest text-[#f5efe2]/35">
                <tr>
                  <th className="py-3 pr-4">Order</th>
                  <th className="py-3 pr-4">Table</th>
                  <th className="py-3 pr-4 hidden sm:table-cell">Items</th>
                  <th className="py-3 pr-4">Amount</th>
                  <th className="py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {data.recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="py-3.5 pr-4 font-mono-dashboard font-bold text-[#f0a040]">
                      #{order.orderNumber}
                    </td>
                    <td className="py-3.5 pr-4 text-[#f5efe2]">
                      {order.table?.name ?? "Counter"}
                    </td>
                    <td className="py-3.5 pr-4 text-[#f5efe2]/55 hidden sm:table-cell">
                      {order.items?.length ?? 0} items
                    </td>
                    <td className="py-3.5 pr-4 font-mono-dashboard text-[#f5efe2]/70">
                      {formatMoney(order.totalAmount)}
                    </td>
                    <td className="py-3.5 text-right">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ${
                          statusStyles[order.status] ?? statusStyles.DONE
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-white/[0.018] p-5">
          <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#f0a040]">
            Next best actions
          </span>
          <h2 className="mt-1 text-lg font-black text-[#f5efe2]">
            {activeRoleMeta.label} checklist
          </h2>
          <div className="mt-5">
            <TaskList items={roleContent.tasks} />
          </div>
        </div>
      </section>
    </div>
  );
}
