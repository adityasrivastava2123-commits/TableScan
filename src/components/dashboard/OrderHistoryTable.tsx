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
  NEW: { bg: "bg-blue-500/10", text: "text-blue-500", border: "border-blue-500/20" },
  PREPARING: { bg: "bg-[#f97316]/10", text: "text-[#f97316]", border: "border-[#f97316]/20" },
  READY: { bg: "bg-[#22c55e]/10", text: "text-[#22c55e]", border: "border-[#22c55e]/20" },
  DONE: { bg: "bg-[#999999]/10", text: "text-[#999999]", border: "border-[#999999]/20" },
  CANCELLED: { bg: "bg-[#ef4444]/10", text: "text-[#ef4444]", border: "border-[#ef4444]/20" },
};

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#f97316] to-[#ea6c0a]">
            <FileText className="size-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Order History</h1>
            <p className="text-sm text-[#999999]">View and filter past orders</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div>
        <Card className="bg-[#141414] border-[#252525]">
          <div className="p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-2">
                  <Label className="text-white text-sm font-medium flex items-center gap-2">
                    <Filter className="size-4" /> Status
                  </Label>
                  <Select
                    value={status}
                    onValueChange={(value) => {
                      setStatus(value);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[170px] bg-[#1a1a1a] border-[#252525] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#141414] border-[#252525]">
                      <SelectItem value="ALL" className="text-white">All</SelectItem>
                      <SelectItem value="NEW" className="text-white">NEW</SelectItem>
                      <SelectItem value="PREPARING" className="text-white">PREPARING</SelectItem>
                      <SelectItem value="READY" className="text-white">READY</SelectItem>
                      <SelectItem value="DONE" className="text-white">DONE</SelectItem>
                      <SelectItem value="CANCELLED" className="text-white">CANCELLED</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-white text-sm font-medium flex items-center gap-2">
                    <Calendar className="size-4" /> From
                  </Label>
                  <Input
                    type="date"
                    value={from}
                    onChange={(e) => {
                      setFrom(e.target.value);
                      setPage(1);
                    }}
                    className="bg-[#1a1a1a] border-[#252525] text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white text-sm font-medium flex items-center gap-2">
                    <Calendar className="size-4" /> To
                  </Label>
                  <Input
                    type="date"
                    value={to}
                    onChange={(e) => {
                      setTo(e.target.value);
                      setPage(1);
                    }}
                    className="bg-[#1a1a1a] border-[#252525] text-white"
                  />
                </div>
              </div>

              <button
                onClick={() => void exportCsv()}
                disabled={exporting}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#f97316] text-white font-medium hover:bg-[#ea6c0a] shadow-lg shadow-[#f97316]/20 transition-all disabled:opacity-50"
              >
                <Download className="size-5" />
                {exporting ? "Exporting..." : "Export CSV"}
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* Table */}
      <div>
        <Card className="overflow-hidden bg-[#141414] border-[#252525]">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-[#1e1e1e] text-left text-xs uppercase tracking-wide text-[#999999]">
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
                    <td colSpan={6} className="px-6 py-12 text-center text-[#999999]">
                      Loading history...
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-[#555555]">
                      No orders in this period
                    </td>
                  </tr>
                ) : (
                  orders.map((order, idx) => {
                    const isExpanded = expandedId === order.id;
                    return (
                      <Fragment key={order.id}>
                        <tr
                          className="cursor-pointer border-t border-[#252525] transition hover:bg-[#1e1e1e]"
                          onClick={() => setExpandedId(isExpanded ? null : order.id)}
                        >
                          <td className="px-6 py-4 font-medium">
                            <div className="flex items-center gap-2 text-white">
                              {order.orderNumber}
                              <div className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}>
                                <ChevronDown className="size-4 text-[#999999]" />
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-[#999999]">{order.table.name}</td>
                          <td className="px-6 py-4 text-sm text-[#999999]">
                            {order.items.length} items
                          </td>
                          <td className="px-6 py-4 text-white font-semibold tabular-nums">
                            {inr.format(order.totalAmount)}
                          </td>
                          <td className="px-6 py-4">
                            <Badge
                              className={`${statusBadgeMap[order.status].bg} ${statusBadgeMap[order.status].text} ${statusBadgeMap[order.status].border} border-0`}
                            >
                              {order.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-sm text-[#999999]">
                            {format(new Date(order.createdAt), "dd MMM yyyy, hh:mm a")}
                          </td>
                        </tr>
                        {isExpanded ? (
                          <tr className="border-t border-[#252525] bg-[#1e1e1e]">
                            <td colSpan={6} className="px-6 py-4">
                              <div className="space-y-2">
                                {order.items.map((item) => (
                                  <div key={item.id} className="flex items-center justify-between p-3 bg-[#141414] rounded-lg">
                                    <div className="flex items-center gap-3">
                                      <span className="font-bold text-white">{item.quantity}x</span>
                                      <span className="text-[#999999]">{item.menuItem.name}</span>
                                    </div>
                                    <span className="text-white font-semibold tabular-nums">
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
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#999999]">
          {total} total orders • Page {page} of {pages}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-lg bg-[#141414] border border-[#252525] text-white hover:bg-[#1e1e1e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={() => setPage((prev) => Math.min(pages, prev + 1))}
            disabled={page === pages}
            className="px-4 py-2 rounded-lg bg-[#141414] border border-[#252525] text-white hover:bg-[#1e1e1e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

