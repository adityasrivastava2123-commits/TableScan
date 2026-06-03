"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Send, Check, Clock, User, AlertCircle } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";

interface SupportMessage {
  id: string;
  tableName: string;
  text: string;
  sender: "user" | "staff";
  timestamp: string;
}

interface SupportRequest {
  id: string;
  tableName: string;
  restaurantId: string;
  messages: SupportMessage[];
  status: "OPEN" | "RESOLVED";
  updatedAt: string;
}

export default function SupportChatsManagement({ restaurantId }: { restaurantId: string }) {
  const [supportRequests, setSupportRequests] = useState<SupportRequest[]>([]);
  const [selectedChat, setSelectedChat] = useState<SupportRequest | null>(null);
  const [chatReply, setChatReply] = useState("");
  const [loading, setLoading] = useState(true);

  // Poll active support requests in real-time
  useEffect(() => {
    let mounted = true;
    const fetchSupport = async () => {
      try {
        const { data } = await axios.get(`/api/support?restaurantId=${restaurantId}`);
        if (mounted) {
          setSupportRequests(data);
          setLoading(false);
          
          // Sync active chat window in real-time
          if (selectedChat) {
            const updated = data.find((req: SupportRequest) => req.tableName === selectedChat.tableName);
            if (updated) setSelectedChat(updated);
          }
        }
      } catch {
        if (mounted) setLoading(false);
      }
    };

    void fetchSupport();
    const interval = setInterval(fetchSupport, 3000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [restaurantId, selectedChat]);

  async function sendStaffReply(tableName: string) {
    if (!chatReply.trim()) return;
    try {
      await axios.post("/api/support", {
        restaurantId,
        tableName,
        text: chatReply.trim(),
        sender: "staff",
      });
      setChatReply("");
      
      const { data } = await axios.get(`/api/support?restaurantId=${restaurantId}`);
      setSupportRequests(data);
      const updated = data.find((req: SupportRequest) => req.tableName === tableName);
      if (updated) setSelectedChat(updated);
      
      toast.success("Reply sent to table!");
    } catch {
      toast.error("Failed to send reply");
    }
  }

  async function resolveSupportRequest(tableName: string) {
    try {
      await axios.patch("/api/support", {
        restaurantId,
        tableName,
        status: "RESOLVED",
      });
      
      const { data } = await axios.get(`/api/support?restaurantId=${restaurantId}`);
      setSupportRequests(data);
      setSelectedChat(null);
      
      toast.success("Support session resolved");
    } catch {
      toast.error("Failed to resolve session");
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-[#f5efe2]/60 font-mono-dashboard">Loading support desk telemetry...</div>;
  }

  const openChats = supportRequests.filter(req => req.status === "OPEN");

  return (
    <div className="p-7 space-y-6 text-[#f5efe2]">
      {/* Header */}
      <div className="flex items-center gap-3.5 flex-wrap border-b border-[rgba(255,255,255,0.08)] pb-5">
        <div className="w-[46px] h-[46px] rounded-xl bg-gradient-to-br from-[#f0a040] to-[#e85a2a] flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#f0a040]/10 border border-[#f0a040]/20">
          <MessageSquare className="size-5 text-[#0b0a08]" />
        </div>
        <div>
          <h1 className="text-[20px] font-bold text-[#f5efe2]">
            Support <em className="font-editorial italic font-normal text-[#f0a040]">Chats</em>
          </h1>
          <p className="text-[12px] text-[#f5efe2]/60 mt-1">Manage live table requests and chat with diners</p>
        </div>
        
        {/* Pulse status indicator */}
        <div className="flex items-center gap-2 bg-[#f0a040]/10 px-4 py-2 border border-[#f0a040]/20 rounded-full sm:ml-auto">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] font-bold text-[#f5efe2] uppercase tracking-widest">Support Terminal Live</span>
        </div>
      </div>

      {/* Main split work area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch min-h-[580px]">
        
        {/* Left: Chats session selector list */}
        <div className="lg:col-span-1 bg-white/[0.02] border border-[rgba(255,255,255,0.08)] rounded-2xl p-5 flex flex-col h-[600px]">
          <h3 className="text-xs font-bold text-[#f5efe2]/40 uppercase tracking-wider mb-4">
            Open Requests ({openChats.length})
          </h3>
          
          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 scrollbar-thin">
            {openChats.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-20 text-[#f5efe2]/40 space-y-3">
                <MessageSquare className="size-10 opacity-20" />
                <p className="text-sm font-semibold text-[#f5efe2]/60">No active support chats</p>
                <p className="text-xs text-[#f5efe2]/40">Table help alerts will list here instantly.</p>
              </div>
            ) : (
              openChats.map(req => {
                const lastMsg = req.messages[req.messages.length - 1];
                const active = selectedChat?.tableName === req.tableName;
                return (
                  <div
                    key={req.id}
                    onClick={() => setSelectedChat(req)}
                    className={`border rounded-xl p-4 cursor-pointer transition-all active:scale-98 ${
                      active
                        ? "bg-[#f0a040]/10 border-[#f0a040]"
                        : "bg-white/[0.01] border-[rgba(255,255,255,0.05)] hover:border-[#f0a040]/40"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-black text-[#f5efe2]">
                          Table {req.tableName}
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-[#f0a040] animate-ping" />
                      </div>
                      <span className="text-[10px] text-[#f5efe2]/40 font-mono-dashboard">
                        {req.updatedAt ? new Date(req.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                      </span>
                    </div>
                    <p className="text-xs text-[#f5efe2]/60 line-clamp-2 italic leading-relaxed">
                      {lastMsg ? `"${lastMsg.text}"` : "Active chat request"}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Focused Live chat panel viewport */}
        <div className="lg:col-span-2 bg-white/[0.02] border border-[rgba(255,255,255,0.08)] rounded-2xl flex flex-col h-[600px] overflow-hidden">
          {!selectedChat ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 text-[#f5efe2]/40 space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#f0a040]/10 flex items-center justify-center mx-auto text-3xl">
                💬
              </div>
              <div>
                <h3 className="text-base font-bold text-[#f5efe2]/80">No Chat Selected</h3>
                <p className="text-xs text-[#f5efe2]/40 max-w-sm mx-auto mt-1">
                  Select an active dining table chat session from the left column to begin conversing with your diners in real-time.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Active Chat Header strip */}
              <div className="bg-white/[0.01] border-b border-[rgba(255,255,255,0.06)] px-5 py-4 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#f0a040]/20 flex items-center justify-center text-lg font-black text-[#f0a040] font-mono-dashboard">
                    {selectedChat.tableName}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#f5efe2]">Table {selectedChat.tableName}</h3>
                    <p className="text-[10px] text-[#52d27a] font-semibold uppercase tracking-wider flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Live Connection
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => resolveSupportRequest(selectedChat.tableName)}
                  className="flex items-center gap-1.5 bg-white/[0.02] border border-[rgba(255,255,255,0.08)] text-[#52d27a] hover:bg-[rgba(82,210,122,0.05)] hover:border-[#52d27a] px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
                >
                  <Check className="size-4" />
                  Resolve Session
                </button>
              </div>

              {/* Chat Viewport balloons logs */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#0b0a08]/40 scrollbar-thin">
                {selectedChat.messages.map((msg, index) => {
                  const isStaff = msg.sender === "staff";
                  return (
                    <div key={index} className={`flex ${isStaff ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[70%] rounded-[20px] px-4 py-2.5 shadow-sm ${
                        isStaff 
                          ? "bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-[#0b0a08] rounded-tr-none font-medium" 
                          : "bg-white/[0.04] border border-[rgba(255,255,255,0.08)] text-[#f5efe2] rounded-tl-none"
                      }`}>
                        <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                        <span className={`text-[9px] block text-right mt-1.5 font-bold font-mono-dashboard ${
                          isStaff ? "text-[#0b0a08]/60" : "text-[#f5efe2]/40"
                        }`}>{msg.timestamp}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reply Textbox Input Bar */}
              <div className="bg-white/[0.01] border-t border-[rgba(255,255,255,0.06)] p-4 flex-shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendStaffReply(selectedChat.tableName);
                  }}
                  className="flex items-center gap-3"
                >
                  <input
                    value={chatReply}
                    onChange={(e) => setChatReply(e.target.value)}
                    placeholder={`Type your reply to Table ${selectedChat.tableName} here…`}
                    className="flex-1 h-12 bg-white/[0.02] border border-[rgba(255,255,255,0.08)] text-[#f5efe2] placeholder-[#f5efe2]/20 focus:border-[#f0a040]/50 text-xs px-4 rounded-xl outline-none"
                  />
                  <button
                    type="submit"
                    className="w-12 h-12 bg-gradient-to-r from-[#f0a040] to-[#e85a2a] hover:brightness-110 rounded-xl flex items-center justify-center text-[#0b0a08] transition-all shadow-md active:scale-95 flex-shrink-0"
                  >
                    <Send className="size-4" />
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
