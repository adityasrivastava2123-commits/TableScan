"use client";

import { useState, useEffect } from "react";
import { Plus, Package, AlertTriangle, TrendingUp, Search, Filter } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";

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
    fetchIngredients();
    fetchSuppliers();
  }, [restaurantId]);

  async function fetchIngredients() {
    try {
      const response = await axios.get(`/api/inventory/ingredients?restaurantId=${restaurantId}`);
      setIngredients(response.data);
    } catch (error) {
      toast.error("Failed to load ingredients");
    } finally {
      setLoading(false);
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

  if (loading) {
    return <div className="text-center py-12 text-[#9a9488]">Loading inventory...</div>;
  }

  return (
    <div className="p-7 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3.5 flex-wrap">
        <div className="w-[46px] h-[46px] rounded-xl bg-[#f97316] flex items-center justify-center flex-shrink-0">
          <Package className="size-5 text-white" />
        </div>
        <div>
          <h1 className="text-[20px] font-bold text-[#f0ece4]">Inventory Management</h1>
          <p className="text-[12px] text-[#9a9488]">Track ingredients, stock levels, and suppliers</p>
        </div>
        <div className="ml-auto flex gap-2.5">
          <button
            onClick={() => setAddingSupplier(true)}
            className="px-4 py-2.5 rounded-lg bg-[#222222] border border-[rgba(255,255,255,0.12)] text-[#f0ece4] text-[12px] font-semibold hover:border-[#f97316] hover:text-[#f97316] transition-all"
          >
            + Add Supplier
          </button>
          <button
            onClick={() => setAddingIngredient(true)}
            className="px-4 py-2.5 rounded-lg bg-[#f97316] text-white text-[12px] font-semibold hover:bg-[#ea6c0a] transition-all"
          >
            + Add Ingredient
          </button>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <div className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="size-4 text-[#f87171]" />
            <span className="text-[13px] font-semibold text-[#f87171]">Low Stock Alert</span>
            <span className="text-[11px] text-[#9a9488]">({lowStockItems.length} items need attention)</span>
          </div>
          <div className="space-y-2">
            {lowStockItems.slice(0, 3).map((item) => (
              <div key={item.id} className="flex items-center justify-between text-[12px]">
                <span className="text-[#f0ece4]">{item.name}</span>
                <span className="text-[#f87171]">{item.currentStock} / {item.minStock} {item.unit}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="flex gap-3">
        <div className="flex-1 bg-[#111111] border border-[rgba(255,255,255,0.07)] rounded-lg p-3.5 flex items-center gap-2 text-[#5a5650]">
          <Search className="size-4" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ingredients..."
            className="bg-none border-none outline-none text-[#f0ece4] flex-1 text-[13px]"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-[#111111] border border-[rgba(255,255,255,0.07)] rounded-lg px-4 py-3.5 text-[#f0ece4] text-[13px] outline-none"
        >
          <option value="all">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Add Ingredient Form */}
      {addingIngredient && (
        <div className="bg-[#111111] border border-[rgba(255,255,255,0.07)] rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[#f0ece4] text-[12px] font-medium mb-1 block">Name *</label>
              <input
                value={newIngredient.name}
                onChange={(e) => setNewIngredient({ ...newIngredient, name: e.target.value })}
                placeholder="e.g. Tomatoes"
                className="w-full h-10 bg-[#222222] border-[rgba(255,255,255,0.12)] text-[#f0ece4] placeholder-[#5a5650] focus:border-[#f97316] text-[13px] px-3"
              />
            </div>
            <div>
              <label className="text-[#f0ece4] text-[12px] font-medium mb-1 block">Unit *</label>
              <input
                value={newIngredient.unit}
                onChange={(e) => setNewIngredient({ ...newIngredient, unit: e.target.value })}
                placeholder="e.g. kg, liters, pieces"
                className="w-full h-10 bg-[#222222] border-[rgba(255,255,255,0.12)] text-[#f0ece4] placeholder-[#5a5650] focus:border-[#f97316] text-[13px] px-3"
              />
            </div>
            <div>
              <label className="text-[#f0ece4] text-[12px] font-medium mb-1 block">Category</label>
              <input
                value={newIngredient.category}
                onChange={(e) => setNewIngredient({ ...newIngredient, category: e.target.value })}
                placeholder="e.g. Vegetables, Meat, Dairy"
                className="w-full h-10 bg-[#222222] border-[rgba(255,255,255,0.12)] text-[#f0ece4] placeholder-[#5a5650] focus:border-[#f97316] text-[13px] px-3"
              />
            </div>
            <div>
              <label className="text-[#f0ece4] text-[12px] font-medium mb-1 block">Supplier</label>
              <select
                value={newIngredient.supplierId}
                onChange={(e) => setNewIngredient({ ...newIngredient, supplierId: e.target.value })}
                className="w-full h-10 bg-[#222222] border-[rgba(255,255,255,0.12)] text-[#f0ece4] text-[13px] px-3 outline-none"
              >
                <option value="">Select supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[#f0ece4] text-[12px] font-medium mb-1 block">Min Stock</label>
              <input
                type="number"
                value={newIngredient.minStock}
                onChange={(e) => setNewIngredient({ ...newIngredient, minStock: parseFloat(e.target.value) || 0 })}
                placeholder="0"
                className="w-full h-10 bg-[#222222] border-[rgba(255,255,255,0.12)] text-[#f0ece4] placeholder-[#5a5650] focus:border-[#f97316] text-[13px] px-3"
              />
            </div>
            <div>
              <label className="text-[#f0ece4] text-[12px] font-medium mb-1 block">Current Stock</label>
              <input
                type="number"
                value={newIngredient.currentStock}
                onChange={(e) => setNewIngredient({ ...newIngredient, currentStock: parseFloat(e.target.value) || 0 })}
                placeholder="0"
                className="w-full h-10 bg-[#222222] border-[rgba(255,255,255,0.12)] text-[#f0ece4] placeholder-[#5a5650] focus:border-[#f97316] text-[13px] px-3"
              />
            </div>
            <div>
              <label className="text-[#f0ece4] text-[12px] font-medium mb-1 block">Cost per Unit</label>
              <input
                type="number"
                value={newIngredient.costPerUnit}
                onChange={(e) => setNewIngredient({ ...newIngredient, costPerUnit: parseFloat(e.target.value) || 0 })}
                placeholder="0"
                className="w-full h-10 bg-[#222222] border-[rgba(255,255,255,0.12)] text-[#f0ece4] placeholder-[#5a5650] focus:border-[#f97316] text-[13px] px-3"
              />
            </div>
          </div>
          <div>
            <label className="text-[#f0ece4] text-[12px] font-medium mb-1 block">Description</label>
            <input
              value={newIngredient.description}
              onChange={(e) => setNewIngredient({ ...newIngredient, description: e.target.value })}
              placeholder="Optional description"
              className="w-full h-10 bg-[#222222] border-[rgba(255,255,255,0.12)] text-[#f0ece4] placeholder-[#5a5650] focus:border-[#f97316] text-[13px] px-3"
            />
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={addIngredient}
              className="px-4 py-2 rounded-lg bg-[#f97316] text-white text-[12px] font-semibold hover:bg-[#ea6c0a] transition-colors"
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
              className="px-4 py-2 rounded-lg bg-[#222222] border border-[rgba(255,255,255,0.12)] text-[#f0ece4] hover:bg-[#181818] transition-colors text-[12px]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Add Supplier Form */}
      {addingSupplier && (
        <div className="bg-[#111111] border border-[rgba(255,255,255,0.07)] rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[#f0ece4] text-[12px] font-medium mb-1 block">Name *</label>
              <input
                value={newSupplier.name}
                onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                placeholder="Supplier name"
                className="w-full h-10 bg-[#222222] border-[rgba(255,255,255,0.12)] text-[#f0ece4] placeholder-[#5a5650] focus:border-[#f97316] text-[13px] px-3"
              />
            </div>
            <div>
              <label className="text-[#f0ece4] text-[12px] font-medium mb-1 block">Contact Name</label>
              <input
                value={newSupplier.contactName}
                onChange={(e) => setNewSupplier({ ...newSupplier, contactName: e.target.value })}
                placeholder="Contact person"
                className="w-full h-10 bg-[#222222] border-[rgba(255,255,255,0.12)] text-[#f0ece4] placeholder-[#5a5650] focus:border-[#f97316] text-[13px] px-3"
              />
            </div>
            <div>
              <label className="text-[#f0ece4] text-[12px] font-medium mb-1 block">Email</label>
              <input
                type="email"
                value={newSupplier.email}
                onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                placeholder="email@example.com"
                className="w-full h-10 bg-[#222222] border-[rgba(255,255,255,0.12)] text-[#f0ece4] placeholder-[#5a5650] focus:border-[#f97316] text-[13px] px-3"
              />
            </div>
            <div>
              <label className="text-[#f0ece4] text-[12px] font-medium mb-1 block">Phone</label>
              <input
                value={newSupplier.phone}
                onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                placeholder="Phone number"
                className="w-full h-10 bg-[#222222] border-[rgba(255,255,255,0.12)] text-[#f0ece4] placeholder-[#5a5650] focus:border-[#f97316] text-[13px] px-3"
              />
            </div>
            <div>
              <label className="text-[#f0ece4] text-[12px] font-medium mb-1 block">Lead Time (days)</label>
              <input
                type="number"
                value={newSupplier.leadTime}
                onChange={(e) => setNewSupplier({ ...newSupplier, leadTime: parseInt(e.target.value) || 0 })}
                placeholder="0"
                className="w-full h-10 bg-[#222222] border-[rgba(255,255,255,0.12)] text-[#f0ece4] placeholder-[#5a5650] focus:border-[#f97316] text-[13px] px-3"
              />
            </div>
          </div>
          <div>
            <label className="text-[#f0ece4] text-[12px] font-medium mb-1 block">Address</label>
            <input
              value={newSupplier.address}
              onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
              placeholder="Supplier address"
              className="w-full h-10 bg-[#222222] border-[rgba(255,255,255,0.12)] text-[#f0ece4] placeholder-[#5a5650] focus:border-[#f97316] text-[13px] px-3"
            />
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={addSupplier}
              className="px-4 py-2 rounded-lg bg-[#f97316] text-white text-[12px] font-semibold hover:bg-[#ea6c0a] transition-colors"
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
              className="px-4 py-2 rounded-lg bg-[#222222] border border-[rgba(255,255,255,0.12)] text-[#f0ece4] hover:bg-[#181818] transition-colors text-[12px]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Ingredients List */}
      <div className="bg-[#111111] border border-[rgba(255,255,255,0.07)] rounded-xl overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-[rgba(255,255,255,0.07)] text-[11px] text-[#5a5650] font-medium tracking-wider uppercase">
          <div className="col-span-3">Ingredient</div>
          <div className="col-span-2">Category</div>
          <div className="col-span-2">Stock</div>
          <div className="col-span-2">Min Stock</div>
          <div className="col-span-2">Supplier</div>
          <div className="col-span-1">Status</div>
        </div>
        {filteredIngredients.length === 0 ? (
          <div className="text-center py-12 text-[#5a5650] text-[13px]">No ingredients found</div>
        ) : (
          <div className="divide-y divide-[rgba(255,255,255,0.07)]">
            {filteredIngredients.map((item) => (
              <div key={item.id} className="grid grid-cols-12 gap-4 px-5 py-3.5 items-center hover:bg-[#181818] transition-colors">
                <div className="col-span-3">
                  <div className="text-[13px] font-medium text-[#f0ece4]">{item.name}</div>
                  {item.description && <div className="text-[11px] text-[#5a5650]">{item.description}</div>}
                </div>
                <div className="col-span-2 text-[12px] text-[#9a9488]">{item.category || "-"}</div>
                <div className="col-span-2 text-[13px] font-semibold text-[#f0ece4]">{item.currentStock} {item.unit}</div>
                <div className="col-span-2 text-[12px] text-[#5a5650]">{item.minStock} {item.unit}</div>
                <div className="col-span-2 text-[12px] text-[#9a9488]">{item.supplier?.name || "-"}</div>
                <div className="col-span-1">
                  {item.currentStock <= item.minStock ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(239,68,68,0.15)] text-[#f87171] font-medium">Low</span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(34,197,94,0.15)] text-[#4ade80] font-medium">OK</span>
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
