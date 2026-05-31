"use client"

import { useState } from "react"
import Link from "next/link"

// Premium SaaS Landing Page - Dark Theme
// Inspired by Linear, Stripe, Vercel, Raycast, Arc Browser

function QrCodeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 19.875v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
    </svg>
  )
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )
}

// Navbar Component
function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-dark">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#f59e0b] to-[#d97706]">
              <QrCodeIcon className="h-5 w-5 text-black" />
            </div>
            <span className="text-xl font-semibold text-white">TableScan</span>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
              How It Works
            </a>
            <a href="#showcase" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
              Showcase
            </a>
            <a href="#pricing" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
              Pricing
            </a>
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4">
            <Link href="/sign-in" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="rounded-full bg-gradient-to-r from-[#f59e0b] to-[#d97706] px-5 py-2 text-sm font-medium text-black hover:from-[#d97706] hover:to-[#b45309] transition-all shadow-lg shadow-[#f59e0b]/20"
            >
              Start Free Trial
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-zinc-400 hover:text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <XIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#050505] border-t border-[#27272a]">
          <div className="px-6 py-4 space-y-4">
            <a href="#features" className="block text-sm font-medium text-zinc-400 hover:text-white" onClick={() => setMobileMenuOpen(false)}>
              Features
            </a>
            <a href="#how-it-works" className="block text-sm font-medium text-zinc-400 hover:text-white" onClick={() => setMobileMenuOpen(false)}>
              How It Works
            </a>
            <a href="#showcase" className="block text-sm font-medium text-zinc-400 hover:text-white" onClick={() => setMobileMenuOpen(false)}>
              Showcase
            </a>
            <a href="#pricing" className="block text-sm font-medium text-zinc-400 hover:text-white" onClick={() => setMobileMenuOpen(false)}>
              Pricing
            </a>
            <div className="pt-4 border-t border-[#27272a] space-y-3">
              <Link href="/sign-in" className="block text-sm font-medium text-zinc-400 hover:text-white">
                Sign In
              </Link>
              <Link href="/sign-up" className="block w-full text-center rounded-full bg-gradient-to-r from-[#f59e0b] to-[#d97706] px-5 py-2 text-sm font-medium text-black shadow-lg shadow-[#f59e0b]/20">
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}

// Hero Section
function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-6 lg:px-8 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[#050505]" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#f59e0b]/10 rounded-full blur-[128px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#f59e0b]/5 rounded-full blur-[128px]" />
      
      <div className="relative z-10 max-w-[1280px] mx-auto pt-24 pb-16">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-[#0a0a0a] border border-[#27272a] text-[#f59e0b] px-4 py-1.5 rounded-full text-sm font-medium mb-8">
              <span className="w-2 h-2 bg-[#f59e0b] rounded-full animate-pulse" />
              New: Kitchen Display System
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white text-balance leading-[1.1]">
              The operating system for <span className="text-[#f59e0b] italic">modern restaurants</span>.
            </h1>
            <p className="mt-6 text-lg text-zinc-400 leading-relaxed text-pretty max-w-xl mx-auto lg:mx-0">
              Manage orders, tables, kitchen operations, billing, analytics, and staff from one powerful platform. QR-based ordering that transforms your restaurant.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link
                href="/sign-up"
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#f59e0b] to-[#d97706] px-8 py-4 text-base font-medium text-black hover:from-[#d97706] hover:to-[#b45309] transition-all shadow-xl shadow-[#f59e0b]/30 hover:shadow-2xl hover:shadow-[#f59e0b]/40"
              >
                Start Free Trial
              </Link>
              <button className="inline-flex items-center justify-center gap-2 rounded-full border border-[#27272a] bg-[#0a0a0a] px-8 py-4 text-base font-medium text-white hover:border-[#f59e0b] hover:bg-[#0a0a0a]/80 transition-all">
                <PlayIcon className="w-5 h-5" />
                Watch Demo
              </button>
            </div>
            <p className="mt-4 text-sm text-zinc-500">30-day free trial, no credit card required</p>
          </div>

          {/* Right Content - Dashboard Preview */}
          <div className="relative flex justify-center lg:justify-end">
            <div className="relative w-full max-w-lg">
              {/* Glassmorphism Dashboard Card */}
              <div className="glass-card-strong rounded-2xl p-6 border border-[#27272a]">
                {/* Dashboard Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#f59e0b] to-[#d97706] flex items-center justify-center">
                      <QrCodeIcon className="w-5 h-5 text-black" />
                    </div>
                    <div>
                      <p className="text-white font-semibold">Dashboard</p>
                      <p className="text-xs text-zinc-500">Live Overview</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-[#050505] rounded-xl p-4 border border-[#27272a]">
                    <p className="text-xs text-zinc-500 mb-1">Revenue Today</p>
                    <p className="text-2xl font-bold text-white">₹24,580</p>
                    <p className="text-xs text-green-500 mt-1">+12.5%</p>
                  </div>
                  <div className="bg-[#050505] rounded-xl p-4 border border-[#27272a]">
                    <p className="text-xs text-zinc-500 mb-1">Orders</p>
                    <p className="text-2xl font-bold text-white">156</p>
                    <p className="text-xs text-green-500 mt-1">+8.2%</p>
                  </div>
                </div>

                {/* Live Orders */}
                <div className="bg-[#050505] rounded-xl p-4 border border-[#27272a]">
                  <p className="text-sm font-semibold text-white mb-3">Live Orders</p>
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-[#27272a] last:border-0">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#f59e0b]/10 flex items-center justify-center">
                            <span className="text-xs text-[#f59e0b]">T{i}</span>
                          </div>
                          <div>
                            <p className="text-sm text-white">Order #{1000 + i}</p>
                            <p className="text-xs text-zinc-500">Table {i + 2}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-white">₹{(400 + i * 50).toFixed(0)}</p>
                          <p className="text-xs text-[#f59e0b]">Preparing</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Floating Elements */}
              <div className="absolute -left-8 top-12 glass-card rounded-xl p-4 border border-[#27272a] shadow-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckIcon className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">New Order</p>
                    <p className="text-sm font-medium text-white">Table #5</p>
                  </div>
                </div>
              </div>

              <div className="absolute -right-4 bottom-20 glass-card rounded-xl p-4 border border-[#27272a] shadow-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#f59e0b]/10 flex items-center justify-center">
                    <QrCodeIcon className="w-5 h-5 text-[#f59e0b]" />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">QR Scanned</p>
                    <p className="text-sm font-medium text-white">Table #8</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// Trust Bar
function TrustBar() {
  const brands = ["Burger King", "Pizza Hut", "Starbucks", "McDonald's", "Subway", "KFC", "Domino's", "Taco Bell"]
  
  return (
    <section className="py-16 border-y border-[#27272a] bg-[#050505]">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-8">
        <p className="text-center text-sm text-zinc-500 mb-8">Trusted by restaurants worldwide</p>
        <div className="flex flex-wrap justify-center items-center gap-12">
          {brands.map((brand, i) => (
            <span key={i} className="text-zinc-600 font-semibold text-lg">{brand}</span>
          ))}
        </div>
      </div>
    </section>
  )
}

// Statistics Section
function Statistics() {
  const stats = [
    { value: "2.5M+", label: "Orders Processed" },
    { value: "45s", label: "Avg. Service Time" },
    { value: "₹50Cr+", label: "Revenue Managed" },
    { value: "99.9%", label: "Platform Uptime" },
  ]

  return (
    <section className="py-24 px-6 lg:px-8 bg-[#050505]">
      <div className="max-w-[1280px] mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <div key={i} className="text-center lg:text-left">
              <p className="text-4xl lg:text-5xl font-bold text-white mb-2">{stat.value}</p>
              <p className="text-sm text-zinc-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// Features Section
function Features() {
  const features = [
    { icon: QrCodeIcon, title: "QR Ordering", description: "Customers scan and order instantly from their table" },
    { icon: () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" /></svg>, title: "Kitchen Display System", description: "Real-time order management for your kitchen staff" },
    { icon: () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>, title: "Table Management", description: "Track table status and optimize seating" },
    { icon: () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0-6.75h-3m3 0h3m-3-6h3M12 3.75v.75m0 0h-.375a.375.375 0 01-.375-.375m.375.375h-.375m-.375 0a.375.375 0 00-.375.375v.375m.375-.375h.375m.375 0v.375m0 0h-.375m-.375 0a.375.375 0 00-.375.375v.375m.375-.375h.375" /></svg>, title: "Inventory Tracking", description: "Monitor stock levels and reduce waste" },
    { icon: () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" /></svg>, title: "Real-Time Analytics", description: "Data-driven insights to grow your business" },
    { icon: () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></svg>, title: "Multi-Branch Management", description: "Manage all locations from one dashboard" },
    { icon: () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>, title: "Staff Management", description: "Role-based access for your team" },
    { icon: () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, title: "Enterprise Security", description: "Bank-level encryption for your data" },
  ]

  return (
    <section id="features" className="py-24 px-6 lg:px-8 bg-[#050505]">
      <div className="max-w-[1280px] mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-white text-balance mb-4">Built like restaurant infrastructure.</h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">Powerful features designed for modern restaurants that demand excellence.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feature, i) => (
            <div key={i} className="glass-card rounded-2xl p-6 border border-[#27272a] hover:border-[#f59e0b]/30 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-[#0a0a0a] border border-[#27272a] flex items-center justify-center mb-4 group-hover:border-[#f59e0b]/30 transition-all">
                <feature.icon className="w-6 h-6 text-zinc-400 group-hover:text-[#f59e0b] transition-colors" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// Product Showcase
function ProductShowcase() {
  return (
    <section id="showcase" className="py-24 px-6 lg:px-8 bg-[#050505]">
      <div className="max-w-[1280px] mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <div>
            <h2 className="text-4xl sm:text-5xl font-bold text-white text-balance mb-6">
              Kitchens receive orders <span className="text-[#f59e0b] italic">instantly</span>.
            </h2>
            <p className="text-lg text-zinc-400 leading-relaxed mb-8">
              Our Kitchen Display System ensures orders appear on your kitchen screen the moment they're placed. No more lost tickets, no more miscommunication. Just seamless operations.
            </p>
            <ul className="space-y-4">
              {["Real-time order synchronization", "Visual order prioritization", "Built-in timers for each item", "Table number tracking"].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-zinc-300">
                  <CheckIcon className="w-5 h-5 text-[#f59e0b]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Right Content - KDS Mockup */}
          <div className="relative">
            <div className="glass-card-strong rounded-2xl p-6 border border-[#27272a]">
              <div className="flex items-center justify-between mb-6">
                <p className="text-lg font-semibold text-white">Kitchen Display</p>
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs text-zinc-500">Live</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-[#050505] rounded-xl p-4 border border-[#27272a]">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-zinc-500">Order #{1000 + i}</span>
                      <span className="text-xs text-[#f59e0b]">Table {i + 1}</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white">Butter Chicken</span>
                        <span className="text-xs text-zinc-500">2x</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white">Naan</span>
                        <span className="text-xs text-zinc-500">4x</span>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-[#27272a]">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-500">Time</span>
                        <span className="text-xs text-green-500">{i * 2 + 5} min</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// How It Works
function HowItWorks() {
  const steps = [
    { number: "01", title: "Scan QR", description: "Customers scan the QR code at their table" },
    { number: "02", title: "Place Order", description: "Browse the digital menu and place orders" },
    { number: "03", title: "Kitchen Prepares", description: "Orders appear instantly on kitchen display" },
    { number: "04", title: "Payment & Feedback", description: "Pay securely and share your experience" },
  ]

  return (
    <section id="how-it-works" className="py-24 px-6 lg:px-8 bg-[#050505]">
      <div className="max-w-[1280px] mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-white text-balance mb-4">How it works</h2>
          <p className="text-lg text-zinc-400">From scan to satisfaction in four simple steps</p>
        </div>

        <div className="grid md:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <div key={i} className="relative">
              <div className="glass-card rounded-2xl p-6 border border-[#27272a] h-full">
                <p className="text-5xl font-bold text-[#f59e0b]/20 mb-4">{step.number}</p>
                <h3 className="text-xl font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-zinc-500">{step.description}</p>
              </div>
              {i < 3 && (
                <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-[#f59e0b]/50 to-transparent" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// Testimonials
function Testimonials() {
  const testimonials = [
    { quote: "TableScan transformed our operations. Orders are accurate, service is faster, and our customers love the experience.", author: "Rahul Sharma", business: "Spice Garden", role: "Owner" },
    { quote: "The analytics alone are worth it. We've increased revenue by 30% since implementing TableScan.", author: "Priya Patel", business: "Cafe Bloom", role: "Manager" },
    { quote: "Setup took less than 30 minutes. The support team is incredible. Highly recommended for any restaurant.", author: "Amit Kumar", business: "Pizza Palace", role: "Founder" },
  ]

  return (
    <section className="py-24 px-6 lg:px-8 bg-[#050505]">
      <div className="max-w-[1280px] mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-white text-balance mb-4">Loved by restaurant owners</h2>
          <p className="text-lg text-zinc-400">See what our customers have to say</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, i) => (
            <div key={i} className="glass-card rounded-2xl p-8 border border-[#27272a]">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, j) => (
                  <StarIcon key={j} className="w-5 h-5 text-[#f59e0b]" />
                ))}
              </div>
              <blockquote className="text-lg text-white mb-6 leading-relaxed">&ldquo;{testimonial.quote}&rdquo;</blockquote>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#f59e0b] to-[#d97706] flex items-center justify-center">
                  <span className="text-sm font-medium text-black">{testimonial.author[0]}</span>
                </div>
                <div>
                  <p className="font-semibold text-white">{testimonial.author}</p>
                  <p className="text-sm text-zinc-500">{testimonial.role}, {testimonial.business}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// Pricing
function Pricing() {
  const plans = [
    { name: "Starter", price: "₹999", period: "/mo", description: "Perfect for small cafes", features: ["1 location", "5 tables", "50 menu items", "Basic analytics", "Email support"], highlighted: false },
    { name: "Growth", price: "₹2,499", period: "/mo", description: "Best for growing restaurants", features: ["3 locations", "20 tables", "Unlimited menu items", "Advanced reports", "Priority support", "Staff accounts"], highlighted: true },
    { name: "Pro", price: "₹4,999", period: "/mo", description: "For restaurant chains", features: ["Unlimited locations", "Unlimited tables", "Unlimited menu items", "Custom branding", "Dedicated support", "API access"], highlighted: false },
  ]

  return (
    <section id="pricing" className="py-24 px-6 lg:px-8 bg-[#050505]">
      <div className="max-w-[1280px] mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-white text-balance mb-4">Simple, transparent pricing</h2>
          <p className="text-lg text-zinc-400">Choose the plan that fits your restaurant</p>
          <p className="mt-2 text-sm text-zinc-500">30-day free trial, no credit card required</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <div key={i} className={`relative rounded-2xl p-8 ${plan.highlighted ? "bg-gradient-to-br from-[#f59e0b] to-[#d97706] text-black ring-4 ring-[#f59e0b]/20 shadow-2xl shadow-[#f59e0b]/30" : "glass-card border border-[#27272a]"}`}>
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-black text-[#f59e0b] px-4 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </div>
              )}
              <div className="text-center">
                <h3 className={`text-xl font-semibold ${plan.highlighted ? "text-black" : "text-white"}`}>{plan.name}</h3>
                <div className="mt-4 flex items-baseline justify-center gap-1">
                  <span className={`text-4xl font-bold ${plan.highlighted ? "text-black" : "text-white"}`}>{plan.price}</span>
                  <span className={plan.highlighted ? "text-black/70" : "text-zinc-500"}>{plan.period}</span>
                </div>
                <p className={`mt-2 text-sm ${plan.highlighted ? "text-black/70" : "text-zinc-500"}`}>{plan.description}</p>
              </div>

              <ul className="mt-8 space-y-4">
                {plan.features.map((feature, j) => (
                  <li key={j} className="flex items-center gap-3">
                    <CheckIcon className={`w-5 h-5 flex-shrink-0 ${plan.highlighted ? "text-black" : "text-[#f59e0b]"}`} />
                    <span className={plan.highlighted ? "text-black/90" : "text-zinc-400"}>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link href="/sign-up" className={`mt-8 block w-full text-center rounded-full py-3 font-medium transition-all ${plan.highlighted ? "bg-black text-[#f59e0b] hover:bg-black/90" : "bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-black hover:from-[#d97706] hover:to-[#b45309]"}`}>
                Start Free Trial
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// Final CTA
function FinalCTA() {
  return (
    <section className="py-24 px-6 lg:px-8">
      <div className="max-w-[1280px] mx-auto">
        <div className="relative rounded-3xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#f59e0b] to-[#d97706]" />
          <div className="absolute inset-0 bg-black/20" />
          
          <div className="relative z-10 px-8 py-16 md:px-16 md:py-24 text-center">
            <h2 className="text-4xl sm:text-5xl font-bold text-white text-balance mb-4">
              Run your restaurant like a work of art.
            </h2>
            <p className="text-lg text-white/80 max-w-2xl mx-auto mb-8">
              Join thousands of restaurants transforming their operations with TableScan.
            </p>
            <Link href="/sign-up" className="inline-flex items-center justify-center rounded-full bg-black px-8 py-4 text-base font-medium text-white hover:bg-black/90 transition-all shadow-xl">
              Start Free Trial
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

// Footer
function PageFooter() {
  return (
    <div className="bg-[#050505] border-t border-[#27272a] py-16 px-6 lg:px-8">
      <div className="max-w-[1280px] mx-auto">
        <div className="grid md:grid-cols-4 gap-12">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#f59e0b] to-[#d97706]">
                <QrCodeIcon className="h-5 w-5 text-black" />
              </div>
              <span className="text-xl font-semibold text-white">TableScan</span>
            </div>
            <p className="text-zinc-500 max-w-sm leading-relaxed">
              QR-based digital menu and ordering system for modern restaurants. Delight customers, streamline operations.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Product</h4>
            <ul className="space-y-3">
              <li><a href="#features" className="text-zinc-500 hover:text-white transition-colors">Features</a></li>
              <li><a href="#how-it-works" className="text-zinc-500 hover:text-white transition-colors">How It Works</a></li>
              <li><a href="#pricing" className="text-zinc-500 hover:text-white transition-colors">Pricing</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Account</h4>
            <ul className="space-y-3">
              <li><Link href="/sign-in" className="text-zinc-500 hover:text-white transition-colors">Sign In</Link></li>
              <li><Link href="/sign-up" className="text-zinc-500 hover:text-white transition-colors">Start Free Trial</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-[#27272a] text-center text-zinc-500 text-sm">
          © {new Date().getFullYear()} TableScan. All rights reserved.
        </div>
      </div>
    </div>
  )
}

// Main Page Component
export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#050505]">
      <Navbar />
      <Hero />
      <TrustBar />
      <Statistics />
      <Features />
      <ProductShowcase />
      <HowItWorks />
      <Testimonials />
      <Pricing />
      <FinalCTA />
      <PageFooter />
    </main>
  )
}