"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Period = "today" | "week" | "month";

type ReportResponse = {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  topItems: Array<{ name: string; quantity: number; revenue: number }>;
  revenueByDay: Array<{ date: string; revenue: number; orders: number }>;
  ordersByStatus: {
    NEW: number;
    PREPARING: number;
    READY: number;
    DONE: number;
    CANCELLED: number;
  };
  peakHours: Array<{ hour: number; orders: number }>;
};

type ReportsDashboardProps = {
  restaurantId: string;
};

const statusColors = ["#2563eb", "#f59e0b", "#22c55e", "#64748b", "#ef4444"];

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function ReportsDashboard({ restaurantId }: ReportsDashboardProps) {
  const [period, setPeriod] = useState<Period>("today");
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get<ReportResponse>(
        `/api/reports?restaurantId=${restaurantId}&period=${period}`,
      );
      setReport(data);
    } catch (error) {
      console.error(error);
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [period, restaurantId]);

  useEffect(() => {
    void fetchReport();
  }, [fetchReport]);

  const completionRate = useMemo(() => {
    if (!report || report.totalOrders === 0) return 0;
    return (report.ordersByStatus.DONE / report.totalOrders) * 100;
  }, [report]);

  if (loading) {
    return <ReportsSkeleton />;
  }

  if (!report || report.totalOrders === 0) {
    return (
      <div className="space-y-4">
        <Tabs value={period} onValueChange={(value) => setPeriod(value as Period)}>
          <TabsList>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="week">This Week</TabsTrigger>
            <TabsTrigger value="month">This Month</TabsTrigger>
          </TabsList>
        </Tabs>
        <Card className="flex min-h-[300px] items-center justify-center p-6 text-center">
          <div>
            <h3 className="text-xl font-semibold">No orders yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Place orders to start seeing revenue and performance insights.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={period} onValueChange={(value) => setPeriod(value as Period)}>
        <TabsList>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="week">This Week</TabsTrigger>
          <TabsTrigger value="month">This Month</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Revenue"
          value={inr.format(report.totalRevenue)}
          colorClass="text-green-600"
        />
        <StatCard
          label="Total Orders"
          value={report.totalOrders.toString()}
          colorClass="text-blue-600"
        />
        <StatCard
          label="Average Order Value"
          value={inr.format(report.avgOrderValue)}
          colorClass="text-purple-600"
        />
        <StatCard
          label="Completion Rate"
          value={`${completionRate.toFixed(1)}%`}
          colorClass="text-orange-600"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title="Revenue by Day">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={report.revenueByDay}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(value) => `₹${value}`} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => typeof value === 'number' ? inr.format(value) : value} />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#22c55e"
                strokeWidth={3}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top 5 Menu Items">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={report.topItems} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => typeof value === 'number' ? value : value} />
              <Bar dataKey="quantity" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Orders by Hour">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={report.peakHours}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" tickFormatter={(hour) => `${hour}:00`} tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => typeof value === 'number' ? value : value} />
              <Bar dataKey="orders" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Orders by Status">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Tooltip />
              <Pie
                data={Object.entries(report.ordersByStatus).map(([status, value]) => ({
                  status,
                  value,
                }))}
                dataKey="value"
                nameKey="status"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label
              >
                {statusColors.map((color) => (
                  <Cell key={color} fill={color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  colorClass,
}: {
  label: string;
  value: string;
  colorClass: string;
}) {
  return (
    <Card className="p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${colorClass}`}>{value}</p>
    </Card>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-4">
      <h3 className="mb-3 text-base font-semibold">{title}</h3>
      {children}
    </Card>
  );
}

function ReportsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-80 animate-pulse rounded-md bg-muted" />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <Card key={idx} className="space-y-3 p-4">
            <div className="h-4 w-28 animate-pulse rounded bg-muted" />
            <div className="h-7 w-32 animate-pulse rounded bg-muted" />
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, idx) => (
          <Card key={idx} className="space-y-3 p-4">
            <div className="h-5 w-36 animate-pulse rounded bg-muted" />
            <div className="h-[240px] animate-pulse rounded bg-muted/70" />
          </Card>
        ))}
      </div>
    </div>
  );
}

