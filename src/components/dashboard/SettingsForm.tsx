"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash2, Settings, Building2, Clock, Palette, AlertTriangle, Upload, X } from "lucide-react";
import axios from "axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { motion } from "framer-motion";
import type { Restaurant } from "@prisma/client";

interface OperatingHours {
  open: string;
  close: string;
  isOpen: boolean;
}

interface SettingsFormData {
  name: string;
  description: string;
  phone: string;
  email: string;
  notificationEmail: string;
  logo: string;
  taxPercent: number;
  theme: "default" | "warm" | "fresh" | "bold";
  operatingHours: Record<string, OperatingHours>;
}

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const THEMES = [
  { value: "default", name: "Default Black", colors: ["#0b0a08", "#f5efe2"] },
  { value: "warm", name: "Saffron Warm", colors: ["#f0a040", "#e85a2a"] },
  { value: "fresh", name: "Emerald Green", colors: ["#52d27a", "#0b0a08"] },
  { value: "bold", name: "Burnt Ochre", colors: ["#b1421a", "#ffffff"] },
];

interface SettingsFormProps {
  restaurant: Restaurant;
}

export default function SettingsForm({ restaurant }: SettingsFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const defaultOperatingHours: Record<string, OperatingHours> = {
    monday: { open: "09:00", close: "22:00", isOpen: true },
    tuesday: { open: "09:00", close: "22:00", isOpen: true },
    wednesday: { open: "09:00", close: "22:00", isOpen: true },
    thursday: { open: "09:00", close: "22:00", isOpen: true },
    friday: { open: "09:00", close: "22:00", isOpen: true },
    saturday: { open: "09:00", close: "22:00", isOpen: true },
    sunday: { open: "09:00", close: "22:00", isOpen: true },
  };

  const [formData, setFormData] = useState<SettingsFormData>({
    name: restaurant.name || "",
    description: restaurant.description || "",
    phone: restaurant.phone || "",
    email: restaurant.email || "",
    notificationEmail: ((restaurant as any).notificationEmail as unknown as string) || "",
    logo: restaurant.logo || "",
    taxPercent: restaurant.taxPercent || 0,
    theme: (restaurant.theme as "default" | "warm" | "fresh" | "bold") || "default",
    operatingHours: restaurant.operatingHours
      ? (restaurant.operatingHours as unknown as Record<string, OperatingHours>)
      : defaultOperatingHours,
  });

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, logo: reader.result as string }));
        setHasUnsavedChanges(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setFormData((prev) => ({ ...prev, logo: "" }));
    setHasUnsavedChanges(true);
  };

  const handleOperatingHoursChange = (day: string, field: keyof OperatingHours, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      operatingHours: {
        ...prev.operatingHours,
        [day]: {
          ...prev.operatingHours[day],
          [field]: value,
        },
      },
    }));
    setHasUnsavedChanges(true);
  };

  const handleApplyToAllDays = () => {
    const mondayHours = formData.operatingHours.monday;
    const newHours: Record<string, OperatingHours> = {};
    DAYS.forEach((day) => {
      newHours[day] = { ...mondayHours };
    });
    setFormData((prev) => ({ ...prev, operatingHours: newHours }));
    setHasUnsavedChanges(true);
    toast.success("Applied to all days");
  };

  const handleSaveGeneral = async () => {
    if (!formData.name.trim()) {
      toast.error("Restaurant name is required");
      return;
    }
    if (formData.name.trim().length < 2) {
      toast.error("Restaurant name must be at least 2 characters");
      return;
    }
    if (formData.phone && !/^[+]?[0-9]{10,15}$/.test(formData.phone.replace(/\s/g, ""))) {
      toast.error("Please enter a valid phone number");
      return;
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (formData.notificationEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.notificationEmail)) {
      toast.error("Please enter a valid notification email");
      return;
    }

    setLoading(true);
    try {
      await axios.patch("/api/settings", {
        restaurantId: restaurant.id,
        name: formData.name,
        description: formData.description,
        phone: formData.phone,
        email: formData.email,
        notificationEmail: formData.notificationEmail,
        logo: formData.logo,
      });
      setHasUnsavedChanges(false);
      toast.success("General settings saved successfully");
    } catch (error) {
      toast.error("Failed to save general settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTaxTheme = async () => {
    setLoading(true);
    try {
      await axios.patch("/api/settings", {
        restaurantId: restaurant.id,
        taxPercent: formData.taxPercent,
        theme: formData.theme,
      });
      setHasUnsavedChanges(false);
      toast.success("Tax & theme settings saved successfully");
    } catch (error) {
      toast.error("Failed to save tax & theme settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOperatingHours = async () => {
    setLoading(true);
    try {
      await axios.patch("/api/settings", {
        restaurantId: restaurant.id,
        operatingHours: formData.operatingHours,
      });
      setHasUnsavedChanges(false);
      toast.success("Operating hours saved successfully");
    } catch (error) {
      toast.error("Failed to save operating hours");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRestaurant = async () => {
    if (deleteConfirmText !== restaurant.name) {
      toast.error("Please type the restaurant name exactly to confirm");
      return;
    }

    setLoading(true);
    try {
      await axios.delete(`/api/restaurants/${restaurant.id}`);
      toast.success("Restaurant deleted successfully");
      router.push("/onboarding");
    } catch (error) {
      toast.error("Failed to delete restaurant");
    } finally {
      setLoading(false);
    }
  };

  const calculateTaxPreview = (price: number) => {
    const taxAmount = price * (formData.taxPercent / 100);
    return (price + taxAmount).toFixed(2);
  };

  return (
    <div className="space-y-8 relative select-none">
      {/* ── Page Header ────────────────────────────────────────────────── */}
      <div className="border-b border-[rgba(255,255,255,0.06)] pb-5">
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#f0a040] font-mono-dashboard">SYSTEM MANAGEMENT</span>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#f5efe2] font-editorial italic mt-1">
          Settings Console
        </h1>
        <p className="text-[11px] text-[#f5efe2]/45 font-serif italic mt-0.5">
          Configure registry branding, tax models, operating hours, and administrative parameters
        </p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Left Category Sidebar Navigation (Sticky on Desktop) */}
          <aside className="lg:w-64 flex-shrink-0">
            <div className="lg:sticky lg:top-24 space-y-5">
              <div className="px-2 text-[9px] font-bold tracking-widest text-[#f0a040]/55 uppercase font-mono-dashboard">
                Configuration Pages
              </div>
              <TabsList className="flex flex-col h-auto w-full bg-white/[0.015] border border-white/[0.05] p-1.5 rounded-2xl gap-1">
                <TabsTrigger 
                  value="general" 
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs text-[#f5efe2]/40 data-[state=active]:bg-[#f0a040]/10 data-[state=active]:text-[#f0a040] data-[state=active]:border-l-2 data-[state=active]:border-[#f0a040] hover:text-[#f5efe2]/75 hover:bg-white/[0.01] transition-all justify-start font-mono-dashboard uppercase tracking-wider"
                >
                  <Building2 className="size-4 shrink-0" />
                  <span>General Registry</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="tax-theme" 
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs text-[#f5efe2]/40 data-[state=active]:bg-[#f0a040]/10 data-[state=active]:text-[#f0a040] data-[state=active]:border-l-2 data-[state=active]:border-[#f0a040] hover:text-[#f5efe2]/75 hover:bg-white/[0.01] transition-all justify-start font-mono-dashboard uppercase tracking-wider"
                >
                  <Palette className="size-4 shrink-0" />
                  <span>Tax & Theme</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="hours" 
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs text-[#f5efe2]/40 data-[state=active]:bg-[#f0a040]/10 data-[state=active]:text-[#f0a040] data-[state=active]:border-l-2 data-[state=active]:border-[#f0a040] hover:text-[#f5efe2]/75 hover:bg-white/[0.01] transition-all justify-start font-mono-dashboard uppercase tracking-wider"
                >
                  <Clock className="size-4 shrink-0" />
                  <span>Operating Hours</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="danger" 
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs text-rose-500/50 data-[state=active]:bg-rose-500/10 data-[state=active]:text-rose-400 data-[state=active]:border-l-2 data-[state=active]:border-rose-500 hover:text-rose-400 hover:bg-white/[0.01] transition-all justify-start font-mono-dashboard uppercase tracking-wider"
                >
                  <AlertTriangle className="size-4 shrink-0" />
                  <span>Danger Zone</span>
                </TabsTrigger>
              </TabsList>

              {/* Status pill inside sticky aside */}
              <div className="hidden lg:block p-4 bg-white/[0.01] border border-white/[0.03] rounded-2xl space-y-2">
                <span className="text-[8px] font-mono-dashboard text-[#f5efe2]/35 uppercase tracking-widest block font-bold">System Status</span>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#52d27a] animate-pulse" />
                  <span className="text-[10px] font-bold text-[#f5efe2]/80 font-mono-dashboard">Kanpur Online</span>
                </div>
                {hasUnsavedChanges && (
                  <div className="text-[9px] font-mono-dashboard text-[#f0a040] animate-pulse font-bold mt-2">
                    ⚠️ Unsaved Changes
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* Right Content Column */}
          <div className="flex-1 space-y-6 min-w-0">
            
            {/* General Settings Tab Content */}
            <TabsContent value="general" className="mt-0 focus:outline-none space-y-4">
              <Card className="bg-[#0b0a08]/40 border border-[rgba(255,255,255,0.06)] backdrop-blur-md rounded-2xl shadow-sm">
                <CardHeader className="border-b border-[rgba(255,255,255,0.06)] pb-4 mb-4">
                  <CardTitle className="text-[#f5efe2] font-editorial italic text-lg leading-none">General Registry</CardTitle>
                  <CardDescription className="text-[#f5efe2]/40 font-serif italic text-xs mt-1">Configure your restaurant's profile metadata and core branding assets.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-[#f5efe2]/40 text-[9px] font-mono-dashboard font-bold uppercase tracking-wider block">Restaurant Name *</Label>
                    <input
                      id="name"
                      value={formData.name}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, name: e.target.value }));
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="Enter restaurant name"
                      className="w-full bg-white/[0.015] border border-white/[0.06] hover:border-white/[0.12] focus:border-[#f0a040] text-[#f5efe2] placeholder-white/10 rounded-xl px-4 py-2.5 text-xs transition-all duration-200 outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="description" className="text-[#f5efe2]/40 text-[9px] font-mono-dashboard font-bold uppercase tracking-wider block">Description</Label>
                    <input
                      id="description"
                      value={formData.description}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, description: e.target.value }));
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="Enter restaurant description"
                      className="w-full bg-white/[0.015] border border-white/[0.06] hover:border-white/[0.12] focus:border-[#f0a040] text-[#f5efe2] placeholder-white/10 rounded-xl px-4 py-2.5 text-xs transition-all duration-200 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="phone" className="text-[#f5efe2]/40 text-[9px] font-mono-dashboard font-bold uppercase tracking-wider block">Phone Number</Label>
                      <input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => {
                          setFormData((prev) => ({ ...prev, phone: e.target.value }));
                          setHasUnsavedChanges(true);
                        }}
                        placeholder="Enter phone number"
                        className="w-full bg-white/[0.015] border border-white/[0.06] hover:border-white/[0.12] focus:border-[#f0a040] text-[#f5efe2] placeholder-white/10 rounded-xl px-4 py-2.5 text-xs transition-all duration-200 outline-none font-mono-dashboard"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-[#f5efe2]/40 text-[9px] font-mono-dashboard font-bold uppercase tracking-wider block">Email</Label>
                      <input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => {
                          setFormData((prev) => ({ ...prev, email: e.target.value }));
                          setHasUnsavedChanges(true);
                        }}
                        placeholder="Enter email address"
                        className="w-full bg-white/[0.015] border border-white/[0.06] hover:border-white/[0.12] focus:border-[#f0a040] text-[#f5efe2] placeholder-white/10 rounded-xl px-4 py-2.5 text-xs transition-all duration-200 outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="notificationEmail" className="text-[#f5efe2]/40 text-[9px] font-mono-dashboard font-bold uppercase tracking-wider block">Notification Email</Label>
                    <input
                      id="notificationEmail"
                      type="email"
                      value={formData.notificationEmail}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, notificationEmail: e.target.value }));
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="Enter email for order notifications (optional)"
                      className="w-full bg-white/[0.015] border border-white/[0.06] hover:border-white/[0.12] focus:border-[#f0a040] text-[#f5efe2] placeholder-white/10 rounded-xl px-4 py-2.5 text-xs transition-all duration-200 outline-none"
                    />
                    <p className="text-[10px] text-[#f5efe2]/35 font-serif italic mt-1">
                      Dedicated alerts email. Fallbacks to primary account email if empty.
                    </p>
                  </div>

                  {/* Styled Custom Logo Uploader */}
                  <div className="space-y-2">
                    <Label className="text-[#f5efe2]/40 text-[9px] font-mono-dashboard font-black uppercase tracking-wider block">Logo Asset</Label>
                    <div className="flex flex-col sm:flex-row items-center gap-5 p-4 bg-white/[0.01] border border-white/[0.05] rounded-2xl">
                      {formData.logo ? (
                        <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-white/[0.08] shadow-md group shrink-0">
                          <img src={formData.logo} alt="Logo" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                            onClick={handleRemoveLogo}
                          >
                            <Trash2 className="size-4 text-rose-400" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-xl border border-dashed border-white/[0.08] flex flex-col items-center justify-center bg-white/[0.005] shrink-0 text-white/20">
                          <Upload className="size-5" />
                        </div>
                      )}
                      <div className="flex-1 w-full space-y-1.5">
                        <div className="text-[10px] text-white/40 font-mono-dashboard uppercase tracking-widest font-bold">Upload Custom Logo</div>
                        <Label htmlFor="logo" className="cursor-pointer block">
                          <div className="px-4 py-2 border border-white/[0.08] hover:border-[#f0a040]/40 bg-white/[0.01] hover:bg-white/[0.02] text-xs font-mono-dashboard uppercase tracking-wider text-center rounded-xl text-white/60 transition-all">
                            Select Image File
                          </div>
                        </Label>
                        <input
                          id="logo"
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-3">
                    <button
                      onClick={handleSaveGeneral}
                      disabled={loading || !hasUnsavedChanges}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-white text-[10px] font-mono-dashboard font-bold uppercase tracking-wider hover:brightness-110 transition-all shadow-md shadow-[#f0a040]/10 disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                      Save General settings
                    </button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tax & Theme Tab Content */}
            <TabsContent value="tax-theme" className="mt-0 focus:outline-none space-y-4">
              <Card className="bg-[#0b0a08]/40 border border-[rgba(255,255,255,0.06)] backdrop-blur-md rounded-2xl shadow-sm">
                <CardHeader className="border-b border-[rgba(255,255,255,0.06)] pb-4 mb-4">
                  <CardTitle className="text-[#f5efe2] font-editorial italic text-lg leading-none">Tax & Theme Styling</CardTitle>
                  <CardDescription className="text-[#f5efe2]/40 font-serif italic text-xs mt-1">Configure VAT/Tax scales and assign visual templates.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* VAT Input and Preview Capsule */}
                  <div className="p-4 bg-white/[0.01] border border-white/[0.05] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] text-white/40 font-mono-dashboard uppercase tracking-widest block font-bold">Tax Rate</span>
                      <div className="flex items-center gap-2">
                        <input
                          id="taxPercent"
                          type="number"
                          min="0"
                          max="30"
                          step="0.5"
                          value={formData.taxPercent}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            setFormData((prev) => ({ ...prev, taxPercent: value }));
                            setHasUnsavedChanges(true);
                          }}
                          className="w-24 bg-white/[0.015] border border-white/[0.06] text-[#f5efe2] focus:border-[#f0a040] text-sm rounded-xl font-mono-dashboard text-center py-1.5 outline-none"
                        />
                        <span className="text-sm font-mono-dashboard text-white/60">%</span>
                      </div>
                    </div>
                    <div className="px-4 py-3 bg-[#f0a040]/5 border border-[#f0a040]/15 rounded-xl text-right shrink-0">
                      <span className="text-[8px] font-mono-dashboard text-[#f0a040] uppercase tracking-widest font-black block">Live VAT Preview</span>
                      <p className="text-xs text-white/70 mt-0.5">
                        ₹100 Item Price &rarr; <span className="font-bold text-[#f0a040] font-mono-dashboard text-sm">₹{calculateTaxPreview(100)}</span>
                      </p>
                    </div>
                  </div>

                  {/* App Layout Theme Selector */}
                  <div className="space-y-3">
                    <Label className="text-[#f5efe2]/40 text-[9px] font-mono-dashboard font-black uppercase tracking-wider block">App Layout Theme Palette</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {THEMES.map((themeOption) => (
                        <button
                          key={themeOption.value}
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, theme: themeOption.value as "default" | "warm" | "fresh" | "bold" }));
                            setHasUnsavedChanges(true);
                          }}
                          className={`p-4 rounded-2xl border text-left transition-all duration-300 relative overflow-hidden group ${
                            formData.theme === themeOption.value
                              ? "border-[#f0a040] bg-[#f0a040]/5 shadow-md shadow-[#f0a040]/5"
                              : "border-white/[0.05] bg-white/[0.005] hover:bg-white/[0.015] hover:border-white/[0.12]"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 mb-3">
                            <div
                              className="w-5 h-5 rounded-full border border-white/10 shrink-0"
                              style={{ backgroundColor: themeOption.colors[0] }}
                            />
                            <div
                              className="w-5 h-5 rounded-full border border-white/10 shrink-0"
                              style={{ backgroundColor: themeOption.colors[1] }}
                            />
                          </div>
                          <p className="text-xs font-mono-dashboard font-black uppercase tracking-wider text-[#f5efe2]">{themeOption.name}</p>
                          {formData.theme === themeOption.value && (
                            <div className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-[#f0a040]" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end pt-3">
                    <button
                      onClick={handleSaveTaxTheme}
                      disabled={loading || !hasUnsavedChanges}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-white text-[10px] font-mono-dashboard font-bold uppercase tracking-wider hover:brightness-110 transition-all shadow-md shadow-[#f0a040]/10 disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                      Save Style properties
                    </button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Operating Hours Tab Content */}
            <TabsContent value="hours" className="mt-0 focus:outline-none space-y-4">
              <Card className="bg-[#0b0a08]/40 border border-[rgba(255,255,255,0.06)] backdrop-blur-md rounded-2xl shadow-sm">
                <CardHeader className="border-b border-[rgba(255,255,255,0.06)] pb-4 mb-4">
                  <CardTitle className="text-[#f5efe2] font-editorial italic text-lg leading-none">Operating Schedule</CardTitle>
                  <CardDescription className="text-[#f5efe2]/40 font-serif italic text-xs mt-1">Determine daily operational opening/closing periods.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-end mb-2">
                    <button
                      onClick={handleApplyToAllDays}
                      className="px-4 py-2 rounded-xl bg-transparent border border-white/[0.08] text-[#f5efe2]/60 hover:text-white hover:bg-white/[0.02] transition-colors text-[10px] font-mono-dashboard font-bold uppercase tracking-wider"
                    >
                      Apply Monday to All Days
                    </button>
                  </div>

                  <div className="space-y-3">
                    {DAYS.map((day) => (
                      <div key={day} className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 border border-white/[0.04] rounded-2xl bg-white/[0.01] hover:border-white/[0.08] transition-all">
                        <div className="w-32 capitalize font-mono-dashboard font-bold tracking-wider text-xs text-[#f5efe2] shrink-0 flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${formData.operatingHours[day]?.isOpen ? "bg-[#52d27a]" : "bg-white/10"}`} />
                          {day}
                        </div>
                        
                        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 w-full lg:w-auto">
                          <div className="flex items-center justify-between md:justify-start gap-4">
                            <span className="text-[10px] font-mono-dashboard uppercase tracking-wider text-[#f5efe2]/45">Dine-in Status</span>
                            <Switch
                              checked={formData.operatingHours[day]?.isOpen || false}
                              onCheckedChange={(checked) =>
                                handleOperatingHoursChange(day, "isOpen", checked)
                              }
                              className="data-[state=checked]:bg-[#f0a040]"
                            />
                          </div>
                          
                          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
                            <div className="flex items-center gap-2">
                              <Label htmlFor={`${day}-open`} className="text-[9px] font-mono-dashboard uppercase text-white/30 font-bold shrink-0">Open</Label>
                              <input
                                id={`${day}-open`}
                                type="time"
                                value={formData.operatingHours[day]?.open || "09:00"}
                                onChange={(e) => handleOperatingHoursChange(day, "open", e.target.value)}
                                disabled={!formData.operatingHours[day]?.isOpen}
                                className="w-24 bg-white/[0.01] border border-white/[0.06] text-white disabled:opacity-20 text-xs font-mono-dashboard h-8 rounded-lg px-2 text-center outline-none focus:border-[#f0a040] transition-colors"
                              />
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Label htmlFor={`${day}-close`} className="text-[9px] font-mono-dashboard uppercase text-white/30 font-bold shrink-0">Close</Label>
                              <input
                                id={`${day}-close`}
                                type="time"
                                value={formData.operatingHours[day]?.close || "22:00"}
                                onChange={(e) => handleOperatingHoursChange(day, "close", e.target.value)}
                                disabled={!formData.operatingHours[day]?.isOpen}
                                className="w-24 bg-white/[0.01] border border-white/[0.06] text-white disabled:opacity-20 text-xs font-mono-dashboard h-8 rounded-lg px-2 text-center outline-none focus:border-[#f0a040] transition-colors"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end pt-3">
                    <button
                      onClick={handleSaveOperatingHours}
                      disabled={loading || !hasUnsavedChanges}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-white text-[10px] font-mono-dashboard font-bold uppercase tracking-wider hover:brightness-110 transition-all shadow-md shadow-[#f0a040]/10 disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                      Save Work Schedule
                    </button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Danger Zone Tab Content */}
            <TabsContent value="danger" className="mt-0 focus:outline-none space-y-4">
              <Card className="bg-[#0b0a08]/20 border border-rose-500/25 rounded-2xl">
                <CardHeader className="border-b border-rose-500/10 pb-4 mb-4">
                  <CardTitle className="text-rose-400 flex items-center gap-2 text-md font-mono-dashboard font-black uppercase tracking-wider">
                    <AlertTriangle className="size-4 text-rose-400" /> Danger System Operations
                  </CardTitle>
                  <CardDescription className="text-[#f5efe2]/40 font-serif italic text-xs mt-1">
                    Irreversible actions that affect your restaurant data database.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-rose-500/10 rounded-xl bg-rose-500/[0.02]">
                    <div className="space-y-1">
                      <p className="font-bold text-rose-400 text-sm">Delete Restaurant Profile</p>
                      <p className="text-xs text-[#f5efe2]/40 font-serif italic max-w-xl">
                        This will permanently wipe your restaurant catalog, active orders history, staff records and QR mappings. This action is irreversible.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowDeleteDialog(true)}
                      disabled={loading}
                      className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-mono-dashboard uppercase tracking-wider text-[10px] font-bold transition-all shrink-0"
                    >
                      Delete Restaurant
                    </button>
                  </div>

                  {showDeleteDialog && (
                    <div className="space-y-4 p-4 border border-rose-500/25 rounded-xl bg-rose-500/[0.04]">
                      <div className="space-y-2">
                        <Label htmlFor="delete-confirm" className="text-[#f5efe2]/80 text-xs font-serif italic">
                          Type <span className="font-bold text-rose-400 not-italic font-mono-dashboard">{restaurant.name}</span> to confirm wipe operations
                        </Label>
                        <input
                          id="delete-confirm"
                          value={deleteConfirmText}
                          onChange={(e) => setDeleteConfirmText(e.target.value)}
                          placeholder="Restaurant name"
                          className="w-full bg-[#0b0a08] border border-rose-500/25 text-[#f5efe2] placeholder-white/5 focus:border-rose-400 text-[13px] rounded-xl outline-none py-2 px-4"
                        />
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
                        <button
                          onClick={handleDeleteRestaurant}
                          disabled={loading || deleteConfirmText !== restaurant.name}
                          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rose-500 text-white font-mono-dashboard uppercase tracking-wider text-[10px] font-bold hover:bg-rose-600 transition-colors disabled:opacity-50 w-full sm:w-auto"
                        >
                          {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                          Confirm wipe operations
                        </button>
                        <button
                          onClick={() => setShowDeleteDialog(false)}
                          className="px-5 py-2.5 rounded-xl bg-transparent border border-white/[0.08] text-[#f5efe2]/60 hover:text-white hover:bg-white/[0.02] transition-colors text-[10px] font-mono-dashboard font-bold uppercase tracking-wider w-full sm:w-auto"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

          </div>

        </div>
      </Tabs>
    </div>
  );
}
