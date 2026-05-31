"use client";

import { ChevronRight } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  return (
    <div className="px-7 py-4 border-b border-[rgba(255,255,255,0.07)] flex items-center gap-2 text-[12px] text-[#5a5650]">
      <span>Dashboard</span>
      <ChevronRight size={12} />
      <span className="text-[#f0ece4]">{title}</span>
      {subtitle && <span className="ml-2 text-[#9a9488]">· {subtitle}</span>}
    </div>
  );
}
