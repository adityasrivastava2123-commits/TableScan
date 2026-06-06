"use client";

import { useState, useEffect, useRef } from "react";
import {
  Plus, Trash2, RotateCw, Check, Info, Users, ShieldAlert,
  Sliders, LayoutGrid, Award, Play, Edit, HelpCircle, Save, Undo,
  BellRing, User, Clock, CheckCircle, Table as TableIcon, Sparkles,
  Coffee, DollarSign, CreditCard, ChevronRight, X, UserPlus, Flame,
  ChefHat, LogOut, Heart
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import axios from "axios";

interface Table {
  id: string;
  name: string;
  capacity?: number;
  qrToken?: string;
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
  order?: any;
}

interface FloorAsset {
  id: string;
  tableId?: string;
  type: "table" | "wall" | "plant" | "bar" | "door";
  name: string;
  shape: "rectangle" | "round";
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  capacity?: number;
}

interface FloorPlanEditorProps {
  locationId: string;
  restaurantId: string;
  tables: Table[];
  tableServices: TableService[];
  allTableServices: TableService[];
  staff: Staff[];
  updateTableService: (id: string, status: string) => Promise<any>;
  assignServer: (id: string, serverId: string) => Promise<void>;
  onSync: () => void;
  restaurant?: any;
}

// Rich Simulated Guest Details type
interface SimulatedGuest {
  seatNumber: number;
  name: string;
  vip: boolean;
  birthday: boolean;
  dietary: string[];
  notes: string;
  orderedItems: { name: string; price: number; status: "Ordered" | "Preparing" | "Ready" | "Served" }[];
}

interface SimulatedTableState {
  guests: SimulatedGuest[];
  orderProgress: number;
  kitchenProgress: number;
  serviceProgress: number;
  billingProgress: number;
  lastInteraction: string;
  billEmerging: boolean;
  discountApplied: number; // percentage
  splitCount: number;
}

interface DishFlight {
  id: string;
  tableId: string;
  name: string;
  icon: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export default function FloorPlanEditor({
  locationId,
  restaurantId,
  tables,
  tableServices,
  allTableServices,
  staff,
  updateTableService,
  assignServer,
  onSync,
  restaurant
}: FloorPlanEditorProps) {
  const [isDesignMode, setIsDesignMode] = useState(false);
  const [showToolsMobile, setShowToolsMobile] = useState(false);
  const [assets, setAssets] = useState<FloorAsset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [canvasScale, setCanvasScale] = useState(1);

  // Active expanded table for Apple Dynamic Island
  const [activeInteractAsset, setActiveInteractAsset] = useState<FloorAsset | null>(null);
  const [expansionOrigin, setExpansionOrigin] = useState<{ x: number; y: number } | null>(null);
  const [selectedGuestSeat, setSelectedGuestSeat] = useState<number>(1);
  const [showUPIModal, setShowUPIModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);

  // Dish preparation flights and simulation state
  const [dishFlights, setDishFlights] = useState<DishFlight[]>([]);
  const [ripples, setRipples] = useState<{ tableId: string; x: number; y: number }[]>([]);

  // Simulation store for local visual additions (seats, progress)
  const [simulatedStates, setSimulatedStates] = useState<Record<string, SimulatedTableState>>({});
 
  // Real menu items and ordering tray
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [tray, setTray] = useState<{ menuItemId: string; quantity: number; price: number; name: string }[]>([]);
  const [selectedMenuItemId, setSelectedMenuItemId] = useState<string>("");
  const [trayQuantity, setTrayQuantity] = useState<number>(1);

  useEffect(() => {
    if (restaurantId) {
      axios.get(`/api/menu/items?restaurantId=${restaurantId}`)
        .then((res) => {
          setMenuItems(res.data);
          if (res.data.length > 0) {
            setSelectedMenuItemId(res.data[0].id);
          }
        })
        .catch((err) => console.error("Failed to fetch menu items", err));
    }
  }, [restaurantId]);

  const handleAddToTray = () => {
    if (!selectedMenuItemId) return;
    const item = menuItems.find((m) => m.id === selectedMenuItemId);
    if (!item) return;

    setTray((prev) => {
      const existing = prev.find((x) => x.menuItemId === selectedMenuItemId);
      if (existing) {
        return prev.map((x) =>
          x.menuItemId === selectedMenuItemId
            ? { ...x, quantity: x.quantity + trayQuantity }
            : x
        );
      }
      return [...prev, { menuItemId: item.id, quantity: trayQuantity, price: item.price, name: item.name }];
    });
    setTrayQuantity(1);
    toast.success(`${item.name} added to tray`);
  };

  const handleRemoveFromTray = (menuItemId: string) => {
    setTray((prev) => prev.filter((x) => x.menuItemId !== menuItemId));
  };

  const handlePlaceOrder = async (tableServiceId: string, qrToken: string) => {
    if (tray.length === 0) {
      toast.error("Tray is empty!");
      return;
    }

    const orderPayload = {
      tableToken: qrToken,
      restaurantId,
      customerName: "Table Host",
      paymentMethod: "ONLINE",
      items: tray.map((x) => ({
        menuItemId: x.menuItemId,
        quantity: x.quantity,
        price: x.price
      }))
    };

    try {
      const res = await axios.post("/api/orders", orderPayload);
      const orderId = res.data.orderId;
      // Link order to table service
      try {
        await axios.patch(`/api/table-service/${tableServiceId}`, { orderId, status: "OCCUPIED" });
        toast.success("Order submitted to database successfully!");
        setTray([]);
        onSync();
      } catch (patchErr) {
        console.error("Failed to link order to table service:", patchErr);
        toast.error("Order created but failed to link to table");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to place order in database");
    }
  };

  const canvasRef = useRef<HTMLDivElement>(null);
  const dragInfoRef = useRef<{
    assetId: string;
    startX: number;
    startY: number;
    startAssetX: number;
    startAssetY: number;
  } | null>(null);

  // Kitchen position on 800x600 coordinate grid
  const KITCHEN_COORD = { x: 710, y: 70 };

  // Load layout from localStorage
  useEffect(() => {
    const storageKey = `serveaura_floorplan_${locationId}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as FloorAsset[];
        // Sanitize coordinates to pull back any assets outside the 800x600 grid bounds
        const sanitized = parsed.map((asset) => {
          const w = asset.w || 60;
          const h = asset.h || 60;
          const rawX = typeof asset.x === "number" && !isNaN(asset.x) ? asset.x : 200;
          const rawY = typeof asset.y === "number" && !isNaN(asset.y) ? asset.y : 200;
          const x = Math.max(0, Math.min(800 - w, rawX));
          const y = Math.max(0, Math.min(600 - h, rawY));
          // Snap to 20px grid
          const snappedX = Math.round(x / 20) * 20;
          const snappedY = Math.round(y / 20) * 20;
          return { ...asset, x: snappedX, y: snappedY };
        });
        setAssets(sanitized);
        localStorage.setItem(storageKey, JSON.stringify(sanitized));
      } catch (e) {
        console.error("Failed to load floorplan layout", e);
      }
    } else {
      // Auto-populate layout with default configuration
      const defaultAssets: FloorAsset[] = [];
      let currentX = 80;
      let currentY = 140; // Avoid overlapping with Cocktail Bar at (40, 40)

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
        if (currentX > 680) {
          currentX = 80;
          currentY += 100;
          if (currentY > 500) {
            currentY = 140; // Wrap back within bounds
          }
        }
      });

      // Add a couple of default decor items
      defaultAssets.push({
        id: "decor_bar_1",
        type: "bar",
        name: "Cocktail Bar",
        shape: "rectangle",
        x: 40,
        y: 40,
        w: 220,
        h: 60,
        rotation: 0
      });

      defaultAssets.push({
        id: "decor_plant_1",
        type: "plant",
        name: "Lobby Fig",
        shape: "round",
        x: 360,
        y: 40,
        w: 40,
        h: 40,
        rotation: 0
      });

      defaultAssets.push({
        id: "decor_plant_2",
        type: "plant",
        name: "Restroom Fig",
        shape: "round",
        x: 40,
        y: 520,
        w: 40,
        h: 40,
        rotation: 0
      });

      setAssets(defaultAssets);
    }
  }, [locationId, tables]);

  // Save layout to localStorage
  const saveLayout = (updatedAssets = assets) => {
    const storageKey = `serveaura_floorplan_${locationId}`;
    localStorage.setItem(storageKey, JSON.stringify(updatedAssets));
    toast.success("Layout configuration saved");
  };

  // Generate deterministic details for simulated guest seating
  const getOrCreateSimulatedState = (tableId: string, status: string, capacity: number): SimulatedTableState => {
    // If we already have a customized local state for this table, we can return it.
    // However, if the status has changed on the server, we might want to refresh.
    // Let's check if there is a real DB order linked to this table service.
    const tableService = getTableService(tableId);
    const seed = tableId.charCodeAt(0) + tableId.charCodeAt(tableId.length - 1);

    if (tableService && tableService.order) {
      const realOrder = tableService.order;
      const realItems = (realOrder as any).items || [];
      
      // Distribute the real items among the guest seats
      const activeItemsList: { name: string; price: number; status: "Ordered" | "Preparing" | "Ready" | "Served" }[] = [];
      realItems.forEach((ri: any) => {
        const itemStatus = ri.isCompleted 
          ? "Served" 
          : (realOrder.status === "PREPARING" 
              ? "Preparing" 
              : (realOrder.status === "READY" ? "Ready" : "Ordered"));
        for (let q = 0; q < ri.quantity; q++) {
          activeItemsList.push({
            name: ri.menuItem.name,
            price: ri.menuItem.price || ri.price,
            status: itemStatus
          });
        }
      });

      const guestNames = ["Aditya", "Esha", "Nikhil", "Pooja", "Vikram", "Rohan", "Sanjana", "Karan"];
      const guestCount = Math.max(1, Math.min(activeItemsList.length, capacity));
      const guests: SimulatedGuest[] = [];

      for (let i = 1; i <= capacity; i++) {
        if (i <= guestCount) {
          const seatItems: typeof activeItemsList = [];
          const itemsPerGuest = Math.ceil(activeItemsList.length / guestCount);
          const startIndex = (i - 1) * itemsPerGuest;
          const endIndex = Math.min(startIndex + itemsPerGuest, activeItemsList.length);
          for (let k = startIndex; k < endIndex; k++) {
            seatItems.push(activeItemsList[k]);
          }

          guests.push({
            seatNumber: i,
            name: guestNames[(i + seed) % guestNames.length],
            vip: status === "VIP" || i === 1,
            birthday: (i + seed) % 6 === 0,
            dietary: (i + seed) % 4 === 0 ? ["Vegan"] : [],
            notes: i === 1 ? "Prefers water with ice" : "",
            orderedItems: seatItems
          });
        } else {
          guests.push({
            seatNumber: i,
            name: `Seat ${i}`,
            vip: false,
            birthday: false,
            dietary: [],
            notes: "",
            orderedItems: []
          });
        }
      }

      // Map real DB order status to progress segments
      let orderProgress = 100;
      let kitchenProgress = 0;
      let serviceProgress = 0;
      let billingProgress = 0;

      if (realOrder.status === "PREPARING") {
        kitchenProgress = 60;
      } else if (realOrder.status === "READY") {
        kitchenProgress = 100;
        serviceProgress = 85;
      } else if (realOrder.status === "DONE") {
        kitchenProgress = 100;
        serviceProgress = 100;
        billingProgress = 100;
      } else if (realOrder.status === "NEW") {
        orderProgress = 70;
      }

      const cached = simulatedStates[tableId];
      const state: SimulatedTableState = {
        guests,
        orderProgress,
        kitchenProgress,
        serviceProgress,
        billingProgress,
        lastInteraction: "3m ago",
        billEmerging: cached ? cached.billEmerging : false,
        discountApplied: cached ? cached.discountApplied : 0,
        splitCount: cached ? cached.splitCount : 1
      };

      return state;
    }

    // Default simulation fallback if no DB order exists
    if (simulatedStates[tableId]) {
      return simulatedStates[tableId];
    }

    const defaultNames = ["Aditya", "Esha", "Nikhil", "Pooja", "Vikram", "Rohan", "Sanjana", "Karan"];
    const dietaryPrefs = ["Vegan", "Gluten-Free", "Nut Allergy", "Dairy-Free"];
    const premiumDishes = [
      { name: "Truffle Tagliolini", price: 32 },
      { name: "Wood-Fired Ribeye", price: 54 },
      { name: "Chilean Sea Bass", price: 46 },
      { name: "Burrata Crostini", price: 18 },
      { name: "Heirloom Tomato Salad", price: 14 },
      { name: "Crispy Brussels Sprouts", price: 12 },
      { name: "Warm Chocolate Lava Cake", price: 12 },
      { name: "Cabernet Sauvignon Glass", price: 16 }
    ];

    const guests: SimulatedGuest[] = [];
    const guestCount = status === "AVAILABLE" || status === "DIRTY" ? 0 : (seed % capacity) + 1 || 1;

    for (let i = 1; i <= capacity; i++) {
      if (i <= guestCount) {
        const guestSeed = seed + i;
        const name = defaultNames[guestSeed % defaultNames.length];
        const vip = guestSeed % 5 === 0 || status === "VIP";
        const birthday = guestSeed % 7 === 0;
        const dietary: string[] = [];
        if (guestSeed % 4 === 0) {
          dietary.push(dietaryPrefs[guestSeed % dietaryPrefs.length]);
        }

        const orderedItems: SimulatedGuest["orderedItems"] = [];
        const dishCount = (guestSeed % 3) + 1;
        for (let d = 0; d < dishCount; d++) {
          const dish = premiumDishes[(guestSeed + d) % premiumDishes.length];
          const itemStatus: "Ordered" | "Preparing" | "Ready" | "Served" =
            status === "ORDERING"
              ? "Ordered"
              : status === "PREPARING"
              ? d % 2 === 0
                ? "Preparing"
                : "Ordered"
              : "Served";
          orderedItems.push({ ...dish, status: itemStatus });
        }

        guests.push({
          seatNumber: i,
          name,
          vip,
          birthday,
          dietary,
          notes: guestSeed % 6 === 0 ? "Prefers dressing on the side" : "",
          orderedItems
        });
      } else {
        guests.push({
          seatNumber: i,
          name: `Seat ${i}`,
          vip: false,
          birthday: false,
          dietary: [],
          notes: "",
          orderedItems: []
        });
      }
    }

    let orderProgress = 0;
    let kitchenProgress = 0;
    let serviceProgress = 0;
    let billingProgress = 0;

    if (status !== "AVAILABLE") {
      orderProgress = 100;
      if (status === "PREPARING") {
        kitchenProgress = 55;
      } else if (status === "EATING" || status === "VIP" || status === "ATTENTION") {
        kitchenProgress = 100;
        serviceProgress = 80;
      } else if (status === "DIRTY") {
        kitchenProgress = 100;
        serviceProgress = 100;
        billingProgress = 100;
      } else if (status === "ORDERING") {
        orderProgress = 40;
      }
    }

    const state: SimulatedTableState = {
      guests,
      orderProgress,
      kitchenProgress,
      serviceProgress,
      billingProgress,
      lastInteraction: `${(seed % 10) + 2}m ago`,
      billEmerging: false,
      discountApplied: 0,
      splitCount: 1
    };

    setSimulatedStates((prev) => ({ ...prev, [tableId]: state }));
    return state;
  };

  const getTableService = (tableId?: string) => {
    if (!tableId) return null;
    return tableServices.find((s) => s.table.id === tableId) || null;
  };

  const getServiceCall = (notes?: string) => {
    if (!notes) return null;
    try {
      const parsed = JSON.parse(notes);
      return parsed.serviceCall?.status === "OPEN" ? parsed.serviceCall : null;
    } catch {
      return null;
    }
  };

  // Helper to color-code statuses
  const getStatusDetails = (status: string, hasRequest = false) => {
    if (hasRequest) {
      return {
        bg: "bg-red-500/10 border-red-500/40 text-red-400 shadow-red-500/10",
        glow: "shadow-red-500/30",
        text: "Needs Attention"
      };
    }
    switch (status) {
      case "AVAILABLE":
        return {
          bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-emerald-500/10",
          glow: "shadow-emerald-500/20",
          text: "Ready / Clean"
        };
      case "BROWSING":
        return {
          bg: "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-emerald-500/15",
          glow: "shadow-emerald-500/25",
          text: "Browsing Menu"
        };
      case "ORDERING":
        return {
          bg: "bg-blue-500/10 border-blue-500/40 text-blue-400 shadow-blue-500/10",
          glow: "shadow-blue-500/25",
          text: "Ordering"
        };
      case "PREPARING":
        return {
          bg: "bg-orange-500/10 border-orange-500/40 text-orange-400 shadow-orange-500/10",
          glow: "shadow-orange-500/25",
          text: "Food Preparing"
        };
      case "EATING":
        return {
          bg: "bg-purple-500/10 border-purple-500/40 text-purple-400 shadow-purple-500/10",
          glow: "shadow-purple-500/25",
          text: "Eating"
        };
      case "ATTENTION":
        return {
          bg: "bg-red-500/15 border-red-500/50 text-red-400 shadow-red-500/15 animate-pulse",
          glow: "shadow-red-500/30",
          text: "Needs Attention"
        };
      case "VIP":
        return {
          bg: "bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-amber-500/20",
          glow: "shadow-amber-500/30 border-dashed",
          text: "VIP Guests"
        };
      case "DIRTY":
        return {
          bg: "bg-rose-900/25 border-rose-500/40 text-rose-300 shadow-rose-900/10",
          glow: "shadow-rose-900/20",
          text: "Bussing / Dirty"
        };
      case "RESERVED":
        return {
          bg: "bg-cyan-500/10 border-cyan-500/40 text-cyan-400 shadow-cyan-500/10",
          glow: "shadow-cyan-500/20",
          text: "Reserved"
        };
      default:
        return {
          bg: "bg-neutral-800/40 border-neutral-700 text-neutral-400 shadow-none",
          glow: "shadow-none",
          text: status
        };
    }
  };

  // Drag and Drop implementation for tables in Design Mode
  const handlePointerDown = (e: React.PointerEvent, assetId: string) => {
    if (!isDesignMode) return;
    e.preventDefault();
    setSelectedAssetId(assetId);

    const asset = assets.find((a) => a.id === assetId);
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

    if (snapToGrid) {
      targetX = Math.round(targetX / 20) * 20;
      targetY = Math.round(targetY / 20) * 20;
    }

    const asset = assets.find((a) => a.id === info.assetId);
    const assetW = asset?.w || 60;
    const assetH = asset?.h || 60;

    targetX = Math.max(0, Math.min(800 - assetW, targetX));
    targetY = Math.max(0, Math.min(600 - assetH, targetY));

    setAssets((prev) =>
      prev.map((a) => {
        if (a.id === info.assetId) {
          return { ...a, x: targetX, y: targetY };
        }
        return a;
      })
    );
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

  // Drag and Drop Waiter assignments
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropStaff = async (e: React.DragEvent, tableServiceId: string) => {
    e.preventDefault();
    const staffId = e.dataTransfer.getData("staffId");
    if (staffId && tableServiceId) {
      await assignServer(tableServiceId, staffId);
      onSync();
    }
  };

  // Trigger floating service request (Water, Bill, Plate, Manager)
  const triggerServiceRequest = async (tableId: string, tableServiceId: string, requestType: string) => {
    try {
      const typeLabel = requestType.toUpperCase();
      let emoji = "💡";
      if (typeLabel === "WATER") emoji = "💧";
      if (typeLabel === "BILL") emoji = "🧾";
      if (typeLabel === "EXTRA_PLATE") emoji = "🍽";
      if (typeLabel === "MANAGER") emoji = "👨🍳";

      const notePayload = JSON.stringify({
        serviceCall: {
          type: typeLabel,
          message: `${emoji} Requesting ${requestType.replace("_", " ").toLowerCase()}`,
          status: "OPEN",
          requestedAt: new Date().toISOString()
        }
      });

      await axios.patch(`/api/table-service/${tableServiceId}`, { notes: notePayload });
      toast.success(`${requestType.replace("_", " ")} request raised`);
      onSync();
    } catch {
      toast.error("Failed to raise request");
    }
  };

  // Resolve service call request
  const handleResolveRequest = async (tableServiceId: string) => {
    try {
      await axios.patch(`/api/table-service/${tableServiceId}`, { resolveServiceCall: true });
      toast.success("Request resolved");
      onSync();
    } catch {
      toast.error("Failed to resolve request");
    }
  };

  // Simulate Dish Preparation & Delivery Path Animation
  const simulateDishDelivery = (tableId: string, tableName: string, targetX: number, targetY: number) => {
    const dishes = ["🍕 Pizza", "🍜 Ramen", "🍹 Cocktail", "🍰 Torte", "🍔 Slider"];
    const chosen = dishes[Math.floor(Math.random() * dishes.length)];
    const parts = chosen.split(" ");
    const icon = parts[0];
    const name = parts[1];

    const flightId = `flight_${Date.now()}`;
    const newFlight: DishFlight = {
      id: flightId,
      tableId,
      name,
      icon,
      startX: KITCHEN_COORD.x,
      startY: KITCHEN_COORD.y,
      endX: targetX,
      endY: targetY
    };

    setDishFlights((prev) => [...prev, newFlight]);
    toast(`Preparing Chef's ${name} for ${tableName}...`, {
      icon: "👨‍🍳",
      duration: 2000
    });
  };

  const handleDishArrived = (flightId: string, tableId: string, dishName: string, endX: number, endY: number) => {
    // Remove flight
    setDishFlights((prev) => prev.filter((f) => f.id !== flightId));

    // Trigger ripple animation
    const rippleId = `${tableId}_${Date.now()}`;
    setRipples((prev) => [...prev, { tableId, x: endX, y: endY }]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.tableId !== tableId));
    }, 1000);

    toast.success(`${dishName} delivered to Table!`, {
      icon: "✨"
    });

    // Auto update status to EATING
    const service = getTableService(tableId);
    if (service && service.status === "PREPARING") {
      updateTableService(service.id, "EATING").then(() => {
        // Force kitchen and service progress updates in simulated states
        setSimulatedStates((prev) => {
          const current = prev[tableId];
          if (current) {
            return {
              ...prev,
              [tableId]: {
                ...current,
                kitchenProgress: 100,
                serviceProgress: 80
              }
            };
          }
          return prev;
        });
        onSync();
      });
    }
  };

  // Asset creation
  const addDecor = (type: "wall" | "plant" | "bar" | "door") => {
    let name = "";
    let w = 60;
    let h = 60;
    let shape: "rectangle" | "round" = "rectangle";

    switch (type) {
      case "wall":
        name = "Room Divider";
        w = 120;
        h = 20;
        shape = "rectangle";
        break;
      case "plant":
        name = "Fiddle Fig";
        w = 40;
        h = 40;
        shape = "round";
        break;
      case "bar":
        name = "Cocktail Counter";
        w = 180;
        h = 60;
        shape = "rectangle";
        break;
      case "door":
        name = "Doorway";
        w = 80;
        h = 20;
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
    const table = tables.find((t) => t.id === tableId);
    if (!table) return;

    if (assets.some((a) => a.tableId === tableId)) {
      toast.error("Table is already placed on floor plan");
      return;
    }

    const newAsset: FloorAsset = {
      id: `table_${table.id}`,
      tableId: table.id,
      type: "table",
      name: table.name,
      shape: "rectangle",
      x: 200,
      y: 200,
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
    const filtered = assets.filter((a) => a.id !== id);
    setAssets(filtered);
    if (selectedAssetId === id) setSelectedAssetId(null);
    saveLayout(filtered);
    toast.success("Asset removed");
  };

  const rotateSelected = () => {
    if (!selectedAssetId) return;
    const updated = assets.map((a) => {
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
    const updated = assets.map((a) => {
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
    const updated = assets.map((a) => {
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

  // Billing Actions
  const handleApplyDiscount = (tableId: string) => {
    setSimulatedStates((prev) => {
      const current = prev[tableId];
      if (current) {
        const nextDisc = current.discountApplied === 10 ? 0 : 10;
        toast.success(nextDisc ? "10% Discount Applied" : "Discount Removed");
        return {
          ...prev,
          [tableId]: { ...current, discountApplied: nextDisc }
        };
      }
      return prev;
    });
  };

  const handleSplitBill = (tableId: string, maxSplit: number) => {
    setSimulatedStates((prev) => {
      const current = prev[tableId];
      if (current) {
        const nextSplit = current.splitCount === maxSplit ? 1 : current.splitCount + 1;
        toast(`Bill split between ${nextSplit} guests`);
        return {
          ...prev,
          [tableId]: { ...current, splitCount: nextSplit }
        };
      }
      return prev;
    });
  };

  const handleCloseTable = async (tableServiceId: string, tableId: string) => {
    try {
      await updateTableService(tableServiceId, "AVAILABLE");
      // Reset simulated details
      setSimulatedStates((prev) => {
        const updated = { ...prev };
        delete updated[tableId];
        return updated;
      });
      setActiveInteractAsset(null);
      onSync();
      toast.success("Table settled and cleared!", { icon: "💳" });
    } catch {
      toast.error("Failed to close table");
    }
  };

  // Roster workload calculation helper
  const getWaiterWorkload = (waiterId: string) => {
    return allTableServices.filter((s) => s.server?.id === waiterId && s.status !== "AVAILABLE" && s.status !== "DIRTY").length;
  };

  const placedTableIds = assets.filter((a) => a.type === "table").map((a) => a.tableId);
  const unplacedTables = tables.filter((t) => !placedTableIds.includes(t.id));
  const selectedAsset = assets.find((a) => a.id === selectedAssetId);

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      {/* Simulation Helper Banner */}
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-amber-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
            Simulation Control Panel
          </span>
          <span className="text-[10px] text-white/50 hidden md:inline">
            — Update table states, drag servers, dispatch dishes, and trigger floating signals
          </span>
        </div>
        <button
          onClick={() => {
            setIsDesignMode(!isDesignMode);
            setSelectedAssetId(null);
            setActiveInteractAsset(null);
            setShowToolsMobile(!isDesignMode);
          }}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] uppercase tracking-wider font-extrabold transition-all border ${
            isDesignMode
              ? "bg-amber-500 border-amber-600 text-black hover:bg-amber-400"
              : "bg-white/5 border-white/15 text-white hover:bg-white/10"
          }`}
        >
          {isDesignMode ? "Exit Designer Mode" : "Enter Designer Mode"}
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row relative min-h-0">
        {/* Roster & Design Editor Panel */}
        <div className={`w-full lg:w-72 shrink-0 border-r border-white/5 bg-black/30 backdrop-blur-md flex flex-col z-10 ${
          isDesignMode 
            ? (showToolsMobile 
                ? "fixed bottom-0 left-0 right-0 max-h-[50vh] lg:max-h-none lg:static bg-[#0d0c0b] lg:bg-black/30 border-t lg:border-t-0 border-white/10 rounded-t-3xl lg:rounded-t-none shadow-2xl lg:shadow-none overflow-y-auto flex"
                : "hidden lg:flex"
              )
            : "flex"
        }`}>
          {isDesignMode ? (
            /* DESIGNER PANEL */
            <div className="p-5 flex-1 overflow-y-auto space-y-6">
              <div>
                <h3 className="text-xs font-black uppercase text-amber-500 tracking-wider mb-3 flex items-center gap-1.5">
                  <Plus className="size-4" /> Place Dining Tables
                </h3>
                {unplacedTables.length === 0 ? (
                  <p className="text-[11px] text-white/40 bg-white/5 p-3.5 rounded-xl border border-white/5 leading-relaxed">
                    All tables registered under this location are placed on the canvas.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1">
                    {unplacedTables.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => addTableToFloor(t.id)}
                        className="flex flex-col text-left p-2 rounded-xl border border-white/10 bg-white/[0.02] hover:border-amber-500/50 hover:bg-amber-500/5 transition-all truncate"
                      >
                        <span className="text-[11px] font-bold text-white truncate">{t.name}</span>
                        <span className="text-[9px] text-white/40 font-mono mt-0.5">{t.capacity || 4} seats</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-xs font-black uppercase text-amber-500 tracking-wider mb-3 flex items-center gap-1.5">
                  <Sliders className="size-4" /> Architectural Decor
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => addDecor("wall")}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-white/10 bg-white/[0.02] hover:border-amber-500/30 hover:bg-amber-500/5 transition-all text-center"
                  >
                    <span className="w-10 h-2 bg-white/30 rounded-sm mb-2" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-white/80">Wall</span>
                  </button>
                  <button
                    onClick={() => addDecor("plant")}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-white/10 bg-white/[0.02] hover:border-amber-500/30 hover:bg-amber-500/5 transition-all text-center"
                  >
                    <span className="text-base mb-1">🌿</span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-white/80">Plant</span>
                  </button>
                  <button
                    onClick={() => addDecor("bar")}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-white/10 bg-white/[0.02] hover:border-amber-500/30 hover:bg-amber-500/5 transition-all text-center"
                  >
                    <span className="w-12 h-3 bg-amber-950/40 border border-amber-900/30 rounded-sm mb-2" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-white/80">Bar</span>
                  </button>
                  <button
                    onClick={() => addDecor("door")}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-white/10 bg-white/[0.02] hover:border-amber-500/30 hover:bg-amber-500/5 transition-all text-center"
                  >
                    <span className="w-10 h-1 bg-yellow-600/30 border border-dashed border-yellow-600/50 rounded-sm mb-2" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-white/80">Door</span>
                  </button>
                </div>
              </div>

              {selectedAsset && (
                <div className="pt-4 border-t border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] text-white/40 uppercase tracking-widest font-black">Asset Attributes</p>
                    <button
                      onClick={() => deleteAsset(selectedAsset.id)}
                      className="text-red-500 hover:text-red-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1"
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  </div>

                  <div className="bg-white/[0.02] border border-white/10 p-3.5 rounded-xl space-y-4">
                    <p className="text-[12px] font-bold text-white truncate leading-none">{selectedAsset.name}</p>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={rotateSelected}
                        className="flex items-center justify-center gap-1 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-lg text-[10px] font-black uppercase tracking-wider text-white"
                      >
                        <RotateCw size={11} /> Rotate
                      </button>

                      {selectedAsset.type === "table" && (
                        <button
                          onClick={() => changeSelectedShape(selectedAsset.shape === "round" ? "rectangle" : "round")}
                          className="flex items-center justify-center gap-1 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-lg text-[10px] font-black uppercase tracking-wider text-white"
                        >
                          Shape: {selectedAsset.shape === "round" ? "Round" : "Square"}
                        </button>
                      )}
                    </div>

                    <div className="space-y-2 pt-1 border-t border-white/5">
                      <label className="text-[9px] text-white/40 uppercase tracking-widest font-bold block">Size Tweaks</label>
                      <div className="grid grid-cols-4 gap-1">
                        <button onClick={() => resizeSelected(-10, 0)} className="py-1 bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono rounded font-bold text-white">W-</button>
                        <button onClick={() => resizeSelected(10, 0)} className="py-1 bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono rounded font-bold text-white">W+</button>
                        <button onClick={() => resizeSelected(0, -10)} className="py-1 bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono rounded font-bold text-white">H-</button>
                        <button onClick={() => resizeSelected(0, 10)} className="py-1 bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono rounded font-bold text-white">H+</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* STAFF ROSTER & WAIT STAFF ASSIGNMENT PANEL */
            <div className="p-3 sm:p-5 flex-1 flex flex-col min-h-0">
              <div className="shrink-0 mb-3 sm:mb-4">
                <h3 className="text-[10px] sm:text-xs font-black uppercase text-amber-500 tracking-wider flex items-center gap-1.5">
                  <Users className="size-3.5 sm:size-4" /> Staff Roster
                </h3>
                <p className="text-[9px] sm:text-[10px] text-white/40 mt-1 leading-normal">
                  Drag staff onto tables to assign them.
                </p>
              </div>

              {/* Roster Cards List */}
              <div className="flex-1 flex flex-row lg:flex-col overflow-x-auto lg:overflow-y-auto gap-2 lg:gap-0 lg:space-y-2 pr-1 py-1.5 lg:py-0 scrollbar-none">
                {staff.length === 0 ? (
                  // Fallbacks if no database staff exists
                  [
                    { id: "staff_1", name: "Marco Rossi", role: "WAITER" },
                    { id: "staff_2", name: "Sarah Connor", role: "WAITER" },
                    { id: "staff_3", name: "Vikram Sen", role: "WAITER" }
                  ].map((s) => {
                    const load = getWaiterWorkload(s.id);
                    return (
                      <div
                        key={s.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("staffId", s.id);
                          toast(`Assigning ${s.name}...`, { icon: "🏃‍♂️", duration: 1000 });
                        }}
                        className="p-2 sm:p-3 bg-white/[0.03] border border-white/10 hover:border-amber-500/30 hover:bg-white/[0.05] rounded-lg sm:rounded-xl flex items-center justify-between cursor-grab active:cursor-grabbing transition-all group shrink-0 w-44 lg:w-full"
                      >
                        <div className="flex items-center gap-2 sm:gap-2.5">
                          <div className="size-6 sm:size-7 rounded-full bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-[9px] sm:text-[10px] font-black text-amber-400">
                            {s.name.split(" ").map((n) => n[0]).join("")}
                          </div>
                          <div>
                            <p className="text-[10px] sm:text-xs font-bold text-white group-hover:text-amber-400 transition-colors truncate">
                              {s.name}
                            </p>
                            <p className="text-[8px] sm:text-[9px] text-white/40 font-mono tracking-wider mt-0.5">
                              {s.role}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[8px] sm:text-[9px] font-mono font-bold bg-white/5 border border-white/10 text-white/50 px-1.5 sm:px-2 py-0.5 rounded-full">
                            {load} active
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  staff
                    .filter((s) => s.role === "WAITER" || s.role === "ADMIN")
                    .map((s) => {
                      const load = getWaiterWorkload(s.id);
                      return (
                        <div
                          key={s.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("staffId", s.id);
                            toast(`Assigning ${s.name}...`, { icon: "🏃‍♂️", duration: 1000 });
                          }}
                          className="p-2 sm:p-3 bg-white/[0.03] border border-white/10 hover:border-amber-500/30 hover:bg-white/[0.05] rounded-lg sm:rounded-xl flex items-center justify-between cursor-grab active:cursor-grabbing transition-all group shrink-0 w-44 lg:w-full"
                        >
                          <div className="flex items-center gap-2 sm:gap-2.5">
                            <div className="size-6 sm:size-7 rounded-full bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-[9px] sm:text-[10px] font-black text-amber-400">
                              {s.name.split(" ").map((n) => n[0]).join("")}
                            </div>
                            <div>
                              <p className="text-[10px] sm:text-xs font-bold text-white group-hover:text-amber-400 transition-colors truncate">
                                {s.name}
                              </p>
                              <p className="text-[8px] sm:text-[9px] text-white/40 font-mono tracking-wider mt-0.5">
                                {s.role}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[8px] sm:text-[9px] font-mono font-bold bg-white/5 border border-white/10 text-white/50 px-1.5 sm:px-2 py-0.5 rounded-full">
                              {load} tables
                            </span>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Live Canvas Workspace Area */}
        <div className="flex-1 overflow-auto bg-[#0a0908] flex items-center justify-center p-2 sm:p-6 relative">
          {/* Blueprint style grid lines overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

          {/* Scale controls floating */}
          <div className="absolute top-2 sm:top-4 left-2 sm:left-4 z-20 flex bg-black/60 border border-white/10 p-0.5 sm:p-1 rounded-xl backdrop-blur-md">
            <button
              onClick={() => setCanvasScale((prev) => Math.max(0.4, prev - 0.08))}
              className="size-6 sm:size-7 flex items-center justify-center text-white/70 hover:text-white font-extrabold hover:bg-white/5 rounded-lg text-sm sm:text-base"
            >
              -
            </button>
            <div className="px-2 sm:px-3 flex items-center justify-center text-[9px] sm:text-[10px] font-mono-dashboard font-black text-white/50 uppercase tracking-widest min-w-[50px] sm:min-w-[70px]">
              {Math.round(canvasScale * 100)}%
            </div>
            <button
              onClick={() => setCanvasScale((prev) => Math.min(1.6, prev + 0.08))}
              className="size-6 sm:size-7 flex items-center justify-center text-white/70 hover:text-white font-extrabold hover:bg-white/5 rounded-lg text-sm sm:text-base"
            >
              +
            </button>
          </div>

          <div
            ref={canvasRef}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="relative bg-[#0d0c0b] rounded-2xl sm:rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.6)] border border-white/10 flex-shrink-0 select-none overflow-hidden"
            style={{
              width: "800px",
              height: "600px",
              transform: `scale(${canvasScale})`,
              transformOrigin: "center center",
              transition: dragInfoRef.current ? "none" : "transform 0.15s ease-out"
            }}
          >
            {/* SVG Flight paths for traveling food items */}
            <svg className="absolute inset-0 pointer-events-none w-full h-full z-20">
              {dishFlights.map((flight) => {
                // Curved quadratic bezier: Kitchen -> Ctrl Point -> Table
                const ctrlX = (flight.startX + flight.endX) / 2;
                const ctrlY = Math.min(flight.startY, flight.endY) - 100;
                const pathStr = `M ${flight.startX} ${flight.startY} Q ${ctrlX} ${ctrlY} ${flight.endX} ${flight.endY}`;

                return (
                  <g key={flight.id}>
                    {/* Glowing dotted line */}
                    <path
                      d={pathStr}
                      fill="none"
                      stroke="url(#orangeGlowGradient)"
                      strokeWidth="2"
                      strokeDasharray="4,4"
                      className="opacity-40"
                    />
                    <defs>
                      <linearGradient id="orangeGlowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity="0.2" />
                      </linearGradient>
                    </defs>
                  </g>
                );
              })}
            </svg>

            {/* Traveling Food items (Framer Motion Keyframes along flight paths) */}
            <AnimatePresence>
              {dishFlights.map((flight) => {
                const ctrlX = (flight.startX + flight.endX) / 2;
                const ctrlY = Math.min(flight.startY, flight.endY) - 100;

                return (
                  <motion.div
                    key={flight.id}
                    initial={{
                      x: flight.startX,
                      y: flight.startY,
                      scale: 0.4,
                      opacity: 0
                    }}
                    animate={{
                      x: [flight.startX, ctrlX, flight.endX],
                      y: [flight.startY, ctrlY, flight.endY],
                      scale: [0.4, 1.4, 0.8],
                      opacity: [0, 1, 1, 0.9]
                    }}
                    transition={{
                      duration: 2.2,
                      ease: "easeInOut"
                    }}
                    onAnimationComplete={() =>
                      handleDishArrived(flight.id, flight.tableId, flight.name, flight.endX, flight.endY)
                    }
                    className="absolute pointer-events-none z-30 text-2xl select-none"
                    style={{ marginLeft: "-16px", marginTop: "-16px" }}
                  >
                    <div className="relative flex items-center justify-center">
                      {/* Floating bubble background */}
                      <div className="absolute size-9 rounded-full bg-amber-500/10 border border-amber-500/40 blur-xs" />
                      <span className="relative drop-shadow-[0_2px_8px_rgba(249,115,22,0.6)] animate-bounce">
                        {flight.icon}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Static Kitchen Dispatch Area */}
            <div
              className="absolute bg-black/60 border border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.08)] rounded-2xl flex flex-col items-center justify-center text-center p-3"
              style={{
                left: `${KITCHEN_COORD.x - 60}px`,
                top: `${KITCHEN_COORD.y - 40}px`,
                width: "120px",
                height: "80px",
                zIndex: 5
              }}
            >
              <div className="absolute inset-0 rounded-inherit bg-gradient-to-b from-orange-500/5 to-transparent pointer-events-none" />
              <ChefHat className="size-4.5 text-orange-500 animate-pulse mb-1.5" />
              <p className="text-[9px] font-black uppercase tracking-wider text-orange-400 leading-none">
                KITCHEN
              </p>
              <p className="text-[8px] text-white/40 uppercase tracking-widest mt-1 font-mono-dashboard">
                DISPATCH
              </p>
              {/* Pulsing indicator */}
              <div className="absolute -top-1 -right-1 size-2 rounded-full bg-orange-500 animate-ping" />
            </div>

            {/* Entrance Way Indicator */}
            <div className="absolute left-10 bottom-0 px-4 py-1.5 bg-white/5 border-t border-x border-white/10 rounded-t-xl text-[9px] font-black tracking-widest uppercase text-white/40 z-5">
              🚪 Entrance
            </div>

            {/* Table / Decor assets mapper */}
            {assets.map((asset) => {
              const isSelected = selectedAssetId === asset.id;

              if (asset.type === "table") {
                const tableService = getTableService(asset.tableId);
                const status = tableService?.status || "AVAILABLE";
                const isRound = asset.shape === "round";

                // Resolve service requests note payload
                const hasCall = getServiceCall(tableService?.notes);
                const statusTheme = getStatusDetails(status, !!hasCall);

                // Fetch simulated details for current table (e.g. running bill)
                const simState = tableService
                  ? getOrCreateSimulatedState(tableService.table.id, status, asset.capacity || 4)
                  : null;

                // Total running bill from all seat items
                let runningBillSum = 0;
                if (simState) {
                  simState.guests.forEach((g) => {
                    g.orderedItems.forEach((item) => {
                      runningBillSum += item.price;
                    });
                  });
                }

                // Wave ripple if a dish recently arrived
                const isRippling = ripples.some((r) => r.tableId === asset.tableId);

                return (
                  <div
                    key={asset.id}
                    onPointerDown={(e) => handlePointerDown(e, asset.id)}
                    onClick={() => {
                      if (!isDesignMode) {
                        setActiveInteractAsset(asset);
                        setExpansionOrigin({ x: asset.x + asset.w / 2, y: asset.y + asset.h / 2 });
                        setSelectedGuestSeat(1);
                      }
                    }}
                    onDragOver={handleDragOver}
                    onDrop={(e) => tableService && handleDropStaff(e, tableService.id)}
                    className={`absolute flex flex-col items-center justify-center cursor-pointer transition-all select-none touch-none border-2 text-center relative group ${
                      isRound ? "rounded-full" : "rounded-2xl"
                    } ${
                      isDesignMode
                        ? isSelected
                          ? "border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/15"
                          : "border-white/10 bg-white/[0.03] hover:border-white/20"
                        : activeInteractAsset?.id === asset.id
                        ? "border-amber-500 ring-4 ring-amber-500/10 shadow-2xl scale-102 z-20"
                        : `${statusTheme.bg} ${statusTheme.glow} hover:scale-103 hover:border-white/30 z-10`
                    }`}
                    style={{
                      left: `${asset.x}px`,
                      top: `${asset.y}px`,
                      width: `${asset.w}px`,
                      height: `${asset.h}px`,
                      transform: `rotate(${asset.rotation}deg)`
                    }}
                  >
                    {/* Ripple visual wave */}
                    {isRippling && (
                      <div className="absolute inset-0 rounded-inherit border-2 border-orange-500 animate-ping opacity-75 pointer-events-none" />
                    )}

                    {/* Floor Plan Display inside Table */}
                    <div className="p-1 flex flex-col items-center justify-center pointer-events-none select-none">
                      {/* Table name */}
                      <span className="text-[12px] font-black text-white leading-none">
                        {asset.name}
                      </span>

                      {/* Details visible 10ft away */}
                      {!isDesignMode && tableService && (
                        <div className="flex flex-col items-center mt-1 space-y-0.5">
                          {/* Guest counts & seating */}
                          {status !== "AVAILABLE" && status !== "DIRTY" && (
                            <span className="text-[9px] font-extrabold text-white/60 tracking-wider">
                              👥 {simState?.guests.filter((g) => g.orderedItems.length > 0).length || 0} /{" "}
                              {asset.capacity || 4}
                            </span>
                          )}

                          {/* Running Bill */}
                          {runningBillSum > 0 && (
                            <span className="text-[9px] font-mono-dashboard font-black text-emerald-400 bg-emerald-500/5 px-1 py-0.5 rounded border border-emerald-500/10">
                              ₹{runningBillSum}
                            </span>
                          )}

                          {/* Server */}
                          {tableService.server && (
                            <span className="text-[8px] font-black uppercase tracking-widest text-white/30 truncate max-w-[50px]">
                              {tableService.server.name.split(" ")[0]}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Capacity only in design mode */}
                      {isDesignMode && (
                        <span className="text-[8px] text-white/30 font-mono mt-1">
                          {asset.capacity || 4}P
                        </span>
                      )}
                    </div>

                    {/* Floating Service Request signals above the table */}
                    {!isDesignMode && hasCall && tableService && (
                      <motion.div
                        animate={{ y: [0, -6, 0] }}
                        transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                        className="absolute -top-8 left-1/2 -translate-x-1/2 bg-red-600 text-white font-bold backdrop-blur-md px-2 py-0.5 rounded-full text-[9px] shadow-lg shadow-red-500/30 border border-red-500/40 flex items-center gap-1 z-30 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResolveRequest(tableService.id);
                        }}
                      >
                        <span>{hasCall.type === "WATER" ? "💧" : hasCall.type === "BILL" ? "🧾" : hasCall.type === "EXTRA_PLATE" ? "🍽" : "👨🍳"}</span>
                        <span className="uppercase text-[8px] font-black tracking-wider">{hasCall.type.replace("_", " ")}</span>
                      </motion.div>
                    )}
                  </div>
                );
              } else {
                // Architectural decor objects
                const getDecorStyle = () => {
                  switch (asset.type) {
                    case "wall":
                      return "bg-neutral-800 border-neutral-700 shadow-sm";
                    case "plant":
                      return "bg-emerald-500/10 border-emerald-500/30 text-[18px] flex items-center justify-center rounded-full shadow-inner";
                    case "bar":
                      return "bg-amber-950/20 border-amber-900/30 rounded-xl flex items-center justify-center text-center text-amber-900/50 font-black text-[9px] uppercase tracking-widest";
                    case "door":
                      return "bg-yellow-600/10 border-dashed border-yellow-600/40 flex items-center justify-center text-[7px] text-yellow-600/80 font-bold uppercase tracking-wider";
                    default:
                      return "bg-neutral-800 border-neutral-700";
                  }
                };

                return (
                  <div
                    key={asset.id}
                    onPointerDown={(e) => handlePointerDown(e, asset.id)}
                    className={`absolute border flex items-center justify-center cursor-pointer transition-all select-none touch-none ${getDecorStyle()} ${
                      isDesignMode && isSelected
                        ? "ring-2 ring-amber-500 border-amber-500 scale-102 z-20"
                        : ""
                    }`}
                    style={{
                      left: `${asset.x}px`,
                      top: `${asset.y}px`,
                      width: `${asset.w}px`,
                      height: `${asset.h}px`,
                      transform: `rotate(${asset.rotation}deg)`,
                      zIndex: 5
                    }}
                  >
                    {asset.type === "plant" && "🌿"}
                    {asset.type === "bar" && "BAR"}
                    {asset.type === "door" && "DOOR"}
                  </div>
                );
              }
            })}

            {/* Apple Dynamic Island Expand Modal Overlay */}
            <AnimatePresence>
              {activeInteractAsset && (
                <>
                  {/* Blur backdrop overlay */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setActiveInteractAsset(null)}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40"
                  />

                  {/* Dynamic Island Window Panel */}
                  {(() => {
                    const tableService = getTableService(activeInteractAsset.tableId);
                    if (!tableService) {
                      return (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 / canvasScale }}
                          animate={{ opacity: 1, scale: 1 / canvasScale }}
                          exit={{ opacity: 0, scale: 0.9 / canvasScale }}
                          className="absolute w-[360px] h-[200px] left-1/2 top-1/2 bg-[#0d0b0a] border border-white/10 shadow-2xl rounded-3xl p-6 z-50 flex flex-col items-center justify-center text-center -ml-[180px] -mt-[100px]"
                        >
                          <ShieldAlert className="size-8 text-red-500 mb-3 animate-pulse" />
                          <p className="text-sm font-bold text-white">Table Service Disconnected</p>
                          <p className="text-xs text-white/40 mt-1">This table does not have an active service session.</p>
                          <button
                            onClick={() => setActiveInteractAsset(null)}
                            className="mt-4 px-4 py-1.5 bg-white/10 hover:bg-white/15 border border-white/10 text-white rounded-xl text-xs font-semibold"
                          >
                            Close Panel
                          </button>
                        </motion.div>
                      );
                    }
                    const status = tableService.status || "AVAILABLE";
                    const hasCall = getServiceCall(tableService.notes);

                    // Fetch or construct simulation state cache
                    const simState = tableService
                      ? getOrCreateSimulatedState(tableService.table.id, status, activeInteractAsset.capacity || 4)
                      : null;

                    let runningBillSum = 0;
                    if (simState) {
                      simState.guests.forEach((g) => {
                        g.orderedItems.forEach((item) => {
                          runningBillSum += item.price;
                        });
                      });
                    }

                    return (
                      <motion.div
                        initial={{
                          opacity: 0,
                          scale: 0.1 / canvasScale,
                          x: expansionOrigin ? expansionOrigin.x - 400 : 0,
                          y: expansionOrigin ? expansionOrigin.y - 300 : 0
                        }}
                        animate={{
                          opacity: 1,
                          scale: 1 / canvasScale,
                          x: 0,
                          y: 0
                        }}
                        exit={{
                          opacity: 0,
                          scale: 0.1 / canvasScale,
                          x: expansionOrigin ? expansionOrigin.x - 400 : 0,
                          y: expansionOrigin ? expansionOrigin.y - 300 : 0
                        }}
                        transition={{ type: "spring", damping: 25, stiffness: 220 }}
                        className="absolute w-[90vw] sm:w-[530px] h-[85vh] sm:h-[520px] left-1/2 top-1/2 bg-[#0d0b0a]/95 border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.85)] rounded-[20px] sm:rounded-[32px] p-4 sm:p-6 z-50 flex flex-col justify-between -ml-[45vw] sm:-ml-[265px] -mt-[42.5vh] sm:-mt-[260px]"
                      >
                        {/* HEADER STATE SELECTION */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="text-base sm:text-lg font-black text-white truncate">
                                {activeInteractAsset.name}
                              </h3>
                              <span className="text-[9px] sm:text-[10px] font-mono-dashboard text-white/40 uppercase bg-white/5 border border-white/5 px-1.5 sm:px-2 py-0.5 rounded flex-shrink-0">
                                {activeInteractAsset.capacity || 4} SEATS
                              </span>
                            </div>

                            {/* Status Change selectors row */}
                            <div className="flex flex-wrap items-center gap-1 mt-2">
                              {[
                                { id: "BROWSING", label: "Browse", style: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20" },
                                { id: "ORDERING", label: "Order", style: "bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20" },
                                { id: "PREPARING", label: "Prep", style: "bg-orange-500/10 border-orange-500/20 text-orange-400 hover:bg-orange-500/20" },
                                { id: "EATING", label: "Eat", style: "bg-purple-500/10 border-purple-500/20 text-purple-400 hover:bg-purple-500/20" },
                                { id: "ATTENTION", label: "Help", style: "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20" },
                                { id: "VIP", label: "VIP", style: "bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20" },
                                { id: "DIRTY", label: "Dirty", style: "bg-rose-950/20 border-rose-500/20 text-rose-400 hover:bg-rose-950/40" }
                              ].map((btn) => (
                                <button
                                  key={btn.id}
                                  onClick={async () => {
                                    if (tableService) {
                                      await updateTableService(tableService.id, btn.id);
                                      onSync();
                                    }
                                  }}
                                  className={`text-[8px] sm:text-[9px] uppercase tracking-wider font-extrabold px-1.5 sm:px-2 py-0.5 rounded-full border transition-all ${
                                    status === btn.id
                                      ? "bg-white border-white text-black font-black"
                                      : btn.style
                                  }`}
                                >
                                  {btn.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <button
                            onClick={() => setActiveInteractAsset(null)}
                            className="size-6 sm:size-7 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full flex items-center justify-center text-white/50 hover:text-white transition-all flex-shrink-0"
                          >
                            <X className="size-3.5 sm:size-4" />
                          </button>
                        </div>

                        {/* MIDDLE INTERACTIVE LAYERS split view */}
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-5 my-3 sm:my-4 overflow-y-auto sm:overflow-hidden items-stretch">
                          {/* LEFT: Guest circular table layout (6-cols) */}
                          <div className="col-span-1 sm:col-span-6 bg-white/[0.02] border border-white/5 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col items-center justify-center relative">
                            <span className="absolute top-2 sm:top-3 left-2 sm:left-3 text-[8px] sm:text-[9px] uppercase tracking-widest text-white/30 font-black">
                              GUEST LAYER
                            </span>

                            {/* Circular Mock Table representation */}
                            <div className="relative size-28 sm:size-36 rounded-full border border-white/10 bg-black/40 flex items-center justify-center shadow-inner my-2">
                              <span className="text-[11px] sm:text-[13px] font-black text-white">
                                {activeInteractAsset.name}
                              </span>

                              {/* Progress segments concentric rings around center table (Service Layer) */}
                              <svg className="absolute inset-[-10px] sm:inset-[-14px] size-[136px] sm:size-[172px] pointer-events-none transform -rotate-90">
                                {/* Concetris split path circles */}
                                {/* Order Progress Ring (0 - 90 deg) */}
                                <circle
                                  cx="68"
                                  cy="68"
                                  r="58"
                                  fill="none"
                                  stroke={status === "ORDERING" ? "#3b82f6" : "#22c55e"}
                                  strokeWidth="2.5"
                                  strokeDasharray="365"
                                  strokeDashoffset={365 - (365 * (simState?.orderProgress || 0)) / 400}
                                  className="opacity-80 transition-all duration-500 sm:hidden"
                                />
                                <circle
                                  cx="86"
                                  cy="86"
                                  r="74"
                                  fill="none"
                                  stroke={status === "ORDERING" ? "#3b82f6" : "#22c55e"}
                                  strokeWidth="3.5"
                                  strokeDasharray="465"
                                  strokeDashoffset={465 - (465 * (simState?.orderProgress || 0)) / 400}
                                  className="opacity-80 transition-all duration-500 hidden sm:block"
                                />

                                {/* Kitchen Progress Ring (90 - 180 deg) */}
                                <circle
                                  cx="68"
                                  cy="68"
                                  r="58"
                                  fill="none"
                                  stroke="#f97316"
                                  strokeWidth="2.5"
                                  strokeDasharray="365"
                                  strokeDashoffset={365 - (365 * (simState?.kitchenProgress || 0)) / 400}
                                  style={{ transform: "rotate(90deg)", transformOrigin: "68px 68px" }}
                                  className="opacity-80 transition-all duration-500 sm:hidden"
                                />
                                <circle
                                  cx="86"
                                  cy="86"
                                  r="74"
                                  fill="none"
                                  stroke="#f97316"
                                  strokeWidth="3.5"
                                  strokeDasharray="465"
                                  strokeDashoffset={465 - (465 * (simState?.kitchenProgress || 0)) / 400}
                                  style={{ transform: "rotate(90deg)", transformOrigin: "86px 86px" }}
                                  className="opacity-80 transition-all duration-500 hidden sm:block"
                                />

                                {/* Service Progress Ring (180 - 270 deg) */}
                                <circle
                                  cx="68"
                                  cy="68"
                                  r="58"
                                  fill="none"
                                  stroke="#a855f7"
                                  strokeWidth="2.5"
                                  strokeDasharray="365"
                                  strokeDashoffset={365 - (365 * (simState?.serviceProgress || 0)) / 400}
                                  style={{ transform: "rotate(180deg)", transformOrigin: "68px 68px" }}
                                  className="opacity-80 transition-all duration-500 sm:hidden"
                                />
                                <circle
                                  cx="86"
                                  cy="86"
                                  r="74"
                                  fill="none"
                                  stroke="#a855f7"
                                  strokeWidth="3.5"
                                  strokeDasharray="465"
                                  strokeDashoffset={465 - (465 * (simState?.serviceProgress || 0)) / 400}
                                  style={{ transform: "rotate(180deg)", transformOrigin: "86px 86px" }}
                                  className="opacity-80 transition-all duration-500 hidden sm:block"
                                />

                                {/* Billing Progress Ring (270 - 360 deg) */}
                                <circle
                                  cx="68"
                                  cy="68"
                                  r="58"
                                  fill="none"
                                  stroke="#10b981"
                                  strokeWidth="2.5"
                                  strokeDasharray="365"
                                  strokeDashoffset={365 - (365 * (simState?.billingProgress || 0)) / 400}
                                  style={{ transform: "rotate(270deg)", transformOrigin: "68px 68px" }}
                                  className="opacity-80 transition-all duration-500 sm:hidden"
                                />
                                <circle
                                  cx="86"
                                  cy="86"
                                  r="74"
                                  fill="none"
                                  stroke="#10b981"
                                  strokeWidth="3.5"
                                  strokeDasharray="465"
                                  strokeDashoffset={465 - (465 * (simState?.billingProgress || 0)) / 400}
                                  style={{ transform: "rotate(270deg)", transformOrigin: "86px 86px" }}
                                  className="opacity-80 transition-all duration-500 hidden sm:block"
                                />
                              </svg>

                              {/* Guest Seat Buttons Placed Mathematically Around Table */}
                              {simState?.guests.map((g, idx, arr) => {
                                const angle = (idx * 360) / arr.length;
                                const rad = (angle * Math.PI) / 180;
                                const radius = 52; // distance from center
                                const x = Math.cos(rad) * radius;
                                const y = Math.sin(rad) * radius;

                                const isSeatOccupied = g.orderedItems.length > 0;

                                return (
                                  <button
                                    key={g.seatNumber}
                                    onClick={() => setSelectedGuestSeat(g.seatNumber)}
                                    className={`absolute size-5 sm:size-7 rounded-full border flex items-center justify-center text-[9px] sm:text-[10px] font-black select-none transition-all ${
                                      selectedGuestSeat === g.seatNumber
                                        ? "bg-amber-500 border-amber-600 text-black scale-110 shadow-lg shadow-amber-500/25 ring-2 ring-amber-500/20"
                                        : isSeatOccupied
                                        ? "bg-white/10 border-white/20 text-white hover:bg-white/15"
                                        : "bg-white/[0.01] border-white/5 text-white/30 hover:bg-white/5"
                                    }`}
                                    style={{
                                      left: `calc(50% + ${x}px - 10px) sm:calc(50% + ${x}px - 14px)`,
                                      top: `calc(50% + ${y}px - 10px) sm:calc(50% + ${y}px - 14px)`
                                    }}
                                    title={g.name}
                                  >
                                    {g.vip ? "★" : g.seatNumber}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Service ring label tags */}
                            <div className="flex items-center justify-center gap-1.5 sm:gap-2 mt-3 sm:mt-4 flex-wrap">
                              <span className="text-[7px] sm:text-[8px] font-mono-dashboard text-blue-400 bg-blue-500/5 px-1 sm:px-1.5 py-0.5 rounded border border-blue-500/10">Order</span>
                              <span className="text-[7px] sm:text-[8px] font-mono-dashboard text-orange-400 bg-orange-500/5 px-1 sm:px-1.5 py-0.5 rounded border border-orange-500/10">Kitchen</span>
                              <span className="text-[7px] sm:text-[8px] font-mono-dashboard text-purple-400 bg-purple-500/5 px-1 sm:px-1.5 py-0.5 rounded border border-purple-500/10">Serv</span>
                              <span className="text-[7px] sm:text-[8px] font-mono-dashboard text-emerald-400 bg-emerald-500/5 px-1 sm:px-1.5 py-0.5 rounded border border-emerald-500/10">Bill</span>
                            </div>
                          </div>

                          {/* RIGHT: Active selected seat details & Roster actions (6-cols) */}
                          <div className="col-span-1 sm:col-span-6 flex flex-col justify-between overflow-hidden">
                            {/* Selected Seat Pane */}
                            {(() => {
                              const activeGuest = simState?.guests.find(
                                (g) => g.seatNumber === selectedGuestSeat
                              );

                              return (
                                <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col overflow-hidden min-h-0">
                                  {!tableService?.order ? (
                                    <div className="flex-1 flex flex-col justify-between overflow-hidden min-h-0">
                                      <div className="shrink-0 pb-1.5 sm:pb-2 border-b border-white/5 mb-2">
                                        <span className="text-[8px] sm:text-[9px] uppercase tracking-widest text-amber-500 font-black">
                                          Real-Time Order Builder
                                        </span>
                                        <p className="text-[9px] sm:text-[10px] text-white/50 leading-relaxed mt-0.5">
                                          Build an order tray to push a real order to the kitchen & KDS.
                                        </p>
                                      </div>

                                      <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                                        {menuItems.length === 0 ? (
                                          <p className="text-[10px] text-white/30 italic">No menu items found. Please add items in Menu Settings first.</p>
                                        ) : (
                                          <>
                                            <div className="space-y-1">
                                              <label className="text-[7px] sm:text-[8px] uppercase tracking-widest text-white/40 font-bold block">Select Item</label>
                                              <select
                                                value={selectedMenuItemId}
                                                onChange={(e) => setSelectedMenuItemId(e.target.value)}
                                                className="w-full h-7 sm:h-8 bg-black/60 border border-white/10 text-white text-[10px] sm:text-[11px] px-2 rounded-lg outline-none focus:border-amber-500"
                                              >
                                                {menuItems.map((m) => (
                                                  <option key={m.id} value={m.id}>
                                                    {m.name} - ₹{m.price}
                                                  </option>
                                                ))}
                                              </select>
                                            </div>

                                            <div className="flex items-center justify-between gap-2 sm:gap-3">
                                              <div className="flex items-center gap-1 bg-black/40 border border-white/10 p-0.5 rounded-lg">
                                                <button
                                                  onClick={() => setTrayQuantity(prev => Math.max(1, prev - 1))}
                                                  className="size-6 sm:size-7 flex items-center justify-center text-white/60 hover:text-white font-extrabold text-sm sm:text-base"
                                                >
                                                  -
                                                </button>
                                                <span className="w-5 sm:w-6 text-center text-[10px] sm:text-xs font-bold text-white">{trayQuantity}</span>
                                                <button
                                                  onClick={() => setTrayQuantity(prev => prev + 1)}
                                                  className="size-6 sm:size-7 flex items-center justify-center text-white/60 hover:text-white font-extrabold text-sm sm:text-base"
                                                >
                                                  +
                                                </button>
                                              </div>

                                              <button
                                                onClick={handleAddToTray}
                                                className="flex-1 h-7 sm:h-8 bg-white hover:bg-white/90 text-black text-[9px] sm:text-[10px] uppercase tracking-wider font-black rounded-lg transition-all"
                                              >
                                                Add to Tray
                                              </button>
                                            </div>
                                          </>
                                        )}

                                        {tray.length > 0 && (
                                          <div className="space-y-1 sm:space-y-1.5 pt-2 border-t border-white/5">
                                            <span className="text-[7px] sm:text-[8px] uppercase tracking-widest text-white/40 font-bold block">Tray Summary</span>
                                            <div className="space-y-1 max-h-[100px] sm:max-h-[120px] overflow-y-auto pr-1">
                                              {tray.map((x) => (
                                                <div key={x.menuItemId} className="flex items-center justify-between text-[9px] sm:text-[10px] p-1 sm:p-1.5 bg-white/[0.02] border border-white/5 rounded-md">
                                                  <span className="text-white/80 truncate">{x.quantity}x {x.name}</span>
                                                  <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                                                    <span className="font-mono text-emerald-400">₹{(x.price * x.quantity).toFixed(2)}</span>
                                                    <button
                                                      onClick={() => handleRemoveFromTray(x.menuItemId)}
                                                      className="text-red-500 hover:text-red-400 text-[9px] sm:text-[10px]"
                                                    >
                                                      ✕
                                                    </button>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      <button
                                        onClick={() => handlePlaceOrder(tableService.id, tableService.table.qrToken || "")}
                                        disabled={tray.length === 0}
                                        className={`w-full py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all mt-2 flex items-center justify-center gap-1.5 shadow-md ${
                                          tray.length > 0
                                            ? "bg-gradient-to-r from-amber-500 to-orange-500 text-black hover:brightness-110 shadow-amber-500/10"
                                            : "bg-white/5 text-white/20 border border-white/5 cursor-not-allowed"
                                        }`}
                                      >
                                        Submit Order (₹{tray.reduce((sum, x) => sum + x.price * x.quantity, 0).toFixed(2)})
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                                      <span className="text-[9px] uppercase tracking-widest text-white/30 font-black mb-2.5 block">
                                        SEAT DETAILS
                                      </span>
 
                                      {activeGuest && activeGuest.orderedItems.length > 0 ? (
                                        <div className="flex-1 flex flex-col justify-between overflow-hidden min-h-0">
                                          {/* Guest Info header */}
                                          <div className="shrink-0 pb-2 border-b border-white/5">
                                            <div className="flex items-center gap-1.5">
                                              <p className="text-xs font-bold text-white leading-none">
                                                {activeGuest.name}
                                              </p>
                                              {activeGuest.vip && (
                                                <span className="text-[8px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-500 px-1 py-0.25 rounded">
                                                  VIP
                                                </span>
                                              )}
                                              {activeGuest.birthday && (
                                                <span className="text-[8px] bg-red-500/10 border border-red-500/20 text-red-400 px-1 py-0.25 rounded">
                                                  🎂 Bday
                                                </span>
                                              )}
                                            </div>
 
                                            {/* Dietary preferences */}
                                            {activeGuest.dietary.length > 0 && (
                                              <div className="flex flex-wrap gap-1 mt-1.5">
                                                {activeGuest.dietary.map((tag) => (
                                                  <span
                                                    key={tag}
                                                    className="text-[8px] font-black uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.25 rounded"
                                                  >
                                                    {tag}
                                                  </span>
                                                ))}
                                              </div>
                                            )}
                                          </div>
 
                                          {/* Ordered Items Scroll list */}
                                          <div className="flex-1 overflow-y-auto space-y-1.5 my-2 pr-1 min-h-0">
                                            {activeGuest.orderedItems.map((item, idx) => (
                                              <div
                                                key={idx}
                                                className="flex items-center justify-between text-[11px] p-1.5 bg-white/[0.01] border border-white/5 rounded-lg"
                                              >
                                                <span className="font-medium text-white/70">{item.name}</span>
                                                <div className="flex items-center gap-1.5">
                                                  <span className="font-mono text-emerald-400">${item.price}</span>
                                                  <span
                                                    className={`text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.25 rounded ${
                                                      item.status === "Served"
                                                        ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                                                        : item.status === "Preparing"
                                                        ? "bg-orange-500/10 border border-orange-500/20 text-orange-400"
                                                        : "bg-blue-500/10 border border-blue-500/20 text-blue-400"
                                                    }`}
                                                  >
                                                    {item.status}
                                                  </span>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
 
                                          {activeGuest.notes && (
                                            <p className="shrink-0 text-[10px] text-white/40 italic bg-white/5 border border-white/5 p-2 rounded-lg leading-normal">
                                              💡 {activeGuest.notes}
                                            </p>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                                          <UserPlus className="size-6 text-white/10 mb-2" />
                                          <p className="text-[11px] font-bold text-white/50">Seat Empty</p>
                                          <p className="text-[10px] text-white/30 max-w-[130px] leading-relaxed mt-1">
                                            No guests seated or orders placed on this seat.
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Wait staff assignment & Last action status strip */}
                        <div className="shrink-0 flex items-center justify-between border-t border-white/5 pt-3">
                          {/* Server Assigned */}
                          <div className="flex items-center gap-2.5">
                            {tableService?.server ? (
                              <div className="flex items-center gap-2">
                                <div className="size-6 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-[9px] font-black text-amber-500 uppercase">
                                  {tableService.server.name.split(" ").map((n) => n[0]).join("")}
                                </div>
                                <div className="leading-none">
                                  <p className="text-[11px] font-bold text-white">
                                    {tableService.server.name}
                                  </p>
                                  <button
                                    onClick={async () => {
                                      await assignServer(tableService.id, "");
                                      onSync();
                                    }}
                                    className="text-[8px] text-red-400 hover:text-red-300 font-bold uppercase tracking-wider mt-0.5 block"
                                  >
                                    Release Waiter
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <select
                                  onChange={async (e) => {
                                    if (e.target.value && tableService) {
                                      await assignServer(tableService.id, e.target.value);
                                      onSync();
                                    }
                                  }}
                                  className="h-8 bg-white/5 border border-white/10 text-white text-[10px] px-2 rounded-lg focus:border-amber-500 outline-none uppercase font-bold"
                                >
                                  <option value="" className="bg-[#0c0c0c]">Assign waiter...</option>
                                  {staff.map(person => (
                                    <option key={person.id} value={person.id} className="bg-[#0c0c0c]">
                                      {person.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>

                          {/* Quick simulator operations */}
                          <div className="flex items-center gap-1.5">
                            {/* Floating Service signals dispatcher */}
                            <select
                              onChange={(e) => {
                                if (e.target.value && tableService) {
                                  triggerServiceRequest(tableService.table.id, tableService.id, e.target.value);
                                  e.target.value = "";
                                }
                              }}
                              className="h-8 bg-white/5 border border-white/10 text-white text-[10px] px-2.5 rounded-lg focus:border-amber-500 outline-none font-bold uppercase tracking-wider"
                            >
                              <option value="" className="bg-[#0c0c0c]">Call Alert...</option>
                              <option value="Water" className="bg-[#0c0c0c]">💧 Water</option>
                              <option value="Bill" className="bg-[#0c0c0c]">🧾 Bill</option>
                              <option value="Extra_Plate" className="bg-[#0c0c0c]">🍽 Extra Plate</option>
                              <option value="Manager" className="bg-[#0c0c0c]">👨🍳 Manager</option>
                            </select>

                            {/* Simulated dish dispatch */}
                            {status === "PREPARING" && (
                              <button
                                onClick={() =>
                                  simulateDishDelivery(
                                    activeInteractAsset.tableId!,
                                    activeInteractAsset.name,
                                    activeInteractAsset.x + activeInteractAsset.w / 2,
                                    activeInteractAsset.y + activeInteractAsset.h / 2
                                  )
                                }
                                className="px-3 h-8 bg-orange-500 hover:bg-orange-400 text-black text-[10px] uppercase tracking-wider font-black rounded-lg flex items-center gap-1 transition-all"
                              >
                                <Flame size={12} className="animate-pulse" /> Dispatch Food
                              </button>
                            )}

                            {/* View Bill Trigger */}
                            {runningBillSum > 0 && (
                              <button
                                onClick={() => {
                                  setSimulatedStates((prev) => {
                                    const current = prev[tableService!.table.id];
                                    if (current) {
                                      return {
                                        ...prev,
                                        [tableService!.table.id]: { ...current, billEmerging: !current.billEmerging }
                                      };
                                    }
                                    // Create state if it doesn't exist with all required properties
                                    return {
                                      ...prev,
                                      [tableService!.table.id]: {
                                        guests: [],
                                        orderProgress: 0,
                                        kitchenProgress: 0,
                                        serviceProgress: 0,
                                        billingProgress: 0,
                                        lastInteraction: "Just now",
                                        billEmerging: true,
                                        discountApplied: 0,
                                        splitCount: 1
                                      }
                                    };
                                  });
                                }}
                                className={`px-3 h-8 text-[10px] uppercase tracking-wider font-black rounded-lg flex items-center gap-1 transition-all ${
                                  simState?.billEmerging
                                    ? "bg-white text-black"
                                    : "bg-emerald-500 hover:bg-emerald-400 text-black"
                                }`}
                              >
                                <DollarSign size={11} /> {simState?.billEmerging ? "Hide Receipt" : "Show Receipt"}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* PHYSICAL RECEIPTS SLIDE-UP BILLING EXPERIENCE */}
                        <AnimatePresence>
                          {simState?.billEmerging && (
                            <motion.div
                              initial={{ height: 0, opacity: 0, y: 100 }}
                              animate={{ height: "auto", opacity: 1, y: 0 }}
                              exit={{ height: 0, opacity: 0, y: 100 }}
                              transition={{ type: "spring", damping: 30, stiffness: 250 }}
                              className="absolute bottom-[56px] left-[24px] right-[24px] bg-[#fdfdfb] text-black border border-neutral-300 shadow-[0_-15px_30px_rgba(0,0,0,0.5)] rounded-2xl p-5 overflow-hidden flex flex-col justify-between z-40 max-h-[380px]"
                            >
                              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-b from-black/5 to-transparent" />

                              {/* Receipt Header details */}
                              <div className="text-center font-mono text-[9px] text-neutral-500 uppercase tracking-widest shrink-0">
                                <p className="font-bold text-[12px] text-black tracking-normal font-sans">
                                  {restaurant?.name || "SERVEAURA BISTRO"}
                                </p>
                                <p className="mt-0.5">Live Digital Twin Receipt</p>
                                <p className="mt-1">
                                  Table: {activeInteractAsset.name} | Staff:{" "}
                                  {tableService?.server?.name || "None"}
                                </p>
                                <p className="mt-0.5">
                                  {new Date().toLocaleDateString()} | {new Date().toLocaleTimeString()}
                                </p>
                                <p className="my-1.5">----------------------------------------</p>
                              </div>

                              {/* Items scroll */}
                              <div className="flex-1 overflow-y-auto font-mono text-[11px] my-2 pr-1 space-y-1.5">
                                {simState?.guests.map((g) =>
                                  g.orderedItems.map((item, idx) => (
                                    <div key={`${g.seatNumber}_${idx}`} className="flex justify-between">
                                      <span>
                                        S{g.seatNumber}. {item.name.slice(0, 20)}
                                      </span>
                                      <span>₹{item.price.toFixed(2)}</span>
                                    </div>
                                  ))
                                )}
                              </div>

                              {/* Subtotal, tax, grand total */}
                              <div className="font-mono text-[11px] space-y-1 pt-2 border-t border-dashed border-neutral-300 shrink-0">
                                <div className="flex justify-between">
                                  <span>Subtotal:</span>
                                  <span>₹{runningBillSum.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-neutral-500">
                                  <span>GST / Tax (12%):</span>
                                  <span>₹{(runningBillSum * 0.12).toFixed(2)}</span>
                                </div>
                                {simState?.discountApplied > 0 && (
                                  <div className="flex justify-between text-emerald-600 font-bold">
                                    <span>Discount (10%):</span>
                                    <span>-₹{(runningBillSum * 0.1).toFixed(2)}</span>
                                  </div>
                                )}
                                {simState?.splitCount > 1 && (
                                  <div className="flex justify-between text-blue-600 font-bold">
                                    <span>Split (x{simState.splitCount}):</span>
                                    <span>
                                      ₹
                                      {(
                                        (runningBillSum * 1.12 -
                                          (simState?.discountApplied ? runningBillSum * 0.1 : 0)) /
                                        simState.splitCount
                                      ).toFixed(2)}{" "}
                                      / guest
                                    </span>
                                  </div>
                                )}
                                <div className="flex justify-between text-[13px] font-bold border-t border-dashed border-neutral-300 pt-1">
                                  <span>Total Amount:</span>
                                  <span>
                                    ₹
                                    {(
                                      runningBillSum * 1.12 -
                                      (simState?.discountApplied ? runningBillSum * 0.1 : 0)
                                    ).toFixed(2)}
                                  </span>
                                </div>
                              </div>

                              {/* Receipt action triggers */}
                              <div className="grid grid-cols-5 gap-1.5 mt-4 shrink-0 font-sans">
                                <button
                                  onClick={() => handleSplitBill(tableService!.table.id, activeInteractAsset.capacity || 4)}
                                  className="py-2 px-1 border border-neutral-300 hover:bg-neutral-50 text-[10px] font-bold text-neutral-700 rounded-lg transition-colors text-center uppercase"
                                  title="Split bill amount between seated guests"
                                >
                                  Split
                                </button>
                                <button
                                  onClick={() => handleApplyDiscount(tableService!.table.id)}
                                  className={`py-2 px-1 border text-[10px] font-bold rounded-lg transition-colors text-center uppercase ${
                                    simState?.discountApplied > 0
                                      ? "bg-amber-100 border-amber-300 text-amber-800"
                                      : "border-neutral-300 hover:bg-neutral-50 text-neutral-700"
                                  }`}
                                  title="Apply 10% promotional discount"
                                >
                                  Promo
                                </button>
                                <button
                                  onClick={() => setShowUPIModal(true)}
                                  className="py-2 px-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition-colors text-center uppercase"
                                >
                                  UPI QR
                                </button>
                                <button
                                  onClick={() => setShowCardModal(true)}
                                  className="py-2 px-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-lg transition-colors text-center uppercase"
                                >
                                  Card
                                </button>
                                <button
                                  onClick={() => handleCloseTable(tableService!.id, tableService!.table.id)}
                                  className="py-2 px-1 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black rounded-lg transition-colors text-center uppercase"
                                >
                                  Close
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* UPI Payment Modal simulation overlay */}
                        <AnimatePresence>
                          {showUPIModal && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              className="absolute inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-6 text-center text-white"
                            >
                              <div className="size-28 bg-white p-2 rounded-2xl shadow-xl my-4 flex items-center justify-center border border-white/20 relative">
                                {/* Simulated QR grid blocks */}
                                <div className="grid grid-cols-5 gap-1 w-full h-full opacity-90">
                                  {[...Array(25)].map((_, i) => (
                                    <div
                                      key={i}
                                      className={`rounded-xs ${
                                        (i % 2 === 0 && i % 3 === 0) || i === 0 || i === 4 || i === 20 || i === 24
                                          ? "bg-black"
                                          : "bg-transparent"
                                      }`}
                                    />
                                  ))}
                                </div>
                                <div className="absolute inset-0 border-2 border-emerald-500 rounded-2xl animate-pulse pointer-events-none" />
                              </div>
                              <p className="text-xs font-black uppercase text-emerald-400 tracking-wider">
                                UPI Merchant QR
                              </p>
                              <p className="text-[10px] text-white/50 max-w-[200px] mt-1 leading-normal">
                                Scan using PhonePe, GPay, or Paytm to pay ₹
                                {(
                                  runningBillSum * 1.12 -
                                  (simState?.discountApplied ? runningBillSum * 0.1 : 0)
                                ).toFixed(2)}
                              </p>
                              <div className="flex gap-2 mt-5">
                                <button
                                  onClick={async () => {
                                    setShowUPIModal(false);
                                    if (tableService) {
                                      await handleCloseTable(tableService.id, tableService.table.id);
                                    }
                                  }}
                                  className="px-4 py-2 bg-emerald-500 text-black text-xs font-black uppercase tracking-wider rounded-lg"
                                >
                                  Simulate Success
                                </button>
                                <button
                                  onClick={() => setShowUPIModal(false)}
                                  className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-xs font-bold uppercase tracking-wider rounded-lg"
                                >
                                  Cancel
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Card Terminal Modal simulation overlay */}
                        <AnimatePresence>
                          {showCardModal && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              className="absolute inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-6 text-center text-white"
                            >
                              <div className="size-14 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-4 animate-pulse">
                                <CreditCard size={28} />
                              </div>
                              <p className="text-xs font-black uppercase text-blue-400 tracking-wider">
                                Card Terminal Connection
                              </p>
                              <p className="text-[10px] text-white/50 max-w-[200px] mt-1 leading-normal">
                                Waiting for contactless swipe or chip insert on POS terminal.
                              </p>
                              <div className="flex gap-2 mt-5">
                                <button
                                  onClick={async () => {
                                    setShowCardModal(false);
                                    if (tableService) {
                                      await handleCloseTable(tableService.id, tableService.table.id);
                                    }
                                  }}
                                  className="px-4 py-2 bg-blue-500 text-white text-xs font-black uppercase tracking-wider rounded-lg"
                                >
                                  Simulate Success
                                </button>
                                <button
                                  onClick={() => setShowCardModal(false)}
                                  className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-xs font-bold uppercase tracking-wider rounded-lg"
                                >
                                  Cancel
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })()}
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {isDesignMode && (
        <button
          onClick={() => setShowToolsMobile(!showToolsMobile)}
          className="lg:hidden fixed bottom-4 right-4 z-30 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-black rounded-full font-black uppercase tracking-wider text-[10px] shadow-lg flex items-center gap-1.5"
        >
          <Sliders className="size-3.5" />
          {showToolsMobile ? "Hide Palette" : "Show Palette"}
        </button>
      )}
    </div>
  );
}
