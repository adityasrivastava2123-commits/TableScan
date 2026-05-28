"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios, { AxiosError } from "axios";
import toast from "react-hot-toast";
import { Trash2, Plus, Loader2 } from "lucide-react";
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

const roleBadgeMap: Record<StaffRole, string> = {
  ADMIN: "bg-red-500/15 text-red-700 border-red-300",
  MANAGER: "bg-purple-500/15 text-purple-700 border-purple-300",
  WAITER: "bg-blue-500/15 text-blue-700 border-blue-300",
  KITCHEN: "bg-orange-500/15 text-orange-700 border-orange-300",
};

const roleAvatarMap: Record<StaffRole, string> = {
  ADMIN: "bg-red-100 text-red-700",
  MANAGER: "bg-purple-100 text-purple-700",
  WAITER: "bg-blue-100 text-blue-700",
  KITCHEN: "bg-orange-100 text-orange-700",
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Staff Accounts</h1>
          <p className="text-sm text-muted-foreground">
            Manage staff members and role-based responsibilities.
          </p>
        </div>
        <Button onClick={() => setShowForm((prev) => !prev)} className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600">
          <Plus className="mr-1 h-4 w-4" />
          Add Staff
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatsCard label="Total Staff" value={stats.total} />
        <StatsCard label="Active Staff" value={stats.active} />
        <StatsCard label="Admins" value={stats.roleCounts.ADMIN} />
        <StatsCard label="Managers" value={stats.roleCounts.MANAGER} />
        <StatsCard label="Waiters" value={stats.roleCounts.WAITER} />
        <StatsCard label="Kitchen" value={stats.roleCounts.KITCHEN} />
      </div>

      {showForm ? (
        <Card className="space-y-4 p-5">
          <h2 className="text-lg font-semibold">Add Staff Member</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="staff-name">Name *</Label>
              <Input
                id="staff-name"
                value={form.name}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, name: e.target.value }));
                  setFormErrors((prev) => ({ ...prev, name: undefined }));
                }}
                placeholder="Rahul Sharma"
              />
              {formErrors.name ? (
                <p className="text-xs text-destructive">{formErrors.name}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="staff-email">Email *</Label>
              <Input
                id="staff-email"
                type="email"
                value={form.email}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, email: e.target.value }));
                  setFormErrors((prev) => ({ ...prev, email: undefined }));
                }}
                placeholder="rahul@example.com"
              />
              {formErrors.email ? (
                <p className="text-xs text-destructive">{formErrors.email}</p>
              ) : null}
            </div>
          </div>

          <div className="max-w-xs space-y-2">
            <Label>Role *</Label>
            <Select
              value={form.role}
              onValueChange={(value) => {
                setForm((prev) => ({ ...prev, role: value as StaffRole }));
                setFormErrors((prev) => ({ ...prev, role: undefined }));
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formErrors.role ? (
              <p className="text-xs text-destructive">{formErrors.role}</p>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={() => void createStaff()} disabled={saving} className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600">
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowForm(false);
                setFormErrors({});
              }}
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
        </Card>
      ) : null}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                    Loading staff...
                  </td>
                </tr>
              ) : staff.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                    No staff yet — add your first staff member
                  </td>
                </tr>
              ) : (
                staff.map((member) => (
                  <tr key={member.id} className="border-t transition hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold",
                            roleAvatarMap[member.role],
                          )}
                        >
                          {member.name
                            .split(" ")
                            .slice(0, 2)
                            .map((word) => word[0]?.toUpperCase())
                            .join("")}
                        </div>
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{member.email}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={cn("border", roleBadgeMap[member.role])}
                      >
                        {member.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant={member.isActive ? "default" : "outline"}
                        size="sm"
                        onClick={() => void toggleActive(member)}
                        disabled={updatingId === member.id}
                        className={member.isActive ? "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600" : ""}
                      >
                        {updatingId === member.id ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : null}
                        {member.isActive ? "Active" : "Inactive"}
                      </Button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Select
                          value={member.role}
                          onValueChange={(value) =>
                            void updateRole(member, value as StaffRole)
                          }
                          disabled={updatingId === member.id}
                        >
                          <SelectTrigger size="sm" className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {roleOptions.map((role) => (
                              <SelectItem key={role} value={role}>
                                {role}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Button
                          variant="destructive"
                          size="icon-sm"
                          onClick={() => setDeleteCandidate(member)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="space-y-3 p-5">
        <h3 className="text-lg font-semibold">Role Permissions</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">ADMIN:</span> Full access to
            everything
          </li>
          <li>
            <span className="font-medium text-foreground">MANAGER:</span> Orders, menu,
            reports (no billing)
          </li>
          <li>
            <span className="font-medium text-foreground">WAITER:</span> View orders, call
            status updates
          </li>
          <li>
            <span className="font-medium text-foreground">KITCHEN:</span> Kitchen display
            only
          </li>
        </ul>
      </Card>

      <Dialog
        open={Boolean(deleteCandidate)}
        onOpenChange={(open) => {
          if (!open) setDeleteCandidate(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete staff member?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. {deleteCandidate?.name} will be removed from
              your staff list.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteCandidate(null)}
              disabled={Boolean(deletingId)}
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

function StatsCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </Card>
  );
}

