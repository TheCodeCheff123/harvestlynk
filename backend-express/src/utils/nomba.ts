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

function hmacDigest(value: string | Buffer, encoding: "base64" | "hex"): string {
  return createHmac("sha256", getNombaWebhookSecret()).update(value).digest(encoding);
}

/**
 * Build Nomba's documented signing string from the parsed payload.
 *
 * Nomba's documentation describes the signed string as a concatenation of specific
 * fields: event_type + requestId + merchant fields + transaction fields + nomba-timestamp.
 * In practice the exact field list varies by event type; we attempt the most common shape
 * and let the raw-body check handle any mismatch.
 *
 * Reference: https://nomba.com/docs/webhooks
 */
function buildNombaSigningString(payload: unknown, timestamp?: string): string | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  const data = (p["data"] ?? {}) as Record<string, unknown>;

  const parts: string[] = [];

  // event type — top-level or nested
  const eventType = String(p["event"] ?? p["type"] ?? p["eventType"] ?? data["event"] ?? "");
  if (eventType) parts.push(eventType);

  // requestId
  const requestId = String(p["requestId"] ?? p["request_id"] ?? data["requestId"] ?? "");
  if (requestId) parts.push(requestId);

  // merchant / account fields
  const merchantId = String(p["merchantId"] ?? p["merchant_id"] ?? data["merchantId"] ?? "");
  if (merchantId) parts.push(merchantId);

  // transaction fields (common across checkout and transfer events)
  const orderRef = String(
    p["orderReference"] ?? p["order_ref"] ?? data["orderReference"] ?? data["merchantTxRef"] ?? "",
  );
  if (orderRef) parts.push(orderRef);

  const amount = String(p["amount"] ?? data["amount"] ?? data["transactionAmount"] ?? "");
  if (amount) parts.push(amount);

  const currency = String(p["currency"] ?? data["currency"] ?? "");
  if (currency) parts.push(currency);

  if (timestamp) parts.push(timestamp);

  return parts.length > 0 ? parts.join("") : null;
}

export function verifyWebhookSignatureWithTimestamp(
  payload: string | Buffer,
  signature: string,
  timestamp?: string,
): boolean {
  if (!signature) return false;

  const raw = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
  const rawText = raw.toString("utf8");

  // Candidates to try in priority order:
  // 1. raw body as-is (most common — many gateways HMAC the raw request body)
  // 2. raw body string
  // 3. timestamp-prefixed body  (nomba-timestamp + ":" + body)
  // 4. Nomba field-based signing string (documented format)
  const signedPayloads: (string | Buffer)[] = [raw, rawText];

  if (timestamp) {
    signedPayloads.push(`${timestamp}:${rawText}`);
  }

  let parsedPayload: unknown;
  try {
    parsedPayload = JSON.parse(rawText);
  } catch {
    parsedPayload = null;
  }

  const fieldSigningString = buildNombaSigningString(parsedPayload, timestamp);
  if (fieldSigningString) {
    signedPayloads.push(fieldSigningString);
    // Also without timestamp in case timestamp is not included in the field string
    const noTs = buildNombaSigningString(parsedPayload, undefined);
    if (noTs && noTs !== fieldSigningString) signedPayloads.push(noTs);
  }

  for (const candidate of signedPayloads) {
    const base64Digest = hmacDigest(candidate, "base64");
    const hexDigest = hmacDigest(candidate, "hex");
    if (secureCompare(base64Digest, signature) || secureCompare(hexDigest, signature)) {
      return true;
    }
  }

  return false;
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
