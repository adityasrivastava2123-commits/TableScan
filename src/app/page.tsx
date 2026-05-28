"use client"

import { useState } from "react"
import Link from "next/link"

// Icons as simple SVG components
function QrCodeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
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

function DocumentTextIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  )
}

function ComputerDesktopIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
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

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function ChartBarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  )
}

function BuildingOfficeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
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

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
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
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-neutral-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-500">
              <QrCodeIcon className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-neutral-900">TableScan</span>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-neutral-600 hover:text-black transition-colors">
              Features
            </a>
            <a href="#pricing" className="text-sm font-medium text-neutral-600 hover:text-black transition-colors">
              Pricing
            </a>
            <a href="#how-it-works" className="text-sm font-medium text-neutral-600 hover:text-black transition-colors">
              How it works
            </a>
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4">
            <Link href="/sign-in" className="text-sm font-medium text-neutral-600 hover:text-black transition-colors">
              Login
            </Link>
            <Link
              href="/sign-up"
              className="rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-sm font-medium text-white hover:from-orange-600 hover:to-amber-600 transition-all shadow-md shadow-orange-500/25"
            >
              Start Free Trial
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-neutral-600 hover:text-black"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <XIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-neutral-200">
          <div className="px-4 py-4 space-y-4">
            <a
              href="#features"
              className="block text-sm font-medium text-neutral-600 hover:text-black"
              onClick={() => setMobileMenuOpen(false)}
            >
              Features
            </a>
            <a
              href="#pricing"
              className="block text-sm font-medium text-neutral-600 hover:text-black"
              onClick={() => setMobileMenuOpen(false)}
            >
              Pricing
            </a>
            <a
              href="#how-it-works"
              className="block text-sm font-medium text-neutral-600 hover:text-black"
              onClick={() => setMobileMenuOpen(false)}
            >
              How it works
            </a>
            <div className="pt-4 border-t border-neutral-200 space-y-3">
              <Link href="/sign-in" className="block text-sm font-medium text-neutral-600 hover:text-black">
                Login
              </Link>
              <Link
                href="/sign-up"
                className="block w-full text-center rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-sm font-medium text-white hover:from-orange-600 hover:to-amber-600 shadow-md shadow-orange-500/25"
              >
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
    <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Subtle Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-amber-50/50 to-white -z-10" />
      
      <div className="mx-auto max-w-7xl">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
              <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
              New: Kitchen Display System
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-neutral-900 text-balance">
              Let Customers Order From Their Table
            </h1>
            <p className="mt-6 text-lg text-neutral-600 leading-relaxed text-pretty max-w-xl mx-auto lg:mx-0">
              QR-based digital menu and ordering system for restaurants. No app needed. Just scan and order.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link
                href="/sign-up"
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-8 py-3.5 text-base font-medium text-white hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg shadow-orange-500/30"
              >
                Start Free Trial
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center rounded-full border-2 border-neutral-300 bg-white px-8 py-3.5 text-base font-medium text-neutral-900 hover:border-orange-300 hover:bg-orange-50 transition-colors"
              >
                See How It Works
              </a>
            </div>
            <p className="mt-4 text-sm text-neutral-500">30-day free trial, no credit card required</p>
          </div>

          {/* Right Content - Phone Mockup */}
          <div className="relative flex justify-center lg:justify-end">
            <div className="relative">
              {/* Phone Frame */}
              <div className="relative w-64 h-[520px] bg-black rounded-[3rem] p-3 shadow-2xl">
                <div className="w-full h-full bg-white rounded-[2.5rem] overflow-hidden relative">
                  {/* Screen Content */}
                  <div className="p-6 h-full flex flex-col">
                    {/* Status Bar */}
                    <div className="flex justify-between items-center text-xs text-neutral-400 mb-4">
                      <span>9:41</span>
                      <div className="flex gap-1">
                        <div className="w-4 h-2 bg-neutral-300 rounded-sm" />
                        <div className="w-4 h-2 bg-neutral-300 rounded-sm" />
                        <div className="w-6 h-2 bg-neutral-300 rounded-sm" />
                      </div>
                    </div>
                    
                    {/* QR Scanner UI */}
                    <div className="flex-1 flex flex-col items-center justify-center">
                      <div className="w-40 h-40 border-4 border-black rounded-2xl relative mb-6">
                        {/* Corner Markers */}
                        <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-black rounded-tl-lg" />
                        <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-black rounded-tr-lg" />
                        <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-black rounded-bl-lg" />
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-black rounded-br-lg" />
                        
                      {/* QR Code Pattern */}
                      <div className="absolute inset-4 grid grid-cols-5 gap-1">
                        {[...Array(25)].map((_, i) => (
                          <div
                            key={i}
                            className={`aspect-square rounded-sm ${
                              [0, 1, 2, 4, 5, 6, 10, 11, 12, 14, 18, 19, 20, 22, 23, 24].includes(i)
                                ? "bg-orange-500"
                                : "bg-orange-100"
                            }`}
                          />
                        ))}
                      </div>
                      </div>
                      
                    <p className="text-sm font-medium text-neutral-900">Scan to view menu</p>
                    <p className="text-xs text-orange-500 mt-1">Table #5</p>
                    </div>
                    
                    {/* Bottom Navigation */}
                    <div className="flex justify-around py-3 border-t border-neutral-200">
                      <div className="w-8 h-1 bg-black rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating Elements */}
              <div className="absolute -left-8 top-20 bg-white rounded-xl shadow-lg p-4 border border-orange-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                    <CheckIcon className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">New Order</p>
                    <p className="text-sm font-medium text-neutral-900">Table #5</p>
                  </div>
                </div>
              </div>
              
              <div className="absolute -right-4 bottom-32 bg-white rounded-xl shadow-lg p-4 border border-orange-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <BellIcon className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Kitchen Alert</p>
                    <p className="text-sm font-medium text-neutral-900">2 items ready</p>
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

// How It Works Section
function HowItWorks() {
  const steps = [
    {
      number: "1",
      title: "Place QR codes on tables",
      description: "Generate unique QR codes for each table and place them where customers can easily scan.",
      icon: QrCodeIcon,
    },
    {
      number: "2",
      title: "Customers scan and order",
      description: "Diners scan the QR code with their phone camera and browse your digital menu instantly.",
      icon: DocumentTextIcon,
    },
    {
      number: "3",
      title: "Kitchen gets instant notifications",
      description: "Orders appear on your kitchen display in real-time. No more miscommunication.",
      icon: BellIcon,
    },
  ]

  return (
    <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-orange-50/50">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 text-balance">How It Works</h2>
          <p className="mt-4 text-lg text-neutral-600">Get started in three simple steps</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div
              key={index}
              className="relative bg-white rounded-2xl p-8 border border-neutral-200 hover:border-orange-200 hover:shadow-lg hover:shadow-orange-500/5 transition-all"
            >
              <div className="absolute -top-4 left-8 bg-gradient-to-r from-orange-500 to-amber-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-lg shadow-orange-500/30">
                {step.number}
              </div>
              <div className="mt-4">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
                  <step.icon className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="text-xl font-semibold text-neutral-900 mb-2">{step.title}</h3>
                <p className="text-neutral-600 leading-relaxed">{step.description}</p>
              </div>
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
    {
      icon: DocumentTextIcon,
      title: "Digital Menu Builder",
      description: "Create beautiful, easy-to-update digital menus with photos and descriptions.",
    },
    {
      icon: ComputerDesktopIcon,
      title: "Real-time Kitchen Display",
      description: "Orders appear instantly on your kitchen screen. No more lost tickets.",
    },
    {
      icon: QrCodeIcon,
      title: "Instant QR Code Generation",
      description: "Generate unique QR codes for each table in seconds.",
    },
    {
      icon: ClockIcon,
      title: "Live Order Tracking",
      description: "Customers can track their order status in real-time.",
    },
    {
      icon: ChartBarIcon,
      title: "Revenue Reports",
      description: "Detailed analytics and insights to grow your business.",
    },
    {
      icon: BuildingOfficeIcon,
      title: "Multiple Locations",
      description: "Manage all your restaurant locations from one dashboard.",
    },
  ]

  return (
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 text-balance">
            Everything You Need to Modernize Your Restaurant
          </h2>
          <p className="mt-4 text-lg text-neutral-600 max-w-2xl mx-auto">
            Powerful features designed to streamline operations and delight customers.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-6 rounded-2xl border border-neutral-200 hover:border-orange-200 hover:shadow-lg hover:shadow-orange-500/5 transition-all bg-white"
            >
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-gradient-to-br group-hover:from-orange-500 group-hover:to-amber-500 transition-all">
                <feature.icon className="w-6 h-6 text-orange-600 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">{feature.title}</h3>
              <p className="text-neutral-600 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// Pricing Section
function Pricing() {
  const plans = [
    {
      name: "Starter",
      price: "₹999",
      period: "/mo",
      description: "Perfect for small cafes and food stalls",
      features: ["1 location", "5 tables", "50 menu items", "Basic analytics", "Email support"],
      highlighted: false,
    },
    {
      name: "Growth",
      price: "₹2,499",
      period: "/mo",
      description: "Best for growing restaurants",
      features: [
        "3 locations",
        "20 tables",
        "Unlimited menu items",
        "Advanced reports",
        "Priority support",
        "Staff accounts",
      ],
      highlighted: true,
    },
    {
      name: "Pro",
      price: "₹4,999",
      period: "/mo",
      description: "For restaurant chains and enterprises",
      features: [
        "Unlimited locations",
        "Unlimited tables",
        "Unlimited menu items",
        "Custom branding",
        "Dedicated support",
        "API access",
      ],
      highlighted: false,
    },
  ]

  return (
    <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-orange-50/50 to-white">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 text-balance">Simple, Transparent Pricing</h2>
          <p className="mt-4 text-lg text-neutral-600">Choose the plan that fits your restaurant</p>
          <p className="mt-2 text-sm text-neutral-500">30-day free trial, no credit card required</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative rounded-2xl p-8 ${
                plan.highlighted
                  ? "bg-gradient-to-br from-orange-500 to-amber-500 text-white ring-4 ring-orange-500/20 shadow-xl shadow-orange-500/20"
                  : "bg-white border border-neutral-200 hover:border-orange-200 hover:shadow-lg transition-all"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-white text-orange-600 px-4 py-1 rounded-full text-sm font-medium shadow-md">
                  Most Popular
                </div>
              )}
              <div className="text-center">
                <h3 className={`text-xl font-semibold ${plan.highlighted ? "text-white" : "text-neutral-900"}`}>
                  {plan.name}
                </h3>
                <div className="mt-4 flex items-baseline justify-center gap-1">
                  <span className={`text-4xl font-bold ${plan.highlighted ? "text-white" : "text-neutral-900"}`}>
                    {plan.price}
                  </span>
                  <span className={plan.highlighted ? "text-orange-100" : "text-neutral-500"}>{plan.period}</span>
                </div>
                <p className={`mt-2 text-sm ${plan.highlighted ? "text-orange-100" : "text-neutral-500"}`}>
                  {plan.description}
                </p>
              </div>

              <ul className="mt-8 space-y-4">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center gap-3">
                    <CheckIcon
                      className={`w-5 h-5 flex-shrink-0 ${plan.highlighted ? "text-white" : "text-emerald-500"}`}
                    />
                    <span className={plan.highlighted ? "text-orange-50" : "text-neutral-600"}>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/sign-up"
                className={`mt-8 block w-full text-center rounded-full py-3 font-medium transition-all ${
                  plan.highlighted
                    ? "bg-white text-orange-600 hover:bg-orange-50 shadow-md"
                    : "bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 shadow-md shadow-orange-500/25"
                }`}
              >
                Start Free Trial
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// Testimonials Section
function Testimonials() {
  const testimonials = [
    {
      quote: "Increased our order accuracy by 90%",
      author: "Rahul",
      business: "Pizza Palace",
    },
    {
      quote: "Customers love scanning the QR",
      author: "Priya",
      business: "Cafe Bloom",
    },
    {
      quote: "Setup took less than 30 minutes",
      author: "Amit",
      business: "Spice Garden",
    },
  ]

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 text-balance">Trusted by Restaurants Across India</h2>
          <p className="mt-4 text-lg text-neutral-600">See what our customers have to say</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-white rounded-2xl p-8 border border-neutral-200 hover:border-orange-200 hover:shadow-lg hover:shadow-orange-500/5 transition-all">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <StarIcon key={i} className="w-5 h-5 text-amber-400" />
                ))}
              </div>
              <blockquote className="text-xl font-medium text-neutral-900 mb-6">&ldquo;{testimonial.quote}&rdquo;</blockquote>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-amber-400 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-white">{testimonial.author[0]}</span>
                </div>
                <div>
                  <p className="font-medium text-neutral-900">{testimonial.author}</p>
                  <p className="text-sm text-neutral-500">{testimonial.business}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// FAQ Section
function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const faqs = [
    {
      question: "How does the free trial work?",
      answer:
        "Start with a 30-day free trial on any plan. No credit card required. You get full access to all features during the trial period. Cancel anytime if it's not the right fit.",
    },
    {
      question: "Do customers need to download an app?",
      answer:
        "No! That's the beauty of TableScan. Customers simply scan the QR code with their phone camera and your menu opens in their browser. No downloads, no friction.",
    },
    {
      question: "Can I use my own payment gateway?",
      answer:
        "Yes, TableScan integrates with popular payment gateways in India including Razorpay, Paytm, and PhonePe. You can also choose to accept payments at the counter.",
    },
    {
      question: "How many restaurants can I manage?",
      answer:
        "It depends on your plan. Starter supports 1 location, Growth supports 3 locations, and Pro gives you unlimited locations. All from a single dashboard.",
    },
    {
      question: "Is my data secure?",
      answer:
        "Absolutely. We use bank-level encryption for all data. Your customer data and business information are stored securely on AWS servers with regular backups.",
    },
  ]

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-orange-50/50">
      <div className="mx-auto max-w-3xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 text-balance">Frequently Asked Questions</h2>
          <p className="mt-4 text-lg text-neutral-600">Everything you need to know about TableScan</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="bg-white rounded-xl border border-neutral-200 overflow-hidden hover:border-orange-200 transition-colors">
              <button
                className="w-full px-6 py-5 flex items-center justify-between text-left"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                aria-expanded={openIndex === index}
              >
                <span className="font-medium text-neutral-900">{faq.question}</span>
                <ChevronDownIcon
                  className={`w-5 h-5 text-orange-500 transition-transform ${
                    openIndex === index ? "rotate-180" : ""
                  }`}
                />
              </button>
              {openIndex === index && (
                <div className="px-6 pb-5">
                  <p className="text-neutral-600 leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// Footer
function Footer() {
  return (
    <footer className="bg-neutral-900 text-white py-16 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-500">
                <QrCodeIcon className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-semibold">TableScan</span>
            </div>
            <p className="text-neutral-400 max-w-sm leading-relaxed">
              QR-based digital menu and ordering system for modern restaurants. Delight customers, streamline
              operations.
            </p>
            <p className="mt-6 text-sm text-neutral-500">Made in India</p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-3">
              <li>
                <a href="#features" className="text-neutral-400 hover:text-white transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="#pricing" className="text-neutral-400 hover:text-white transition-colors">
                  Pricing
                </a>
              </li>
              <li>
                <Link href="/dashboard" className="text-neutral-400 hover:text-white transition-colors">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Get Started</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/sign-up" className="text-neutral-400 hover:text-white transition-colors">
                  Sign Up
                </Link>
              </li>
              <li>
                <Link href="/sign-in" className="text-neutral-400 hover:text-white transition-colors">
                  Login
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-neutral-800 text-center text-neutral-500 text-sm">
          © {new Date().getFullYear()} TableScan. All rights reserved.
        </div>
      </div>
    </footer>
  )
}

// Main Page Component
export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <HowItWorks />
      <Features />
      <Pricing />
      <Testimonials />
      <FAQ />
      <Footer />
    </main>
  )
}