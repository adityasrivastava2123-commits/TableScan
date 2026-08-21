export interface RestaurantTheme {
  primaryColor: string;
  primaryDark: string;
  secondaryColor: string;
  bgWarm: string;
  cardBg: string;
  textColor: string;
  mutedColor: string;
}

export interface PromoBanner {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  ctaText: string;
  image: string;
  discountBadge?: string;
  bgGradient: string;
}

export interface PromoOffer {
  id: string;
  code: string;
  title: string;
  description: string;
  discountBadge: string;
  validUntil: string;
  image: string;
  minOrderValue?: number;
}

export const DEFAULT_THEME: RestaurantTheme = {
  primaryColor: "#e85a2a",   // Vibrant appetizing burnt orange/red
  primaryDark: "#c44216",
  secondaryColor: "#f0a040", // Saffron gold
  bgWarm: "#faf5ef",        // Warm elegant off-white background
  cardBg: "#ffffff",
  textColor: "#1c1917",
  mutedColor: "#78716c",
};

export const DEFAULT_BANNER_SLIDES: PromoBanner[] = [
  {
    id: "banner-1",
    badge: "HOT & CRISPY",
    title: "Crave the Crispy Perfection!",
    subtitle: "Hand-breaded. Freshly cooked. Every single time.",
    ctaText: "Explore Menu →",
    image: "https://images.unsplash.com/photo-1562967914-608f82629710?w=800&auto=format&fit=crop&q=80",
    bgGradient: "from-[#7f1d1d] via-[#991b1b] to-[#450a0a]",
  },
  {
    id: "banner-2",
    badge: "CHEF'S SPECIAL",
    title: "Sizzling Gourmet Delights",
    subtitle: "Authentic spices crafted with love by master chefs.",
    ctaText: "Order Specials →",
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80",
    bgGradient: "from-[#0f172a] via-[#1e293b] to-[#334155]",
  },
  {
    id: "banner-3",
    badge: "FLAVOR BOMB",
    title: "Artisanal Pizzas & Pasta",
    subtitle: "Stone-baked crusts topped with fresh mozzarella & basil.",
    ctaText: "View Pizzas →",
    image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&auto=format&fit=crop&q=80",
    bgGradient: "from-[#431407] via-[#7c2d12] to-[#9a3412]",
  },
];

export const DEFAULT_OFFERS: PromoOffer[] = [
  {
    id: "offer-1",
    code: "WELCOME20",
    title: "20% OFF Your First Order",
    description: "Valid on all dine-in table orders above ₹399",
    discountBadge: "20% OFF",
    validUntil: "Today",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&auto=format&fit=crop&q=80",
    minOrderValue: 399,
  },
  {
    id: "offer-2",
    code: "FLAT100",
    title: "Flat ₹100 OFF Weekend Special",
    description: "Enjoy ₹100 instant discount on starters and combos",
    discountBadge: "₹100 OFF",
    validUntil: "End of Week",
    image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&auto=format&fit=crop&q=80",
    minOrderValue: 599,
  },
  {
    id: "offer-3",
    code: "BOGOSTARTER",
    title: "Buy 1 Get 1 on Selected Drinks",
    description: "Order any mocktail or smoothie and get one free",
    discountBadge: "BUY 1 GET 1",
    validUntil: "Daily 4PM - 7PM",
    image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80",
  },
];
