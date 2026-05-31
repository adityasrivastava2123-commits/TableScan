"use client";

import { useState, useEffect } from "react";
import { X, Globe, AlertTriangle, XCircle, CheckCircle, Radio } from "lucide-react";
import axios from "axios";

interface BroadcastMessage {
  text: string;
  type: "info" | "warning" | "danger" | "success";
  active: boolean;
}

const typeConfig = {
  info: {
    bg: "bg-blue-950/80 border-blue-500/30",
    text: "text-blue-200",
    icon: <Globe className="size-3.5 flex-shrink-0" />,
    dot: "bg-blue-400",
  },
  warning: {
    bg: "bg-amber-950/80 border-amber-500/30",
    text: "text-amber-200",
    icon: <AlertTriangle className="size-3.5 flex-shrink-0" />,
    dot: "bg-amber-400",
  },
  danger: {
    bg: "bg-red-950/80 border-red-500/30",
    text: "text-red-200",
    icon: <XCircle className="size-3.5 flex-shrink-0" />,
    dot: "bg-red-400",
  },
  success: {
    bg: "bg-emerald-950/80 border-emerald-500/30",
    text: "text-emerald-200",
    icon: <CheckCircle className="size-3.5 flex-shrink-0" />,
    dot: "bg-emerald-400",
  },
};

export default function BroadcastBanner() {
  const [msg, setMsg] = useState<BroadcastMessage | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Poll broadcast every 30 seconds
    const fetch = () => {
      axios
        .get("/api/broadcast/public")
        .then((r) => {
          if (r.data?.active && r.data?.text) {
            setMsg(r.data);
            setDismissed(false);
          } else {
            setMsg(null);
          }
        })
        .catch(() => {}); // Silently fail if endpoint not ready
    };

    fetch();
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!msg || !msg.active || dismissed) return null;

  const cfg = typeConfig[msg.type] || typeConfig.info;

  return (
    <div className={`w-full border-b ${cfg.bg} backdrop-blur-sm px-4 py-2.5 flex items-center gap-3 animate-in slide-in-from-top-1 duration-300`}>
      {/* Live dot */}
      <span className="flex items-center gap-1.5 flex-shrink-0">
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} animate-pulse`} />
        <Radio className={`size-3 ${cfg.text} opacity-70`} />
      </span>

      {/* Icon + Text */}
      <span className={cfg.text}>{cfg.icon}</span>
      <p className={`flex-1 text-xs font-medium ${cfg.text} leading-snug`}>{msg.text}</p>

      {/* Label */}
      <span className={`text-[9px] font-bold uppercase tracking-widest ${cfg.text} opacity-50 hidden sm:block`}>
        System Broadcast
      </span>

      {/* Dismiss */}
      <button
        onClick={() => setDismissed(true)}
        className={`p-1 rounded-md hover:bg-white/10 transition-colors ${cfg.text} opacity-60 hover:opacity-100`}
        aria-label="Dismiss"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
