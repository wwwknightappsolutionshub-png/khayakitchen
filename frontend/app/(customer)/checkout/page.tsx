"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CustomerRouteLink } from "@/components/customer/CustomerRouteLink";
import { CustomerButton } from "@/components/customer/CustomerButton";
import { CustomerInput } from "@/components/customer/CustomerInput";
import { useCartStore, getLinePrice } from "@/stores/cart-store";
import { usePlaceOrder } from "@/hooks/usePlaceOrder";
import { useStorefront } from "@/hooks/useStorefront";
import { OrderSavingsSummary } from "@/components/customer/OrderSavingsSummary";
import { customerNotificationsService } from "@/services/customer-notifications.service";
import { formatCurrency, cn } from "@/lib/utils";
import { ApiClientError } from "@/lib/api-client";

const checkoutSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    phone: z.string().min(1, "Phone number is required"),
    order_type: z.enum(["pickup", "delivery"]),
    address: z.string().optional(),
    scheduled_time: z.string().optional(),
    payment_method: z.enum(["cash", "card", "transfer"]),
    whatsapp_opt_in: z.boolean().optional(),
  })
  .refine((data) => data.order_type !== "delivery" || (data.address && data.address.length > 0), {
    message: "Address is required for delivery",
    path: ["address"],
  });

type CheckoutForm = z.infer<typeof checkoutSchema>;

export default function CheckoutPage() {
  const router = useRouter();
  const { items, getTotal, clearCart, setActiveOrderId } = useCartStore();
  const [error, setError] = useState<string | null>(null);
  const placeOrder = usePlaceOrder();
  const total = getTotal();
  const { data: storefront } = useStorefront();
  const isClosed = storefront?.status?.is_accepting_orders === false;

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      name: "",
      phone: "",
      order_type: "pickup",
      address: "",
      scheduled_time: "",
      payment_method: "cash",
      whatsapp_opt_in: true,
    },
  });

  const orderType = useWatch({ control, name: "order_type" });
  const whatsappOptIn = useWatch({ control, name: "whatsapp_opt_in" });
  const paymentMethod = useWatch({ control, name: "payment_method" });

  if (items.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <h1 className="text-xl font-semibold">Nothing to checkout</h1>
        <CustomerRouteLink href="/menu" className="mt-6">
          <CustomerButton>Browse Menu</CustomerButton>
        </CustomerRouteLink>
      </div>
    );
  }

  const onSubmit = async (data: CheckoutForm) => {
    setError(null);
    try {
      if (data.whatsapp_opt_in || data.phone) {
        await customerNotificationsService.upsertPreferences({
          phone: data.phone,
          name: data.name,
          push_enabled: false,
          whatsapp_enabled: !!data.whatsapp_opt_in,
        }).catch(() => undefined);
      }

      const response = await placeOrder.mutateAsync({
        name: data.name,
        phone: data.phone,
        order_type: data.order_type,
        address: data.order_type === "delivery" ? data.address : undefined,
        payment_method: data.payment_method,
        scheduled_time: data.scheduled_time || undefined,
        items: items.map((item) => ({
          meal_id: item.mealId,
          quantity: item.quantity,
          options: item.selectedOptions.map((o) => ({ option_id: o.optionId })),
        })),
      });
      if (response.customer_id) {
        localStorage.setItem("khayaos-customer-id", response.customer_id);
      }
      setActiveOrderId(response.order_id);
      clearCart();
      router.push(`/tracking?id=${response.order_id}`);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("Failed to place order. Please try again.");
      }
    }
  };

  return (
    <div className="customer-animate-in px-4 pt-6">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Checkout</h1>

      {isClosed && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          🔴 We are currently closed and not accepting orders. Please check back later.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <CustomerInput label="Name" autoComplete="name" error={errors.name?.message} {...register("name")} />
        <CustomerInput
          label="Phone number"
          type="tel"
          autoComplete="tel"
          error={errors.phone?.message}
          {...register("phone")}
        />

        <section>
          <p className="mb-3 text-sm font-medium">Order type</p>
          <div className="grid grid-cols-2 gap-2">
            {(["pickup", "delivery"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setValue("order_type", type)}
                className={cn(
                  "customer-press rounded-xl border px-4 py-3 text-sm font-medium capitalize transition-colors duration-200",
                  orderType === type
                    ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                    : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--primary)]/30",
                )}
              >
                {type}
              </button>
            ))}
          </div>
        </section>

        {orderType === "delivery" && (
          <CustomerInput
            label="Delivery address"
            autoComplete="street-address"
            error={errors.address?.message}
            {...register("address")}
          />
        )}

        <CustomerInput
          label="Pickup / delivery time (optional)"
          type="datetime-local"
          error={errors.scheduled_time?.message}
          {...register("scheduled_time")}
        />

        <section>
          <p className="mb-3 text-sm font-medium">Payment method</p>
          <div className="grid grid-cols-3 gap-2">
            {(["cash", "card", "transfer"] as const).map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setValue("payment_method", method)}
                className={cn(
                  "customer-press rounded-xl border px-2 py-3 text-xs font-medium capitalize transition-colors duration-200 sm:text-sm",
                  paymentMethod === method
                    ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                    : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--primary)]/30",
                )}
              >
                {method}
              </button>
            ))}
          </div>
        </section>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-[var(--border)] accent-[var(--secondary)]"
            checked={whatsappOptIn}
            onChange={(e) => setValue("whatsapp_opt_in", e.target.checked)}
          />
          <div>
            <p className="text-sm font-medium">WhatsApp updates</p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              Receive order status on WhatsApp (optional)
            </p>
          </div>
        </label>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="mb-3 font-semibold">Order summary</h2>
          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={i} className="text-sm">
                <div className="flex justify-between gap-2">
                  <span>
                    {item.quantity}× {item.mealName}
                  </span>
                  <span className="price shrink-0">{formatCurrency(getLinePrice(item))}</span>
                </div>
                {item.selectedOptions.length > 0 && (
                  <p className="mt-0.5 text-xs text-[var(--muted)]">
                    {item.selectedOptions.map((o) => o.name).join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4">
            <OrderSavingsSummary items={items} total={total} />
          </div>
        </div>

        {error && (
          <p className="rounded-xl bg-[var(--primary)]/10 px-4 py-3 text-sm text-[var(--primary)]">
            {error}
          </p>
        )}

        <CustomerButton
          type="submit"
          className="w-full"
          size="lg"
          isLoading={placeOrder.isPending}
          disabled={isClosed}
        >
          {isClosed ? "Currently closed" : `Place Order — ${formatCurrency(total)}`}
        </CustomerButton>
      </form>
    </div>
  );
}
