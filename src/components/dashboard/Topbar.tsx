"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

export default function Topbar() {
  const [simulatedTime, setSimulatedTime] = useState("");
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      };
      setSimulatedTime(now.toLocaleString("en-US", options).replace(",", " •"));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-[#0b0a08] border-b border-[rgba(255,255,255,0.06)] py-3 px-6 z-20 flex items-center justify-between gap-4 select-none">
      {/* Left active branch info */}
      <div className="flex items-center gap-3">
        <div className="px-3 py-1.5 bg-white/[0.015] border border-white/[0.05] rounded-xl text-xs font-bold text-[#f5efe2]/90 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#f0a040] animate-pulse" />
          <span className="tracking-wide">Active Branch: Kanpur</span>
        </div>
      </div>

      {/* Right clock, theme toggle & live indicators */}
      <div className="flex items-center gap-4">
        {/* Light / Dark Mode Switch */}
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 px-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-[#f5efe2]/80 hover:text-[#f5efe2] hover:bg-white/[0.08] transition-all flex items-center gap-2 text-xs font-mono-dashboard cursor-pointer"
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? (
              <>
                <Sun className="w-4 h-4 text-[#f0a040]" />
                <span className="hidden sm:inline text-[10px] uppercase font-bold tracking-wider text-[#f5efe2]/70">Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-[#7b9acc]" />
                <span className="hidden sm:inline text-[10px] uppercase font-bold tracking-wider text-[#f5efe2]/70">Dark Mode</span>
              </>
            )}
          </button>
        )}

        <div className="text-right">
          <p className="text-[8px] font-mono-dashboard text-[#f5efe2]/30 uppercase tracking-widest font-bold">Environment Time</p>
          <p className="text-[10px] font-mono-dashboard text-[#f5efe2]/95 mt-0.5 font-bold tabular-nums">
            {simulatedTime || "Synchronizing..."}
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#52d27a]/5 border border-[#52d27a]/15 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-[#52d27a] inline-block shrink-0 animate-pulse shadow-[0_0_8px_rgba(82,210,122,0.4)]" />
          <span className="text-[8px] font-mono-dashboard font-black uppercase tracking-widest text-[#52d27a]/90">Live OS</span>
        </div>
      </div>
    </header>
  );
}

