"use client";

import { useState, useEffect } from "react";
import { Plus, Package, AlertTriangle, TrendingUp, Search, Filter } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface Ingredient {
  id: string;
  name: string;
  description?: string;
  unit: string;
  category?: string;
  minStock: number;
  currentStock: number;
  costPerUnit: number;
  supplier?: {
    id: string;
    name: string;
  };
}

interface Supplier {
  id: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
}

export default function InventoryManagement({ restaurantId }: { restaurantId: string }) {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [minLoading, setMinLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [addingIngredient, setAddingIngredient] = useState(false);
  const [addingSupplier, setAddingSupplier] = useState(false);

  const [newIngredient, setNewIngredient] = useState({
    name: "",
    description: "",
    unit: "",
    category: "",
    minStock: 0,
    currentStock: 0,
    costPerUnit: 0,
    supplierId: "",
  });

  const [newSupplier, setNewSupplier] = useState({
    name: "",
    contactName: "",
    email: "",
    phone: "",
    address: "",
    leadTime: 0,
  });

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        await Promise.all([
          fetchIngredients(),
          fetchSuppliers()
        ]);
      } finally {
        if (mounted) {
          setLoading(false);
          setMinLoading(false);
        }
      }
    };

    loadData();
  }, [restaurantId]);

  async function fetchIngredients() {
    try {
      const response = await axios.get(`/api/inventory/ingredients?restaurantId=${restaurantId}`);
      setIngredients(response.data);
    } catch (error) {
      toast.error("Failed to load ingredients");
    }
  }

  async function fetchSuppliers() {
    try {
      const response = await axios.get(`/api/inventory/suppliers?restaurantId=${restaurantId}`);
      setSuppliers(response.data);
    } catch (error) {
      console.error("Failed to load suppliers");
    }
  }

  async function addIngredient() {
    if (!newIngredient.name || !newIngredient.unit) {
      toast.error("Name and unit are required");
      return;
    }

    try {
      await axios.post("/api/inventory/ingredients", {
        ...newIngredient,
        restaurantId,
      });
      toast.success("Ingredient added!");
      setNewIngredient({
        name: "",
        description: "",
        unit: "",
        category: "",
        minStock: 0,
        currentStock: 0,
        costPerUnit: 0,
        supplierId: "",
      });
      setAddingIngredient(false);
      fetchIngredients();
    } catch (error) {
      toast.error("Failed to add ingredient");
    }
  }

  async function addSupplier() {
    if (!newSupplier.name) {
      toast.error("Name is required");
      return;
    }

    try {
      await axios.post("/api/inventory/suppliers", {
        ...newSupplier,
        restaurantId,
      });
      toast.success("Supplier added!");
      setNewSupplier({
        name: "",
        contactName: "",
        email: "",
        phone: "",
        address: "",
        leadTime: 0,
      });
      setAddingSupplier(false);
      fetchSuppliers();
    } catch (error) {
      toast.error("Failed to add supplier");
    }
  }

  const lowStockItems = ingredients.filter((item) => item.currentStock <= item.minStock);
  const categories = Array.from(new Set(ingredients.map((i) => i.category).filter(Boolean)));

  const filteredIngredients = ingredients.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  if (minLoading) {
    return (
      <div className="p-7 space-y-6">
        <div className="flex items-center gap-3.5 flex-wrap">
          <Skeleton className="w-[46px] h-[46px] rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-7 space-y-6 text-[#f5efe2]">
      {/* Header */}
      <div className="flex items-center gap-3.5 flex-wrap">
        <div className="w-[46px] h-[46px] rounded-xl bg-gradient-to-br from-[#f0a040] to-[#e85a2a] flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#f0a040]/10 border border-[#f0a040]/20">
          <Package className="size-5 text-[#0b0a08]" />
        </div>
        <div>
          <h1 className="text-[20px] font-bold text-[#f5efe2]">
            Inventory <em className="font-editorial italic font-normal text-[#f0a040]">Management</em>
          </h1>
          <p className="text-[12px] text-[#f5efe2]/60 mt-1">Track ingredients, stock levels, and suppliers</p>
        </div>
        <div className="ml-auto flex gap-2.5">
          <button
            onClick={() => setAddingSupplier(true)}
            className="px-4 py-2.5 rounded-xl bg-white/[0.02] border border-[rgba(255,255,255,0.08)] text-[#f5efe2] text-[12px] font-semibold hover:border-[#f0a040] hover:bg-white/[0.04] transition-all"
          >
            + Add Supplier
          </button>
          <button
            onClick={() => setAddingIngredient(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-[#0b0a08] text-[12px] font-semibold hover:brightness-110 active:scale-95 shadow-lg shadow-amber-950/20 transition-all"
          >
            + Add Ingredient
          </button>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <div className="bg-[rgba(232,90,42,0.05)] border border-[rgba(232,90,42,0.2)] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="size-4 text-[#e85a2a]" />
            <span className="text-[13px] font-semibold text-[#e85a2a]">Low Stock Alert</span>
            <span className="text-[11px] text-[#f5efe2]/40 font-mono-dashboard">({lowStockItems.length} items need attention)</span>
          </div>
          <div className="space-y-2">
            {lowStockItems.slice(0, 3).map((item) => (
              <div key={item.id} className="flex items-center justify-between text-[12px]">
                <span className="text-[#f5efe2]">{item.name}</span>
                <span className="text-[#e85a2a] font-mono-dashboard font-semibold">{item.currentStock} / {item.minStock} {item.unit}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="flex gap-3">
        <div className="flex-1 bg-white/[0.02] border border-[rgba(255,255,255,0.08)] rounded-xl p-3.5 flex items-center gap-2 text-[#f5efe2]/40">
          <Search className="size-4" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ingredients..."
            className="bg-transparent border-none outline-none text-[#f5efe2] placeholder-[#f5efe2]/30 flex-1 text-[13px]"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-3.5 text-[#f5efe2] text-[13px] outline-none focus:border-[#f0a040]/50"
        >
          <option value="all" className="bg-[#0b0a08]">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat} className="bg-[#0b0a08]">
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Add Ingredient Form */}
      {addingIngredient && (
        <div className="bg-white/[0.02] border border-[rgba(255,255,255,0.08)] rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[#f5efe2]/40 text-[10px] font-bold uppercase tracking-wider block mb-1">Name *</label>
              <input
                value={newIngredient.name}
                onChange={(e) => setNewIngredient({ ...newIngredient, name: e.target.value })}
                placeholder="e.g. Tomatoes"
                className="w-full h-10 bg-white/[0.02] border border-[rgba(255,255,255,0.08)] text-[#f5efe2] placeholder-[#f5efe2]/20 focus:border-[#f0a040]/50 focus:ring-0 text-[13px] rounded-xl outline-none px-3"
              />
            </div>
            <div>
              <label className="text-[#f5efe2]/40 text-[10px] font-bold uppercase tracking-wider block mb-1">Unit *</label>
              <input
                value={newIngredient.unit}
                onChange={(e) => setNewIngredient({ ...newIngredient, unit: e.target.value })}
                placeholder="e.g. kg, liters, pieces"
                className="w-full h-10 bg-white/[0.02] border border-[rgba(255,255,255,0.08)] text-[#f5efe2] placeholder-[#f5efe2]/20 focus:border-[#f0a040]/50 focus:ring-0 text-[13px] rounded-xl outline-none px-3"
              />
            </div>
            <div>
              <label className="text-[#f5efe2]/40 text-[10px] font-bold uppercase tracking-wider block mb-1">Category</label>
              <input
                value={newIngredient.category}
                onChange={(e) => setNewIngredient({ ...newIngredient, category: e.target.value })}
                placeholder="e.g. Vegetables, Meat, Dairy"
                className="w-full h-10 bg-white/[0.02] border border-[rgba(255,255,255,0.08)] text-[#f5efe2] placeholder-[#f5efe2]/20 focus:border-[#f0a040]/50 focus:ring-0 text-[13px] rounded-xl outline-none px-3"
              />
            </div>
            <div>
              <label className="text-[#f5efe2]/40 text-[10px] font-bold uppercase tracking-wider block mb-1">Supplier</label>
              <select
                value={newIngredient.supplierId}
                onChange={(e) => setNewIngredient({ ...newIngredient, supplierId: e.target.value })}
                className="w-full h-10 bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] text-[#f5efe2] text-[13px] rounded-xl px-3 outline-none focus:border-[#f0a040]/50"
              >
                <option value="" className="bg-[#0b0a08]">Select supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id} className="bg-[#0b0a08]">
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[#f5efe2]/40 text-[10px] font-bold uppercase tracking-wider block mb-1">Min Stock</label>
              <input
                type="number"
                value={newIngredient.minStock}
                onChange={(e) => setNewIngredient({ ...newIngredient, minStock: parseFloat(e.target.value) || 0 })}
                placeholder="0"
                className="w-full h-10 bg-white/[0.02] border border-[rgba(255,255,255,0.08)] text-[#f5efe2] placeholder-[#f5efe2]/20 focus:border-[#f0a040]/50 focus:ring-0 text-[13px] rounded-xl outline-none px-3 font-mono-dashboard"
              />
            </div>
            <div>
              <label className="text-[#f5efe2]/40 text-[10px] font-bold uppercase tracking-wider block mb-1">Current Stock</label>
              <input
                type="number"
                value={newIngredient.currentStock}
                onChange={(e) => setNewIngredient({ ...newIngredient, currentStock: parseFloat(e.target.value) || 0 })}
                placeholder="0"
                className="w-full h-10 bg-white/[0.02] border border-[rgba(255,255,255,0.08)] text-[#f5efe2] placeholder-[#f5efe2]/20 focus:border-[#f0a040]/50 focus:ring-0 text-[13px] rounded-xl outline-none px-3 font-mono-dashboard"
              />
            </div>
            <div>
              <label className="text-[#f5efe2]/40 text-[10px] font-bold uppercase tracking-wider block mb-1">Cost per Unit (₹)</label>
              <input
                type="number"
                value={newIngredient.costPerUnit}
                onChange={(e) => setNewIngredient({ ...newIngredient, costPerUnit: parseFloat(e.target.value) || 0 })}
                placeholder="0"
                className="w-full h-10 bg-white/[0.02] border border-[rgba(255,255,255,0.08)] text-[#f5efe2] placeholder-[#f5efe2]/20 focus:border-[#f0a040]/50 focus:ring-0 text-[13px] rounded-xl outline-none px-3 font-mono-dashboard"
              />
            </div>
          </div>
          <div>
            <label className="text-[#f5efe2]/40 text-[10px] font-bold uppercase tracking-wider block mb-1">Description</label>
            <input
              value={newIngredient.description}
              onChange={(e) => setNewIngredient({ ...newIngredient, description: e.target.value })}
              placeholder="Optional description"
              className="w-full h-10 bg-white/[0.02] border border-[rgba(255,255,255,0.08)] text-[#f5efe2] placeholder-[#f5efe2]/20 focus:border-[#f0a040]/50 focus:ring-0 text-[13px] rounded-xl outline-none px-3"
            />
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={addIngredient}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-[#0b0a08] text-[12px] font-semibold hover:brightness-110 active:scale-95 transition-all shadow-md shadow-amber-950/20"
            >
              Save Ingredient
            </button>
            <button
              onClick={() => {
                setAddingIngredient(false);
                setNewIngredient({
                  name: "",
                  description: "",
                  unit: "",
                  category: "",
                  minStock: 0,
                  currentStock: 0,
                  costPerUnit: 0,
                  supplierId: "",
                });
              }}
              className="px-4 py-2 rounded-xl bg-white/[0.02] border border-[rgba(255,255,255,0.08)] text-[#f5efe2]/60 hover:text-[#f5efe2] hover:bg-white/[0.04] transition-colors text-[12px]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Add Supplier Form */}
      {addingSupplier && (
        <div className="bg-white/[0.02] border border-[rgba(255,255,255,0.08)] rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[#f5efe2]/40 text-[10px] font-bold uppercase tracking-wider block mb-1">Name *</label>
              <input
                value={newSupplier.name}
                onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                placeholder="Supplier name"
                className="w-full h-10 bg-white/[0.02] border border-[rgba(255,255,255,0.08)] text-[#f5efe2] placeholder-[#f5efe2]/20 focus:border-[#f0a040]/50 focus:ring-0 text-[13px] rounded-xl outline-none px-3"
              />
            </div>
            <div>
              <label className="text-[#f5efe2]/40 text-[10px] font-bold uppercase tracking-wider block mb-1">Contact Name</label>
              <input
                value={newSupplier.contactName}
                onChange={(e) => setNewSupplier({ ...newSupplier, contactName: e.target.value })}
                placeholder="Contact person"
                className="w-full h-10 bg-white/[0.02] border border-[rgba(255,255,255,0.08)] text-[#f5efe2] placeholder-[#f5efe2]/20 focus:border-[#f0a040]/50 focus:ring-0 text-[13px] rounded-xl outline-none px-3"
              />
            </div>
            <div>
              <label className="text-[#f5efe2]/40 text-[10px] font-bold uppercase tracking-wider block mb-1">Email</label>
              <input
                type="email"
                value={newSupplier.email}
                onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                placeholder="email@example.com"
                className="w-full h-10 bg-white/[0.02] border border-[rgba(255,255,255,0.08)] text-[#f5efe2] placeholder-[#f5efe2]/20 focus:border-[#f0a040]/50 focus:ring-0 text-[13px] rounded-xl outline-none px-3"
              />
            </div>
            <div>
              <label className="text-[#f5efe2]/40 text-[10px] font-bold uppercase tracking-wider block mb-1">Phone</label>
              <input
                value={newSupplier.phone}
                onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                placeholder="Phone number"
                className="w-full h-10 bg-white/[0.02] border border-[rgba(255,255,255,0.08)] text-[#f5efe2] placeholder-[#f5efe2]/20 focus:border-[#f0a040]/50 focus:ring-0 text-[13px] rounded-xl outline-none px-3 font-mono-dashboard"
              />
            </div>
            <div>
              <label className="text-[#f5efe2]/40 text-[10px] font-bold uppercase tracking-wider block mb-1">Lead Time (days)</label>
              <input
                type="number"
                value={newSupplier.leadTime}
                onChange={(e) => setNewSupplier({ ...newSupplier, leadTime: parseInt(e.target.value) || 0 })}
                placeholder="0"
                className="w-full h-10 bg-white/[0.02] border border-[rgba(255,255,255,0.08)] text-[#f5efe2] placeholder-[#f5efe2]/20 focus:border-[#f0a040]/50 focus:ring-0 text-[13px] rounded-xl outline-none px-3 font-mono-dashboard"
              />
            </div>
          </div>
          <div>
            <label className="text-[#f5efe2]/40 text-[10px] font-bold uppercase tracking-wider block mb-1">Address</label>
            <input
              value={newSupplier.address}
              onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
              placeholder="Supplier address"
              className="w-full h-10 bg-white/[0.02] border border-[rgba(255,255,255,0.08)] text-[#f5efe2] placeholder-[#f5efe2]/20 focus:border-[#f0a040]/50 focus:ring-0 text-[13px] rounded-xl outline-none px-3"
            />
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={addSupplier}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-[#0b0a08] text-[12px] font-semibold hover:brightness-110 active:scale-95 transition-all shadow-md shadow-amber-950/20"
            >
              Save Supplier
            </button>
            <button
              onClick={() => {
                setAddingSupplier(false);
                setNewSupplier({
                  name: "",
                  contactName: "",
                  email: "",
                  phone: "",
                  address: "",
                  leadTime: 0,
                });
              }}
              className="px-4 py-2 rounded-xl bg-white/[0.02] border border-[rgba(255,255,255,0.08)] text-[#f5efe2]/60 hover:text-[#f5efe2] hover:bg-white/[0.04] transition-colors text-[12px]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Ingredients List */}
      <div className="bg-white/[0.02] border border-[rgba(255,255,255,0.08)] rounded-xl overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-[rgba(255,255,255,0.08)] bg-white/[0.01] text-[10px] text-[#f5efe2]/40 font-bold tracking-wider uppercase">
          <div className="col-span-3">Ingredient</div>
          <div className="col-span-2">Category</div>
          <div className="col-span-2">Stock</div>
          <div className="col-span-2">Min Stock</div>
          <div className="col-span-2">Supplier</div>
          <div className="col-span-1">Status</div>
        </div>
        {filteredIngredients.length === 0 ? (
          <div className="text-center py-16">
            <Package className="size-12 text-[#f5efe2]/20 mx-auto mb-4" />
            <p className="text-[12px] text-[#f5efe2]/60">No ingredients found</p>
            <p className="text-[11px] text-[#f5efe2]/40 mt-1">Add ingredients to start tracking inventory</p>
          </div>
        ) : (
          <div className="divide-y divide-[rgba(255,255,255,0.05)]">
            {filteredIngredients.map((item) => (
              <div key={item.id} className="grid grid-cols-12 gap-4 px-5 py-3.5 items-center hover:bg-white/[0.01] transition-colors">
                <div className="col-span-3">
                  <div className="text-[13px] font-bold text-[#f5efe2]">{item.name}</div>
                  {item.description && <div className="text-[11px] text-[#f5efe2]/40 mt-0.5">{item.description}</div>}
                </div>
                <div className="col-span-2 text-[12px] text-[#f5efe2]/60">{item.category || "-"}</div>
                <div className="col-span-2 text-[13px] font-semibold text-[#f5efe2] font-mono-dashboard">{item.currentStock} {item.unit}</div>
                <div className="col-span-2 text-[12px] text-[#f5efe2]/40 font-mono-dashboard">{item.minStock} {item.unit}</div>
                <div className="col-span-2 text-[12px] text-[#f5efe2]/60">{item.supplier?.name || "-"}</div>
                <div className="col-span-1">
                  {item.currentStock <= item.minStock ? (
                    <span className="text-[9px] px-2.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-[#e85a2a] font-black uppercase tracking-wider">Low</span>
                  ) : (
                    <span className="text-[9px] px-2.5 py-0.5 rounded-full bg-[rgba(82,210,122,0.15)] border border-[rgba(82,210,122,0.3)] text-[#52d27a] font-black uppercase tracking-wider">OK</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
