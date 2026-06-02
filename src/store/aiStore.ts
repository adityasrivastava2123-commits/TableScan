import { create } from "zustand";

export interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: Date;
  isVoice?: boolean;
  action?: {
    type: string;
    payload?: any;
  };
}

export interface ActionHistoryEntry {
  id: string;
  type: string;
  payload?: any;
  timestamp: Date;
  success: boolean;
}

interface AIStore {
  isOpen: boolean;
  messages: Message[];
  isListening: boolean;
  voiceEnabled: boolean;
  status: "idle" | "listening" | "thinking" | "speaking";
  activeAgent: "operations" | "analytics" | "inventory" | "marketing" | "experience" | "waiter";
  actionHistory: ActionHistoryEntry[];
  
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
  addMessage: (msg: Omit<Message, "id" | "timestamp">) => void;
  clearMessages: () => void;
  setListening: (listening: boolean) => void;
  setVoiceEnabled: (enabled: boolean) => void;
  setStatus: (status: "idle" | "listening" | "thinking" | "speaking") => void;
  setActiveAgent: (agent: "operations" | "analytics" | "inventory" | "marketing" | "experience" | "waiter") => void;
  addAction: (action: Omit<ActionHistoryEntry, "id" | "timestamp">) => void;
  clearActionHistory: () => void;
}

export const useAIStore = create<AIStore>((set) => ({
  isOpen: false,
  messages: [
    {
      id: "welcome",
      sender: "ai",
      text: "Hello! I am your AI Restaurant Commander. You can talk to me or type commands to navigate pages, toggle themes, create staff, or register tables.",
      timestamp: new Date(),
    },
  ],
  isListening: false,
  voiceEnabled: false,
  status: "idle",
  activeAgent: "operations",
  actionHistory: [],

  setOpen: (open) => set({ isOpen: open }),
  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),

  addMessage: (msg) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...msg,
          id: Math.random().toString(36).substring(7),
          timestamp: new Date(),
        },
      ],
    })),

  clearMessages: () =>
    set({
      messages: [
        {
          id: "welcome",
          sender: "ai",
          text: "Hello! I am your AI Restaurant Commander. You can talk to me or type commands to navigate pages, toggle themes, create staff, or register tables.",
          timestamp: new Date(),
        },
      ],
    }),

  setListening: (listening) => set({ isListening: listening }),
  setVoiceEnabled: (enabled) => set({ voiceEnabled: enabled }),
  setStatus: (status) => set({ status }),
  
  setActiveAgent: (agent) => set({ activeAgent: agent }),
  
  addAction: (action) =>
    set((state) => ({
      actionHistory: [
        {
          ...action,
          id: Math.random().toString(36).substring(7),
          timestamp: new Date(),
        },
        ...state.actionHistory,
      ],
    })),
    
  clearActionHistory: () => set({ actionHistory: [] }),
}));
