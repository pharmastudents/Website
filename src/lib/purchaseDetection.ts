import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PurchaseDetectionState =
  | "loading"
  | "not_purchased"
  | "purchased"
  | "error"
  | "unauthenticated";

export interface PurchaseCheckResult {
  state: PurchaseDetectionState;
  purchasedAt?: string | null;
  orderId?: string | null;
  error?: string | null;
}

/**
 * Authoritative backend check against Supabase database.
 * Never relies on mock data or client guesses.
 */
export async function checkMaterialOwnership(
  studentId: string | undefined | null,
  productId: string | undefined | null,
  productType: "material" | "package" | "semester" | "year" | "cart" = "material"
): Promise<PurchaseCheckResult> {
  // 1. Validate student authentication
  if (!studentId) {
    return { state: "unauthenticated" };
  }

  // 2. Validate product ID
  if (!productId || productId === "cart") {
    return { state: "not_purchased" };
  }

  try {
    if (productType === "package" || productType === "semester" || productType === "year") {
      // ── Package / Semester Purchase Check ──
      // Query verified orders table for Paid status
      const { data: orders, error: orderErr } = await supabase
        .from("orders")
        .select("id, status, product_id, product_type, order_date, payment_date")
        .eq("student_id", studentId)
        .eq("status", "Paid")
        .eq("product_id", productId);

      if (orderErr) {
        console.error("[PurchaseDetection] Error verifying package order:", orderErr);
        return {
          state: "error",
          error: "Could not verify package ownership. Please check your connection.",
        };
      }

      if (orders && orders.length > 0) {
        return {
          state: "purchased",
          orderId: orders[0].id,
          purchasedAt: orders[0].payment_date || orders[0].order_date,
        };
      }

      return { state: "not_purchased" };
    }

    // ── Single Material Purchase Check ──
    // 1. Check direct purchases table record
    const { data: purchaseRows, error: purchErr } = await supabase
      .from("purchases")
      .select("id, status, payment_status, order_id, created_at, purchased_at")
      .eq("student_id", studentId)
      .eq("material_id", productId);

    if (purchErr) {
      // If code is not "no rows found", treat as an actual query error
      if (purchErr.code && purchErr.code !== "PGRST116") {
        console.error("[PurchaseDetection] Error querying purchases:", purchErr);
        return {
          state: "error",
          error: "Failed to verify study license. Please retry.",
        };
      }
    }

    if (purchaseRows && purchaseRows.length > 0) {
      const validPurchase = purchaseRows.find((p) => {
        const st = (p.status || "").toLowerCase();
        const paySt = (p.payment_status || "").toLowerCase();
        return (
          st === "unlocked" ||
          st === "paid" ||
          st === "active" ||
          paySt === "paid" ||
          paySt === "free"
        );
      });

      if (validPurchase) {
        return {
          state: "purchased",
          orderId: validPurchase.order_id,
          purchasedAt: validPurchase.purchased_at || validPurchase.created_at,
        };
      }
    }

    // 2. Check if unlocked through a Paid order (package or bundle)
    const { data: paidOrders, error: ordErr } = await supabase
      .from("orders")
      .select("id, status, material_ids, product_id, product_type, order_date, payment_date")
      .eq("student_id", studentId)
      .eq("status", "Paid");

    if (ordErr) {
      console.error("[PurchaseDetection] Error querying orders:", ordErr);
      return {
        state: "error",
        error: "Failed to verify order history.",
      };
    }

    if (paidOrders && paidOrders.length > 0) {
      const matchingOrder = paidOrders.find((o) => {
        if (o.product_id === productId) return true;
        if (Array.isArray(o.material_ids) && o.material_ids.includes(productId)) return true;
        return false;
      });

      if (matchingOrder) {
        return {
          state: "purchased",
          orderId: matchingOrder.id,
          purchasedAt: matchingOrder.payment_date || matchingOrder.order_date,
        };
      }
    }

    // Not owned by this student
    return { state: "not_purchased" };
  } catch (err: any) {
    console.error("[PurchaseDetection] Unexpected verification failure:", err);
    return {
      state: "error",
      error: err?.message || "Unexpected verification error.",
    };
  }
}

/**
 * React hook to accurately observe purchase detection state.
 */
export function usePurchaseDetection(
  studentId: string | undefined | null,
  productId: string | undefined | null,
  productType: "material" | "package" | "semester" | "year" | "cart" = "material"
) {
  const [result, setResult] = useState<PurchaseCheckResult>({
    state: "loading",
    purchasedAt: null,
    orderId: null,
    error: null,
  });

  const check = useCallback(async () => {
    if (!studentId) {
      setResult({ state: "unauthenticated", purchasedAt: null, orderId: null, error: null });
      return;
    }

    if (!productId || productId === "cart") {
      setResult({ state: "not_purchased", purchasedAt: null, orderId: null, error: null });
      return;
    }

    setResult((prev) => ({ ...prev, state: "loading", error: null }));

    const res = await checkMaterialOwnership(studentId, productId, productType);
    setResult(res);
  }, [studentId, productId, productType]);

  useEffect(() => {
    void check();
  }, [check]);

  return {
    ...result,
    refetch: check,
  };
}
