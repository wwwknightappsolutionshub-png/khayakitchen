"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Link2, RefreshCw, Settings, Smartphone, Unplug, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { TableRowSkeleton } from "@/components/ui/LoadingSkeleton";
import { BackendPage } from "@/components/shared/BackendPage";
import { BACKEND_TABLE_CLASS, TableScroll } from "@/components/ui/TableScroll";
import { useAuth } from "@/hooks/useAuth";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { ApiClientError } from "@/lib/api-client";
import { applyWorkspaceRuntime } from "@/lib/workspace-runtime";
import { useToast } from "@/providers/ToastProvider";
import { authService } from "@/services/auth.service";
import { featureFlagsService } from "@/services/feature-flags.service";
import { staffService } from "@/services/staff.service";
import { workspaceService } from "@/services/workspace.service";

const ROLES = [
  { value: "staff", label: "Waiter (floor staff)" },
  { value: "kitchen", label: "Chef (kitchen)" },
  { value: "manager", label: "Manager" },
  { value: "owner", label: "Owner" },
] as const;

type StaffRole = (typeof ROLES)[number]["value"];

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { user, setUser } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";
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
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [workspaceSuccess, setWorkspaceSuccess] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [workspaceForm, setWorkspaceForm] = useState({
    currency: "",
    country: "",
    country_iso: "",
    timezone: "",
    ui_theme: "light" as "light" | "dark",
  });
  const [staffForm, setStaffForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "staff" as StaffRole,
  });
  const [staffError, setStaffError] = useState<string | null>(null);

  const displayedEmail = emailForm.email || user?.email || "";
  const canEditWorkspace = user?.role === "owner" || user?.role === "super_admin";
  const canEditWhatsApp =
    user?.role === "owner" || user?.role === "super_admin" || user?.role === "manager";

  const { data: flagsData } = useQuery({
    queryKey: ["feature-flags"],
    queryFn: () => featureFlagsService.getFlags(),
    enabled: isSuperAdmin,
  });

  const { data: workspaceData, isLoading: workspaceLoading } = useQuery({
    queryKey: ["workspace"],
    queryFn: () => workspaceService.getWorkspace(),
  });

  const { data: whatsappData, isLoading: whatsappLoading } = useQuery({
    queryKey: ["workspace-whatsapp"],
    queryFn: () => workspaceService.getWhatsApp(),
  });

  const [whatsappError, setWhatsappError] = useState<string | null>(null);
  const [whatsappSuccess, setWhatsappSuccess] = useState<string | null>(null);
  const [whatsappForm, setWhatsappForm] = useState({
    enabled: false,
    provider: "meta" as "meta" | "twilio" | "genius",
    phone_number_id: "",
    access_token: "",
    twilio_account_sid: "",
    twilio_auth_token: "",
    twilio_from: "",
  });
  const [hostedPhoneNumber, setHostedPhoneNumber] = useState("");

  const { data: staffData, isLoading: staffLoading } = useQuery({
    queryKey: ["staff"],
    queryFn: () => staffService.getStaff(),
    enabled: user?.role === "owner" || user?.role === "manager",
  });

  useEffect(() => {
    const workspace = workspaceData?.workspace;
    if (!workspace) return;
    setWorkspaceForm({
      currency: workspace.currency || "",
      country: workspace.country ?? "",
      country_iso: workspace.country_iso ?? "",
      timezone: workspace.timezone ?? "",
      ui_theme: workspace.ui_theme === "dark" ? "dark" : "light",
    });
    applyWorkspaceRuntime(workspace);
  }, [workspaceData?.workspace]);

  useEffect(() => {
    const wa = whatsappData?.whatsapp;
    if (!wa) return;
    setWhatsappForm({
      enabled: wa.enabled,
      provider:
        wa.provider === "twilio"
          ? "twilio"
          : wa.provider === "genius"
            ? "genius"
            : "meta",
      phone_number_id: wa.phone_number_id ?? "",
      access_token: "",
      twilio_account_sid: wa.twilio_account_sid ?? "",
      twilio_auth_token: "",
      twilio_from: wa.twilio_from ?? "",
    });
    setHostedPhoneNumber(wa.hosted_session?.phone_number ?? "");
  }, [whatsappData?.whatsapp]);

  const orderingUrl = useMemo(() => {
    const path = workspaceData?.workspace?.ordering_path ?? "";
    if (!path) return "";
    if (typeof window === "undefined") return path;
    return `${window.location.origin}${path}`;
  }, [workspaceData?.workspace?.ordering_path]);

  const createStaffMutation = useMutation({
    mutationFn: () => staffService.createStaff(staffForm),
    onSuccess: (response) => {
      setStaffError(null);
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      setShowStaffForm(false);
      setStaffForm({ name: "", email: "", password: "", role: "staff" });
      showToast(
        "Staff created",
        `${response.user.name} was added. An invite was sent to ${response.user.email} (if email is configured).`,
      );
    },
    onError: (err) => {
      setStaffError(err instanceof ApiClientError ? err.message : "Failed to create staff user.");
    },
  });

  const updateWorkspaceMutation = useMutation({
    mutationFn: () =>
      workspaceService.updateWorkspace({
        currency: workspaceForm.currency.trim().toUpperCase(),
        country: workspaceForm.country.trim() || null,
        country_iso: workspaceForm.country_iso.trim().toUpperCase() || null,
        timezone: workspaceForm.timezone.trim() || null,
        ui_theme: workspaceForm.ui_theme,
      }),
    onSuccess: (response) => {
      queryClient.setQueryData(["workspace"], response);
      applyWorkspaceRuntime(response.workspace);
      setWorkspaceError(null);
      setWorkspaceSuccess("Workspace settings saved.");
    },
    onError: (err) => {
      setWorkspaceSuccess(null);
      setWorkspaceError(
        err instanceof ApiClientError ? err.message : "Failed to update workspace settings.",
      );
    },
  });

  const updateWhatsAppMutation = useMutation({
    mutationFn: () =>
      workspaceService.updateWhatsApp({
        enabled: whatsappForm.enabled,
        provider: whatsappForm.provider,
        phone_number_id: whatsappForm.phone_number_id.trim() || null,
        access_token: whatsappForm.access_token.trim() || null,
        twilio_account_sid: whatsappForm.twilio_account_sid.trim() || null,
        twilio_auth_token: whatsappForm.twilio_auth_token.trim() || null,
        twilio_from: whatsappForm.twilio_from.trim() || null,
      }),
    onSuccess: (response) => {
      queryClient.setQueryData(["workspace-whatsapp"], response);
      setWhatsappForm((f) => ({ ...f, access_token: "", twilio_auth_token: "" }));
      setWhatsappError(null);
      setWhatsappSuccess("WhatsApp settings saved.");
    },
    onError: (err) => {
      setWhatsappSuccess(null);
      setWhatsappError(
        err instanceof ApiClientError ? err.message : "Failed to update WhatsApp settings.",
      );
    },
  });

  const initHostedSessionMutation = useMutation({
    mutationFn: () => workspaceService.initWhatsAppSession(),
    onSuccess: (response) => {
      queryClient.setQueryData(["workspace-whatsapp"], response);
      setWhatsappSuccess("Scan session initialized. Open QR and complete activation.");
      setWhatsappError(null);
    },
    onError: (err) => {
      setWhatsappSuccess(null);
      setWhatsappError(err instanceof ApiClientError ? err.message : "Failed to initialize session.");
    },
  });

  const activateHostedSessionMutation = useMutation({
    mutationFn: () => workspaceService.activateWhatsAppSession(hostedPhoneNumber),
    onSuccess: (response) => {
      queryClient.setQueryData(["workspace-whatsapp"], response);
      setWhatsappSuccess("Tenant WhatsApp number activated for 30 days.");
      setWhatsappError(null);
    },
    onError: (err) => {
      setWhatsappSuccess(null);
      setWhatsappError(err instanceof ApiClientError ? err.message : "Failed to activate hosted session.");
    },
  });

  const refreshHostedSessionMutation = useMutation({
    mutationFn: () => workspaceService.refreshWhatsAppSession(),
    onSuccess: (response) => {
      queryClient.setQueryData(["workspace-whatsapp"], response);
      setWhatsappSuccess("Session lifecycle extended by 30 days.");
      setWhatsappError(null);
    },
    onError: (err) => {
      setWhatsappSuccess(null);
      setWhatsappError(err instanceof ApiClientError ? err.message : "Failed to refresh session.");
    },
  });

  const disconnectHostedSessionMutation = useMutation({
    mutationFn: () => workspaceService.disconnectWhatsAppSession(),
    onSuccess: (response) => {
      queryClient.setQueryData(["workspace-whatsapp"], response);
      setWhatsappSuccess("Hosted session disconnected. Platform fallback is now active.");
      setWhatsappError(null);
    },
    onError: (err) => {
      setWhatsappSuccess(null);
      setWhatsappError(err instanceof ApiClientError ? err.message : "Failed to disconnect session.");
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

  const copyOrderingUrl = async () => {
    if (!orderingUrl) return;
    try {
      await navigator.clipboard.writeText(orderingUrl);
      setCopyMessage("Ordering link copied.");
    } catch {
      setCopyMessage("Could not copy — select the URL manually.");
    }
    window.setTimeout(() => setCopyMessage(null), 2500);
  };

  return (
    <BackendPage>
      <header className="backend-header">
        <div className="flex items-center gap-3">
          <Settings className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-sm text-muted">Account and system configuration</p>
          </div>
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
            <CardTitle>Workspace</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {workspaceLoading ? (
              <p className="text-sm text-muted">Loading workspace…</p>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Currency code"
                    value={workspaceForm.currency}
                    disabled={!canEditWorkspace}
                    onChange={(e) =>
                      setWorkspaceForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))
                    }
                  />
                  <Input
                    label="Country"
                    value={workspaceForm.country}
                    disabled={!canEditWorkspace}
                    onChange={(e) => setWorkspaceForm((f) => ({ ...f, country: e.target.value }))}
                  />
                  <Input
                    label="Country ISO"
                    value={workspaceForm.country_iso}
                    disabled={!canEditWorkspace}
                    onChange={(e) =>
                      setWorkspaceForm((f) => ({
                        ...f,
                        country_iso: e.target.value.toUpperCase().slice(0, 2),
                      }))
                    }
                  />
                  <Input
                    label="Timezone"
                    value={workspaceForm.timezone}
                    disabled={!canEditWorkspace}
                    placeholder="e.g. Africa/Lagos"
                    onChange={(e) => setWorkspaceForm((f) => ({ ...f, timezone: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Theme</label>
                  <select
                    className="h-10 w-full rounded-[var(--radius)] border border-border bg-surface-elevated px-3 text-sm"
                    value={workspaceForm.ui_theme}
                    disabled={!canEditWorkspace}
                    onChange={(e) =>
                      setWorkspaceForm((f) => ({
                        ...f,
                        ui_theme: e.target.value === "dark" ? "dark" : "light",
                      }))
                    }
                  >
                    <option value="light">Light (default)</option>
                    <option value="dark">Dark</option>
                  </select>
                  <p className="mt-1 text-xs text-muted">
                    Default for mobile and tablet is light. Switch to dark when needed.
                  </p>
                </div>
                {workspaceError && (
                  <p className="rounded-[var(--radius)] bg-danger/10 px-3 py-2 text-sm text-danger">
                    {workspaceError}
                  </p>
                )}
                {workspaceSuccess && (
                  <p className="rounded-[var(--radius)] bg-secondary/10 px-3 py-2 text-sm text-secondary">
                    {workspaceSuccess}
                  </p>
                )}
                {canEditWorkspace && (
                  <Button
                    onClick={() => updateWorkspaceMutation.mutate()}
                    isLoading={updateWorkspaceMutation.isPending}
                    disabled={!workspaceForm.currency.trim()}
                  >
                    Save workspace
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              <CardTitle>Ordering page</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted">
              Share this unique link so customers open your menu for this restaurant.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input label="Ordering URL" value={orderingUrl} readOnly />
              <Button
                type="button"
                variant="secondary"
                className="sm:mt-6"
                onClick={() => void copyOrderingUrl()}
                disabled={!orderingUrl}
              >
                <Copy className="h-4 w-4" />
                Copy link
              </Button>
            </div>
            {copyMessage && <p className="text-sm text-secondary">{copyMessage}</p>}
            {orderingUrl ? (
              <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(orderingUrl)}`}
                  alt="Ordering page QR code"
                  width={160}
                  height={160}
                  className="rounded-[var(--radius)] border border-border bg-white p-2"
                />
                <p className="text-sm text-muted">
                  Customers can scan this QR code to open your ordering page on their phone.
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>WhatsApp Business</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {whatsappLoading ? (
              <p className="text-sm text-muted">Loading WhatsApp settings…</p>
            ) : (
              <>
                <p className="text-sm text-muted">
                  Connect your own WhatsApp sender. For hosted mode, scan your number once and
                  KhayaOS sends through the platform API using your active 30-day session.
                  When unavailable, platform fallback is used.
                </p>
                {whatsappData?.whatsapp?.using_platform_fallback ? (
                  <p className="rounded-[var(--radius)] bg-secondary/10 px-3 py-2 text-sm text-secondary">
                    Currently sending via platform WhatsApp
                    {whatsappData.whatsapp.platform_configured ? "" : " (not configured yet)"}.
                  </p>
                ) : (
                  <p className="rounded-[var(--radius)] bg-secondary/10 px-3 py-2 text-sm text-secondary">
                    Currently sending via your tenant WhatsApp credentials.
                  </p>
                )}
                <label className="flex cursor-pointer items-center justify-between gap-3">
                  <span className="text-sm font-medium">Use tenant WhatsApp credentials</span>
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    disabled={!canEditWhatsApp}
                    checked={whatsappForm.enabled}
                    onChange={(e) =>
                      setWhatsappForm((f) => ({ ...f, enabled: e.target.checked }))
                    }
                  />
                </label>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Provider</label>
                  <select
                    className="h-10 w-full rounded-[var(--radius)] border border-border bg-surface-elevated px-3 text-sm"
                    value={whatsappForm.provider}
                    disabled={!canEditWhatsApp}
                    onChange={(e) =>
                      setWhatsappForm((f) => ({
                        ...f,
                        provider:
                          e.target.value === "twilio"
                            ? "twilio"
                            : e.target.value === "genius"
                              ? "genius"
                              : "meta",
                      }))
                    }
                  >
                    <option value="genius">Hosted session (scan number)</option>
                    <option value="meta">Meta Cloud API</option>
                    <option value="twilio">Twilio</option>
                  </select>
                </div>
                {whatsappForm.provider === "genius" ? (
                  <div className="space-y-3 rounded-[var(--radius)] border border-border bg-surface-elevated/40 p-4">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-primary" />
                      <p className="text-sm font-medium">Tenant hosted WhatsApp session</p>
                    </div>
                    <p className="text-xs text-muted">
                      Lifecycle is 30 days. Initialize a scan session, then activate with the
                      WhatsApp number you connected.
                    </p>
                    {whatsappData?.whatsapp?.hosted_session?.qr_payload ? (
                      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=170x170&data=${encodeURIComponent(
                            whatsappData.whatsapp.hosted_session.qr_payload,
                          )}`}
                          alt="WhatsApp hosted session QR"
                          width={170}
                          height={170}
                          className="rounded-[var(--radius)] border border-border bg-white p-2"
                        />
                        <div className="text-xs text-muted">
                          <p>Status: {whatsappData.whatsapp.hosted_session.status}</p>
                          <p>
                            Remaining days:{" "}
                            {whatsappData.whatsapp.hosted_session.remaining_days ?? "—"}
                          </p>
                        </div>
                      </div>
                    ) : null}
                    <Input
                      label="Connected WhatsApp number"
                      value={hostedPhoneNumber}
                      disabled={!canEditWhatsApp}
                      placeholder="+447..."
                      onChange={(e) => setHostedPhoneNumber(e.target.value)}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={!canEditWhatsApp}
                        isLoading={initHostedSessionMutation.isPending}
                        onClick={() => initHostedSessionMutation.mutate()}
                      >
                        Start scan session
                      </Button>
                      <Button
                        type="button"
                        disabled={!canEditWhatsApp || !hostedPhoneNumber.trim()}
                        isLoading={activateHostedSessionMutation.isPending}
                        onClick={() => activateHostedSessionMutation.mutate()}
                      >
                        Activate session
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={!canEditWhatsApp}
                        isLoading={refreshHostedSessionMutation.isPending}
                        onClick={() => refreshHostedSessionMutation.mutate()}
                      >
                        <RefreshCw className="h-4 w-4" />
                        Refresh 30 days
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={!canEditWhatsApp}
                        isLoading={disconnectHostedSessionMutation.isPending}
                        onClick={() => disconnectHostedSessionMutation.mutate()}
                      >
                        <Unplug className="h-4 w-4" />
                        Disconnect
                      </Button>
                    </div>
                  </div>
                ) : whatsappForm.provider === "meta" ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      label="Phone number ID"
                      value={whatsappForm.phone_number_id}
                      disabled={!canEditWhatsApp}
                      onChange={(e) =>
                        setWhatsappForm((f) => ({ ...f, phone_number_id: e.target.value }))
                      }
                    />
                    <Input
                      label={
                        whatsappData?.whatsapp?.has_access_token
                          ? "Access token (leave blank to keep)"
                          : "Access token"
                      }
                      type="password"
                      value={whatsappForm.access_token}
                      disabled={!canEditWhatsApp}
                      onChange={(e) =>
                        setWhatsappForm((f) => ({ ...f, access_token: e.target.value }))
                      }
                    />
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      label="Twilio Account SID"
                      value={whatsappForm.twilio_account_sid}
                      disabled={!canEditWhatsApp}
                      onChange={(e) =>
                        setWhatsappForm((f) => ({ ...f, twilio_account_sid: e.target.value }))
                      }
                    />
                    <Input
                      label={
                        whatsappData?.whatsapp?.has_twilio_auth_token
                          ? "Auth token (leave blank to keep)"
                          : "Auth token"
                      }
                      type="password"
                      value={whatsappForm.twilio_auth_token}
                      disabled={!canEditWhatsApp}
                      onChange={(e) =>
                        setWhatsappForm((f) => ({ ...f, twilio_auth_token: e.target.value }))
                      }
                    />
                    <Input
                      label="From number"
                      value={whatsappForm.twilio_from}
                      disabled={!canEditWhatsApp}
                      placeholder="whatsapp:+1415..."
                      onChange={(e) =>
                        setWhatsappForm((f) => ({ ...f, twilio_from: e.target.value }))
                      }
                    />
                  </div>
                )}
                {whatsappError && (
                  <p className="rounded-[var(--radius)] bg-danger/10 px-3 py-2 text-sm text-danger">
                    {whatsappError}
                  </p>
                )}
                {whatsappSuccess && (
                  <p className="rounded-[var(--radius)] bg-secondary/10 px-3 py-2 text-sm text-secondary">
                    {whatsappSuccess}
                  </p>
                )}
                {canEditWhatsApp && (
                  <Button
                    onClick={() => updateWhatsAppMutation.mutate()}
                    isLoading={updateWhatsAppMutation.isPending}
                  >
                    Save WhatsApp
                  </Button>
                )}
              </>
            )}
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

        {isSuperAdmin && (
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
        )}

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
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
                {staffError && (
                  <p className="rounded-[var(--radius)] bg-danger/10 px-3 py-2 text-sm text-danger">
                    {staffError}
                  </p>
                )}
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
                    label="Temporary password"
                    type="password"
                    value={staffForm.password}
                    onChange={(e) => setStaffForm((f) => ({ ...f, password: e.target.value }))}
                    tooltip="Sent to the staff email. Minimum 8 characters."
                  />
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Role</label>
                    <select
                      className="h-10 w-full rounded-[var(--radius)] border border-border bg-surface-elevated px-3 text-sm"
                      value={staffForm.role}
                      onChange={(e) =>
                        setStaffForm((f) => ({
                          ...f,
                          role: e.target.value as StaffRole,
                        }))
                      }
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
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

            <TableScroll bordered={false}>
              <table className={BACKEND_TABLE_CLASS}>
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
                      <td className="px-4 py-3">
                        {ROLES.find((r) => r.value === member.role)?.label ?? member.role}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={member.status === "disabled" ? "outline" : "secondary"}>
                          {member.status ?? "active"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          </CardContent>
        </Card>

        {isSuperAdmin && (
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
        )}
      </div>
    </BackendPage>
  );
}
