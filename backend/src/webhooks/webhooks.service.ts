import { Injectable, Logger } from "@nestjs/common";
import * as crypto from "crypto";
import { env } from "src/env";

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor() {}

  /**
   * Verify the signature of a Squad webhook payload using HMAC SHA512
   * @param body - The webhook payload object
   * @param signature - The signature provided in the webhook header
   * @returns true if signature is valid, false otherwise
   */
  verifySquadSignature(body: unknown, signature: string) {
    const secret = env.SQUAD_SECRET_KEY;

    if (!signature) return false;

    const hash = crypto
      .createHmac("sha512", secret)
      .update(JSON.stringify(body))
      .digest("hex");

    return hash.toLowerCase() === signature.toLowerCase();
  }
}
