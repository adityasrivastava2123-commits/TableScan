"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Plus, Trash2, RotateCw, Check, Info, Users, ShieldAlert,
  Sliders, LayoutGrid, Award, Play, Edit, HelpCircle, Save, Undo
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

interface Table {
  id: string;
  name: string;
  capacity?: number;
}

interface Staff {
  id: string;
  name: string;
  role: string;
}

interface TableService {
  id: string;
  status: string;
  seatedAt?: Date;
  clearedAt?: Date;
  notes?: string;
  table: Table;
  server?: Staff;
  createdAt: Date;
}

interface FloorAsset {
  id: string; // unique ID or Table ID
  tableId?: string; // empty if it's decor
  type: "table" | "wall" | "plant" | "bar" | "door";
  name: string;
  shape: "rectangle" | "round";
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number; // degrees
  capacity?: number;
}

interface FloorPlanEditorProps {
  locationId: string;
  restaurantId: string;
  tables: Table[];
  tableServices: TableService[];
  staff: Staff[];
  updateTableService: (id: string, status: string) => Promise<void>;
  assignServer: (id: string, serverId: string) => Promise<void>;
}

export default function FloorPlanEditor({
  locationId,
  restaurantId,
  tables,
  tableServices,
  staff,
  updateTableService,
  assignServer
}: FloorPlanEditorProps) {
  const [isDesignMode, setIsDesignMode] = useState(false);
  const [assets, setAssets] = useState<FloorAsset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [canvasScale, setCanvasScale] = useState(1);
  const [activeInteractAsset, setActiveInteractAsset] = useState<FloorAsset | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const dragInfoRef = useRef<{
    assetId: string;
    startX: number;
    startY: number;
    startAssetX: number;
    startAssetY: number;
  } | null>(null);

  // Load layout from localStorage
  useEffect(() => {
    const storageKey = `tablescan_floorplan_${locationId}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setAssets(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load floorplan layout", e);
      }
    } else {
      // Auto-populate layout with some default table configurations
      const defaultAssets: FloorAsset[] = [];
      let currentX = 50;
      let currentY = 80;
      
      tables.forEach((table, index) => {
        defaultAssets.push({
          id: `table_${table.id}`,
          tableId: table.id,
          type: "table",
          name: table.name,
          shape: index % 3 === 0 ? "round" : "rectangle",
          x: currentX,
          y: currentY,
          w: table.capacity && table.capacity > 4 ? 80 : 60,
          h: table.capacity && table.capacity > 4 ? 80 : 60,
          rotation: 0,
          capacity: table.capacity || 4
        });
        
        currentX += 120;
        if (currentX > 650) {
          currentX = 50;
          currentY += 120;
        }
      });

      // Add a couple of default decor items
      defaultAssets.push({
        id: "decor_bar_1",
        type: "bar",
        name: "Main Bar Counter",
        shape: "rectangle",
        x: 480,
        y: 460,
        w: 240,
        h: 60,
        rotation: 0
      });

      defaultAssets.push({
        id: "decor_plant_1",
        type: "plant",
        name: "Lobby Palm",
        shape: "round",
        x: 40,
        y: 480,
        w: 50,
        h: 50,
        rotation: 0
      });

      setAssets(defaultAssets);
    }
  }, [locationId, tables]);

  // Save layout to localStorage
  const saveLayout = (updatedAssets = assets) => {
    const storageKey = `tablescan_floorplan_${locationId}`;
    localStorage.setItem(storageKey, JSON.stringify(updatedAssets));
    toast.success("Floor layout saved successfully!");
  };

  // Asset creation
  const addDecor = (type: "wall" | "plant" | "bar" | "door") => {
    let name = "";
    let w = 60;
    let h = 60;
    let shape: "rectangle" | "round" = "rectangle";

    switch (type) {
      case "wall":
        name = "Room Divider Wall";
        w = 120;
        h = 12;
        shape = "rectangle";
        break;
      case "plant":
        name = "Fiddle Leaf Fig";
        w = 45;
        h = 45;
        shape = "round";
        break;
      case "bar":
        name = "Dining Bar Section";
        w = 180;
        h = 50;
        shape = "rectangle";
        break;
      case "door":
        name = "Main Entrance Door";
        w = 70;
        h = 10;
        shape = "rectangle";
        break;
    }

    const newAsset: FloorAsset = {
      id: `decor_${Date.now()}`,
      type,
      name,
      shape,
      x: 150,
      y: 150,
      w,
      h,
      rotation: 0
    };

    const newAssets = [...assets, newAsset];
    setAssets(newAssets);
    setSelectedAssetId(newAsset.id);
    saveLayout(newAssets);
  };

  const addTableToFloor = (tableId: string) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;

    // Check if table is already placed
    if (assets.some(a => a.tableId === tableId)) {
      toast.error("Table is already placed on the floor plan.");
      return;
    }

    const newAsset: FloorAsset = {
      id: `table_${table.id}`,
      tableId: table.id,
      type: "table",
      name: table.name,
      shape: "rectangle",
      x: 100,
      y: 100,
      w: table.capacity && table.capacity > 4 ? 80 : 60,
      h: table.capacity && table.capacity > 4 ? 80 : 60,
      rotation: 0,
      capacity: table.capacity || 4
    };

    const newAssets = [...assets, newAsset];
    setAssets(newAssets);
    setSelectedAssetId(newAsset.id);
    saveLayout(newAssets);
  };

  const deleteAsset = (id: string) => {
    const filtered = assets.filter(a => a.id !== id);
    setAssets(filtered);
    if (selectedAssetId === id) setSelectedAssetId(null);
    saveLayout(filtered);
    toast.success("Asset removed from floor layout");
  };

  const rotateSelected = () => {
    if (!selectedAssetId) return;
    const updated = assets.map(a => {
      if (a.id === selectedAssetId) {
        return { ...a, rotation: (a.rotation + 45) % 360 };
      }
      return a;
    });
    setAssets(updated);
    saveLayout(updated);
  };

  const changeSelectedShape = (shape: "round" | "rectangle") => {
    if (!selectedAssetId) return;
    const updated = assets.map(a => {
      if (a.id === selectedAssetId) {
        const size = Math.max(a.w, a.h);
        return { 
          ...a, 
          shape,
          w: shape === "round" ? size : a.w,
          h: shape === "round" ? size : a.h
        };
      }
      return a;
    });
    setAssets(updated);
    saveLayout(updated);
  };

  const resizeSelected = (dw: number, dh: number) => {
    if (!selectedAssetId) return;
    const updated = assets.map(a => {
      if (a.id === selectedAssetId) {
        const nextW = Math.max(20, a.w + dw);
        const nextH = Math.max(10, a.h + dh);
        return { 
          ...a, 
          w: a.shape === "round" ? Math.max(20, Math.min(nextW, nextH)) : nextW,
          h: a.shape === "round" ? Math.max(20, Math.min(nextW, nextH)) : nextH
        };
      }
      return a;
    });
    setAssets(updated);
    saveLayout(updated);
  };

  // Drag and Drop implementation
  const handlePointerDown = (e: React.PointerEvent, assetId: string) => {
    if (!isDesignMode) return;
    e.preventDefault();
    setSelectedAssetId(assetId);

    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;

    dragInfoRef.current = {
      assetId,
      startX: e.clientX,
      startY: e.clientY,
      startAssetX: asset.x,
      startAssetY: asset.y
    };

    if (canvasRef.current) {
      canvasRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDesignMode || !dragInfoRef.current) return;
    e.preventDefault();

    const info = dragInfoRef.current;
    const dx = (e.clientX - info.startX) / canvasScale;
    const dy = (e.clientY - info.startY) / canvasScale;

    let targetX = info.startAssetX + dx;
    let targetY = info.startAssetY + dy;

    // Apply grid snapping if active
    if (snapToGrid) {
      targetX = Math.round(targetX / 10) * 10;
      targetY = Math.round(targetY / 10) * 10;
    }

    // Boundaries check (keep assets on canvas)
    targetX = Math.max(0, Math.min(780, targetX));
    targetY = Math.max(0, Math.min(580, targetY));

    setAssets(prev => prev.map(a => {
      if (a.id === info.assetId) {
        return { ...a, x: targetX, y: targetY };
      }
      return a;
    }));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragInfoRef.current) {
      if (canvasRef.current) {
        canvasRef.current.releasePointerCapture(e.pointerId);
      }
      dragInfoRef.current = null;
      saveLayout();
    }
  };

  // Helper: check table status
  const getTableService = (tableId?: string) => {
    if (!tableId) return null;
    return tableServices.find(s => s.table.id === tableId) || null;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "AVAILABLE": return "from-[#22c55e] to-[#4ade80] shadow-[#22c55e]/20 border-green-500/30";
      case "OCCUPIED": return "from-[#f97316] to-[#fb923c] shadow-[#f97316]/20 border-orange-500/30";
      case "RESERVED": return "from-[#3b82f6] to-[#60a5fa] shadow-[#3b82f6]/20 border-blue-500/30";
      case "DIRTY": return "from-[#ef4444] to-[#f87171] shadow-[#ef4444]/20 border-red-500/30";
      case "MAINTENANCE": return "from-[#64748b] to-[#94a3b8] shadow-[#64748b]/20 border-slate-500/30";
      default: return "from-neutral-300 to-neutral-400 dark:from-neutral-700 dark:to-neutral-600 border-neutral-400/20";
    }
  };

  const getStatusLabelColor = (status: string) => {
    switch (status) {
      case "AVAILABLE": return "bg-green-500/10 text-green-500 border-green-500/25";
      case "OCCUPIED": return "bg-orange-500/10 text-orange-500 border-orange-500/25";
      case "RESERVED": return "bg-blue-500/10 text-blue-500 border-blue-500/25";
      case "DIRTY": return "bg-red-500/10 text-red-500 border-red-500/25";
      default: return "bg-neutral-500/10 text-neutral-400 border-neutral-500/25";
    }
  };

  const placedTableIds = assets.filter(a => a.type === "table").map(a => a.tableId);
  const unplacedTables = tables.filter(t => !placedTableIds.includes(t.id));
  const selectedAsset = assets.find(a => a.id === selectedAssetId);

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* Visual Controls / Toolbars Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#111] p-4 rounded-2xl border border-neutral-200 dark:border-[rgba(255,255,255,0.06)] shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setIsDesignMode(!isDesignMode);
              setSelectedAssetId(null);
              setActiveInteractAsset(null);
            }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold transition-all shadow-sm ${
              isDesignMode
                ? "bg-[#f97316] text-white hover:bg-[#ea6c0a]"
                : "bg-neutral-100 dark:bg-[#161616] text-neutral-700 dark:text-[#f0ece4] hover:bg-neutral-200 dark:hover:bg-[#222] border border-neutral-200 dark:border-[rgba(255,255,255,0.06)]"
            }`}
          >
            {isDesignMode ? (
              <>
                <Check className="size-3.5" /> Stop Designing
              </>
            ) : (
              <>
                <Edit className="size-3.5" /> Designer Mode
              </>
            )}
          </button>

          {isDesignMode && (
            <div className="flex items-center gap-2 border-l border-neutral-200 dark:border-neutral-800 pl-3">
              <button
                onClick={() => setSnapToGrid(!snapToGrid)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                  snapToGrid
                    ? "bg-orange-500/10 border-orange-500/30 text-orange-500"
                    : "bg-transparent border-neutral-200 dark:border-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
                }`}
                title="Align elements automatically on a 10px grid"
              >
                Snap to Grid
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <span className="text-[10px] text-neutral-400 dark:text-[#5a5650] uppercase tracking-wider font-extrabold mr-1">Scale</span>
          <button
            onClick={() => setCanvasScale(prev => Math.max(0.7, prev - 0.1))}
            className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-[#161616] hover:bg-neutral-200 dark:hover:bg-[#222] border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 font-extrabold flex items-center justify-center text-[13px]"
          >
            -
          </button>
          <span className="w-12 text-center text-[12px] font-mono font-extrabold text-neutral-700 dark:text-neutral-300">
            {Math.round(canvasScale * 100)}%
          </span>
          <button
            onClick={() => setCanvasScale(prev => Math.min(1.3, prev + 0.1))}
            className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-[#161616] hover:bg-neutral-200 dark:hover:bg-[#222] border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 font-extrabold flex items-center justify-center text-[13px]"
          >
            +
          </button>
        </div>
      </div>

      {/* Main Floor workspace and asset menu */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 items-start">
        
        {/* Left pane: context menus depending on mode */}
        <div className="lg:col-span-1 space-y-4">
          
          {/* DESIGNER PANEL */}
          {isDesignMode ? (
            <div className="bg-white dark:bg-[#111] p-5 rounded-2xl border border-neutral-200 dark:border-[rgba(255,255,255,0.06)] space-y-5">
              
              <div>
                <h3 className="text-[13px] font-extrabold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Plus className="size-4 text-orange-500" /> Place Tables
                </h3>
                {unplacedTables.length === 0 ? (
                  <p className="text-[11px] text-neutral-400 dark:text-[#5a5650] bg-neutral-50 dark:bg-[#151515] p-3 rounded-xl border border-neutral-100 dark:border-neutral-900 leading-normal">
                    All tables registered under this restaurant are already on the floor canvas.
                  </p>
                ) : (
                  <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                    {unplacedTables.map(t => (
                      <button
                        key={t.id}
                        onClick={() => addTableToFloor(t.id)}
                        className="flex items-center justify-between text-left p-2.5 rounded-xl border border-neutral-200 dark:border-[rgba(255,255,255,0.06)] bg-neutral-50 dark:bg-[#161616] hover:border-orange-500 hover:bg-orange-500/5 transition-all group"
                      >
                        <span className="text-[12px] font-semibold text-neutral-700 dark:text-neutral-300 group-hover:text-orange-500 truncate">{t.name}</span>
                        <span className="text-[9px] font-mono font-bold bg-neutral-200 dark:bg-[#222] text-neutral-500 px-2 py-0.5 rounded-full group-hover:bg-orange-500/10 group-hover:text-orange-500 flex-shrink-0">{t.capacity || 4}p</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-[13px] font-extrabold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sliders className="size-4 text-orange-500" /> Physical Decor
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => addDecor("wall")}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-neutral-200 dark:border-[rgba(255,255,255,0.06)] bg-neutral-50 dark:bg-[#161616] hover:border-orange-500/50 hover:bg-orange-500/5 transition-all text-center"
                  >
                    <span className="w-10 h-2 bg-neutral-400 dark:bg-neutral-600 rounded-sm mb-2" />
                    <span className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300">Wall</span>
                  </button>
                  <button
                    onClick={() => addDecor("plant")}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-neutral-200 dark:border-[rgba(255,255,255,0.06)] bg-neutral-50 dark:bg-[#161616] hover:border-orange-500/50 hover:bg-orange-500/5 transition-all text-center"
                  >
                    <span className="w-6 h-6 rounded-full bg-green-500/20 border border-green-500 flex items-center justify-center text-green-500 text-[10px] mb-2 font-black">🌱</span>
                    <span className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300">Plant</span>
                  </button>
                  <button
                    onClick={() => addDecor("bar")}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-neutral-200 dark:border-[rgba(255,255,255,0.06)] bg-neutral-50 dark:bg-[#161616] hover:border-orange-500/50 hover:bg-orange-500/5 transition-all text-center"
                  >
                    <span className="w-12 h-4 bg-orange-800/20 border border-orange-800/40 rounded-sm mb-2" />
                    <span className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300">Bar</span>
                  </button>
                  <button
                    onClick={() => addDecor("door")}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-neutral-200 dark:border-[rgba(255,255,255,0.06)] bg-neutral-50 dark:bg-[#161616] hover:border-orange-500/50 hover:bg-orange-500/5 transition-all text-center"
                  >
                    <span className="w-10 h-1 bg-yellow-600/40 border border-yellow-600/60 rounded-sm mb-2" />
                    <span className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300">Door</span>
                  </button>
                </div>
              </div>

              {selectedAsset && (
                <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-neutral-400 dark:text-[#5a5650] uppercase tracking-wider font-extrabold">Active Asset Options</p>
                    <button
                      onClick={() => deleteAsset(selectedAsset.id)}
                      className="text-red-500 hover:text-red-600 text-[10px] font-bold flex items-center gap-1"
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  </div>
                  
                  <div className="bg-neutral-50 dark:bg-[#161616] p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-900 space-y-3">
                    <p className="text-[12px] font-extrabold text-neutral-800 dark:text-neutral-200 truncate">{selectedAsset.name}</p>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={rotateSelected}
                        className="flex items-center justify-center gap-1 py-1.5 bg-white dark:bg-[#222] border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-[10px] font-bold text-neutral-700 dark:text-neutral-300"
                      >
                        <RotateCw size={12} /> Rotate 45°
                      </button>

                      {selectedAsset.type === "table" && (
                        <button
                          onClick={() => changeSelectedShape(selectedAsset.shape === "round" ? "rectangle" : "round")}
                          className="flex items-center justify-center gap-1 py-1.5 bg-white dark:bg-[#222] border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-[10px] font-bold text-neutral-700 dark:text-neutral-300"
                        >
                          Shape: {selectedAsset.shape === "round" ? "Round" : "Square"}
                        </button>
                      )}
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <label className="text-[9px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider font-extrabold block">Resize Asset</label>
                      <div className="flex gap-1.5">
                        <button onClick={() => resizeSelected(-10, 0)} className="flex-1 py-1 bg-white dark:bg-[#222] border border-neutral-200 dark:border-neutral-800 text-[10px] font-mono font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded text-neutral-600 dark:text-neutral-300">W-</button>
                        <button onClick={() => resizeSelected(10, 0)} className="flex-1 py-1 bg-white dark:bg-[#222] border border-neutral-200 dark:border-neutral-800 text-[10px] font-mono font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded text-neutral-600 dark:text-neutral-300">W+</button>
                        <button onClick={() => resizeSelected(0, -10)} className="flex-1 py-1 bg-white dark:bg-[#222] border border-neutral-200 dark:border-neutral-800 text-[10px] font-mono font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded text-neutral-600 dark:text-neutral-300">H-</button>
                        <button onClick={() => resizeSelected(0, 10)} className="flex-1 py-1 bg-white dark:bg-[#222] border border-neutral-200 dark:border-neutral-800 text-[10px] font-mono font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded text-neutral-600 dark:text-neutral-300">H+</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* SERVICE LIVE INTERACTION SIDEBAR */
            <div className="bg-white dark:bg-[#111] p-5 rounded-2xl border border-neutral-200 dark:border-[rgba(255,255,255,0.06)] space-y-4">
              <h3 className="text-[13px] font-extrabold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
                <LayoutGrid className="size-4 text-orange-500" /> Interactive Seating
              </h3>
              
              {!activeInteractAsset ? (
                <div className="text-center py-8">
                  <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-500 mx-auto mb-3">
                    <Info className="size-5 animate-pulse" />
                  </div>
                  <p className="text-[12px] font-bold text-neutral-700 dark:text-neutral-300">Select a Table</p>
                  <p className="text-[11px] text-neutral-400 dark:text-[#5a5650] max-w-[180px] mx-auto mt-1 leading-normal">
                    Click any table on the interactive layout to seat guests, assign wait staff, or clean/clear tables.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 pt-1">
                  {(() => {
                    const tableService = getTableService(activeInteractAsset.tableId);
                    if (!tableService) {
                      return <p className="text-[11px] text-red-500 font-bold bg-red-500/5 p-3 rounded-lg border border-red-500/10 flex items-center gap-1.5"><ShieldAlert size={14} /> Service state disconnected.</p>;
                    }

                    return (
                      <div className="space-y-4">
                        <div className="flex items-start justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
                          <div>
                            <h4 className="text-[16px] font-extrabold text-neutral-800 dark:text-neutral-100 leading-none">{activeInteractAsset.name}</h4>
                            <span className="text-[9px] font-bold text-neutral-400 dark:text-[#5a5650] uppercase mt-1.5 block">Seating Capacity: {activeInteractAsset.capacity || 4} Guests</span>
                          </div>
                          <span className={`px-2 py-0.5 text-[9px] rounded-md font-bold uppercase border ${getStatusLabelColor(tableService.status)}`}>
                            {tableService.status}
                          </span>
                        </div>

                        {/* Assign staff */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider font-extrabold block">Assign Waiter</label>
                          {tableService.server ? (
                            <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 dark:bg-[#161616] border border-neutral-200 dark:border-neutral-900">
                              <span className="text-[12px] font-bold text-neutral-700 dark:text-neutral-300">{tableService.server.name}</span>
                              <button
                                onClick={async () => {
                                  await assignServer(tableService.id, "");
                                  toast.success("Server unassigned");
                                }}
                                className="text-[10px] font-bold text-neutral-400 hover:text-red-500 transition-colors"
                              >
                                Release
                              </button>
                            </div>
                          ) : (
                            <select
                              onChange={async (e) => {
                                if (e.target.value) {
                                  await assignServer(tableService.id, e.target.value);
                                  toast.success("Server assigned to table");
                                }
                              }}
                              className="w-full h-9 bg-neutral-50 dark:bg-[#161616] border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 text-[11px] px-3.5 rounded-xl outline-none"
                            >
                              <option value="">Select wait staff...</option>
                              {staff.map(person => (
                                <option key={person.id} value={person.id}>
                                  {person.name} ({person.role})
                                </option>
                              ))}
                            </select>
                          )}
                        </div>

                        {/* Interactive Status buttons */}
                        <div className="space-y-1.5 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                          <label className="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider font-extrabold block mb-1">Set Table Status</label>
                          <div className="grid grid-cols-2 gap-2">
                            {tableService.status === "AVAILABLE" && (
                              <button
                                onClick={async () => {
                                  await updateTableService(tableService.id, "OCCUPIED");
                                  toast.success(`${activeInteractAsset.name} is now Occupied`);
                                }}
                                className="col-span-2 py-2 rounded-xl bg-[#f97316] text-white text-[11px] font-bold hover:bg-[#ea6c0a] transition-all flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/10"
                              >
                                <Play size={12} /> Seat Guests
                              </button>
                            )}

                            {tableService.status === "OCCUPIED" && (
                              <>
                                <button
                                  onClick={async () => {
                                    await updateTableService(tableService.id, "DIRTY");
                                    toast.success(`${activeInteractAsset.name} completed dining. Status: DIRTY.`);
                                  }}
                                  className="py-2 rounded-xl bg-red-500 text-white text-[11px] font-bold hover:bg-red-600 transition-all"
                                >
                                  Clear Table
                                </button>
                                <button
                                  onClick={async () => {
                                    await updateTableService(tableService.id, "AVAILABLE");
                                    toast.success(`${activeInteractAsset.name} cleared to AVAILABLE`);
                                  }}
                                  className="py-2 rounded-xl bg-green-500 text-white text-[11px] font-bold hover:bg-green-600 transition-all"
                                >
                                  Free Table
                                </button>
                              </>
                            )}

                            {tableService.status === "DIRTY" && (
                              <button
                                onClick={async () => {
                                  await updateTableService(tableService.id, "AVAILABLE");
                                  toast.success(`${activeInteractAsset.name} sanitized and clean!`);
                                }}
                                className="col-span-2 py-2 rounded-xl bg-green-500 text-white text-[11px] font-bold hover:bg-green-600 transition-all flex items-center justify-center gap-1"
                              >
                                Clean & Ready
                              </button>
                            )}

                            {tableService.status === "RESERVED" && (
                              <button
                                onClick={async () => {
                                  await updateTableService(tableService.id, "OCCUPIED");
                                  toast.success(`Welcome back! ${activeInteractAsset.name} is now seated.`);
                                }}
                                className="col-span-2 py-2 rounded-xl bg-[#f97316] text-white text-[11px] font-bold hover:bg-[#ea6c0a] transition-all"
                              >
                                Seat Reservation
                              </button>
                            )}

                            {tableService.status !== "RESERVED" && tableService.status !== "OCCUPIED" && (
                              <button
                                onClick={async () => {
                                  await updateTableService(tableService.id, "RESERVED");
                                  toast.success(`${activeInteractAsset.name} marked as RESERVED`);
                                }}
                                className="col-span-2 py-2 rounded-xl bg-[#3b82f6]/10 hover:bg-[#3b82f6]/20 border border-[#3b82f6]/25 text-[#3b82f6] text-[11px] font-bold transition-all"
                              >
                                Book/Reserve Table
                              </button>
                            )}
                          </div>
                        </div>

                        {tableService.notes && (
                          <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 text-[11px] text-neutral-500 dark:text-[#9a9488] italic">
                            💡 {tableService.notes}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* Quick Info Block */}
          <div className="bg-neutral-50 dark:bg-[#111] p-4.5 rounded-2xl border border-neutral-200 dark:border-[rgba(255,255,255,0.06)] flex gap-3 items-start">
            <HelpCircle className="size-4 text-orange-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-[10px] text-neutral-400 dark:text-[#5a5650] uppercase tracking-wider font-extrabold">Instructions</p>
              <p className="text-[11px] text-neutral-500 dark:text-[#9a9488] leading-relaxed">
                {isDesignMode 
                  ? "Drag elements to rearrange. Click to select. Use sidebar tools to add details, change sizes, or rotate structures." 
                  : "Tap any table directly on the map to review current wait staff assignments and seat/clear/clean dining actions."
                }
              </p>
            </div>
          </div>
        </div>

        {/* Right pane: Interactive Canvas area */}
        <div className="lg:col-span-3 overflow-auto bg-neutral-100 dark:bg-[#0c0c0c] border border-neutral-200 dark:border-[rgba(255,255,255,0.06)] rounded-3xl p-5 flex items-center justify-center min-h-[500px]">
          
          <div 
            ref={canvasRef}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="relative bg-white dark:bg-[#131313] rounded-2xl shadow-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 flex-shrink-0 select-none"
            style={{
              width: "800px",
              height: "600px",
              transform: `scale(${canvasScale})`,
              transformOrigin: "center center",
              transition: dragInfoRef.current ? "none" : "transform 0.2s ease-out",
              backgroundImage: isDesignMode && snapToGrid 
                ? "radial-gradient(rgba(249, 115, 22, 0.12) 1.5px, transparent 1.5px)" 
                : "radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)",
              backgroundSize: "20px 20px"
            }}
          >
            {/* Entrance visual label */}
            <div className="absolute top-0 left-10 px-3 py-1 bg-neutral-200 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 text-[9px] font-black uppercase tracking-wider rounded-b-lg border-x border-b border-neutral-300 dark:border-neutral-700 z-10">
              Reception / Entrance Area
            </div>

            {/* Assets mapping loop */}
            {assets.map((asset) => {
              const isSelected = selectedAssetId === asset.id;
              
              if (asset.type === "table") {
                const tableService = getTableService(asset.tableId);
                const status = tableService?.status || "AVAILABLE";
                const isRound = asset.shape === "round";

                return (
                  <div
                    key={asset.id}
                    onPointerDown={(e) => handlePointerDown(e, asset.id)}
                    onClick={() => {
                      if (!isDesignMode) {
                        setActiveInteractAsset(asset);
                      }
                    }}
                    className={`absolute flex flex-col items-center justify-center cursor-grab active:cursor-grabbing transition-all select-none border-2 text-center ${
                      isRound ? "rounded-full" : "rounded-2xl"
                    } ${
                      isDesignMode 
                        ? isSelected 
                          ? "border-[#f97316] bg-[#f97316]/10 shadow-lg shadow-[#f97316]/15 ring-2 ring-[#f97316]/20" 
                          : "border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-[#1a1a1a]/80 hover:border-neutral-300 hover:scale-102"
                        : activeInteractAsset?.id === asset.id
                        ? "border-[#f97316] ring-4 ring-orange-500/10 shadow-2xl scale-102"
                        : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 scale-100 hover:scale-101"
                    }`}
                    style={{
                      left: `${asset.x}px`,
                      top: `${asset.y}px`,
                      width: `${asset.w}px`,
                      height: `${asset.h}px`,
                      transform: `rotate(${asset.rotation}deg)`,
                      zIndex: isSelected ? 30 : 10
                    }}
                  >
                    {/* Live status colored glowing border indicator under service view */}
                    {!isDesignMode && (
                      <div 
                        className={`absolute inset-0.5 rounded-inherit border bg-gradient-to-br opacity-[0.95] flex flex-col items-center justify-center p-2.5 ${getStatusColor(status)}`}
                      >
                        <span className="text-[11px] font-black text-white truncate max-w-full drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
                          {asset.name}
                        </span>
                        
                        {tableService?.server && (
                          <span className="text-[8px] font-extrabold mt-1 text-white bg-black/35 px-1.5 py-0.5 rounded-full uppercase tracking-wider border border-white/10 scale-90 truncate max-w-full">
                            Server: {tableService.server.name.split(" ")[0]}
                          </span>
                        )}
                        
                        {!tableService?.server && (
                          <span className="text-[8px] font-extrabold mt-1 text-white/75 italic scale-90">
                            {asset.capacity || 4} Seats
                          </span>
                        )}
                      </div>
                    )}

                    {/* Designer View table detail mapping */}
                    {isDesignMode && (
                      <div className="p-2 flex flex-col items-center justify-center">
                        <span className="text-[10px] font-extrabold text-neutral-800 dark:text-neutral-200 truncate max-w-full leading-tight">
                          {asset.name}
                        </span>
                        <span className="text-[8px] text-neutral-400 dark:text-[#5a5650] mt-1 font-mono font-bold">
                          {asset.capacity || 4}p
                        </span>
                      </div>
                    )}
                  </div>
                );
              } else {
                // Decor elements mapping
                const getDecorStyle = () => {
                  switch (asset.type) {
                    case "wall":
                      return "bg-neutral-300 dark:bg-neutral-800 border-neutral-400 dark:border-neutral-700 shadow-sm";
                    case "plant":
                      return "bg-green-500/20 border-green-500/40 text-[18px] flex items-center justify-center rounded-full shadow-inner shadow-green-500/5";
                    case "bar":
                      return "bg-amber-950/20 dark:bg-amber-950/10 border-amber-900/40 rounded-xl flex items-center justify-center text-center text-amber-900/60 dark:text-amber-700/80 font-black text-[10px] uppercase tracking-wider";
                    case "door":
                      return "bg-yellow-600/20 border-dashed border-yellow-600/50 flex items-center justify-center text-[8px] text-yellow-600 font-bold uppercase tracking-wider";
                    default:
                      return "bg-neutral-200 dark:bg-neutral-900 border-neutral-300";
                  }
                };

                return (
                  <div
                    key={asset.id}
                    onPointerDown={(e) => handlePointerDown(e, asset.id)}
                    className={`absolute border flex items-center justify-center cursor-grab active:cursor-grabbing transition-all select-none ${getDecorStyle()} ${
                      isDesignMode && isSelected 
                        ? "ring-2 ring-orange-500 border-orange-500 scale-102" 
                        : "scale-100"
                    }`}
                    style={{
                      left: `${asset.x}px`,
                      top: `${asset.y}px`,
                      width: `${asset.w}px`,
                      height: `${asset.h}px`,
                      transform: `rotate(${asset.rotation}deg)`,
                      zIndex: isSelected ? 30 : 5
                    }}
                  >
                    {asset.type === "plant" && "🌿"}
                    {asset.type === "bar" && (
                      <div className="flex flex-col items-center p-1 truncate">
                        <span>BAR COUNTER</span>
                      </div>
                    )}
                    {asset.type === "door" && "DOORWAY"}
                    {asset.type === "wall" && isDesignMode && (
                      <span className="text-[7px] text-neutral-400 font-extrabold uppercase select-none">Divider</span>
                    )}
                  </div>
                );
              }
            })}

          </div>
        </div>

      </div>
    </div>
  );
}
