"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Download, QrCode } from "lucide-react";
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

  useEffect(() => {
    fetchTables();
  }, [locationId, fetchTables]);

  async function fetchTables() {
    try {
      const res = await axios.get(`/api/tables?locationId=${locationId}`);
      setTables(res.data);
      generateQRCodes(res.data);
    } catch {
      toast.error("Failed to load tables");
    } finally {
      setLoading(false);
    }
  }

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
      <div className="flex justify-center p-12 text-gray-500">
        Loading tables...
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Table Manager</h1>
          <p className="text-gray-500 text-sm mt-1">
            Each table gets a unique QR code
          </p>
        </div>
        <Button onClick={() => setAdding(true)} className="gap-2 w-full sm:w-auto">
          <Plus size={16} /> Add Table
        </Button>
      </div>

      {adding && (
        <Card className="border-dashed border-2 border-blue-300">
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Table Name *</Label>
                <Input
                  value={newTable.name}
                  onChange={(e) =>
                    setNewTable({ ...newTable, name: e.target.value })
                  }
                  placeholder="e.g. Table 1, Window Seat..."
                  onKeyDown={(e) => e.key === "Enter" && addTable()}
                  className="h-11"
                />
              </div>
              <div>
                <Label>Capacity (optional)</Label>
                <Input
                  type="number"
                  value={newTable.capacity}
                  onChange={(e) =>
                    setNewTable({ ...newTable, capacity: e.target.value })
                  }
                  placeholder="e.g. 4"
                  className="h-11"
                />
              </div>
            </div>
            <div className="flex gap-2 sm:flex-row">
              <Button onClick={addTable} className="flex-1 sm:flex-none">
                Save
              </Button>
              <Button
                variant="outline"
                className="flex-1 sm:flex-none"
                onClick={() => {
                  setAdding(false);
                  setNewTable({ name: "", capacity: "" });
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {tables.length === 0 && !adding && (
        <div className="text-center py-16 text-gray-400">
          <QrCode size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg">No tables yet</p>
          <p className="text-sm">Add a table to generate its QR code</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tables.map((table) => (
          <Card key={table.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{table.name}</CardTitle>
                <div className="flex items-center gap-2">
                  {table.capacity && (
                    <Badge variant="secondary">{table.capacity} seats</Badge>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteTable(table.id)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {qrUrls[table.id] ? (
                <div className="flex justify-center">
                  <img
                    src={qrUrls[table.id]}
                    alt={`QR for ${table.name}`}
                    className="w-40 h-40"
                  />
                </div>
              ) : (
                <div className="w-40 h-40 mx-auto bg-gray-100 rounded animate-pulse" />
              )}
              <p className="text-xs text-gray-400 text-center truncate">
                {`/${restaurantSlug}/${table.qrToken}`}
              </p>
              <Button
                className="w-full gap-2"
                variant="outline"
                size="sm"
                onClick={() => downloadQR(table)}
              >
                <Download size={14} /> Download QR
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}