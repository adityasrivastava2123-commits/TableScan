"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import axios from "axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
      <Tabs defaultValue="general" className="w-full">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="tax-theme">Tax & Theme</TabsTrigger>
          <TabsTrigger value="hours">Operating Hours</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Update your restaurant's basic information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Restaurant Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, name: e.target.value }));
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="Enter restaurant name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, description: e.target.value }));
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="Enter restaurant description"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, phone: e.target.value }));
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="Enter phone number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, email: e.target.value }));
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="Enter email address"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notificationEmail">Notification Email</Label>
                <Input
                  id="notificationEmail"
                  type="email"
                  value={formData.notificationEmail}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, notificationEmail: e.target.value }));
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="Enter email for order notifications (optional)"
                />
                <p className="text-xs text-muted-foreground">
                  Separate email for receiving new order alerts. If not set, your account email will be used.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="logo">Logo</Label>
                <div className="flex items-center gap-4">
                  {formData.logo && (
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden border">
                      <img src={formData.logo} alt="Logo" className="w-full h-full object-cover" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 size-6"
                        onClick={handleRemoveLogo}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  )}
                  <div className="flex-1">
                    <Input
                      id="logo"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveGeneral} disabled={loading || !hasUnsavedChanges} className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600">
                  {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tax-theme" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tax & Theme</CardTitle>
              <CardDescription>Configure tax rate and visual theme</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="taxPercent">Tax Percentage (0-30%)</Label>
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
                />
                <p className="text-sm text-muted-foreground">
                  Live preview: ₹100 item → ₹{calculateTaxPreview(100)} after tax
                </p>
              </div>

              <div className="space-y-2">
                <Label>Theme</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {THEMES.map((theme) => (
                    <button
                      key={theme.value}
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, theme: theme.value as "default" | "warm" | "fresh" | "bold" }));
                        setHasUnsavedChanges(true);
                      }}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        formData.theme === theme.value
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
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
                      <p className="text-sm font-medium">{theme.name}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveTaxTheme} disabled={loading || !hasUnsavedChanges} className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600">
                  {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hours" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Operating Hours</CardTitle>
              <CardDescription>Set your restaurant's operating hours for each day</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-end mb-4">
                <Button variant="outline" size="sm" onClick={handleApplyToAllDays}>
                  Apply Monday to All Days
                </Button>
              </div>

              {DAYS.map((day) => (
                <div key={day} className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="w-32 capitalize font-medium">{day}</div>
                  <Switch
                    checked={formData.operatingHours[day]?.isOpen || false}
                    onCheckedChange={(checked) =>
                      handleOperatingHoursChange(day, "isOpen", checked)
                    }
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <Label htmlFor={`${day}-open`} className="text-sm">
                      Open
                    </Label>
                    <Input
                      id={`${day}-open`}
                      type="time"
                      value={formData.operatingHours[day]?.open || "09:00"}
                      onChange={(e) => handleOperatingHoursChange(day, "open", e.target.value)}
                      disabled={!formData.operatingHours[day]?.isOpen}
                      className="w-32"
                    />
                    <Label htmlFor={`${day}-close`} className="text-sm">
                      Close
                    </Label>
                    <Input
                      id={`${day}-close`}
                      type="time"
                      value={formData.operatingHours[day]?.close || "22:00"}
                      onChange={(e) => handleOperatingHoursChange(day, "close", e.target.value)}
                      disabled={!formData.operatingHours[day]?.isOpen}
                      className="w-32"
                    />
                  </div>
                </div>
              ))}

              <div className="flex justify-end">
                <Button onClick={handleSaveOperatingHours} disabled={loading || !hasUnsavedChanges} className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600">
                  {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions that affect your restaurant data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-destructive/50 rounded-lg bg-destructive/5">
            <div className="space-y-1">
              <p className="font-medium">Delete Restaurant</p>
              <p className="text-sm text-muted-foreground">
                This will permanently delete your restaurant and all associated data. This action cannot be undone.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              disabled={loading}
            >
              Delete Restaurant
            </Button>
          </div>

          {showDeleteDialog && (
            <div className="space-y-4 p-4 border border-destructive rounded-lg bg-destructive/5">
              <div className="space-y-2">
                <Label htmlFor="delete-confirm">
                  Type <span className="font-bold">{restaurant.name}</span> to confirm
                </Label>
                <Input
                  id="delete-confirm"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Restaurant name"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={handleDeleteRestaurant}
                  disabled={loading || deleteConfirmText !== restaurant.name}
                >
                  {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  Confirm Delete
                </Button>
                <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
