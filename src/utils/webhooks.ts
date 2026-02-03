import crypto from "crypto";

export interface WebhookPayload {
  type: "expiration" | "maintenance" | "rotation" | "battery_replacement" | "low_inventory";
  message: string;
  date: string;
  itemId?: string;
  eventId?: string;
  item?: {
    id: string;
    name: string;
    quantity: number;
    unit: string;
    category?: string;
    location?: string;
    expirationDate?: string;
  };
  timestamp: string;
}

export async function sendWebhook(
  url: string,
  payload: WebhookPayload,
  secret?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const body = JSON.stringify(payload);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "PrepTrac/1.0",
    };

    // Add signature if secret is provided
    if (secret) {
      const signature = crypto
        .createHmac("sha256", secret)
        .update(body)
        .digest("hex");
      headers["X-PrepTrac-Signature"] = `sha256=${signature}`;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Webhook returned status ${response.status}: ${response.statusText}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    const providedSignature = signature.replace("sha256=", "");
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(providedSignature)
    );
  } catch {
    return false;
  }
}

