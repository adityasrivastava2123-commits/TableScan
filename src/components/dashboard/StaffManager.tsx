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
  ADMIN: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20", icon: <Crown className="size-3" /> },
  MANAGER: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20", icon: <Briefcase className="size-3" /> },
  WAITER: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20", icon: <Utensils className="size-3" /> },
  KITCHEN: { bg: "bg-[#f0a040]/10", text: "text-[#f0a040]", border: "border-[#f0a040]/20", icon: <ChefHat className="size-3" /> },
};

const roleAvatarMap: Record<StaffRole, { bg: string; text: string }> = {
  ADMIN: { bg: "bg-red-500/10", text: "text-red-400" },
  MANAGER: { bg: "bg-purple-500/10", text: "text-purple-400" },
  WAITER: { bg: "bg-blue-500/10", text: "text-blue-400" },
  KITCHEN: { bg: "bg-[#f0a040]/10", text: "text-[#f0a040]" },
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
    <div className="space-y-8 relative">
      {/* ── Page Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[rgba(255,255,255,0.08)] pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-[50px] h-[50px] rounded-2xl bg-gradient-to-tr from-[#f0a040] to-[#e85a2a] flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#f0a040]/15 border border-[#f0a040]/20">
            <Users className="size-5 text-white" />
          </div>
          <div>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#f0a040]">HUMAN RESOURCES</span>
            <h1 className="text-2xl font-bold tracking-tight text-[#f5efe2] font-editorial italic mt-0.5">
              Staff Accounts
            </h1>
            <p className="text-[11px] text-[#f5efe2]/50 font-serif italic mt-0.5">
              Manage staff members and role-based responsibilities
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowForm((prev) => !prev)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-white text-[10px] font-mono-dashboard uppercase tracking-wider font-bold hover:brightness-110 shadow-lg shadow-[#f0a040]/10 transition-all"
        >
          <Plus className="size-4" /> Add Staff
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatsCard label="Total Staff" value={stats.total} icon={<Users className="size-4" />} color="blue" />
        <StatsCard label="Active Staff" value={stats.active} icon={<UserCheck className="size-4" />} color="green" />
        <StatsCard label="Admins" value={stats.roleCounts.ADMIN} icon={<Crown className="size-4" />} color="red" />
        <StatsCard label="Managers" value={stats.roleCounts.MANAGER} icon={<Briefcase className="size-4" />} color="purple" />
        <StatsCard label="Waiters" value={stats.roleCounts.WAITER} icon={<Utensils className="size-4" />} color="blue" />
        <StatsCard label="Kitchen" value={stats.roleCounts.KITCHEN} icon={<ChefHat className="size-4" />} color="orange" />
      </div>

      {/* Add Staff Form */}
      {showForm ? (
        <div className="transition-all duration-300">
          <Card className="space-y-6 p-6 bg-[#0b0a08]/60 border border-[rgba(255,255,255,0.08)] backdrop-blur-md rounded-2xl shadow-xl">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1 h-5 bg-[#f0a040] rounded-full animate-pulse" />
              <p className="text-[11px] font-mono-dashboard font-black text-[#f0a040] uppercase tracking-[0.15em]">Add Staff Member</p>
            </div>
            
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="staff-name" className="text-[#f5efe2]/40 text-[9px] font-mono-dashboard font-bold uppercase tracking-wider block">Name *</Label>
                <Input
                  id="staff-name"
                  value={form.name}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, name: e.target.value }));
                    setFormErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  placeholder="Rahul Sharma"
                  className="h-10 bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] text-[#f5efe2] placeholder-[#f5efe2]/20 focus:border-[#f0a040] text-[13px] rounded-xl outline-none"
                />
                {formErrors.name ? (
                  <p className="text-[10px] text-red-400 font-mono-dashboard mt-1">{formErrors.name}</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="staff-email" className="text-[#f5efe2]/40 text-[9px] font-mono-dashboard font-bold uppercase tracking-wider block">Email *</Label>
                <Input
                  id="staff-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, email: e.target.value }));
                    setFormErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  placeholder="rahul@example.com"
                  className="h-10 bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] text-[#f5efe2] placeholder-[#f5efe2]/20 focus:border-[#f0a040] text-[13px] rounded-xl outline-none"
                />
                {formErrors.email ? (
                  <p className="text-[10px] text-red-400 font-mono-dashboard mt-1">{formErrors.email}</p>
                ) : null}
              </div>
            </div>

            <div className="max-w-xs space-y-1.5">
              <Label className="text-[#f5efe2]/40 text-[9px] font-mono-dashboard font-bold uppercase tracking-wider block">Role *</Label>
              <Select
                value={form.role}
                onValueChange={(value) => {
                  setForm((prev) => ({ ...prev, role: value as StaffRole }));
                  setFormErrors((prev) => ({ ...prev, role: undefined }));
                }}
              >
                <SelectTrigger className="w-full bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] text-[#f5efe2] focus:border-[#f0a040]">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] text-[#f5efe2]">
                  {roleOptions.map((role) => (
                    <SelectItem key={role} value={role} className="text-[#f5efe2] focus:bg-[#f0a040]/10">
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.role ? (
                <p className="text-[10px] text-red-400 font-mono-dashboard mt-1">{formErrors.role}</p>
              ) : null}
            </div>

            <div className="flex items-center gap-3 pt-1.5">
              <button
                onClick={() => void createStaff()}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#f0a040] to-[#e85a2a] text-white text-[10px] font-mono-dashboard font-bold uppercase tracking-wider hover:brightness-110 transition-all shadow-md shadow-[#f0a040]/10 disabled:opacity-50"
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
                className="px-5 py-2.5 rounded-xl bg-transparent border border-[rgba(255,255,255,0.08)] text-[#f5efe2]/60 hover:text-white hover:bg-[rgba(255,255,255,0.02)] transition-colors text-[10px] font-mono-dashboard font-bold uppercase tracking-wider disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </Card>
        </div>
      ) : null}

      {/* Staff Table */}
      <div>
        <Card className="overflow-hidden bg-[#0b0a08]/40 border border-[rgba(255,255,255,0.08)] backdrop-blur-md rounded-2xl shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-[#0b0a08] text-left text-[9px] uppercase tracking-wider font-mono-dashboard text-[#f5efe2]/40 border-b border-[rgba(255,255,255,0.08)]">
                <tr>
                  <th className="px-4 py-4 sm:px-6">Name</th>
                  <th className="px-6 py-4 hidden md:table-cell">Email</th>
                  <th className="px-6 py-4 hidden sm:table-cell">Role</th>
                  <th className="px-4 py-4 sm:px-6">Status</th>
                  <th className="px-4 py-4 sm:px-6">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-[#f5efe2]/40 font-serif italic text-sm">
                      Loading staff...
                    </td>
                  </tr>
                ) : staff.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-[#f5efe2]/40 font-serif italic text-sm">
                      No staff yet — add your first staff member
                    </td>
                  </tr>
                ) : (
                  staff.map((member) => (
                    <tr
                      key={member.id}
                      className="border-t border-[rgba(255,255,255,0.08)] transition hover:bg-[rgba(255,255,255,0.01)]"
                    >
                      <td className="px-4 py-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "flex h-10 w-10 items-center justify-center rounded-full text-xs font-mono-dashboard font-black border border-[rgba(255,255,255,0.08)]",
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
                            <p className="font-bold text-[#f5efe2] text-sm">{member.name}</p>
                            <p className="text-[10px] font-mono-dashboard text-[#f5efe2]/40 mt-0.5 uppercase">{member.role}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell text-xs font-mono-dashboard text-[#f5efe2]/60 select-all">{member.email}</td>
                      <td className="px-6 py-4 hidden sm:table-cell">
                        <Badge
                          variant="outline"
                          className={cn("border flex items-center gap-1.5 w-fit text-[9px] font-mono-dashboard font-black uppercase py-0.5 px-2", roleBadgeMap[member.role].bg, roleBadgeMap[member.role].text, roleBadgeMap[member.role].border)}
                        >
                          {roleBadgeMap[member.role].icon}
                          {member.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 sm:px-6">
                        <button
                          onClick={() => void toggleActive(member)}
                          disabled={updatingId === member.id}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-mono-dashboard font-black uppercase tracking-wider transition-colors disabled:opacity-50 border ${
                            member.isActive
                              ? "bg-[#52d27a]/10 text-[#52d27a] border-[#52d27a]/20"
                              : "bg-transparent text-[#f5efe2]/40 border-[rgba(255,255,255,0.08)]"
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
                      <td className="px-4 py-4 sm:px-6">
                        <div className="flex items-center gap-2">
                          <Select
                            value={member.role}
                            onValueChange={(value) =>
                              void updateRole(member, value as StaffRole)
                            }
                            disabled={updatingId === member.id}
                          >
                            <SelectTrigger className="h-8 w-[120px] bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] text-[#f5efe2] text-xs font-mono-dashboard">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] text-[#f5efe2]">
                              {roleOptions.map((role) => (
                                <SelectItem key={role} value={role} className="text-[#f5efe2] focus:bg-[#f0a040]/10">
                                  {role}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <button
                            onClick={() => setDeleteCandidate(member)}
                            className="flex items-center justify-center h-8 w-8 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/25 text-rose-400 hover:text-rose-300 transition-colors"
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
        <Card className="space-y-4 p-6 bg-[#0b0a08]/60 border border-[rgba(255,255,255,0.08)] rounded-2xl shadow-sm">
          <h3 className="text-[13px] font-mono-dashboard font-black text-[#f0a040] uppercase tracking-wider flex items-center gap-2">
            <Shield className="size-4 text-[#f0a040]" />
            Role Permissions Matrix
          </h3>
          <ul className="space-y-3 text-xs text-[#f5efe2]/60 font-serif italic">
            <li className="flex items-start gap-2.5">
              <Crown className="size-4 text-red-400 flex-shrink-0" />
              <span><span className="font-mono-dashboard font-bold uppercase tracking-wider text-red-400 not-italic mr-1">ADMIN:</span> Full systems control access</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Briefcase className="size-4 text-purple-400 flex-shrink-0" />
              <span><span className="font-mono-dashboard font-bold uppercase tracking-wider text-purple-400 not-italic mr-1">MANAGER:</span> Order dispatching, menus, inventory reporting (restricted billing)</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Utensils className="size-4 text-blue-400 flex-shrink-0" />
              <span><span className="font-mono-dashboard font-bold uppercase tracking-wider text-blue-400 not-italic mr-1">WAITER:</span> Order registries management and ticket service updates</span>
            </li>
            <li className="flex items-start gap-2.5">
              <ChefHat className="size-4 text-[#f0a040] flex-shrink-0" />
              <span><span className="font-mono-dashboard font-bold uppercase tracking-wider text-[#f0a040] not-italic mr-1">KITCHEN:</span> Dedicated terminal view access only</span>
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
        <DialogContent className="bg-[#0b0a08] border border-[rgba(255,255,255,0.08)] text-[#f5efe2]">
          <DialogHeader>
            <DialogTitle className="text-[#f5efe2] font-editorial italic text-lg">Deactivate Staff Member?</DialogTitle>
            <DialogDescription className="text-[#f5efe2]/50 font-serif italic text-xs">
              This action cannot be undone. {deleteCandidate?.name} will be permanently removed from
              your active staff lists.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteCandidate(null)}
              disabled={Boolean(deletingId)}
              className="bg-transparent border border-[rgba(255,255,255,0.08)] text-[#f5efe2]/60 hover:text-white hover:bg-[rgba(255,255,255,0.02)]"
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
              className="bg-rose-500 hover:bg-rose-600 text-white"
            >
              {deletingId && deleteCandidate?.id === deletingId ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : null}
              Remove Staff
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatsCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  const colorClasses = {
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    green: "bg-[#52d27a]/10 text-[#52d27a] border-[#52d27a]/20",
    red: "bg-red-500/10 text-red-400 border-red-500/20",
    purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    orange: "bg-[#f0a040]/10 text-[#f0a040] border-[#f0a040]/20",
  };

  return (
    <div className="bg-[#0b0a08]/40 border border-[rgba(255,255,255,0.08)] backdrop-blur-md rounded-2xl p-4 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[9px] uppercase tracking-widest text-[#f5efe2]/40 font-mono-dashboard">{label}</p>
        <div className={`p-1.5 rounded-lg border ${colorClasses[color as keyof typeof colorClasses]}`}>{icon}</div>
      </div>
      <p className="text-xl font-bold text-[#f5efe2] font-mono-dashboard tabular-nums">{value}</p>
    </div>
  );
}
