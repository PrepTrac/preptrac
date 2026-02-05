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

/** Build a plain-text message from our payload for Discord/Slack. */
function formatPayloadAsText(payload: WebhookPayload): string {
  const lines = [payload.message];
  if (payload.item) {
    lines.push(`Item: ${payload.item.name} (${payload.item.quantity} ${payload.item.unit})`);
    if (payload.item.category) lines.push(`Category: ${payload.item.category}`);
    if (payload.item.location) lines.push(`Location: ${payload.item.location}`);
    if (payload.item.expirationDate) lines.push(`Expiration: ${payload.item.expirationDate}`);
  }
  lines.push(`Type: ${payload.type}`);
  return lines.join("\n");
}

/** Detect Discord webhook URL and return Discord-formatted body, else null. */
function asDiscordBody(payload: WebhookPayload, url: string): string | null {
  if (!/discord\.com\/api\/webhooks|discordapp\.com\/api\/webhooks/i.test(url)) return null;
  const content = formatPayloadAsText(payload);
  return JSON.stringify({ content: content.slice(0, 2000) });
}

/** Detect Slack incoming webhook URL and return Slack-formatted body, else null. */
function asSlackBody(payload: WebhookPayload, url: string): string | null {
  if (!/hooks\.slack\.com\/services/i.test(url)) return null;
  const text = formatPayloadAsText(payload);
  return JSON.stringify({ text });
}

export async function sendWebhook(
  url: string,
  payload: WebhookPayload,
  secret?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    let body: string;
    const discord = asDiscordBody(payload, url);
    const slack = discord ? null : asSlackBody(payload, url);
    if (discord) body = discord;
    else if (slack) body = slack;
    else body = JSON.stringify(payload);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "PrepTrac/1.0",
    };

    // Add signature if secret is provided (sign the body we're actually sending)
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
      let detail = response.statusText;
      try {
        const text = await response.text();
        if (text) {
          const trimmed = text.length > 200 ? text.slice(0, 200) + "…" : text;
          detail = trimmed.replace(/\n/g, " ");
        }
      } catch {
        // ignore body read errors
      }
      return {
        success: false,
        error: `Webhook returned ${response.status}: ${detail}`,
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

