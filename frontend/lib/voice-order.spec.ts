import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isAsapTime,
  isCheckoutIntent,
  isSendOrderIntent,
  matchMealsFromSpeech,
  matchOptionsFromSpeech,
  parseOrderType,
  parsePaymentMethod,
  parseScheduledTime,
  parseSpokenPhone,
  parseSpokenQuantity,
  stripQuantityPrefix,
} from "./voice-order";
import type { Meal, MealOption } from "./types";

describe("voice-order parsers", () => {
  it("parses quantity words and digits", () => {
    assert.equal(parseSpokenQuantity("two"), 2);
    assert.equal(parseSpokenQuantity("3"), 3);
    assert.equal(parseSpokenQuantity("just one"), 1);
    assert.equal(parseSpokenQuantity("jollof"), null);
  });

  it("strips a leading quantity from a meal utterance", () => {
    const a = stripQuantityPrefix("two jollof rice");
    assert.equal(a.quantity, 2);
    assert.equal(a.rest, "jollof rice");
  });

  it("detects checkout and send intents", () => {
    assert.equal(isCheckoutIntent("that's all"), true);
    assert.equal(isCheckoutIntent("checkout"), true);
    assert.equal(isSendOrderIntent("send the order"), true);
    assert.equal(isSendOrderIntent("place order"), true);
  });

  it("parses pickup, delivery, payment, phone, and ASAP", () => {
    assert.equal(parseOrderType("I'll pick it up"), "pickup");
    assert.equal(parseOrderType("please deliver"), "delivery");
    assert.equal(parsePaymentMethod("bank transfer"), "transfer");
    assert.equal(parsePaymentMethod("card"), "card");
    assert.equal(parseSpokenPhone("0803 059 9638"), "08030599638");
    assert.equal(isAsapTime("asap"), true);
  });

  it("parses relative and clock times", () => {
    const now = new Date("2026-08-13T12:00:00");
    assert.equal(parseScheduledTime("in 30 minutes", now), "2026-08-13T12:30");
    assert.equal(parseScheduledTime("5pm", now), "2026-08-13T17:00");
  });

  it("matches meals and options by speech", () => {
    const meals: Meal[] = [
      {
        id: "1",
        name: "Jollof Rice",
        base_price: 12,
        options: [],
      },
      {
        id: "2",
        name: "Fried Plantain",
        base_price: 5,
        options: [],
      },
    ];
    assert.equal(matchMealsFromSpeech("jollof", meals)[0]?.id, "1");

    const options: MealOption[] = [
      { id: "a", name: "Chicken", price_delta: 2 },
      { id: "b", name: "Beef", price_delta: 3 },
    ];
    assert.equal(matchOptionsFromSpeech("chicken", options)[0]?.id, "a");
  });
});
