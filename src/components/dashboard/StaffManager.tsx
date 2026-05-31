"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios, { AxiosError } from "axios";
import toast from "react-hot-toast";
import { Trash2, Plus, Loader2, Users, Shield, UserCheck, UserX, Crown, Briefcase, Utensils, ChefHat, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type StaffRole = "ADMIN" | "MANAGER" | "WAITER" | "KITCHEN";

type StaffMember = {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  isActive: boolean;
  createdAt: string;
};

type StaffManagerProps = {
  restaurantId: string;
};

const roleOptions: StaffRole[] = ["ADMIN", "MANAGER", "WAITER", "KITCHEN"];

const roleBadgeMap: Record<StaffRole, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
  ADMIN: { bg: "bg-[#ef4444]/10", text: "text-[#ef4444]", border: "border-[#ef4444]/20", icon: <Crown className="size-3" /> },
  MANAGER: { bg: "bg-purple-500/10", text: "text-purple-500", border: "border-purple-500/20", icon: <Briefcase className="size-3" /> },
  WAITER: { bg: "bg-blue-500/10", text: "text-blue-500", border: "border-blue-500/20", icon: <Utensils className="size-3" /> },
  KITCHEN: { bg: "bg-[#f97316]/10", text: "text-[#f97316]", border: "border-[#f97316]/20", icon: <ChefHat className="size-3" /> },
};

const roleAvatarMap: Record<StaffRole, { bg: string; text: string }> = {
  ADMIN: { bg: "bg-[#ef4444]/10", text: "text-[#ef4444]" },
  MANAGER: { bg: "bg-purple-500/10", text: "text-purple-500" },
  WAITER: { bg: "bg-blue-500/10", text: "text-blue-500" },
  KITCHEN: { bg: "bg-[#f97316]/10", text: "text-[#f97316]" },
};

export function StaffManager({ restaurantId }: StaffManagerProps) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<StaffMember | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "WAITER" as StaffRole,
  });
  const [formErrors, setFormErrors] = useState<{
    name?: string;
    email?: string;
    role?: string;
  }>({});

  const fetchStaff = useCallback(async () => {
    try {
      const { data } = await axios.get<StaffMember[]>(
        `/api/staff?restaurantId=${restaurantId}`,
      );
      setStaff(data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch staff members.");
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    void fetchStaff();
  }, [fetchStaff]);

  const stats = useMemo(() => {
    const roleCounts = {
      ADMIN: 0,
      MANAGER: 0,
      WAITER: 0,
      KITCHEN: 0,
    };
    let activeCount = 0;

    for (const member of staff) {
      roleCounts[member.role] += 1;
      if (member.isActive) activeCount += 1;
    }

    return {
      total: staff.length,
      active: activeCount,
      roleCounts,
    };
  }, [staff]);

  function validateForm() {
    const errors: { name?: string; email?: string; role?: string } = {};
    if (!form.name.trim()) errors.name = "Name is required";
    if (!form.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = "Please enter a valid email";
    }
    if (!form.role) errors.role = "Role is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function createStaff() {
    if (!validateForm()) return;

    try {
      setSaving(true);
      const { data } = await axios.post<StaffMember>("/api/staff", {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        role: form.role,
        restaurantId,
      });

      setStaff((prev) => [data, ...prev]);
      setForm({ name: "", email: "", role: "WAITER" });
      setFormErrors({});
      setShowForm(false);
      toast.success("Staff member added.");
    } catch (error) {
      console.error(error);
      const message =
        error instanceof AxiosError
          ? error.response?.data?.error || "Failed to add staff member."
          : "Failed to add staff member.";

      if (
        error instanceof AxiosError &&
        typeof message === "string" &&
        message.toLowerCase().includes("email")
      ) {
        setFormErrors((prev) => ({ ...prev, email: message }));
      } else {
        toast.error(message);
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(member: StaffMember) {
    try {
      setUpdatingId(member.id);
      const { data } = await axios.patch<StaffMember>(`/api/staff/${member.id}`, {
        isActive: !member.isActive,
      });
      setStaff((prev) => prev.map((s) => (s.id === data.id ? data : s)));
      toast.success(`Staff marked ${data.isActive ? "active" : "inactive"}.`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update status.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function updateRole(member: StaffMember, role: StaffRole) {
    try {
      setUpdatingId(member.id);
      const { data } = await axios.patch<StaffMember>(`/api/staff/${member.id}`, {
        role,
      });
      setStaff((prev) => prev.map((s) => (s.id === data.id ? data : s)));
      toast.success("Role updated.");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update role.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function deleteStaff(member: StaffMember) {
    try {
      setDeletingId(member.id);
      await axios.delete(`/api/staff/${member.id}`);
      setStaff((prev) => prev.filter((s) => s.id !== member.id));
      toast.success("Staff member removed.");
      setDeleteCandidate(null);
    } catch (error) {
      console.error(error);
      const message =
        error instanceof AxiosError
          ? error.response?.data?.error || "Failed to delete staff member."
          : "Failed to delete staff member.";
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#f97316] to-[#ea6c0a]">
            <Users className="size-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Staff Accounts</h1>
            <p className="text-sm text-[#999999]">Manage staff members and role-based responsibilities.</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm((prev) => !prev)}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#f97316] text-white font-medium hover:bg-[#ea6c0a] shadow-lg shadow-[#f97316]/20 transition-all"
        >
          <Plus className="size-5" /> Add Staff
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatsCard label="Total Staff" value={stats.total} icon={<Users className="size-4" />} color="blue" />
        <StatsCard label="Active Staff" value={stats.active} icon={<UserCheck className="size-4" />} color="green" />
        <StatsCard label="Admins" value={stats.roleCounts.ADMIN} icon={<Crown className="size-4" />} color="red" />
        <StatsCard label="Managers" value={stats.roleCounts.MANAGER} icon={<Briefcase className="size-4" />} color="purple" />
        <StatsCard label="Waiters" value={stats.roleCounts.WAITER} icon={<Utensils className="size-4" />} color="blue" />
        <StatsCard label="Kitchen" value={stats.roleCounts.KITCHEN} icon={<ChefHat className="size-4" />} color="orange" />
      </div>

      {/* Add Staff Form */}
      {showForm ? (
        <div>
          <Card className="space-y-6 p-6 bg-[#141414] border-[#252525]">
              <h2 className="text-xl font-semibold text-white">Add Staff Member</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="staff-name" className="text-white text-sm font-medium">Name *</Label>
                  <Input
                    id="staff-name"
                    value={form.name}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, name: e.target.value }));
                      setFormErrors((prev) => ({ ...prev, name: undefined }));
                    }}
                    placeholder="Rahul Sharma"
                    className="h-11 bg-[#1a1a1a] border-[#252525] text-white placeholder-[#555555] focus:border-[#f97316]"
                  />
                  {formErrors.name ? (
                    <p className="text-xs text-[#ef4444]">{formErrors.name}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="staff-email" className="text-white text-sm font-medium">Email *</Label>
                  <Input
                    id="staff-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, email: e.target.value }));
                      setFormErrors((prev) => ({ ...prev, email: undefined }));
                    }}
                    placeholder="rahul@example.com"
                    className="h-11 bg-[#1a1a1a] border-[#252525] text-white placeholder-[#555555] focus:border-[#f97316]"
                  />
                  {formErrors.email ? (
                    <p className="text-xs text-[#ef4444]">{formErrors.email}</p>
                  ) : null}
                </div>
              </div>

              <div className="max-w-xs space-y-2">
                <Label className="text-white text-sm font-medium">Role *</Label>
                <Select
                  value={form.role}
                  onValueChange={(value) => {
                    setForm((prev) => ({ ...prev, role: value as StaffRole }));
                    setFormErrors((prev) => ({ ...prev, role: undefined }));
                  }}
                >
                  <SelectTrigger className="w-full bg-[#1a1a1a] border-[#252525] text-white">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#141414] border-[#252525]">
                    {roleOptions.map((role) => (
                      <SelectItem key={role} value={role} className="text-white">
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.role ? (
                  <p className="text-xs text-[#ef4444]">{formErrors.role}</p>
                ) : null}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => void createStaff()}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#f97316] text-white font-medium hover:bg-[#ea6c0a] transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setFormErrors({});
                  }}
                  disabled={saving}
                  className="px-6 py-2.5 rounded-lg bg-[#141414] border border-[#252525] text-white hover:bg-[#1e1e1e] transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </Card>
          </div>
        ) : null}

      {/* Staff Table */}
      <div>
        <Card className="overflow-hidden bg-[#141414] border-[#252525]">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-[#1e1e1e] text-left text-xs uppercase tracking-wide text-[#999999]">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-[#999999]">
                      Loading staff...
                    </td>
                  </tr>
                ) : staff.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-[#555555]">
                      No staff yet — add your first staff member
                    </td>
                  </tr>
                ) : (
                  staff.map((member) => (
                    <tr
                      key={member.id}
                      className="border-t border-[#252525] transition hover:bg-[#1e1e1e]"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold",
                              roleAvatarMap[member.role].bg,
                              roleAvatarMap[member.role].text,
                            )}
                          >
                            {member.name
                              .split(" ")
                              .slice(0, 2)
                              .map((word) => word[0]?.toUpperCase())
                              .join("")}
                          </div>
                          <div>
                            <p className="font-medium text-white">{member.name}</p>
                            <p className="text-xs text-[#999999]">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#999999]">{member.email}</td>
                      <td className="px-6 py-4">
                        <Badge
                          variant="outline"
                          className={cn("border flex items-center gap-1.5", roleBadgeMap[member.role].bg, roleBadgeMap[member.role].text, roleBadgeMap[member.role].border)}
                        >
                          {roleBadgeMap[member.role].icon}
                          {member.role}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => void toggleActive(member)}
                          disabled={updatingId === member.id}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                            member.isActive
                              ? "bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20"
                              : "bg-[#555555]/10 text-[#999999] border border-[#252525]"
                          }`}
                        >
                          {updatingId === member.id ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : member.isActive ? (
                            <UserCheck className="size-3" />
                          ) : (
                            <UserX className="size-3" />
                          )}
                          {member.isActive ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Select
                            value={member.role}
                            onValueChange={(value) =>
                              void updateRole(member, value as StaffRole)
                            }
                            disabled={updatingId === member.id}
                          >
                            <SelectTrigger size="sm" className="w-[140px] bg-[#1a1a1a] border-[#252525] text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#141414] border-[#252525]">
                              {roleOptions.map((role) => (
                                <SelectItem key={role} value={role} className="text-white">
                                  {role}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <button
                            onClick={() => setDeleteCandidate(member)}
                            className="flex items-center justify-center h-8 w-8 rounded-lg bg-[#ef4444] hover:bg-[#dc2626] transition-colors"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Role Permissions Card */}
      <div>
        <Card className="space-y-4 p-6 bg-[#141414] border-[#252525]">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Shield className="size-5 text-[#f97316]" />
            Role Permissions
          </h3>
          <ul className="space-y-3 text-sm text-[#999999]">
            <li className="flex items-start gap-2">
              <Crown className="size-4 text-[#ef4444] mt-0.5 flex-shrink-0" />
              <span><span className="font-medium text-white">ADMIN:</span> Full access to everything</span>
            </li>
            <li className="flex items-start gap-2">
              <Briefcase className="size-4 text-purple-500 mt-0.5 flex-shrink-0" />
              <span><span className="font-medium text-white">MANAGER:</span> Orders, menu, reports (no billing)</span>
            </li>
            <li className="flex items-start gap-2">
              <Utensils className="size-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <span><span className="font-medium text-white">WAITER:</span> View orders, call status updates</span>
            </li>
            <li className="flex items-start gap-2">
              <ChefHat className="size-4 text-[#f97316] mt-0.5 flex-shrink-0" />
              <span><span className="font-medium text-white">KITCHEN:</span> Kitchen display only</span>
            </li>
          </ul>
        </Card>
      </div>

      {/* Delete Dialog */}
      <Dialog
        open={Boolean(deleteCandidate)}
        onOpenChange={(open) => {
          if (!open) setDeleteCandidate(null);
        }}
      >
        <DialogContent className="bg-[#141414] border-[#252525]">
          <DialogHeader>
            <DialogTitle className="text-white">Delete staff member?</DialogTitle>
            <DialogDescription className="text-[#999999]">
              This action cannot be undone. {deleteCandidate?.name} will be removed from
              your staff list.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteCandidate(null)}
              disabled={Boolean(deletingId)}
              className="bg-[#141414] border-[#252525] text-white hover:bg-[#1e1e1e]"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!deleteCandidate || deletingId === deleteCandidate.id}
              onClick={() => {
                if (!deleteCandidate) return;
                void deleteStaff(deleteCandidate);
              }}
              className="bg-[#ef4444] hover:bg-[#dc2626]"
            >
              {deletingId && deleteCandidate?.id === deletingId ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatsCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  const colorClasses = {
    blue: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    green: "bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20",
    red: "bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/20",
    purple: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    orange: "bg-[#f97316]/10 text-[#f97316] border-[#f97316]/20",
  };

  return (
    <div className="bg-[#141414] border border-[#252525] rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs uppercase tracking-wide text-[#999999]">{label}</p>
        <div className={`p-2 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>{icon}</div>
      </div>
      <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
    </div>
  );
}

