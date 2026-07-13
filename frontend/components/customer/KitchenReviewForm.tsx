"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { engagementService } from "@/services/engagement.service";

const PHONE_STORAGE_KEY = "khayaos-customer-phone";
const NAME_STORAGE_KEY = "khayaos-customer-name";

export function KitchenReviewForm() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [body, setBody] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(localStorage.getItem(NAME_STORAGE_KEY) ?? "");
    setPhone(localStorage.getItem(PHONE_STORAGE_KEY) ?? "");
  }, []);

  const submit = useMutation({
    mutationFn: () =>
      engagementService.submitReview({
        name: name.trim(),
        phone: phone.trim(),
        body: body.trim(),
      }),
    onSuccess: () => {
      localStorage.setItem(NAME_STORAGE_KEY, name.trim());
      localStorage.setItem(PHONE_STORAGE_KEY, phone.trim());
      setBody("");
      setSuccess("Thanks — your review was submitted for kitchen approval.");
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["storefront"] });
    },
    onError: (err: Error) => {
      setSuccess(null);
      setError(err.message);
    },
  });

  return (
    <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <h2 className="text-base font-semibold">Leave a kitchen review</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Approved reviews appear in the menu footer. Keep it to 5 sentences or 200 words.
      </p>
      {success && <p className="mt-2 text-sm text-emerald-400">{success}</p>}
      {error && <p className="mt-2 text-sm text-rose-400">{error}</p>}
      <div className="mt-3 space-y-2">
        <input
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm"
          placeholder="Phone number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <textarea
          className="min-h-24 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm"
          placeholder="How was the food and kitchen?"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <Button
          className="w-full"
          disabled={!name.trim() || !phone.trim() || !body.trim() || submit.isPending}
          onClick={() => submit.mutate()}
        >
          Submit review
        </Button>
      </div>
    </div>
  );
}
