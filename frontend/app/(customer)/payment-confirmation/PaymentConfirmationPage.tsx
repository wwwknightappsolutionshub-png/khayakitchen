"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CustomerButton } from "@/components/customer/CustomerButton";
import { CustomerRouteLink } from "@/components/customer/CustomerRouteLink";
import { useStorefront } from "@/hooks/useStorefront";
import { customerOrdersService } from "@/services/customer-orders.service";
import { ApiClientError } from "@/lib/api-client";
import { formatCurrency, cn } from "@/lib/utils";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "application/pdf"];
const MAX_BYTES = 2 * 1024 * 1024;

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function PaymentConfirmationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("id") ?? "";
  const [phone, setPhone] = useState("");
  const { data: storefront } = useStorefront();
  const bank = storefront?.branding;

  const [remaining, setRemaining] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setPhone(localStorage.getItem("khayaos-customer-phone") ?? "");
  }, []);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ["payment-confirmation", orderId, phone],
    queryFn: () => customerOrdersService.getOrder(orderId, phone),
    enabled: Boolean(orderId && phone),
    refetchInterval: 15_000,
  });

  const order = data?.order;
  const payment = order?.payment;

  useEffect(() => {
    if (!payment) return;
    setRemaining(payment.wait_remaining_seconds);
  }, [payment?.id, payment?.wait_remaining_seconds]);

  useEffect(() => {
    if (!payment?.id || remaining === null) return;
    if (remaining <= 0) return;
    const timer = window.setInterval(() => {
      setRemaining((prev) => {
        if (prev === null || prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [payment?.id]);

  const canUpload = useMemo(() => {
    if (!payment) return false;
    if (payment.proof_uploaded || payment.verified) return false;
    return (remaining ?? payment.wait_remaining_seconds) === 0;
  }, [payment, remaining]);

  const onPaid = async () => {
    setError(null);
    if (!file) {
      setError("Please upload a payment proof (.png, .jpg, or .pdf).");
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type) && !/\.(png|jpe?g|pdf)$/i.test(file.name)) {
      setError("Only .png, .jpg, and .pdf files are allowed.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("File must be 2MB or smaller.");
      return;
    }
    setUploading(true);
    try {
      await customerOrdersService.uploadPaymentProof(orderId, phone, file);
      await refetch();
      router.push(`/tracking?id=${orderId}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  if (!orderId) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <h1 className="text-xl font-semibold">Missing order</h1>
        <CustomerRouteLink href="/menu" className="mt-6">
          <CustomerButton>Browse Menu</CustomerButton>
        </CustomerRouteLink>
      </div>
    );
  }

  if (!phone) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <h1 className="text-xl font-semibold">Phone required</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Open tracking from the same device you ordered on.</p>
        <CustomerRouteLink href={`/tracking?id=${orderId}`} className="mt-6">
          <CustomerButton>Go to tracking</CustomerButton>
        </CustomerRouteLink>
      </div>
    );
  }

  if (isLoading && !order) {
    return (
      <div className="px-4 pt-6 text-sm text-[var(--muted)]">Loading payment details…</div>
    );
  }

  if (payment?.proof_uploaded) {
    return (
      <div className="customer-animate-in px-4 pt-6">
        <h1 className="mb-2 text-2xl font-bold tracking-tight">Proof received</h1>
        <p className="mb-6 text-sm text-[var(--muted)]">
          We received your payment proof. The kitchen will verify it shortly.
        </p>
        <CustomerButton className="w-full" size="lg" onClick={() => router.push(`/tracking?id=${orderId}`)}>
          Track order
        </CustomerButton>
      </div>
    );
  }

  return (
    <div className="customer-animate-in space-y-6 px-4 pt-6 pb-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">We&apos;d wait for your payment confirmation</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Transfer {formatCurrency(order?.total_amount ?? payment?.amount ?? 0)} using the details below.
        </p>
      </div>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="mb-3 text-sm font-semibold">Bank details</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--muted)]">Bank Name</dt>
            <dd className="font-medium text-right">{bank?.bank_name || "—"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--muted)]">Account Name</dt>
            <dd className="font-medium text-right">{bank?.bank_account_name || "—"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--muted)]">Account Number</dt>
            <dd className="font-mono font-medium text-right">{bank?.bank_account_number || "—"}</dd>
          </div>
        </dl>
      </section>

      <section
        className={cn(
          "rounded-2xl border px-4 py-6 text-center",
          canUpload
            ? "border-[var(--secondary)]/40 bg-[var(--secondary)]/10"
            : "border-[var(--border)] bg-[var(--surface)]",
        )}
      >
        <p className="text-sm font-medium text-[var(--muted)]">Countdown</p>
        <p className="mt-2 font-mono text-4xl font-bold tracking-tight">
          {formatCountdown(remaining ?? payment?.wait_remaining_seconds ?? 240)}
        </p>
        {!canUpload && (
          <p className="mt-3 text-xs text-[var(--muted)]">
            Upload opens when the timer reaches 0:00
          </p>
        )}
      </section>

      {canUpload && (
        <section className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div>
            <label className="mb-2 block text-sm font-medium">Upload payment proof</label>
            <input
              type="file"
              accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
              className="block w-full text-sm text-[var(--muted)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--primary)] file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="mt-2 text-xs text-[var(--muted)]">.png, .jpg, or .pdf — max 2MB</p>
            {file && (
              <p className="mt-1 text-xs text-[var(--secondary)]">
                Selected: {file.name} ({Math.round(file.size / 1024)} KB)
              </p>
            )}
          </div>
          <CustomerButton
            className="w-full"
            size="lg"
            isLoading={uploading}
            onClick={() => void onPaid()}
          >
            Paid
          </CustomerButton>
        </section>
      )}

      {error && (
        <p className="rounded-xl bg-[var(--primary)]/10 px-4 py-3 text-sm text-[var(--primary)]">
          {error}
        </p>
      )}
    </div>
  );
}
