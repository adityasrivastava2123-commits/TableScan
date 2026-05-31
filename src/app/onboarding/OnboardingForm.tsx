"use client";

import { useState, useMemo, ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import axios, { AxiosError } from "axios";
import toast from "react-hot-toast";
import { Loader2, QrCode, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Plan = "STARTER" | "GROWTH" | "PRO";

type RestaurantStepState = {
  name: string;
  description: string;
  phone: string;
  logo: string | null;
};

type LocationStepState = {
  name: string;
  address: string;
  city: string;
  state: string;
};

const STEPS = ["Restaurant", "Location", "Plan"];

export function OnboardingForm() {
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [restaurant, setRestaurant] = useState<RestaurantStepState>({
    name: "", description: "", phone: "", logo: null,
  });
  const [location, setLocation] = useState<LocationStepState>({
    name: "", address: "", city: "", state: "",
  });
  const [plan, setPlan] = useState<Plan>("STARTER");
  const [submitting, setSubmitting] = useState(false);

  function handleRestaurantChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setRestaurant((prev) => ({ ...prev, [name]: value }));
  }

  function handleLocationChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setLocation((prev) => ({ ...prev, [name]: value }));
  }

  function handleLogoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setRestaurant((prev) => ({ ...prev, logo: reader.result as string }));
    reader.readAsDataURL(file);
  }

  function nextStep() {
    if (step === 1) {
      if (!restaurant.name.trim()) { toast.error("Restaurant name is required"); return; }
      if (restaurant.name.trim().length < 2) { toast.error("Name must be at least 2 characters"); return; }
      if (restaurant.phone && !/^[+]?[0-9]{10,15}$/.test(restaurant.phone.replace(/\s/g, ""))) {
        toast.error("Enter a valid phone number"); return;
      }
    }
    if (step === 2 && !location.name.trim()) { toast.error("Location name is required"); return; }
    setStep((s) => Math.min(s + 1, 3) as 1 | 2 | 3);
  }

  function prevStep() {
    setStep((s) => Math.max(s - 1, 1) as 1 | 2 | 3);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!restaurant.name.trim()) { toast.error("Restaurant name is required"); setStep(1); return; }
    if (!location.name.trim()) { toast.error("Location name is required"); setStep(2); return; }

    try {
      setSubmitting(true);
      await axios.post("/api/onboarding", {
        restaurantName: restaurant.name,
        description: restaurant.description || null,
        phone: restaurant.phone || null,
        logo: restaurant.logo,
        locationName: location.name,
        address: location.address || null,
        city: location.city || null,
        state: location.state || null,
        plan,
      });
      toast.success("Welcome to TableScan!");
      router.push("/dashboard");
    } catch (error) {
      const message = (() => {
        if (!(error instanceof AxiosError)) return "Something went wrong. Please try again.";
        const data = error.response?.data;
        if (typeof data === "string" && data.trim()) return data;
        return data?.error || data?.details || "Something went wrong. Please try again.";
      })();
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="w-9 h-9 rounded-xl bg-[#f97316] flex items-center justify-center">
            <QrCode className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-[#f0ece4]">TableScan</span>
        </div>

        <div className="bg-[#111111] border border-[rgba(255,255,255,0.07)] rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="px-6 pt-6 pb-5 border-b border-[rgba(255,255,255,0.07)]">
            <h1 className="text-[18px] font-bold text-[#f0ece4]">Set up your restaurant</h1>
            <p className="text-[12px] text-[#9a9488] mt-1">Complete these steps to start accepting QR-based orders.</p>

            {/* Step indicators */}
            <div className="flex items-center gap-2 mt-4">
              {STEPS.map((label, i) => {
                const n = i + 1;
                const done = step > n;
                const active = step === n;
                return (
                  <div key={label} className="flex items-center gap-2">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all",
                      done ? "bg-[#f97316] text-white" :
                      active ? "bg-[#f97316] text-white" :
                      "bg-[#222222] text-[#5a5650]"
                    )}>
                      {done ? <Check className="w-3 h-3" /> : n}
                    </div>
                    <span className={cn(
                      "text-[12px] font-medium",
                      active ? "text-[#f0ece4]" : done ? "text-[#9a9488]" : "text-[#5a5650]"
                    )}>{label}</span>
                    {i < STEPS.length - 1 && (
                      <div className={cn("flex-1 h-px w-8 mx-1", done ? "bg-[#f97316]" : "bg-[#252525]")} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
            {step === 1 && (
              <>
                <Field label="Restaurant name *">
                  <input
                    name="name"
                    value={restaurant.name}
                    onChange={handleRestaurantChange}
                    placeholder="e.g. Spice Garden"
                    autoFocus
                  />
                </Field>
                <Field label="Description">
                  <input
                    name="description"
                    value={restaurant.description}
                    onChange={handleRestaurantChange}
                    placeholder="Casual dining, North Indian cuisine"
                  />
                </Field>
                <Field label="Phone number">
                  <input
                    name="phone"
                    value={restaurant.phone}
                    onChange={handleRestaurantChange}
                    placeholder="+91 98765 43210"
                    type="tel"
                  />
                </Field>
                <Field label="Logo">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-medium file:bg-[#f97316] file:text-white hover:file:bg-[#ea6c0a] file:cursor-pointer"
                  />
                  {restaurant.logo && (
                    <p className="text-[11px] text-[#4ade80] mt-1">✓ Logo selected</p>
                  )}
                </Field>
              </>
            )}

            {step === 2 && (
              <>
                <Field label="Location name *">
                  <input
                    name="name"
                    value={location.name}
                    onChange={handleLocationChange}
                    placeholder="e.g. Main Branch"
                    autoFocus
                  />
                </Field>
                <Field label="Address">
                  <input
                    name="address"
                    value={location.address}
                    onChange={handleLocationChange}
                    placeholder="123 MG Road"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="City">
                    <input
                      name="city"
                      value={location.city}
                      onChange={handleLocationChange}
                      placeholder="Bengaluru"
                    />
                  </Field>
                  <Field label="State">
                    <input
                      name="state"
                      value={location.state}
                      onChange={handleLocationChange}
                      placeholder="Karnataka"
                    />
                  </Field>
                </div>
              </>
            )}

            {step === 3 && (
              <div className="space-y-3">
                {([
                  { id: "STARTER" as Plan, name: "Starter", price: "₹999/mo", desc: "1 location · 5 tables · 50 menu items" },
                  { id: "GROWTH" as Plan, name: "Growth", price: "₹2,499/mo", desc: "3 locations · 20 tables · unlimited items", badge: "Popular" },
                  { id: "PRO" as Plan, name: "Pro", price: "₹4,999/mo", desc: "Unlimited everything · custom branding · API access" },
                ] as const).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlan(p.id)}
                    className={cn(
                      "w-full flex items-center justify-between p-4 rounded-xl border text-left transition-all",
                      plan === p.id
                        ? "border-[#f97316] bg-[rgba(249,115,22,0.08)]"
                        : "border-[#252525] bg-[#1a1a1a] hover:border-[#333]"
                    )}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-semibold text-[#f0ece4]">{p.name}</span>
                        {"badge" in p && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[rgba(249,115,22,0.15)] text-[#f97316]">
                            {p.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#9a9488] mt-0.5">{p.desc}</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className={cn("text-[15px] font-bold", plan === p.id ? "text-[#f97316]" : "text-[#f0ece4]")}>{p.price}</p>
                    </div>
                  </button>
                ))}
                <p className="text-[11px] text-[#5a5650] text-center pt-1">
                  All plans include a 30-day free trial · cancel anytime
                </p>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={prevStep}
                disabled={step === 1 || submitting}
                className="px-4 py-2 rounded-lg border border-[#252525] text-[#9a9488] text-[13px] font-medium hover:bg-[#1a1a1a] hover:text-[#f0ece4] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Back
              </button>

              {step < 3 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="px-5 py-2 rounded-lg bg-[#f97316] text-white text-[13px] font-semibold hover:bg-[#ea6c0a] transition-colors"
                >
                  Continue →
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-[#f97316] text-white text-[13px] font-semibold hover:bg-[#ea6c0a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {submitting ? "Setting up..." : "Start Free Trial"}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[12px] font-medium text-[#9a9488]">{label}</label>
      <div className="[&_input]:w-full [&_input]:bg-[#1a1a1a] [&_input]:border [&_input]:border-[#252525] [&_input]:rounded-xl [&_input]:px-3.5 [&_input]:py-2.5 [&_input]:text-[13px] [&_input]:text-[#f0ece4] [&_input]:placeholder-[#5a5650] [&_input]:outline-none [&_input:focus]:border-[#f97316] [&_input]:transition-colors">
        {children}
      </div>
    </div>
  );
}
