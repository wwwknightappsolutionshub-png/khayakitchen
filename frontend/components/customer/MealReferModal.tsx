"use client";

import { ModalPortal } from "@/components/ui/ModalPortal";
import { Button } from "@/components/ui/Button";
import { MealImage } from "@/components/customer/MealImage";
import { formatCurrency } from "@/lib/utils";
import type { MealReferPayload } from "@/lib/types";

interface MealReferModalProps {
  open: boolean;
  refer: MealReferPayload | null;
  onClose: () => void;
}

export function MealReferModal({ open, refer, onClose }: MealReferModalProps) {
  if (!refer) return null;

  const waUrl = `https://wa.me/?text=${encodeURIComponent(refer.whatsapp_text)}`;

  return (
    <ModalPortal open={open} onClose={onClose}>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
        <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-[var(--surface)] p-5 shadow-xl">
          <h2 className="text-lg font-semibold">Refer this meal</h2>
          <div className="mt-4 overflow-hidden rounded-xl">
            <MealImage
              name={refer.name}
              imageUrl={refer.image_url}
              className="aspect-video w-full"
              sizes="400px"
            />
          </div>
          <p className="mt-3 font-medium">{refer.name}</p>
          {refer.description && (
            <p className="mt-1 text-sm text-[var(--muted)]">{refer.description}</p>
          )}
          <p className="mt-2 font-mono text-[var(--primary)]">{formatCurrency(refer.price)}</p>
          <p className="mt-4 rounded-xl bg-[var(--surface-elevated)] p-3 text-sm">
            {refer.message}
          </p>
          <div className="mt-4 flex gap-2">
            <Button className="flex-1" onClick={() => window.open(waUrl, "_blank")}>
              Send on WhatsApp
            </Button>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
