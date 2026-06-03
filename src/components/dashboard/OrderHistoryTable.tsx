"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { format } from "date-fns";
import { Download, ChevronDown, ChevronUp, Calendar, Filter, FileText, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type OrderStatus = "NEW" | "PREPARING" | "READY" | "DONE" | "CANCELLED";

type HistoryOrder = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
  table: { name: string };
  items: Array<{
    id: string;
    quantity: number;
    price: number;
    note: string | null;
    menuItem: { name: string };
  }>;
};

type HistoryResponse = {
  orders: HistoryOrder[];
  total: number;
  pages: number;
};

type Props = {
  restaurantId: string;
};

const statusBadgeMap: Record<OrderStatus, { bg: string; text: string; border: string }> = {
  NEW: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  PREPARING: "bg-amber-500/10 text-[#f0a040] border border-amber-500/20",
  READY: "bg-[#52d27a]/10 text-[#52d27a] border border-[#52d27a]/20",
  DONE: "bg-white/5 text-[#f5efe2]/50 border border-white/10",
  CANCELLED: "bg-red-500/10 text-red-400 border border-red-500/20",
} as any;

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function OrderHistoryTable({ restaurantId }: Props) {
  const [orders, setOrders] = useState<HistoryOrder[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const [status, setStatus] = useState<string>("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("restaurantId", restaurantId);
    params.set("page", String(page));
    params.set("pageSize", "20");
    if (status !== "ALL") params.set("status", status);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return params.toString();
  }, [restaurantId, page, status, from, to]);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get<HistoryResponse>(`/api/orders/history?${queryString}`);
      setOrders(data.orders);
      setTotal(data.total);
      setPages(data.pages);
    } catch (error) {
      console.error(error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  async function exportCsv() {
    try {
      setExporting(true);
      const params = new URLSearchParams();
      params.set("restaurantId", restaurantId);
      params.set("page", "1");
      params.set("pageSize", "10000");
      if (status !== "ALL") params.set("status", status);
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const { data } = await axios.get<HistoryResponse>(`/api/orders/history?${params.toString()}`);

      const header = ["Order Number", "Table", "Items", "Total", "Status", "Date/Time"];
      const rows = data.orders.map((order) => [
        order.orderNumber,
        order.table.name,
        order.items.map((item) => `${item.quantity}x ${item.menuItem.name}`).join(" | "),
        order.totalAmount.toFixed(2),
        order.status,
        format(new Date(order.createdAt), "yyyy-MM-dd HH:mm:ss"),
      ]);

      const csv = [header, ...rows]
        .map((row) =>
          row
            .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
            .join(","),
        )
        .join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `order-history-${Date.now()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-8 relative">
      {/* ── Page Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[rgba(255,255,255,0.08)] pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-[50px] h-[50px] rounded-2xl bg-gradient-to-tr from-[#f0a040] to-[#e85a2a] flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#f0a040]/15 border border-[#f0a040]/20">
            <FileText className="size-5 text-white animate-pulse" />
          </div>
          <div>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#f0a040]">ARCHIVES & LOGS</span>
            <h1 className="text-2xl font-bold tracking-tight text-[#f5efe2] font-editorial italic mt-0.5">
              Order History
            </h1>
            <p className="text-[11px] text-[#f5efe2]/50 font-serif italic mt-0.5">
              Review and audit your restaurant's past order transactions
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div>
        <Card className="bg-[#0b0a08]/40 border border-[rgba(255,255,255,0.08)] backdrop-blur-md rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1.5">
                <Label className="text-[#f5efe2]/40 text-[9px] font-mono-dashboard font-black uppercase tracking-wider block flex items-center gap-1.5">
                  <Filter className="size-3 text-[#f0a040]" /> Status
                </Label>
                <Select
                  value={status}
                  onValueChange={(value) => {
                    setStatus(value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[170px] bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] text-[#f5efe2] focus:border-[#f0a040] text-xs font-mono-dashboard h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] text-[#f5efe2]">
                    <SelectItem value="ALL" className="text-[#f5efe2] focus:bg-[#f0a040]/10">All</SelectItem>
                    <SelectItem value="NEW" className="text-[#f5efe2] focus:bg-[#f0a040]/10">NEW</SelectItem>
                    <SelectItem value="PREPARING" className="text-[#f5efe2] focus:bg-[#f0a040]/10">PREPARING</SelectItem>
                    <SelectItem value="READY" className="text-[#f5efe2] focus:bg-[#f0a040]/10">READY</SelectItem>
                    <SelectItem value="DONE" className="text-[#f5efe2] focus:bg-[#f0a040]/10">DONE</SelectItem>
                    <SelectItem value="CANCELLED" className="text-[#f5efe2] focus:bg-[#f0a040]/10">CANCELLED</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[#f5efe2]/40 text-[9px] font-mono-dashboard font-black uppercase tracking-wider block flex items-center gap-1.5">
                  <Calendar className="size-3 text-[#f0a040]" /> From
                </Label>
                <Input
                  type="date"
                  value={from}
                  onChange={(e) => {
                    setFrom(e.target.value);
                    setPage(1);
                  }}
                  className="bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] text-[#f5efe2] focus:border-[#f0a040] text-xs font-mono-dashboard h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[#f5efe2]/40 text-[9px] font-mono-dashboard font-black uppercase tracking-wider block flex items-center gap-1.5">
                  <Calendar className="size-3 text-[#f0a040]" /> To
                </Label>
                <Input
                  type="date"
                  value={to}
                  onChange={(e) => {
                    setTo(e.target.value);
                    setPage(1);
                  }}
                  className="bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] text-[#f5efe2] focus:border-[#f0a040] text-xs font-mono-dashboard h-10"
                />
              </div>
            </div>

            <button
              onClick={() => void exportCsv()}
              disabled={exporting}
              className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-white font-mono-dashboard font-bold uppercase tracking-wider text-[10px] hover:brightness-110 shadow-lg shadow-[#f0a040]/10 transition-all disabled:opacity-50 h-10"
            >
              <Download className="size-4" />
              {exporting ? "Exporting..." : "Export CSV"}
            </button>
          </div>
        </Card>
      </div>

      {/* Table */}
      <div>
        <Card className="overflow-hidden bg-[#0b0a08]/40 border border-[rgba(255,255,255,0.08)] backdrop-blur-md rounded-2xl shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-[#0b0a08] text-left text-[9px] font-mono-dashboard font-black uppercase tracking-wider text-[#f5efe2]/40 border-b border-[rgba(255,255,255,0.08)]">
                <tr>
                  <th className="px-6 py-4">Order #</th>
                  <th className="px-6 py-4">Table</th>
                  <th className="px-6 py-4">Items</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Time</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-[#f5efe2]/40 font-serif italic text-sm">
                      Loading history...
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-[#f5efe2]/40 font-serif italic text-sm">
                      No orders in this period
                    </td>
                  </tr>
                ) : (
                  orders.map((order, idx) => {
                    const isExpanded = expandedId === order.id;
                    const statusClasses = statusBadgeMap[order.status] || "bg-white/5 text-[#f5efe2]/50 border border-white/10";
                    return (
                      <Fragment key={order.id}>
                        <tr
                          className="cursor-pointer border-t border-[rgba(255,255,255,0.08)] transition hover:bg-[rgba(255,255,255,0.01)]"
                          onClick={() => setExpandedId(isExpanded ? null : order.id)}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-[#f5efe2] font-mono-dashboard font-bold">
                              {order.orderNumber}
                              <div className={`transition-transform duration-250 ${isExpanded ? "rotate-180 text-[#f0a040]" : "text-[#f5efe2]/30"}`}>
                                <ChevronDown className="size-4" />
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-[#f5efe2]/75 font-semibold text-sm">{order.table.name}</td>
                          <td className="px-6 py-4 text-xs font-serif italic text-[#f5efe2]/50">
                            {order.items.length} {order.items.length === 1 ? "item" : "items"}
                          </td>
                          <td className="px-6 py-4 text-[#f5efe2] font-mono-dashboard font-black text-sm">
                            {inr.format(order.totalAmount)}
                          </td>
                          <td className="px-6 py-4">
                            <Badge
                              className={`text-[9px] font-mono-dashboard font-black uppercase tracking-wider py-0.5 px-2.5 rounded-full ${statusClasses}`}
                            >
                              {order.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-xs font-mono-dashboard text-[#f5efe2]/40">
                            {format(new Date(order.createdAt), "dd MMM yyyy · hh:mm a").toUpperCase()}
                          </td>
                        </tr>
                        {isExpanded ? (
                          <tr className="border-t border-[rgba(255,255,255,0.08)] bg-[#0b0a08]/30">
                            <td colSpan={6} className="px-6 py-4">
                              <div className="space-y-2">
                                {order.items.map((item) => (
                                  <div key={item.id} className="flex items-center justify-between p-3 bg-[#0b0a08]/60 border border-[rgba(255,255,255,0.08)] rounded-xl">
                                    <div className="flex items-center gap-3">
                                      <span className="font-mono-dashboard font-bold text-[#f0a040] text-xs bg-[#f0a040]/10 px-2 py-0.5 rounded-md">{item.quantity}X</span>
                                      <span className="text-[#f5efe2] text-sm font-semibold">{item.menuItem.name}</span>
                                    </div>
                                    <span className="text-[#f5efe2]/80 font-mono-dashboard font-bold text-xs">
                                      {inr.format(item.price * item.quantity)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-[rgba(255,255,255,0.08)] pt-4">
        <p className="text-[10px] font-mono-dashboard text-[#f5efe2]/40 uppercase tracking-widest">
          {total} TOTAL ORDERS · PAGE {page} OF {pages}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-xl bg-transparent border border-[rgba(255,255,255,0.08)] text-[#f5efe2]/60 hover:text-white hover:bg-[rgba(255,255,255,0.02)] transition-colors text-[10px] font-mono-dashboard font-bold uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
          >
            Previous
          </button>
          <button
            onClick={() => setPage((prev) => Math.min(pages, prev + 1))}
            disabled={page === pages}
            className="px-4 py-2 rounded-xl bg-transparent border border-[rgba(255,255,255,0.08)] text-[#f5efe2]/60 hover:text-white hover:bg-[rgba(255,255,255,0.02)] transition-colors text-[10px] font-mono-dashboard font-bold uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
