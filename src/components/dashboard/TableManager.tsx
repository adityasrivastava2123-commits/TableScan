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
      const savedPos = localStorage.getItem(`serveaura:floorplan:pos:${locationId}`);
      const savedDecor = localStorage.getItem(`serveaura:floorplan:decor:${locationId}`);
      
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
        localStorage.setItem(`serveaura:floorplan:pos:${locationId}`, JSON.stringify(next));
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
        localStorage.setItem(`serveaura:floorplan:decor:${locationId}`, JSON.stringify(next));
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
        localStorage.setItem(`serveaura:floorplan:pos:${locationId}`, JSON.stringify(next));
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
      localStorage.setItem(`serveaura:floorplan:pos:${locationId}`, JSON.stringify(next));
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
      localStorage.setItem(`serveaura:floorplan:pos:${locationId}`, JSON.stringify(next));
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
      localStorage.setItem(`serveaura:floorplan:pos:${locationId}`, JSON.stringify(next));
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
    localStorage.setItem(`serveaura:floorplan:decor:${locationId}`, JSON.stringify(next));
    setSelectedPlanItem({ id: newDecor.id, type: "decor" });
    toast.success(`Added visual ${type} block to canvas!`);
  };

  const deleteDecoration = (id: string) => {
    const next = decorations.filter(d => d.id !== id);
    setDecorations(next);
    localStorage.setItem(`serveaura:floorplan:decor:${locationId}`, JSON.stringify(next));
    if (selectedPlanItem?.id === id) setSelectedPlanItem(null);
    toast.success("Removed layout element");
  };

  const resetAllFloor = () => {
    if (!confirm("Are you sure you want to clear the visual floor plan? All tables will be sent back to the shelf.")) return;
    setPositions({});
    setDecorations([]);
    localStorage.removeItem(`serveaura:floorplan:pos:${locationId}`);
    localStorage.removeItem(`serveaura:floorplan:decor:${locationId}`);
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

  function handlePrintAll() {
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) {
      toast.error("Popup blocked! Please allow popups and try again.");
      return;
    }

    const bgColor = selectedTemplate === "obsidian" ? "#0f0f0f" : "#ffffff";
    const textColor = selectedTemplate === "obsidian" ? "#ffffff" : "#000000";
    const accentColor = "#f0a040";
    const badgeBg = selectedTemplate === "sunset"
      ? "linear-gradient(to right, #f0a040, #e85a2a)"
      : selectedTemplate === "obsidian"
      ? "#222222"
      : "#000000";
    const badgeText = selectedTemplate === "obsidian" ? "#f0a040" : "#ffffff";
    const labelColor = selectedTemplate === "obsidian" ? "#f0a040" : "#e85a2a";
    const subTextColor = selectedTemplate === "obsidian" ? "#9ca3af" : "#4b5563";

    const pagesHtml = tables.map((table) => {
      const qrSrc = qrUrls[table.id] || "";
      return `
        <div class="page">
          <div class="header">
            <p class="label">SERVEAURA ORDERING</p>
            <h2 class="restaurant">${restaurantSlug.replace(/-/g, " ").toUpperCase()}</h2>
            <div class="divider"></div>
          </div>
          <div class="qr-section">
            <div class="qr-box">
              <img src="${qrSrc}" alt="QR ${table.name}" />
            </div>
            <span class="badge">${table.name.toUpperCase()}</span>
          </div>
          <div class="footer">
            <p class="instructions">${customInstructions}</p>
            <p class="scan-text">&#9643; SCAN TO DIGITAL DINE</p>
          </div>
        </div>
      `;
    }).join("");

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR Flyers - ${restaurantSlug}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          @page { size: A4; margin: 0; }
          body {
            background: ${bgColor};
            color: ${textColor};
            font-family: sans-serif;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .page {
            width: 100vw;
            height: 100vh;
            background: ${bgColor};
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            gap: 6mm;
            page-break-after: always;
            break-after: page;
          }
          .page:last-child { page-break-after: auto; break-after: auto; }
          .header { text-align: center; }
          .label {
            font-size: 10pt;
            font-weight: 900;
            letter-spacing: 0.2em;
            text-transform: uppercase;
            color: ${labelColor};
            margin-bottom: 2mm;
          }
          .restaurant {
            font-size: 22pt;
            font-weight: 900;
            letter-spacing: -0.02em;
            color: ${textColor};
          }
          .divider {
            width: 24px;
            height: 2px;
            background: ${textColor};
            opacity: 0.15;
            margin: 3mm auto 0;
            border-radius: 2px;
          }
          .qr-section {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4mm;
          }
          .qr-box {
            background: white;
            padding: 6px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px solid rgba(0,0,0,0.06);
          }
          .qr-box img { width: 55mm; height: 55mm; display: block; }
          .badge {
            padding: 2mm 6mm;
            border-radius: 999px;
            font-size: 13pt;
            font-weight: 900;
            letter-spacing: 0.1em;
            background: ${badgeBg};
            color: ${badgeText};
          }
          .footer { text-align: center; max-width: 80mm; }
          .instructions {
            font-size: 9pt;
            line-height: 1.5;
            color: ${subTextColor};
            font-weight: 600;
            margin-bottom: 2mm;
          }
          .scan-text {
            font-size: 8pt;
            font-weight: 900;
            letter-spacing: 0.15em;
            text-transform: uppercase;
            color: ${accentColor};
          }
        </style>
      </head>
      <body>${pagesHtml}</body>
      </html>
    `);
    win.document.close();
    win.onload = () => {
      setTimeout(() => {
        win.focus();
        win.print();
      }, 300);
    };
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
          @page {
            size: A4;
            margin: 0 !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            background: transparent !important;
          }
          body * {
            visibility: hidden !important;
          }
          /* Single flyer print */
          #print-area-wrapper, #print-area-wrapper * {
            visibility: visible !important;
          }
          #print-area-wrapper {
            position: fixed !important;
            inset: 0 !important;
            width: 100% !important;
            height: 100% !important;
            display: block !important;
            background: transparent !important;
            z-index: 9999999 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          #print-area-wrapper > div {
            width: 100% !important;
            height: 100% !important;
            max-width: none !important;
            max-height: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            align-items: center !important;
            gap: 5mm !important;
          }
          #print-area-wrapper img {
            width: 50mm !important;
            height: 50mm !important;
          }
          /* Print All mode — must be in normal flow for page breaks to work */
          #print-all-area, #print-all-area * {
            visibility: visible !important;
          }
          #print-all-area {
            display: block !important;
            position: relative !important;
            width: 100% !important;
            z-index: 9999999 !important;
            margin: 0 !important;
            padding: 0 !important;
            background: transparent !important;
          }
          /* When print-all is active, hide the single flyer wrapper */
          #print-all-area ~ #print-area-wrapper {
            display: none !important;
          }
          .print-flyer-page {
            width: 100% !important;
            height: 100vh !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            align-items: center !important;
            gap: 5mm !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            border: none !important;
          }
          .print-flyer-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          .print-flyer-page img {
            width: 50mm !important;
            height: 50mm !important;
          }
          #print-area-wrapper *,
          #print-all-area * {
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* ── Page Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[rgba(255,255,255,0.08)] pb-5 no-print">
        <div className="flex items-center gap-3.5">
          <div className="w-[50px] h-[50px] rounded-2xl bg-gradient-to-tr from-[#f0a040] to-[#e85a2a] flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#f0a040]/15 border border-[#f0a040]/20">
            <Compass className="size-5 text-white animate-spin-slow" />
          </div>
          <div>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#f0a040]">LAYOUT PLANNER</span>
            <h1 className="text-2xl font-bold tracking-tight text-[#f5efe2] font-editorial italic mt-0.5">
              Tables & Floor Layout
            </h1>
            <p className="text-[11px] text-[#f5efe2]/50 font-serif italic mt-0.5">
              Visual floor plan architect, capacity tracker, and digital flyer generator
            </p>
          </div>
        </div>

        {/* Header Action Mode Toggles */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex bg-[#0b0a08] p-1 rounded-xl border border-[rgba(255,255,255,0.08)]">
            <button
              onClick={() => setViewMode("floor")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-mono-dashboard uppercase tracking-wider font-bold transition-all flex items-center gap-1.5 ${
                viewMode === "floor" 
                  ? "bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-white shadow-md" 
                  : "text-[#f5efe2]/40 hover:text-white"
              }`}
            >
              <Compass className="size-3.5" /> Floor Plan
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-mono-dashboard uppercase tracking-wider font-bold transition-all flex items-center gap-1.5 ${
                viewMode === "grid" 
                  ? "bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-white shadow-md" 
                  : "text-[#f5efe2]/40 hover:text-white"
              }`}
            >
              <LayoutGrid className="size-3.5" /> List & QR
            </button>
          </div>

          {tables.length > 0 && (
            <button
              onClick={handlePrintAll}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-transparent border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.02)] text-[#f5efe2]/70 hover:text-white text-[10px] font-mono-dashboard uppercase tracking-wider font-bold transition-all"
            >
              <Printer className="size-4" /> Print All QR
            </button>
          )}
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-white text-[10px] font-mono-dashboard uppercase tracking-wider font-bold hover:brightness-110 shadow-lg shadow-[#f0a040]/10 transition-all"
          >
            <Plus className="size-4" /> Add Table
          </button>
        </div>
      </div>

      {/* ── Seating Capacity KPI stats panel ────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 no-print">
        {[
          { title: "Capacity Status", val: `${placedTables.length} / ${totalTables} Placed`, icon: Compass, color: "text-[#f0a040]" },
          { title: "Total Seating", val: `${totalCapacity} Guests`, icon: Users, color: "text-[#52d27a]" },
          { title: "Average Table Size", val: `${averageSeats} Seats`, icon: Sparkles, color: "text-blue-400" },
          { title: "Occupied Tables", val: `${Object.values(positions).filter(p => p.status === "OCCUPIED").length} Tables`, icon: ShieldCheck, color: "text-rose-400" }
        ].map((item, idx) => (
          <div key={idx} className="bg-[#0b0a08]/40 border border-[rgba(255,255,255,0.08)] backdrop-blur-md rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] flex items-center justify-center">
              <item.icon className={`size-4.5 ${item.color}`} />
            </div>
            <div>
              <p className="text-[9px] text-[#f5efe2]/40 uppercase tracking-widest font-mono-dashboard">{item.title}</p>
              <p className="text-base font-bold text-[#f5efe2] font-mono-dashboard mt-0.5 leading-none">{item.val}</p>
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
            className="bg-[#0b0a08]/80 border border-[#f0a040]/30 backdrop-blur-lg rounded-2xl p-5 shadow-2xl no-print space-y-4"
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1 h-5 bg-[#f0a040] rounded-full animate-pulse" />
              <p className="text-[11px] font-mono-dashboard font-black text-[#f0a040] uppercase tracking-[0.15em]">Register New Table</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[#f5efe2]/40 text-[9px] font-mono-dashboard font-bold uppercase tracking-wider block">Table Label *</Label>
                <Input
                  autoFocus
                  value={newTable.name}
                  onChange={(e) => setNewTable({ ...newTable, name: e.target.value })}
                  placeholder="e.g. Table 04, Balcony Seat, Lounge 1"
                  onKeyDown={(e) => e.key === "Enter" && addTable()}
                  className="h-10 bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] text-[#f5efe2] placeholder-[#f5efe2]/20 focus:border-[#f0a040] text-[13px] rounded-xl outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[#f5efe2]/40 text-[9px] font-mono-dashboard font-bold uppercase tracking-wider block">Seating Capacity</Label>
                
                {/* Custom Capacity Segmented Quick Toggles */}
                <div className="grid grid-cols-5 gap-1.5 bg-[#0b0a08] p-1 rounded-xl border border-[rgba(255,255,255,0.08)]">
                  {["2", "4", "6", "8"].map((cap) => (
                    <button
                      key={cap}
                      type="button"
                      onClick={() => setNewTable({ ...newTable, capacity: cap })}
                      className={`py-1.5 rounded-lg text-[11px] font-mono-dashboard font-bold transition-all ${
                        newTable.capacity === cap
                          ? "bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-white"
                          : "text-[#f5efe2]/40 hover:text-white"
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
                    className="w-full text-center bg-transparent border-0 text-[11px] font-mono-dashboard font-bold text-[#f5efe2] placeholder-[#f5efe2]/30 focus:outline-none focus:ring-0"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2.5 pt-1.5">
              <button
                onClick={addTable}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-white text-[10px] font-mono-dashboard font-bold uppercase tracking-wider hover:brightness-110 transition-all shadow-md shadow-[#f0a040]/10"
              >
                Add Table
              </button>
              <button
                onClick={() => {
                  setAdding(false);
                  setNewTable({ name: "", capacity: "4" });
                }}
                className="px-5 py-2.5 rounded-xl bg-transparent border border-[rgba(255,255,255,0.08)] text-[#f5efe2]/60 hover:text-white hover:bg-[rgba(255,255,255,0.02)] transition-colors text-[10px] font-mono-dashboard font-bold uppercase tracking-wider"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Empty State ───────────────────────────────────────────────── */}
      {tables.length === 0 && !adding && (
        <div className="text-center py-24 bg-[#0b0a08]/40 border border-[rgba(255,255,255,0.08)] backdrop-blur-md rounded-2xl shadow-xl no-print">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] mx-auto mb-4">
            <QrCode className="size-6 text-[#f5efe2]/40" />
          </div>
          <p className="text-lg font-bold text-[#f5efe2] font-editorial italic">No Active Tables</p>
          <p className="text-[12px] text-[#f5efe2]/50 mt-1 max-w-xs mx-auto font-serif italic">
            You haven't registered any tables for digital ordering. Add a table to instantly generate a secure QR code deck.
          </p>
          <button
            onClick={() => setAdding(true)}
            className="mt-6 inline-flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-white text-[10px] font-mono-dashboard uppercase tracking-wider font-bold hover:brightness-110 shadow-md shadow-[#f0a040]/10 transition-all"
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
            <div className="bg-[#0b0a08]/40 border border-[rgba(255,255,255,0.08)] backdrop-blur-md rounded-2xl p-4.5 space-y-4 shadow-sm">
              <div className="border-b border-[rgba(255,255,255,0.08)] pb-3">
                <h3 className="text-[11px] font-mono-dashboard font-black text-[#f0a040] tracking-wider uppercase flex items-center gap-1.5">
                  <LayoutGrid className="size-3.5" />
                  Unplaced Shelf ({unplacedTables.length})
                </h3>
                <p className="text-[10px] text-[#f5efe2]/40 mt-0.5">Click to place tables onto the layout floor</p>
              </div>

              {unplacedTables.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#f5efe2]/40 bg-[#0b0a08]/30 border border-dashed border-[rgba(255,255,255,0.08)] rounded-xl font-serif italic">
                  All tables placed on floor
                </div>
              ) : (
                <div className="space-y-2 max-h-[220px] overflow-y-auto scrollbar-thin">
                  {unplacedTables.map(t => (
                    <button
                      key={t.id}
                      onClick={() => placeOnFloor(t.id)}
                      className="w-full p-2.5 bg-[#0b0a08]/50 border border-[rgba(255,255,255,0.08)] hover:border-[#f0a040]/40 text-left rounded-xl transition-all flex items-center justify-between group"
                    >
                      <div>
                        <div className="text-xs font-bold text-[#f5efe2]">{t.name}</div>
                        <div className="text-[9px] text-[#f5efe2]/40 font-mono-dashboard mt-0.5">{t.capacity || 4} SEATS</div>
                      </div>
                      <Plus className="size-3.5 text-[#f0a040] opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Shelf block 2: Visual Elements Placer */}
            <div className="bg-[#0b0a08]/40 border border-[rgba(255,255,255,0.08)] backdrop-blur-md rounded-2xl p-4.5 space-y-4 shadow-sm">
              <div className="border-b border-[rgba(255,255,255,0.08)] pb-3">
                <h3 className="text-[11px] font-mono-dashboard font-black text-[#f0a040] tracking-wider uppercase flex items-center gap-1.5">
                  <Sparkles className="size-3.5" />
                  Decorative Elements
                </h3>
                <p className="text-[10px] text-[#f5efe2]/40 mt-0.5">Place plants, partitions, doors, or bar counters</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Partition Wall", type: "wall" as const, color: "bg-[#0b0a08]/80 border-[rgba(255,255,255,0.08)] text-[#f5efe2]/60 hover:text-white" },
                  { label: "Bar Counter", type: "bar" as const, color: "bg-[rgba(240,160,64,0.05)] border-[rgba(240,160,64,0.15)] text-[#f0a040]" },
                  { label: "Entry Door", type: "door" as const, color: "bg-[rgba(59,130,246,0.05)] border-[rgba(59,130,246,0.15)] text-blue-400" },
                  { label: "Visual Plant", type: "plant" as const, color: "bg-[rgba(82,210,122,0.05)] border-[rgba(82,210,122,0.15)] text-[#52d27a] rounded-full" }
                ].map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => addDecoration(item.type)}
                    className={`p-2 border rounded-xl hover:border-[#f0a040]/50 text-center transition-all ${item.color}`}
                  >
                    <span className="text-[10px] font-bold block">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Controls Info Deck */}
            <div className="bg-[#0b0a08]/40 border border-[rgba(255,255,255,0.08)] p-4 rounded-2xl space-y-2.5 text-[11px] text-[#f5efe2]/50 shadow-sm">
              <div className="font-bold text-[#f5efe2] text-xs flex items-center gap-1.5"><Info className="size-3.5 text-[#f0a040]" /> Help Desk & Guidelines</div>
              <ul className="list-disc pl-4 space-y-1.5 text-[#f5efe2]/40 font-serif italic">
                <li>Drag and drop tables to position them anywhere on the floor grid.</li>
                <li>Single tap on any placed table to show layout controller popover.</li>
                <li>Tables are color-coded indicating live seating states in real-time.</li>
              </ul>
              <button
                onClick={resetAllFloor}
                className="w-full mt-2.5 py-2 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-500 hover:bg-rose-500/20 text-[10px] font-mono-dashboard uppercase tracking-wider font-bold transition-all flex items-center justify-center gap-1"
              >
                <Undo2 className="size-3.5" /> Clear Layout Design
              </button>
            </div>

          </div>

          {/* Right Area: Main Dotted grid Floor Plan Canvas Workspace */}
          <div className="lg:col-span-3 space-y-4">
            
            {/* Canvas wrapper card */}
            <div className="bg-[#0b0a08]/40 border border-[rgba(255,255,255,0.08)] backdrop-blur-md rounded-3xl p-4 md:p-6 flex flex-col justify-between shadow-sm">
              
              {/* Canvas header controls */}
              <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-3 mb-4">
                <span className="text-xs text-[#f5efe2]/50 font-semibold flex items-center gap-1.5">
                  <Compass className="size-4 text-[#f0a040] animate-pulse" />
                  Visual Layout Workspace Grid ({placedTables.length} Tables Active)
                </span>
                <span className="text-[10px] text-[#f5efe2]/40 font-mono-dashboard uppercase">Drag elements freely</span>
              </div>

              {/* Grid Canvas area */}
              <div className="overflow-x-auto w-full scrollbar-none rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#070707]">
                <div 
                  ref={canvasRef}
                  className="relative min-w-[750px] lg:min-w-full h-[540px] overflow-hidden shadow-inner select-none"
                  style={{
                    backgroundImage: "radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)",
                    backgroundSize: "20px 20px"
                  }}
                >
                
                {/* Placed Tables */}
                {placedTables.map((table) => {
                  const pos = positions[table.id] || { x: 50, y: 50, status: "FREE" };
                  const isSelected = selectedPlanItem?.id === table.id;
                  
                  // Status Ring color mapping
                  const statusColors = {
                    FREE: "border-[#52d27a]/40 bg-[#52d27a]/10 text-[#52d27a] shadow-emerald-500/5",
                    RESERVED: "border-[#f0a040]/40 bg-[#f0a040]/10 text-[#f0a040] shadow-amber-500/5",
                    OCCUPIED: "border-rose-500/40 bg-rose-500/10 text-rose-400 shadow-rose-500/5",
                    DIRTY: "border-purple-500/40 bg-purple-500/10 text-purple-400 shadow-purple-500/5"
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
                        isSelected ? "ring-2 ring-[#f0a040] ring-offset-2 ring-offset-[#070707]" : ""
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="text-[10px] font-black font-mono tracking-tight bg-black/40 px-1.5 py-0.5 rounded-md text-white/90">
                          {table.capacity || 4}p
                        </span>
                        <span className={`w-2 h-2 rounded-full ${
                          pos.status === "FREE" ? "bg-[#52d27a]" :
                          pos.status === "RESERVED" ? "bg-[#f0a040]" :
                          pos.status === "OCCUPIED" ? "bg-rose-500" : "bg-purple-500"
                        }`} />
                      </div>

                      <div className="text-center">
                        <div className="text-xs font-black truncate max-w-full text-white tracking-tight leading-tight">{table.name}</div>
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
                          ? "w-28 h-6 bg-[#0b0a08]/80 border border-[rgba(255,255,255,0.08)] text-[#f5efe2]/60" :
                        decor.type === "bar" 
                          ? "w-32 h-14 bg-[rgba(240,160,64,0.05)] border border-[rgba(240,160,64,0.15)] text-[#f0a040]" :
                        decor.type === "door" 
                          ? "w-16 h-10 bg-[rgba(59,130,246,0.05)] border border-[rgba(59,130,246,0.15)] text-blue-400" :
                          "w-12 h-12 bg-[rgba(82,210,122,0.05)] border border-[rgba(82,210,122,0.15)] text-[#52d27a] rounded-full"
                      } ${
                        isSelected ? "ring-2 ring-[#f0a040] ring-offset-2 ring-offset-[#070707]" : ""
                      }`}
                    >
                      <span className="text-[9px] font-black uppercase tracking-wider leading-none">
                        {decor.type}
                      </span>
                    </motion.div>
                  );
                })}

                </div>
              </div>

              {/* Canvas layout details controller popover drawer */}
              <AnimatePresence>
                {selectedPlanItem && (
                  <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 15 }}
                    className="bg-[#0b0a08]/90 border border-[rgba(255,255,255,0.08)] backdrop-blur-md rounded-2xl p-4.5 mt-4 space-y-4 shadow-lg"
                  >
                    {selectedPlanItem.type === "table" ? (() => {
                       const table = tables.find(t => t.id === selectedPlanItem.id);
                       const pos = positions[selectedPlanItem.id] || { status: "FREE" };
                       if (!table) return null;
                       
                       return (
                         <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                           <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-xl bg-[rgba(240,160,64,0.1)] flex items-center justify-center text-[#f0a040]">
                               <QrCode className="size-5" />
                             </div>
                             <div>
                               <div className="text-sm font-bold text-[#f5efe2] flex items-center gap-2">
                                 {table.name}
                                 <span className="text-[10px] text-[#f5efe2]/40 font-mono-dashboard">({table.capacity || 4} CAPACITY)</span>
                               </div>
                               <p className="text-[10px] text-[#f5efe2]/50 font-serif italic">Change seating states or remove from plan workspace</p>
                             </div>
                           </div>

                           <div className="flex flex-wrap items-center gap-2">
                             {/* Live Status triggers */}
                             <div className="flex rounded-xl bg-[#0b0a08] p-1 border border-[rgba(255,255,255,0.08)]">
                               {(["FREE", "RESERVED", "OCCUPIED", "DIRTY"] as const).map(st => (
                                 <button
                                   key={st}
                                   onClick={() => toggleTableStatus(table.id, st)}
                                   className={`px-3 py-1 rounded-lg text-[9px] font-mono-dashboard font-black uppercase tracking-wider transition-all ${
                                     pos.status === st
                                       ? "bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-white"
                                       : "text-[#f5efe2]/40 hover:text-white"
                                   }`}
                                 >
                                   {st}
                                 </button>
                               ))}
                             </div>

                             <button
                               onClick={() => openCustomizer(table)}
                               className="px-3.5 py-1.5 bg-transparent border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.02)] rounded-lg text-[10px] font-mono-dashboard uppercase tracking-wider font-black text-[#f5efe2]/80 hover:text-white transition-all flex items-center gap-1.5"
                             >
                               <Printer className="size-3 text-[#f0a040]" /> Flyer
                             </button>

                             <button
                               onClick={() => removeFromFloor(table.id)}
                               className="px-3.5 py-1.5 bg-rose-500/10 border border-rose-500/25 text-rose-500 hover:bg-rose-500/20 rounded-lg text-[10px] font-mono-dashboard uppercase tracking-wider font-bold transition-all"
                             >
                               Remove
                             </button>

                             <button
                               onClick={() => setSelectedPlanItem(null)}
                               className="w-8 h-8 rounded-lg bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.08)] flex items-center justify-center text-[#f5efe2] transition-colors"
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
                             <div className="w-10 h-10 rounded-xl bg-[rgba(255,255,255,0.02)] flex items-center justify-center text-[#f0a040]">
                               <Sparkles className="size-5" />
                             </div>
                             <div>
                               <div className="text-sm font-bold text-[#f5efe2] uppercase tracking-wider font-mono-dashboard">{decor.type} element</div>
                               <p className="text-[10px] text-[#f5efe2]/40">Interactive decoration item</p>
                             </div>
                           </div>

                           <div className="flex items-center gap-2.5">
                             <button
                               onClick={() => deleteDecoration(decor.id)}
                               className="px-4 py-1.5 bg-rose-500/10 border border-rose-500/25 text-rose-500 hover:bg-rose-500/20 rounded-lg text-[10px] font-mono-dashboard uppercase tracking-wider font-bold transition-all"
                             >
                               Remove Item
                             </button>
                             <button
                               onClick={() => setSelectedPlanItem(null)}
                               className="w-8 h-8 rounded-lg bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.08)] flex items-center justify-center text-[#f5efe2] transition-colors"
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
                  className="bg-[#0b0a08]/40 border border-[rgba(255,255,255,0.08)] backdrop-blur-md hover:border-[#f0a040]/30 rounded-2xl overflow-hidden shadow-sm transition-all duration-300 group flex flex-col justify-between"
                >
                  {/* Card Header Info */}
                  <div className="p-4 flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] bg-[#0b0a08]/60">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-[32px] h-[32px] rounded-lg bg-[rgba(240,160,64,0.1)] flex items-center justify-center flex-shrink-0 border border-[#f0a040]/10">
                        <QrCode className="size-3.5 text-[#f0a040]" />
                      </div>
                      <div className="font-bold text-[13px] text-[#f5efe2] truncate leading-tight">{table.name}</div>
                    </div>
                    
                    {table.capacity && (
                      <span className="flex items-center gap-1 text-[9px] text-[#f5efe2]/50 font-mono-dashboard font-bold bg-[#0b0a08] px-2 py-0.5 rounded-full border border-[rgba(255,255,255,0.08)]">
                        <Users size={9} /> {table.capacity}P
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
                      <div className="w-[140px] aspect-square bg-[#0b0a08] border border-dashed border-[rgba(255,255,255,0.08)] rounded-xl animate-pulse flex items-center justify-center text-[#f5efe2]/40">
                        <QrCode className="size-8" />
                      </div>
                    )}
                    
                    <span className="text-[9px] text-[#f5efe2]/40 hover:text-[#f0a040] text-center font-mono-dashboard mt-3 truncate w-full select-all tracking-tight" title={`Table Link: /${restaurantSlug}/${table.qrToken}`}>
                      {`/${restaurantSlug}/${table.qrToken}`}
                    </span>
                  </div>

                  {/* Card Actions Panel */}
                  <div className="p-3 bg-[#0b0a08]/60 border-t border-[rgba(255,255,255,0.08)] flex gap-2">
                    <button
                      onClick={() => openCustomizer(table)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-transparent border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.02)] text-[#f5efe2]/60 hover:text-white text-[10px] font-mono-dashboard uppercase tracking-wider font-bold transition-all"
                    >
                      <Printer className="size-3" /> Flyer
                    </button>
                    <button
                      onClick={() => downloadQR(table)}
                      className="w-9 h-9 rounded-xl bg-transparent border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.02)] text-[#f5efe2]/60 hover:text-white flex items-center justify-center transition-all"
                      title="Download PNG QR Code"
                    >
                      <Download className="size-3.5" />
                    </button>
                    <button
                      onClick={() => deleteTable(table.id)}
                      className="w-9 h-9 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 flex items-center justify-center transition-all"
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
            className="fixed inset-0 bg-black/85 backdrop-blur-xs z-[99999] flex items-center justify-center p-3 sm:p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.22 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[820px] h-auto max-h-[90vh] md:h-[540px] md:max-h-[540px] bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            >
              
              <div className="p-4 border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between bg-[#0b0a08]/80 no-print">
                <div>
                  <h3 className="text-[14px] font-mono-dashboard font-black text-[#f0a040] uppercase tracking-wider flex items-center gap-1.5">
                    <Printer className="size-4 text-[#f0a040]" /> QR Flyer Customizer
                  </h3>
                  <p className="text-[10px] text-[#f5efe2]/40 mt-0.5">Customize and print high-quality digital tags for <span className="text-[#f0a040] font-bold">{selectedTable.name}</span></p>
                </div>
                <button
                  onClick={() => setCustomizerOpen(false)}
                  className="w-7 h-7 rounded-lg bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.08)] text-[#f5efe2]/40 hover:text-white flex items-center justify-center transition-colors"
                >
                  <X className="size-3.5" />
                </button>
              </div>

              <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
                
                <div className="flex-1 bg-[#070707] p-4 sm:p-5 flex items-center justify-center overflow-y-auto border-r border-[rgba(255,255,255,0.08)] min-h-[360px] md:min-h-0">
                  <div id="print-area-wrapper">
                    <div 
                      className={`w-[230px] h-[310px] sm:w-[250px] sm:h-[340px] md:w-[260px] md:h-[360px] rounded-xl flex flex-col justify-between p-4 sm:p-5 md:p-6 shadow-2xl transition-all duration-300 ${
                        selectedTemplate === "sunset" 
                          ? "bg-white text-black border-8 border-transparent" 
                          : selectedTemplate === "obsidian"
                          ? "bg-[#0f0f0f] text-white border border-[#222]"
                          : "bg-white text-black border-2 border-black"
                      }`}
                      style={
                        selectedTemplate === "sunset" 
                          ? { borderImage: "linear-gradient(to bottom, #f0a040, #e85a2a) 8" }
                          : {}
                      }
                    >
                      <div className="text-center space-y-1">
                        <p className={`text-[8px] sm:text-[10px] font-extrabold tracking-[0.2em] uppercase leading-none ${
                          selectedTemplate === "obsidian" ? "text-[#f0a040]" : "text-[#e85a2a]"
                        }`}>
                          SERVEAURA ORDERING
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
                            ? "bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-white"
                            : selectedTemplate === "obsidian"
                            ? "bg-[#222] text-[#f0a040] border border-[#f0a040]/25"
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
                </div>

                <div className="w-full md:w-[320px] p-4 sm:p-5 space-y-4 sm:space-y-5 overflow-y-auto bg-[#0b0a08]/50 flex flex-col justify-between border-t md:border-t-0 md:border-l border-[rgba(255,255,255,0.08)] no-print">
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[#f5efe2]/40 text-[9px] font-mono-dashboard font-black uppercase tracking-wider block">1. Style Template</Label>
                      
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => setSelectedTemplate("sunset")}
                          className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                            selectedTemplate === "sunset"
                              ? "bg-[rgba(240,160,64,0.1)] border-[#f0a040] text-[#f0a040]"
                              : "bg-[#0b0a08] border-[rgba(255,255,255,0.08)] text-[#f5efe2]/40 hover:text-white"
                          }`}
                        >
                          <span className="w-4 h-4 rounded-full bg-gradient-to-r from-[#f0a040] to-[#e85a2a] mb-1.5 shadow" />
                          <span className="text-[10px] font-bold leading-none font-mono-dashboard uppercase">Sunset</span>
                        </button>

                        <button
                          onClick={() => setSelectedTemplate("obsidian")}
                          className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                            selectedTemplate === "obsidian"
                              ? "bg-[rgba(240,160,64,0.1)] border-[#f0a040] text-[#f0a040]"
                              : "bg-[#0b0a08] border-[rgba(255,255,255,0.08)] text-[#f5efe2]/40 hover:text-white"
                          }`}
                        >
                          <span className="w-4 h-4 rounded-full bg-[#1c1c1c] border border-white/20 mb-1.5 shadow" />
                          <span className="text-[10px] font-bold leading-none font-mono-dashboard uppercase">Obsidian</span>
                        </button>

                        <button
                          onClick={() => setSelectedTemplate("ivory")}
                          className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                            selectedTemplate === "ivory"
                              ? "bg-[rgba(240,160,64,0.1)] border-[#f0a040] text-[#f0a040]"
                              : "bg-[#0b0a08] border-[rgba(255,255,255,0.08)] text-[#f5efe2]/40 hover:text-white"
                          }`}
                        >
                          <span className="w-4 h-4 rounded-full bg-white border border-black/10 mb-1.5 shadow" />
                          <span className="text-[10px] font-bold leading-none font-mono-dashboard uppercase">Ivory</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="custom-instructions" className="text-[#f5efe2]/40 text-[9px] font-mono-dashboard font-black uppercase tracking-wider block">2. Scan Instructions</Label>
                      <textarea
                        id="custom-instructions"
                        rows={5}
                        value={customInstructions}
                        onChange={e => setCustomInstructions(e.target.value)}
                        placeholder="Write dynamic print instruction copy..."
                        className="w-full p-3 bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] text-[#f5efe2] placeholder-[#f5efe2]/20 focus:border-[#f0a040] focus:ring-0 text-[11px] rounded-xl outline-none resize-none transition-colors"
                      />
                    </div>

                    <div className="bg-[#0b0a08] p-3 rounded-xl border border-[rgba(255,255,255,0.08)] flex gap-2.5 items-start">
                      <Info className="size-4 text-[#f0a040] flex-shrink-0 mt-0.5" />
                      <p className="text-[10px] text-[#f5efe2]/40 leading-relaxed font-serif italic">
                        Clicking <span className="text-[#f0a040] font-bold">Print Flyer</span> triggers browser system print styles configured to center A6 table cards automatically.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-4 border-t border-[rgba(255,255,255,0.08)]">
                    <button
                      onClick={handlePrintFlyer}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-white font-mono-dashboard uppercase tracking-wider font-bold text-[10px] hover:brightness-110 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-[#f0a040]/10"
                    >
                      <Printer size={14} /> Print Flyer
                    </button>
                    <button
                      onClick={() => setCustomizerOpen(false)}
                      className="w-full py-2.5 rounded-xl bg-transparent border border-[rgba(255,255,255,0.08)] text-[#f5efe2]/60 hover:text-white hover:bg-[rgba(255,255,255,0.02)] font-mono-dashboard uppercase tracking-wider font-bold text-[10px] transition-colors"
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