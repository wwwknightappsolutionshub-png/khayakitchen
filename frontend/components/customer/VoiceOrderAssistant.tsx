"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, MicOff, Send, X } from "lucide-react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { CustomerButton } from "@/components/customer/CustomerButton";
import { useCartStore } from "@/stores/cart-store";
import { useUiStore } from "@/stores/ui-store";
import { usePlaceOrder } from "@/hooks/usePlaceOrder";
import { useStorefront } from "@/hooks/useStorefront";
import { customerAuthService } from "@/services/customer-auth.service";
import { customerNotificationsService } from "@/services/customer-notifications.service";
import { stashInstallClaimToast } from "@/lib/pwa-install";
import { ApiClientError } from "@/lib/api-client";
import {
  buildVoiceGreeting,
  cartLineLabel,
  formatCustomerAddressLine,
  getSpeechRecognitionConstructor,
  isAnythingElseNo,
  isAnythingElseYes,
  isAsapTime,
  isCheckoutIntent,
  isMultiSelectGroup,
  isSendOrderIntent,
  isSkipExtras,
  isVoiceAffirmative,
  isVoiceNegative,
  looksLikeSpokenName,
  matchMealsFromSpeech,
  matchOptionsFromSpeech,
  optionGroupsForVoice,
  parseOrderType,
  parsePaymentMethod,
  parseScheduledTime,
  parseSpokenPhone,
  parseSpokenQuantity,
  speakText,
  stopSpeaking,
  stripQuantityPrefix,
  type SpeechRecognitionLike,
  type VoiceCartPricing,
} from "@/lib/voice-order";
import { formatCurrency, toNumber, cn } from "@/lib/utils";
import type { CartItem, Meal, MealOption, MealOptionGroup } from "@/lib/types";

type ChatRole = "assistant" | "user";

type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  matches?: Meal[];
  options?: MealOption[];
  chips?: { id: string; label: string }[];
};

type VoiceStage =
  | "idle"
  | "confirm_meal"
  | "quantity"
  | "option"
  | "anything_else"
  | "fulfillment_type"
  | "fulfillment_address"
  | "fulfillment_time"
  | "contact_name"
  | "contact_phone"
  | "payment"
  | "confirm_send"
  | "placing";

type DraftLine = {
  meal: Meal;
  quantity: number | null;
  selectedOptions: CartItem["selectedOptions"];
  groupIndex: number;
};

interface VoiceOrderAssistantProps {
  meals: Meal[];
  kitchenName?: string | null;
  isAcceptingOrders?: boolean;
  getCartPricing?: (meal: Meal) => VoiceCartPricing;
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `vo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function defaultCartPricing(meal: Meal): VoiceCartPricing {
  return { basePrice: toNumber(meal.base_price) };
}

function groupPrompt(group: MealOptionGroup): string {
  const names = group.options.map((o) => o.name).join(", ");
  if (isMultiSelectGroup(group)) {
    return `Any ${group.group}? Options: ${names}. Say the extra, or say none.`;
  }
  return `Which ${group.group}? Options: ${names}.`;
}

export function VoiceOrderAssistant({
  meals,
  kitchenName,
  isAcceptingOrders = true,
  getCartPricing,
}: VoiceOrderAssistantProps) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const cartItems = useCartStore((s) => s.items);
  const getTotal = useCartStore((s) => s.getTotal);
  const clearCart = useCartStore((s) => s.clearCart);
  const setActiveOrderId = useCartStore((s) => s.setActiveOrderId);
  const triggerCartBounce = useUiStore((s) => s.triggerCartBounce);
  const placeOrder = usePlaceOrder();
  const { data: storefront } = useStorefront();
  const bank = storefront?.branding;
  const hasBankDetails = Boolean(bank?.bank_name && bank?.bank_account_name && bank?.bank_account_number);

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const [stage, setStage] = useState<VoiceStage>("idle");
  const [busy, setBusy] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const mealsRef = useRef(meals);
  const openRef = useRef(false);
  const sessionRef = useRef(0);
  const listenAfterSpeakRef = useRef(false);
  const stageRef = useRef<VoiceStage>("idle");
  const pendingMatchesRef = useRef<Meal[] | null>(null);
  const draftLineRef = useRef<DraftLine | null>(null);
  const draftQtyHintRef = useRef<number | null>(null);
  const checkoutRef = useRef({
    orderType: null as "pickup" | "delivery" | null,
    address: "",
    scheduledTime: "" as string,
    name: "",
    phone: "",
    email: "",
    payment: null as "card" | "transfer" | null,
  });
  const cartItemsRef = useRef(cartItems);

  mealsRef.current = meals;
  openRef.current = open;
  stageRef.current = stage;
  cartItemsRef.current = cartItems;

  useEffect(() => {
    setSpeechSupported(Boolean(getSpeechRecognitionConstructor()));
  }, []);

  useEffect(() => {
    if (!open) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open, listening]);

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.abort?.();
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    recognitionRef.current = null;
    setListening(false);
  }, []);

  useEffect(() => {
    return () => {
      sessionRef.current += 1;
      listenAfterSpeakRef.current = false;
      stopSpeaking();
      try {
        recognitionRef.current?.abort?.();
        recognitionRef.current?.stop();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
    };
  }, []);

  const appendAssistant = useCallback(
    (text: string, extra?: { matches?: Meal[]; options?: MealOption[]; chips?: { id: string; label: string }[] }) => {
      setMessages((prev) => [
        ...prev,
        { id: newId(), role: "assistant", text, matches: extra?.matches, options: extra?.options, chips: extra?.chips },
      ]);
    },
    [],
  );

  const appendUser = useCallback((text: string) => {
    setMessages((prev) => [...prev, { id: newId(), role: "user", text }]);
  }, []);

  const speakAndMaybeListen = useCallback(
    async (text: string, thenListen: boolean) => {
      const session = sessionRef.current;
      listenAfterSpeakRef.current = thenListen;
      stopListening();
      await speakText(text);
      if (session !== sessionRef.current || !openRef.current) return;
      if (listenAfterSpeakRef.current && getSpeechRecognitionConstructor()) {
        listenAfterSpeakRef.current = false;
        startListeningRef.current?.();
      }
    },
    [stopListening],
  );

  const startListeningRef = useRef<(() => void) | null>(null);
  const processUserTextRef = useRef<(raw: string) => void>(() => undefined);

  const say = useCallback(
    (text: string, extra?: { matches?: Meal[]; options?: MealOption[]; chips?: { id: string; label: string }[] }) => {
      appendAssistant(text, extra);
      void speakAndMaybeListen(text, true);
    },
    [appendAssistant, speakAndMaybeListen],
  );

  const goStage = (next: VoiceStage) => {
    stageRef.current = next;
    setStage(next);
  };

  const resetDraftLine = () => {
    draftLineRef.current = null;
    draftQtyHintRef.current = null;
    pendingMatchesRef.current = null;
  };

  const askQuantity = (meal: Meal) => {
    goStage("quantity");
    say(`How many ${meal.name}? Say a number, like one or two.`, {
      chips: [
        { id: "qty-1", label: "1" },
        { id: "qty-2", label: "2" },
        { id: "qty-3", label: "3" },
      ],
    });
  };

  const askCurrentOption = (line: DraftLine) => {
    const groups = optionGroupsForVoice(line.meal);
    const group = groups[line.groupIndex];
    if (!group) {
      commitDraftLine();
      return;
    }
    if (group.options.length === 1 && !isMultiSelectGroup(group)) {
      const only = group.options[0];
      line.selectedOptions = [
        ...line.selectedOptions,
        { optionId: only.id, name: only.name, priceDelta: toNumber(only.price_delta) },
      ];
      line.groupIndex += 1;
      draftLineRef.current = line;
      askCurrentOption(line);
      return;
    }
    goStage("option");
    say(groupPrompt(group), { options: group.options });
  };

  const afterOptionsOrQty = (line: DraftLine) => {
    const groups = optionGroupsForVoice(line.meal);
    if (groups.length > 0) {
      line.groupIndex = 0;
      draftLineRef.current = line;
      askCurrentOption(line);
      return;
    }
    draftLineRef.current = line;
    commitDraftLine();
  };

  const commitDraftLine = () => {
    const line = draftLineRef.current;
    if (!line || !line.quantity) return;
    if (!isAcceptingOrders) {
      resetDraftLine();
      goStage("idle");
      say("Orders are paused right now. Please try again when the kitchen is open.");
      return;
    }

    const pricing = getCartPricing?.(line.meal) ?? defaultCartPricing(line.meal);
    addItem({
      mealId: line.meal.id,
      mealName: line.meal.name,
      basePrice: pricing.basePrice,
      originalBasePrice: pricing.originalBasePrice,
      campaignId: pricing.campaignId ?? null,
      quantity: line.quantity,
      selectedOptions: line.selectedOptions,
    });
    triggerCartBounce();
    const opts =
      line.selectedOptions.length > 0
        ? ` with ${line.selectedOptions.map((o) => o.name).join(", ")}`
        : "";
    resetDraftLine();
    goStage("anything_else");
    say(
      `${line.quantity}× ${line.meal.name}${opts} (${formatCurrency(pricing.basePrice)}) added to your cart. Anything else, or shall I check out?`,
      {
        chips: [
          { id: "else-yes", label: "Add more" },
          { id: "else-no", label: "Checkout" },
        ],
      },
    );
  };

  const beginFulfillment = () => {
    if (cartItemsRef.current.length === 0) {
      goStage("idle");
      say("Your cart is empty. What meal would you like?");
      return;
    }
    if (!isAcceptingOrders) {
      goStage("idle");
      say("We’re closed for new orders right now. I can still help you browse the menu.");
      return;
    }
    goStage("fulfillment_type");
    say("Pickup or delivery?", {
      chips: [
        { id: "type-pickup", label: "Pickup" },
        { id: "type-delivery", label: "Delivery" },
      ],
    });
  };

  const askTime = () => {
    goStage("fulfillment_time");
    say("When should we have it ready? Say ASAP, or a time like 5pm or in 30 minutes.", {
      chips: [
        { id: "time-asap", label: "ASAP" },
        { id: "time-30", label: "In 30 minutes" },
      ],
    });
  };

  const askName = () => {
    const stored = checkoutRef.current.name;
    if (stored) {
      askPhone();
      return;
    }
    goStage("contact_name");
    say("What’s the name for this order?");
  };

  const askPhone = () => {
    const stored = checkoutRef.current.phone;
    if (stored && parseSpokenPhone(stored)) {
      askPayment();
      return;
    }
    goStage("contact_phone");
    say("What’s the best phone number for this order?");
  };

  const askPayment = () => {
    goStage("payment");
    if (hasBankDetails) {
      checkoutRef.current.payment = "transfer";
      say("Pay by bank transfer or card?", {
        chips: [
          { id: "pay-transfer", label: "Bank transfer" },
          { id: "pay-card", label: "Card" },
        ],
      });
      return;
    }
    checkoutRef.current.payment = "card";
    say("This kitchen hasn’t set bank transfer details yet. Say card to continue, or cancel.", {
      chips: [{ id: "pay-card", label: "Card" }],
    });
  };

  const recapAndConfirm = () => {
    const checkout = checkoutRef.current;
    const lines = cartItemsRef.current.map(cartLineLabel).join("; ");
    const when = checkout.scheduledTime ? checkout.scheduledTime.replace("T", " ") : "ASAP";
    const where =
      checkout.orderType === "delivery"
        ? `delivery to ${checkout.address}`
        : "pickup";
    const pay = checkout.payment === "card" ? "card" : "bank transfer";
    const total = formatCurrency(getTotal());
    goStage("confirm_send");
    say(
      `Here’s your order: ${lines}. ${where}, ${when}. ${checkout.name}, ${checkout.phone}. ${pay}, ${total}. Say send the order to place it.`,
      {
        chips: [
          { id: "send", label: "Send the order" },
          { id: "cancel-send", label: "Cancel" },
        ],
      },
    );
  };

  const placeVoiceOrder = async () => {
    const checkout = checkoutRef.current;
    const items = cartItemsRef.current;
    if (!checkout.name || !checkout.phone || !checkout.orderType || !checkout.payment || items.length === 0) {
      say("I still need a few details. Let’s try checkout again.");
      beginFulfillment();
      return;
    }
    if (checkout.orderType === "delivery" && !checkout.address) {
      goStage("fulfillment_address");
      say("I need a delivery address.");
      return;
    }
    if (checkout.payment === "transfer" && !hasBankDetails) {
      say("Bank transfer isn’t available. Say card, or cancel.");
      goStage("payment");
      return;
    }
    if (!isAcceptingOrders) {
      goStage("idle");
      say("We’re closed and can’t send the order right now.");
      return;
    }

    goStage("placing");
    setBusy(true);
    appendAssistant("Sending your order…");
    stopListening();
    stopSpeaking();

    try {
      await customerNotificationsService
        .upsertPreferences({
          phone: checkout.phone,
          name: checkout.name,
          push_enabled: false,
          whatsapp_enabled: true,
        })
        .catch(() => undefined);

      const referralToken =
        typeof window !== "undefined" ? localStorage.getItem("khayaos-referral-token") ?? undefined : undefined;

      const response = await placeOrder.mutateAsync({
        name: checkout.name,
        phone: checkout.phone,
        email: checkout.email.trim() || undefined,
        order_type: checkout.orderType,
        address: checkout.orderType === "delivery" ? checkout.address : undefined,
        payment_method: checkout.payment,
        scheduled_time: checkout.scheduledTime || undefined,
        referral_token: referralToken,
        items: items.map((item) => ({
          meal_id: item.mealId,
          quantity: item.quantity,
          options: item.selectedOptions.map((o) => ({ option_id: o.optionId })),
        })),
      });

      localStorage.setItem("khayaos-customer-phone", checkout.phone.trim());
      localStorage.setItem("khayaos-customer-name", checkout.name.trim());
      if (checkout.email.trim()) {
        localStorage.setItem("khayaos-customer-email", checkout.email.trim());
      }
      if (referralToken) localStorage.removeItem("khayaos-referral-token");
      if (response.customer_id) {
        localStorage.setItem("khayaos-customer-id", response.customer_id);
      }
      if (response.install_claim_eligible && response.customer_id && !response.app_installed) {
        stashInstallClaimToast({
          customerId: response.customer_id,
          phone: checkout.phone.trim(),
          points: response.install_claim_points ?? 200,
          email: checkout.email.trim() || undefined,
        });
      }

      setActiveOrderId(response.order_id);
      clearCart();
      const nextPath =
        checkout.payment === "transfer"
          ? `/payment-confirmation?id=${response.order_id}`
          : `/tracking?id=${response.order_id}`;
      const done =
        checkout.payment === "transfer"
          ? "Order placed. I’ll take you to payment confirmation."
          : "Order placed. I’ll take you to tracking.";
      appendAssistant(done);
      await speakText(done);
      sessionRef.current += 1;
      setOpen(false);
      router.push(nextPath);
    } catch (err) {
      goStage("confirm_send");
      const msg =
        err instanceof ApiClientError ? err.message : "Failed to place the order. Say send the order to try again.";
      say(msg, {
        chips: [
          { id: "send", label: "Send the order" },
          { id: "cancel-send", label: "Cancel" },
        ],
      });
    } finally {
      setBusy(false);
    }
  };

  const startMealFromMatches = (matches: Meal[], quantityHint: number | null) => {
    pendingMatchesRef.current = matches;
    draftQtyHintRef.current = quantityHint;
    if (!isAcceptingOrders) {
      const msg =
        matches.length === 1
          ? `I found ${matches[0].name}. We’re closed for new orders right now — you can browse, but I can’t add to cart yet.`
          : "I found a few possible matches. We’re closed for new orders — browse only for now.";
      goStage("idle");
      say(msg, { matches });
      return;
    }
    if (matches.length === 1) {
      goStage("confirm_meal");
      const qtyBit = quantityHint ? `${quantityHint}× ` : "";
      say(`I heard you want ${qtyBit}${matches[0].name}. Say yes to confirm, or tap Confirm.`, { matches });
      return;
    }
    goStage("confirm_meal");
    say("I found a few possible matches. Tap one to confirm, or say the meal name.", { matches });
  };

  const acceptMeal = (meal: Meal) => {
    if (!isAcceptingOrders) {
      say("Orders are paused right now. Please try again when the kitchen is open.");
      return;
    }
    pendingMatchesRef.current = null;
    const qty = draftQtyHintRef.current;
    draftLineRef.current = {
      meal,
      quantity: qty,
      selectedOptions: [],
      groupIndex: 0,
    };
    if (!qty) {
      askQuantity(meal);
      return;
    }
    afterOptionsOrQty(draftLineRef.current);
  };

  const handleOptionPick = (option: MealOption) => {
    const line = draftLineRef.current;
    if (!line) return;
    const groups = optionGroupsForVoice(line.meal);
    const group = groups[line.groupIndex];
    if (!group) {
      commitDraftLine();
      return;
    }
    const already = line.selectedOptions.some((o) => o.optionId === option.id);
    if (!already) {
      line.selectedOptions = [
        ...line.selectedOptions,
        { optionId: option.id, name: option.name, priceDelta: toNumber(option.price_delta) },
      ];
    }
    if (isMultiSelectGroup(group)) {
      draftLineRef.current = line;
      say(`Added ${option.name}. Another ${group.group}, or say done.`, { options: group.options });
      return;
    }
    line.groupIndex += 1;
    draftLineRef.current = line;
    askCurrentOption(line);
  };

  const processUserText = (raw: string) => {
      const text = raw.trim();
      if (!text) return;
      appendUser(text);

      const current = stageRef.current;

      if (current === "placing") return;

      if (current !== "confirm_send" && isVoiceNegative(text) && /^(cancel|never mind|nevermind)$/i.test(normalizeLoose(text))) {
        resetDraftLine();
        goStage("idle");
        say("Cancelled. What meal would you like?");
        return;
      }

      if (current === "idle" || current === "anything_else" || current === "confirm_meal") {
        if (isCheckoutIntent(text) || (current === "anything_else" && isAnythingElseNo(text))) {
          beginFulfillment();
          return;
        }
      }

      if (current === "idle") {
        const { quantity, rest } = stripQuantityPrefix(text);
        const query = rest || text;
        const matches = matchMealsFromSpeech(query, mealsRef.current);
        if (matches.length === 0) {
          say("I couldn’t match that to a menu item. Try saying the meal name again, or type it below.");
          return;
        }
        startMealFromMatches(matches, quantity);
        return;
      }

      if (current === "confirm_meal") {
        const pending = pendingMatchesRef.current;
        if (pending && pending.length > 0 && isVoiceAffirmative(text)) {
          if (pending.length === 1) {
            acceptMeal(pending[0]);
            return;
          }
          say("Please tap the meal you want, or say its name.", { matches: pending });
          return;
        }
        if (pending && isVoiceNegative(text)) {
          resetDraftLine();
          goStage("idle");
          say("No problem. What meal would you like instead?");
          return;
        }
        const { quantity, rest } = stripQuantityPrefix(text);
        const matches = matchMealsFromSpeech(rest || text, mealsRef.current);
        if (matches.length === 0) {
          say("I couldn’t match that. Say the meal name, or tap one of the options.", {
            matches: pending ?? undefined,
          });
          return;
        }
        startMealFromMatches(matches, quantity ?? draftQtyHintRef.current);
        return;
      }

      if (current === "quantity") {
        const qty = parseSpokenQuantity(text);
        if (!qty) {
          say("Please say a number, like one or two.");
          return;
        }
        const line = draftLineRef.current;
        if (!line) {
          goStage("idle");
          say("Let’s start again. What meal would you like?");
          return;
        }
        line.quantity = qty;
        draftLineRef.current = line;
        afterOptionsOrQty(line);
        return;
      }

      if (current === "option") {
        const line = draftLineRef.current;
        if (!line) {
          goStage("idle");
          say("Let’s start again. What meal would you like?");
          return;
        }
        const groups = optionGroupsForVoice(line.meal);
        const group = groups[line.groupIndex];
        if (!group) {
          commitDraftLine();
          return;
        }
        if (isMultiSelectGroup(group) && (isSkipExtras(text) || /^(done|that s all|thats all)$/.test(normalizeLoose(text)))) {
          line.groupIndex += 1;
          draftLineRef.current = line;
          askCurrentOption(line);
          return;
        }
        const matches = matchOptionsFromSpeech(text, group.options);
        if (matches.length === 1) {
          handleOptionPick(matches[0]);
          return;
        }
        if (matches.length > 1) {
          say("I found a few options. Tap one, or say the exact name.", { options: matches });
          return;
        }
        say(`I couldn’t match that. ${groupPrompt(group)}`, { options: group.options });
        return;
      }

      if (current === "anything_else") {
        if (isAnythingElseYes(text)) {
          goStage("idle");
          say("What else would you like?");
          return;
        }
        const { quantity, rest } = stripQuantityPrefix(text);
        const matches = matchMealsFromSpeech(rest || text, mealsRef.current);
        if (matches.length > 0) {
          startMealFromMatches(matches, quantity);
          return;
        }
        say("Say the next meal, or say checkout.", {
          chips: [
            { id: "else-yes", label: "Add more" },
            { id: "else-no", label: "Checkout" },
          ],
        });
        return;
      }

      if (current === "fulfillment_type") {
        const type = parseOrderType(text);
        if (!type) {
          say("Please say pickup or delivery.", {
            chips: [
              { id: "type-pickup", label: "Pickup" },
              { id: "type-delivery", label: "Delivery" },
            ],
          });
          return;
        }
        checkoutRef.current.orderType = type;
        if (type === "delivery") {
          goStage("fulfillment_address");
          if (checkoutRef.current.address) {
            say(`Deliver to ${checkoutRef.current.address}? Say yes, or give a different address.`);
          } else {
            say("What’s the delivery address?");
          }
          return;
        }
        askTime();
        return;
      }

      if (current === "fulfillment_address") {
        if (isVoiceAffirmative(text) && checkoutRef.current.address) {
          askTime();
          return;
        }
        if (text.length < 6) {
          say("Please say the full delivery address.");
          return;
        }
        checkoutRef.current.address = text;
        askTime();
        return;
      }

      if (current === "fulfillment_time") {
        if (isAsapTime(text) || isVoiceAffirmative(text)) {
          checkoutRef.current.scheduledTime = "";
          askName();
          return;
        }
        const parsed = parseScheduledTime(text);
        if (!parsed) {
          say("I didn’t catch the time. Say ASAP, 5pm, or in 30 minutes.");
          return;
        }
        checkoutRef.current.scheduledTime = parsed;
        askName();
        return;
      }

      if (current === "contact_name") {
        if (!looksLikeSpokenName(text)) {
          say("Please say the name for this order.");
          return;
        }
        checkoutRef.current.name = text.trim();
        askPhone();
        return;
      }

      if (current === "contact_phone") {
        const phone = parseSpokenPhone(text);
        if (!phone) {
          say("I need a phone number with at least 7 digits. You can type it below.");
          return;
        }
        checkoutRef.current.phone = phone;
        askPayment();
        return;
      }

      if (current === "payment") {
        const method = parsePaymentMethod(text);
        if (!method) {
          say(hasBankDetails ? "Please say bank transfer or card." : "Please say card, or cancel.");
          return;
        }
        if (method === "transfer" && !hasBankDetails) {
          say("Bank transfer isn’t available. Say card to continue.");
          return;
        }
        checkoutRef.current.payment = method;
        recapAndConfirm();
        return;
      }

      if (current === "confirm_send") {
        if (isVoiceNegative(text) || /cancel/.test(normalizeLoose(text))) {
          goStage("idle");
          say("Order not sent. You can add more meals, or say checkout when you’re ready.");
          return;
        }
        if (isSendOrderIntent(text)) {
          void placeVoiceOrder();
          return;
        }
        say("Say send the order to place it, or cancel.", {
          chips: [
            { id: "send", label: "Send the order" },
            { id: "cancel-send", label: "Cancel" },
          ],
        });
      }
    };

  processUserTextRef.current = processUserText;

  const startListening = useCallback(() => {
    const Ctor = getSpeechRecognitionConstructor();
    if (!Ctor) {
      setStatusNote("Voice input isn’t supported on this browser. You can type instead.");
      return;
    }

    stopListening();
    stopSpeaking();
    setStatusNote(null);

    const recognition = new Ctor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = typeof navigator !== "undefined" ? navigator.language || "en-GB" : "en-GB";

    let finalTranscript = "";

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const piece = event.results[i][0]?.transcript ?? "";
        if (event.results[i].isFinal) {
          finalTranscript += `${piece} `;
        } else {
          interim += piece;
        }
      }
      setDraft((finalTranscript + interim).trim());
    };

    recognition.onerror = (event) => {
      const code = event.error ?? "unknown";
      if (code === "not-allowed" || code === "service-not-allowed") {
        setStatusNote("Microphone permission is blocked. Enable it in browser settings, or type your order.");
      } else if (code !== "aborted" && code !== "no-speech") {
        setStatusNote("Couldn’t catch that. Tap the mic and try again, or type below.");
      }
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
      const spoken = finalTranscript.trim();
      if (spoken) {
        setDraft("");
        processUserTextRef.current(spoken);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      setStatusNote("Couldn’t start the microphone. Type your order instead.");
      setListening(false);
    }
  }, [stopListening]);

  startListeningRef.current = startListening;

  const loadCheckoutDefaults = async () => {
    const name = localStorage.getItem("khayaos-customer-name") ?? "";
    const phone = localStorage.getItem("khayaos-customer-phone") ?? "";
    const email = localStorage.getItem("khayaos-customer-email") ?? "";
    checkoutRef.current.name = name;
    checkoutRef.current.phone = phone;
    checkoutRef.current.email = email;
    if (!customerAuthService.getSessionToken()) return;
    try {
      const { addresses } = await customerAuthService.listAddresses();
      const preferred = addresses.find((a) => a.is_default) ?? addresses[0];
      if (preferred) {
        checkoutRef.current.address = formatCustomerAddressLine(preferred);
      }
    } catch {
      /* guest */
    }
  };

  const openAssistant = () => {
    sessionRef.current += 1;
    const session = sessionRef.current;
    stopSpeaking();
    stopListening();
    setOpen(true);
    setDraft("");
    setStatusNote(null);
    setBusy(false);
    resetDraftLine();
    goStage("idle");
    void loadCheckoutDefaults();

    const greeting = buildVoiceGreeting(kitchenName);
    const closedNote = !isAcceptingOrders
      ? " We’re currently closed for new orders, but I can still help you explore the menu."
      : "";
    const cartNote =
      cartItemsRef.current.length > 0
        ? " You already have items in your cart — say checkout when you’re ready, or add another meal."
        : "";
    const full = `${greeting}${closedNote}${cartNote}`;
    setMessages([{ id: newId(), role: "assistant", text: full }]);

    void (async () => {
      await speakText(full);
      if (session !== sessionRef.current || !openRef.current) return;
      if (getSpeechRecognitionConstructor()) {
        startListening();
      }
    })();
  };

  const closeAssistant = () => {
    sessionRef.current += 1;
    listenAfterSpeakRef.current = false;
    stopSpeaking();
    stopListening();
    resetDraftLine();
    setOpen(false);
  };

  const submitDraft = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    stopListening();
    processUserText(text);
  };

  const onChip = (id: string) => {
    const map: Record<string, string> = {
      "qty-1": "1",
      "qty-2": "2",
      "qty-3": "3",
      "else-yes": "yes",
      "else-no": "checkout",
      "type-pickup": "pickup",
      "type-delivery": "delivery",
      "time-asap": "asap",
      "time-30": "in 30 minutes",
      "pay-transfer": "bank transfer",
      "pay-card": "card",
      send: "send the order",
      "cancel-send": "cancel",
    };
    const spoken = map[id];
    if (spoken) processUserText(spoken);
  };

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const lastChips = lastAssistant?.chips;

  return (
    <>
      <button
        type="button"
        onClick={openAssistant}
        className={cn(
          "fixed bottom-24 right-4 z-[55] flex h-14 w-14 items-center justify-center rounded-full",
          "bg-[var(--primary)] text-white shadow-lg shadow-black/25",
          "ring-2 ring-[var(--primary)]/30 transition hover:scale-[1.03] active:scale-95",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]",
        )}
        aria-label="Order by voice"
        title="Order by voice"
      >
        <Mic className="h-6 w-6" strokeWidth={2.25} />
      </button>

      <ModalPortal open={open} onClose={closeAssistant}>
        <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closeAssistant}
            aria-label="Close voice order"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label="Voice order assistant"
            className="relative z-10 flex max-h-[min(88vh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-[var(--surface)] customer-animate-in sm:rounded-2xl"
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <div className="min-w-0">
                <p className="font-semibold tracking-tight">Voice order</p>
                <p className="text-xs text-[var(--muted)]">
                  {stage === "placing"
                    ? "Sending your order…"
                    : "Meal, options, pickup or delivery, then send — confirm before we place it"}
                </p>
              </div>
              <button
                type="button"
                onClick={closeAssistant}
                className="rounded-full p-2 text-[var(--muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)]"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                    message.role === "assistant"
                      ? "bg-[var(--surface-elevated)] text-[var(--foreground)]"
                      : "ml-auto bg-[var(--primary)] text-white",
                  )}
                >
                  <p>{message.text}</p>
                  {message.matches && message.matches.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {message.matches.map((meal) => (
                        <button
                          key={meal.id}
                          type="button"
                          onClick={() => acceptMeal(meal)}
                          disabled={!isAcceptingOrders || busy}
                          className={cn(
                            "flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-left transition",
                            isAcceptingOrders
                              ? "hover:border-[var(--primary)]/50"
                              : "cursor-not-allowed opacity-60",
                          )}
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{meal.name}</span>
                            <span className="text-xs text-[var(--muted)]">
                              {formatCurrency(
                                getCartPricing?.(meal)?.basePrice ?? toNumber(meal.base_price),
                              )}
                              {optionGroupsForVoice(meal).length > 0 ? " · options available" : ""}
                              {!isAcceptingOrders ? " · closed" : ""}
                            </span>
                          </span>
                          <span className="shrink-0 text-xs font-semibold text-[var(--primary)]">
                            {isAcceptingOrders ? "Confirm" : "Browse"}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {message.options && message.options.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {message.options.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => handleOptionPick(option)}
                          disabled={busy}
                          className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium hover:border-[var(--primary)]/50"
                        >
                          {option.name}
                          {toNumber(option.price_delta) !== 0
                            ? ` · ${formatCurrency(option.price_delta)}`
                            : ""}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}

              {lastChips && lastChips.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {lastChips.map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      disabled={busy}
                      onClick={() => onChip(chip.id)}
                      className="rounded-full border border-[var(--primary)]/40 bg-[var(--primary)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--primary)]"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              ) : null}

              {listening ? (
                <p className="text-center text-xs font-medium text-[var(--primary)]">Listening…</p>
              ) : null}
              {statusNote ? (
                <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-[var(--foreground)]">
                  {statusNote}
                </p>
              ) : null}
            </div>

            <div className="border-t border-[var(--border)] px-3 py-3">
              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={() => (listening ? stopListening() : startListening())}
                  disabled={!speechSupported || busy}
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border",
                    listening
                      ? "border-[var(--primary)] bg-[var(--primary)]/15 text-[var(--primary)]"
                      : "border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--foreground)]",
                    (!speechSupported || busy) && "opacity-40",
                  )}
                  aria-label={listening ? "Stop listening" : "Start listening"}
                  title={
                    speechSupported
                      ? listening
                        ? "Stop listening"
                        : "Speak your order"
                      : "Voice not supported — type instead"
                  }
                >
                  {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </button>
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      submitDraft();
                    }
                  }}
                  placeholder="Or type…"
                  disabled={busy}
                  className="h-11 min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                />
                <CustomerButton
                  type="button"
                  className="h-11 w-11 shrink-0 !px-0"
                  onClick={submitDraft}
                  disabled={!draft.trim() || busy}
                  aria-label="Send"
                >
                  <Send className="h-4 w-4" />
                </CustomerButton>
              </div>
            </div>
          </div>
        </div>
      </ModalPortal>
    </>
  );
}

function normalizeLoose(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
