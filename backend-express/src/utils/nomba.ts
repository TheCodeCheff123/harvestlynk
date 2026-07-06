import { createHmac, timingSafeEqual } from "node:crypto";

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const NOMBAS = {
  sandbox: "https://sandbox.nomba.com",
  production: "https://api.nomba.com",
} as const;

type NombaEnvironment = keyof typeof NOMBAS;

type NombaResponse<T> = {
  code: string;
  description: string;
  data: T;
  status?: boolean | string;
  message?: string;
};

function getNombaClientId() { return getRequiredEnv("NOMBA_CLIENT_ID"); }
function getNombaClientSecret() { return getRequiredEnv("NOMBA_CLIENT_SECRET"); }
function getNombaParentAccountId() { return getRequiredEnv("NOMBA_PARENT_ACCOUNT_ID"); }
function getNombaWebhookSecret() { return getRequiredEnv("NOMBA_WEBHOOK_SECRET"); }

const NOMBA_SUB_ACCOUNT_ID = process.env["NOMBA_SUB_ACCOUNT_ID"] ?? "";
const NOMBA_ENV = ((process.env["NOMBA_ENV"] ?? "sandbox").toLowerCase() as NombaEnvironment);
const NOMBAS_BASE_URL = NOMBAS[NOMBA_ENV] ?? NOMBAS.sandbox;

let cachedAccessToken: string | null = null;
let cachedAccessTokenExpiresAt = 0;

class NombaError extends Error {
  public response?: unknown;

  constructor(message: string, response?: unknown) {
    super(message);
    this.name = "NombaError";
    this.response = response;
  }
}

function formatKobo(amountKobo: number): string {
  return (amountKobo / 100).toFixed(2);
}

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedAccessToken && now < cachedAccessTokenExpiresAt - 30_000) {
    return cachedAccessToken;
  }

  const url = `${NOMBAS_BASE_URL}/v1/auth/token/issue`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accountId: getNombaParentAccountId(),
    },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: getNombaClientId(),
      client_secret: getNombaClientSecret(),
    }),
  });

  const payload = (await response.json()) as NombaResponse<{ access_token: string; expiresAt: string }>;
  if (!response.ok || payload.code !== "00" || !payload.data?.access_token) {
    throw new NombaError("Failed to obtain Nomba access token", payload);
  }

  cachedAccessToken = payload.data.access_token;
  const expiresAt = Date.parse(payload.data.expiresAt);
  cachedAccessTokenExpiresAt = Number.isFinite(expiresAt) ? expiresAt : now + 55 * 60 * 1000;
  return cachedAccessToken;
}

type NombaRequestOptions = {
  body?: unknown;
  headers?: Record<string, string>;
};

async function nombaRequest<T>(
  path: string,
  method: "GET" | "POST" | "PUT" = "GET",
  options: NombaRequestOptions = {},
): Promise<T> {
  const token = await getAccessToken();
  const url = `${NOMBAS_BASE_URL}${path}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    accountId: getNombaParentAccountId(),
    ...options.headers,
  };

  const response = await fetch(url, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const payload = (await response.json()) as NombaResponse<T>;
  if (!response.ok || payload.code !== "00") {
    throw new NombaError(`Nomba request failed: ${payload.description ?? response.statusText}`, payload);
  }

  return payload.data;
}

/**
 * Like nombaRequest but tolerates Nomba's "pending/processing" response codes
 * for transfer-type calls where code !== "00" does NOT necessarily mean failure.
 *
 * Returns the full NombaResponse so the caller can inspect `code` and `data`.
 */
async function nombaRequestRaw<T>(
  path: string,
  method: "GET" | "POST" | "PUT" = "GET",
  options: NombaRequestOptions = {},
): Promise<NombaResponse<T>> {
  const token = await getAccessToken();
  const url = `${NOMBAS_BASE_URL}${path}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    accountId: getNombaParentAccountId(),
    ...options.headers,
  };

  const response = await fetch(url, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as NombaResponse<T>;
    throw new NombaError(
      `Nomba request failed (HTTP ${response.status}): ${payload.description ?? response.statusText}`,
      payload,
    );
  }

  return (await response.json()) as NombaResponse<T>;
}

export function getNombaConfig() {
  return {
    environment: NOMBA_ENV,
    parentAccountId: getNombaParentAccountId(),
    subAccountId: NOMBA_SUB_ACCOUNT_ID,
    webhookSecret: getNombaWebhookSecret(),
    baseUrl: NOMBAS_BASE_URL,
  };
}

export function verifyWebhookSignature(payload: string | Buffer, signature: string): boolean {
  return verifyWebhookSignatureWithTimestamp(payload, signature, undefined);
}

function secureCompare(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * Build Nomba's documented signing payload string.
 *
 * From Nomba's official webhook docs, the hashing payload is:
 *   eventType:requestId:userId:walletId:transactionId:transactionType:transactionTime:transactionResponseCode:timestamp
 *
 * responseCode "null" (string) is treated as empty string per the sample code.
 * The result is HMAC-SHA256 encoded as base64.
 */
function buildNombaSigningString(payload: unknown, timestamp: string): string {
  const p = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
  const data = (p["data"] && typeof p["data"] === "object" ? p["data"] : {}) as Record<string, unknown>;
  const merchant = (data["merchant"] && typeof data["merchant"] === "object" ? data["merchant"] : {}) as Record<string, unknown>;
  const transaction = (data["transaction"] && typeof data["transaction"] === "object" ? data["transaction"] : {}) as Record<string, unknown>;

  const eventType   = String(p["event_type"] ?? p["eventType"] ?? p["event"] ?? p["type"] ?? "");
  const requestId   = String(p["requestId"] ?? p["request_id"] ?? "");
  const userId      = String(merchant["userId"] ?? merchant["user_id"] ?? "");
  const walletId    = String(merchant["walletId"] ?? merchant["wallet_id"] ?? "");
  const txId        = String(transaction["transactionId"] ?? transaction["id"] ?? "");
  const txType      = String(transaction["type"] ?? "");
  const txTime      = String(transaction["time"] ?? transaction["createdAt"] ?? "");
  const rawCode     = String(transaction["responseCode"] ?? transaction["response_code"] ?? "");
  const txCode      = rawCode === "null" ? "" : rawCode;

  return [eventType, requestId, userId, walletId, txId, txType, txTime, txCode, timestamp].join(":");
}

export function verifyWebhookSignatureWithTimestamp(
  rawBody: string | Buffer,
  signature: string,
  timestamp: string | undefined,
): boolean {
  if (!signature) return false;
  // If no timestamp header, we cannot construct the signing string — reject.
  if (!timestamp) return false;

  const raw = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody);
  const rawText = raw.toString("utf8");

  let parsedPayload: unknown;
  try {
    parsedPayload = JSON.parse(rawText);
  } catch {
    parsedPayload = null;
  }

  const signingString = buildNombaSigningString(parsedPayload, timestamp);
  const digest = createHmac("sha256", getNombaWebhookSecret()).update(signingString).digest("base64");
  return secureCompare(digest, signature);
}

export async function createCheckoutLink(options: {
  amountKobo: number;
  customerEmail: string;
  orderReference: string;
  callbackUrl: string;
  customerId?: string;
  allowedPaymentMethods?: string[];
  orderMetaData?: Record<string, string>;
  tokenizeCard?: boolean;
  currency?: string;
}): Promise<{ checkoutLink: string; orderReference: string }> {
  const order: Record<string, unknown> = {
    callbackUrl: options.callbackUrl,
    customerEmail: options.customerEmail,
    amount: formatKobo(options.amountKobo),
    currency: options.currency ?? "NGN",
    orderReference: options.orderReference,
  };

  if (options.customerId) {
    order.customerId = options.customerId;
  }

  if (options.allowedPaymentMethods) {
    order.allowedPaymentMethods = options.allowedPaymentMethods;
  }

  if (options.orderMetaData) {
    order.orderMetaData = options.orderMetaData;
  }

  if (NOMBA_SUB_ACCOUNT_ID) {
    order.accountId = NOMBA_SUB_ACCOUNT_ID;
  }

  const payload = {
    order,
    tokenizeCard: options.tokenizeCard ? "true" : "false",
  };

  return nombaRequest<{ checkoutLink: string; orderReference: string }>("/v1/checkout/order", "POST", { body: payload });
}

export async function verifyTransaction(orderReference: string): Promise<unknown> {
  return nombaRequest<unknown>(
    `/v1/transactions/accounts/single?orderReference=${encodeURIComponent(orderReference)}`,
    "GET",
  );
}

export async function getNigerianBanks(): Promise<unknown> {
  return nombaRequest<unknown>("/v1/transfers/banks", "GET");
}

export async function lookupAccount(accountNumber: string, bankCode: string): Promise<unknown> {
  const payload: Record<string, unknown> = {
    accountNumber,
    bankCode,
  };

  if (NOMBA_SUB_ACCOUNT_ID) {
    payload.accountId = NOMBA_SUB_ACCOUNT_ID;
  }

  return nombaRequest<unknown>("/v1/transfers/bank/lookup", "POST", { body: payload });
}

/**
 * Codes Nomba returns for a transfer that has been accepted.
 * "00" = instant success; "01"/"02"/"09" = accepted, still in flight.
 * "200" / "success" / "true" are observed on some Nomba production responses
 * where the HTTP status code leaks into the body's `code` field — treat them
 * identically to "00" (success) so we never mis-classify a successful payout.
 */
const NOMBA_TRANSFER_PENDING_CODES = new Set(["00", "01", "02", "09", "200", "success", "true"]);

export type TransferOutcome =
  | { accepted: true; pending: boolean; data: unknown; code: string }
  | { accepted: false; code: string; description: string; raw: unknown };

export async function initiateTransfer(options: {
  amountKobo: number;
  accountNumber: string;
  accountName: string;
  bankCode: string;
  transferRef: string;
  senderName?: string;
  narration?: string;
  idempotencyKey?: string;
}): Promise<TransferOutcome> {
  const payload: Record<string, unknown> = {
    amount: formatKobo(options.amountKobo),
    accountNumber: options.accountNumber,
    accountName: options.accountName,
    bankCode: options.bankCode,
    merchantTxRef: options.transferRef,
  };

  if (options.senderName) {
    payload.senderName = options.senderName;
  }

  if (options.narration) {
    payload.narration = options.narration;
  }

  if (NOMBA_SUB_ACCOUNT_ID) {
    payload.accountId = NOMBA_SUB_ACCOUNT_ID;
  }

  const response = await nombaRequestRaw<unknown>("/v2/transfers/bank", "POST", {
    body: payload,
    headers: {
      "Idempotency-Key": options.idempotencyKey ?? options.transferRef,
    },
  });

  if (NOMBA_TRANSFER_PENDING_CODES.has(response.code)) {
    // "00", "200", "success", "true" all mean instant success — not pending.
    // "01", "02", "09" mean accepted but still in flight.
    const IN_FLIGHT = new Set(["01", "02", "09"]);
    return {
      accepted: true,
      pending: IN_FLIGHT.has(response.code),
      data: response.data,
      code: response.code,
    };
  }

  return {
    accepted: false,
    code: response.code,
    description: response.description ?? "Transfer rejected by Nomba",
    raw: response,
  };
}

/**
 * Requery a bank transfer by the merchantTxRef / transactionRef sent to Nomba.
 *
 * Uses POST /v1/transactions/accounts with body { transactionRef } — this is the
 * correct endpoint for looking up transfer status, not the checkout GET endpoint.
 */
export async function requeryTransfer(transactionRef: string): Promise<{
  status: string;
  raw: unknown;
}> {
  const response = await nombaRequestRaw<Record<string, unknown>>("/v1/transactions/accounts", "POST", {
    body: { transactionRef },
  });

  // code "00" means found; extract the status from the data blob.
  const data = (response.data ?? {}) as Record<string, unknown>;
  const status = String(
    data["status"] ?? data["transactionStatus"] ?? data["transaction_status"] ?? "",
  ).toUpperCase();

  return { status: status || "UNKNOWN", raw: response };
}

export async function createVirtualAccount(options: {
  accountRef: string;
  accountName: string;
  currency?: string;
  bvn?: string;
  expectedAmount?: number;
  expiryDate?: string;
}): Promise<{
  accountRef: string;
  accountHolderId: string;
  accountName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  bankName: string;
  bvn: string;
  currency: string;
  expiryDate?: string;
  expired: boolean;
  createdAt: string;
}> {
  const payload: Record<string, unknown> = {
    accountRef: options.accountRef,
    accountName: options.accountName,
    currency: options.currency ?? "NGN",
  };

  if (options.bvn) {
    payload.bvn = options.bvn;
  }

  if (options.expectedAmount) {
    payload.expectedAmount = options.expectedAmount;
  }

  if (options.expiryDate) {
    payload.expiryDate = options.expiryDate;
  }

  return nombaRequest<{
    accountRef: string;
    accountHolderId: string;
    accountName: string;
    bankAccountNumber: string;
    bankAccountName: string;
    bankName: string;
    bvn: string;
    currency: string;
    expiryDate?: string;
    expired: boolean;
    createdAt: string;
  }>("/v1/accounts/virtual", "POST", { body: payload });
}

export async function suspendVirtualAccount(accountId: string): Promise<boolean> {
  return nombaRequest<boolean>(`/v1/accounts/suspend/${accountId}`, "PUT", { body: {} });
}

export async function lookupVirtualAccount(accountRef: string): Promise<unknown> {
  return nombaRequest<unknown>(`/v1/accounts/virtual/${accountRef}`, "GET");
}

/**
 * Fetch recent inflow transactions for a virtual account holder from Nomba.
 *
 * Nomba API: GET /v1/transactions/accounts?accountId={id}&limit={n}
 *
 * Returns up to `limit` transactions (default 20) ordered newest-first.
 * Each result item uses `entryType` ("CREDIT"/"DEBIT"), `status` ("SUCCESS"),
 * `amount` (naira decimal string), and `id` / `sessionId` as the reference.
 */
export async function fetchVirtualAccountTransactions(
  nombaAccountId: string,
  limit = 20,
): Promise<Array<Record<string, unknown>>> {
  // Use nombaRequestRaw so a code:"200" response (which Nomba sends on this
  // shared hackathon account instead of "00") does NOT throw. We inspect
  // the payload ourselves and treat any 2xx HTTP status as success.
  type TxListData =
    | { results?: Array<Record<string, unknown>>; transactions?: Array<Record<string, unknown>> }
    | Array<Record<string, unknown>>;

  const payload = await nombaRequestRaw<TxListData>(
    `/v1/transactions/accounts?accountId=${encodeURIComponent(nombaAccountId)}&limit=${limit}`,
    "GET",
  );

  // Log raw so we can verify the exact shape in Railway logs.
  console.log("[fetchVirtualAccountTransactions] raw payload:", JSON.stringify(payload).slice(0, 500));

  const data = payload.data;

  // Nomba returns { data: { results: [...] } } on the transactions/accounts endpoint.
  // Fall back to { transactions: [...] } or a raw array for other variants.
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    if (Array.isArray((data as any).results)) return (data as any).results as Array<Record<string, unknown>>;
    if (Array.isArray((data as any).transactions)) return (data as any).transactions as Array<Record<string, unknown>>;
  }
  return [];
}

/**
 * Cancel a pending Nomba checkout order before payment is captured.
 * Only valid when the order is still in PENDING state on Nomba's side.
 *
 * Nomba API: POST /v1/checkout/order/cancel
 */
export async function cancelCheckoutOrder(orderReference: string): Promise<void> {
  await nombaRequest<unknown>("/v1/checkout/order/cancel", "POST", {
    body: { orderReference },
  });
}

/**
 * Initiate a refund for a previously captured Nomba checkout payment.
 *
 * Nomba API: POST /v1/checkout/refund
 */
export async function refundCheckoutPayment(options: {
  orderReference: string;
  /** Amount to refund in kobo. If omitted, full amount is refunded. */
  amountKobo?: number;
  reason?: string;
}): Promise<{ refundReference: string }> {
  const payload: Record<string, unknown> = {
    orderReference: options.orderReference,
  };

  if (options.amountKobo !== undefined) {
    payload.amount = formatKobo(options.amountKobo);
  }

  if (options.reason) {
    payload.reason = options.reason;
  }

  return nombaRequest<{ refundReference: string }>("/v1/checkout/refund", "POST", { body: payload });
}
