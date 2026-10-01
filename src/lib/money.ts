export function parseMoney(value: string) {
  const normalized = value.trim().replace(/[$,]/g, "");
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return null;
  const [whole, decimal = ""] = normalized.split(".");
  const cents = Number(whole) * 100 + Number(decimal.padEnd(2, "0"));
  return Number.isSafeInteger(cents) ? cents : null;
}
export function formatMoney(cents: number, showSign = false) {
  const sign = showSign && cents > 0 ? "+" : "";
  return `${sign}${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100)}`;
}
export function moneyInput(cents: number | undefined) {
  return cents === undefined ? "" : (cents / 100).toFixed(2);
}
