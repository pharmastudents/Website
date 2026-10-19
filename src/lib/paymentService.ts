import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    Razorpay?: any;
  }
}

// 1. Dynamic Script Loader for Razorpay Checkout SDK
let razorpayScriptPromise: Promise<boolean> | null = null;

export function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);

  if (!razorpayScriptPromise) {
    razorpayScriptPromise = new Promise((resolve) => {
      const existingScript = document.getElementById("razorpay-checkout-script");
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(true));
        existingScript.addEventListener("error", () => resolve(false));
        return;
      }

      const script = document.createElement("script");
      script.id = "razorpay-checkout-script";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;

      script.onload = () => resolve(true);
      script.onerror = () => {
        console.error("Failed to load Razorpay Checkout script.");
        resolve(false);
      };

      document.body.appendChild(script);
    });
  }

  return razorpayScriptPromise;
}

export interface CartOrderParamItem {
  id: string;
  type?: string | undefined;
  title?: string | undefined;
  price?: number | undefined;
}

export interface CreateOrderParams {
  materialId?: string | undefined;
  packageId?: string | undefined;
  subjectId?: string | undefined;
  productId?: string | undefined;
  productType?: "material" | "package" | "semester" | "year" | "cart" | "subject" | undefined;
  semester?: number | undefined;
  items?: CartOrderParamItem[] | undefined;
  cartItems?: CartOrderParamItem[] | undefined;
  studentName?: string | undefined;
  studentEmail?: string | undefined;
}

export interface CreateOrderResult {
  ok: boolean;
  orderId?: string | undefined;
  razorpayOrderId?: string | undefined;
  amount?: number | undefined; // in paise
  amountInRupees?: number | undefined;
  currency?: string | undefined;
  productTitle?: string | undefined;
  keyId?: string | undefined;
  isFree?: boolean | undefined;
  alreadyOwned?: boolean | undefined;
  error?: string | undefined;
}

export interface VerifyPaymentParams {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface VerifyPaymentResult {
  ok: boolean;
  orderId?: string | undefined;
  razorpayPaymentId?: string | undefined;
  alreadyPaid?: boolean | undefined;
  message?: string | undefined;
  error?: string | undefined;
}

export const PaymentService = {
  // 1. Create Order via Supabase Edge Function (Tries create-order with fallback to create-razorpay-order)
  async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    try {
      let data: any = null;
      let error: any = null;

      // Try create-order first
      const res = await supabase.functions.invoke("create-order", {
        body: params,
      });

      data = res.data;
      error = res.error;

      // If create-order returned 404, fallback to create-razorpay-order
      if (error && (error.status === 404 || error.message?.includes("not found"))) {
        const fallbackRes = await supabase.functions.invoke("create-razorpay-order", {
          body: params,
        });
        data = fallbackRes.data;
        error = fallbackRes.error;
      }

      if (error) {
        console.warn("create-order function notice:", error);
        let errorMsg = error.message || "Failed to create payment order.";
        if (error.context && typeof error.context.json === "function") {
          try {
            const errJson = await error.context.json();
            if (errJson?.error) errorMsg = errJson.error;
            else if (errJson?.message) errorMsg = errJson.message;
          } catch (_) {}
        }
        return {
          ok: false,
          error: errorMsg,
        };
      }

      if (data?.error) {
        return {
          ok: false,
          alreadyOwned: data.alreadyOwned,
          error: data.error,
        };
      }

      if (data?.isFree) {
        return {
          ok: true,
          isFree: true,
          orderId: data.orderId,
          productTitle: data.productTitle,
        };
      }

      return {
        ok: true,
        orderId: data.orderId,
        razorpayOrderId: data.razorpayOrderId,
        amount: data.amount,
        amountInRupees: data.amountInRupees,
        currency: data.currency || "INR",
        productTitle: data.productTitle,
        keyId: data.keyId,
      };
    } catch (err: any) {
      console.error("PaymentService.createOrder error:", err);
      return { ok: false, error: err?.message || "Payment network error." };
    }
  },

  // 2. Verify Payment via Supabase Edge Function (Tries verify-payment with fallback to verify-razorpay-payment)
  async verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult> {
    try {
      let data: any = null;
      let error: any = null;

      const res = await supabase.functions.invoke("verify-payment", {
        body: params,
      });

      data = res.data;
      error = res.error;

      if (error && (error.status === 404 || error.message?.includes("not found"))) {
        const fallbackRes = await supabase.functions.invoke("verify-razorpay-payment", {
          body: params,
        });
        data = fallbackRes.data;
        error = fallbackRes.error;
      }

      if (error) {
        let errorMsg = error.message || "Server verification failed.";
        if (error.context && typeof error.context.json === "function") {
          try {
            const errJson = await error.context.json();
            if (errJson?.error) errorMsg = errJson.error;
            else if (errJson?.message) errorMsg = errJson.message;
          } catch (_) {}
        }
        return { ok: false, error: errorMsg };
      }

      if (data?.error || data?.success === false) {
        return { ok: false, error: data.error || "Payment verification failed." };
      }

      return {
        ok: true,
        orderId: data.orderId,
        razorpayPaymentId: data.razorpayPaymentId,
        alreadyPaid: data.alreadyPaid,
        message: data.message,
      };
    } catch (err: any) {
      console.error("PaymentService.verifyPayment error:", err);
      return { ok: false, error: err?.message || "Verification network error." };
    }
  },

  // 3. Open Razorpay Checkout Modal
  async openCheckout(options: {
    keyId: string;
    amount: number; // in paise
    currency?: string;
    orderId: string; // razorpay_order_id
    internalOrderId: string;
    name?: string;
    description?: string;
    prefill?: {
      name?: string;
      email?: string;
      contact?: string;
    };
    onSuccess: (response: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    }) => void;
    onDismiss?: () => void;
    onFailure?: (error: any) => void;
  }): Promise<void> {
    const isLoaded = await loadRazorpayScript();
    if (!isLoaded || !window.Razorpay) {
      throw new Error("Unable to load Razorpay Checkout SDK. Please check your internet connection.");
    }

    const rzpOptions = {
      key: options.keyId,
      amount: options.amount,
      currency: options.currency || "INR",
      name: "PharmaStudents.com",
      description: options.description || "B.Pharm Verified Study Material",
      order_id: options.orderId,
      image: "https://tfganiacycmmnorfyqam.supabase.co/storage/v1/object/public/logos/pharma_logo.png",
      prefill: {
        name: options.prefill?.name || "",
        email: options.prefill?.email || "",
        contact: options.prefill?.contact || "",
      },
      theme: {
        color: "#0d9488", // Teal brand color
      },
      modal: {
        ondismiss: () => {
          if (options.onDismiss) options.onDismiss();
        },
        escape: true,
        backdropclose: false,
      },
      handler: (response: any) => {
        options.onSuccess({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        });
      },
    };

    const rzpInstance = new window.Razorpay(rzpOptions);

    rzpInstance.on("payment.failed", (response: any) => {
      console.warn("Razorpay payment failed:", response.error);
      if (options.onFailure) {
        options.onFailure(response.error);
      }
    });

    rzpInstance.open();
  },

  // 4. Fetch Order & Payment Status
  async getStatus(orderId: string) {
    const { data, error } = await supabase.functions.invoke("payment-status", {
      body: { orderId },
    });
    return { data, error };
  },
};
