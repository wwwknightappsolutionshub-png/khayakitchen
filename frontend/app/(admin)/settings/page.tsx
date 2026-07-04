"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Settings, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { TableRowSkeleton } from "@/components/ui/LoadingSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { ApiClientError } from "@/lib/api-client";
import { authService } from "@/services/auth.service";
import { featureFlagsService } from "@/services/feature-flags.service";
import { staffService } from "@/services/staff.service";

const ROLES = ["owner", "manager", "kitchen", "staff"] as const;

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { user, setUser } = useAuth();
  const { flags } = useFeatureFlags();
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [emailForm, setEmailForm] = useState({ email: "", currentPassword: "" });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    password: "",
    passwordConfirmation: "",
  });
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [staffForm, setStaffForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "staff" as (typeof ROLES)[number],
  });

  const displayedEmail = emailForm.email || user?.email || "";

  const { data: flagsData } = useQuery({
    queryKey: ["feature-flags"],
    queryFn: () => featureFlagsService.getFlags(),
  });

  const { data: staffData, isLoading: staffLoading } = useQuery({
    queryKey: ["staff"],
    queryFn: () => staffService.getStaff(),
    enabled: user?.role === "owner" || user?.role === "manager",
  });

  const createStaffMutation = useMutation({
    mutationFn: () => staffService.createStaff(staffForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      setShowStaffForm(false);
      setStaffForm({ name: "", email: "", password: "", role: "staff" });
    },
  });

  const updateEmailMutation = useMutation({
    mutationFn: () => authService.updateEmail(displayedEmail, emailForm.currentPassword),
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      queryClient.invalidateQueries({ queryKey: ["auth"] });
      setEmailForm({ email: updatedUser.email ?? "", currentPassword: "" });
      setEmailError(null);
      setEmailSuccess("Email updated successfully.");
    },
    onError: (err) => {
      setEmailSuccess(null);
      setEmailError(err instanceof ApiClientError ? err.message : "Failed to update email.");
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: () =>
      authService.updatePassword(
        passwordForm.currentPassword,
        passwordForm.password,
        passwordForm.passwordConfirmation,
      ),
    onSuccess: () => {
      setPasswordForm({
        currentPassword: "",
        password: "",
        passwordConfirmation: "",
      });
      setPasswordError(null);
      setPasswordSuccess("Password updated successfully.");
    },
    onError: (err) => {
      setPasswordSuccess(null);
      setPasswordError(err instanceof ApiClientError ? err.message : "Failed to update password.");
    },
  });

  const allFlags = flagsData?.flags ?? flags;
  const staff = staffData?.users ?? [];
  const canManageStaff = user?.role === "owner" || user?.role === "manager";

  return (
    <div className="animate-fade-in">
      <header className="mb-6 flex items-center gap-3">
        <Settings className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted">Account and system configuration</p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Name</span>
              <span className="font-medium">{user?.name ?? "—"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Email</span>
              <span className="font-medium">{user?.email ?? "—"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Role</span>
              <Badge variant="primary" className="capitalize">
                {user?.role ?? "—"}
              </Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Tenant ID</span>
              <span className="font-mono text-xs">{user?.tenant_id ?? "—"}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Change email</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="New email"
              type="email"
              autoComplete="email"
              value={displayedEmail}
              onChange={(e) => setEmailForm((f) => ({ ...f, email: e.target.value }))}
            />
            <Input
              label="Current password"
              type="password"
              autoComplete="current-password"
              value={emailForm.currentPassword}
              onChange={(e) => setEmailForm((f) => ({ ...f, currentPassword: e.target.value }))}
            />
            {emailError && (
              <p className="rounded-[var(--radius)] bg-danger/10 px-3 py-2 text-sm text-danger">
                {emailError}
              </p>
            )}
            {emailSuccess && (
              <p className="rounded-[var(--radius)] bg-secondary/10 px-3 py-2 text-sm text-secondary">
                {emailSuccess}
              </p>
            )}
            <Button
              onClick={() => updateEmailMutation.mutate()}
              isLoading={updateEmailMutation.isPending}
              disabled={
                !displayedEmail.trim() ||
                !emailForm.currentPassword ||
                displayedEmail === user?.email
              }
            >
              Update email
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Change password</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Current password"
              type="password"
              autoComplete="current-password"
              value={passwordForm.currentPassword}
              onChange={(e) =>
                setPasswordForm((f) => ({ ...f, currentPassword: e.target.value }))
              }
            />
            <Input
              label="New password"
              type="password"
              autoComplete="new-password"
              value={passwordForm.password}
              onChange={(e) => setPasswordForm((f) => ({ ...f, password: e.target.value }))}
            />
            <Input
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              value={passwordForm.passwordConfirmation}
              onChange={(e) =>
                setPasswordForm((f) => ({ ...f, passwordConfirmation: e.target.value }))
              }
            />
            {passwordError && (
              <p className="rounded-[var(--radius)] bg-danger/10 px-3 py-2 text-sm text-danger">
                {passwordError}
              </p>
            )}
            {passwordSuccess && (
              <p className="rounded-[var(--radius)] bg-secondary/10 px-3 py-2 text-sm text-secondary">
                {passwordSuccess}
              </p>
            )}
            <Button
              onClick={() => updatePasswordMutation.mutate()}
              isLoading={updatePasswordMutation.isPending}
              disabled={
                !passwordForm.currentPassword ||
                passwordForm.password.length < 8 ||
                passwordForm.password !== passwordForm.passwordConfirmation
              }
            >
              Update password
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Feature Flags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(allFlags).map(([module, enabled]) => (
                <div key={module} className="flex items-center justify-between text-sm">
                  <span className="capitalize">{module.replace(/_/g, " ")}</span>
                  <Badge variant={enabled ? "secondary" : "outline"}>
                    {enabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              ))}
              {Object.keys(allFlags).length === 0 && (
                <p className="text-sm text-muted">No feature flags configured</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle>Staff users</CardTitle>
            </div>
            {canManageStaff && (
              <Button size="sm" onClick={() => setShowStaffForm((v) => !v)}>
                Add staff
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {showStaffForm && canManageStaff && (
              <div className="mb-6 space-y-4 rounded-[var(--radius)] border border-border bg-surface-elevated/50 p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Name"
                    value={staffForm.name}
                    onChange={(e) => setStaffForm((f) => ({ ...f, name: e.target.value }))}
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={staffForm.email}
                    onChange={(e) => setStaffForm((f) => ({ ...f, email: e.target.value }))}
                  />
                  <Input
                    label="Password"
                    type="password"
                    value={staffForm.password}
                    onChange={(e) => setStaffForm((f) => ({ ...f, password: e.target.value }))}
                  />
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Role</label>
                    <select
                      className="h-10 w-full rounded-[var(--radius)] border border-border bg-surface-elevated px-3 text-sm"
                      value={staffForm.role}
                      onChange={(e) =>
                        setStaffForm((f) => ({
                          ...f,
                          role: e.target.value as (typeof ROLES)[number],
                        }))
                      }
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r} className="capitalize">
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <Button
                  onClick={() => createStaffMutation.mutate()}
                  isLoading={createStaffMutation.isPending}
                  disabled={
                    !staffForm.name.trim() ||
                    !staffForm.email.trim() ||
                    staffForm.password.length < 8
                  }
                >
                  Create staff user
                </Button>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted">
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {staffLoading &&
                    Array.from({ length: 3 }).map((_, i) => <TableRowSkeleton key={i} cols={4} />)}
                  {!staffLoading && staff.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-muted">
                        {canManageStaff ? "No staff users yet" : "Staff list requires owner or manager role"}
                      </td>
                    </tr>
                  )}
                  {staff.map((member) => (
                    <tr key={member.id} className="border-b border-border">
                      <td className="px-4 py-3 font-medium">{member.name}</td>
                      <td className="px-4 py-3 text-muted">{member.email}</td>
                      <td className="px-4 py-3 capitalize">{member.role}</td>
                      <td className="px-4 py-3">
                        <Badge variant={member.status === "disabled" ? "outline" : "secondary"}>
                          {member.status ?? "active"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Audit & compliance
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-muted">
              Review who changed what across menu, inventory, orders, and settings.
            </p>
            <Link href="/audit">
              <Button variant="secondary">View audit logs</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>API Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">API URL</span>
              <span className="font-mono text-xs">
                {process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Environment</span>
              <Badge variant="outline">{process.env.NODE_ENV}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
