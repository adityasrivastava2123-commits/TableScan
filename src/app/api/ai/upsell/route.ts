import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface UpsellRequest {
  restaurantId: string;
  cartItems: Array<{
    menuItemId: string;
    name: string;
    quantity: number;
    price: number;
  }>;
}

export async function POST(req: Request) {
  try {
    const body: UpsellRequest = await req.json().catch(() => ({}));
    const { restaurantId, cartItems } = body;

    if (!restaurantId) {
      return NextResponse.json({ error: "restaurantId is required" }, { status: 400 });
    }

    if (!cartItems || cartItems.length === 0) {
      return NextResponse.json({ suggestions: [], comboUpgrade: null });
    }

    // 1. Fetch all available menu items for this restaurant, including categories
    const menuItems = await prisma.menuItem.findMany({
      where: {
        restaurantId,
        isAvailable: true
      },
      include: {
        category: {
          select: { name: true }
        }
      }
    });

    // Map categories in cart
    const cartItemIds = new Set(cartItems.map(i => i.menuItemId));
    const cartItemNames = cartItems.map(i => i.name.toLowerCase());
    
    let hasMains = false;
    let hasBread = false;
    let hasBeverage = false;
    let hasDessert = false;

    // Check what the customer already has in their cart
    for (const item of cartItems) {
      const match = menuItems.find(m => m.id === item.menuItemId);
      if (match) {
        const catName = match.category.name.toLowerCase();
        if (catName.includes("main") || catName.includes("gravy") || catName.includes("curry")) hasMains = true;
        if (catName.includes("bread") || catName.includes("roti") || catName.includes("naan")) hasBread = true;
        if (catName.includes("beverage") || catName.includes("drink") || catName.includes("shake")) hasBeverage = true;
        if (catName.includes("dessert") || catName.includes("sweet") || catName.includes("ice cream")) hasDessert = true;
      }
    }

    const suggestions = [];
    let textSuggestion = "";

    // ── CASE 1: Has Mains, suggest Bread ─────────────────────────────────────
    if (hasMains && !hasBread) {
      const breads = menuItems.filter(m => {
        const cat = m.category.name.toLowerCase();
        return cat.includes("bread") || cat.includes("roti") || cat.includes("naan");
      });

      if (breads.length > 0) {
        // Suggest best bread (e.g. Butter Naan or Garlic Naan)
        const bestBread = breads.find(b => b.name.toLowerCase().includes("garlic naan")) || breads[0];
        suggestions.push({
          id: bestBread.id,
          name: bestBread.name,
          price: bestBread.price,
          description: bestBread.description || "Freshly baked clay oven bread.",
          image: bestBread.image,
          type: "CROSS_SELL",
          badge: "Best Pairing"
        });
        textSuggestion += `Nothing beats pairing your curry with a hot, buttery ${bestBread.name}! `;
      }
    }

    // ── CASE 2: No Beverages in cart, suggest cold drink ──────────────────────
    if (!hasBeverage) {
      const beverages = menuItems.filter(m => {
        const cat = m.category.name.toLowerCase();
        return cat.includes("beverage") || cat.includes("drink") || cat.includes("juice") || cat.includes("shake");
      });

      if (beverages.length > 0) {
        const bestBev = beverages.find(b => b.name.toLowerCase().includes("cola") || b.name.toLowerCase().includes("mojito")) || beverages[0];
        suggestions.push({
          id: bestBev.id,
          name: bestBev.name,
          price: bestBev.price,
          description: bestBev.description || "Refreshing chilled beverage.",
          image: bestBev.image,
          type: "CROSS_SELL",
          badge: "Frequently Ordered Together"
        });
        textSuggestion += `Quench your thirst with our chilled ${bestBev.name}. `;
      }
    }

    // ── CASE 3: Suggest Dessert ──────────────────────────────────────────────
    if (!hasDessert) {
      const desserts = menuItems.filter(m => {
        const cat = m.category.name.toLowerCase();
        return cat.includes("dessert") || cat.includes("sweet") || cat.includes("ice cream");
      });

      if (desserts.length > 0) {
        const bestDessert = desserts.find(d => d.name.toLowerCase().includes("jamun") || d.name.toLowerCase().includes("brownie")) || desserts[0];
        suggestions.push({
          id: bestDessert.id,
          name: bestDessert.name,
          price: bestDessert.price,
          description: bestDessert.description || "Sweet delicious dessert.",
          image: bestDessert.image,
          type: "CROSS_SELL",
          badge: "Sweet Finish"
        });
      }
    }

    // ── 2. Create Combo Upgrade Package ──────────────────────────────────────
    let comboUpgrade = null;
    const cartTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // If they have Butter Chicken (or similar Main) and no Naan/Drink, suggest a full Meal Upgrade
    const mainItem = cartItems.find(i => i.name.toLowerCase().includes("chicken") || i.name.toLowerCase().includes("paneer") || i.name.toLowerCase().includes("dal"));
    if (mainItem && (!hasBread || !hasBeverage)) {
      const breads = menuItems.filter(m => m.category.name.toLowerCase().includes("bread") || m.category.name.toLowerCase().includes("roti") || m.category.name.toLowerCase().includes("naan"));
      const drinks = menuItems.filter(m => m.category.name.toLowerCase().includes("beverage") || m.category.name.toLowerCase().includes("drink"));

      if (breads.length > 0 && drinks.length > 0) {
        const bread = breads[0];
        const drink = drinks[0];
        const regularUpgradeCost = bread.price + drink.price;
        const discountedUpgradeCost = Math.round(regularUpgradeCost * 0.85); // 15% discount for combo

        comboUpgrade = {
          title: "Upgrade to Deluxe Combo Meal",
          description: `Add a fresh ${bread.name} + Chilled ${drink.name} to your ${mainItem.name} at a special bundle price!`,
          regularPrice: regularUpgradeCost,
          comboPrice: discountedUpgradeCost,
          savings: regularUpgradeCost - discountedUpgradeCost,
          itemsToAdd: [
            { id: bread.id, name: bread.name, price: bread.price },
            { id: drink.id, name: drink.name, price: drink.price }
          ]
        };
      }
    }

    if (!textSuggestion && suggestions.length > 0) {
      textSuggestion = `Complete your dining experience with some of our popular choices: ${suggestions[0].name}.`;
    }

    return NextResponse.json({
      suggestions: suggestions.slice(0, 3), // Return maximum 3 suggestions
      comboUpgrade,
      marketingText: textSuggestion
    });
  } catch (error: any) {
    console.error("AI Upsell Engine error:", error);
    return NextResponse.json({ error: "Failed to generate suggestions", details: error.message }, { status: 500 });
  }
}
