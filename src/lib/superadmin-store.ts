export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  category: "core" | "beta" | "experimental";
  updatedAt: string;
}

export interface BroadcastMessage {
  text: string;
  type: "info" | "warning" | "danger" | "success";
  active: boolean;
  updatedAt: string;
}

export interface MockError {
  id: string;
  message: string;
  route: string;
  restaurant: string;
  severity: "critical" | "error" | "warning";
  count: number;
  lastSeen: string;
  resolved: boolean;
}

const g = globalThis as any;

if (!g.__sa_initialized) {
  g.__sa_initialized = true;

  g.__sa_flags = [
    { id: "kds", name: "Kitchen Display System", description: "Live KDS screen for kitchen staff", enabled: true, category: "core", updatedAt: new Date().toISOString() },
    { id: "ai_forecast", name: "AI Revenue Forecasting", description: "ML-based revenue prediction engine", enabled: true, category: "beta", updatedAt: new Date().toISOString() },
    { id: "reservations", name: "Table Reservations", description: "Calendar-based booking system", enabled: true, category: "core", updatedAt: new Date().toISOString() },
    { id: "delivery", name: "Delivery Management", description: "Order delivery tracking module", enabled: false, category: "beta", updatedAt: new Date().toISOString() },
    { id: "queue", name: "Queue System", description: "Digital waitlist management", enabled: true, category: "core", updatedAt: new Date().toISOString() },
    { id: "table_service", name: "Table Service Mode", description: "Waiter-facing order management UI", enabled: true, category: "core", updatedAt: new Date().toISOString() },
    { id: "inventory", name: "Inventory Tracking", description: "Real-time stock level monitoring", enabled: true, category: "core", updatedAt: new Date().toISOString() },
    { id: "pusher_realtime", name: "Pusher Real-Time Sync", description: "Live order updates via WebSocket", enabled: true, category: "core", updatedAt: new Date().toISOString() },
    { id: "stripe_billing", name: "Stripe Billing", description: "Stripe payment processing integration", enabled: false, category: "experimental", updatedAt: new Date().toISOString() },
    { id: "razorpay", name: "Razorpay Payments", description: "Razorpay payment gateway", enabled: true, category: "core", updatedAt: new Date().toISOString() },
    { id: "customer_portal", name: "Customer Portal", description: "Public customer-facing QR menu", enabled: true, category: "core", updatedAt: new Date().toISOString() },
    { id: "dark_mode", name: "Dark Mode UI", description: "Theme switching for restaurant dashboard", enabled: true, category: "core", updatedAt: new Date().toISOString() },
  ] as FeatureFlag[];

  g.__sa_broadcast = {
    text: "",
    type: "info",
    active: false,
    updatedAt: new Date().toISOString(),
  } as BroadcastMessage;

  g.__sa_errors = [
    { id: "e1", message: "Prisma connection timeout on /api/orders", route: "/api/orders", restaurant: "Spice Garden", severity: "error", count: 3, lastSeen: new Date(Date.now() - 25 * 60000).toISOString(), resolved: false },
    { id: "e2", message: "Razorpay webhook signature mismatch", route: "/api/payments/webhook", restaurant: "Cafe Bloom", severity: "critical", count: 1, lastSeen: new Date(Date.now() - 2 * 3600000).toISOString(), resolved: false },
    { id: "e3", message: "Pusher channel limit reached for tenant", route: "/api/pusher/auth", restaurant: "Pizza Palace", severity: "warning", count: 12, lastSeen: new Date(Date.now() - 10 * 60000).toISOString(), resolved: false },
    { id: "e4", message: "Menu image upload failed — S3 timeout", route: "/api/menu", restaurant: "The Royal Kitchen", severity: "error", count: 5, lastSeen: new Date(Date.now() - 45 * 60000).toISOString(), resolved: true },
    { id: "e5", message: "Staff session invalidated unexpectedly", route: "/api/staff/auth", restaurant: "Dosa Hub", severity: "warning", count: 2, lastSeen: new Date(Date.now() - 4 * 3600000).toISOString(), resolved: true },
  ] as MockError[];
}

export const getFlags = (): FeatureFlag[] => g.__sa_flags;
export const setFlag = (id: string, enabled: boolean): boolean => {
  const f = g.__sa_flags.find((f: FeatureFlag) => f.id === id);
  if (!f) return false;
  f.enabled = enabled;
  f.updatedAt = new Date().toISOString();
  return true;
};

export const getBroadcast = (): BroadcastMessage => g.__sa_broadcast;
export const setBroadcast = (data: Partial<BroadcastMessage>) => {
  g.__sa_broadcast = { ...g.__sa_broadcast, ...data, updatedAt: new Date().toISOString() };
};

export const getErrors = (): MockError[] => g.__sa_errors;
export const resolveError = (id: string): boolean => {
  const e = g.__sa_errors.find((e: MockError) => e.id === id);
  if (!e) return false;
  e.resolved = true;
  return true;
};
