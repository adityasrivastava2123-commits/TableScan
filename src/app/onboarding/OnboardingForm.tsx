"use client";

import { useState, useMemo, ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import axios, { AxiosError } from "axios";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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

export function OnboardingForm() {
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [restaurant, setRestaurant] = useState<RestaurantStepState>({
    name: "",
    description: "",
    phone: "",
    logo: null,
  });
  const [location, setLocation] = useState<LocationStepState>({
    name: "",
    address: "",
    city: "",
    state: "",
  });
  const [plan, setPlan] = useState<Plan | null>("STARTER");
  const [submitting, setSubmitting] = useState(false);

  const progress = useMemo(() => (step / 3) * 100, [step]);

  function handleRestaurantChange(
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
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
    reader.onloadend = () => {
      setRestaurant((prev) => ({ ...prev, logo: reader.result as string }));
    };
    reader.readAsDataURL(file);
  }

  function nextStep() {
    if (step === 1) {
      if (!restaurant.name.trim()) {
        toast.error("Restaurant name is required.");
        return;
      }
      if (restaurant.name.trim().length < 2) {
        toast.error("Restaurant name must be at least 2 characters.");
        return;
      }
      if (restaurant.phone && !/^[+]?[0-9]{10,15}$/.test(restaurant.phone.replace(/\s/g, ""))) {
        toast.error("Please enter a valid phone number.");
        return;
      }
    }

    if (step === 2 && !location.name.trim()) {
      toast.error("Location name is required.");
      return;
    }

    const nextStepValue = step + 1;
    setStep((nextStepValue > 3 ? 3 : nextStepValue) as 1 | 2 | 3);
  }

  function prevStep() {
    const prevStepValue = step - 1;
    setStep((prevStepValue < 1 ? 1 : prevStepValue) as 1 | 2 | 3);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!plan) {
      toast.error("Please choose a plan.");
      return;
    }

    if (!restaurant.name.trim()) {
      toast.error("Restaurant name is required.");
      setStep(1);
      return;
    }

    if (restaurant.name.trim().length < 2) {
      toast.error("Restaurant name must be at least 2 characters.");
      setStep(1);
      return;
    }

    if (restaurant.phone && !/^[+]?[0-9]{10,15}$/.test(restaurant.phone.replace(/\s/g, ""))) {
      toast.error("Please enter a valid phone number.");
      setStep(1);
      return;
    }

    if (!location.name.trim()) {
      toast.error("Location name is required.");
      setStep(2);
      return;
    }

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
      console.error(error);
      const message = (() => {
        if (!(error instanceof AxiosError)) {
          return "Something went wrong. Please try again.";
        }

        const data = error.response?.data;
        if (typeof data === "string" && data.trim()) {
          return data;
        }

        return (
          data?.error ||
          data?.details ||
          "Something went wrong. Please try again."
        );
      })();

      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-8">
      <Card className="w-full max-w-2xl border border-border/60 bg-background shadow-lg">
        <div className="border-b px-6 py-4">
          <h1 className="text-xl font-semibold">Set up your restaurant</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete these quick steps to start accepting QR-based orders.
          </p>
        </div>

        <div className="space-y-6 px-6 py-6">
          <div>
            <Progress value={progress} className="h-2" />
            <div className="mt-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Step {step} of 3</span>
              <span>
                {step === 1 && "Restaurant info"}
                {step === 2 && "Location details"}
                {step === 3 && "Choose plan"}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Restaurant name *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={restaurant.name}
                    onChange={handleRestaurantChange}
                    placeholder="Pizza Palace"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    name="description"
                    value={restaurant.description}
                    onChange={handleRestaurantChange}
                    placeholder="Casual dining, Italian cuisine"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone number</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={restaurant.phone}
                    onChange={handleRestaurantChange}
                    placeholder="+91 98765 43210"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logo">Logo</Label>
                  <Input
                    id="logo"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                  />
                  {restaurant.logo && (
                    <p className="text-xs text-muted-foreground">
                      Logo selected
                    </p>
                  )}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="locationName">Location name *</Label>
                  <Input
                    id="locationName"
                    name="name"
                    value={location.name}
                    onChange={handleLocationChange}
                    placeholder="Main Branch"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    name="address"
                    value={location.address}
                    onChange={handleLocationChange}
                    placeholder="123 MG Road"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      name="city"
                      value={location.city}
                      onChange={handleLocationChange}
                      placeholder="Bengaluru"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      name="state"
                      value={location.state}
                      onChange={handleLocationChange}
                      placeholder="Karnataka"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <PlanCard
                    name="Starter"
                    price="₹999/mo"
                    description="1 location, 5 tables, 50 menu items"
                    selected={plan === "STARTER"}
                    onClick={() => setPlan("STARTER")}
                  />
                  <PlanCard
                    name="Growth"
                    price="₹2499/mo"
                    description="3 locations, 20 tables, unlimited items, reports"
                    badge="Popular"
                    selected={plan === "GROWTH"}
                    onClick={() => setPlan("GROWTH")}
                  />
                  <PlanCard
                    name="Pro"
                    price="₹4999/mo"
                    description="Unlimited everything, staff accounts, custom branding"
                    selected={plan === "PRO"}
                    onClick={() => setPlan("PRO")}
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  All plans start with a 30-day free trial. You can change or
                  cancel anytime.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={step === 1 || submitting}
              >
                Back
              </Button>

              {step < 3 ? (
                <Button type="button" onClick={nextStep} disabled={submitting}>
                  Next
                </Button>
              ) : (
                <Button type="submit" disabled={submitting}>
                  {submitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Start Free Trial
                </Button>
              )}
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}

type PlanCardProps = {
  name: string;
  price: string;
  description: string;
  badge?: string;
  selected: boolean;
  onClick: () => void;
};

function PlanCard({
  name,
  price,
  description,
  badge,
  selected,
  onClick,
}: PlanCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-full flex-col rounded-lg border p-4 text-left transition",
        "hover:border-primary/70 hover:shadow-md",
        selected && "border-primary ring-2 ring-primary/20",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">{name}</h2>
          <p className="mt-1 text-lg font-semibold">{price}</p>
        </div>
        {badge ? (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {badge}
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{description}</p>
    </button>
  );
}

