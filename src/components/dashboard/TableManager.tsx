"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Plus, Trash2, Download, QrCode, Users, MapPin, 
  Sparkles, X, Printer, Check, Info, LayoutGrid, Eye
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

export default function TableManager({
  locationId,
  restaurantSlug,
}: {
  locationId: string;
  restaurantSlug: string;
}) {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [minLoading, setMinLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newTable, setNewTable] = useState({ name: "", capacity: "4" });
  const [qrUrls, setQrUrls] = useState<Record<string, string>>({});

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
    for (const table of tables) {
      const url = `${window.location.origin}/${restaurantSlug}/${table.qrToken}`;
      urls[table.id] = await QRCode.toDataURL(url, { 
        width: 400, 
        margin: 1,
        color: {
          dark: "#000000",
          light: "#FFFFFF"
        }
      });
    }
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

  // ── Global Stats ────────────────────────────────────────────────────────
  const totalTables = tables.length;
  const totalCapacity = useMemo(() => tables.reduce((sum, t) => sum + (t.capacity || 0), 0), [tables]);
  const averageSeats = totalTables > 0 ? Math.round(totalCapacity / totalTables) : 0;

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-72 rounded-2xl bg-neutral-100 dark:bg-[#141414] border border-neutral-200 dark:border-[rgba(255,255,255,0.06)]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto relative">
      
      {/* Dynamic Hidden Stylesheet for Native Print Media Formatting */}
      <style jsx global>{`
        @media print {
          /* Hide everything in layout */
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
      <div className="flex items-center gap-3.5 flex-wrap justify-between border-b border-neutral-200 dark:border-[rgba(255,255,255,0.06)] pb-5 no-print">
        <div className="flex items-center gap-3.5">
          <div className="w-[50px] h-[50px] rounded-2xl bg-gradient-to-br from-[#f97316] to-[#ea580c] flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#f97316]/10 border border-[#f97316]/20">
            <MapPin className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-[22px] font-extrabold text-neutral-800 dark:text-[#f0ece4] leading-none tracking-tight">Tables & QR Codes</h1>
            <p className="text-[12px] text-neutral-500 dark:text-[#9a9488] mt-1.5 font-medium">Manage tables, monitor capacity, and produce digital-dining QR tags</p>
          </div>
        </div>
        <button
          onClick={() => setAdding(true)}
          id="btn-add-table-header"
          className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-[#f97316] text-white text-[12px] font-bold hover:bg-[#ea6c0a] shadow-lg shadow-[#f97316]/15 transition-all"
        >
          <Plus className="size-3.5" /> Add Table
        </button>
      </div>

      {/* ── Seating Capacity KPI stats panel ────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 no-print">
        <div className="bg-white dark:bg-[#111111] border border-neutral-200 dark:border-[rgba(255,255,255,0.06)] rounded-2xl p-4 flex items-center gap-3.5 shadow-sm dark:shadow-lg dark:shadow-black/10">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 dark:bg-[rgba(249,115,22,0.12)] text-[#f97316] flex items-center justify-center">
            <LayoutGrid className="size-4.5" />
          </div>
          <div>
            <p className="text-[9px] text-neutral-400 dark:text-[#5a5650] uppercase tracking-wider font-extrabold">Active QR Decks</p>
            <p className="text-[18px] font-extrabold text-neutral-800 dark:text-[#f0ece4] mt-0.5 leading-none">{totalTables} Tables</p>
          </div>
        </div>
        
        <div className="bg-white dark:bg-[#111111] border border-neutral-200 dark:border-[rgba(255,255,255,0.06)] rounded-2xl p-4 flex items-center gap-3.5 shadow-sm dark:shadow-lg dark:shadow-black/10">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 dark:bg-[rgba(34,197,94,0.12)] text-green-600 dark:text-[#4ade80] flex items-center justify-center">
            <Users className="size-4.5" />
          </div>
          <div>
            <p className="text-[9px] text-neutral-400 dark:text-[#5a5650] uppercase tracking-wider font-extrabold">Seating capacity</p>
            <p className="text-[18px] font-extrabold text-neutral-800 dark:text-[#f0ece4] mt-0.5 leading-none">{totalCapacity} Total Seats</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111111] border border-neutral-200 dark:border-[rgba(255,255,255,0.06)] rounded-2xl p-4 flex items-center gap-3.5 shadow-sm dark:shadow-lg dark:shadow-black/10">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 dark:bg-[rgba(59,130,246,0.12)] text-blue-600 dark:text-[#60a5fa] flex items-center justify-center">
            <Sparkles className="size-4.5" />
          </div>
          <div>
            <p className="text-[9px] text-neutral-400 dark:text-[#5a5650] uppercase tracking-wider font-extrabold">Average Seats</p>
            <p className="text-[18px] font-extrabold text-neutral-800 dark:text-[#f0ece4] mt-0.5 leading-none">~ {averageSeats} per Table</p>
          </div>
        </div>
      </div>

      {/* ── Add Table Glass Form ────────────────────────────────────────── */}
      <AnimatePresence>
        {adding && (
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="bg-white dark:bg-[#111111] border border-[#f97316]/30 dark:border-[rgba(249,115,22,0.25)] rounded-2xl p-5 shadow-md dark:shadow-xl dark:shadow-black/20 no-print space-y-4"
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1 h-5 bg-[#f97316] rounded-full" />
              <p className="text-[13px] font-bold text-neutral-800 dark:text-[#f0ece4] uppercase tracking-wider">Register Table</p>
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
                  className="h-10 bg-neutral-50 dark:bg-[#161616] border-neutral-200 dark:border-[rgba(255,255,255,0.08)] text-neutral-800 dark:text-[#f0ece4] placeholder-neutral-400 dark:placeholder-[#444] focus:border-[#f97316] text-[13px] rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-neutral-500 dark:text-[#9a9488] text-[10px] font-bold uppercase tracking-wider block">Seating Capacity</Label>
                
                {/* Custom Capacity Segmented Quick Toggles */}
                <div className="grid grid-cols-5 gap-1.5 bg-neutral-100 dark:bg-[#141414] p-1 rounded-xl border border-neutral-200 dark:border-[rgba(255,255,255,0.06)]">
                  {["2", "4", "6", "8"].map((cap) => (
                    <button
                      key={cap}
                      type="button"
                      onClick={() => setNewTable({ ...newTable, capacity: cap })}
                      className={`py-1.5 rounded-lg text-[12px] font-mono font-bold transition-all ${
                        newTable.capacity === cap
                          ? "bg-[#f97316] text-white"
                          : "text-neutral-500 dark:text-[#5a5650] hover:text-neutral-800 dark:hover:text-[#9a9488]"
                      }`}
                    >
                      {cap}
                    </button>
                  ))}
                  
                  {/* Custom manual input inside segmenter */}
                  <input
                    type="number"
                    value={!["2", "4", "6", "8"].includes(newTable.capacity) ? newTable.capacity : ""}
                    placeholder="+"
                    onChange={(e) => setNewTable({ ...newTable, capacity: e.target.value })}
                    className="w-full text-center bg-transparent border-0 text-[12px] font-mono font-bold text-neutral-800 dark:text-[#f0ece4] placeholder-neutral-400 dark:placeholder-[#5a5650] focus:outline-none focus:ring-0"
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
                className="px-5 py-2.5 rounded-xl bg-neutral-100 dark:bg-[#161616] border border-neutral-200 dark:border-[rgba(255,255,255,0.08)] text-neutral-500 dark:text-[#9a9488] hover:text-neutral-800 dark:hover:text-[#f0ece4] hover:bg-neutral-200 dark:hover:bg-[#222] transition-colors text-[12px] font-bold"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Empty State ───────────────────────────────────────────────── */}
      {tables.length === 0 && !adding && (
        <div className="text-center py-24 bg-white dark:bg-[#111111] border border-neutral-200 dark:border-[rgba(255,255,255,0.06)] rounded-2xl shadow-sm dark:shadow-xl no-print">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-50 dark:bg-[#161616] border border-neutral-200 dark:border-[rgba(255,255,255,0.06)] mx-auto mb-4">
            <QrCode className="size-6 text-neutral-400 dark:text-[#5a5650]" />
          </div>
          <p className="text-[16px] font-bold text-neutral-800 dark:text-[#f0ece4]">No Active Tables</p>
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

      {/* ── Tables Workspace Grid ─────────────────────────────────────── */}
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
                className="bg-white dark:bg-[#111111] border border-neutral-200 dark:border-[rgba(255,255,255,0.06)] hover:border-[#f97316]/30 rounded-2xl overflow-hidden shadow-sm dark:shadow-lg hover:shadow-md dark:hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between"
              >
                {/* Card Header Info */}
                <div className="p-4 flex items-center justify-between border-b border-neutral-100 dark:border-[rgba(255,255,255,0.05)] bg-neutral-50/50 dark:bg-[#131313]/30">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-[32px] h-[32px] rounded-lg bg-[rgba(249,115,22,0.1)] flex items-center justify-center flex-shrink-0 border border-[#f97316]/10">
                      <QrCode className="size-3.5 text-[#f97316]" />
                    </div>
                    <div className="font-extrabold text-[13px] text-neutral-800 dark:text-[#f0ece4] truncate leading-tight">{table.name}</div>
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
                    <div className="w-[140px] aspect-square bg-white rounded-xl flex items-center justify-center overflow-hidden border border-white p-1 hover:scale-102 transition-transform duration-300 shadow-md">
                      <img
                        src={qrUrls[table.id]}
                        alt={`QR for ${table.name}`}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-[140px] aspect-square bg-neutral-50 dark:bg-[#161616] border border-dashed border-neutral-200 dark:border-[rgba(255,255,255,0.08)] rounded-xl animate-pulse flex items-center justify-center text-[#333]">
                      <QrCode className="size-8" />
                    </div>
                  )}
                  
                  {/* Token link code */}
                  <span className="text-[9px] text-neutral-400 dark:text-[#5a5650] hover:text-[#f97316] text-center font-mono mt-3 truncate w-full select-all tracking-tight" title={`Table Link: /${restaurantSlug}/${table.qrToken}`}>
                    {`/${restaurantSlug}/${table.qrToken}`}
                  </span>
                </div>

                {/* Card Actions Panel */}
                <div className="p-3 bg-neutral-50/50 dark:bg-[#131313]/30 border-t border-neutral-100 dark:border-[rgba(255,255,255,0.04)] flex gap-2">
                  <button
                    onClick={() => openCustomizer(table)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white dark:bg-[#161616] border border-neutral-200 dark:border-[rgba(255,255,255,0.06)] hover:bg-neutral-50 dark:hover:bg-[#222] text-neutral-500 dark:text-[#9a9488] hover:text-neutral-800 dark:hover:text-[#f0ece4] text-[11px] font-bold transition-all"
                  >
                    <Printer className="size-3" /> Branded Flyer
                  </button>
                  <button
                    onClick={() => downloadQR(table)}
                    className="w-9 h-9 rounded-xl bg-white dark:bg-[#161616] border border-neutral-200 dark:border-[rgba(255,255,255,0.06)] hover:bg-neutral-50 dark:hover:bg-[#222] text-neutral-500 dark:text-[#9a9488] hover:text-neutral-800 dark:hover:text-[#f0ece4] flex items-center justify-center transition-all"
                    title="Download PNG QR Code"
                  >
                    <Download className="size-3.5" />
                  </button>
                  <button
                    onClick={() => deleteTable(table.id)}
                    className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/10 hover:bg-red-100 dark:hover:bg-red-950/20 text-red-500 hover:text-red-600 dark:hover:text-red-400 flex items-center justify-center transition-all"
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

      {/* ── INTERACTIVE QR FLYER CUSTOMIZER MODAL ───────────────────────── */}
      <AnimatePresence>
        {customizerOpen && selectedTable && (
          /* Dark Centered Backdrop Wrapper */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCustomizerOpen(false)}
            className="fixed inset-0 bg-black/85 backdrop-blur-xs z-[99999] no-print flex items-center justify-center p-3 sm:p-4"
          >
            {/* Print Customizer Modal Workspace Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.22 }}
              onClick={(e) => e.stopPropagation()} // Prevent close on modal body click
              className="w-full max-w-[820px] h-full sm:h-[90vh] md:h-[540px] max-h-[540px] bg-white dark:bg-[#0c0c0c] border border-neutral-200 dark:border-[rgba(255,255,255,0.08)] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            >
              
              {/* Modal Header */}
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

              {/* Modal Columns (Split Preview & Settings) */}
              <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
                
                {/* 1. Left side: Real-time Live Flyer Preview */}
                <div className="flex-1 bg-neutral-50 dark:bg-[#141414] p-4 sm:p-5 flex items-center justify-center overflow-y-auto border-r border-neutral-200 dark:border-[rgba(255,255,255,0.05)] min-h-[360px] md:min-h-0">
                  
                  {/* Styled Print Block Canvas container */}
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
                    
                    {/* Template Top Layout */}
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

                    {/* Template Mid Layout: Styled QR Display */}
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
                      
                      {/* Bold Seating designation tag */}
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

                    {/* Template Bottom Layout: Custom scan instruction texts */}
                    <div className="text-center space-y-1.5 sm:space-y-2">
                      <p className={`text-[8px] sm:text-[9px] leading-relaxed font-bold tracking-tight px-1 font-sans ${
                        selectedTemplate === "obsidian" ? "text-gray-400" : "text-gray-600"
                      }`}>
                        {customInstructions}
                      </p>
                      
                      {/* Scanning visual indicator decoration */}
                      <div className="flex items-center justify-center gap-1 text-[7px] sm:text-[8px] font-black tracking-wider uppercase font-mono">
                        <QrCode className="size-2 sm:size-2.5" /> SCAN TO DIGITAL DINE
                      </div>
                    </div>

                  </div>
                </div>

                {/* 2. Right side: Interactive Settings panel controls */}
                <div className="w-full md:w-[320px] p-4 sm:p-5 space-y-4 sm:space-y-5 overflow-y-auto bg-white dark:bg-[#0d0d0d] flex flex-col justify-between border-t md:border-t-0 md:border-l border-neutral-200 dark:border-[rgba(255,255,255,0.06)]">
                  
                  <div className="space-y-4">
                    {/* Template selector preset button widgets */}
                    <div className="space-y-2">
                      <Label className="text-neutral-500 dark:text-[#9a9488] text-[10px] font-extrabold uppercase tracking-wider block">1. Style Template</Label>
                      
                      <div className="grid grid-cols-3 gap-2">
                        {/* Sunset Template Select button */}
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

                        {/* Obsidian Template Select button */}
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

                        {/* Ivory Template Select button */}
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

                    {/* Instruction text customizer */}
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

                    {/* Informational banner */}
                    <div className="bg-neutral-50 dark:bg-[#141414]/80 p-3 rounded-xl border border-neutral-200 dark:border-[rgba(255,255,255,0.04)] flex gap-2.5 items-start">
                      <Info className="size-4 text-[#f97316] flex-shrink-0 mt-0.5" />
                      <p className="text-[10px] text-neutral-500 dark:text-[#5a5650] leading-relaxed">
                        Clicking <span className="text-neutral-700 dark:text-[#9a9488] font-bold">Print Flyer</span> triggers browser system print styles configured to center A6 table cards automatically, excluding dashboard menus.
                      </p>
                    </div>
                  </div>

                  {/* Print Action Bottom */}
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