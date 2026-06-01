"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useTheme } from "next-themes";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Plus, Trash2, Download, QrCode, Users, MapPin, 
  Sparkles, X, Printer, Check, Info, LayoutGrid, Eye,
  Compass, Undo2, RotateCw, Settings2, ShieldCheck, HelpCircle
} from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";
import QRCode from "qrcode";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";

interface Table {
  id: string;
  name: string;
  qrToken: string;
  capacity?: number;
  isActive: boolean;
}

type FlyerTemplate = "sunset" | "obsidian" | "ivory";

interface TablePosition {
  x: number;
  y: number;
  status: "FREE" | "RESERVED" | "OCCUPIED" | "DIRTY";
}

interface DecorationItem {
  id: string;
  type: "wall" | "bar" | "door" | "plant";
  x: number;
  y: number;
}

export default function TableManager({
  locationId,
  restaurantSlug,
}: {
  locationId: string;
  restaurantSlug: string;
}) {
  const { theme } = useTheme();
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [minLoading, setMinLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newTable, setNewTable] = useState({ name: "", capacity: "4" });
  const [qrUrls, setQrUrls] = useState<Record<string, string>>({});

  // View state: "grid" (list/QR) vs "floor" (interactive designer)
  const [viewMode, setViewMode] = useState<"grid" | "floor">("floor");
  
  // Floor Plan Positions & Decorations Persisted state
  const [positions, setPositions] = useState<Record<string, TablePosition>>({});
  const [decorations, setDecorations] = useState<DecorationItem[]>([]);
  const [selectedPlanItem, setSelectedPlanItem] = useState<{ id: string; type: "table" | "decor" } | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

  // Print Customizer Modal State
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<FlyerTemplate>("sunset");
  const [customInstructions, setCustomInstructions] = useState("Scan the QR code to view our digital menu, customize items, and complete payment directly from your smartphone.");

  const fetchTables = useCallback(async () => {
    try {
      const res = await axios.get(`/api/tables?locationId=${locationId}`);
      setTables(res.data);
      generateQRCodes(res.data);
      
      // Load positions & decorations from LocalStorage
      const savedPos = localStorage.getItem(`tablescan:floorplan:pos:${locationId}`);
      const savedDecor = localStorage.getItem(`tablescan:floorplan:decor:${locationId}`);
      
      if (savedPos) {
        setPositions(JSON.parse(savedPos));
      } else {
        // Initialize default positioning layout
        const initialPositions: Record<string, TablePosition> = {};
        res.data.forEach((table: Table, idx: number) => {
          // Default unplaced state or grid alignment
        });
        setPositions(initialPositions);
      }

      if (savedDecor) {
        setDecorations(JSON.parse(savedDecor));
      }
    } catch {
      toast.error("Failed to load tables");
    }
  }, [locationId]);

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        await fetchTables();
      } finally {
        if (mounted) {
          setLoading(false);
          setMinLoading(false);
        }
      }
    };

    loadData();
    return () => {
      mounted = false;
    };
  }, [fetchTables]);

  async function generateQRCodes(tables: Table[]) {
    const urls: Record<string, string> = {};
    await Promise.all(
      tables.map(async (table) => {
        const url = `${window.location.origin}/${restaurantSlug}/${table.qrToken}`;
        urls[table.id] = await QRCode.toDataURL(url, { 
          width: 400, 
          margin: 1,
          color: {
            dark: "#000000",
            light: "#FFFFFF"
          }
        });
      })
    );
    setQrUrls(urls);
  }

  async function addTable() {
    if (!newTable.name.trim()) return;
    const capNum = newTable.capacity ? parseInt(newTable.capacity) : 4;
    if (capNum <= 0) {
      toast.error("Capacity must be greater than 0");
      return;
    }
    try {
      const res = await axios.post("/api/tables", {
        name: newTable.name,
        capacity: capNum,
        locationId,
      });
      const updated = [...tables, res.data];
      setTables(updated);
      generateQRCodes(updated);
      setNewTable({ name: "", capacity: "4" });
      setAdding(false);
      toast.success("Table successfully registered!");
    } catch {
      toast.error("Failed to add table");
    }
  }

  async function deleteTable(id: string) {
    if (!confirm("Are you sure you want to delete this table? The QR code will be permanently deactivated.")) return;
    try {
      await axios.delete(`/api/tables/${id}`);
      const updated = tables.filter((t) => t.id !== id);
      setTables(updated);
      
      // Clean position entry
      setPositions(prev => {
        const next = { ...prev };
        delete next[id];
        localStorage.setItem(`tablescan:floorplan:pos:${locationId}`, JSON.stringify(next));
        return next;
      });

      toast.success("Table deactivated and removed");
    } catch {
      toast.error("Failed to delete table");
    }
  }

  function downloadQR(table: Table) {
    const url = qrUrls[table.id];
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = `QR-${table.name.replace(/\s+/g, "-")}.png`;
    link.click();
    toast.success("QR code downloaded!");
  }

  // ── Drag & Drop Coordinates Processor ───────────────────────────────
  const handleDragEnd = (id: string, isDecoration: boolean, info: any) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    
    // Calculate point offset
    const x = info.point.x - rect.left;
    const y = info.point.y - rect.top;

    // Boundary constraints
    const boundedX = Math.max(10, Math.min(x - 50, rect.width - 110));
    const boundedY = Math.max(10, Math.min(y - 50, rect.height - 110));

    if (isDecoration) {
      setDecorations(prev => {
        const next = prev.map(d => d.id === id ? { ...d, x: boundedX, y: boundedY } : d);
        localStorage.setItem(`tablescan:floorplan:decor:${locationId}`, JSON.stringify(next));
        return next;
      });
    } else {
      setPositions(prev => {
        const current = prev[id] || { status: "FREE" as const, x: 120, y: 120 };
        const next: Record<string, TablePosition> = {
          ...prev,
          [id]: {
            x: boundedX,
            y: boundedY,
            status: current.status
          }
        };
        localStorage.setItem(`tablescan:floorplan:pos:${locationId}`, JSON.stringify(next));
        return next;
      });
    }
  };

  // Place unplaced table onto canvas
  const placeOnFloor = (id: string) => {
    setPositions(prev => {
      const next: Record<string, TablePosition> = {
        ...prev,
        [id]: {
          x: 120,
          y: 120,
          status: "FREE"
        }
      };
      localStorage.setItem(`tablescan:floorplan:pos:${locationId}`, JSON.stringify(next));
      return next;
    });
    setSelectedPlanItem({ id, type: "table" });
    toast.success("Placed table on the floor plan! Drag to position it.");
  };

  // Remove table position (send back to shelf)
  const removeFromFloor = (id: string) => {
    setPositions(prev => {
      const next = { ...prev };
      delete next[id];
      localStorage.setItem(`tablescan:floorplan:pos:${locationId}`, JSON.stringify(next));
      return next;
    });
    if (selectedPlanItem?.id === id) setSelectedPlanItem(null);
    toast.success("Removed from floor plan. Sent back to shelf.");
  };

  // Status updates on visual layout
  const toggleTableStatus = (id: string, status: "FREE" | "RESERVED" | "OCCUPIED" | "DIRTY") => {
    setPositions(prev => {
      const current = prev[id] || { x: 100, y: 100, status: "FREE" as const };
      const next: Record<string, TablePosition> = {
        ...prev,
        [id]: {
          x: current.x,
          y: current.y,
          status
        }
      };
      localStorage.setItem(`tablescan:floorplan:pos:${locationId}`, JSON.stringify(next));
      return next;
    });
  };

  // ── Decorative Element Placements ────────────────────────────────────
  const addDecoration = (type: "wall" | "bar" | "door" | "plant") => {
    const newDecor: DecorationItem = {
      id: `decor_${Date.now()}`,
      type,
      x: 150,
      y: 150
    };
    const next = [...decorations, newDecor];
    setDecorations(next);
    localStorage.setItem(`tablescan:floorplan:decor:${locationId}`, JSON.stringify(next));
    setSelectedPlanItem({ id: newDecor.id, type: "decor" });
    toast.success(`Added visual ${type} block to canvas!`);
  };

  const deleteDecoration = (id: string) => {
    const next = decorations.filter(d => d.id !== id);
    setDecorations(next);
    localStorage.setItem(`tablescan:floorplan:decor:${locationId}`, JSON.stringify(next));
    if (selectedPlanItem?.id === id) setSelectedPlanItem(null);
    toast.success("Removed layout element");
  };

  const resetAllFloor = () => {
    if (!confirm("Are you sure you want to clear the visual floor plan? All tables will be sent back to the shelf.")) return;
    setPositions({});
    setDecorations([]);
    localStorage.removeItem(`tablescan:floorplan:pos:${locationId}`);
    localStorage.removeItem(`tablescan:floorplan:decor:${locationId}`);
    setSelectedPlanItem(null);
    toast.success("Floor layout reset successfully!");
  };

  // ── Global Stats ────────────────────────────────────────────────────────
  const totalTables = tables.length;
  const totalCapacity = useMemo(() => tables.reduce((sum, t) => sum + (t.capacity || 0), 0), [tables]);
  const averageSeats = totalTables > 0 ? Math.round(totalCapacity / totalTables) : 0;

  // Split Tables placed vs unplaced
  const placedTables = tables.filter(t => positions[t.id] !== undefined);
  const unplacedTables = tables.filter(t => positions[t.id] === undefined);

  // ── Flyer Customizer Trigger ───────────────────────────────────────────
  function openCustomizer(table: Table) {
    setSelectedTable(table);
    setCustomizerOpen(true);
  }

  function handlePrintFlyer() {
    window.print();
  }

  // ── Loading Skeleton ───────────────────────────────────────────────────
  if (minLoading) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3.5 flex-wrap justify-between border-b border-neutral-200 dark:border-[rgba(255,255,255,0.06)] pb-5">
          <div className="flex items-center gap-3.5">
            <Skeleton className="w-[50px] h-[50px] rounded-2xl bg-neutral-100 dark:bg-[#141414]" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-44 bg-neutral-100 dark:bg-[#141414]" />
              <Skeleton className="h-4 w-64 bg-neutral-100 dark:bg-[#141414]" />
            </div>
          </div>
          <Skeleton className="h-10 w-32 rounded-xl bg-neutral-100 dark:bg-[#141414]" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl bg-neutral-100 dark:bg-[#141414] border border-neutral-200 dark:border-[rgba(255,255,255,0.06)]" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-96 rounded-2xl bg-neutral-100 dark:bg-[#141414]" />
          <Skeleton className="h-96 rounded-2xl bg-neutral-100 dark:bg-[#141414]" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto relative text-neutral-800 dark:text-[#f0ece4] min-h-screen">
      
      {/* Dynamic Hidden Stylesheet for Native Print Media Formatting */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #print-area-wrapper, #print-area-wrapper * {
            visibility: visible !important;
          }
          #print-area-wrapper {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            background: white !important;
            color: black !important;
            z-index: 9999999 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* ── Page Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 dark:border-[rgba(255,255,255,0.06)] pb-5 no-print">
        <div className="flex items-center gap-3.5">
          <div className="w-[50px] h-[50px] rounded-2xl bg-gradient-to-tr from-[#f97316] to-[#fb923c] flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#f97316]/15 border border-[#f97316]/20">
            <Compass className="size-5 text-white animate-spin-slow" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-600 dark:from-white dark:via-[#f0ece4] dark:to-[#a8a29e] bg-clip-text text-transparent">
              Tables & Floor Layout
            </h1>
            <p className="text-[12px] text-neutral-500 dark:text-[#9a9488] mt-0.5">
              Visual floor plan architect, capacity tracker, and digital flyer generator
            </p>
          </div>
        </div>

        {/* Header Action Mode Toggles */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex bg-neutral-100 dark:bg-[#161616] p-1 rounded-xl border border-neutral-200 dark:border-[rgba(255,255,255,0.05)]">
            <button
              onClick={() => setViewMode("floor")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                viewMode === "floor" 
                  ? "bg-[#f97316] text-white shadow-md" 
                  : "text-neutral-500 hover:text-neutral-800 dark:text-[#9a9488] dark:hover:text-white"
              }`}
            >
              <Compass className="size-3.5" /> Floor Plan
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                viewMode === "grid" 
                  ? "bg-[#f97316] text-white shadow-md" 
                  : "text-neutral-500 hover:text-neutral-800 dark:text-[#9a9488] dark:hover:text-white"
              }`}
            >
              <LayoutGrid className="size-3.5" /> List & QR Codes
            </button>
          </div>

          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#f97316] to-[#fb923c] text-white text-[12px] font-bold hover:brightness-110 shadow-lg shadow-[#f97316]/10 transition-all"
          >
            <Plus className="size-4" /> Add Table
          </button>
        </div>
      </div>

      {/* ── Seating Capacity KPI stats panel ────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 no-print">
        {[
          { title: "Capacity status", val: `${placedTables.length} / ${totalTables} Placed`, icon: Compass, color: "text-[#f97316]" },
          { title: "Total Seating", val: `${totalCapacity} Guests`, icon: Users, color: "text-emerald-500 dark:text-emerald-400" },
          { title: "Average Table Size", val: `${averageSeats} Seats`, icon: Sparkles, color: "text-blue-500 dark:text-blue-400" },
          { title: "Occupied Tables", val: Object.values(positions).filter(p => p.status === "OCCUPIED").length, icon: ShieldCheck, color: "text-rose-500 dark:text-rose-400" }
        ].map((item, idx) => (
          <div key={idx} className="bg-white dark:bg-[#111] border border-neutral-200 dark:border-[rgba(255,255,255,0.04)] rounded-2xl p-4 flex items-center gap-3.5 shadow-sm dark:shadow-md">
            <div className="w-9 h-9 rounded-xl bg-neutral-50 dark:bg-[rgba(255,255,255,0.03)] flex items-center justify-center">
              <item.icon className={`size-4.5 ${item.color}`} />
            </div>
            <div>
              <p className="text-[9px] text-neutral-400 dark:text-[#6f695f] uppercase tracking-wider font-extrabold">{item.title}</p>
              <p className="text-[15px] font-extrabold text-neutral-900 dark:text-white mt-0.5 leading-none">{item.val}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Add Table Glass Form ────────────────────────────────────────── */}
      <AnimatePresence>
        {adding && (
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-white dark:bg-[#111] border border-[#f97316]/30 rounded-2xl p-5 shadow-xl dark:shadow-2xl no-print space-y-4"
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1 h-5 bg-[#f97316] rounded-full" />
              <p className="text-[13px] font-bold text-neutral-900 dark:text-white uppercase tracking-wider">Register Table</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-neutral-500 dark:text-[#9a9488] text-[10px] font-bold uppercase tracking-wider block">Table Label *</Label>
                <Input
                  autoFocus
                  value={newTable.name}
                  onChange={(e) => setNewTable({ ...newTable, name: e.target.value })}
                  placeholder="e.g. Table 04, Balcony Seat, Lounge 1"
                  onKeyDown={(e) => e.key === "Enter" && addTable()}
                  className="h-10 bg-neutral-50 dark:bg-[#161616] border border-neutral-200 dark:border-[rgba(255,255,255,0.08)] text-neutral-900 dark:text-[#f0ece4] placeholder-neutral-400 dark:placeholder-[#444] focus:border-[#f97316] text-[13px] rounded-xl outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-neutral-500 dark:text-[#9a9488] text-[10px] font-bold uppercase tracking-wider block">Seating Capacity</Label>
                
                {/* Custom Capacity Segmented Quick Toggles */}
                <div className="grid grid-cols-5 gap-1.5 bg-neutral-50 dark:bg-[#141414] p-1 rounded-xl border border-neutral-200 dark:border-[rgba(255,255,255,0.06)]">
                  {["2", "4", "6", "8"].map((cap) => (
                    <button
                      key={cap}
                      type="button"
                      onClick={() => setNewTable({ ...newTable, capacity: cap })}
                      className={`py-1.5 rounded-lg text-[12px] font-mono font-bold transition-all ${
                        newTable.capacity === cap
                          ? "bg-[#f97316] text-white"
                          : "text-neutral-400 dark:text-[#5a5650] hover:text-neutral-700 dark:hover:text-[#9a9488]"
                      }`}
                    >
                      {cap}
                    </button>
                  ))}
                  
                  <input
                    type="number"
                    value={!["2", "4", "6", "8"].includes(newTable.capacity) ? newTable.capacity : ""}
                    placeholder="+"
                    onChange={(e) => setNewTable({ ...newTable, capacity: e.target.value })}
                    className="w-full text-center bg-transparent border-0 text-[12px] font-mono font-bold text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-[#5a5650] focus:outline-none focus:ring-0"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2.5 pt-1.5">
              <button
                onClick={addTable}
                className="px-5 py-2.5 rounded-xl bg-[#f97316] text-white text-[12px] font-bold hover:bg-[#ea6c0a] transition-all shadow-md shadow-[#f97316]/10"
              >
                Add Table
              </button>
              <button
                onClick={() => {
                  setAdding(false);
                  setNewTable({ name: "", capacity: "4" });
                }}
                className="px-5 py-2.5 rounded-xl bg-neutral-50 dark:bg-[#161616] border border-neutral-200 dark:border-[rgba(255,255,255,0.08)] text-neutral-500 dark:text-[#9a9488] hover:text-neutral-800 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-[#222] transition-colors text-[12px] font-bold"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Empty State ───────────────────────────────────────────────── */}
      {tables.length === 0 && !adding && (
        <div className="text-center py-24 bg-white dark:bg-[#111] border border-neutral-200 dark:border-[rgba(255,255,255,0.06)] rounded-2xl shadow-md dark:shadow-xl no-print">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-50 dark:bg-[#161616] border border-neutral-200 dark:border-[rgba(255,255,255,0.06)] mx-auto mb-4">
            <QrCode className="size-6 text-neutral-400 dark:text-[#5a5650]" />
          </div>
          <p className="text-[16px] font-bold text-neutral-900 dark:text-white">No Active Tables</p>
          <p className="text-[12px] text-neutral-500 dark:text-[#9a9488] mt-1 max-w-xs mx-auto">
            You haven't registered any tables for digital ordering. Add a table to instantly generate a secure QR code deck.
          </p>
          <button
            onClick={() => setAdding(true)}
            className="mt-6 inline-flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-[#f97316] text-white text-[12px] font-bold hover:bg-[#ea6c0a] shadow-md shadow-[#f97316]/10 transition-all"
          >
            <Plus className="size-3.5" /> Create First Table
          </button>
        </div>
      )}

      {/* ── INTERACTIVE DESIGNER MODE WORKSPACE ───────────────────────── */}
      {viewMode === "floor" && tables.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 no-print">
          
          {/* Left panel sidebar: Shelf items & Decorative selectors */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Shelf block 1: Unplaced Tables shelf */}
            <div className="bg-white dark:bg-[#0c0c0c] border border-neutral-200 dark:border-[rgba(255,255,255,0.05)] rounded-2xl p-4.5 space-y-4 shadow-sm">
              <div className="border-b border-neutral-100 dark:border-[rgba(255,255,255,0.04)] pb-3">
                <h3 className="text-xs font-bold text-neutral-800 dark:text-white tracking-wider uppercase flex items-center gap-1.5">
                  <LayoutGrid className="size-3.5 text-[#f97316]" />
                  Unplaced Shelf ({unplacedTables.length})
                </h3>
                <p className="text-[10px] text-neutral-400 dark:text-[#6f695f] mt-0.5">Click to place tables onto the layout floor</p>
              </div>

              {unplacedTables.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-400 dark:text-[#555] bg-neutral-50 dark:bg-[#111] border border-dashed border-neutral-200 dark:border-[rgba(255,255,255,0.04)] rounded-xl">
                  All tables placed on floor
                </div>
              ) : (
                <div className="space-y-2 max-h-[220px] overflow-y-auto scrollbar-thin">
                  {unplacedTables.map(t => (
                    <button
                      key={t.id}
                      onClick={() => placeOnFloor(t.id)}
                      className="w-full p-2.5 bg-neutral-50 dark:bg-[#141414] border border-neutral-200 dark:border-[rgba(255,255,255,0.04)] hover:border-[#f97316]/40 text-left rounded-xl transition-all flex items-center justify-between group"
                    >
                      <div>
                        <div className="text-xs font-bold text-neutral-800 dark:text-white">{t.name}</div>
                        <div className="text-[9px] text-neutral-400 dark:text-[#6f695f]">{t.capacity || 4} seats</div>
                      </div>
                      <Plus className="size-3.5 text-[#f97316] opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Shelf block 2: Visual Elements Placer */}
            <div className="bg-white dark:bg-[#0c0c0c] border border-neutral-200 dark:border-[rgba(255,255,255,0.05)] rounded-2xl p-4.5 space-y-4 shadow-sm">
              <div className="border-b border-neutral-100 dark:border-[rgba(255,255,255,0.04)] pb-3">
                <h3 className="text-xs font-bold text-neutral-800 dark:text-white tracking-wider uppercase flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-[#f97316]" />
                  Decorative Layout Elements
                </h3>
                <p className="text-[10px] text-neutral-400 dark:text-[#6f695f] mt-0.5">Place plants, partitions, doors, or bar counters</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Partition Wall", type: "wall" as const, color: "bg-neutral-100 border-neutral-200 text-neutral-700 dark:bg-[#222] dark:border-[#444] dark:text-[#888]" },
                  { label: "Bar Counter", type: "bar" as const, color: "bg-amber-100 border-amber-200 text-amber-700 dark:bg-amber-900/10 dark:border-amber-900/30 dark:text-amber-500" },
                  { label: "Entry Door", type: "door" as const, color: "bg-blue-100 border-blue-200 text-blue-700 dark:bg-blue-950/20 dark:border-blue-900/30 dark:text-blue-400" },
                  { label: "Visual Plant", type: "plant" as const, color: "bg-emerald-100 border-emerald-200 text-emerald-700 rounded-full dark:bg-emerald-950/25 dark:border-emerald-900/30 dark:text-emerald-400" }
                ].map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => addDecoration(item.type)}
                    className={`p-2 border rounded-xl hover:border-[#f97316]/50 text-center transition-all ${item.color}`}
                  >
                    <span className="text-[10px] font-bold block">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Controls Info Deck */}
            <div className="bg-white dark:bg-[#0c0c0c] border border-neutral-200 dark:border-[rgba(255,255,255,0.05)] p-4 rounded-2xl space-y-2.5 text-[11px] text-neutral-500 dark:text-[#9a9488] shadow-sm">
              <div className="font-bold text-neutral-800 dark:text-white text-xs flex items-center gap-1"><Info className="size-3.5 text-[#f97316]" /> Help Desk & Guidelines</div>
              <ul className="list-disc pl-4 space-y-1.5 text-neutral-400 dark:text-[#6f695f]">
                <li>Drag and drop tables to position them anywhere on the floor grid.</li>
                <li>Single tap on any placed table to show layout controller popover.</li>
                <li>Tables are color-coded indicating live seating states in real-time.</li>
              </ul>
              <button
                onClick={resetAllFloor}
                className="w-full mt-2.5 py-2 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-500 hover:bg-rose-500/20 text-xs font-bold transition-all flex items-center justify-center gap-1"
              >
                <Undo2 className="size-3.5" /> Clear Layout Design
              </button>
            </div>

          </div>

          {/* Right Area: Main Dotted grid Floor Plan Canvas Workspace */}
          <div className="lg:col-span-3 space-y-4">
            
            {/* Canvas wrapper card */}
            <div className="bg-white dark:bg-[#0c0c0c] border border-neutral-200 dark:border-[rgba(255,255,255,0.05)] rounded-3xl p-4 md:p-6 flex flex-col justify-between shadow-sm dark:shadow-md">
              
              {/* Canvas header controls */}
              <div className="flex items-center justify-between border-b border-neutral-100 dark:border-[rgba(255,255,255,0.04)] pb-3 mb-4">
                <span className="text-xs text-neutral-500 dark:text-[#9a9488] font-semibold flex items-center gap-1.5">
                  <Compass className="size-4 text-[#f97316] animate-pulse" />
                  Visual Layout Workspace Grid ({placedTables.length} Tables Active)
                </span>
                <span className="text-[10px] text-neutral-400 dark:text-[#6f695f]">Drag elements freely</span>
              </div>

              {/* Grid Canvas area */}
              <div 
                ref={canvasRef}
                className="relative w-full h-[540px] bg-neutral-50 dark:bg-[#070707] border border-neutral-200 dark:border-[rgba(255,255,255,0.03)] rounded-2xl overflow-hidden shadow-inner select-none"
                style={{
                  backgroundImage: theme === "light" 
                    ? "radial-gradient(rgba(0,0,0,0.06) 1px, transparent 1px)"
                    : "radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)",
                  backgroundSize: "20px 20px"
                }}
              >
                
                {/* Placed Tables */}
                {placedTables.map((table) => {
                  const pos = positions[table.id] || { x: 50, y: 50, status: "FREE" };
                  const isSelected = selectedPlanItem?.id === table.id;
                  
                  // Status Ring color mapping
                  const statusColors = {
                    FREE: theme === "light" 
                      ? "border-emerald-500/50 bg-emerald-500/5 text-emerald-700 shadow-emerald-500/5" 
                      : "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 shadow-emerald-500/5",
                    RESERVED: theme === "light"
                      ? "border-amber-500/50 bg-amber-500/5 text-amber-700 shadow-amber-500/5"
                      : "border-amber-500/40 bg-amber-500/10 text-amber-400 shadow-amber-500/5",
                    OCCUPIED: theme === "light"
                      ? "border-rose-500/50 bg-rose-500/5 text-rose-700 shadow-rose-500/5"
                      : "border-rose-500/40 bg-rose-500/10 text-rose-400 shadow-rose-500/5",
                    DIRTY: theme === "light"
                      ? "border-purple-500/50 bg-purple-500/5 text-purple-700 shadow-purple-500/5"
                      : "border-purple-500/40 bg-purple-500/10 text-purple-400 shadow-purple-500/5"
                  };

                  return (
                    <motion.div
                      key={table.id}
                      drag
                      dragMomentum={false}
                      dragElastic={0}
                      onDragEnd={(e, info) => handleDragEnd(table.id, false, info)}
                      onClick={() => setSelectedPlanItem({ id: table.id, type: "table" })}
                      initial={{ x: pos.x, y: pos.y }}
                      animate={{ x: pos.x, y: pos.y }}
                      className={`absolute w-24 h-24 rounded-2xl border-2 flex flex-col justify-between p-2.5 cursor-grab active:cursor-grabbing transition-shadow hover:shadow-lg ${
                        statusColors[pos.status]
                      } ${
                        isSelected ? "ring-2 ring-[#f97316] ring-offset-2 ring-offset-neutral-50 dark:ring-offset-[#070707]" : ""
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="text-[10px] font-black font-mono tracking-tight bg-black/40 px-1.5 py-0.5 rounded-md text-white/90">
                          {table.capacity || 4}p
                        </span>
                        <span className={`w-2 h-2 rounded-full ${
                          pos.status === "FREE" ? "bg-emerald-500" :
                          pos.status === "RESERVED" ? "bg-amber-500" :
                          pos.status === "OCCUPIED" ? "bg-rose-500" : "bg-purple-500"
                        }`} />
                      </div>

                      <div className="text-center">
                        <div className="text-xs font-black truncate max-w-full text-neutral-950 dark:text-white tracking-tight leading-tight">{table.name}</div>
                        <div className="text-[8px] font-bold tracking-wider opacity-60 uppercase mt-0.5">{pos.status}</div>
                      </div>
                    </motion.div>
                  );
                })}

                {/* Placed Decorative items */}
                {decorations.map((decor) => {
                  const isSelected = selectedPlanItem?.id === decor.id;

                  return (
                    <motion.div
                      key={decor.id}
                      drag
                      dragMomentum={false}
                      dragElastic={0}
                      onDragEnd={(e, info) => handleDragEnd(decor.id, true, info)}
                      onClick={() => setSelectedPlanItem({ id: decor.id, type: "decor" })}
                      initial={{ x: decor.x, y: decor.y }}
                      animate={{ x: decor.x, y: decor.y }}
                      className={`absolute cursor-grab active:cursor-grabbing p-3 flex flex-col items-center justify-center rounded-xl text-center select-none shadow-md ${
                        decor.type === "wall" 
                          ? "w-28 h-6 bg-neutral-200 border border-neutral-300 text-neutral-600 dark:bg-[#222] dark:border-[#444] dark:text-[#888]" :
                        decor.type === "bar" 
                          ? "w-32 h-14 bg-amber-100 border border-amber-200 text-amber-700 dark:bg-amber-900/10 dark:border-amber-900/30 dark:text-amber-500" :
                        decor.type === "door" 
                          ? "w-16 h-10 bg-blue-100 border border-blue-200 text-blue-700 dark:bg-blue-950/20 dark:border-blue-900/30 dark:text-blue-400" :
                          "w-12 h-12 bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-full dark:bg-emerald-950/25 dark:border-emerald-900/30 dark:text-emerald-400"
                      } ${
                        isSelected ? "ring-2 ring-[#f97316] ring-offset-2 ring-offset-neutral-50 dark:ring-offset-[#070707]" : ""
                      }`}
                    >
                      <span className="text-[9px] font-black uppercase tracking-wider leading-none">
                        {decor.type}
                      </span>
                    </motion.div>
                  );
                })}

              </div>

              {/* Canvas layout details controller popover drawer */}
              <AnimatePresence>
                {selectedPlanItem && (
                  <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 15 }}
                    className="bg-white dark:bg-[#111] border border-neutral-200 dark:border-[rgba(255,255,255,0.06)] rounded-2xl p-4.5 mt-4 space-y-4 shadow-lg"
                  >
                    {selectedPlanItem.type === "table" ? (() => {
                       const table = tables.find(t => t.id === selectedPlanItem.id);
                       const pos = positions[selectedPlanItem.id] || { status: "FREE" };
                       if (!table) return null;
                       
                       return (
                         <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                           <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-xl bg-[rgba(249,115,22,0.1)] flex items-center justify-center text-[#f97316]">
                               <QrCode className="size-5" />
                             </div>
                             <div>
                               <div className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                                 {table.name}
                                 <span className="text-[10px] text-neutral-400 dark:text-[#6f695f]">({table.capacity || 4} Capacity)</span>
                               </div>
                               <p className="text-[10px] text-neutral-500 dark:text-[#9a9488]">Change seating states or remove from plan workspace</p>
                             </div>
                           </div>

                           <div className="flex flex-wrap items-center gap-2">
                             {/* Live Status triggers */}
                             <div className="flex rounded-xl bg-neutral-100 dark:bg-[#161616] p-1 border border-neutral-200 dark:border-[rgba(255,255,255,0.04)]">
                               {(["FREE", "RESERVED", "OCCUPIED", "DIRTY"] as const).map(st => (
                                 <button
                                   key={st}
                                   onClick={() => toggleTableStatus(table.id, st)}
                                   className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                                     pos.status === st
                                       ? "bg-[#f97316] text-white"
                                       : "text-neutral-500 dark:text-[#6f695f] hover:text-neutral-900 dark:hover:text-white"
                                   }`}
                                 >
                                   {st}
                                 </button>
                               ))}
                             </div>

                             <button
                               onClick={() => openCustomizer(table)}
                               className="px-3.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-[#1a1a1a] dark:hover:bg-[#222] border border-neutral-200 dark:border-[rgba(255,255,255,0.06)] rounded-lg text-xs font-bold text-neutral-800 dark:text-[#f0ece4] transition-all flex items-center gap-1"
                             >
                               <Printer className="size-3 text-[#f97316]" /> Flyer
                             </button>

                             <button
                               onClick={() => removeFromFloor(table.id)}
                               className="px-3.5 py-1.5 bg-rose-500/10 border border-rose-500/25 text-rose-500 hover:bg-rose-500/20 rounded-lg text-xs font-bold transition-all"
                             >
                               Remove from Floor
                             </button>

                             <button
                               onClick={() => setSelectedPlanItem(null)}
                               className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-[#222] hover:bg-neutral-200 dark:hover:bg-[#333] flex items-center justify-center text-neutral-800 dark:text-white transition-colors"
                             >
                               <X className="size-4" />
                             </button>
                           </div>
                         </div>
                       );
                     })() : (() => {
                       const decor = decorations.find(d => d.id === selectedPlanItem.id);
                       if (!decor) return null;

                       return (
                         <div className="flex items-center justify-between gap-4">
                           <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-[#161616] flex items-center justify-center text-amber-500">
                               <Sparkles className="size-5" />
                             </div>
                             <div>
                               <div className="text-sm font-bold text-neutral-900 dark:text-white uppercase">{decor.type} element</div>
                               <p className="text-[10px] text-neutral-400 dark:text-[#6f695f]">Interactive decoration item</p>
                             </div>
                           </div>

                           <div className="flex items-center gap-2.5">
                             <button
                               onClick={() => deleteDecoration(decor.id)}
                               className="px-4 py-1.5 bg-rose-500/10 border border-rose-500/25 text-rose-500 hover:bg-rose-500/20 rounded-lg text-xs font-bold transition-all"
                             >
                               Remove Item
                             </button>
                             <button
                               onClick={() => setSelectedPlanItem(null)}
                               className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-[#222] hover:bg-neutral-200 dark:hover:bg-[#333] flex items-center justify-center text-neutral-800 dark:text-white transition-colors"
                             >
                               <X className="size-4" />
                             </button>
                           </div>
                         </div>
                       );
                     })()}
                  </motion.div>
                )}
              </AnimatePresence>

            </div>

          </div>

        </div>
      )}

      {/* ── STANDARD LIST & QR CODE WORKSPACE GRID ───────────────────── */}
      {viewMode === "grid" && tables.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 no-print">
          <AnimatePresence mode="popLayout">
            {tables.map((table, idx) => {
              const hasQr = !!qrUrls[table.id];
              
              return (
                <motion.div
                  key={table.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.22, delay: idx * 0.02 }}
                  className="bg-white dark:bg-[#111] border border-neutral-200 dark:border-[rgba(255,255,255,0.06)] hover:border-[#f97316]/30 rounded-2xl overflow-hidden shadow-sm dark:shadow-lg transition-all duration-300 group flex flex-col justify-between"
                >
                  {/* Card Header Info */}
                  <div className="p-4 flex items-center justify-between border-b border-neutral-200 dark:border-[rgba(255,255,255,0.05)] bg-neutral-50/50 dark:bg-[#131313]/30">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-[32px] h-[32px] rounded-lg bg-[rgba(249,115,22,0.1)] flex items-center justify-center flex-shrink-0 border border-[#f97316]/10">
                        <QrCode className="size-3.5 text-[#f97316]" />
                      </div>
                      <div className="font-extrabold text-[13px] text-neutral-900 dark:text-white truncate leading-tight">{table.name}</div>
                    </div>
                    
                    {table.capacity && (
                      <span className="flex items-center gap-1 text-[10px] text-neutral-500 dark:text-[#5a5650] font-mono font-bold bg-neutral-100 dark:bg-[#161616] px-2 py-0.5 rounded-full border border-neutral-200 dark:border-[rgba(255,255,255,0.04)]">
                        <Users size={9} /> {table.capacity}p
                      </span>
                    )}
                  </div>

                  {/* Card Center: QR display block */}
                  <div className="p-4 flex flex-col items-center justify-center">
                    {hasQr ? (
                      <div className="w-[140px] aspect-square bg-white rounded-xl flex items-center justify-center overflow-hidden border border-neutral-200 p-1 hover:scale-102 transition-transform duration-300 shadow-md">
                        <img
                          src={qrUrls[table.id]}
                          alt={`QR for ${table.name}`}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-[140px] aspect-square bg-neutral-100 dark:bg-[#161616] border border-dashed border-neutral-300 dark:border-[rgba(255,255,255,0.08)] rounded-xl animate-pulse flex items-center justify-center text-neutral-400 dark:text-[#333]">
                        <QrCode className="size-8" />
                      </div>
                    )}
                    
                    <span className="text-[9px] text-neutral-400 dark:text-[#5a5650] hover:text-[#f97316] text-center font-mono mt-3 truncate w-full select-all tracking-tight" title={`Table Link: /${restaurantSlug}/${table.qrToken}`}>
                      {`/${restaurantSlug}/${table.qrToken}`}
                    </span>
                  </div>

                  {/* Card Actions Panel */}
                  <div className="p-3 bg-neutral-50/50 dark:bg-[#131313]/30 border-t border-neutral-200 dark:border-[rgba(255,255,255,0.04)] flex gap-2">
                    <button
                      onClick={() => openCustomizer(table)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-[#161616] border border-neutral-200 dark:border-[rgba(255,255,255,0.06)] dark:hover:bg-[#222] text-neutral-500 hover:text-neutral-800 dark:text-[#9a9488] dark:hover:text-white text-[11px] font-bold transition-all"
                    >
                      <Printer className="size-3" /> Branded Flyer
                    </button>
                    <button
                      onClick={() => downloadQR(table)}
                      className="w-9 h-9 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-[#161616] border border-neutral-200 dark:border-[rgba(255,255,255,0.06)] dark:hover:bg-[#222] text-neutral-500 hover:text-neutral-800 dark:text-[#9a9488] dark:hover:text-white flex items-center justify-center transition-all"
                      title="Download PNG QR Code"
                    >
                      <Download className="size-3.5" />
                    </button>
                    <button
                      onClick={() => deleteTable(table.id)}
                      className="w-9 h-9 rounded-xl bg-red-950/10 hover:bg-red-950/20 text-red-400 hover:text-red-300 flex items-center justify-center transition-all"
                      title="Delete Table"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* ── INTERACTIVE QR FLYER CUSTOMIZER MODAL ───────────────────────── */}
      <AnimatePresence>
        {customizerOpen && selectedTable && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCustomizerOpen(false)}
            className="fixed inset-0 bg-black/85 backdrop-blur-xs z-[99999] no-print flex items-center justify-center p-3 sm:p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.22 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[820px] h-full sm:h-[90vh] md:h-[540px] max-h-[540px] bg-white dark:bg-[#0c0c0c] border border-neutral-200 dark:border-[rgba(255,255,255,0.08)] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            >
              
              <div className="p-4 border-b border-neutral-200 dark:border-[rgba(255,255,255,0.06)] flex items-center justify-between bg-neutral-50 dark:bg-[#111]">
                <div>
                  <h3 className="text-[15px] font-extrabold text-neutral-800 dark:text-[#f0ece4] tracking-tight flex items-center gap-1.5">
                    <Printer className="size-4 text-[#f97316]" /> Branded QR Flyer Customizer
                  </h3>
                  <p className="text-[10px] text-neutral-400 dark:text-[#5a5650] font-medium mt-0.5">Customize and print high-quality digital tags for <span className="text-[#f97316] font-bold">{selectedTable.name}</span></p>
                </div>
                <button
                  onClick={() => setCustomizerOpen(false)}
                  className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-[#161616] hover:bg-neutral-200 dark:hover:bg-[#222] text-neutral-400 dark:text-[#5a5650] hover:text-neutral-800 dark:hover:text-[#f0ece4] flex items-center justify-center transition-colors"
                >
                  <X className="size-3.5" />
                </button>
              </div>

              <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
                
                <div className="flex-1 bg-neutral-50 dark:bg-[#141414] p-4 sm:p-5 flex items-center justify-center overflow-y-auto border-r border-neutral-200 dark:border-[rgba(255,255,255,0.05)] min-h-[360px] md:min-h-0">
                  <div 
                    id="print-area-wrapper"
                    className={`w-[230px] h-[310px] sm:w-[250px] sm:h-[340px] md:w-[260px] md:h-[360px] rounded-xl flex flex-col justify-between p-4 sm:p-5 md:p-6 shadow-2xl transition-all duration-300 ${
                      selectedTemplate === "sunset" 
                        ? "bg-white text-black border-8 border-transparent" 
                        : selectedTemplate === "obsidian"
                        ? "bg-[#0f0f0f] text-white border border-[#222]"
                        : "bg-white text-black border-2 border-black"
                    }`}
                    style={
                      selectedTemplate === "sunset" 
                        ? { borderImage: "linear-gradient(to bottom, #f97316, #d97706) 8" }
                        : {}
                    }
                  >
                    <div className="text-center space-y-1">
                      <p className={`text-[8px] sm:text-[10px] font-extrabold tracking-[0.2em] uppercase leading-none ${
                        selectedTemplate === "obsidian" ? "text-[#f97316]" : "text-[#d97706]"
                      }`}>
                        TABLESCAN ORDERING
                      </p>
                      <h4 className="text-[13px] sm:text-[16px] font-bold sm:font-extrabold tracking-tight truncate leading-tight uppercase font-sans">
                        {restaurantSlug.replace(/-/g, " ")}
                      </h4>
                      <div className={`w-8 h-0.5 mx-auto rounded-full mt-1.5 ${
                        selectedTemplate === "obsidian" ? "bg-white/20" : "bg-black/10"
                      }`} />
                    </div>

                    <div className="flex flex-col items-center justify-center space-y-1.5 sm:space-y-2 py-1.5">
                      <div className={`p-1.5 sm:p-2 rounded-xl bg-white flex items-center justify-center shadow-lg ${
                        selectedTemplate === "obsidian" ? "border border-white/15" : "border border-black/5"
                      }`}>
                        <img
                          src={qrUrls[selectedTable.id]}
                          alt="flyer QR"
                          className="w-[80px] h-[80px] sm:w-[100px] sm:h-[100px] md:w-[110px] md:h-[110px] object-contain"
                        />
                      </div>
                      
                      <span className={`px-3 py-1 sm:px-4 sm:py-1.5 rounded-full text-[11px] sm:text-[13px] font-black tracking-widest font-mono shadow-md ${
                        selectedTemplate === "sunset"
                          ? "bg-gradient-to-r from-[#f97316] to-[#d97706] text-white"
                          : selectedTemplate === "obsidian"
                          ? "bg-[#222] text-[#f97316] border border-[#f97316]/20"
                          : "bg-black text-white"
                      }`}>
                        {selectedTable.name.toUpperCase()}
                      </span>
                    </div>

                    <div className="text-center space-y-1.5 sm:space-y-2">
                      <p className={`text-[8px] sm:text-[9px] leading-relaxed font-bold tracking-tight px-1 font-sans ${
                        selectedTemplate === "obsidian" ? "text-gray-400" : "text-gray-600"
                      }`}>
                        {customInstructions}
                      </p>
                      
                      <div className="flex items-center justify-center gap-1 text-[7px] sm:text-[8px] font-black tracking-wider uppercase font-mono">
                        <QrCode className="size-2 sm:size-2.5" /> SCAN TO DIGITAL DINE
                      </div>
                    </div>

                  </div>
                </div>

                <div className="w-full md:w-[320px] p-4 sm:p-5 space-y-4 sm:space-y-5 overflow-y-auto bg-white dark:bg-[#0d0d0d] flex flex-col justify-between border-t md:border-t-0 md:border-l border-neutral-200 dark:border-[rgba(255,255,255,0.06)]">
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-neutral-500 dark:text-[#9a9488] text-[10px] font-extrabold uppercase tracking-wider block">1. Style Template</Label>
                      
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => setSelectedTemplate("sunset")}
                          className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                            selectedTemplate === "sunset"
                              ? "bg-[#f97316]/10 border-[#f97316] text-[#f97316]"
                              : "bg-neutral-50 dark:bg-[#141414] border-neutral-200 dark:border-[rgba(255,255,255,0.06)] text-neutral-500 dark:text-[#5a5650] hover:text-neutral-800 dark:hover:text-[#9a9488]"
                          }`}
                        >
                          <span className="w-4 h-4 rounded-full bg-gradient-to-r from-[#f97316] to-[#d97706] mb-1.5 shadow" />
                          <span className="text-[10px] font-bold leading-none">Sunset</span>
                        </button>

                        <button
                          onClick={() => setSelectedTemplate("obsidian")}
                          className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                            selectedTemplate === "obsidian"
                              ? "bg-[#f97316]/10 border-[#f97316] text-[#f97316]"
                              : "bg-neutral-50 dark:bg-[#141414] border-neutral-200 dark:border-[rgba(255,255,255,0.06)] text-neutral-500 dark:text-[#5a5650] hover:text-neutral-800 dark:hover:text-[#9a9488]"
                          }`}
                        >
                          <span className="w-4 h-4 rounded-full bg-[#1c1c1c] border border-white/20 mb-1.5 shadow" />
                          <span className="text-[10px] font-bold leading-none">Obsidian</span>
                        </button>

                        <button
                          onClick={() => setSelectedTemplate("ivory")}
                          className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                            selectedTemplate === "ivory"
                              ? "bg-[#f97316]/10 border-[#f97316] text-[#f97316]"
                              : "bg-neutral-50 dark:bg-[#141414] border-neutral-200 dark:border-[rgba(255,255,255,0.06)] text-neutral-500 dark:text-[#5a5650] hover:text-neutral-800 dark:hover:text-[#9a9488]"
                          }`}
                        >
                          <span className="w-4 h-4 rounded-full bg-white border border-black/10 mb-1.5 shadow" />
                          <span className="text-[10px] font-bold leading-none">Ivory</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="custom-instructions" className="text-neutral-500 dark:text-[#9a9488] text-[10px] font-extrabold uppercase tracking-wider block">2. Scan Instructions</Label>
                      <textarea
                        id="custom-instructions"
                        rows={5}
                        value={customInstructions}
                        onChange={e => setCustomInstructions(e.target.value)}
                        placeholder="Write dynamic print instruction copy..."
                        className="w-full p-3 bg-neutral-50 dark:bg-[#141414] border border-neutral-200 dark:border-[rgba(255,255,255,0.08)] text-neutral-800 dark:text-[#f0ece4] placeholder-neutral-400 dark:placeholder-[#444] focus:border-[#f97316] focus:ring-0 text-[11px] rounded-xl outline-none resize-none transition-colors"
                      />
                    </div>

                    <div className="bg-neutral-50 dark:bg-[#141414]/80 p-3 rounded-xl border border-neutral-200 dark:border-[rgba(255,255,255,0.04)] flex gap-2.5 items-start">
                      <Info className="size-4 text-[#f97316] flex-shrink-0 mt-0.5" />
                      <p className="text-[10px] text-neutral-500 dark:text-[#5a5650] leading-relaxed">
                        Clicking <span className="text-neutral-700 dark:text-[#9a9488] font-bold">Print Flyer</span> triggers browser system print styles configured to center A6 table cards automatically, excluding dashboard menus.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-4 border-t border-neutral-200 dark:border-[rgba(255,255,255,0.06)]">
                    <button
                      onClick={handlePrintFlyer}
                      className="w-full py-2.5 rounded-xl bg-[#f97316] text-white font-bold text-[12px] hover:bg-[#ea6c0a] transition-all flex items-center justify-center gap-1.5 shadow-md shadow-[#f97316]/10"
                    >
                      <Printer size={14} /> Print Flyer
                    </button>
                    <button
                      onClick={() => setCustomizerOpen(false)}
                      className="w-full py-2.5 rounded-xl bg-neutral-100 dark:bg-[#161616] border border-neutral-200 dark:border-[rgba(255,255,255,0.08)] text-neutral-500 dark:text-[#9a9488] hover:text-neutral-800 dark:hover:text-[#f0ece4] hover:bg-neutral-200 dark:hover:bg-[#222] font-bold text-[12px] transition-colors"
                    >
                      Close Customizer
                    </button>
                  </div>

                </div>

              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
    </div>
  );
}