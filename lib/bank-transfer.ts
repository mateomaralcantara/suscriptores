// Manual bank-transfer top-ups. Accounts and rate come from the server environment (never the repo).
import { serviceRoleRest } from "@/lib/supabase-server";

export type BankAccount = { name: string; accountType: string; accountNumber: string; holder: string; document: string };

const MAX_BANKS = 4;

export function getBankAccounts(): BankAccount[] {
  const env = process.env;
  const accounts: BankAccount[] = [];
  for (let n = 1; n <= MAX_BANKS; n += 1) {
    const name = env[`BANK_${n}_NAME`]?.trim();
    const accountNumber = env[`BANK_${n}_ACCOUNT_NUMBER`]?.trim();
    if (!name || !accountNumber) continue;
    accounts.push({
      name,
      accountNumber,
      accountType: env[`BANK_${n}_ACCOUNT_TYPE`]?.trim() || "Cuenta",
      holder: env[`BANK_${n}_HOLDER`]?.trim() || "",
      document: env[`BANK_${n}_DOCUMENT`]?.trim() || "",
    });
  }
  return accounts;
}

/** Pesos per US dollar set by the admin (BANK_TRANSFER_RATE). 0 when missing or invalid. */
export function getBankTransferRate() {
  const rate = Number(process.env.BANK_TRANSFER_RATE);
  return Number.isFinite(rate) && rate > 0 ? rate : 0;
}

export function getBankTransferCurrency() {
  return process.env.BANK_TRANSFER_CURRENCY?.trim().toUpperCase() || "DOP";
}

export function isBankTransferConfigured() {
  return getBankAccounts().length > 0 && getBankTransferRate() > 0;
}

export type TopupRequestRow = {
  id: string;
  public_id: string;
  user_id: string;
  bank: string;
  amount_minor: number;
  local_currency: string;
  local_amount_minor: number;
  exchange_rate: number | string;
  reference: string;
  note: string | null;
  status: "pending" | "approved" | "rejected";
  review_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
};

const FIELDS = "id,public_id,user_id,bank,amount_minor,local_currency,local_amount_minor,exchange_rate,reference,note,status,review_reason,created_at,reviewed_at";

export function listTopupRequestsForProfile(profileId: string) {
  return serviceRoleRest<TopupRequestRow[]>(`topup_requests?user_id=eq.${encodeURIComponent(profileId)}&select=${FIELDS}&order=created_at.desc&limit=50`);
}

export function listTopupRequests(status?: "pending" | "approved" | "rejected") {
  const filter = status ? `&status=eq.${status}` : "";
  return serviceRoleRest<(TopupRequestRow & { profiles: { email: string } | null })[]>(
    `topup_requests?select=${FIELDS},profiles!topup_requests_user_id_fkey(email)${filter}&order=created_at.${status === "pending" ? "asc" : "desc"}&limit=200`,
  );
}
