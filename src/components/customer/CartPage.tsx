"use client";

import { useCartStore } from "@/store/cartStore";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function CartPage({
  slug, tableToken, tableName,
}: {
  slug: string; tableToken: string; tableName: string;
}) {
  const { items, updateQuantity, removeItem, getTotalPrice } = useCartStore();
  const router = useRouter();
  const total = getTotalPrice();

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400 text-lg">Your cart is empty</p>
        <Button variant="outline" onClick={() => router.push(`/${slug}/${tableToken}`)}>
          Back to Menu
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <div className="bg-white sticky top-0 z-10 px-4 py-4 flex items-center gap-3 shadow-sm">
        <button onClick={() => router.back()} className="p-2 -ml-2">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="font-bold text-lg">Your Cart</h1>
          <p className="text-sm text-gray-500">Table: {tableName}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {items.map((item) => (
          <div key={item.id} className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-start gap-3 mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {item.isVeg
                    ? <span className="w-5 h-5 border-2 border-green-600 rounded flex items-center justify-center flex-shrink-0">
                        <span className="w-2 h-2 bg-green-600 rounded-full" /></span>
                    : <span className="w-5 h-5 border-2 border-red-600 rounded flex items-center justify-center flex-shrink-0">
                        <span className="w-2 h-2 bg-red-600 rounded-full" /></span>
                  }
                  <p className="font-medium">{item.name}</p>
                </div>
                <p className="text-gray-500 text-sm mt-1">₹{item.price} each</p>
              </div>
              <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600 p-2">
                <Trash2 size={18} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  className="w-11 h-11 rounded-full border-2 flex items-center justify-center hover:bg-gray-50">
                  <Minus size={18} />
                </button>
                <span className="w-8 text-center font-semibold text-lg">{item.quantity}</span>
                <button onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="w-11 h-11 rounded-full border-2 flex items-center justify-center hover:bg-gray-50">
                  <Plus size={18} />
                </button>
              </div>
              <p className="font-bold text-lg">₹{item.price * item.quantity}</p>
            </div>
          </div>
        ))}

        <div className="bg-white rounded-xl p-4 shadow-sm space-y-2">
          <div className="flex justify-between text-gray-500">
            <span>Subtotal</span>
            <span>₹{total}</span>
          </div>
          <div className="flex justify-between font-bold text-lg border-t pt-2">
            <span>Total</span>
            <span>₹{total}</span>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-40">
        <Button className="w-full max-w-2xl mx-auto py-4 text-lg rounded-2xl"
          onClick={() => router.push(`/${slug}/${tableToken}/checkout`)}>
          Proceed to Checkout — ₹{total}
        </Button>
      </div>
    </div>
  );
}