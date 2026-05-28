import type {
  Category,
  Location,
  MenuItem,
  MenuItemVariant,
  Order,
  OrderItem,
  Restaurant,
  Table,
} from "@prisma/client";

export type RestaurantWithDetails = Restaurant & {
  locations: (Location & { tables: Table[] })[];
  categories: Category[];
  menuItems: MenuItem[];
};

export type MenuItemWithVariants = MenuItem & {
  variants: MenuItemVariant[];
};

export type OrderWithItems = Order & {
  items: (OrderItem & {
    menuItem: MenuItem;
  })[];
};

export type CartItem = {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  note?: string;
  variantIds?: string[];
};

export type CartState = {
  items: CartItem[];
  totalAmount: number;
};
