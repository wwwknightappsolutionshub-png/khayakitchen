"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/hooks/useAuth";
import { ApiClientError } from "@/lib/api-client";
import { authService } from "@/services/auth.service";
import { platformSettingsService } from "@/services/platform-settings.service";
import type { PlatformSettings } from "@/lib/types";

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

  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ["platform", "settings"],
    queryFn: () => platformSettingsService.getSettings(),
  });

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
    <div className="animate-fade-in">
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
                  <Input
                    label="Primary color"
                    value={displayedSettings.primary_color ?? ""}
                    onChange={(e) =>
                      setSplashForm((f) => ({ ...f, primary_color: e.target.value }))
                    }
                  />
                  <Input
                    label="Secondary color"
                    value={displayedSettings.secondary_color ?? ""}
                    onChange={(e) =>
                      setSplashForm((f) => ({ ...f, secondary_color: e.target.value }))
                    }
                  />
                  <Input
                    label="Accent color"
                    value={displayedSettings.accent_color ?? ""}
                    onChange={(e) =>
                      setSplashForm((f) => ({ ...f, accent_color: e.target.value }))
                    }
                  />
                  <Input
                    label="Background color"
                    value={displayedSettings.background_color ?? ""}
                    onChange={(e) =>
                      setSplashForm((f) => ({ ...f, background_color: e.target.value }))
                    }
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
      </div>
    </div>
  );
}
