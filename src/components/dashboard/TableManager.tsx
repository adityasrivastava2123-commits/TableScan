"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Download, QrCode, Users, MapPin, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";
import QRCode from "qrcode";

interface Table {
  id: string;
  name: string;
  qrToken: string;
  capacity?: number;
  isActive: boolean;
}

export default function TableManager({
  locationId,
  restaurantSlug,
}: {
  locationId: string;
  restaurantSlug: string;
}) {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newTable, setNewTable] = useState({ name: "", capacity: "" });
  const [qrUrls, setQrUrls] = useState<Record<string, string>>({});

  const fetchTables = useCallback(async () => {
    try {
      const res = await axios.get(`/api/tables?locationId=${locationId}`);
      setTables(res.data);
      generateQRCodes(res.data);
    } catch {
      toast.error("Failed to load tables");
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  async function generateQRCodes(tables: Table[]) {
    const urls: Record<string, string> = {};
    for (const table of tables) {
      const url = `${window.location.origin}/${restaurantSlug}/${table.qrToken}`;
      urls[table.id] = await QRCode.toDataURL(url, { width: 300, margin: 2 });
    }
    setQrUrls(urls);
  }

  async function addTable() {
    if (!newTable.name.trim()) return;
    try {
      const res = await axios.post("/api/tables", {
        name: newTable.name,
        capacity: newTable.capacity ? parseInt(newTable.capacity) : undefined,
        locationId,
      });
      const updated = [...tables, res.data];
      setTables(updated);
      generateQRCodes(updated);
      setNewTable({ name: "", capacity: "" });
      setAdding(false);
      toast.success("Table added!");
    } catch {
      toast.error("Failed to add table");
    }
  }

  async function deleteTable(id: string) {
    if (!confirm("Delete this table?")) return;
    try {
      await axios.delete(`/api/tables/${id}`);
      const updated = tables.filter((t) => t.id !== id);
      setTables(updated);
      toast.success("Table deleted");
    } catch {
      toast.error("Failed to delete table");
    }
  }

  function downloadQR(table: Table) {
    const url = qrUrls[table.id];
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = `QR-${table.name}.png`;
    link.click();
  }

  if (loading)
    return (
      <div className="flex justify-center p-12 text-[#999999]">
        Loading tables...
      </div>
    );

  return (
    <div className="p-7 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3.5 flex-wrap">
        <div className="w-[46px] h-[46px] rounded-xl bg-[#f97316] flex items-center justify-center flex-shrink-0">
          <MapPin className="size-5 text-white" />
        </div>
        <div>
          <h1 className="text-[20px] font-bold text-[#f0ece4]">Tables & QR codes</h1>
          <p className="text-[12px] text-[#9a9488]">Each table has a unique QR. Customers scan to order.</p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="ml-auto px-4 py-2.5 rounded-lg bg-[#f97316] text-white text-[12px] font-semibold hover:bg-[#ea6c0a] transition-all"
        >
          + Add table
        </button>
      </div>

      {/* Add Table Form */}
      {adding && (
        <div className="bg-[#111111] border border-[rgba(255,255,255,0.07)] rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-[#f0ece4] text-[12px] font-medium">Table Name *</Label>
              <Input
                value={newTable.name}
                onChange={(e) =>
                  setNewTable({ ...newTable, name: e.target.value })
                }
                placeholder="e.g. Table 1, Window Seat..."
                onKeyDown={(e) => e.key === "Enter" && addTable()}
                className="h-10 bg-[#222222] border-[rgba(255,255,255,0.12)] text-[#f0ece4] placeholder-[#5a5650] focus:border-[#f97316] text-[13px]"
              />
            </div>
            <div>
              <Label className="text-[#f0ece4] text-[12px] font-medium">Capacity (optional)</Label>
              <Input
                type="number"
                value={newTable.capacity}
                onChange={(e) =>
                  setNewTable({ ...newTable, capacity: e.target.value })
                }
                placeholder="e.g. 4"
                className="h-10 bg-[#222222] border-[rgba(255,255,255,0.12)] text-[#f0ece4] placeholder-[#5a5650] focus:border-[#f97316] text-[13px]"
              />
            </div>
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={addTable}
              className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-[#f97316] text-white text-[12px] font-semibold hover:bg-[#ea6c0a] transition-colors"
            >
              Add table
            </button>
            <button
              onClick={() => {
                setAdding(false);
                setNewTable({ name: "", capacity: "" });
              }}
              className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-[#222222] border border-[rgba(255,255,255,0.12)] text-[#f0ece4] hover:bg-[#181818] transition-colors text-[12px]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {tables.length === 0 && !adding && (
        <div className="text-center py-24">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#222222] mx-auto mb-4">
            <Sparkles className="size-6 text-[#5a5650]" />
          </div>
          <p className="text-[20px] font-semibold text-[#5a5650]">No tables yet</p>
          <p className="text-[13px] text-[#9a9488]">Add a table to generate its QR code</p>
        </div>
      )}

      {/* Tables Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {tables.map((table) => (
          <div key={table.id} className="bg-[#111111] border border-[rgba(255,255,255,0.07)] rounded-xl overflow-hidden">
            <div className="p-3.5 flex items-center gap-2 border-b border-[rgba(255,255,255,0.07)]">
              <div className="w-[30px] h-[30px] rounded-lg bg-[rgba(34,197,94,0.1)] flex items-center justify-center flex-shrink-0">
                <QrCode className="size-3.5 text-[#4ade80]" />
              </div>
              <div className="font-bold text-[14px] text-[#f0ece4]">{table.name}</div>
              {table.capacity && (
                <div className="ml-auto flex items-center gap-1 text-[11px] text-[#9a9488]">
                  <Users size={10} /> {table.capacity} seats
                </div>
              )}
              <button
                onClick={() => deleteTable(table.id)}
                className="ml-2 w-[28px] h-[28px] rounded-lg bg-[rgba(239,68,68,0.12)] border-none text-[#f87171] hover:bg-[rgba(239,68,68,0.2)] transition-colors flex items-center justify-center"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div className="p-3.5">
              {qrUrls[table.id] ? (
                <div className="w-full aspect-square bg-white rounded-lg flex items-center justify-center mb-2.5 overflow-hidden">
                  <img
                    src={qrUrls[table.id]}
                    alt={`QR for ${table.name}`}
                    className="w-full h-full"
                  />
                </div>
              ) : (
                <div className="w-full aspect-square bg-[#222222] rounded-lg animate-pulse mb-2.5" />
              )}
              <p className="text-[10px] text-[#5a5650] text-center truncate font-mono mb-2.5">
                {`/${restaurantSlug}/${table.qrToken}`}
              </p>
              <button
                onClick={() => downloadQR(table)}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#222222] border border-[rgba(255,255,255,0.12)] text-[#9a9488] hover:border-[#f97316] hover:text-[#f97316] transition-all text-[12px]"
              >
                ↓ Download QR
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}