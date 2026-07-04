export const DEFAULT_TICKER_TEXT =
  "Welcome to our Kitchen, our delicious and freshly meals are ready for you to order now | Place your order now | Don't forget we run referral discounts and end of day special offer, turn on notification to get alert when we have it.";

export function parseTickerMessages(text?: string | null): string[] {
  const source = text?.trim() || DEFAULT_TICKER_TEXT;
  return source
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
}
