import { Message } from "../../store/aiStore";

export interface SessionContext {
  messages: Array<{
    role: "user" | "model";
    text: string;
  }>;
  activeAgent: "operations" | "analytics" | "inventory" | "marketing" | "experience" | "waiter";
  pendingAction?: {
    type: string;
    payload: any;
    expiresAt: number;
  };
  preferences?: {
    diet?: "veg" | "non-veg" | "vegan";
    spicyLevel?: "low" | "medium" | "high";
    allergies?: string[];
  };
  lastActive: number;
}

// In-memory session store (acts as local cache, fallback for Redis)
const globalSessionStore = new Map<string, SessionContext>();

// Clean up expired sessions periodically (every 10 minutes)
if (typeof global !== "undefined") {
  const cleanupInterval = 10 * 60 * 1000;
  setInterval(() => {
    const now = Date.now();
    const keysToDelete: string[] = [];
    globalSessionStore.forEach((context, key) => {
      if (now - context.lastActive > 30 * 60 * 1000) { // 30 mins session timeout
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => globalSessionStore.delete(key));
  }, cleanupInterval);
}

export class MemoryManager {
  private static getSessionKey(userId: string, restaurantId: string): string {
    return `${userId}:${restaurantId}`;
  }

  /**
   * Retrieves the context for a session, initializing it if empty.
   */
  public static async getSession(
    userId: string,
    restaurantId: string
  ): Promise<SessionContext> {
    const key = this.getSessionKey(userId, restaurantId);
    let session = globalSessionStore.get(key);

    if (!session) {
      session = {
        messages: [],
        activeAgent: "operations",
        lastActive: Date.now()
      };
      globalSessionStore.set(key, session);
    }

    // Refresh last active timestamp
    session.lastActive = Date.now();
    return session;
  }

  /**
   * Adds a message to the rolling conversation log.
   */
  public static async addMessage(
    userId: string,
    restaurantId: string,
    role: "user" | "model",
    text: string,
    limit: number = 10
  ): Promise<void> {
    const session = await this.getSession(userId, restaurantId);
    session.messages.push({ role, text });
    
    // Keep a rolling window of history
    if (session.messages.length > limit) {
      session.messages = session.messages.slice(session.messages.length - limit);
    }
    
    session.lastActive = Date.now();
    globalSessionStore.set(this.getSessionKey(userId, restaurantId), session);
  }

  /**
   * Sets the active agent for a session.
   */
  public static async setActiveAgent(
    userId: string,
    restaurantId: string,
    agent: "operations" | "analytics" | "inventory" | "marketing" | "experience" | "waiter"
  ): Promise<void> {
    const session = await this.getSession(userId, restaurantId);
    session.activeAgent = agent;
    session.lastActive = Date.now();
    globalSessionStore.set(this.getSessionKey(userId, restaurantId), session);
  }

  /**
   * Stores a pending action that requires customer/owner confirmation.
   */
  public static async setPendingAction(
    userId: string,
    restaurantId: string,
    actionType: string,
    payload: any,
    ttlSeconds: number = 300 // 5 minutes expiration
  ): Promise<void> {
    const session = await this.getSession(userId, restaurantId);
    session.pendingAction = {
      type: actionType,
      payload,
      expiresAt: Date.now() + (ttlSeconds * 1000)
    };
    session.lastActive = Date.now();
    globalSessionStore.set(this.getSessionKey(userId, restaurantId), session);
  }

  /**
   * Retrieves and clears the pending action if not expired.
   */
  public static async popPendingAction(
    userId: string,
    restaurantId: string
  ): Promise<any | null> {
    const session = await this.getSession(userId, restaurantId);
    if (!session.pendingAction) return null;

    const action = session.pendingAction;
    delete session.pendingAction;
    globalSessionStore.set(this.getSessionKey(userId, restaurantId), session);

    if (Date.now() > action.expiresAt) {
      return null; // Expired
    }

    return { type: action.type, payload: action.payload };
  }

  /**
   * Updates customer-facing waiter preferences.
   */
  public static async updatePreferences(
    userId: string,
    restaurantId: string,
    preferences: Partial<Required<SessionContext>["preferences"]>
  ): Promise<void> {
    const session = await this.getSession(userId, restaurantId);
    session.preferences = {
      ...session.preferences,
      ...preferences
    };
    session.lastActive = Date.now();
    globalSessionStore.set(this.getSessionKey(userId, restaurantId), session);
  }

  /**
   * Clears the session memory.
   */
  public static async clearSession(userId: string, restaurantId: string): Promise<void> {
    const key = this.getSessionKey(userId, restaurantId);
    globalSessionStore.delete(key);
  }
}
