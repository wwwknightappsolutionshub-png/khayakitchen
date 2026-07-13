"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useAuthStore } from "@/stores/auth-store";
import { engagementService } from "@/services/engagement.service";

export default function PlatformStaffPage() {
  const role = useAuthStore((s) => s.user?.role);
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [staffRole, setStaffRole] = useState<"platform_admin" | "platform_support">(
    "platform_support",
  );
  const [error, setError] = useState<string | null>(null);

  const staff = useQuery({
    queryKey: ["platform", "staff"],
    queryFn: () => engagementService.listPlatformStaff(),
    enabled: role === "super_admin",
  });

  const create = useMutation({
    mutationFn: () =>
      engagementService.createPlatformStaff({
        name,
        email,
        password,
        role: staffRole,
      }),
    onSuccess: () => {
      setName("");
      setEmail("");
      setPassword("");
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["platform", "staff"] });
    },
    onError: (err: Error) => setError(err.message),
  });

  if (role !== "super_admin") {
    return <p className="p-6 text-violet-200">Only Platform Owner can manage platform staff.</p>;
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold text-violet-100">Platform Staff</h1>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <Card className="border-violet-500/20 bg-[#0f1218]">
        <CardHeader>
          <CardTitle className="text-violet-100">Create Admin or Support</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <label className="text-sm text-violet-200">
            Role
            <select
              className="mt-1 w-full rounded-lg border border-violet-500/30 bg-[#0a0c10] px-3 py-2"
              value={staffRole}
              onChange={(e) =>
                setStaffRole(e.target.value as "platform_admin" | "platform_support")
              }
            >
              <option value="platform_admin">Platform Admin</option>
              <option value="platform_support">Platform Support</option>
            </select>
          </label>
          <Button
            disabled={!name || !email || !password || create.isPending}
            onClick={() => create.mutate()}
          >
            Create
          </Button>
        </CardContent>
      </Card>
      <Card className="border-violet-500/20 bg-[#0f1218]">
        <CardHeader>
          <CardTitle className="text-violet-100">Existing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(staff.data?.users ?? []).map((u) => (
            <div key={u.id} className="rounded-lg border border-violet-500/20 p-3 text-sm text-violet-100">
              {u.name} — {u.email} — {u.role}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
