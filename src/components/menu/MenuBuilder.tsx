"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ChevronDown, Leaf, Drumstick, Search, Utensils, Sparkles, ImagePlus, X } from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";

interface Variant { id: string; name: string; price: number; }
interface MenuItem { id: string; name: string; description?: string; price: number; isVeg: boolean; isAvailable: boolean; tags: string[]; variants: Variant[]; image?: string; }
interface Category { id: string; name: string; description?: string; menuItems: MenuItem[]; }

export default function MenuBuilder({ restaurantId }: { restaurantId: string }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [newCatName, setNewCatName] = useState("");
  const [addingCat, setAddingCat] = useState(false);

  const [addingItemTo, setAddingItemTo] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ name: "", price: "", description: "", isVeg: true, image: "" });

  const fetchCategories = useCallback(async () => {
    try {
      const res = await axios.get(`/api/menu/categories?restaurantId=${restaurantId}`);
      setCategories(res.data);
    } catch { toast.error("Failed to load menu"); }
    finally { setLoading(false); }
  }, [restaurantId]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  async function addSampleData() {
    try {
      toast.loading("Adding sample menu data...");
      
      const sampleCategories = [
        { name: "Starters", description: "Appetizers and light bites", restaurantId },
        { name: "Main Course", description: "Hearty meals and specialties", restaurantId },
        { name: "Beverages", description: "Refreshing drinks", restaurantId },
        { name: "Desserts", description: "Sweet treats", restaurantId },
      ];

      const createdCategories = [];
      for (const cat of sampleCategories) {
        const catRes = await axios.post("/api/menu/categories", cat);
        createdCategories.push(catRes.data);
      }

      const sampleItems = [
        { categoryId: createdCategories[0].id, name: "Paneer Tikka", description: "Grilled cottage cheese with spices", price: 180, isVeg: true },
        { categoryId: createdCategories[0].id, name: "Chicken Wings", description: "Spicy fried chicken wings", price: 220, isVeg: false },
        { categoryId: createdCategories[0].id, name: "Spring Rolls", description: "Crispy vegetable spring rolls", price: 150, isVeg: true },
        { categoryId: createdCategories[0].id, name: "Garlic Naan", description: "Soft naan bread with garlic butter", price: 40, isVeg: true },
        { categoryId: createdCategories[1].id, name: "Butter Chicken", description: "Creamy tomato-based chicken curry", price: 320, isVeg: false },
        { categoryId: createdCategories[1].id, name: "Paneer Butter Masala", description: "Creamy paneer in tomato gravy", price: 280, isVeg: true },
        { categoryId: createdCategories[1].id, name: "Biryani", description: "Fragrant basmati rice with spices", price: 250, isVeg: true },
        { categoryId: createdCategories[1].id, name: "Dal Makhani", description: "Creamy black lentils", price: 200, isVeg: true },
        { categoryId: createdCategories[2].id, name: "Mango Lassi", description: "Sweet mango yogurt drink", price: 80, isVeg: true },
        { categoryId: createdCategories[2].id, name: "Masala Chai", description: "Spiced Indian tea", price: 40, isVeg: true },
        { categoryId: createdCategories[2].id, name: "Fresh Lime Soda", description: "Refreshing lime soda", price: 60, isVeg: true },
        { categoryId: createdCategories[2].id, name: "Cold Coffee", description: "Iced coffee with ice cream", price: 90, isVeg: true },
        { categoryId: createdCategories[3].id, name: "Gulab Jamun", description: "Sweet milk dumplings in syrup", price: 80, isVeg: true },
        { categoryId: createdCategories[3].id, name: "Rasmalai", description: "Soft cheese in sweet milk", price: 100, isVeg: true },
        { categoryId: createdCategories[3].id, name: "Ice Cream", description: "Vanilla ice cream scoop", price: 70, isVeg: true },
        { categoryId: createdCategories[3].id, name: "Chocolate Brownie", description: "Warm chocolate brownie", price: 120, isVeg: true },
      ];

      for (const item of sampleItems) {
        await axios.post("/api/menu/items", { ...item, restaurantId, tags: [] });
      }

      await fetchCategories();
      toast.dismiss();
      toast.success("Sample menu added!");
    } catch (error) {
      console.error("Failed to add sample data:", error);
      toast.dismiss();
      toast.error("Failed to add sample data");
    }
  }

  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cat.menuItems.some(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  async function addCategory() {
    if (!newCatName.trim()) return;
    try {
      const res = await axios.post("/api/menu/categories", { name: newCatName, restaurantId });
      setCategories([...categories, { ...res.data, menuItems: [] }]);
      setNewCatName("");
      setAddingCat(false);
      toast.success("Category added!");
    } catch { toast.error("Failed to add category"); }
  }

  async function deleteCategory(id: string) {
    if (!confirm("Delete this category and all its items?")) return;
    try {
      await axios.delete(`/api/menu/categories/${id}`);
      setCategories(categories.filter(c => c.id !== id));
      toast.success("Category deleted");
    } catch { toast.error("Failed to delete category"); }
  }

  async function addItem(categoryId: string) {
    if (!newItem.name.trim() || !newItem.price) return;
    if (parseFloat(newItem.price) <= 0) {
      toast.error("Price must be greater than 0");
      return;
    }
    try {
      const res = await axios.post("/api/menu/items", {
        name: newItem.name,
        description: newItem.description,
        price: parseFloat(newItem.price),
        isVeg: newItem.isVeg,
        image: newItem.image || undefined,
        categoryId,
        restaurantId,
        tags: [],
      });
      setCategories(categories.map(c =>
        c.id === categoryId ? { ...c, menuItems: [...c.menuItems, res.data] } : c
      ));
      setNewItem({ name: "", price: "", description: "", isVeg: true, image: "" });
      setAddingItemTo(null);
      toast.success("Item added!");
    } catch { toast.error("Failed to add item"); }
  }

  function handleImageFile(file: File, onDone: (base64: string) => void) {
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Image must be under 2MB"); return; }
    const reader = new FileReader();
    reader.onloadend = () => onDone(reader.result as string);
    reader.readAsDataURL(file);
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
    if (!confirm("Delete this item?")) return;
    try {
      await axios.delete(`/api/menu/items/${itemId}`);
      setCategories(categories.map(c =>
        c.id === categoryId ? { ...c, menuItems: c.menuItems.filter(i => i.id !== itemId) } : c
      ));
      toast.success("Item deleted");
    } catch { toast.error("Failed to delete item"); }
  }

  async function toggleAvailability(categoryId: string, item: MenuItem) {
    try {
      const res = await axios.patch(`/api/menu/items/${item.id}`, { isAvailable: !item.isAvailable });
      setCategories(categories.map(c =>
        c.id === categoryId ? { ...c, menuItems: c.menuItems.map(i => i.id === item.id ? res.data : i) } : c
      ));
    } catch { toast.error("Failed to update item"); }
  }

  if (loading) return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex justify-center p-12 text-[#999999]"
    >
      Loading menu...
    </motion.div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="p-7 space-y-6"
    >
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center gap-3.5 flex-wrap mb-5"
      >
        <div className="w-[46px] h-[46px] rounded-xl bg-[#f97316] flex items-center justify-center flex-shrink-0">
          <Utensils className="size-5 text-white" />
        </div>
        <div>
          <h1 className="text-[20px] font-bold text-[#f0ece4]">Menu Builder</h1>
          <p className="text-[12px] text-[#9a9488]">Manage your restaurant menu</p>
        </div>
        <div className="ml-auto flex gap-2.5 flex-wrap">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setAddingCat(true)}
            className="px-4 py-2.5 rounded-lg bg-[#f97316] text-white text-[12px] font-semibold hover:bg-[#ea6c0a] transition-all"
          >
            + Add Category
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={addSampleData}
            className="px-4 py-2.5 rounded-lg bg-[#222222] border border-[rgba(34,197,94,0.4)] text-[#4ade80] text-[12px] font-semibold hover:border-[#4ade80] transition-all"
          >
            ✦ Add Sample Menu
          </motion.button>
        </div>
      </motion.div>

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="bg-[#111111] border border-[rgba(255,255,255,0.07)] rounded-lg p-3.5 flex items-center gap-2 text-[#5a5650] text-[13px]">
          <Search className="size-4" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search menu items or categories..."
            className="bg-none border-none outline-none text-[#f0ece4] flex-1 text-[13px]"
          />
        </div>
      </motion.div>

      {/* Add Category Card */}
      <AnimatePresence mode="wait">
        {addingCat && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="bg-[#111111] border border-[rgba(255,255,255,0.07)] rounded-xl p-5 space-y-4">
              <Label className="text-[#f0ece4] text-[12px] font-medium">Category Name</Label>
              <Input
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                placeholder="e.g. Starters, Main Course..."
                onKeyDown={e => e.key === "Enter" && addCategory()}
                className="h-10 bg-[#222222] border-[rgba(255,255,255,0.12)] text-[#f0ece4] placeholder-[#5a5650] focus:border-[#f97316] text-[13px]"
              />
              <div className="flex gap-2.5">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={addCategory}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-[#f97316] text-white text-[12px] font-semibold hover:bg-[#ea6c0a] transition-colors"
                >
                  Save
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { setAddingCat(false); setNewCatName(""); }}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-[#222222] border border-[rgba(255,255,255,0.12)] text-[#f0ece4] hover:bg-[#181818] transition-colors text-[12px]"
                >
                  Cancel
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {filteredCategories.length === 0 && !addingCat && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-24"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#222222] mx-auto mb-4">
            <Sparkles className="size-6 text-[#5a5650]" />
          </div>
          <p className="text-[20px] font-semibold text-[#5a5650]">No categories yet</p>
          <p className="text-[13px] text-[#9a9488]">Add a category to start building your menu</p>
        </motion.div>
      )}

      {/* Categories */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-2.5"
      >
        <AnimatePresence mode="popLayout">
          {filteredCategories.map((cat, idx) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <div className="bg-[#111111] border border-[rgba(255,255,255,0.07)] rounded-xl p-[14px_18px] flex items-center gap-3 transition-colors hover:border-[rgba(255,255,255,0.12)]">
                <ChevronDown size={14} className="text-[#5a5650] cursor-pointer" onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)} />
                <span className="text-[14px] font-semibold text-[#f0ece4]">{cat.name}</span>
                <span className="text-[11px] text-[#5a5650] ml-1 bg-[#222222] px-2 py-0.5 rounded">{cat.menuItems.length} items</span>
                <div className="ml-auto flex gap-2 items-center">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setAddingItemTo(addingItemTo === cat.id ? null : cat.id)}
                    className="text-[12px] text-[#9a9488] cursor-pointer flex items-center gap-1 hover:text-[#f97316]"
                  >
                    + Add Item
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => deleteCategory(cat.id)}
                    className="w-[28px] h-[28px] rounded-lg bg-[rgba(239,68,68,0.12)] border-none text-[#f87171] hover:bg-[rgba(239,68,68,0.2)] transition-colors flex items-center justify-center"
                  >
                    <Trash2 size={14} />
                  </motion.button>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {(expandedCat === cat.id || addingItemTo === cat.id) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="mt-2.5"
                  >
                    <div className="space-y-3">
                      {addingItemTo === cat.id && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-[#222222] rounded-xl p-4 space-y-4 border border-[rgba(255,255,255,0.07)]"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <Label className="text-[#f0ece4] text-[12px] font-medium">Item Name *</Label>
                              <Input
                                value={newItem.name}
                                onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                                placeholder="e.g. Paneer Tikka"
                                className="h-10 bg-[#181818] border-[rgba(255,255,255,0.12)] text-[#f0ece4] placeholder-[#5a5650] focus:border-[#f97316] text-[13px]"
                              />
                            </div>
                            <div>
                              <Label className="text-[#f0ece4] text-[12px] font-medium">Price (₹) *</Label>
                              <Input
                                type="number"
                                value={newItem.price}
                                onChange={e => setNewItem({ ...newItem, price: e.target.value })}
                                placeholder="299"
                                className="h-10 bg-[#181818] border-[rgba(255,255,255,0.12)] text-[#f0ece4] placeholder-[#5a5650] focus:border-[#f97316] text-[13px]"
                              />
                            </div>
                          </div>
                          <div>
                            <Label className="text-[#f0ece4] text-[12px] font-medium">Description</Label>
                            <Input
                              value={newItem.description}
                              onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                              placeholder="Optional description"
                              className="h-10 bg-[#181818] border-[rgba(255,255,255,0.12)] text-[#f0ece4] placeholder-[#5a5650] focus:border-[#f97316] text-[13px]"
                            />
                          </div>
                          <div>
                            <Label className="text-[#f0ece4] text-[12px] font-medium">Image</Label>
                            <div className="flex items-center gap-3">
                              {newItem.image ? (
                                <div className="relative">
                                  <img src={newItem.image} alt="Preview" className="w-20 h-20 rounded-lg object-cover border border-[rgba(255,255,255,0.12)]" />
                                  <button
                                    type="button"
                                    onClick={() => setNewItem({ ...newItem, image: "" })}
                                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#ef4444] flex items-center justify-center text-white hover:bg-[#dc2626]"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <label className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-[rgba(255,255,255,0.12)] hover:border-[#f97316] cursor-pointer transition-colors">
                                  <ImagePlus className="w-4 h-4 text-[#9a9488]" />
                                  <span className="text-[13px] text-[#9a9488]">Upload image</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleImageFile(file, (base64) => setNewItem({ ...newItem, image: base64 }));
                                    }}
                                  />
                                </label>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <Label className="text-[#f0ece4] text-[12px] font-medium">Type:</Label>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setNewItem({ ...newItem, isVeg: true })}
                              className={`flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-medium border transition-all ${
                                newItem.isVeg
                                  ? "bg-[rgba(34,197,94,0.1)] border-[#22c55e] text-[#22c55e]"
                                  : "border-[rgba(255,255,255,0.12)] text-[#9a9488] hover:border-[#22c55e]"
                              }`}
                            >
                              <Leaf size={14} /> Veg
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setNewItem({ ...newItem, isVeg: false })}
                              className={`flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-medium border transition-all ${
                                !newItem.isVeg
                                  ? "bg-[rgba(239,68,68,0.1)] border-[#ef4444] text-[#ef4444]"
                                  : "border-[rgba(255,255,255,0.12)] text-[#9a9488] hover:border-[#ef4444]"
                              }`}
                            >
                              <Drumstick size={14} /> Non-Veg
                            </motion.button>
                          </div>
                          <div className="flex gap-2.5">
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => addItem(cat.id)}
                              className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-[#f97316] text-white text-[12px] font-semibold hover:bg-[#ea6c0a] transition-colors"
                            >
                              Save Item
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => {
                                setAddingItemTo(null);
                                setNewItem({ name: "", price: "", description: "", isVeg: true, image: "" });
                              }}
                              className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-[#222222] border border-[rgba(255,255,255,0.12)] text-[#f0ece4] hover:bg-[#181818] transition-colors text-[12px]"
                            >
                              Cancel
                            </motion.button>
                          </div>
                        </motion.div>
                      )}

                      <div className="space-y-2">
                        {cat.menuItems.map(item => (
                          <motion.div
                            key={item.id}
                            whileHover={{ scale: 1.01, x: 4 }}
                            className="flex items-center justify-between gap-3 p-4 bg-[#181818] border border-[rgba(255,255,255,0.07)] rounded-lg hover:bg-[#222222] transition-all"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              {item.image && (
                                <img src={item.image} alt={item.name} className="w-12 h-12 rounded-lg object-cover border border-[rgba(255,255,255,0.12)] flex-shrink-0" />
                              )}
                              {item.isVeg
                                ? <span className="flex h-6 w-6 items-center justify-center rounded border-2 border-[#22c55e] flex-shrink-0">
                                    <span className="h-2 w-2 rounded-full bg-[#22c55e]" />
                                  </span>
                                : <span className="flex h-6 w-6 items-center justify-center rounded border-2 border-[#ef4444] flex-shrink-0">
                                    <span className="h-2 w-2 rounded-full bg-[#ef4444]" />
                                  </span>
                              }
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-[#f0ece4] text-[13px]">{item.name}</p>
                                {item.description && <p className="text-[11px] text-[#9a9488] truncate">{item.description}</p>}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <span className="font-semibold text-[#f0ece4] text-[13px] tabular-nums">₹{item.price}</span>
                              {!item.image ? (
                                <label className="cursor-pointer">
                                  <ImagePlus className="w-4 h-4 text-[#9a9488] hover:text-[#f97316] transition-colors" />
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleImageFile(file, (base64) => updateItemImage(cat.id, item, base64));
                                    }}
                                  />
                                </label>
                              ) : (
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => removeItemImage(cat.id, item)}
                                  className="text-[#9a9488] hover:text-[#ef4444] transition-colors"
                                  title="Remove image"
                                >
                                  <X className="w-4 h-4" />
                                </motion.button>
                              )}
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => toggleAvailability(cat.id, item)}
                                className={`text-[10px] px-3 py-1 rounded-full font-medium transition-all ${
                                  item.isAvailable
                                    ? "bg-[#222222] text-[#9a9488]"
                                    : "bg-[#555555]/10 text-[#999999] border border-[rgba(255,255,255,0.07)]"
                                }`}
                              >
                                {item.isAvailable ? "Available" : "Hidden"}
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => deleteItem(cat.id, item.id)}
                                className="flex items-center justify-center h-8 w-8 rounded-lg bg-[rgba(239,68,68,0.12)] border-none text-[#f87171] hover:bg-[rgba(239,68,68,0.2)] transition-colors"
                              >
                                <Trash2 size={14} />
                              </motion.button>
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      {cat.menuItems.length === 0 && addingItemTo !== cat.id && (
                        <p className="text-center text-[12px] text-[#5a5650] py-6">No items yet — click "Add Item"</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}