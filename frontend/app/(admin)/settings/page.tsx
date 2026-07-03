"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/hooks/useAuth";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { featureFlagsService } from "@/services/feature-flags.service";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();
  const { flags } = useFeatureFlags();

  const { data: flagsData } = useQuery({
    queryKey: ["feature-flags"],
    queryFn: () => featureFlagsService.getFlags(),
  });

  const allFlags = flagsData?.flags ?? flags;

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
