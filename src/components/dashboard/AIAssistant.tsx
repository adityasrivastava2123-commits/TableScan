"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useAIStore, Message, ActionHistoryEntry } from "@/store/aiStore";
import { 
  X, Mic, MicOff, Send, Volume2, VolumeX, 
  Sparkles, Trash2, Loader2, ArrowRightLeft, Radio,
  LayoutDashboard, ShoppingBag, ChefHat, QrCode, Settings, Users,
  BarChart3, Box, Megaphone, Smile, Play, Check, AlertTriangle, History,
  Languages, ShieldCheck
} from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";

interface AIAssistantProps {
  restaurant: {
    id: string;
    slug: string;
    name: string;
  };
}

const AGENT_THEMES = {
  operations: {
    color: "from-orange-500 to-amber-500",
    text: "text-orange-500",
    bg: "bg-orange-500/10",
    border: "border-orange-500/25",
    icon: <ChefHat className="size-4" />,
    label: "Ops & Floor"
  },
  analytics: {
    color: "from-blue-500 to-cyan-500",
    text: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/25",
    icon: <BarChart3 className="size-4" />,
    label: "Business Analyst"
  },
  inventory: {
    color: "from-emerald-500 to-teal-500",
    text: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/25",
    icon: <Box className="size-4" />,
    label: "Inventory Supervisor"
  },
  marketing: {
    color: "from-violet-500 to-purple-500",
    text: "text-violet-500",
    bg: "bg-violet-500/10",
    border: "border-violet-500/25",
    icon: <Megaphone className="size-4" />,
    label: "Marketing & Campaigns"
  },
  experience: {
    color: "from-rose-500 to-pink-500",
    text: "text-rose-500",
    bg: "bg-rose-500/10",
    border: "border-rose-500/25",
    icon: <Smile className="size-4" />,
    label: "Customer Experience"
  },
  waiter: {
    color: "from-amber-500 to-yellow-500",
    text: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/25",
    icon: <Users className="size-4" />,
    label: "AI Waiter (Customer)"
  }
};

const SUGGESTED_PROMPTS = {
  operations: [
    "Create a new table called VIP-12",
    "Show pending kitchen orders",
    "Generate QR codes for all tables",
    "Mark order TS-1002 as preparing",
    "Deactivate Table 3"
  ],
  analytics: [
    "How is my restaurant performing?",
    "Show sales report for the last week",
    "What are my top selling dishes?",
    "Why are sales down this week?",
    "Which tables generate the highest revenue?"
  ],
  inventory: [
    "Show ingredient stock levels",
    "Forecast stock shortages",
    "Add 15 kg of chicken to stock",
    "Adjust stock for tomatoes by -5 kg",
    "Create a new ingredient called Paneer"
  ],
  marketing: [
    "Create a coupon called SUMMER20",
    "Launch a 15% lunch discount offer",
    "Draft a WhatsApp promotion campaign",
    "Generate an Instagram caption for Biryani"
  ],
  experience: [
    "Analyze recent customer reviews",
    "Common complaints in reviews?",
    "Show customer retention insights",
    "Add review: 5 stars - Loved the garlic naan"
  ],
  waiter: [
    "Suggest vegetarian dishes under ₹300",
    "What goes well with Butter Chicken?",
    "Do you have high-protein options?",
    "I want something spicy, recommend a dish"
  ]
};

export default function AIAssistant({ restaurant }: AIAssistantProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const {
    isOpen,
    messages,
    isListening,
    voiceEnabled,
    status,
    activeAgent,
    actionHistory,
    setOpen,
    addMessage,
    clearMessages,
    setListening,
    setVoiceEnabled,
    setStatus,
    setActiveAgent,
    addAction,
    clearActionHistory
  } = useAIStore();

  const [inputVal, setInputVal] = useState("");
  const [activeTab, setActiveTab] = useState<"chat" | "history" | "alerts">("chat");
  const [alerts, setAlerts] = useState<any[]>([]);
  const [speechLang, setSpeechLang] = useState<"en-US" | "hi-IN">("en-US");
  const [showConfirmAction, setShowConfirmAction] = useState<any | null>(null);

  // Poll Proactive Alerts
  const fetchAlerts = useCallback(async () => {
    try {
      const res = await axios.get(`/api/ai/alerts?restaurantId=${restaurant.id}`);
      setAlerts(res.data.alerts || []);
    } catch (e) {
      console.warn("Could not retrieve proactive alerts:", e);
    }
  }, [restaurant.id]);

  useEffect(() => {
    if (isOpen) {
      fetchAlerts();
      const interval = setInterval(fetchAlerts, 45000); // 45 seconds polling
      return () => clearInterval(interval);
    }
  }, [isOpen, fetchAlerts]);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = speechLang;

      recognition.onstart = () => {
        setListening(true);
        setStatus("listening");
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript.trim()) {
          handleSendMessage(transcript, true);
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        if (event.error !== "no-speech") {
          toast.error(`Voice input error: ${event.error}`);
        }
        setListening(false);
        setStatus("idle");
      };

      recognition.onend = () => {
        setListening(false);
        setStatus("idle");
      };

      recognitionRef.current = recognition;
    }
  }, [speechLang, setListening, setStatus]);

  // Handle Speech synthesis (speak output text)
  const speakText = useCallback((text: string) => {
    if (!voiceEnabled || typeof window === "undefined" || !window.speechSynthesis) return;

    // Cancel ongoing speech
    window.speechSynthesis.cancel();

    // Remove emoji icons for speech clarity
    const cleanText = text.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDC00-\uDFFF]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.onstart = () => setStatus("speaking");
    utterance.onend = () => setStatus("idle");
    utterance.onerror = () => setStatus("idle");
    
    // Hindi pronunciation voice if text has Hindi phrases
    const voices = window.speechSynthesis.getVoices();
    const isHindiText = /[\u0900-\u097F]/.test(text);

    let cleanVoice = voices.find(
      (v) =>
        isHindiText ? v.lang === "hi-IN" :
        v.name.includes("Google US English") ||
        v.name.includes("Microsoft Zira") ||
        (v.lang === "en-US" && v.name.includes("Female"))
    );
    if (cleanVoice) utterance.voice = cleanVoice;

    window.speechSynthesis.speak(utterance);
  }, [voiceEnabled, setStatus]);

  // Auto-scroll to chat bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  // Execute UI navigation / control changes
  const executeAction = useCallback((action: { type: string; payload?: any }) => {
    if (!action) return;
    const { type, payload } = action;

    switch (type) {
      case "NAVIGATE":
        if (payload?.path) {
          router.push(payload.path);
          toast.success(`Opening screen: ${payload.path.replace("/", "") || "overview"}`);
        }
        break;
      case "TOGGLE_THEME":
        setTheme(theme === "dark" ? "light" : "dark");
        toast.success("Theme changed!");
        break;
      case "LOGOUT":
        toast.loading("Logging out...");
        router.push("/sign-out");
        break;
      case "UPGRADE":
        toast.success("Redirecting to upgrade checkout...");
        router.push("/billing");
        break;
      case "REFRESH_DATA":
        router.refresh();
        toast.success("Sync complete!");
        break;
      case "SHOW_TOAST":
        if (payload?.message) {
          toast(payload.message, { icon: "🔔" });
        }
        break;
      case "CONFIRMATION_REQUIRED":
        // Show confirmation drawer dialog
        setShowConfirmAction(payload);
        break;
      default:
        break;
    }
  }, [router, theme, setTheme]);

  // Post queries to core backend Agent system
  const handleSendMessage = async (text: string, isVoice = false) => {
    if (!text.trim()) return;

    addMessage({
      sender: "user",
      text,
      isVoice,
    });
    setInputVal("");
    setStatus("thinking");

    try {
      const res = await axios.post("/api/ai/agent", {
        query: text,
        restaurantId: restaurant.id,
      });

      const data = res.data;

      // Update agent state on UI if switched by agent router
      if (data.routingAgent && data.routingAgent !== activeAgent) {
        setActiveAgent(data.routingAgent);
      }

      addMessage({
        sender: "ai",
        text: data.text || "Action executed successfully.",
        action: data.action,
      });

      // Update Action Ledger History
      if (data.action && data.action.type !== "SHOW_TOAST" && data.action.type !== "CONFIRMATION_REQUIRED") {
        addAction({
          type: data.action.type,
          payload: data.action.payload,
          success: !data.text.includes("❌")
        });
      }

      if (data.text) {
        speakText(data.text);
      }

      if (data.action) {
        executeAction(data.action);
      } else {
        setStatus("idle");
      }
    } catch (err: any) {
      console.error(err);
      addMessage({
        sender: "ai",
        text: "Apologies, I encountered a communication error. Please check your credentials or network and try again.",
      });
      setStatus("idle");
    }
  };

  const handleConfirmAction = (confirm: boolean) => {
    if (confirm) {
      handleSendMessage("YES");
    } else {
      handleSendMessage("CANCEL");
    }
    setShowConfirmAction(null);
  };

  const startListening = () => {
    if (!recognitionRef.current) {
      toast.error("Web Speech API is not supported in this browser. Please use Google Chrome or Edge.");
      return;
    }

    try {
      if (isListening) {
        recognitionRef.current.stop();
      } else {
        recognitionRef.current.lang = speechLang;
        recognitionRef.current.start();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  const currentTheme = AGENT_THEMES[activeAgent];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Drawer Overlay */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={() => setOpen(false)}
      />

      {/* Main Drawer Interface panel */}
      <div className="relative w-full max-w-md h-full bg-white dark:bg-[#080808] shadow-2xl flex flex-col border-l border-neutral-200 dark:border-white/5 z-10 animate-in slide-in-from-right duration-300">
        
        {/* Glowing top line based on active agent */}
        <div className={`h-[3px] w-full bg-gradient-to-r ${currentTheme.color}`} />

        {/* Header section */}
        <div className="p-4 border-b border-neutral-200 dark:border-white/5 flex items-center justify-between bg-neutral-50/50 dark:bg-[#0c0c0c]/50">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${currentTheme.color} flex items-center justify-center text-white shadow-md`}>
              <Sparkles className="size-4 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-neutral-800 dark:text-[#f0ece4] flex items-center gap-2 leading-none">
                Serveaura Agent
                <span className="flex items-center">
                  <span className={`w-2 h-2 rounded-full ${
                    status === "listening" ? "bg-red-500 animate-ping" :
                    status === "thinking" ? "bg-yellow-500 animate-pulse" :
                    status === "speaking" ? "bg-green-500 animate-bounce" : "bg-neutral-400"
                  }`} />
                </span>
              </h2>
              <p className="text-[10px] text-neutral-400 dark:text-[#6f695f] mt-1 font-semibold flex items-center gap-1">
                Active: <span className={`${currentTheme.text} font-bold`}>{currentTheme.label}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Lang switch */}
            <button
              onClick={() => {
                const nextLang = speechLang === "en-US" ? "hi-IN" : "en-US";
                setSpeechLang(nextLang);
                toast.success(`Speech recognition set to: ${nextLang === "hi-IN" ? "Hindi + English" : "English Only"}`);
              }}
              className="p-2 rounded-xl text-neutral-400 hover:bg-neutral-100 dark:hover:bg-[#161616] hover:text-[#f97316] transition-all flex items-center gap-1"
              title="Toggle speech language"
            >
              <Languages className="size-4" />
              <span className="text-[9px] font-bold uppercase">{speechLang.split("-")[0]}</span>
            </button>

            {/* Mute output button */}
            <button
              onClick={() => {
                setVoiceEnabled(!voiceEnabled);
                toast.success(voiceEnabled ? "Muted voice completions" : "Voice completions enabled");
              }}
              className={`p-2 rounded-xl transition-all ${
                voiceEnabled 
                  ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" 
                  : "text-neutral-400 hover:bg-neutral-100 dark:hover:bg-[#161616]"
              }`}
              title={voiceEnabled ? "Mute completion voice" : "Enable completion voice"}
            >
              {voiceEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
            </button>

            {/* Close button */}
            <button
              onClick={() => setOpen(false)}
              className="p-2 rounded-xl text-neutral-400 hover:text-neutral-800 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-[#161616] transition-all"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-neutral-200 dark:border-white/5 bg-neutral-50/20 dark:bg-[#090909]">
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex-1 py-2 text-center text-xs font-bold transition-all border-b-2 ${
              activeTab === "chat" 
                ? `${currentTheme.text} border-current bg-white dark:bg-[#0c0c0c]/30` 
                : "text-neutral-400 border-transparent hover:text-neutral-600 dark:hover:text-neutral-300"
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => setActiveTab("alerts")}
            className={`flex-1 py-2 text-center text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 ${
              activeTab === "alerts" 
                ? "text-red-500 border-red-500 bg-white dark:bg-[#0c0c0c]/30" 
                : "text-neutral-400 border-transparent hover:text-neutral-600 dark:hover:text-neutral-300"
            }`}
          >
            Alerts
            {alerts.length > 0 && (
              <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-extrabold animate-pulse">
                {alerts.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-2 text-center text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 ${
              activeTab === "history" 
                ? "text-blue-500 border-blue-500 bg-white dark:bg-[#0c0c0c]/30" 
                : "text-neutral-400 border-transparent hover:text-neutral-600 dark:hover:text-neutral-300"
            }`}
          >
            Action Log
          </button>
        </div>

        {/* Drawer Body Panel */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          <AnimatePresence mode="wait">
            
            {/* TAB 1: Chat Window */}
            {activeTab === "chat" && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-4"
              >
                {/* Agent Switcher horizontal carousel */}
                <div className="pb-1 border-b border-neutral-100 dark:border-white/5">
                  <p className="text-[9px] text-neutral-400 dark:text-[#5a5650] uppercase tracking-wider font-extrabold mb-2">
                    Switch Active Agent Role
                  </p>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                    {Object.entries(AGENT_THEMES).map(([id, item]) => {
                      const isActive = activeAgent === id;
                      return (
                        <button
                          key={id}
                          onClick={() => {
                            setActiveAgent(id as any);
                            toast.success(`Agent switched to: ${item.label}`);
                          }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-extrabold transition-all whitespace-nowrap ${
                            isActive 
                              ? `bg-gradient-to-r ${item.color} text-white border-transparent shadow-sm shadow-orange-500/10` 
                              : "bg-neutral-50 dark:bg-[#111] border-neutral-200 dark:border-white/5 text-neutral-500 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-white/10"
                          }`}
                        >
                          {item.icon}
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Messages Ledger */}
                <div className="space-y-4 pt-1">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-xs leading-relaxed ${
                          msg.sender === "user"
                            ? `bg-gradient-to-r ${currentTheme.color} text-white rounded-br-none`
                            : "bg-neutral-100 dark:bg-[#121212] text-neutral-800 dark:text-[#f0ece4] border border-neutral-200/50 dark:border-white/5 rounded-bl-none"
                        }`}
                      >
                        <p className="whitespace-pre-line">{msg.text}</p>
                        
                        {msg.action && (
                          <div className="mt-2 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider opacity-85 border-t border-black/10 dark:border-white/10 pt-1.5">
                            <span className="bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                              <ShieldCheck className="size-3 text-green-500" /> Action: {msg.action.type}
                            </span>
                          </div>
                        )}
                      </div>
                      <span className="text-[9px] text-neutral-400 dark:text-[#5a5650] mt-1 px-1">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {msg.isVoice && " • via Voice"}
                      </span>
                    </div>
                  ))}

                  {status === "thinking" && (
                    <div className="flex items-center gap-2 text-neutral-400 dark:text-[#5a5650] text-xs font-semibold pl-1 animate-pulse">
                      <Loader2 className="size-3.5 animate-spin text-[#f97316]" />
                      Specialized agent is analyzing...
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </motion.div>
            )}

            {/* TAB 2: Proactive Alerts list */}
            {activeTab === "alerts" && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-neutral-800 dark:text-white uppercase tracking-wider">Active Operations Alerts</h3>
                  <button onClick={fetchAlerts} className="text-[10px] text-[#f97316] font-bold hover:underline">Refresh</button>
                </div>

                {alerts.length === 0 ? (
                  <div className="p-8 text-center text-neutral-400 dark:text-neutral-600 text-xs">
                    <Check className="size-8 mx-auto text-green-500 mb-2 border border-green-500/20 p-1.5 rounded-full" />
                    All operating modules are functioning normal. No alerts logged.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={`p-3 rounded-xl border flex gap-2.5 transition-all ${
                          alert.severity === "CRITICAL"
                            ? "bg-red-500/5 border-red-500/20 text-red-700 dark:text-red-400"
                            : "bg-yellow-500/5 border-yellow-500/20 text-yellow-700 dark:text-yellow-400"
                        }`}
                      >
                        <AlertTriangle className="size-4.5 shrink-0 mt-0.5 animate-bounce" />
                        <div>
                          <p className="text-xs font-bold">{alert.title}</p>
                          <p className="text-[11px] mt-1 leading-normal opacity-90">{alert.message}</p>
                          <span className="text-[9px] opacity-70 mt-1.5 block">
                            Triggered: {new Date(alert.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* TAB 3: Action Execution log */}
            {activeTab === "history" && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-neutral-800 dark:text-white uppercase tracking-wider flex items-center gap-1">
                    <History className="size-3.5" /> Agent Action History
                  </h3>
                  {actionHistory.length > 0 && (
                    <button
                      onClick={() => {
                        if (confirm("Clear local action history ledger?")) {
                          clearActionHistory();
                        }
                      }}
                      className="text-[10px] text-red-500 font-semibold hover:underline"
                    >
                      Clear Log
                    </button>
                  )}
                </div>

                {actionHistory.length === 0 ? (
                  <div className="p-8 text-center text-neutral-400 dark:text-neutral-600 text-xs">
                    No actions logged. Ask the agent to modify tables, categories, or prices to start auditing.
                  </div>
                ) : (
                  <div className="space-y-2 border-l-2 border-neutral-200 dark:border-neutral-800 pl-3.5 ml-2.5">
                    {actionHistory.map((item) => (
                      <div key={item.id} className="relative pb-2.5">
                        {/* Timeline dot */}
                        <span className={`absolute -left-[20px] top-1.5 w-2 h-2 rounded-full ${item.success ? "bg-green-500" : "bg-red-500"}`} />
                        <div>
                          <p className="text-xs font-bold text-neutral-800 dark:text-[#f0ece4] uppercase flex items-center gap-1">
                            {item.type}
                            <span className={`text-[9px] px-1 py-0.2 rounded font-normal ${
                              item.success ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                            }`}>
                              {item.success ? "Success" : "Failed"}
                            </span>
                          </p>
                          {item.payload && (
                            <pre className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1 font-mono max-h-16 overflow-y-auto bg-neutral-50 dark:bg-[#111] p-1 rounded border border-neutral-200/50 dark:border-white/5 scrollbar-none">
                              {JSON.stringify(item.payload, null, 2)}
                            </pre>
                          )}
                          <span className="text-[8px] text-neutral-400 block mt-1">
                            {new Date(item.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Action Confirmation dialogue card (Critical updates safety wall) */}
        {showConfirmAction && (
          <div className="absolute inset-x-0 bottom-[75px] mx-4 p-4 rounded-2xl bg-white dark:bg-[#111] border border-neutral-200 dark:border-white/10 shadow-xl z-25 flex flex-col space-y-3 animate-in fade-in duration-200">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-yellow-500/10 text-yellow-500 flex items-center justify-center shrink-0">
                <AlertTriangle className="size-4.5" />
              </div>
              <div>
                <p className="text-xs font-extrabold text-neutral-800 dark:text-white">Requires Confirmation</p>
                <p className="text-[11px] text-neutral-500 mt-0.5 leading-normal">
                  You are performing a restricted operation: <span className="font-bold text-yellow-500">{showConfirmAction.actionType}</span>. Are you sure you wish to apply these changes?
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => handleConfirmAction(false)}
                className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-400 text-[11px] font-bold hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-all"
              >
                No, Abort
              </button>
              <button
                onClick={() => handleConfirmAction(true)}
                className="px-3 py-1.5 rounded-lg bg-[#f97316] text-white text-[11px] font-bold hover:bg-[#ea6c0a] shadow-sm shadow-[#f97316]/10 transition-all"
              >
                Yes, Confirm Action
              </button>
            </div>
          </div>
        )}

        {/* Speech wave overlay animation when recording */}
        {isListening && (
          <div className="absolute inset-x-0 bottom-[68px] bg-red-500/5 backdrop-blur-xs border-t border-b border-red-500/10 py-3 flex flex-col items-center justify-center space-y-1.5 animate-in slide-in-from-bottom duration-200">
            <span className="text-[10px] text-red-600 dark:text-red-400 font-extrabold uppercase tracking-widest flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" /> Listening ({speechLang === "hi-IN" ? "Hindi + English" : "English Only"})...
            </span>
            <div className="flex items-center gap-1 h-6">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-red-500 rounded-full animate-[soundWave_1.2s_infinite]"
                  style={{
                    height: "10px",
                    animationDelay: `${i * 0.15}s`,
                  }}
                />
              ))}
            </div>
            <style jsx>{`
              @keyframes soundWave {
                0%, 100% { height: 6px; }
                50% { height: 24px; }
              }
            `}</style>
          </div>
        )}

        {/* Contextual Suggested Quick Prompts Panel */}
        {activeTab === "chat" && !isListening && (
          <div className="px-4 py-2 bg-neutral-50/50 dark:bg-[#0c0c0c]/40 border-t border-neutral-200/60 dark:border-white/5">
            <p className="text-[9px] text-neutral-400 dark:text-[#6f695f] uppercase tracking-wider font-extrabold mb-1.5 flex items-center gap-1">
              <Radio className="size-3 text-[#f97316]" /> Suggested Prompts
            </p>
            <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-none">
              {SUGGESTED_PROMPTS[activeAgent].map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(prompt)}
                  className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#131313] border border-neutral-200 dark:border-white/5 hover:border-[#f97316]/40 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-[#f0ece4] text-[10px] font-semibold transition-all whitespace-nowrap shadow-xs"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input area panel */}
        <div className="p-4 border-t border-neutral-200 dark:border-white/5 bg-neutral-50/50 dark:bg-[#080808] flex items-center gap-2">
          {/* Pulsing Mic trigger */}
          <button
            onClick={startListening}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              isListening
                ? "bg-red-500 text-white shadow-lg shadow-red-500/20 scale-105 animate-pulse"
                : "bg-neutral-100 dark:bg-[#131313] text-neutral-500 dark:text-[#9a9488] hover:bg-neutral-200 dark:hover:bg-[#1a1a1a]"
            }`}
            title="Start voice command"
          >
            {isListening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
          </button>

          {/* Text Input */}
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage(inputVal)}
            placeholder={`Instruct the ${currentTheme.label}...`}
            className="flex-1 h-10 px-3.5 bg-neutral-100 dark:bg-[#131313] text-neutral-800 dark:text-[#f0ece4] border border-neutral-200 dark:border-white/5 rounded-xl placeholder-neutral-400 dark:placeholder-[#444] text-[11px] focus:outline-none focus:border-[#f97316] transition-colors"
          />

          {/* Send text button */}
          <button
            onClick={() => handleSendMessage(inputVal)}
            disabled={!inputVal.trim()}
            className="w-10 h-10 rounded-xl bg-[#f97316] hover:bg-[#ea6c0a] text-white flex items-center justify-center shadow-md shadow-[#f97316]/10 disabled:opacity-40 disabled:hover:bg-[#f97316] transition-all"
          >
            <Send className="size-4" />
          </button>
        </div>

      </div>
    </div>
  );
}
