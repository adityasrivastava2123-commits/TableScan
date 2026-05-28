"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ChevronDown, ChevronUp, Leaf, Drumstick } from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";

interface Variant { id: string; name: string; price: number; }
interface MenuItem { id: string; name: string; description?: string; price: number; isVeg: boolean; isAvailable: boolean; tags: string[]; variants: Variant[]; image?: string; }
interface Category { id: string; name: string; description?: string; menuItems: MenuItem[]; }

export default function MenuBuilder({ restaurantId }: { restaurantId: string }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  const [newCatName, setNewCatName] = useState("");
  const [addingCat, setAddingCat] = useState(false);

  const [addingItemTo, setAddingItemTo] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ name: "", price: "", description: "", isVeg: true });

  useEffect(() => { fetchCategories(); }, [restaurantId, fetchCategories]);

  async function fetchCategories() {
    try {
      const res = await axios.get(`/api/menu/categories?restaurantId=${restaurantId}`);
      setCategories(res.data);
    } catch { toast.error("Failed to load menu"); }
    finally { setLoading(false); }
  }

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
        categoryId,
        restaurantId,
        tags: [],
      });
      setCategories(categories.map(c =>
        c.id === categoryId ? { ...c, menuItems: [...c.menuItems, res.data] } : c
      ));
      setNewItem({ name: "", price: "", description: "", isVeg: true });
      setAddingItemTo(null);
      toast.success("Item added!");
    } catch { toast.error("Failed to add item"); }
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

  if (loading) return <div className="flex justify-center p-12 text-gray-500">Loading menu...</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Menu Builder</h1>
        <Button onClick={() => setAddingCat(true)} className="gap-2 w-full sm:w-auto">
          <Plus size={16} /> Add Category
        </Button>
      </div>

      {addingCat && (
        <Card className="border-dashed border-2 border-blue-300">
          <CardContent className="pt-4 space-y-3">
            <Label>Category Name</Label>
            <Input value={newCatName} onChange={e => setNewCatName(e.target.value)}
              placeholder="e.g. Starters, Main Course..." onKeyDown={e => e.key === "Enter" && addCategory()} className="h-11" />
            <div className="flex gap-2">
              <Button onClick={addCategory} className="flex-1 sm:flex-none">Save</Button>
              <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => { setAddingCat(false); setNewCatName(""); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {categories.length === 0 && !addingCat && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">No categories yet</p>
          <p className="text-sm">Add a category to start building your menu</p>
        </div>
      )}

      {categories.map(cat => (
        <Card key={cat.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)}>
                {expandedCat === cat.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                <CardTitle className="text-lg">{cat.name}</CardTitle>
                <Badge variant="secondary">{cat.menuItems.length} items</Badge>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-1"
                  onClick={() => setAddingItemTo(addingItemTo === cat.id ? null : cat.id)}>
                  <Plus size={14} /> Add Item
                </Button>
                <Button size="sm" variant="destructive" onClick={() => deleteCategory(cat.id)}>
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          </CardHeader>

          {(expandedCat === cat.id || addingItemTo === cat.id) && (
            <CardContent className="space-y-3">
              {addingItemTo === cat.id && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-3 border">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label>Item Name *</Label>
                      <Input value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} placeholder="e.g. Paneer Tikka" className="h-11" />
                    </div>
                    <div>
                      <Label>Price (₹) *</Label>
                      <Input type="number" value={newItem.price} onChange={e => setNewItem({ ...newItem, price: e.target.value })} placeholder="299" className="h-11" />
                    </div>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })} placeholder="Optional description" className="h-11" />
                  </div>
                  <div className="flex items-center gap-4">
                    <Label>Type:</Label>
                    <button onClick={() => setNewItem({ ...newItem, isVeg: true })}
                      className={`flex items-center gap-1 px-3 py-2 rounded-full text-sm border ${newItem.isVeg ? "bg-green-100 border-green-500 text-green-700" : "border-gray-300"}`}>
                      <Leaf size={14} /> Veg
                    </button>
                    <button onClick={() => setNewItem({ ...newItem, isVeg: false })}
                      className={`flex items-center gap-1 px-3 py-2 rounded-full text-sm border ${!newItem.isVeg ? "bg-red-100 border-red-500 text-red-700" : "border-gray-300"}`}>
                      <Drumstick size={14} /> Non-Veg
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1 sm:flex-none" onClick={() => addItem(cat.id)}>Save Item</Button>
                    <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => { setAddingItemTo(null); setNewItem({ name: "", price: "", description: "", isVeg: true }); }}>Cancel</Button>
                  </div>
                </div>
              )}

              {cat.menuItems.map(item => (
                <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white border rounded-lg">
                  <div className="flex items-center gap-3">
                    {item.isVeg
                      ? <span className="w-5 h-5 border-2 border-green-600 rounded flex items-center justify-center flex-shrink-0"><span className="w-2 h-2 bg-green-600 rounded-full" /></span>
                      : <span className="w-5 h-5 border-2 border-red-600 rounded flex items-center justify-center flex-shrink-0"><span className="w-2 h-2 bg-red-600 rounded-full" /></span>
                    }
                    <div>
                      <p className="font-medium">{item.name}</p>
                      {item.description && <p className="text-sm text-gray-500">{item.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <span className="font-semibold">₹{item.price}</span>
                    <button onClick={() => toggleAvailability(cat.id, item)}
                      className={`text-xs px-3 py-2 rounded-full ${item.isAvailable ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {item.isAvailable ? "Available" : "Hidden"}
                    </button>
                    <Button size="sm" variant="destructive" onClick={() => deleteItem(cat.id, item.id)} className="h-9 w-9 p-0">
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}

              {cat.menuItems.length === 0 && addingItemTo !== cat.id && (
                <p className="text-center text-sm text-gray-400 py-4">No items yet — click "Add Item"</p>
              )}
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}