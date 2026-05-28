"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  QrCode, 
  ChefHat, 
  BarChart2, 
  Zap, 
  MapPin, 
  UtensilsCrossed,
  CheckCircle,
  Menu,
  X,
  Star,
  ArrowRight,
  Smartphone,
  Bell,
  TrendingUp
} from "lucide-react";

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const features = [
    { icon: UtensilsCrossed, title: "Digital Menu Builder", desc: "Create and update your menu instantly. Add photos, prices, and categories with ease." },
    { icon: ChefHat, title: "Kitchen Display Screen", desc: "Real-time order display for your kitchen. No more paper tickets or shouting across the kitchen." },
    { icon: QrCode, title: "Instant QR Codes", desc: "Generate unique QR codes for every table. Print and place — customers scan and order." },
    { icon: Bell, title: "Live Order Tracking", desc: "Customers track their order status in real-time. Reduce 'where is my food?' questions by 90%." },
    { icon: BarChart2, title: "Revenue Reports", desc: "Daily, weekly, and monthly reports. Know your top items, peak hours, and total revenue." },
    { icon: MapPin, title: "Multiple Locations", desc: "Manage all your restaurant branches from one dashboard. Growth plan and above." },
  ];

  const steps = [
    { number: "01", icon: QrCode, title: "Place QR Codes on Tables", desc: "Generate unique QR codes for each table from your dashboard. Print and place them in seconds." },
    { number: "02", icon: Smartphone, title: "Customers Scan and Order", desc: "Customers scan the QR code with any phone camera. No app download needed. Browse menu and pay." },
    { number: "03", icon: Bell, title: "Kitchen Gets Instant Alerts", desc: "Orders appear instantly on your kitchen display screen and orders board. Start preparing immediately." },
  ];

  const pricing = [
    {
      name: "Starter",
      price: "₹999",
      popular: false,
      features: [
        "1 location",
        "5 tables",
        "50 menu items",
        "Basic analytics",
        "QR code generation",
        "Email support",
      ],
    },
    {
      name: "Growth",
      price: "₹2,499",
      popular: true,
      features: [
        "3 locations",
        "20 tables",
        "Unlimited menu items",
        "Advanced reports",
        "Staff accounts",
        "Priority support",
      ],
    },
    {
      name: "Pro",
      price: "₹4,999",
      popular: false,
      features: [
        "Unlimited locations",
        "Unlimited tables",
        "Unlimited everything",
        "Custom branding",
        "API access",
        "Dedicated support",
      ],
    },
  ];

  const testimonials = [
    { name: "Rahul Sharma", restaurant: "Pizza Palace, Delhi", text: "Increased our order accuracy by 90%. Customers love the digital menu and the kitchen display has transformed how we work.", rating: 5 },
    { name: "Priya Nair", restaurant: "Cafe Bloom, Bangalore", text: "Setup took less than 30 minutes. Our waitstaff can now focus on hospitality instead of taking orders.", rating: 5 },
    { name: "Amit Verma", restaurant: "Spice Garden, Mumbai", text: "The real-time kitchen display is a game changer. No more lost orders or miscommunication.", rating: 5 },
  ];

  const faqs = [
    { q: "How does the free trial work?", a: "You get 30 days completely free with full access to all features on your chosen plan. No credit card required to start." },
    { q: "Do customers need to download an app?", a: "No! Customers just scan the QR code with their phone camera. The menu opens instantly in their browser." },
    { q: "Can I use my own payment gateway?", a: "Yes! TableScan integrates with Razorpay so your customers can pay directly. Payments go straight to your account." },
    { q: "How many restaurants can I manage?", a: "On the Starter plan you get 1 location. Growth gives you 3 locations. Pro gives you unlimited locations." },
    { q: "Is my data secure?", a: "Yes. All data is encrypted and stored securely. We use industry-standard security practices to protect your restaurant and customer data." },
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900">

      {/* Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-white shadow-md" : "bg-transparent"}`}>
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <QrCode size={18} className="text-white" />
            </div>
            <span className="font-bold text-xl">TableScan</span>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-gray-600 hover:text-black transition-colors">Features</a>
            <a href="#how-it-works" className="text-gray-600 hover:text-black transition-colors">How it works</a>
            <a href="#pricing" className="text-gray-600 hover:text-black transition-colors">Pricing</a>
            <a href="#faq" className="text-gray-600 hover:text-black transition-colors">FAQ</a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/sign-in" className="text-gray-600 hover:text-black px-4 py-2 transition-colors">
              Login
            </Link>
            <Link href="/sign-up" className="bg-black text-white px-5 py-2 rounded-lg hover:bg-gray-800 transition-colors">
              Start Free Trial
            </Link>
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-white border-t px-4 py-4 space-y-4">
            <a href="#features" className="block text-gray-600" onClick={() => setMenuOpen(false)}>Features</a>
            <a href="#how-it-works" className="block text-gray-600" onClick={() => setMenuOpen(false)}>How it works</a>
            <a href="#pricing" className="block text-gray-600" onClick={() => setMenuOpen(false)}>Pricing</a>
            <a href="#faq" className="block text-gray-600" onClick={() => setMenuOpen(false)}>FAQ</a>
            <Link href="/sign-in" className="block text-gray-600">Login</Link>
            <Link href="/sign-up" className="block bg-black text-white px-4 py-2 rounded-lg text-center">
              Start Free Trial
            </Link>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-black text-white text-sm px-4 py-1.5 rounded-full mb-6">
            <Zap size={14} />
            <span>30-day free trial — no credit card required</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
            Let Customers Order<br />
            <span className="text-gray-400">From Their Table</span>
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
            QR-based digital menu and ordering system for restaurants.
            No app needed. Just scan and order. Kitchen gets notified instantly.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/sign-up"
              className="bg-black text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
              Start Free Trial <ArrowRight size={20} />
            </Link>
            <a href="#how-it-works"
              className="border-2 border-gray-200 text-gray-700 px-8 py-4 rounded-xl text-lg font-semibold hover:border-gray-400 transition-colors">
              See How It Works
            </a>
          </div>

          {/* Hero illustration */}
          <div className="mt-16 relative max-w-3xl mx-auto">
            <div className="bg-gray-900 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 bg-red-500 rounded-full" />
                <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <span className="text-gray-400 text-sm ml-2">TableScan Dashboard</span>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {["₹12,450", "24 Orders", "3 Active"].map((stat, i) => (
                  <div key={i} className="bg-gray-800 rounded-lg p-3 text-center">
                    <p className="text-white font-bold text-lg">{stat}</p>
                    <p className="text-gray-400 text-xs">{["Today Revenue", "Today", "Right Now"][i]}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                {["Table 3 — Paneer Tikka × 2, Dal Makhani × 1", "Table 7 — Veg Biryani × 3, Raita × 2", "Table 1 — Pizza Margherita × 1, Coke × 2"].map((order, i) => (
                  <div key={i} className="bg-gray-800 rounded-lg p-3 flex items-center justify-between">
                    <span className="text-gray-300 text-sm">{order}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${["bg-blue-900 text-blue-300", "bg-orange-900 text-orange-300", "bg-green-900 text-green-300"][i]}`}>
                      {["New", "Preparing", "Ready"][i]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Logos/Social proof */}
      <section className="py-12 border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-gray-400 text-sm mb-6">TRUSTED BY RESTAURANTS ACROSS INDIA</p>
          <div className="flex flex-wrap justify-center gap-8 text-gray-300 font-semibold text-lg">
            {["Pizza Palace", "Cafe Bloom", "Spice Garden", "Biryani House", "The Grand Kitchen"].map((name) => (
              <span key={name}>{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-gray-500 text-lg">Up and running in under 30 minutes</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.number} className="text-center">
                  <div className="relative inline-block mb-6">
                    <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto">
                      <Icon size={28} className="text-white" />
                    </div>
                    <span className="absolute -top-2 -right-2 w-6 h-6 bg-gray-100 rounded-full text-xs font-bold flex items-center justify-center">
                      {step.number}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                  <p className="text-gray-500">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Everything You Need</h2>
            <p className="text-gray-500 text-lg">Built specifically for Indian restaurants</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title}
                  className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center mb-4">
                    <Icon size={22} className="text-white" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                  <p className="text-gray-500 text-sm">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Simple Pricing</h2>
            <p className="text-gray-500 text-lg">30-day free trial on all plans. No credit card required.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {pricing.map((plan) => (
              <div key={plan.name}
                className={`rounded-2xl p-8 relative ${plan.popular ? "bg-black text-white ring-2 ring-black" : "bg-white border border-gray-200"}`}>
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-black text-xs font-bold px-4 py-1 rounded-full border border-gray-200">
                    Most Popular
                  </span>
                )}
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className={`text-sm ${plan.popular ? "text-gray-400" : "text-gray-500"}`}>/month</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <CheckCircle size={16} className={plan.popular ? "text-green-400" : "text-green-500"} />
                      <span className={`text-sm ${plan.popular ? "text-gray-300" : "text-gray-600"}`}>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/sign-up"
                  className={`block text-center py-3 rounded-xl font-semibold transition-colors ${plan.popular ? "bg-white text-black hover:bg-gray-100" : "bg-black text-white hover:bg-gray-800"}`}>
                  Start Free Trial
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Loved by Restaurants</h2>
            <p className="text-gray-500 text-lg">Join hundreds of restaurants already using TableScan</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex gap-1 mb-4">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} size={16} className="text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-600 mb-4">"{t.text}"</p>
                <div>
                  <p className="font-semibold">{t.name}</p>
                  <p className="text-gray-400 text-sm">{t.restaurant}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  className="w-full text-left px-6 py-4 font-semibold flex items-center justify-between hover:bg-gray-50 transition-colors"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  {faq.q}
                  <span className="text-gray-400">{openFaq === i ? "−" : "+"}</span>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-4 text-gray-500">{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-20 px-4 bg-black text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to modernize your restaurant?</h2>
          <p className="text-gray-400 text-lg mb-8">
            Join hundreds of restaurants. Start your free 30-day trial today.
          </p>
          <Link href="/sign-up"
            className="inline-flex items-center gap-2 bg-white text-black px-8 py-4 rounded-xl text-lg font-semibold hover:bg-gray-100 transition-colors">
            Start Free Trial <ArrowRight size={20} />
          </Link>
          <p className="text-gray-500 text-sm mt-4">No credit card required • Setup in 30 minutes</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-gray-100">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                <QrCode size={18} className="text-white" />
              </div>
              <span className="font-bold text-xl">TableScan</span>
              <span className="text-gray-400 text-sm ml-2">— Digital ordering for restaurants</span>
            </div>
            <div className="flex items-center gap-6 text-gray-500 text-sm">
              <a href="#features" className="hover:text-black transition-colors">Features</a>
              <a href="#pricing" className="hover:text-black transition-colors">Pricing</a>
              <Link href="/sign-in" className="hover:text-black transition-colors">Login</Link>
              <Link href="/sign-up" className="hover:text-black transition-colors">Sign Up</Link>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between text-gray-400 text-sm">
            <p>© 2026 TableScan. All rights reserved.</p>
            <p>Made with ❤️ in India 🇮🇳</p>
          </div>
        </div>
      </footer>

    </div>
  );
}