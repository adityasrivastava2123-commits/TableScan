"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import {
  Users,
  Award,
  DollarSign,
  TrendingUp,
  Search,
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  Calendar,
  Clock,
  Copy,
  Check,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Restaurant } from "@prisma/client";

interface Customer {
  name: string;
  phone: string;
  email: string;
  totalSpend: number;
  totalVisits: number;
  loyaltyTier: "VIP" | "Regular" | "New";
  lastVisit: string | null;
  orders: Array<{
    id: string;
    orderNumber: string;
    totalAmount: number;
    status: string;
    createdAt: string;
    itemsCount: number;
    items: Array<{ name: string; quantity: number; price: number }>;
  }>;
  reservations: Array<{
    id: string;
    date: string;
    partySize: number;
    status: string;
    createdAt: string;
  }>;
  waitlist: any[];
  queue: any[];
}

interface CustomersDashboardProps {
  restaurant: Restaurant;
}

export default function CustomersDashboard({ restaurant }: CustomersDashboardProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<"ALL" | "VIP" | "Regular" | "New">("ALL");
  const [sortBy, setSortBy] = useState<"SPEND_DESC" | "SPEND_ASC" | "VISITS_DESC" | "VISITS_ASC" | "LAST_VISIT_DESC">("SPEND_DESC");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/customers?restaurantId=${restaurant.id}`);
      setCustomers(response.data);
    } catch (error) {
      console.error("Failed to fetch customers list:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [restaurant.id]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // KPI Calculations
  const totalCustomersCount = customers.length;
  const vipCount = customers.filter((c) => c.loyaltyTier === "VIP").length;
  const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpend, 0);
  const avgCustomerValue = totalCustomersCount ? totalRevenue / totalCustomersCount : 0;
  const returningCustomersCount = customers.filter((c) => c.totalVisits > 1).length;
  const retentionRate = totalCustomersCount
    ? (returningCustomersCount / totalCustomersCount) * 100
    : 0;

  // Filter & Sort Logic
  const filteredCustomers = customers
    .filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery) ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTier = tierFilter === "ALL" || c.loyaltyTier === tierFilter;
      return matchesSearch && matchesTier;
    })
    .sort((a, b) => {
      if (sortBy === "SPEND_DESC") return b.totalSpend - a.totalSpend;
      if (sortBy === "SPEND_ASC") return a.totalSpend - b.totalSpend;
      if (sortBy === "VISITS_DESC") return b.totalVisits - a.totalVisits;
      if (sortBy === "VISITS_ASC") return a.totalVisits - b.totalVisits;
      
      // LAST_VISIT_DESC
      const dateA = a.lastVisit ? new Date(a.lastVisit).getTime() : 0;
      const dateB = b.lastVisit ? new Date(b.lastVisit).getTime() : 0;
      return dateB - dateA;
    });

  const getTierBadgeStyles = (tier: "VIP" | "Regular" | "New") => {
    if (tier === "VIP") {
      return "bg-[#f0a040]/10 text-[#f0a040] border border-[#f0a040]/20";
    }
    if (tier === "Regular") {
      return "bg-white/5 text-[#f5efe2]/60 border border-white/10";
    }
    return "bg-[rgba(82,210,122,0.15)] text-[#52d27a] border border-[rgba(82,210,122,0.3)]";
  };

  const getOrderStatusColor = (status: string) => {
    switch (status) {
      case "NEW": return "text-blue-400 bg-blue-500/10 border border-blue-500/20";
      case "PREPARING": return "text-[#f0a040] bg-amber-500/10 border border-amber-500/20";
      case "READY": return "text-[#52d27a] bg-[#52d27a]/10 border border-[#52d27a]/20";
      case "DONE": return "text-[#f5efe2]/50 bg-white/5 border border-white/10";
      default: return "text-red-400 bg-red-500/10 border border-red-500/20";
    }
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6 text-[#f5efe2]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#f5efe2] leading-[1.1]">
            Customers <em className="font-editorial italic font-normal text-[#f0a040]">CRM</em>
          </h1>
          <p className="text-[13px] text-[#f5efe2]/60 mt-1">
            Analyze visitor patterns, CRM history, and customer lifetime value.
          </p>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="bg-white/[0.02] border border-[rgba(255,255,255,0.08)] rounded-xl p-[18px_20px] shadow-sm relative overflow-hidden transition-all duration-300 hover:border-[#f0a040]/30 card-hover">
          <div className="absolute inset-0 bg-gradient-to-br from-[#f0a040]/5 to-transparent pointer-events-none" />
          <div className="flex items-center justify-between">
            <div className="w-[34px] h-[34px] rounded-lg bg-[#f0a040]/10 text-[#f0a040] flex items-center justify-center mb-3">
              <Users className="size-4" />
            </div>
            <Badge className="bg-white/5 text-[#f5efe2]/40 border-0 text-[9px] font-semibold">CRM Active</Badge>
          </div>
          <p className="text-[10px] tracking-wider uppercase text-[#f5efe2]/40 mb-1">Total Profiles</p>
          <p className="text-[26px] font-bold text-[#f5efe2] tracking-tight leading-none font-mono-dashboard">
            {loading ? "..." : totalCustomersCount}
          </p>
        </Card>

        <Card className="bg-white/[0.02] border border-[rgba(255,255,255,0.08)] rounded-xl p-[18px_20px] shadow-sm relative overflow-hidden transition-all duration-300 hover:border-[#f0a040]/30 card-hover">
          <div className="absolute inset-0 bg-gradient-to-br from-[#f0a040]/5 to-transparent pointer-events-none" />
          <div className="flex items-center justify-between">
            <div className="w-[34px] h-[34px] rounded-lg bg-[#f0a040]/10 text-[#f0a040] flex items-center justify-center mb-3">
              <Award className="size-4" />
            </div>
            <Badge className="bg-[#f0a040]/10 text-[#f0a040] border border-[#f0a040]/20 text-[9px] font-semibold">VIP Group</Badge>
          </div>
          <p className="text-[10px] tracking-wider uppercase text-[#f5efe2]/40 mb-1">VIP Spenders</p>
          <p className="text-[26px] font-bold text-[#f5efe2] tracking-tight leading-none font-mono-dashboard">
            {loading ? "..." : vipCount}
          </p>
        </Card>

        <Card className="bg-white/[0.02] border border-[rgba(255,255,255,0.08)] rounded-xl p-[18px_20px] shadow-sm relative overflow-hidden transition-all duration-300 hover:border-[#f0a040]/30 card-hover">
          <div className="absolute inset-0 bg-gradient-to-br from-[#f0a040]/5 to-transparent pointer-events-none" />
          <div className="flex items-center justify-between">
            <div className="w-[34px] h-[34px] rounded-lg bg-[#f0a040]/10 text-[#f0a040] flex items-center justify-center mb-3">
              <DollarSign className="size-4" />
            </div>
            <Badge className="bg-white/5 text-[#f5efe2]/60 border-0 text-[9px] font-semibold">Lifetime Value</Badge>
          </div>
          <p className="text-[10px] tracking-wider uppercase text-[#f5efe2]/40 mb-1">Average Spend</p>
          <p className="text-[26px] font-bold text-[#f5efe2] tracking-tight leading-none font-mono-dashboard">
            {loading ? "..." : `₹${avgCustomerValue.toFixed(0)}`}
          </p>
        </Card>

        <Card className="bg-white/[0.02] border border-[rgba(255,255,255,0.08)] rounded-xl p-[18px_20px] shadow-sm relative overflow-hidden transition-all duration-300 hover:border-[#f0a040]/30 card-hover">
          <div className="absolute inset-0 bg-gradient-to-br from-[#f0a040]/5 to-transparent pointer-events-none" />
          <div className="flex items-center justify-between">
            <div className="w-[34px] h-[34px] rounded-lg bg-[#f0a040]/10 text-[#f0a040] flex items-center justify-center mb-3">
              <TrendingUp className="size-4" />
            </div>
            <Badge className="bg-white/5 text-[#f5efe2]/60 border-0 text-[9px] font-semibold">Retention</Badge>
          </div>
          <p className="text-[10px] tracking-wider uppercase text-[#f5efe2]/40 mb-1">Retention Rate</p>
          <p className="text-[26px] font-bold text-[#f5efe2] tracking-tight leading-none font-mono-dashboard">
            {loading ? "..." : `${retentionRate.toFixed(1)}%`}
          </p>
        </Card>
      </div>

      {/* Advanced Filters */}
      <Card className="bg-white/[0.02] border border-[rgba(255,255,255,0.08)] rounded-xl p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3.5 flex-1 min-w-[260px]">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#f5efe2]/40 size-4" />
              <input
                type="text"
                placeholder="Search by name, phone, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 bg-white/[0.02] border border-[rgba(255,255,255,0.08)] rounded-lg text-[13px] pl-10 pr-4 text-[#f5efe2] placeholder-[#f5efe2]/30 focus:border-[#f0a040]/50 outline-none transition-colors"
              />
            </div>

            <div className="flex gap-2">
              {(["ALL", "VIP", "Regular", "New"] as const).map((tier) => (
                <button
                  key={tier}
                  onClick={() => setTierFilter(tier)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                    tierFilter === tier
                      ? "bg-[#f0a040] text-[#0b0a08] border-transparent shadow-lg shadow-amber-950/20"
                      : "bg-transparent border-[rgba(255,255,255,0.08)] text-[#f5efe2]/40 hover:border-[rgba(255,255,255,0.15)] hover:text-[#f5efe2]"
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#f5efe2]/40 font-medium">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-10 bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] rounded-lg text-[12px] px-3 font-semibold text-[#f5efe2] outline-none cursor-pointer focus:border-[#f0a040]"
            >
              <option value="SPEND_DESC" className="bg-[#0b0a08]">Spend: High to Low</option>
              <option value="SPEND_ASC" className="bg-[#0b0a08]">Spend: Low to High</option>
              <option value="VISITS_DESC" className="bg-[#0b0a08]">Visits: Most to Least</option>
              <option value="VISITS_ASC" className="bg-[#0b0a08]">Visits: Least to Most</option>
              <option value="LAST_VISIT_DESC" className="bg-[#0b0a08]">Recent Visit</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Main CRM CRM Table */}
      <Card className="bg-white/[0.02] border border-[rgba(255,255,255,0.08)] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.01] text-[#f5efe2]/40 text-[10px] font-bold tracking-wider uppercase border-b border-[rgba(255,255,255,0.08)]">
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Contact Detail</th>
                <th className="px-6 py-4">Loyalty Group</th>
                <th className="px-6 py-4 text-center">Visits</th>
                <th className="px-6 py-4">Total Spend</th>
                <th className="px-6 py-4">Last Activity</th>
                <th className="px-6 py-4 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(255,255,255,0.05)]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-[13px] text-[#f5efe2]/40">
                    <div className="flex items-center justify-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#f0a040] animate-bounce" />
                      <span className="w-2 h-2 rounded-full bg-[#f0a040] animate-bounce [animation-delay:0.2s]" />
                      <span className="w-2 h-2 rounded-full bg-[#f0a040] animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-[13px] text-[#f5efe2]/40">
                    No matching customer profiles found in history.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer, idx) => {
                  const key = `cust-${customer.phone || customer.name}-${idx}`;
                  const isExpanded = expandedId === key;

                  return (
                    <tbody key={key} className="contents">
                      <tr
                        onClick={() => setExpandedId(isExpanded ? null : key)}
                        className={`group border-0 cursor-pointer hover:bg-white/[0.01] transition-colors ${
                          isExpanded ? "bg-white/[0.01]" : ""
                        }`}
                      >
                        {/* Profile Info */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#f0a040]/10 to-transparent border border-[#f0a040]/20 text-[#f0a040] flex items-center justify-center text-[11px] font-bold font-mono-dashboard">
                              {getInitials(customer.name)}
                            </div>
                            <div>
                              <p className="text-[13px] font-bold text-[#f5efe2] group-hover:text-[#f0a040] transition-colors leading-tight">
                                {customer.name}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Contact Details */}
                        <td className="px-6 py-4">
                          <div className="space-y-0.5">
                            {customer.phone && customer.phone !== "N/A" && (
                              <div className="flex items-center gap-1.5 text-[11px] text-[#f5efe2]/60">
                                <Phone className="size-3 flex-shrink-0" />
                                <span className="font-mono-dashboard">{customer.phone}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyToClipboard(customer.phone, `${key}-phone`);
                                  }}
                                  className="text-[#f5efe2]/30 hover:text-[#f0a040] transition-colors ml-0.5"
                                  title="Copy Phone"
                                >
                                  {copiedText === `${key}-phone` ? (
                                    <Check className="size-3 text-[#52d27a]" />
                                  ) : (
                                    <Copy className="size-2.5" />
                                  )}
                                </button>
                              </div>
                            )}
                            {customer.email && customer.email !== "N/A" && (
                              <div className="flex items-center gap-1.5 text-[11px] text-[#f5efe2]/60">
                                <Mail className="size-3 flex-shrink-0" />
                                <span className="truncate max-w-[150px]">{customer.email}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyToClipboard(customer.email, `${key}-email`);
                                  }}
                                  className="text-[#f5efe2]/30 hover:text-[#f0a040] transition-colors ml-0.5"
                                  title="Copy Email"
                                >
                                  {copiedText === `${key}-email` ? (
                                    <Check className="size-3 text-[#52d27a]" />
                                  ) : (
                                    <Copy className="size-2.5" />
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Loyalty Group */}
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${getTierBadgeStyles(customer.loyaltyTier)}`}>
                            {customer.loyaltyTier}
                          </span>
                        </td>

                        {/* Total Visits */}
                        <td className="px-6 py-4 text-center text-[12px] font-semibold text-[#f5efe2] font-mono-dashboard">
                          {customer.totalVisits}
                        </td>

                        {/* Total Spend */}
                        <td className="px-6 py-4 text-[13px] font-bold text-[#f0a040] font-mono-dashboard">
                          ₹{customer.totalSpend.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </td>

                        {/* Last Visit Date */}
                        <td className="px-6 py-4 text-[12px] text-[#f5efe2]/60 font-mono-dashboard">
                          {customer.lastVisit ? (
                            <span className="flex items-center gap-1.5">
                              <Clock className="size-3 text-[#f5efe2]/40" />
                              {new Date(customer.lastVisit).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          ) : (
                            <span className="text-[#f5efe2]/20">—</span>
                          )}
                        </td>

                        {/* Expand Icon */}
                        <td className="px-6 py-4 text-right">
                          <button className="p-1 rounded-md text-[#f5efe2]/40 hover:text-[#f0a040] hover:bg-white/[0.02] transition-all">
                            {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                          </button>
                        </td>
                      </tr>

                      {/* Detail Chronology Row */}
                      {isExpanded && (
                        <tr className="bg-white/[0.01] border-t border-[rgba(255,255,255,0.08)]">
                          <td colSpan={7} className="px-8 py-5">
                            <div className="space-y-4">
                              <div className="flex items-center gap-1.5">
                                <Sparkles className="size-3.5 text-[#f0a040]" />
                                <h4 className="text-[12px] font-bold text-[#f5efe2] uppercase tracking-wider">
                                  Timeline & History
                                </h4>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* Left Column: Orders History */}
                                <div className="space-y-2">
                                  <h5 className="text-[11px] font-semibold text-[#f5efe2]/40 uppercase tracking-wider flex items-center gap-1.5">
                                    <ShoppingBag className="size-3.5" /> Order History ({customer.orders.length})
                                  </h5>

                                  {customer.orders.length === 0 ? (
                                    <p className="text-[11px] text-[#f5efe2]/40 bg-white/[0.01] p-4 rounded-xl border border-[rgba(255,255,255,0.04)] text-center">
                                      No orders found in database history.
                                    </p>
                                  ) : (
                                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
                                      {customer.orders.map((order) => (
                                        <div
                                          key={order.id}
                                          className="p-3 bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] rounded-xl space-y-1.5"
                                        >
                                          <div className="flex items-center justify-between">
                                            <span className="text-[11px] font-bold text-[#f5efe2] font-mono-dashboard">
                                              #{order.orderNumber}
                                            </span>
                                            <span className={`px-2 py-0.5 text-[9px] font-bold rounded-md ${getOrderStatusColor(order.status)}`}>
                                              {order.status}
                                            </span>
                                          </div>
                                          <div className="flex items-center justify-between text-[11px] text-[#f5efe2]/60 font-mono-dashboard">
                                            <span>{formatDateTime(order.createdAt)}</span>
                                            <span className="font-bold text-[#f0a040]">
                                              ₹{order.totalAmount.toFixed(0)}
                                            </span>
                                          </div>
                                          {order.items.length > 0 && (
                                            <div className="border-t border-[rgba(255,255,255,0.04)] pt-1.5 flex flex-wrap gap-1">
                                              {order.items.map((it: any, i: number) => (
                                                <Badge
                                                  key={i}
                                                  className="bg-white/5 border-0 text-[#f5efe2]/60 text-[9px] px-1.5 py-0.5"
                                                >
                                                  {it.quantity}x {it.name}
                                                </Badge>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Right Column: Reservations History */}
                                <div className="space-y-2">
                                  <h5 className="text-[11px] font-semibold text-[#f5efe2]/40 uppercase tracking-wider flex items-center gap-1.5">
                                    <Calendar className="size-3.5" /> Bookings & Reservations ({customer.reservations.length})
                                  </h5>

                                  {customer.reservations.length === 0 ? (
                                    <p className="text-[11px] text-[#f5efe2]/40 bg-white/[0.01] p-4 rounded-xl border border-[rgba(255,255,255,0.04)] text-center">
                                      No upcoming or historical bookings.
                                    </p>
                                  ) : (
                                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
                                      {customer.reservations.map((res) => (
                                        <div
                                          key={res.id}
                                          className="p-3 bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] rounded-xl space-y-1.5"
                                        >
                                          <div className="flex items-center justify-between text-[11px] font-bold text-[#f5efe2]">
                                            <span>Table Booking</span>
                                            <span className="text-[#f5efe2]/40 font-normal font-mono-dashboard">
                                              Party Size: {res.partySize}
                                            </span>
                                          </div>
                                          <div className="flex items-center justify-between text-[11px] text-[#f5efe2]/60 font-mono-dashboard">
                                            <span>{formatDateTime(res.date)}</span>
                                            <span className="font-semibold text-[#52d27a] uppercase text-[9px] tracking-wide">
                                              {res.status}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
