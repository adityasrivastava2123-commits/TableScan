"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

// --- Custom SVGs & Icons ---

function UtensilsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75A3 3 0 019 12.75v-1.5a3 3 0 016 0v1.5a3 3 0 01-3 3zm0-8.25V3m0 0a.75.75 0 100-1.5.75.75 0 000 1.5zm-5.25 3h10.5" />
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
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
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

function ArrowUpRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
    </svg>
  )
}

function QrCodeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 19.875v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5zM18.75 13.5h.008v.008h-.008V13.5zM18.75 15.75h.008v.008h-.008V15.75zM18.75 18h.008v.008h-.008V18zM15.75 15.75h.008v.008h-.008V15.75zM15.75 18h.008v.008h-.008V18zM13.5 15.75h.008v.008h-.008V15.75zM13.5 18h.008v.008h-.008V18z" />
    </svg>
  )
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  )
}

// --- Scroll Reveal Helper Component ---

function ScrollReveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const [isVisible, setIsVisible] = useState(false)
  const [ref, setRef] = useState<HTMLElement | null>(null)

  useEffect(() => {
    if (!ref) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.unobserve(ref)
        }
      },
      { threshold: 0.05 }
    )
    observer.observe(ref)
    return () => {
      if (ref) observer.unobserve(ref)
    }
  }, [ref])

  return (
    <div
      ref={setRef}
      className={`transition-all duration-1000 ease-out ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      } ${className}`}
    >
      {children}
    </div>
  )
}

// --- Navigation Header ---

function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled 
        ? "backdrop-blur-xl bg-[#0b0a08]/80 border-b border-white/5 py-4" 
        : "backdrop-blur-md bg-transparent py-5"
    }`}>
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo Mark */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-r from-[#f0a040] to-[#e85a2a] shadow-lg shadow-[#f0a040]/10">
              <UtensilsIcon className="h-5.5 w-5.5 text-[#0b0a08]" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold text-[#f5efe2] leading-none tracking-tight">DineFlow Pro</span>
              <span className="text-[9px] uppercase tracking-[0.2em] text-white/40 mt-0.5 leading-none">Restaurant OS</span>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8 bg-white/[0.03] border border-white/5 px-6 py-2 rounded-full backdrop-blur-md">
            <a href="#features" className="text-xs uppercase tracking-wider text-white/70 hover:text-[#f0a040] transition-colors">
              Platform
            </a>
            <a href="#how-it-works" className="text-xs uppercase tracking-wider text-white/70 hover:text-[#f0a040] transition-colors">
              How It Works
            </a>
            <a href="#showcase" className="text-xs uppercase tracking-wider text-white/70 hover:text-[#f0a040] transition-colors">
              Showcase
            </a>
            <a href="#pricing" className="text-xs uppercase tracking-wider text-white/70 hover:text-[#f0a040] transition-colors">
              Pricing
            </a>
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-5">
            <Link href="/sign-in" className="text-xs uppercase tracking-widest font-semibold text-white/70 hover:text-[#f0a040] transition-colors">
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="group flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-[#0b0a08] hover:bg-[#f5efe2] transition-all shadow-lg hover:shadow-white/5"
            >
              Start Free
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0b0a08] transition-transform duration-300 group-hover:rotate-45">
                <ArrowUpRightIcon className="h-3 w-3 text-[#f5efe2]" />
              </span>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-white/75 hover:text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <XIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-[#0b0a08]/95 border-b border-white/5 backdrop-blur-xl animate-fade-in">
          <div className="px-6 py-6 space-y-4">
            <a href="#features" className="block text-sm uppercase tracking-wider text-white/70 hover:text-[#f0a040]" onClick={() => setMobileMenuOpen(false)}>
              Platform
            </a>
            <a href="#how-it-works" className="block text-sm uppercase tracking-wider text-white/70 hover:text-[#f0a040]" onClick={() => setMobileMenuOpen(false)}>
              How It Works
            </a>
            <a href="#showcase" className="block text-sm uppercase tracking-wider text-white/70 hover:text-[#f0a040]" onClick={() => setMobileMenuOpen(false)}>
              Showcase
            </a>
            <a href="#pricing" className="block text-sm uppercase tracking-wider text-white/70 hover:text-[#f0a040]" onClick={() => setMobileMenuOpen(false)}>
              Pricing
            </a>
            <div className="pt-4 border-t border-white/5 space-y-4">
              <Link href="/sign-in" className="block text-sm uppercase tracking-widest text-white/70 hover:text-[#f0a040]">
                Sign In
              </Link>
              <Link href="/sign-up" className="block w-full text-center rounded-full bg-gradient-to-r from-[#f0a040] to-[#e85a2a] py-3 text-sm font-bold uppercase tracking-widest text-[#0b0a08]">
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}

// --- Hero Section ---

function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-6 lg:px-8 pt-24 pb-16 overflow-hidden">
      <div className="relative z-10 max-w-[1280px] mx-auto w-full">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Content Column */}
          <div className="lg:col-span-7 text-center lg:text-left">
            
            {/* Live pulse badge */}
            <div className="inline-flex items-center gap-2 bg-white/[0.03] border border-white/10 px-4 py-1.5 rounded-full text-[10px] uppercase tracking-[0.2em] text-white/80 mb-8">
              <span className="w-2 h-2 bg-[#52d27a] rounded-full animate-pulse" />
              <span>Live &bull; 1,240 orders processed in the last hour</span>
            </div>
            
            {/* Headline H1 */}
            <h1 className="text-[clamp(2.5rem,6vw,5.25rem)] font-bold tracking-[-0.04em] leading-[0.95] text-[#f5efe2] text-pretty">
              The operating system for <span className="block mt-2 font-[300] italic bg-gradient-to-r from-[#f5efe2] via-[#f0a040] to-[#e85a2a] text-transparent bg-clip-text">modern restaurants.</span>
            </h1>
            
            <p className="mt-6 text-base sm:text-lg text-white/60 leading-[1.625] max-w-xl mx-auto lg:mx-0">
              Transform your dining room operations. Manage tables, menu distribution, live kitchen pipelines, guest billing, and analytics in one high-fidelity platform.
            </p>
            
            {/* CTA row */}
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center">
              <Link
                href="/sign-up"
                className="group w-full sm:w-auto inline-flex items-center justify-center gap-3 rounded-full bg-gradient-to-r from-[#f0a040] to-[#e85a2a] px-8 py-4 text-sm font-bold uppercase tracking-widest text-[#0b0a08] hover:opacity-95 transition-all shadow-[0_0_30px_rgba(240,160,64,0.25)] hover:shadow-[0_0_40px_rgba(240,160,64,0.35)]"
              >
                Start Free Trial
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0b0a08]/15 transition-transform duration-300 group-hover:rotate-45">
                  <ArrowUpRightIcon className="h-3.5 w-3.5 text-[#0b0a08]" />
                </span>
              </Link>
              <button className="group w-full sm:w-auto inline-flex items-center justify-center gap-3 rounded-full border border-white/15 bg-white/[0.02] px-8 py-4 text-sm font-bold uppercase tracking-widest text-[#f5efe2] hover:bg-white/5 transition-all">
                <span className="w-2.5 h-2.5 bg-[#f0a040] rounded-full animate-ping" />
                Watch 90-sec demo
              </button>
            </div>

            {/* Trust checkmarks */}
            <div className="mt-12 pt-8 border-t border-white/5 flex flex-wrap justify-center lg:justify-start gap-x-8 gap-y-3">
              {["NO SETUP FEES", "30-DAY TRIAL", "HARDWARE AGNOSTIC"].map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <CheckIcon className="w-4 h-4 text-[#f0a040]" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Content Column - Layered Dashboard Mock */}
          <div className="lg:col-span-5 relative flex justify-center mt-8 lg:mt-0">
            <div className="relative w-full max-w-[420px] lg:max-w-none">
              
              {/* Main Panel */}
              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl p-6 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.8)] relative z-10 overflow-hidden">
                
                {/* Dashboard Inner Header */}
                <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-6">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#e85a2a] animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">DineFlow OS Live</span>
                  </div>
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-white/10" />
                    <span className="w-2 h-2 rounded-full bg-white/10" />
                    <span className="w-2 h-2 rounded-full bg-white/10" />
                  </div>
                </div>

                {/* Revenue stats with Sparkline */}
                <div className="mb-6">
                  <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">REVENUE TODAY</p>
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-3xl font-bold text-[#f5efe2] font-mono">₹2,48,750</h3>
                    <span className="text-xs text-[#52d27a] font-mono bg-[#52d27a]/10 px-2 py-0.5 rounded">+14.2%</span>
                  </div>
                  {/* SVG Sparkline Chart */}
                  <div className="h-16 w-full mt-4">
                    <svg className="h-full w-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="sparkline-gradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f0a040" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#e85a2a" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M0,25 Q15,10 30,22 T60,5 T80,18 T100,8 L100,30 L0,30 Z"
                        fill="url(#sparkline-gradient)"
                      />
                      <path
                        d="M0,25 Q15,10 30,22 T60,5 T80,18 T100,8"
                        fill="none"
                        stroke="url(#sparkline-stroke)"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                      <linearGradient id="sparkline-stroke" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#f0a040" />
                        <stop offset="100%" stopColor="#e85a2a" />
                      </linearGradient>
                    </svg>
                  </div>
                </div>

                {/* Live orders list */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-[9px] uppercase tracking-widest text-white/40">
                    <span>LIVE PIPELINE</span>
                    <span>3 ORDERS</span>
                  </div>
                  
                  {/* Order Row 1 */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#52d27a]/10 border border-[#52d27a]/20">
                        <span className="text-[10px] font-bold text-[#52d27a] font-mono">T4</span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#f5efe2]">Order #1281</p>
                        <p className="text-[9px] text-white/40 uppercase tracking-wider">Garlic Naan, Butter Chicken</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-[#f5efe2] font-mono">₹1,850</p>
                      <span className="inline-block text-[8px] font-bold uppercase tracking-wider text-[#52d27a] bg-[#52d27a]/15 px-1.5 py-0.5 rounded mt-0.5">Paid</span>
                    </div>
                  </div>

                  {/* Order Row 2 */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f0a040]/10 border border-[#f0a040]/20">
                        <span className="text-[10px] font-bold text-[#f0a040] font-mono">T12</span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#f5efe2]">Order #1282</p>
                        <p className="text-[9px] text-white/40 uppercase tracking-wider">Mutton Biryani, Raita</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-[#f5efe2] font-mono">₹3,420</p>
                      <span className="inline-block text-[8px] font-bold uppercase tracking-wider text-[#f0a040] bg-[#f0a040]/15 px-1.5 py-0.5 rounded mt-0.5">Cooking</span>
                    </div>
                  </div>

                  {/* Order Row 3 */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e85a2a]/10 border border-[#e85a2a]/20">
                        <span className="text-[10px] font-bold text-[#e85a2a] font-mono">T9</span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#f5efe2]">Order #1283</p>
                        <p className="text-[9px] text-white/40 uppercase tracking-wider">Mango Lassi, Paneer Tikka</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-[#f5efe2] font-mono">₹980</p>
                      <span className="inline-block text-[8px] font-bold uppercase tracking-wider text-[#e85a2a] bg-[#e85a2a]/15 px-1.5 py-0.5 rounded mt-0.5">New</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating QR Card (3D Rotate) */}
              <div className="absolute -left-8 -bottom-10 rotate-[-6deg] z-20 hidden sm:flex flex-col items-center gap-2 w-32 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-xl p-4 shadow-2xl">
                <div className="w-20 h-20 bg-white/[0.04] border border-white/5 rounded-xl flex items-center justify-center">
                  <QrCodeIcon className="w-14 h-14 text-[#f0a040]" />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#f5efe2]">Table #8 QR</span>
              </div>

              {/* Floating Payment Notification */}
              <div className="absolute -right-6 -top-6 rotate-[3deg] z-20 hidden sm:flex items-center gap-3 rounded-full border border-white/10 bg-[#0b0a08]/80 backdrop-blur-xl px-5 py-3 shadow-2xl">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#52d27a]/15 border border-[#52d27a]/20">
                  <BellIcon className="h-4 w-4 text-[#52d27a]" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#f5efe2] leading-none">Order #1284 Paid</p>
                  <p className="text-[9px] font-mono text-white/45 mt-1">₹4,250 via UPI</p>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  )
}

// --- Partner Marquee ---

function PartnerMarquee() {
  const restaurantNames = [
    "Bukhara", "Indian Accent", "The Table", "Bomra's", "Avartana", "Karavalli", 
    "Dum Pukht", "Masque", "Farzi Cafe", "Toast & Tonic", "Olive Bar & Kitchen", "The Bombay Canteen"
  ]

  // Double the list for infinite scrolling
  const marqueeItems = [...restaurantNames, ...restaurantNames]

  return (
    <section className="border-y border-white/5 bg-white/[0.01] py-8 overflow-hidden relative z-10 pointer-events-none">
      <div className="flex w-max">
        <div className="flex gap-12 items-center animate-marquee whitespace-nowrap">
          {marqueeItems.map((name, i) => (
            <div key={i} className="flex items-center gap-12">
              <span className="text-[#f0a040] text-sm">✦</span>
              <span className="font-sans text-xs font-bold uppercase tracking-[0.25em] text-white/30">
                {name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// --- Metrics Strip ---

function MetricsStrip() {
  const stats = [
    { value: "32%", label: "Wait Time Reduction" },
    { value: "8 min", label: "Avg Kitchen Ticket" },
    { value: "₹0", label: "Monthly Setup Fees" },
    { value: "99.99%", label: "Realtime API Uptime" },
  ]

  return (
    <section className="py-24 px-6 lg:px-8 relative z-10">
      <div className="max-w-[1280px] mx-auto">
        <ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-white/5 rounded-2xl overflow-hidden border border-white/5">
            {stats.map((stat, i) => (
              <div key={i} className="bg-[#0b0a08] p-8 lg:p-10 flex flex-col justify-center">
                <p className="text-4xl lg:text-5xl font-bold tracking-tight bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent font-mono">
                  {stat.value}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 mt-3">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

// --- Features Grid (Platform) ---

function Features() {
  const features = [
    {
      title: "QR Ordering System",
      description: "Direct-to-kitchen digital ordering from tables. Let customers scan, customize, order, and pay instantly via their own mobile devices.",
      span: "md:col-span-2"
    },
    {
      title: "Kitchen Display (KDS)",
      description: "Instantly route tickets to specific sections with color coding, item priorities, and prep timers.",
      span: "md:col-span-1"
    },
    {
      title: "Table Layouts",
      description: "Design and manage your dining floor plan in real-time. Monitor server capacity, table states, and ticket times.",
      span: "md:col-span-1"
    },
    {
      title: "Live Operations Control",
      description: "Get comprehensive sales statistics, transaction records, server ratings, and peak hours details anywhere in the world.",
      span: "md:col-span-2"
    },
    {
      title: "Inventory & Waste Tracking",
      description: "ingredient-level tracking that automatically updates with every table order. Get alerts on low items and optimize orders.",
      span: "md:col-span-2"
    },
    {
      title: "Staff Management",
      description: "Manage servers, shifts, permissions, and automated tip distributions with premium clarity.",
      span: "md:col-span-1"
    }
  ]

  return (
    <section id="features" className="py-24 px-6 lg:px-8 relative z-10">
      <div className="max-w-[1280px] mx-auto">
        
        {/* Section Header */}
        <ScrollReveal className="mb-16">
          <div className="w-12 h-0.5 bg-[#f0a040] mb-4" />
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/40">Platform</span>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-[#f5efe2] mt-2 leading-none">
            Built like restaurant infrastructure.
          </h2>
          <span className="block mt-2 text-lg text-white/60 font-[300] italic">
            Engineered for fine dining, cafes, and multi-location groups.
          </span>
        </ScrollReveal>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {features.map((feature, i) => (
            <ScrollReveal key={i} className={feature.span}>
              <div className="group relative rounded-2xl border border-white/8 bg-gradient-to-br from-white/[0.04] to-transparent p-8 h-full transition-all duration-500 hover:border-[#f0a040]/40 hover:from-[#f0a040]/[0.06] hover:to-transparent">
                
                {/* Floating link arrow */}
                <span className="absolute top-8 right-8 text-white/20 transition-all duration-500 group-hover:text-[#f0a040] group-hover:rotate-45">
                  <ArrowUpRightIcon className="w-4.5 h-4.5" />
                </span>

                {/* Saffron Gradient Icon Box */}
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f0a040]/20 to-[#e85a2a]/10 flex items-center justify-center mb-6 transition-transform duration-500 group-hover:scale-105">
                  <UtensilsIcon className="w-5 h-5 text-[#f0a040]" />
                </div>

                <h3 className="text-lg font-bold text-[#f5efe2] mb-3">{feature.title}</h3>
                <p className="text-xs sm:text-sm text-white/60 leading-relaxed max-w-md">{feature.description}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>

      </div>
    </section>
  )
}

// --- Showcase Section (Kitchen KDS Mockup) ---

function ProductShowcase() {
  return (
    <section id="showcase" className="py-24 px-6 lg:px-8 relative z-10">
      <div className="max-w-[1280px] mx-auto">
        <ScrollReveal>
          <div className="rounded-3xl border border-white/8 bg-gradient-to-br from-[#1a1612] via-[#0f0d0a] to-[#0b0a08] overflow-hidden">
            <div className="grid lg:grid-cols-12">
              
              {/* Left Editorial Copy */}
              <div className="lg:col-span-5 p-8 sm:p-12 lg:p-16 flex flex-col justify-center">
                <div className="w-12 h-0.5 bg-[#f0a040] mb-4" />
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#f0a040]">Showcase</span>
                <h3 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#f5efe2] mt-3 leading-tight">
                  Kitchens receive orders instantly.
                </h3>
                <p className="text-sm text-white/60 mt-4 leading-relaxed">
                  Eliminate print delay. DineFlow KDS updates kitchen queues within milliseconds of table checkout. Route plates to cold larder, hot line, or bar automatically.
                </p>

                {/* Mini Stat Cards */}
                <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-white/5">
                  <div>
                    <p className="text-xl font-bold text-[#f5efe2] font-mono leading-none">12.4m</p>
                    <p className="text-[8px] font-bold uppercase tracking-wider text-white/40 mt-1">Avg Prep Time</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-[#f5efe2] font-mono leading-none">6</p>
                    <p className="text-[8px] font-bold uppercase tracking-wider text-white/40 mt-1">KDS Terminals</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-[#f5efe2] font-mono leading-none">100%</p>
                    <p className="text-[8px] font-bold uppercase tracking-wider text-white/40 mt-1">Sync Rate</p>
                  </div>
                </div>
              </div>

              {/* Right KDS Mockup Panel */}
              <div className="lg:col-span-7 bg-[#070605] border-t lg:border-t-0 lg:border-l border-white/5 p-8 sm:p-10 flex flex-col justify-center">
                <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-6">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#52d27a] animate-pulse" />
                    <span className="text-[9px] font-bold uppercase tracking-widest text-[#f5efe2]">KDS Monitor #2 &bull; Hot Line</span>
                  </div>
                  <span className="text-[9px] font-mono text-white/40">Active Stations: 4</span>
                </div>

                {/* KDS Active Tickets Grid */}
                <div className="grid sm:grid-cols-2 gap-4">
                  
                  {/* KDS Card 1 */}
                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-mono text-white/40">Order #1288</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#f0a040]">Table 4</span>
                      </div>
                      <ul className="space-y-1.5 text-xs text-[#f5efe2]">
                        <li className="flex justify-between font-bold">
                          <span>2x Butter Chicken</span>
                          <span className="text-white/40 font-mono">Qty: 2</span>
                        </li>
                        <li className="text-[10px] text-white/40 italic pl-2">- Extra Spicy / Garlic Naan</li>
                        <li className="flex justify-between">
                          <span>4x Tandoori Roti</span>
                          <span className="text-white/40 font-mono">Qty: 4</span>
                        </li>
                      </ul>
                    </div>
                    <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center">
                      <span className="text-[9px] uppercase tracking-wider text-white/30">Active Time</span>
                      <span className="text-[10px] font-mono font-bold text-[#52d27a]">8:12 min</span>
                    </div>
                  </div>

                  {/* KDS Card 2 (Critical Wait) */}
                  <div className="bg-white/[0.02] border border-[#f0a040]/30 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-[#f0a040]/10 to-transparent pointer-events-none" />
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-mono text-white/40">Order #1289</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#e85a2a]">Table 8</span>
                      </div>
                      <ul className="space-y-1.5 text-xs text-[#f5efe2]">
                        <li className="flex justify-between font-bold">
                          <span>1x Paneer Tikka Masala</span>
                          <span className="text-white/40 font-mono">Qty: 1</span>
                        </li>
                        <li className="flex justify-between">
                          <span>2x Laccha Paratha</span>
                          <span className="text-white/40 font-mono">Qty: 2</span>
                        </li>
                        <li className="flex justify-between">
                          <span>1x Mango Lassi</span>
                          <span className="text-white/40 font-mono">Qty: 1</span>
                        </li>
                      </ul>
                    </div>
                    <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center">
                      <span className="text-[9px] uppercase tracking-wider text-white/30">Active Time</span>
                      <span className="text-[10px] font-mono font-bold text-[#e85a2a]">12:45 min</span>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

// --- How It Works ---

function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Table QR Scan",
      description: "Customers scan the table's secure, dynamic QR code to instantly launch the visual menu."
    },
    {
      number: "02",
      title: "Configure & Order",
      description: "Guests customize meals, verify allergens, and send orders directly to KDS screens."
    },
    {
      number: "03",
      title: "Prep & Serve",
      description: "Chef cooks based on digital queue. Servers receive smart notifications when dishes are ready."
    },
    {
      number: "04",
      title: "One-Click Pay",
      description: "Pay bill instantly from table via UPI or Card. Live survey updates automatically."
    }
  ]

  return (
    <section id="how-it-works" className="py-24 px-6 lg:px-8 relative z-10">
      <div className="max-w-[1280px] mx-auto">
        
        {/* Header */}
        <ScrollReveal className="text-center mb-20">
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#f0a040]">Workflow</span>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-[#f5efe2] mt-3 leading-none">
            From scan to satisfaction.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-white/60 max-w-md mx-auto">
            A frictionless cycle designed to minimize human error and accelerate table turns.
          </p>
        </ScrollReveal>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          
          {/* Dashboard Connecting Dotted Lines */}
          <div className="hidden lg:block absolute top-[15%] left-[10%] right-[10%] h-[1px] border-t border-dashed border-white/10 -z-10" />

          {steps.map((step, i) => (
            <ScrollReveal key={i}>
              <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-6 flex flex-col h-full hover:border-white/10 transition-colors">
                <span className="text-6xl font-bold font-mono text-white/5 select-none leading-none mb-6">
                  {step.number}
                </span>
                <h3 className="text-base font-bold text-[#f0a040] mb-2">{step.title}</h3>
                <p className="text-xs sm:text-sm text-white/60 leading-relaxed">{step.description}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>

      </div>
    </section>
  )
}

// --- Testimonials ---

function Testimonials() {
  const reviews = [
    {
      stars: 5,
      quote: "DineFlow Pro revolutionized our kitchen communication. Wait times decreased by almost 10 minutes, and customers love split payments from their tables.",
      author: "Vikram Malhotra",
      business: "Copper Pot Fine Dining",
      role: "Managing Director"
    },
    {
      stars: 5,
      quote: "Managing 3 locations was a nightmare. Now I review aggregate sales, staff schedules, and menu changes in one slick dashboard on my iPad.",
      author: "Aanya Sen",
      business: "Nook Espresso Bar",
      role: "Founder & Owner"
    },
    {
      stars: 5,
      quote: "Minimal setup. We printed QR stickers, customized our pricing tiers, and went live the very next morning. Customer feedback has been stellar.",
      author: "Kabir Mehta",
      business: "Spice & Smokehouse",
      role: "General Manager"
    }
  ]

  return (
    <section className="py-24 px-6 lg:px-8 relative z-10">
      <div className="max-w-[1280px] mx-auto">
        
        {/* Header */}
        <ScrollReveal className="text-center mb-16">
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#f0a040]">Testimonials</span>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-[#f5efe2] mt-3 leading-none">
            Loved by hospitality leaders.
          </h2>
        </ScrollReveal>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reviews.map((rev, i) => (
            <ScrollReveal key={i}>
              <div className="h-full rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-md p-8 flex flex-col justify-between">
                <div>
                  {/* Star Rating */}
                  <div className="flex gap-1.5 mb-6 text-[#f0a040]">
                    {[...Array(rev.stars)].map((_, idx) => (
                      <StarIcon key={idx} className="w-4 h-4" />
                    ))}
                  </div>
                  <p className="text-sm sm:text-base text-[#f5efe2] italic font-[300] leading-relaxed mb-8">
                    &ldquo;{rev.quote}&rdquo;
                  </p>
                </div>

                {/* Author Info */}
                <div className="flex items-center gap-3 pt-6 border-t border-white/5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-[#f0a040] to-[#e85a2a]">
                    <span className="text-xs font-bold text-[#0b0a08]">{rev.author[0]}</span>
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-[#f5efe2]">{rev.author}</h4>
                    <p className="text-[9px] uppercase tracking-wider text-white/40 mt-0.5">{rev.role}, {rev.business}</p>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

      </div>
    </section>
  )
}

// --- Pricing Section ---

function Pricing() {
  const plans = [
    {
      name: "Starter",
      price: "₹1,999",
      period: "/month",
      description: "For small cafes and pop-ups looking to digitize orders.",
      features: [
        "1 Location",
        "Up to 10 Active Tables",
        "Visual Menu Designer",
        "Basic Sales Reports",
        "Standard Email Support"
      ],
      highlighted: false
    },
    {
      name: "Growth",
      price: "₹4,999",
      period: "/month",
      description: "For scaling restaurants demanding kitchen efficiency.",
      features: [
        "3 Locations Included",
        "Unlimited Tables & Menus",
        "DineFlow KDS Integration",
        "Inventory Depot Control",
        "Advanced Analytics & CSVs",
        "24/7 Priority Support"
      ],
      highlighted: true
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      description: "For large hotel chains, food courts, and multi-concept operations.",
      features: [
        "Unlimited Locations",
        "Custom API & POS Syncs",
        "SLA Guarantee (99.99%)",
        "Dedicated Account Executive",
        "Custom Brand QR Styling"
      ],
      highlighted: false
    }
  ]

  return (
    <section id="pricing" className="py-24 px-6 lg:px-8 relative z-10">
      <div className="max-w-[1280px] mx-auto">
        
        {/* Header */}
        <ScrollReveal className="text-center mb-20">
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#f0a040]">Pricing</span>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-[#f5efe2] mt-3 leading-none">
            Honest, modular plans.
          </h2>
          <p className="mt-3 text-sm text-white/60">
            No contract locks, change plans or cancel at any stage. Try any plan free for 30 days.
          </p>
        </ScrollReveal>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto items-stretch">
          {plans.map((plan, i) => (
            <ScrollReveal key={i} className="h-full">
              <div className={`h-full rounded-2xl p-8 flex flex-col justify-between transition-all ${
                plan.highlighted 
                  ? "bg-[#f0a040]/[0.04] border border-[#f0a040]/30 shadow-[0_0_40px_rgba(240,160,64,0.1)] relative" 
                  : "bg-white/[0.02] border border-white/5"
              }`}>
                
                {plan.highlighted && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-[#0b0a08] px-4 py-1 text-[9px] font-bold uppercase tracking-widest">
                    Recommended
                  </span>
                )}

                <div>
                  {/* Plan Name */}
                  <h3 className="text-lg font-bold text-[#f5efe2]">{plan.name}</h3>
                  
                  {/* Price */}
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-bold tracking-tight text-[#f5efe2] font-mono">{plan.price}</span>
                    <span className="text-xs text-white/40">{plan.period}</span>
                  </div>
                  <p className="mt-3 text-xs sm:text-sm text-white/50 leading-relaxed">{plan.description}</p>
                  
                  {/* Features List */}
                  <ul className="mt-8 space-y-4">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <CheckIcon className="w-4 h-4 text-[#f0a040] flex-shrink-0 mt-0.5" />
                        <span className="text-xs sm:text-sm text-white/70">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Trial CTA button */}
                <Link
                  href="/sign-up"
                  className={`mt-10 block w-full text-center rounded-full py-3 text-xs font-bold uppercase tracking-widest transition-all ${
                    plan.highlighted 
                      ? "bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-[#0b0a08] hover:opacity-95" 
                      : "border border-white/10 hover:bg-white/5 text-[#f5efe2]"
                  }`}
                >
                  Start Free Trial
                </Link>

              </div>
            </ScrollReveal>
          ))}
        </div>

      </div>
    </section>
  )
}

// --- Final Call To Action ---

function FinalCTA() {
  return (
    <section className="py-24 px-6 lg:px-8 relative z-10">
      <div className="max-w-[1280px] mx-auto">
        <ScrollReveal>
          <div className="relative rounded-3xl overflow-hidden border border-white/5 bg-gradient-to-r from-[#f0a040]/25 to-[#e85a2a]/10 p-8 sm:p-16 lg:p-20 text-center">
            
            {/* Subtle background graphics */}
            <div className="absolute inset-0 bg-[#0b0a08]/40 pointer-events-none -z-10" />
            
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#f5efe2] leading-none">
              Run your dining room like a masterpiece.
            </h2>
            <p className="mt-4 text-sm sm:text-base text-white/60 max-w-xl mx-auto">
              Join thousands of cafes, diners, and fine hospitality venues driving ticket sizes up and checkout delays down.
            </p>
            
            <div className="mt-8 flex justify-center">
              <Link
                href="/sign-up"
                className="group inline-flex items-center gap-3 rounded-full bg-[#f5efe2] px-8 py-4 text-xs font-bold uppercase tracking-widest text-[#0b0a08] hover:bg-white transition-all shadow-xl"
              >
                Create Free Account
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0b0a08] transition-transform duration-300 group-hover:rotate-45">
                  <ArrowUpRightIcon className="h-3 w-3 text-[#f5efe2]" />
                </span>
              </Link>
            </div>
            
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

// --- Page Footer ---

function PageFooter() {
  return (
    <footer className="bg-[#070605] border-t border-white/5 py-16 px-6 lg:px-8 relative z-10">
      <div className="max-w-[1280px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-[#f0a040] to-[#e85a2a]">
                <UtensilsIcon className="h-5 w-5 text-[#0b0a08]" />
              </div>
              <span className="text-sm font-bold text-[#f5efe2] tracking-wider">DineFlow Pro</span>
            </div>
            <p className="text-xs sm:text-sm text-white/40 max-w-sm leading-relaxed">
              Premium SaaS platform designed for premium dining environments. Delighting patrons, powering kitchens, and simplifying operations across the globe.
            </p>
          </div>

          {/* Links Column 1 */}
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#f5efe2] mb-4">Product</h4>
            <ul className="space-y-2.5 text-xs text-white/50">
              <li><a href="#features" className="hover:text-[#f0a040] transition-colors">Features</a></li>
              <li><a href="#how-it-works" className="hover:text-[#f0a040] transition-colors">How It Works</a></li>
              <li><a href="#pricing" className="hover:text-[#f0a040] transition-colors">Pricing</a></li>
            </ul>
          </div>

          {/* Links Column 2 */}
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#f5efe2] mb-4">Account</h4>
            <ul className="space-y-2.5 text-xs text-white/50">
              <li><Link href="/sign-in" className="hover:text-[#f0a040] transition-colors">Sign In</Link></li>
              <li><Link href="/sign-up" className="hover:text-[#f0a040] transition-colors">Start Free Trial</Link></li>
            </ul>
          </div>

        </div>

        {/* Lower footer row */}
        <div className="mt-16 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/35">
          <span>&copy; {new Date().getFullYear()} DineFlow Pro / TableScan. All rights reserved.</span>
          <Link
            href="/superadmin"
            className="text-[10px] text-white/20 hover:text-[#f0a040] transition-colors font-mono tracking-widest flex items-center gap-1.5"
            title="Developer Control Center"
          >
            <span>&bull;</span> DEV PORTAL
          </Link>
        </div>
      </div>
    </footer>
  )
}

// --- Main Page Wrapper ---

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#0b0a08] relative text-[#f5efe2] overflow-x-hidden">
      
      {/* ── Fixed Ambient Layer ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#0b0a08]">
        {/* Repeating 64px Grid Lines */}
        <div 
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '64px 64px'
          }}
        />
        {/* Saffron bloom top-left */}
        <div className="absolute -top-40 -left-40 h-[40rem] w-[40rem] rounded-full bg-[#e8923a]/20 blur-[140px]" />
        {/* Burnt amber bloom right */}
        <div className="absolute top-1/3 -right-40 h-[36rem] w-[36rem] rounded-full bg-[#b1421a]/15 blur-[140px]" />
        {/* Soft gold bloom bottom center */}
        <div className="absolute bottom-0 left-1/3 h-[32rem] w-[32rem] rounded-full bg-[#f0c060]/10 blur-[140px]" />
      </div>

      {/* Sections */}
      <Navbar />
      <Hero />
      <PartnerMarquee />
      <MetricsStrip />
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