import { OPERATOR_PREFIX_MAP } from "./data";

export function normalizeMsisdn(raw: string, countryCode = "+234"): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 0) return "";
  if (raw.trim().startsWith("+")) return "+" + digits;
  if (digits.startsWith("234") && digits.length >= 13) return "+" + digits;
  if (digits.startsWith("0") && digits.length === 11) return countryCode + digits.slice(1);
  if (digits.length === 10) return countryCode + digits;
  return countryCode + digits;
}

export function detectOperator(msisdn: string): string {
  const digits = msisdn.replace(/\D/g, "");
  let local = digits;
  if (digits.startsWith("234")) local = "0" + digits.slice(3);
  const prefix = local.slice(0, 4);
  return OPERATOR_PREFIX_MAP[prefix] ?? "MTN";
}

export function isValidMsisdn(msisdn: string): boolean {
  const digits = msisdn.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

export function generatePin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export function generateRef(prefix = "DCB"): string {
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.floor(Math.random() * 0xffffff).toString(16).toUpperCase().padStart(6, "0");
  return `${prefix}-${t}-${r}`;
}

// Simulated telco checkout rules for the demo ledger
export function simulateCharge(opts: { msisdn: string; amountMinor: number; operator: string }): {
  ok: boolean; errorCode: string | null; note: string;
} {
  const lastDigit = parseInt(opts.msisdn.replace(/\D/g, "").slice(-1) || "0", 10);
  // deterministic demo failures: numbers ending 0 -> insufficient airtime, 9 -> barred
  if (lastDigit === 0) return { ok: false, errorCode: "INSUFFICIENT_BALANCE", note: "Subscriber airtime below charge amount. Retry triggers low-balance SMS with top-up prompt." };
  if (lastDigit === 9) return { ok: false, errorCode: "SUBSCRIBER_BARRED", note: "Line barred / DND full block. Subscription parked, no charge made." };
  return { ok: true, errorCode: null, note: `Charged ${opts.amountMinor} minor units via ${opts.operator} DCB gateway.` };
}

export function revenueSplit(amountMinor: number, telcoSharePct: number) {
  const telco = Math.round((amountMinor * telcoSharePct) / 100);
  const aggregator = Math.round((amountMinor * 6) / 100);
  const service = amountMinor - telco - aggregator;
  return { telco, aggregator, service, servicePct: Math.round((service / amountMinor) * 100) };
}
