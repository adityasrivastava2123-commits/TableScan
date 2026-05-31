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
import { Button } from "@/components/ui/button";
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
  { value: "default", name: "Default", colors: ["#ffffff", "#000000"] },
  { value: "warm", name: "Warm", colors: ["#f97316", "#78350f"] },
  { value: "fresh", name: "Fresh", colors: ["#22c55e", "#ffffff"] },
  { value: "bold", name: "Bold", colors: ["#ef4444", "#000000"] },
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#f97316] to-[#ea6c0a]">
          <Settings className="size-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-neutral-800 dark:text-white">Settings</h1>
          <p className="text-sm text-neutral-500 dark:text-[#999999]">Manage your restaurant preferences</p>
        </div>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <div>
          <TabsList className="bg-white dark:bg-[#141414] border border-neutral-200 dark:border-[#252525]">
            <TabsTrigger value="general" className="text-neutral-600 dark:text-[#9a9488] data-[state=active]:bg-[#f97316] data-[state=active]:text-white">
              <Building2 className="size-4 mr-2" /> General
            </TabsTrigger>
            <TabsTrigger value="tax-theme" className="text-neutral-600 dark:text-[#9a9488] data-[state=active]:bg-[#f97316] data-[state=active]:text-white">
              <Palette className="size-4 mr-2" /> Tax & Theme
            </TabsTrigger>
            <TabsTrigger value="hours" className="text-neutral-600 dark:text-[#9a9488] data-[state=active]:bg-[#f97316] data-[state=active]:text-white">
              <Clock className="size-4 mr-2" /> Hours
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="general" className="space-y-4">
          <div>
            <Card className="bg-white dark:bg-[#141414] border-neutral-200 dark:border-[#252525]">
              <CardHeader>
                <CardTitle className="text-neutral-800 dark:text-white">General Settings</CardTitle>
                <CardDescription className="text-neutral-500 dark:text-[#999999]">Update your restaurant's basic information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-neutral-700 dark:text-white text-sm font-medium">Restaurant Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, name: e.target.value }));
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="Enter restaurant name"
                    className="bg-white dark:bg-[#1a1a1a] border-neutral-200 dark:border-[#252525] text-neutral-800 dark:text-white placeholder-neutral-400 dark:placeholder-[#555555] focus:border-[#f97316]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-neutral-700 dark:text-white text-sm font-medium">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, description: e.target.value }));
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="Enter restaurant description"
                    className="bg-white dark:bg-[#1a1a1a] border-neutral-200 dark:border-[#252525] text-neutral-800 dark:text-white placeholder-neutral-400 dark:placeholder-[#555555] focus:border-[#f97316]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-neutral-700 dark:text-white text-sm font-medium">Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, phone: e.target.value }));
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="Enter phone number"
                    className="bg-white dark:bg-[#1a1a1a] border-neutral-200 dark:border-[#252525] text-neutral-800 dark:text-white placeholder-neutral-400 dark:placeholder-[#555555] focus:border-[#f97316]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-neutral-700 dark:text-white text-sm font-medium">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, email: e.target.value }));
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="Enter email address"
                    className="bg-white dark:bg-[#1a1a1a] border-neutral-200 dark:border-[#252525] text-neutral-800 dark:text-white placeholder-neutral-400 dark:placeholder-[#555555] focus:border-[#f97316]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notificationEmail" className="text-neutral-700 dark:text-white text-sm font-medium">Notification Email</Label>
                  <Input
                    id="notificationEmail"
                    type="email"
                    value={formData.notificationEmail}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, notificationEmail: e.target.value }));
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="Enter email for order notifications (optional)"
                    className="bg-white dark:bg-[#1a1a1a] border-neutral-200 dark:border-[#252525] text-neutral-800 dark:text-white placeholder-neutral-400 dark:placeholder-[#555555] focus:border-[#f97316]"
                  />
                  <p className="text-xs text-neutral-400 dark:text-[#999999]">
                    Separate email for receiving new order alerts. If not set, your account email will be used.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logo" className="text-neutral-700 dark:text-white text-sm font-medium">Logo</Label>
                  <div className="flex items-center gap-4">
                    {formData.logo && (
                      <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-neutral-200 dark:border-[#252525]">
                        <img src={formData.logo} alt="Logo" className="w-full h-full object-cover" />
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          type="button"
                          className="absolute top-1 right-1 size-6 rounded-lg bg-[#ef4444] hover:bg-[#dc2626] flex items-center justify-center transition-colors"
                          onClick={handleRemoveLogo}
                        >
                          <X className="size-3 text-white" />
                        </motion.button>
                      </div>
                    )}
                    <div className="flex-1">
                      <Input
                        id="logo"
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="bg-white dark:bg-[#1a1a1a] border-neutral-200 dark:border-[#252525] text-neutral-850 dark:text-white cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleSaveGeneral}
                    disabled={loading || !hasUnsavedChanges}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#f97316] text-white font-medium hover:bg-[#ea6c0a] transition-colors disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                    Save Changes
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tax-theme" className="space-y-4">
          <div>
            <Card className="bg-white dark:bg-[#141414] border-neutral-200 dark:border-[#252525]">
              <CardHeader>
                <CardTitle className="text-neutral-800 dark:text-white">Tax & Theme</CardTitle>
                <CardDescription className="text-neutral-500 dark:text-[#999999]">Configure tax rate and visual theme</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="taxPercent" className="text-neutral-700 dark:text-white text-sm font-medium">Tax Percentage (0-30%)</Label>
                  <Input
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
                    className="bg-white dark:bg-[#1a1a1a] border-neutral-200 dark:border-[#252525] text-neutral-850 dark:text-white focus:border-[#f97316]"
                  />
                  <p className="text-sm text-neutral-500 dark:text-[#999999]">
                    Live preview: ₹100 item → ₹{calculateTaxPreview(100)} after tax
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-neutral-700 dark:text-white text-sm font-medium">Theme</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {THEMES.map((theme) => (
                      <button
                        key={theme.value}
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, theme: theme.value as "default" | "warm" | "fresh" | "bold" }));
                          setHasUnsavedChanges(true);
                        }}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          formData.theme === theme.value
                            ? "border-[#f97316] bg-[#f97316]/10"
                            : "border-neutral-200 dark:border-[#252525] hover:border-[#f97316]/50"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: theme.colors[0] }}
                          />
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: theme.colors[1] }}
                          />
                        </div>
                        <p className="text-sm font-medium text-neutral-800 dark:text-white">{theme.name}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleSaveTaxTheme}
                    disabled={loading || !hasUnsavedChanges}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#f97316] text-white font-medium hover:bg-[#ea6c0a] transition-colors disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                    Save Changes
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="hours" className="space-y-4">
          <div>
            <Card className="bg-white dark:bg-[#141414] border-neutral-200 dark:border-[#252525]">
              <CardHeader>
                <CardTitle className="text-neutral-800 dark:text-white">Operating Hours</CardTitle>
                <CardDescription className="text-neutral-500 dark:text-[#999999]">Set your restaurant's operating hours for each day</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-end mb-4">
                  <button
                    onClick={handleApplyToAllDays}
                    className="px-4 py-2 rounded-lg bg-white dark:bg-[#141414] border border-neutral-200 dark:border-[#252525] text-neutral-800 dark:text-white hover:bg-neutral-50 dark:hover:bg-[#1e1e1e] transition-colors text-sm shadow-sm"
                  >
                    Apply Monday to All Days
                  </button>
                </div>

                {DAYS.map((day) => (
                  <div key={day} className="flex items-center gap-4 p-4 border border-neutral-200 dark:border-[#252525] rounded-xl bg-neutral-50 dark:bg-[#1e1e1e] shadow-sm">
                    <div className="w-32 capitalize font-medium text-neutral-800 dark:text-white">{day}</div>
                    <Switch
                      checked={formData.operatingHours[day]?.isOpen || false}
                      onCheckedChange={(checked) =>
                        handleOperatingHoursChange(day, "isOpen", checked)
                      }
                    />
                    <div className="flex items-center gap-2 flex-1">
                      <Label htmlFor={`${day}-open`} className="text-sm text-neutral-400 dark:text-[#999999]">
                        Open
                      </Label>
                      <Input
                        id={`${day}-open`}
                        type="time"
                        value={formData.operatingHours[day]?.open || "09:00"}
                        onChange={(e) => handleOperatingHoursChange(day, "open", e.target.value)}
                        disabled={!formData.operatingHours[day]?.isOpen}
                        className="w-32 bg-white dark:bg-[#1a1a1a] border-neutral-200 dark:border-[#252525] text-neutral-850 dark:text-white"
                      />
                      <Label htmlFor={`${day}-close`} className="text-sm text-neutral-400 dark:text-[#999999]">
                        Close
                      </Label>
                      <Input
                        id={`${day}-close`}
                        type="time"
                        value={formData.operatingHours[day]?.close || "22:00"}
                        onChange={(e) => handleOperatingHoursChange(day, "close", e.target.value)}
                        disabled={!formData.operatingHours[day]?.isOpen}
                        className="w-32 bg-white dark:bg-[#1a1a1a] border-neutral-200 dark:border-[#252525] text-neutral-850 dark:text-white"
                      />
                    </div>
                  </div>
                ))}

                <div className="flex justify-end">
                  <button
                    onClick={handleSaveOperatingHours}
                    disabled={loading || !hasUnsavedChanges}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#f97316] text-white font-medium hover:bg-[#ea6c0a] transition-colors disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                    Save Changes
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Danger Zone */}
      <div>
        <Card className="bg-white dark:bg-[#141414] border-[#ef4444]/50">
          <CardHeader>
            <CardTitle className="text-[#ef4444] flex items-center gap-2">
              <AlertTriangle className="size-5" /> Danger Zone
            </CardTitle>
            <CardDescription className="text-neutral-500 dark:text-[#999999]">
              Irreversible actions that affect your restaurant data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-[#ef4444]/50 rounded-xl bg-[#ef4444]/5">
              <div className="space-y-1">
                <p className="font-medium text-neutral-800 dark:text-white">Delete Restaurant</p>
                <p className="text-sm text-neutral-500 dark:text-[#999999]">
                  This will permanently delete your restaurant and all associated data. This action cannot be undone.
                </p>
              </div>
              <button
                onClick={() => setShowDeleteDialog(true)}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-[#ef4444] text-white font-medium hover:bg-[#dc2626] transition-colors disabled:opacity-50"
              >
                Delete Restaurant
              </button>
            </div>

            {showDeleteDialog && (
              <div className="space-y-4 p-4 border border-[#ef4444] rounded-xl bg-[#ef4444]/5">
                <div className="space-y-2">
                  <Label htmlFor="delete-confirm" className="text-neutral-700 dark:text-white">
                    Type <span className="font-bold text-[#ef4444]">{restaurant.name}</span> to confirm
                  </Label>
                  <Input
                    id="delete-confirm"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="Restaurant name"
                    className="bg-white dark:bg-[#1a1a1a] border-neutral-200 dark:border-[#252525] text-neutral-850 dark:text-white placeholder-[#555555] focus:border-[#ef4444]"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleDeleteRestaurant}
                    disabled={loading || deleteConfirmText !== restaurant.name}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#ef4444] text-white font-medium hover:bg-[#dc2626] transition-colors disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                    Confirm Delete
                  </button>
                  <button
                    onClick={() => setShowDeleteDialog(false)}
                    className="px-4 py-2 rounded-lg bg-white dark:bg-[#141414] border border-neutral-200 dark:border-[#252525] text-neutral-800 dark:text-white hover:bg-neutral-50 dark:hover:bg-[#1e1e1e] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
