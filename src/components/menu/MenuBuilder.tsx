"use client";

import { useState, useEffect, useCallback, memo, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plus, Trash2, Leaf, Drumstick, Search, Utensils,
  Sparkles, ImagePlus, X, Eye, EyeOff, FolderOpen,
  LayoutGrid, Edit, Check, AlertCircle
} from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface Variant { id: string; name: string; price: number; }
interface MenuItem {
  id: string; name: string; description?: string; price: number;
  isVeg: boolean; isAvailable: boolean; tags: string[]; variants: Variant[]; image?: string;
}
interface Category { id: string; name: string; description?: string; menuItems: MenuItem[]; }

export const MenuBuilder = memo(function MenuBuilder({ restaurantId }: { restaurantId: string }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [minLoading, setMinLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  
  // Search & Filter State
  const [categorySearch, setCategorySearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [vegFilter, setVegFilter] = useState<"all" | "veg" | "nonveg">("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<"all" | "active" | "hidden">("all");

  // Category Actions State
  const [newCatName, setNewCatName] = useState("");
  const [addingCat, setAddingCat] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [editingCategoryDesc, setEditingCategoryDesc] = useState("");

  // Slide-in Drawer State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"add" | "edit">("add");
  const [drawerItemId, setDrawerItemId] = useState<string | null>(null);
  const [drawerItemData, setDrawerItemData] = useState({
    name: "",
    price: "",
    description: "",
    isVeg: true,
    image: ""
  });

  const queryClient = useQueryClient();

  const { data: categoriesData } = useQuery({
    queryKey: ["menu-categories", restaurantId],
    queryFn: async () => {
      const res = await axios.get(`/api/menu/categories?restaurantId=${restaurantId}`);
      return res.data;
    },
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (categoriesData) {
      setCategories(categoriesData);
      // Auto-select first category if none selected
      if (categoriesData.length > 0 && !selectedCategoryId) {
        setSelectedCategoryId(categoriesData[0].id);
      }
      setMinLoading(false);
    }
  }, [categoriesData]);

  // If selected category was deleted, auto-select another one
  useEffect(() => {
    if (categories.length > 0 && (!selectedCategoryId || !categories.some(c => c.id === selectedCategoryId))) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  // ── Global Stats ────────────────────────────────────────────────────────
  const totalItems = useMemo(() => categories.reduce((s, c) => s + c.menuItems.length, 0), [categories]);
  const hiddenItems = useMemo(() => categories.reduce((s, c) => s + c.menuItems.filter(i => !i.isAvailable).length, 0), [categories]);

  // ── Active Category Details ─────────────────────────────────────────────
  const activeCategory = useMemo(() => {
    return categories.find(c => c.id === selectedCategoryId) || null;
  }, [categories, selectedCategoryId]);

  // ── Filtered Categories (for sidebar) ──────────────────────────────────
  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return categories;
    return categories.filter(cat =>
      cat.name.toLowerCase().includes(categorySearch.toLowerCase())
    );
  }, [categories, categorySearch]);

  // ── Filtered Items (for right workspace grid) ──────────────────────────
  const filteredItems = useMemo(() => {
    if (!activeCategory) return [];
    return activeCategory.menuItems.filter(item => {
      // 1. Text Search
      const matchesSearch = !searchQuery.trim() || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));

      // 2. Veg / Non-Veg
      const matchesVeg = vegFilter === "all" ||
        (vegFilter === "veg" && item.isVeg) ||
        (vegFilter === "nonveg" && !item.isVeg);

      // 3. Availability
      const matchesAvail = availabilityFilter === "all" ||
        (availabilityFilter === "active" && item.isAvailable) ||
        (availabilityFilter === "hidden" && !item.isAvailable);

      return matchesSearch && matchesVeg && matchesAvail;
    });
  }, [activeCategory, searchQuery, vegFilter, availabilityFilter]);

  // ── Sample Data ────────────────────────────────────────────────────────
  async function addSampleData() {
    try {
      toast.loading("Populating professional menu framework...");
      const sampleCategories = [
        { name: "Starters", description: "Delicious bites & appetizers to stimulate your palate", restaurantId },
        { name: "Main Course", description: "Authentic, freshly crafted entrees cooked to perfection", restaurantId },
        { name: "Beverages", description: "Refreshing coolers, mocktails, and gourmet warm drinks", restaurantId },
        { name: "Desserts", description: "Decadent sweet endings to conclude your dining experience", restaurantId },
      ];
      const createdCategories = [];
      for (const cat of sampleCategories) {
        const catRes = await axios.post("/api/menu/categories", cat);
        createdCategories.push(catRes.data);
      }
      const sampleItems = [
        { categoryId: createdCategories[0].id, name: "Paneer Tikka", description: "Charcoal grilled cottage cheese skewers marinated in spiced yogurt and fresh herbs", price: 180, isVeg: true },
        { categoryId: createdCategories[0].id, name: "Spicy Chicken Wings", description: "Glazed in chef's signature hot sauce, served with cool mint ranch dip", price: 220, isVeg: false },
        { categoryId: createdCategories[0].id, name: "Crispy Spring Rolls", description: "Fried wrapper sheets loaded with fresh shredded cabbage, carrots, and sweet chili drizzle", price: 150, isVeg: true },
        { categoryId: createdCategories[1].id, name: "Butter Chicken", description: "Tender clay-oven chicken simmered in rich creamy tomato butter gravy", price: 320, isVeg: false },
        { categoryId: createdCategories[1].id, name: "Paneer Butter Masala", description: "Gourmet paneer cubes stewed in velvet onion-tomato gravy with dried fenugreek", price: 280, isVeg: true },
        { categoryId: createdCategories[1].id, name: "Hyderabadi Dum Biryani", description: "Aromatic basmati rice cooked on slow dum steam with layered saffron, caramelized onions, and spices", price: 250, isVeg: true },
        { categoryId: createdCategories[2].id, name: "Alfonso Mango Lassi", description: "Sweet, creamy yogurt blend infused with real pulped Alfonso mangoes and cardamom", price: 80, isVeg: true },
        { categoryId: createdCategories[2].id, name: "Signature Masala Chai", description: "Freshly brewed premium dust tea leaves infused with crushed ginger and aromatic pods", price: 40, isVeg: true },
        { categoryId: createdCategories[3].id, name: "Warm Gulab Jamun", description: "Soft caramelized milk solid dumplings soaked in sweet saffron rosewater syrup", price: 80, isVeg: true },
        { categoryId: createdCategories[3].id, name: "Molten Chocolate Brownie", description: "Rich cocoa fudge brownie with a warm liquid center, dusted with white powdered sugar", price: 120, isVeg: true },
      ];
      for (const item of sampleItems) {
        await axios.post("/api/menu/items", { ...item, restaurantId, tags: [] });
      }
      queryClient.invalidateQueries({ queryKey: ["menu-categories", restaurantId] });
      toast.dismiss();
      toast.success("Standard premium menu generated!");
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to inject sample data");
    }
  }

  // ── Category Actions ───────────────────────────────────────────────────
  const addCategory = useCallback(async () => {
    if (!newCatName.trim()) return;
    try {
      const res = await axios.post("/api/menu/categories", { name: newCatName, restaurantId });
      const newCat = { ...res.data, menuItems: [] };
      setCategories([...categories, newCat]);
      setSelectedCategoryId(newCat.id);
      setNewCatName("");
      setAddingCat(false);
      toast.success("Category added to your workspace!");
      queryClient.invalidateQueries({ queryKey: ["menu-categories", restaurantId] });
    } catch { toast.error("Failed to add category"); }
  }, [newCatName, restaurantId, categories, queryClient]);

  const updateCategory = useCallback(async (id: string, name: string, description?: string) => {
    if (!name.trim()) return;
    try {
      const res = await axios.patch(`/api/menu/categories/${id}`, { name, description });
      setCategories(categories.map(c => c.id === id ? { ...c, ...res.data } : c));
      setEditingCategory(null);
      toast.success("Category updated!");
      queryClient.invalidateQueries({ queryKey: ["menu-categories", restaurantId] });
    } catch { toast.error("Failed to edit category"); }
  }, [categories, restaurantId, queryClient]);

  const deleteCategory = useCallback(async (id: string) => {
    if (!confirm("Are you sure you want to delete this category? All dishes in this category will be removed permanentely.")) return;
    try {
      await axios.delete(`/api/menu/categories/${id}`);
      setCategories(categories.filter(c => c.id !== id));
      toast.success("Category and associated items deleted");
      queryClient.invalidateQueries({ queryKey: ["menu-categories", restaurantId] });
    } catch { toast.error("Failed to delete category"); }
  }, [categories, restaurantId, queryClient]);

  // ── Item Actions ───────────────────────────────────────────────────────
  async function handleItemSave(itemData: {
    name: string; price: number; description?: string; isVeg: boolean; image?: string;
  }) {
    if (!selectedCategoryId) return;
    try {
      if (drawerMode === "add") {
        // Create Mode
        const res = await axios.post("/api/menu/items", {
          ...itemData,
          categoryId: selectedCategoryId,
          restaurantId,
          tags: []
        });
        setCategories(categories.map(c =>
          c.id === selectedCategoryId ? { ...c, menuItems: [...c.menuItems, res.data] } : c
        ));
        toast.success("Dish added successfully!");
      } else {
        // Edit Mode
        if (!drawerItemId) return;
        const res = await axios.patch(`/api/menu/items/${drawerItemId}`, itemData);
        setCategories(categories.map(c =>
          c.id === selectedCategoryId
            ? { ...c, menuItems: c.menuItems.map(i => i.id === drawerItemId ? res.data : i) }
            : c
        ));
        toast.success("Dish updated successfully!");
      }
      setDrawerOpen(false);
    } catch {
      toast.error(drawerMode === "add" ? "Failed to create dish" : "Failed to update dish");
    }
  }

  async function updateItemImage(categoryId: string, item: MenuItem, image: string) {
    try {
      const res = await axios.patch(`/api/menu/items/${item.id}`, { image });
      setCategories(categories.map(c =>
        c.id === categoryId ? { ...c, menuItems: c.menuItems.map(i => i.id === item.id ? res.data : i) } : c
      ));
      toast.success("Image updated!");
    } catch { toast.error("Failed to update image"); }
  }

  async function removeItemImage(categoryId: string, item: MenuItem) {
    try {
      const res = await axios.patch(`/api/menu/items/${item.id}`, { image: null });
      setCategories(categories.map(c =>
        c.id === categoryId ? { ...c, menuItems: c.menuItems.map(i => i.id === item.id ? res.data : i) } : c
      ));
      toast.success("Image removed");
    } catch { toast.error("Failed to remove image"); }
  }

  async function deleteItem(categoryId: string, itemId: string) {
    if (!confirm("Are you sure you want to delete this dish permanentely?")) return;
    try {
      await axios.delete(`/api/menu/items/${itemId}`);
      setCategories(categories.map(c =>
        c.id === categoryId ? { ...c, menuItems: c.menuItems.filter(i => i.id !== itemId) } : c
      ));
      toast.success("Dish removed");
    } catch { toast.error("Failed to delete dish"); }
  }

  async function toggleAvailability(categoryId: string, item: MenuItem) {
    try {
      // Optimistic UI updates
      setCategories(categories.map(c =>
        c.id === categoryId
          ? {
              ...c,
              menuItems: c.menuItems.map(i => i.id === item.id ? { ...i, isAvailable: !i.isAvailable } : i)
            }
          : c
      ));
      
      const res = await axios.patch(`/api/menu/items/${item.id}`, { isAvailable: !item.isAvailable });
      // Final sync with backend response
      setCategories(categories.map(c =>
        c.id === categoryId ? { ...c, menuItems: c.menuItems.map(i => i.id === item.id ? res.data : i) } : c
      ));
    } catch {
      toast.error("Failed to toggle availability");
      // Rollback on error
      setCategories(categories.map(c =>
        c.id === categoryId
          ? {
              ...c,
              menuItems: c.menuItems.map(i => i.id === item.id ? { ...i, isAvailable: item.isAvailable } : i)
            }
          : c
      ));
    }
  }

  // ── Image File Reader ──────────────────────────────────────────────────
  function handleImageFile(file: File, onDone: (base64: string) => void) {
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Image must be under 2MB"); return; }
    const reader = new FileReader();
    reader.onloadend = () => onDone(reader.result as string);
    reader.readAsDataURL(file);
  }

  // ── Slide-in Drawer Control ────────────────────────────────────────────
  function openDrawerForAdd() {
    setDrawerMode("add");
    setDrawerItemId(null);
    setDrawerItemData({ name: "", price: "", description: "", isVeg: true, image: "" });
    setDrawerOpen(true);
  }

  function openDrawerForEdit(item: MenuItem) {
    setDrawerMode("edit");
    setDrawerItemId(item.id);
    setDrawerItemData({
      name: item.name,
      price: item.price.toString(),
      description: item.description || "",
      isVeg: item.isVeg,
      image: item.image || ""
    });
    setDrawerOpen(true);
  }

  function handleDrawerSave() {
    if (!drawerItemData.name.trim() || !drawerItemData.price) return;
    const priceNum = parseFloat(drawerItemData.price);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast.error("Price must be greater than 0");
      return;
    }
    handleItemSave({
      name: drawerItemData.name,
      price: priceNum,
      description: drawerItemData.description || undefined,
      isVeg: drawerItemData.isVeg,
      image: drawerItemData.image || undefined
    });
  }

  // ── Category Rename Handlers ───────────────────────────────────────────
  function startEditingCategory(cat: Category) {
    setEditingCategory(cat);
    setEditingCategoryName(cat.name);
    setEditingCategoryDesc(cat.description || "");
  }

  function saveCategoryRename(id: string) {
    if (!editingCategoryName.trim()) return;
    updateCategory(id, editingCategoryName, editingCategoryDesc);
  }

  // ── Loading Skeleton ───────────────────────────────────────────────────
  if (minLoading) return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3.5">
          <Skeleton className="w-[50px] h-[50px] rounded-2xl bg-neutral-100 dark:bg-[#141414]" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-44 bg-neutral-100 dark:bg-[#141414]" />
            <Skeleton className="h-4 w-64 bg-neutral-100 dark:bg-[#141414]" />
          </div>
        </div>
        <div className="flex gap-2.5">
          <Skeleton className="h-10 w-32 rounded-xl bg-neutral-100 dark:bg-[#141414]" />
          <Skeleton className="h-10 w-36 rounded-xl bg-neutral-100 dark:bg-[#141414]" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        <div className="space-y-3 bg-white dark:bg-[#111] p-4 rounded-2xl border border-neutral-200 dark:border-[rgba(255,255,255,0.06)] h-[500px]">
          <Skeleton className="h-10 w-full bg-neutral-100 dark:bg-[#1c1c1c] rounded-xl" />
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-12 w-full bg-neutral-100 dark:bg-[#161616] rounded-xl" />
          ))}
        </div>
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white dark:bg-[#111] p-5 rounded-2xl border border-neutral-200 dark:border-[rgba(255,255,255,0.06)]">
            <div className="space-y-2">
              <Skeleton className="h-6 w-52 bg-neutral-100 dark:bg-[#1c1c1c]" />
              <Skeleton className="h-4 w-72 bg-neutral-100 dark:bg-[#1c1c1c]" />
            </div>
            <Skeleton className="h-10 w-28 bg-neutral-100 dark:bg-[#1c1c1c] rounded-xl" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-[250px] w-full bg-white dark:bg-[#111] rounded-2xl border border-neutral-200 dark:border-[rgba(255,255,255,0.06)]" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 text-neutral-800 dark:text-[#f0ece4]">
      
      {/* ── Page Header ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-neutral-200 dark:border-[rgba(255,255,255,0.06)] pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-[50px] h-[50px] rounded-2xl bg-gradient-to-br from-[#f97316] to-[#ea580c] flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#f97316]/10 border border-[#f97316]/20">
            <Utensils className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-[22px] font-extrabold text-neutral-800 dark:text-[#f0ece4] leading-none tracking-tight">Menu Builder</h1>
            <p className="text-[12px] text-neutral-500 dark:text-[#9a9488] mt-1.5 font-medium">Design and structure your restaurant menu catalog</p>
          </div>
        </div>
        <div className="flex gap-2.5 flex-wrap">
          <button
            onClick={addSampleData}
            id="btn-sample-menu"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white dark:bg-[#111] border border-neutral-200 dark:border-[rgba(34,197,94,0.25)] text-[#22c55e] dark:text-[#4ade80] text-[12px] font-semibold hover:border-[#22c55e] hover:bg-neutral-50 dark:hover:bg-[rgba(34,197,94,0.03)] transition-all shadow-sm"
          >
            <Sparkles className="size-3.5" /> Core Framework
          </button>
          <button
            onClick={() => setAddingCat(true)}
            id="btn-add-category-header"
            className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-[#f97316] text-white text-[12px] font-bold hover:bg-[#ea6c0a] shadow-lg shadow-[#f97316]/15 hover:shadow-[#f97316]/25 transition-all"
          >
            <Plus className="size-3.5" /> Add Category
          </button>
        </div>
      </div>

      {/* ── Mobile Categories Horizontal scroll ───────────────────────── */}
      <div className="block lg:hidden border-b border-neutral-200 dark:border-[rgba(255,255,255,0.06)] pb-2 overflow-x-auto scrollbar-none">
        <div className="flex gap-2 px-1 py-1 min-w-max">
          {categories.map((cat) => {
            const isSelected = selectedCategoryId === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`relative px-4 py-2 rounded-xl text-[12px] font-bold border transition-all ${
                  isSelected
                    ? "bg-[#f97316]/10 border-[#f97316] text-[#f97316]"
                    : "bg-white dark:bg-[#111] border-neutral-200 dark:border-[rgba(255,255,255,0.06)] text-neutral-500 dark:text-[#9a9488] hover:text-neutral-800 dark:hover:text-[#f0ece4] hover:bg-neutral-50 dark:hover:bg-[#161616]"
                }`}
              >
                <span className="flex items-center gap-2">
                  {cat.name}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    isSelected ? "bg-[#f97316] text-white" : "bg-neutral-100 dark:bg-[#1f1f1f] text-neutral-400 dark:text-[#5a5650]"
                  }`}>
                    {cat.menuItems.length}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main Two-Panel Workspace Grid ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
        
        {/* ── LEFT PANEL: Category Sidebar ──────────────────────────────── */}
        <div className="hidden lg:flex flex-col bg-white dark:bg-[#111111] border border-neutral-200 dark:border-[rgba(255,255,255,0.06)] rounded-2xl overflow-hidden shadow-lg dark:shadow-xl dark:shadow-black/20 self-start">
          
          {/* Sidebar Header & Search */}
          <div className="p-4 border-b border-neutral-200 dark:border-[rgba(255,255,255,0.06)] bg-neutral-50/50 dark:bg-[#131313] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-neutral-400 dark:text-[#5a5650] uppercase tracking-widest flex items-center gap-1.5">
                <FolderOpen className="size-3.5" /> Categories Menu
              </span>
              <span className="text-[10px] bg-neutral-100 dark:bg-[#1a1a1a] border border-neutral-200 dark:border-[rgba(255,255,255,0.07)] text-neutral-500 dark:text-[#9a9488] font-bold px-2 py-0.5 rounded-full">
                {categories.length}
              </span>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-neutral-400 dark:text-[#5a5650]" />
              <input
                value={categorySearch}
                onChange={e => setCategorySearch(e.target.value)}
                placeholder="Search categories..."
                className="w-full bg-neutral-100 dark:bg-[#161616] border border-neutral-200 dark:border-[rgba(255,255,255,0.08)] rounded-xl pl-9 pr-3 py-2 text-[12px] text-neutral-800 dark:text-[#f0ece4] placeholder-neutral-400 dark:placeholder-[#5a5650] outline-none focus:border-[#f97316]/50 transition-colors"
              />
            </div>
          </div>

          {/* Category List */}
          <div className="p-2.5 max-h-[380px] overflow-y-auto space-y-1 scrollbar-thin">
            
            {/* Dynamic Add Category Input Box */}
            <AnimatePresence>
              {addingCat && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-neutral-50 dark:bg-[#141414] border border-[#f97316]/30 p-2 rounded-xl mb-2 space-y-2"
                >
                  <input
                    autoFocus
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                    placeholder="New category name..."
                    onKeyDown={e => e.key === "Enter" && addCategory()}
                    className="w-full bg-white dark:bg-[#1c1c1c] border border-neutral-200 dark:border-[rgba(255,255,255,0.08)] rounded-lg px-2.5 py-1.5 text-[12px] text-neutral-800 dark:text-[#f0ece4] focus:outline-none focus:border-[#f97316]/50 placeholder-neutral-400 dark:placeholder-[#5a5650]"
                  />
                  <div className="flex gap-1.5 justify-end">
                    <button
                      onClick={addCategory}
                      className="px-2.5 py-1 rounded bg-[#f97316] text-white text-[10px] font-bold hover:bg-[#ea6c0a]"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => { setAddingCat(false); setNewCatName(""); }}
                      className="px-2.5 py-1 rounded bg-white dark:bg-[#1c1c1c] text-neutral-500 dark:text-[#9a9488] hover:text-neutral-800 dark:hover:text-[#f0ece4] text-[10px] border border-neutral-200 dark:border-[rgba(255,255,255,0.06)]"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {filteredCategories.length === 0 ? (
              <div className="py-8 text-center text-neutral-400 dark:text-[#5a5650] text-[11px] font-medium">
                {categorySearch ? "No matches found" : "No categories created"}
              </div>
            ) : (
              filteredCategories.map((cat) => {
                const isSelected = selectedCategoryId === cat.id;
                const isEditingThis = editingCategory?.id === cat.id;

                return (
                  <div
                    key={cat.id}
                    onClick={() => !isEditingThis && setSelectedCategoryId(cat.id)}
                    className={`group w-full flex items-center justify-between rounded-xl px-3 py-2.5 transition-all cursor-pointer relative ${
                      isSelected
                        ? "bg-neutral-100 dark:bg-[#181818] border border-neutral-200 dark:border-[rgba(249,115,22,0.15)] text-neutral-800 dark:text-[#f0ece4]"
                        : "text-neutral-500 dark:text-[#9a9488] hover:text-neutral-800 dark:hover:text-[#f0ece4] hover:bg-neutral-50 dark:hover:bg-[#151515] border border-transparent"
                    }`}
                  >
                    {/* Left Active Glow bar */}
                    {isSelected && (
                      <motion.div
                        layoutId="activeCategoryBorder"
                        className="absolute left-0 top-2 bottom-2 w-1 bg-[#f97316] rounded-full shadow-[0_0_10px_#f97316]"
                      />
                    )}

                    {isEditingThis ? (
                      <div className="flex-1 flex flex-col gap-2" onClick={e => e.stopPropagation()}>
                        <input
                          autoFocus
                          value={editingCategoryName}
                          onChange={e => setEditingCategoryName(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && saveCategoryRename(cat.id)}
                          className="bg-white dark:bg-[#1a1a1a] border border-[#f97316]/50 rounded px-2.5 py-1 text-[12px] text-neutral-800 dark:text-[#f0ece4] focus:outline-none"
                        />
                        <input
                          value={editingCategoryDesc}
                          onChange={e => setEditingCategoryDesc(e.target.value)}
                          placeholder="Add description..."
                          onKeyDown={e => e.key === "Enter" && saveCategoryRename(cat.id)}
                          className="bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-[rgba(255,255,255,0.06)] rounded px-2.5 py-1 text-[10px] text-neutral-400 dark:text-[#9a9488] placeholder-neutral-300 dark:placeholder-[#444] focus:outline-none"
                        />
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => saveCategoryRename(cat.id)}
                            className="p-1 rounded bg-[#f97316]/10 hover:bg-[#f97316]/20 text-[#f97316] text-[10px] font-bold"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingCategory(null)}
                            className="p-1 rounded bg-neutral-100 dark:bg-[#1c1c1c] text-neutral-500 dark:text-[#9a9488] hover:text-neutral-800 dark:hover:text-[#f0ece4] text-[10px]"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-col min-w-0 pr-2">
                          <span className={`text-[13px] font-bold truncate ${isSelected ? "text-[#f97316]" : ""}`}>
                            {cat.name}
                          </span>
                          {cat.description && (
                            <span className="text-[10px] text-neutral-400 dark:text-[#5a5650] truncate mt-0.5 group-hover:text-[#6e685d] font-medium">
                              {cat.description}
                            </span>
                          )}
                        </div>

                        {/* Badging & Actions */}
                        <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                          {/* Count Pill */}
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-colors ${
                            isSelected 
                              ? "bg-[#f97316]/10 border border-[#f97316]/20 text-[#f97316]"
                              : "bg-neutral-100 dark:bg-[#181818] border border-neutral-200 dark:border-[rgba(255,255,255,0.05)] text-neutral-400 dark:text-[#5a5650]"
                          }`}>
                            {cat.menuItems.length}
                          </span>

                          {/* Action overlay buttons shown on hover */}
                          <div className="hidden group-hover:flex items-center gap-1">
                            <button
                              onClick={() => startEditingCategory(cat)}
                              className="w-6 h-6 rounded bg-neutral-100 dark:bg-[#222] hover:bg-neutral-200 dark:hover:bg-[#333] text-neutral-500 dark:text-[#9a9488] hover:text-neutral-800 dark:hover:text-[#f0ece4] flex items-center justify-center transition-colors border border-neutral-200 dark:border-transparent"
                              title="Edit Details"
                            >
                              <Edit size={11} />
                            </button>
                            <button
                              onClick={() => deleteCategory(cat.id)}
                              className="w-6 h-6 rounded bg-red-50 dark:bg-[#ef4444]/10 hover:bg-red-100 dark:hover:bg-[#ef4444]/20 text-red-500 dark:text-[#f87171] flex items-center justify-center transition-colors"
                              title="Delete Category"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Stats Pill Strip bottom */}
          <div className="p-3 border-t border-neutral-200 dark:border-[rgba(255,255,255,0.06)] bg-neutral-50/50 dark:bg-[#131313] flex justify-between text-[10px] text-neutral-400 dark:text-[#5a5650] font-bold">
            <span className="flex items-center gap-1"><LayoutGrid size={11} /> {totalItems} Items</span>
            <span className="flex items-center gap-1 text-red-500 dark:text-[#f87171]"><EyeOff size={11} /> {hiddenItems} Hidden</span>
          </div>
        </div>

        {/* ── RIGHT PANEL: Workspace Item Grid ───────────────────────────── */}
        <div className="space-y-6">
          
          {/* Active Category Header Workspace */}
          {activeCategory ? (
            <div className="bg-white dark:bg-[#111111] border border-neutral-200 dark:border-[rgba(255,255,255,0.06)] rounded-2xl p-5 shadow-md dark:shadow-xl dark:shadow-black/10 relative overflow-hidden">
              {/* Glowing Ambient Backdrop Accent */}
              <div className="absolute right-0 top-0 w-64 h-64 bg-[#f97316]/5 blur-[80px] pointer-events-none rounded-full" />
              
              <div className="flex justify-between items-start flex-wrap gap-4 relative z-10">
                <div className="space-y-1 max-w-lg">
                  <div className="flex items-center gap-2">
                    <h2 className="text-[18px] font-extrabold text-neutral-800 dark:text-[#f0ece4] tracking-tight">{activeCategory.name}</h2>
                    <button
                      onClick={() => startEditingCategory(activeCategory)}
                      className="p-1 rounded-lg text-neutral-400 dark:text-[#5a5650] hover:text-[#f97316] hover:bg-neutral-50 dark:hover:bg-[#1a1a1a] transition-all border border-neutral-200 dark:border-transparent"
                      title="Rename Category"
                    >
                      <Edit size={13} />
                    </button>
                  </div>
                  <p className="text-[12px] text-neutral-500 dark:text-[#9a9488] leading-relaxed">
                    {activeCategory.description || "No description provided for this category section. Add one to describe these items."}
                  </p>
                </div>
                
                {/* Active Category Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => deleteCategory(activeCategory.id)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-950/25 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 text-[11px] font-bold hover:bg-red-100 dark:hover:bg-red-950/40 transition-all"
                  >
                    <Trash2 className="size-3.5" /> Delete Category
                  </button>
                  <button
                    onClick={openDrawerForAdd}
                    id="btn-add-item-workspace"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#f97316] hover:bg-[#ea6c0a] text-white text-[11px] font-extrabold shadow-md shadow-[#f97316]/10 transition-all"
                  >
                    <Plus className="size-3.5" /> Add Dish
                  </button>
                </div>
              </div>

              {/* Live Category-Level Stats Bar */}
              <div className="mt-5 pt-4 border-t border-neutral-200 dark:border-[rgba(255,255,255,0.05)] grid grid-cols-3 gap-2.5 relative z-10">
                <div className="bg-neutral-50/50 dark:bg-[#161616]/40 p-2.5 rounded-xl border border-neutral-200/60 dark:border-[rgba(255,255,255,0.03)] text-center">
                  <p className="text-[9px] text-neutral-400 dark:text-[#5a5650] uppercase tracking-wider font-bold">Total Dishes</p>
                  <p className="text-[16px] font-extrabold text-neutral-800 dark:text-[#f0ece4] mt-0.5">{activeCategory.menuItems.length}</p>
                </div>
                <div className="bg-neutral-50/50 dark:bg-[#161616]/40 p-2.5 rounded-xl border border-neutral-200/60 dark:border-[rgba(255,255,255,0.03)] text-center">
                  <p className="text-[9px] text-neutral-400 dark:text-[#5a5650] uppercase tracking-wider font-bold">Vegetarian Ratio</p>
                  <p className="text-[16px] font-extrabold text-green-600 dark:text-[#4ade80] mt-0.5">
                    {activeCategory.menuItems.filter(i => i.isVeg).length} <span className="text-[10px] text-neutral-400 dark:text-[#5a5650] font-bold">veg</span>
                  </p>
                </div>
                <div className="bg-neutral-50/50 dark:bg-[#161616]/40 p-2.5 rounded-xl border border-neutral-200/60 dark:border-[rgba(255,255,255,0.03)] text-center">
                  <p className="text-[9px] text-neutral-400 dark:text-[#5a5650] uppercase tracking-wider font-bold">Active Public</p>
                  <p className="text-[16px] font-extrabold text-[#f97316] mt-0.5">
                    {activeCategory.menuItems.filter(i => i.isAvailable).length} <span className="text-[10px] text-neutral-400 dark:text-[#5a5650] font-bold">online</span>
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#111111] border border-neutral-200 dark:border-[rgba(255,255,255,0.06)] rounded-2xl p-12 text-center shadow-lg">
              <AlertCircle className="size-8 text-neutral-400 dark:text-[#5a5650] mx-auto mb-3" />
              <p className="text-[15px] font-bold text-neutral-800 dark:text-[#f0ece4]">No Category Selected</p>
              <p className="text-[12px] text-neutral-500 dark:text-[#9a9488] max-w-sm mx-auto mt-1.5">
                Please select an active category from the sidebar or click "Add Category" to create a new category partition.
              </p>
            </div>
          )}

          {/* Filters and Search toolbar */}
          {activeCategory && (
            <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-[#111] p-3 rounded-2xl border border-neutral-200 dark:border-[rgba(255,255,255,0.06)] shadow-sm">
              {/* Item Text Search */}
              <div className="relative w-full sm:flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-neutral-400 dark:text-[#5a5650]" />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={`Search ${activeCategory.name}...`}
                  className="w-full bg-neutral-50 dark:bg-[#161616] border border-neutral-200 dark:border-[rgba(255,255,255,0.08)] rounded-xl pl-10 pr-4 py-2.5 text-[13px] text-neutral-800 dark:text-[#f0ece4] placeholder-neutral-400 dark:placeholder-[#5a5650] outline-none focus:border-[#f97316]/50 transition-colors"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-600">
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* Segmented Filter Veg / Non-Veg */}
              <div className="flex gap-1.5 p-1 bg-neutral-50 dark:bg-[#161616] rounded-xl border border-neutral-200 dark:border-[rgba(255,255,255,0.06)] w-full sm:w-auto">
                <button
                  onClick={() => setVegFilter("all")}
                  className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-[11px] font-bold tracking-wide transition-all ${
                    vegFilter === "all" ? "bg-[#f97316] text-white shadow-sm" : "text-neutral-400 dark:text-[#5a5650] hover:text-neutral-800 dark:hover:text-[#9a9488]"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setVegFilter("veg")}
                  className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wide transition-all flex items-center justify-center gap-1 ${
                    vegFilter === "veg" ? "bg-green-50 dark:bg-[rgba(34,197,94,0.15)] text-green-600 dark:text-[#4ade80] border border-green-200 dark:border-[#22c55e]/30" : "text-neutral-400 dark:text-[#5a5650] hover:text-neutral-800 dark:hover:text-[#9a9488]"
                  }`}
                >
                  <Leaf className="size-3" /> Veg
                </button>
                <button
                  onClick={() => setVegFilter("nonveg")}
                  className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wide transition-all flex items-center justify-center gap-1 ${
                    vegFilter === "nonveg" ? "bg-red-50 dark:bg-[rgba(239,68,68,0.15)] text-red-600 dark:text-[#f87171] border border-red-200 dark:border-[#ef4444]/30" : "text-neutral-400 dark:text-[#5a5650] hover:text-neutral-800 dark:hover:text-[#9a9488]"
                  }`}
                >
                  <Drumstick className="size-3" /> Non-Veg
                </button>
              </div>

              {/* Segmented Filter Available / Hidden */}
              <div className="flex gap-1.5 p-1 bg-neutral-50 dark:bg-[#161616] rounded-xl border border-neutral-200 dark:border-[rgba(255,255,255,0.06)] w-full sm:w-auto">
                <button
                  onClick={() => setAvailabilityFilter("all")}
                  className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wide transition-all ${
                    availabilityFilter === "all" ? "bg-neutral-200 dark:bg-[#222] text-neutral-800 dark:text-[#f0ece4] border border-neutral-300 dark:border-[rgba(255,255,255,0.1)]" : "text-neutral-400 dark:text-[#5a5650] hover:text-neutral-800 dark:hover:text-[#9a9488]"
                  }`}
                >
                  All Status
                </button>
                <button
                  onClick={() => setAvailabilityFilter("active")}
                  className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wide transition-all ${
                    availabilityFilter === "active" ? "bg-green-50 dark:bg-[rgba(34,197,94,0.1)] text-green-600 dark:text-[#4ade80]" : "text-neutral-400 dark:text-[#5a5650] hover:text-neutral-800 dark:hover:text-[#9a9488]"
                  }`}
                >
                  Online
                </button>
                <button
                  onClick={() => setAvailabilityFilter("hidden")}
                  className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wide transition-all ${
                    availabilityFilter === "hidden" ? "bg-red-50 dark:bg-[rgba(239,68,68,0.1)] text-red-600 dark:text-[#f87171]" : "text-neutral-400 dark:text-[#5a5650] hover:text-neutral-800 dark:hover:text-[#9a9488]"
                  }`}
                >
                  Hidden
                </button>
              </div>
            </div>
          )}

          {/* Item grid cards list workspace */}
          {activeCategory && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              
              <AnimatePresence mode="popLayout">
                
                {/* 1. Filtered Items list cards */}
                {filteredItems.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.22, delay: idx * 0.02 }}
                    className={`group bg-white dark:bg-[#111111] border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between ${
                      item.isAvailable
                        ? "border-neutral-200 dark:border-[rgba(255,255,255,0.06)] hover:border-[#f97316]/30 hover:-translate-y-1"
                        : "border-neutral-200/60 dark:border-[rgba(255,255,255,0.03)] opacity-60 hover:opacity-80"
                    }`}
                  >
                    <div>
                      {/* Image Aspect ratio container with overlay controls */}
                      <div className="relative aspect-video w-full overflow-hidden bg-neutral-100 dark:bg-[#161616] border-b border-neutral-200 dark:border-[rgba(255,255,255,0.05)] group/img">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-[#181818] dark:to-[#121212] flex flex-col items-center justify-center text-neutral-300 dark:text-[#3c3a36]">
                            <Utensils className="size-7 stroke-[1.5] mb-1 text-neutral-300 dark:text-[#4a4742] group-hover/img:text-[#f97316]/50 transition-colors" />
                            <span className="text-[9px] uppercase tracking-widest font-extrabold text-neutral-300 dark:text-[#4a4742]">TableScan Menu</span>
                          </div>
                        )}

                        {/* Diet Tag Overlay */}
                        <div className="absolute top-3 left-3">
                          <span className={`flex h-6 items-center gap-1.5 px-2.5 rounded-xl text-[10px] font-bold border backdrop-blur-md ${
                            item.isVeg
                              ? "bg-green-50/90 dark:bg-[rgba(34,197,94,0.15)] border-green-200 dark:border-[#22c55e]/30 text-green-600 dark:text-[#4ade80]"
                              : "bg-red-50/90 dark:bg-[rgba(239,68,68,0.15)] border-red-200 dark:border-[#ef4444]/30 text-red-600 dark:text-[#f87171]"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? "bg-[#22c55e]" : "bg-[#ef4444]"}`} />
                            {item.isVeg ? "Veg" : "Non-Veg"}
                          </span>
                        </div>

                        {/* Item Availability switch overlay floating in bottom-right */}
                        <div className="absolute bottom-3 right-3 flex items-center bg-white/95 dark:bg-[#111111]/85 border border-neutral-200 dark:border-[rgba(255,255,255,0.08)] backdrop-blur-md px-2.5 py-1 rounded-xl shadow-md">
                          <span className={`text-[9px] font-extrabold mr-2 uppercase tracking-wide ${
                            item.isAvailable ? "text-green-600 dark:text-[#4ade80]" : "text-red-500 dark:text-[#f87171]"
                          }`}>
                            {item.isAvailable ? "Online" : "Hidden"}
                          </span>
                          
                          {/* Framer Motion Sliding Switch Toggle */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleAvailability(activeCategory.id, item);
                            }}
                            className={`relative w-8 h-4.5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none flex items-center ${
                              item.isAvailable ? "bg-[#22c55e]" : "bg-neutral-200 dark:bg-[#2c2c2c]"
                            }`}
                          >
                            <motion.div
                              layout
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                              className="w-3.5 h-3.5 rounded-full bg-white shadow"
                              style={{
                                marginLeft: item.isAvailable ? "auto" : "0",
                                marginRight: item.isAvailable ? "0" : "auto",
                              }}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Content block details */}
                      <div className="p-4 space-y-2">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="text-[14px] font-bold text-neutral-800 dark:text-[#f0ece4] line-clamp-1 group-hover:text-[#f97316] transition-colors">{item.name}</h4>
                          <span className="text-[14px] font-extrabold text-neutral-850 dark:text-[#f0ece4] tabular-nums font-mono">₹{item.price}</span>
                        </div>
                        {item.description ? (
                          <p className="text-[11px] text-neutral-500 dark:text-[#9a9488] line-clamp-2 leading-relaxed min-h-[32px]">{item.description}</p>
                        ) : (
                          <p className="text-[11px] text-neutral-400 dark:text-[#444444] italic line-clamp-2 leading-relaxed min-h-[32px]">No description added for this dish.</p>
                        )}
                      </div>
                    </div>

                    {/* Bottom Card Footer Actions Panel */}
                    <div className="px-4 pb-4 pt-1 flex gap-2 border-t border-neutral-100 dark:border-[rgba(255,255,255,0.03)] bg-neutral-50/30 dark:bg-[#131313]/30">
                      <button
                        onClick={() => openDrawerForEdit(item)}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl bg-white dark:bg-[#161616] border border-neutral-250 dark:border-[rgba(255,255,255,0.06)] hover:bg-neutral-50 dark:hover:bg-[#222] text-neutral-500 dark:text-[#9a9488] hover:text-neutral-800 dark:hover:text-[#f0ece4] text-[11px] font-bold transition-all shadow-xs"
                      >
                        <Edit size={12} /> Edit Details
                      </button>
                      <button
                        onClick={() => deleteItem(activeCategory.id, item.id)}
                        className="px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/10 border border-transparent hover:border-red-200 dark:hover:border-red-900/30 text-red-500 hover:text-red-400 text-[11px] flex items-center justify-center transition-all"
                        title="Delete Dish"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </motion.div>
                ))}

                {/* 2. Interactive "Add Menu Item" dashed button card placeholder */}
                {filteredItems.length > 0 && (
                  <motion.button
                    layout
                    onClick={openDrawerForAdd}
                    className="h-full min-h-[225px] rounded-2xl border-2 border-dashed border-neutral-350 dark:border-[rgba(255,255,255,0.08)] hover:border-[#f97316]/30 bg-neutral-50/50 dark:bg-[#0f0f0f] hover:bg-white dark:hover:bg-[#121212]/50 text-neutral-400 dark:text-[#5a5650] hover:text-[#f97316] transition-all flex flex-col items-center justify-center p-6 gap-3 group"
                  >
                    <div className="w-10 h-10 rounded-full border border-dashed border-neutral-300 dark:border-[rgba(255,255,255,0.12)] group-hover:border-[#f97316]/30 flex items-center justify-center transition-all">
                      <Plus className="size-4 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="text-center">
                      <p className="text-[12px] font-bold">Add Menu Item</p>
                      <p className="text-[10px] text-neutral-400 dark:text-[#5a5650] group-hover:text-[#9a9488] transition-colors mt-0.5 max-w-[150px] mx-auto">
                        Insert a new specialty under this category
                      </p>
                    </div>
                  </motion.button>
                )}

              </AnimatePresence>
            </div>
          )}

          {/* Selected Category Empty Items state */}
          {activeCategory && filteredItems.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#111] rounded-2xl border border-neutral-200 dark:border-[rgba(255,255,255,0.06)] text-center px-4"
            >
              <div className="w-14 h-14 rounded-2xl bg-neutral-50 dark:bg-[#161616] border border-neutral-200 dark:border-[rgba(255,255,255,0.06)] flex items-center justify-center mx-auto mb-4">
                <Utensils className="size-6 text-neutral-400 dark:text-[#5a5650]" />
              </div>
              <p className="text-[15px] font-bold text-neutral-800 dark:text-[#f0ece4] mb-1">
                {searchQuery || vegFilter !== "all" || availabilityFilter !== "all" 
                  ? "No matching menu items" 
                  : "No dishes added yet"
                }
              </p>
              <p className="text-[12px] text-neutral-500 dark:text-[#9a9488] mb-5 max-w-xs mx-auto">
                {searchQuery || vegFilter !== "all" || availabilityFilter !== "all"
                  ? "Try resetting your active search text or adjusting the dietary filters."
                  : `Start crafting your dishes or appetizers under this category to populate the menu.`
                }
              </p>
              
              {searchQuery || vegFilter !== "all" || availabilityFilter !== "all" ? (
                <button
                  onClick={() => { setSearchQuery(""); setVegFilter("all"); setAvailabilityFilter("all"); }}
                  className="px-4 py-2 rounded-xl bg-white dark:bg-[#222] border border-neutral-200 dark:border-[rgba(255,255,255,0.08)] text-neutral-800 dark:text-[#f0ece4] hover:bg-neutral-50 dark:hover:bg-[#333] font-bold text-[11px] transition-colors"
                >
                  Reset Active Filters
                </button>
              ) : (
                <button
                  onClick={openDrawerForAdd}
                  className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-[#f97316] text-white text-[12px] font-bold hover:bg-[#ea6c0a] shadow-lg shadow-[#f97316]/10"
                >
                  <Plus className="size-3.5" /> Add First Dish
                </button>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* ── INTERACTIVE WORKSPACE DRAWER (Slide-in Panel) ───────────────── */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Dark blur backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50"
            />
            
            {/* Workspace Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 220 }}
              className="fixed top-0 right-0 bottom-0 w-full sm:w-[460px] bg-white dark:bg-[#0d0d0d] border-l border-neutral-200 dark:border-[rgba(255,255,255,0.08)] shadow-2xl z-50 flex flex-col justify-between"
            >
              {/* Drawer Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 pr-4 scrollbar-thin">
                
                {/* Drawer Header */}
                <div className="flex items-center justify-between pb-4.5 border-b border-neutral-200 dark:border-[rgba(255,255,255,0.06)]">
                  <div>
                    <h3 className="text-[17px] font-extrabold text-neutral-800 dark:text-[#f0ece4] tracking-tight">
                      {drawerMode === "add" ? "Create New Dish" : "Edit Dish Details"}
                    </h3>
                    <p className="text-[11px] text-neutral-500 dark:text-[#9a9488] mt-1 font-medium">
                      {drawerMode === "add" ? "Define a premium menu item under " : "Manage specifications for "}
                      <span className="text-[#f97316] font-bold">{activeCategory?.name}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => setDrawerOpen(false)}
                    className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-[#161616] border border-neutral-200 dark:border-[rgba(255,255,255,0.06)] hover:bg-neutral-200 dark:hover:bg-[#222] text-[#5a5650] hover:text-neutral-800 dark:hover:text-[#f0ece4] flex items-center justify-center transition-colors"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                
                {/* Form Fields Area */}
                <div className="space-y-4 pt-1">
                  
                  {/* Name Input */}
                  <div className="space-y-1.5">
                    <Label htmlFor="drawer-item-name" className="text-neutral-500 dark:text-[#9a9488] text-[10px] font-bold uppercase tracking-wider block">Dish Name *</Label>
                    <Input
                      id="drawer-item-name"
                      autoFocus
                      value={drawerItemData.name}
                      onChange={e => setDrawerItemData({ ...drawerItemData, name: e.target.value })}
                      placeholder="e.g. Tandoori Butter Soya Chaap"
                      className="h-10 bg-neutral-50 dark:bg-[#141414] border-neutral-200 dark:border-[rgba(255,255,255,0.08)] text-neutral-800 dark:text-[#f0ece4] placeholder-neutral-400 dark:placeholder-[#444] focus:border-[#f97316] focus:ring-0 text-[13px] rounded-xl"
                    />
                  </div>
                  
                  {/* Price Input */}
                  <div className="space-y-1.5">
                    <Label htmlFor="drawer-item-price" className="text-neutral-500 dark:text-[#9a9488] text-[10px] font-bold uppercase tracking-wider block">Retail Price (₹) *</Label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-[#5a5650] text-[13px] font-bold font-mono">₹</span>
                      <Input
                        id="drawer-item-price"
                        type="number"
                        value={drawerItemData.price}
                        onChange={e => setDrawerItemData({ ...drawerItemData, price: e.target.value })}
                        placeholder="299"
                        className="h-10 pl-8 bg-neutral-50 dark:bg-[#141414] border-neutral-200 dark:border-[rgba(255,255,255,0.08)] text-neutral-800 dark:text-[#f0ece4] placeholder-neutral-400 dark:placeholder-[#444] focus:border-[#f97316] focus:ring-0 text-[13px] rounded-xl font-mono"
                      />
                    </div>
                  </div>
                  
                  {/* Description text input */}
                  <div className="space-y-1.5">
                    <Label htmlFor="drawer-item-desc" className="text-neutral-500 dark:text-[#9a9488] text-[10px] font-bold uppercase tracking-wider block">Description Specifications</Label>
                    <textarea
                      id="drawer-item-desc"
                      rows={3}
                      value={drawerItemData.description}
                      onChange={e => setDrawerItemData({ ...drawerItemData, description: e.target.value })}
                      placeholder="Ingredients, heat score, allergy warning, and flavor profile details..."
                      className="w-full p-3 bg-neutral-50 dark:bg-[#141414] border border-neutral-200 dark:border-[rgba(255,255,255,0.08)] text-neutral-800 dark:text-[#f0ece4] placeholder-neutral-400 dark:placeholder-[#444] focus:border-[#f97316] focus:ring-0 text-[13px] rounded-xl outline-none resize-none transition-colors"
                    />
                  </div>
                  
                  {/* Veg / Non-Veg Toggle (Segmented control style) */}
                  <div className="space-y-1.5">
                    <Label className="text-neutral-500 dark:text-[#9a9488] text-[10px] font-bold uppercase tracking-wider block mb-1">Dietary Preference</Label>
                    <div className="grid grid-cols-2 gap-2 bg-neutral-50 dark:bg-[#121212] p-1.5 rounded-xl border border-neutral-200 dark:border-[rgba(255,255,255,0.06)]">
                      <button
                        type="button"
                        onClick={() => setDrawerItemData({ ...drawerItemData, isVeg: true })}
                        className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold transition-all ${
                          drawerItemData.isVeg
                            ? "bg-[rgba(34,197,94,0.12)] border border-[#22c55e]/30 text-[#22c55e] dark:text-[#4ade80]"
                            : "text-neutral-500 dark:text-[#5a5650] hover:text-neutral-850"
                        }`}
                      >
                        <Leaf className="size-3.5" /> Veg
                      </button>
                      <button
                        type="button"
                        onClick={() => setDrawerItemData({ ...drawerItemData, isVeg: false })}
                        className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold transition-all ${
                          !drawerItemData.isVeg
                            ? "bg-[rgba(239,68,68,0.12)] border border-[#ef4444]/30 text-[#ef4444] dark:text-[#f87171]"
                            : "text-neutral-500 dark:text-[#5a5650] hover:text-neutral-850"
                        }`}
                      >
                        <Drumstick className="size-3.5" /> Non-Veg
                      </button>
                    </div>
                  </div>
                  
                  {/* Base64 Photo Upload block */}
                  <div className="space-y-1.5">
                    <Label className="text-neutral-500 dark:text-[#9a9488] text-[10px] font-bold uppercase tracking-wider block">Dish Photo Layout</Label>
                    {drawerItemData.image ? (
                      <div className="relative aspect-video rounded-xl overflow-hidden border border-neutral-200 dark:border-[rgba(255,255,255,0.08)] bg-neutral-50 dark:bg-[#161616]">
                        <img src={drawerItemData.image} alt="Dish representation" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setDrawerItemData({ ...drawerItemData, image: "" })}
                          className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-[#ef4444] text-white flex items-center justify-center shadow-lg hover:bg-[#ea3838] transition-colors"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center border border-dashed border-neutral-300 dark:border-[rgba(255,255,255,0.08)] hover:border-[#f97316]/50 rounded-xl p-6 cursor-pointer bg-neutral-50 dark:bg-[#141414] hover:bg-neutral-100 dark:hover:bg-[#181818]/30 transition-all text-center">
                        <div className="w-9 h-9 rounded-xl bg-neutral-200 dark:bg-white/5 flex items-center justify-center mb-2">
                          <ImagePlus className="size-4.5 text-neutral-500 dark:text-[#9a9488]" />
                        </div>
                        <span className="text-[12px] font-bold text-neutral-800 dark:text-[#f0ece4]">Upload premium dish graphic</span>
                        <span className="text-[10px] text-neutral-400 dark:text-[#5a5650] mt-0.5">Recommended 16:9 aspect ratio, under 2MB</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) handleImageFile(file, base64 => setDrawerItemData({ ...drawerItemData, image: base64 }));
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Drawer Footer Actions panel */}
              <div className="p-6 border-t border-neutral-200 dark:border-[rgba(255,255,255,0.06)] bg-neutral-50/50 dark:bg-[#111111]/40 flex gap-3">
                <button
                  onClick={handleDrawerSave}
                  disabled={!drawerItemData.name.trim() || !drawerItemData.price}
                  className="flex-1 py-2.5 rounded-xl bg-[#f97316] text-white font-bold text-[12px] hover:bg-[#ea6c0a] disabled:opacity-50 disabled:hover:bg-[#f97316] transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-[#f97316]/10"
                >
                  {drawerMode === "add" ? <Plus size={14} /> : <Check size={14} />}
                  {drawerMode === "add" ? "Create Dish Item" : "Confirm Modification"}
                </button>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-neutral-100 dark:bg-[#161616] border border-neutral-200 dark:border-[rgba(255,255,255,0.08)] text-[#9a9488] hover:text-neutral-800 dark:hover:text-[#f0ece4] font-bold text-[12px] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      
    </div>
  );
});