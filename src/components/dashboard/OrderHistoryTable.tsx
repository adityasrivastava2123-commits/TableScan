"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { format } from "date-fns";
import { Download, ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const statusBadgeMap: Record<OrderStatus, string> = {
  NEW: "bg-blue-500/15 text-blue-700 border-blue-300",
  PREPARING: "bg-orange-500/15 text-orange-700 border-orange-300",
  READY: "bg-green-500/15 text-green-700 border-green-300",
  DONE: "bg-slate-500/15 text-slate-700 border-slate-300",
  CANCELLED: "bg-red-500/15 text-red-700 border-red-300",
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Status</p>
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="NEW">NEW</SelectItem>
                <SelectItem value="PREPARING">PREPARING</SelectItem>
                <SelectItem value="READY">READY</SelectItem>
                <SelectItem value="DONE">DONE</SelectItem>
                <SelectItem value="CANCELLED">CANCELLED</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">From</p>
            <Input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">To</p>
            <Input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        <Button onClick={() => void exportCsv()} disabled={exporting}>
          <Download className="mr-1 h-4 w-4" />
          {exporting ? "Exporting..." : "Export CSV"}
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Order #</th>
                <th className="px-4 py-3">Table</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Time</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Loading history...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No orders in this period
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const isExpanded = expandedId === order.id;
                  return (
                    <Fragment key={order.id}>
                      <tr
                        className="cursor-pointer border-t transition hover:bg-muted/20"
                        onClick={() => setExpandedId(isExpanded ? null : order.id)}
                      >
                        <td className="px-4 py-3 font-medium">
                          <div className="flex items-center gap-2">
                            {order.orderNumber}
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">{order.table.name}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {order.items.length} items
                        </td>
                        <td className="px-4 py-3">{inr.format(order.totalAmount)}</td>
                        <td className="px-4 py-3">
                          <Badge className={statusBadgeMap[order.status]} variant="outline">
                            {order.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {format(new Date(order.createdAt), "dd MMM yyyy, hh:mm a")}
                        </td>
                      </tr>
                      {isExpanded ? (
                        <tr className="border-t bg-muted/10">
                          <td colSpan={6} className="px-4 py-3">
                            <div className="space-y-1">
                              {order.items.map((item) => (
                                <p key={item.id} className="text-sm">
                                  <span className="font-medium">{item.quantity}x</span>{" "}
                                  {item.menuItem.name} — {inr.format(item.price * item.quantity)}
                                </p>
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

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {total} total orders • Page {page} of {pages}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            onClick={() => setPage((prev) => Math.min(pages, prev + 1))}
            disabled={page === pages}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

