"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Plus, Minus, X } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface Variant { id: string; name: string; price: number; }
interface MenuItem {
  id: string; name: string; description?: string | null;
  price: number; isVeg: boolean; image?: string | null;
  tags: string[]; variants: Variant[];
}
interface Category { id: string; name: string; menuItems: MenuItem[]; }
interface Restaurant { id: string; name: string; logo?: string | null; description?: string | null; }
interface Table { id: string; name: string; qrToken: string; }

export default function CustomerMenu({
  restaurant, table, slug, tableToken,
}: {
  restaurant: Restaurant & { categories: Category[] };
  table: Table; slug: string; tableToken: string;
}) {
  const [activeCategory, setActiveCategory] = useState<string>(
    restaurant.categories[0]?.id ?? ""
  );
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [itemQty, setItemQty] = useState(1);
  const { addItem, getTotalItems, getTotalPrice, setTableInfo } = useCartStore();
  const router = useRouter();

  useEffect(() => {
    setTableInfo(slug, tableToken);
  }, [slug, tableToken, setTableInfo]);

  function handleAddToCart(item: MenuItem) {
    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: itemQty,
      isVeg: item.isVeg,
    });
    toast.success(`${item.name} added to cart!`);
    setSelectedItem(null);
    setItemQty(1);
  }

  const totalItems = getTotalItems();
  const totalPrice = getTotalPrice();

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          {restaurant.logo && (
            <img src={restaurant.logo} alt={restaurant.name}
              className="w-12 h-12 rounded-full object-cover border" />
          )}
          <div>
            <h1 className="font-bold text-lg">{restaurant.name}</h1>
            <p className="text-sm text-gray-500">Table: {table.name}</p>
          </div>
        </div>

        {/* Category tabs */}
        <div className="max-w-2xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide snap-x">
          {restaurant.categories.map((cat) => (
            <button key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all snap-start
                ${activeCategory === cat.id
                  ? "bg-black text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Items */}
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {restaurant.categories
          .filter((c) => c.id === activeCategory)
          .map((cat) => (
            <div key={cat.id} className="space-y-3">
              {cat.menuItems.length === 0 && (
                <p className="text-center text-gray-400 py-8">No items in this category</p>
              )}
              {cat.menuItems.map((item) => (
                <div key={item.id}
                  className="bg-white rounded-xl p-3 sm:p-4 shadow-sm flex items-center justify-between gap-3 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => { setSelectedItem(item); setItemQty(1); }}>
                  <div className="flex items-start gap-3 flex-1">
                    {item.isVeg
                      ? <span className="mt-1 w-5 h-5 border-2 border-green-600 rounded flex-shrink-0 flex items-center justify-center">
                          <span className="w-2 h-2 bg-green-600 rounded-full" /></span>
                      : <span className="mt-1 w-5 h-5 border-2 border-red-600 rounded flex-shrink-0 flex items-center justify-center">
                          <span className="w-2 h-2 bg-red-600 rounded-full" /></span>
                    }
                    <div>
                      <p className="font-medium">{item.name}</p>
                      {item.description && (
                        <p className="text-sm text-gray-500 line-clamp-2">{item.description}</p>
                      )}
                      <p className="font-semibold mt-1">₹{item.price}</p>
                    </div>
                  </div>
                  {item.image && (
                    <img src={item.image} alt={item.name}
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover flex-shrink-0" />
                  )}
                  <Button size="sm" className="flex-shrink-0 h-10 w-10 p-0"
                    onClick={(e) => { e.stopPropagation(); handleAddToCart({ ...item, variants: [] }); }}>
                    <Plus size={16} />
                  </Button>
                </div>
              ))}
            </div>
          ))}
      </div>

      {/* Item Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
          onClick={() => setSelectedItem(null)}>
          <div className="bg-white w-full max-w-2xl rounded-t-2xl p-4 sm:p-6 space-y-4 animate-slide-up"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                {selectedItem.isVeg
                  ? <span className="w-5 h-5 border-2 border-green-600 rounded flex items-center justify-center">
                      <span className="w-2 h-2 bg-green-600 rounded-full" /></span>
                  : <span className="w-5 h-5 border-2 border-red-600 rounded flex items-center justify-center">
                      <span className="w-2 h-2 bg-red-600 rounded-full" /></span>
                }
                <h2 className="text-xl font-bold">{selectedItem.name}</h2>
              </div>
              <button onClick={() => setSelectedItem(null)}>
                <X size={24} className="text-gray-400" />
              </button>
            </div>
            {selectedItem.image && (
              <img src={selectedItem.image} alt={selectedItem.name}
                className="w-full h-48 object-cover rounded-xl" />
            )}
            {selectedItem.description && (
              <p className="text-gray-600">{selectedItem.description}</p>
            )}
            <p className="text-2xl font-bold">₹{selectedItem.price * itemQty}</p>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <button onClick={() => setItemQty(Math.max(1, itemQty - 1))}
                  className="w-11 h-11 rounded-full border-2 flex items-center justify-center hover:bg-gray-50">
                  <Minus size={18} />
                </button>
                <span className="text-lg font-semibold w-6 text-center">{itemQty}</span>
                <button onClick={() => setItemQty(itemQty + 1)}
                  className="w-11 h-11 rounded-full border-2 flex items-center justify-center hover:bg-gray-50">
                  <Plus size={18} />
                </button>
              </div>
              <Button className="px-6 flex-1" onClick={() => handleAddToCart(selectedItem)}>
                Add to Cart — ₹{selectedItem.price * itemQty}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cart Button */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-40">
          <button
            onClick={() => router.push(`/${slug}/${tableToken}/cart`)}
            className="bg-black text-white px-6 py-4 rounded-2xl flex items-center gap-4 shadow-2xl w-full max-w-2xl mx-auto justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart size={20} />
              <span className="font-semibold">{totalItems} items</span>
            </div>
            <span className="font-bold">₹{totalPrice} →</span>
          </button>
        </div>
      )}
    </div>
  );
}