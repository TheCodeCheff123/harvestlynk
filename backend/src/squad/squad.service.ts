import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { request } from "https";
import { env } from "src/env";
import { URL } from "url";

interface SquadAccountLookupResponse {
  data: {
    account_name: string;
  };
}

export interface SquadTransferPayload {
  amount: number;
  account_name?: string;
  bank_code: string;
  account_number: string;
  remark: string;
  transaction_reference: string;
}

interface SquadTransferResponse {
  success: boolean;
  message?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
  generated_reference?: string;
}

@Injectable()
export class SquadService {
  private readonly logger = new Logger(SquadService.name);
  private readonly baseUrl: string;

  constructor() {
    const isProduction = process.env.NODE_ENV === "production";
    this.baseUrl = isProduction
      ? "https://api-d.squadco.com"
      : "https://sandbox-api-d.squadco.com";
  }

  // eslint-disable-next-line no-restricted-syntax
  private postJson<T>(
    endpoint: string,
    payload: unknown,
    secret: string,
  ): Promise<T> {
    const url = new URL(endpoint);

    return new Promise<T>((resolve, reject) => {
      const requestBody = JSON.stringify(payload);
      const req = request(
        {
          hostname: url.hostname,
          path: url.pathname + url.search,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${secret}`,
            "Content-Length": Buffer.byteLength(requestBody),
          },
        },
        (res) => {
          let data = "";

          res.on("data", (chunk) => {
            data += chunk;
          });

          res.on("end", () => {
            try {
              const parsed = JSON.parse(data);

              const parsedMessage =
                typeof parsed === "object" &&
                parsed !== null &&
                "message" in parsed &&
                typeof parsed.message === "string"
                  ? parsed.message
                  : undefined;

              if (res.statusCode && res.statusCode >= 400) {
                const errorText = parsedMessage ?? `HTTP ${res.statusCode}`;
                // TODO fix
                // eslint-disable-next-line no-restricted-syntax
                reject(new Error(errorText));
                return;
              }

              // eslint-disable-next-line no-restricted-syntax
              resolve(parsed as T);
            } catch (parseError) {
              reject(
                parseError instanceof Error
                  ? parseError
                  : // TODO
                    // eslint-disable-next-line no-restricted-syntax
                    new Error(String(parseError)),
              );
            }
          });
        },
      );

      req.on("error", reject);
      req.write(requestBody);
      req.end();
    });
  }

  private getErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;
    try {
      return JSON.stringify(error);
    } catch {
      return "Unknown error";
    }
  }

  /**
   * Verify if a bank account exists and get the account holder name
   * Calls Squad's account lookup endpoint
   * @param bankCode - The bank code (e.g., '033' for GTB)
   * @param accountNumber - The bank account number
   * @returns Account details including account name
   * @throws InternalServerErrorException if API call fails or account not found
   */
  async verifyAccount(bankCode: string, accountNumber: string) {
    const secret = env.SQUAD_SECRET_KEY;

    try {
      const response = await this.postJson<SquadAccountLookupResponse>(
        `${this.baseUrl}/payout/account/lookup`,
        {
          bank_code: bankCode,
          account_number: accountNumber,
        },
        secret,
      );

      return response.data;
    } catch (error) {
      const message = this.getErrorMessage(error);
      this.logger.error(`Account Lookup Failed: ${message}`);
      throw new InternalServerErrorException("Could not verify bank account");
    }
  }

  /**
   * Transfer funds to a bank account via Squad API
   * Handles all API communication and error management gracefully
   * @param details - Transfer payload with amount, bank, account and reference
   * @returns Response object with success status and optional message
   */
  async transferToBank(details: SquadTransferPayload) {
    const secret = env.SQUAD_SECRET_KEY;
    // 1. Clean up the username (e.g., "John Doe" becomes "johndoe")
    const sanitizedName = (details.account_name || "user")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

    // 2. Grab the current exact timestamp and add 4 random numbers
    const uniqueSuffix = `${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    // 3. Combine them into a single unique variable string!
    const generatedReference = `farm_wd_${sanitizedName}_${uniqueSuffix}`;

    if (secret.startsWith("sandbox_sk_")) {
      this.logger.warn(
        "Squad Sandbox mode active: Auto-mocking successful transfer response",
      );

      return {
        success: true,
        status: 200,
        message: "Transfer successfully initialized (Sandbox Mock)",
        data: {
          transaction_reference: generatedReference,
          amount: details.amount,
          gateway_status: "success",
          gateway_message: "Approved by Staging Engine",
        },
      };
    }

    try {
      const response = await this.postJson<SquadTransferResponse>(
        `${this.baseUrl}/payout/transfer`,
        {
          amount: details.amount,
          bank_code: details.bank_code,
          account_number: details.account_number,
          currency_id: "NGN",
          remark: details.remark || "FarmApp Withdrawal Payout",
          account_name: details.account_name || "Test Account",
          transaction_reference: details.transaction_reference,
        },
        secret,
      );

      return response;
    } catch (error) {
      const message = this.getErrorMessage(error);
      this.logger.error(`Squad Transfer API Error: ${message}`);
      return {
        success: false,
        message: message || "External API Error",
      };
    }
  }
}
