"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ColorField } from "@/components/ui/ColorField";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/hooks/useAuth";
import { ApiClientError } from "@/lib/api-client";
import { authService } from "@/services/auth.service";
import { platformSettingsService } from "@/services/platform-settings.service";
import type { PlatformSettings } from "@/lib/types";
import { BackendPage } from "@/components/shared/BackendPage";

export default function PlatformSettingsPage() {
  const queryClient = useQueryClient();
  const { user, setUser } = useAuth();
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
  const [splashForm, setSplashForm] = useState<Partial<PlatformSettings>>({});
  const [logoUploadProgress, setLogoUploadProgress] = useState<string | null>(null);
  const [splashUploadProgress, setSplashUploadProgress] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [splashUploading, setSplashUploading] = useState(false);
  const [splashSaveSuccess, setSplashSaveSuccess] = useState<string | null>(null);
  const [whatsappError, setWhatsappError] = useState<string | null>(null);
  const [whatsappSuccess, setWhatsappSuccess] = useState<string | null>(null);
  const [whatsappTestError, setWhatsappTestError] = useState<string | null>(null);
  const [whatsappTestSuccess, setWhatsappTestSuccess] = useState<string | null>(null);
  const [whatsappTestForm, setWhatsappTestForm] = useState({
    phone: "",
    message: "",
  });
  const [whatsappForm, setWhatsappForm] = useState({
    enabled: false,
    provider: "genius" as "genius" | "meta" | "twilio",
    api_key: "",
    session_id: "",
    base_url: "https://restapi.geniusdevel.com",
    meta_phone_number_id: "",
    meta_access_token: "",
    twilio_account_sid: "",
    twilio_auth_token: "",
    twilio_from: "",
  });

  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ["platform", "settings"],
    queryFn: () => platformSettingsService.getSettings(),
  });

  const { data: whatsappData, isLoading: whatsappLoading } = useQuery({
    queryKey: ["platform", "whatsapp"],
    queryFn: () => platformSettingsService.getWhatsApp(),
  });

  useEffect(() => {
    const wa = whatsappData?.whatsapp;
    if (!wa) return;
    setWhatsappForm((prev) => ({
      ...prev,
      enabled: wa.enabled,
      provider: wa.provider,
      session_id: wa.session_id ?? "",
      base_url: wa.base_url ?? "https://restapi.geniusdevel.com",
      meta_phone_number_id: wa.meta_phone_number_id ?? "",
      twilio_account_sid: wa.twilio_account_sid ?? "",
      twilio_from: wa.twilio_from ?? "",
      // Keep secret fields blank unless user types new values
      api_key: "",
      meta_access_token: "",
      twilio_auth_token: "",
    }));
  }, [whatsappData?.whatsapp]);

  const settings = settingsData?.settings;
  const displayedEmail = emailForm.email || user?.email || "";
  const displayedSettings = { ...settings, ...splashForm };
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

  const updateSplashMutation = useMutation({
    mutationFn: () => platformSettingsService.updateSettings(splashForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform", "settings"] });
      queryClient.invalidateQueries({ queryKey: ["platform", "public-config"] });
      setSplashForm({});
      setSplashSaveSuccess("Splash screen settings saved.");
    },
  });

  const updateWhatsAppMutation = useMutation({
    mutationFn: () =>
      platformSettingsService.updateWhatsApp({
        enabled: whatsappForm.enabled,
        provider: whatsappForm.provider,
        api_key: whatsappForm.api_key.trim() || null,
        session_id: whatsappForm.session_id.trim() || null,
        base_url: whatsappForm.base_url.trim() || null,
        meta_phone_number_id: whatsappForm.meta_phone_number_id.trim() || null,
        meta_access_token: whatsappForm.meta_access_token.trim() || null,
        twilio_account_sid: whatsappForm.twilio_account_sid.trim() || null,
        twilio_auth_token: whatsappForm.twilio_auth_token.trim() || null,
        twilio_from: whatsappForm.twilio_from.trim() || null,
      }),
    onSuccess: (response) => {
      queryClient.setQueryData(["platform", "whatsapp"], response);
      setWhatsappError(null);
      setWhatsappSuccess("WhatsApp platform sender saved.");
    },
    onError: (err) => {
      setWhatsappSuccess(null);
      setWhatsappError(
        err instanceof ApiClientError ? err.message : "Failed to update WhatsApp settings.",
      );
    },
  });

  const sendWhatsAppTestMutation = useMutation({
    mutationFn: () =>
      platformSettingsService.sendWhatsAppTest({
        phone: whatsappTestForm.phone.trim(),
        message: whatsappTestForm.message.trim() || undefined,
      }),
    onSuccess: (response) => {
      setWhatsappTestError(null);
      setWhatsappTestSuccess(
        response.sent
          ? `Sent via ${response.provider} to ${response.phone}.`
          : (response.error ?? "WhatsApp test did not confirm delivery."),
      );
    },
    onError: (err) => {
      setWhatsappTestSuccess(null);
      setWhatsappTestError(
        err instanceof ApiClientError ? err.message : "Failed to send WhatsApp test.",
      );
    },
  });

  const handleLogoUpload = async (file: File) => {
    setLogoUploading(true);
    setLogoUploadProgress("Uploading…");
    try {
      await platformSettingsService.uploadLogo(file);
      setLogoUploadProgress("Upload complete");
      queryClient.invalidateQueries({ queryKey: ["platform", "settings"] });
      queryClient.invalidateQueries({ queryKey: ["platform", "public-config"] });
    } catch {
      setLogoUploadProgress("Upload failed — try again");
    } finally {
      setLogoUploading(false);
      setTimeout(() => setLogoUploadProgress(null), 3000);
    }
  };

  const handleSplashImageUpload = async (file: File) => {
    setSplashUploading(true);
    setSplashUploadProgress("Uploading…");
    try {
      await platformSettingsService.uploadSplashImage(file);
      setSplashUploadProgress("Upload complete");
      queryClient.invalidateQueries({ queryKey: ["platform", "settings"] });
      queryClient.invalidateQueries({ queryKey: ["platform", "public-config"] });
    } catch {
      setSplashUploadProgress("Upload failed — try again");
    } finally {
      setSplashUploading(false);
      setTimeout(() => setSplashUploadProgress(null), 3000);
    }
  };

  return (
    <BackendPage>
      <header className="mb-8 flex items-center gap-3">
        <Settings className="h-7 w-7 text-violet-400" />
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-violet-400">
            Platform Control
          </p>
          <h1 className="mt-1 text-2xl font-bold text-violet-50">Platform Settings</h1>
          <p className="text-sm text-violet-200/60">
            Account security, splash screen, and app owner branding
          </p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-violet-500/15 bg-[#0f1117]">
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-violet-200/60">Name</span>
              <span className="font-medium text-violet-50">{user?.name ?? "—"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-violet-200/60">Email</span>
              <span className="font-medium text-violet-50">{user?.email ?? "—"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-violet-200/60">Role</span>
              <Badge variant="primary" className="capitalize">
                {user?.role ?? "—"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-violet-500/15 bg-[#0f1117]">
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

        <Card className="border-violet-500/15 bg-[#0f1117] lg:col-span-2">
          <CardHeader>
            <CardTitle>Change password</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-3">
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
            </div>
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

        <Card className="border-violet-500/15 bg-[#0f1117] lg:col-span-2">
          <CardHeader>
            <CardTitle>Welcome splash screen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {settingsLoading || !settings ? (
              <p className="text-sm text-muted">Loading splash settings…</p>
            ) : (
              <>
                <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius)] border border-border p-4">
                  <input
                    type="checkbox"
                    className="mt-0.5 accent-primary"
                    checked={displayedSettings.splash_enabled ?? true}
                    onChange={(e) =>
                      setSplashForm((f) => ({ ...f, splash_enabled: e.target.checked }))
                    }
                  />
                  <div>
                    <p className="text-sm font-medium">Show splash for first-time visitors</p>
                    <p className="mt-0.5 text-xs text-muted">
                      Customers see sign up or continue as guest before entering the app
                    </p>
                  </div>
                </label>
                <div className="grid gap-4 lg:grid-cols-2">
                  <Input
                    label="App name"
                    value={displayedSettings.app_name ?? ""}
                    onChange={(e) => setSplashForm((f) => ({ ...f, app_name: e.target.value }))}
                  />
                  <Input
                    label="Splash headline"
                    value={displayedSettings.splash_headline ?? ""}
                    onChange={(e) =>
                      setSplashForm((f) => ({ ...f, splash_headline: e.target.value }))
                    }
                  />
                </div>
                <Input
                  label="Splash subheadline"
                  value={displayedSettings.splash_subheadline ?? ""}
                  onChange={(e) =>
                    setSplashForm((f) => ({ ...f, splash_subheadline: e.target.value }))
                  }
                />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <ColorField
                    label="Primary color"
                    value={displayedSettings.primary_color ?? "#004D40"}
                    onChange={(hex) => setSplashForm((f) => ({ ...f, primary_color: hex }))}
                  />
                  <ColorField
                    label="Secondary color"
                    value={displayedSettings.secondary_color ?? "#81B29A"}
                    onChange={(hex) => setSplashForm((f) => ({ ...f, secondary_color: hex }))}
                  />
                  <ColorField
                    label="Accent color"
                    value={displayedSettings.accent_color ?? "#F2CC8F"}
                    onChange={(hex) => setSplashForm((f) => ({ ...f, accent_color: hex }))}
                  />
                  <ColorField
                    label="Background color"
                    value={displayedSettings.background_color ?? "#F4F1DE"}
                    onChange={(hex) => setSplashForm((f) => ({ ...f, background_color: hex }))}
                  />
                </div>
                <div className="grid gap-6 lg:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">App logo</label>
                    {displayedSettings.logo_url && (
                      <img
                        src={displayedSettings.logo_url}
                        alt="App logo"
                        className="mb-2 h-16 w-16 rounded-lg border border-border object-cover"
                      />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={logoUploading}
                      className="block w-full text-sm text-muted file:mr-3 file:rounded-[var(--radius)] file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleLogoUpload(file);
                        e.target.value = "";
                      }}
                    />
                    {logoUploadProgress && (
                      <p className="mt-1 text-xs text-muted">{logoUploadProgress}</p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Splash hero image</label>
                    {displayedSettings.splash_image_url && (
                      <img
                        src={displayedSettings.splash_image_url}
                        alt="Splash hero"
                        className="mb-2 h-32 w-full rounded-lg border border-border object-cover"
                      />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={splashUploading}
                      className="block w-full text-sm text-muted file:mr-3 file:rounded-[var(--radius)] file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleSplashImageUpload(file);
                        e.target.value = "";
                      }}
                    />
                    {splashUploadProgress && (
                      <p className="mt-1 text-xs text-muted">{splashUploadProgress}</p>
                    )}
                  </div>
                </div>
                {splashSaveSuccess && (
                  <p className="rounded-[var(--radius)] bg-secondary/10 px-3 py-2 text-sm text-secondary">
                    {splashSaveSuccess}
                  </p>
                )}
                <Button
                  onClick={() => updateSplashMutation.mutate()}
                  isLoading={updateSplashMutation.isPending}
                  disabled={Object.keys(splashForm).length === 0}
                >
                  Save splash settings
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-violet-500/15 bg-[#0f1117] lg:col-span-2">
          <CardHeader>
            <CardTitle>Public pricing page</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {settingsLoading || !settings ? (
              <p className="text-sm text-muted">Loading pricing settings…</p>
            ) : (
              <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius)] border border-border p-4">
                <input
                  type="checkbox"
                  className="mt-0.5 accent-primary"
                  checked={displayedSettings.public_pricing_enabled ?? true}
                  onChange={(e) =>
                    setSplashForm((f) => ({ ...f, public_pricing_enabled: e.target.checked }))
                  }
                />
                <div>
                  <p className="text-sm font-medium">Show public pricing page</p>
                  <p className="mt-0.5 text-xs text-muted">
                    When disabled, /pricing returns 404 for visitors. Saved with splash settings.
                  </p>
                </div>
              </label>
            )}
          </CardContent>
        </Card>

        <Card className="border-violet-500/15 bg-[#0f1117] lg:col-span-2">
          <CardHeader>
            <CardTitle>Storefront news ticker</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {settingsLoading || !settings ? (
              <p className="text-sm text-muted">Loading ticker settings…</p>
            ) : (
              <>
                <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius)] border border-border p-4">
                  <input
                    type="checkbox"
                    className="mt-0.5 accent-primary"
                    checked={displayedSettings.ticker_enabled ?? true}
                    onChange={(e) =>
                      setSplashForm((f) => ({ ...f, ticker_enabled: e.target.checked }))
                    }
                  />
                  <div>
                    <p className="text-sm font-medium">Show default news ticker</p>
                    <p className="mt-0.5 text-xs text-muted">
                      Platform default for all tenants unless overridden or disabled per tenant
                    </p>
                  </div>
                </label>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Ticker messages</label>
                  <textarea
                    rows={4}
                    value={displayedSettings.ticker_text ?? ""}
                    onChange={(e) => setSplashForm((f) => ({ ...f, ticker_text: e.target.value }))}
                    placeholder="Message one | Message two | Message three"
                    className="w-full rounded-[var(--radius)] border border-border bg-surface-elevated px-3 py-2 text-sm"
                  />
                  <p className="mt-1 text-xs text-muted">Separate messages with | . Saved with splash settings above.</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-emerald-500/15 bg-[#0f1117] lg:col-span-2">
          <CardHeader>
            <CardTitle>WhatsApp platform sender</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {whatsappLoading ? (
              <p className="text-sm text-muted">Loading WhatsApp settings…</p>
            ) : (
              <>
                <p className="text-sm text-muted">
                  Platform fallback for OTPs, order updates, and campaigns when a tenant has not
                  connected their own WhatsApp Business credentials. Genius API is the default
                  provider (`POST /api/send` with `x-api-key`).
                </p>
                {whatsappData?.whatsapp?.configured ? (
                  <Badge variant="primary">
                    Active · {whatsappData.whatsapp.active_provider}
                  </Badge>
                ) : (
                  <Badge variant="warning">Not configured</Badge>
                )}
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    className="accent-primary"
                    checked={whatsappForm.enabled}
                    onChange={(e) =>
                      setWhatsappForm((f) => ({ ...f, enabled: e.target.checked }))
                    }
                  />
                  <span className="text-sm font-medium">Enable platform WhatsApp sender</span>
                </label>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Provider</label>
                  <select
                    value={whatsappForm.provider}
                    onChange={(e) =>
                      setWhatsappForm((f) => ({
                        ...f,
                        provider: e.target.value as "genius" | "meta" | "twilio",
                      }))
                    }
                    className="h-10 w-full rounded-[var(--radius)] border border-border bg-surface-elevated px-3 text-sm"
                  >
                    <option value="genius">Genius API</option>
                    <option value="meta">Meta Cloud API</option>
                    <option value="twilio">Twilio</option>
                  </select>
                </div>
                {whatsappForm.provider === "genius" ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <Input
                      label={
                        whatsappData?.whatsapp?.has_api_key
                          ? "API key (leave blank to keep)"
                          : "API key"
                      }
                      type="password"
                      autoComplete="off"
                      value={whatsappForm.api_key}
                      onChange={(e) =>
                        setWhatsappForm((f) => ({ ...f, api_key: e.target.value }))
                      }
                      placeholder="api-…"
                    />
                    <Input
                      label="Session ID"
                      value={whatsappForm.session_id}
                      onChange={(e) =>
                        setWhatsappForm((f) => ({ ...f, session_id: e.target.value }))
                      }
                      placeholder="session_…"
                    />
                    <div className="md:col-span-2">
                      <Input
                        label="Base URL"
                        value={whatsappForm.base_url}
                        onChange={(e) =>
                          setWhatsappForm((f) => ({ ...f, base_url: e.target.value }))
                        }
                        placeholder="https://restapi.geniusdevel.com"
                      />
                    </div>
                  </div>
                ) : null}
                {whatsappForm.provider === "meta" ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <Input
                      label="Phone number ID"
                      value={whatsappForm.meta_phone_number_id}
                      onChange={(e) =>
                        setWhatsappForm((f) => ({
                          ...f,
                          meta_phone_number_id: e.target.value,
                        }))
                      }
                    />
                    <Input
                      label={
                        whatsappData?.whatsapp?.has_meta_access_token
                          ? "Access token (leave blank to keep)"
                          : "Access token"
                      }
                      type="password"
                      autoComplete="off"
                      value={whatsappForm.meta_access_token}
                      onChange={(e) =>
                        setWhatsappForm((f) => ({
                          ...f,
                          meta_access_token: e.target.value,
                        }))
                      }
                    />
                  </div>
                ) : null}
                {whatsappForm.provider === "twilio" ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <Input
                      label="Account SID"
                      value={whatsappForm.twilio_account_sid}
                      onChange={(e) =>
                        setWhatsappForm((f) => ({
                          ...f,
                          twilio_account_sid: e.target.value,
                        }))
                      }
                    />
                    <Input
                      label={
                        whatsappData?.whatsapp?.has_twilio_auth_token
                          ? "Auth token (leave blank to keep)"
                          : "Auth token"
                      }
                      type="password"
                      autoComplete="off"
                      value={whatsappForm.twilio_auth_token}
                      onChange={(e) =>
                        setWhatsappForm((f) => ({
                          ...f,
                          twilio_auth_token: e.target.value,
                        }))
                      }
                    />
                    <Input
                      label="From number"
                      value={whatsappForm.twilio_from}
                      onChange={(e) =>
                        setWhatsappForm((f) => ({ ...f, twilio_from: e.target.value }))
                      }
                      placeholder="whatsapp:+1415..."
                    />
                  </div>
                ) : null}
                {whatsappError ? (
                  <p className="text-sm text-danger">{whatsappError}</p>
                ) : null}
                {whatsappSuccess ? (
                  <p className="text-sm text-emerald-400">{whatsappSuccess}</p>
                ) : null}
                <Button
                  onClick={() => updateWhatsAppMutation.mutate()}
                  isLoading={updateWhatsAppMutation.isPending}
                >
                  Save WhatsApp
                </Button>

                <div className="mt-2 space-y-3 rounded-[var(--radius)] border border-border/60 p-4">
                  <div>
                    <p className="text-sm font-medium text-violet-50">Send test message</p>
                    <p className="mt-0.5 text-xs text-muted">
                      Uses the saved platform credentials (same path as signup welcome WhatsApp).
                      Save settings before testing if you just changed keys.
                    </p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Input
                      label="Phone (E.164)"
                      value={whatsappTestForm.phone}
                      onChange={(e) =>
                        setWhatsappTestForm((f) => ({ ...f, phone: e.target.value }))
                      }
                      placeholder="+447756183484"
                    />
                    <Input
                      label="Message (optional)"
                      value={whatsappTestForm.message}
                      onChange={(e) =>
                        setWhatsappTestForm((f) => ({ ...f, message: e.target.value }))
                      }
                      placeholder="KhayaOS platform WhatsApp test…"
                    />
                  </div>
                  {whatsappTestError ? (
                    <p className="text-sm text-danger">{whatsappTestError}</p>
                  ) : null}
                  {whatsappTestSuccess ? (
                    <p className="text-sm text-emerald-400">{whatsappTestSuccess}</p>
                  ) : null}
                  <Button
                    variant="secondary"
                    onClick={() => sendWhatsAppTestMutation.mutate()}
                    isLoading={sendWhatsAppTestMutation.isPending}
                    disabled={!whatsappTestForm.phone.trim().startsWith("+")}
                  >
                    Send test WhatsApp
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </BackendPage>
  );
}
