// Razorpay API & Web Crypto HMAC-SHA256 Verification Utilities

export function getRazorpayCredentials() {
  const keyId = Deno.env.get("RAZORPAY_KEY_ID") ?? "";
  const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET") ?? "";
  const webhookSecret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET") ?? "";

  return { keyId, keySecret, webhookSecret };
}

// 1. Create Order via Razorpay REST API
export async function createRazorpayServerOrder(params: {
  amountPaise: number;
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<{ id: string; amount: number; currency: string }> {
  const { keyId, keySecret } = getRazorpayCredentials();

  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) not configured.");
  }

  const authHeader = "Basic " + btoa(`${keyId}:${keySecret}`);

  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Authorization": authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: Math.round(params.amountPaise),
      currency: params.currency || "INR",
      receipt: params.receipt,
      notes: params.notes || {},
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("Razorpay order creation failed:", data);
    throw new Error(data.error?.description || "Failed to create Razorpay order.");
  }

  return {
    id: data.id,
    amount: data.amount,
    currency: data.currency,
  };
}

// 2. Fetch Payment Details via Razorpay REST API
export async function getRazorpayPayment(paymentId: string) {
  const { keyId, keySecret } = getRazorpayCredentials();

  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials not configured.");
  }

  const authHeader = "Basic " + btoa(`${keyId}:${keySecret}`);

  const res = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    method: "GET",
    headers: {
      "Authorization": authHeader,
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.description || `Failed to fetch payment ${paymentId}`);
  }

  return data;
}

// 3. HMAC-SHA256 Signature Generator using standard Web Crypto API
async function generateHmacSha256(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const msgData = encoder.encode(message);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Timing-safe string comparison to prevent timing attacks
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// 4. Verify Razorpay Checkout Signature
// Formula: HMAC-SHA256(order_id + "|" + payment_id, secret) == signature
export async function verifyRazorpayPaymentSignature(params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): Promise<boolean> {
  const { keySecret } = getRazorpayCredentials();
  if (!keySecret) {
    console.error("Missing RAZORPAY_KEY_SECRET for signature verification.");
    return false;
  }

  const payload = `${params.razorpayOrderId}|${params.razorpayPaymentId}`;
  const expectedSignature = await generateHmacSha256(payload, keySecret);

  return timingSafeEqual(expectedSignature.toLowerCase(), params.razorpaySignature.toLowerCase());
}

// 5. Verify Razorpay Webhook Signature
// Formula: HMAC-SHA256(rawRequestBody, webhookSecret) == x-razorpay-signature
export async function verifyRazorpayWebhookSignature(
  rawBody: string,
  signatureHeader: string
): Promise<boolean> {
  const { webhookSecret } = getRazorpayCredentials();
  if (!webhookSecret) {
    console.error("Missing RAZORPAY_WEBHOOK_SECRET for webhook verification.");
    return false;
  }

  const expectedSignature = await generateHmacSha256(rawBody, webhookSecret);
  return timingSafeEqual(expectedSignature.toLowerCase(), signatureHeader.toLowerCase());
}
