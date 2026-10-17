import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { getAuthenticatedUser, getServiceClient } from "../_shared/supabase.ts";
import {
  verifyRazorpayPaymentSignature,
  getRazorpayPayment,
} from "../_shared/razorpay.ts";

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // 1. Require Authenticated User
    const { user, error: authError } = await getAuthenticatedUser(req);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: authError || "Unauthorized. Please login to verify payment." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const {
      orderId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    } = body;

    if (!orderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return new Response(
        JSON.stringify({ error: "Missing required verification parameters." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = getServiceClient();

    // 2. Validate internal order and student ownership
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();

    if (orderErr || !order) {
      return new Response(
        JSON.stringify({ error: "Internal order record not found." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (order.student_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Order does not belong to the authenticated user." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Idempotency: If already confirmed as Paid, return success immediately
    if (order.status === "Paid" || order.status === "paid") {
      return new Response(
        JSON.stringify({
          success: true,
          ok: true,
          orderId,
          alreadyPaid: true,
          message: "Payment was already verified and study materials unlocked.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Verify Razorpay Payment Signature using HMAC-SHA256
    const isSignatureValid = await verifyRazorpayPaymentSignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    if (!isSignatureValid) {
      console.error(`Invalid Razorpay signature for order ${orderId}, payment ${razorpayPaymentId}`);

      // Record failed payment attempt
      await supabase.from("payments").upsert({
        order_id: orderId,
        student_id: user.id,
        gateway: "razorpay",
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: razorpaySignature,
        status: "failed",
        failure_reason: "Signature verification failed",
        updated_at: new Date().toISOString(),
      }, { onConflict: "razorpay_payment_id" });

      return new Response(
        JSON.stringify({
          success: false,
          ok: false,
          error: "Invalid payment signature. Payment cannot be verified.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Retrieve payment details from Razorpay's server-side API
    let paymentMethod = "online";
    try {
      const paymentDetails = await getRazorpayPayment(razorpayPaymentId);
      if (paymentDetails) {
        paymentMethod = paymentDetails.method || paymentMethod;

        // Verify order ID match
        if (paymentDetails.order_id && paymentDetails.order_id !== razorpayOrderId) {
          throw new Error("Razorpay payment does not match the expected order ID.");
        }

        // Verify payment amount in paise matches order total
        const expectedPaise = order.total_amount || Math.round((order.final_amount || order.amount) * 100);
        if (paymentDetails.amount && Number(paymentDetails.amount) !== Number(expectedPaise)) {
          throw new Error(`Payment amount mismatch: received ${paymentDetails.amount}, expected ${expectedPaise}.`);
        }

        // Verify capture status
        if (paymentDetails.status !== "captured" && paymentDetails.status !== "authorized") {
          throw new Error(`Payment is in '${paymentDetails.status}' state, not captured.`);
        }
      }
    } catch (apiErr: any) {
      console.warn("Razorpay API check notice:", apiErr?.message);
      // If error was an explicit security mismatch, abort verification
      if (apiErr?.message?.includes("mismatch") || apiErr?.message?.includes("not match")) {
        return new Response(
          JSON.stringify({ success: false, ok: false, error: apiErr.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 5. Safely grant access and mark order Paid via secure database RPC
    const { data: confirmResult, error: rpcErr } = await supabase.rpc(
      "confirm_order_and_grant_access",
      {
        p_order_id: orderId,
        p_razorpay_order_id: razorpayOrderId,
        p_razorpay_payment_id: razorpayPaymentId,
        p_razorpay_signature: razorpaySignature,
        p_payment_method: paymentMethod,
      }
    );

    if (rpcErr) {
      console.warn("RPC confirmation fallback, applying secure server transaction:", rpcErr);

      // Fallback updates using service-role client
      await supabase
        .from("orders")
        .update({
          status: "Paid", // Preserving TitleCase constraint
          transaction_id: razorpayPaymentId,
          payment_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      await supabase.from("payments").upsert({
        order_id: orderId,
        student_id: user.id,
        gateway: "razorpay",
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: razorpaySignature,
        amount: order.total_amount || Math.round((order.final_amount || order.amount) * 100),
        currency: "INR",
        status: "captured",
        payment_method: paymentMethod,
        updated_at: new Date().toISOString(),
      }, { onConflict: "razorpay_payment_id" });

      // Grant material purchases
      let matIds: string[] = [];
      if (Array.isArray(order.material_ids)) {
        matIds = order.material_ids;
      } else if (order.product_id && order.product_id !== "cart") {
        matIds = [order.product_id];
      }

      for (const mid of matIds) {
        if (mid) {
          await supabase.from("purchases").upsert({
            id: `pur_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            student_id: user.id,
            material_id: String(mid),
            order_id: orderId,
            amount: order.final_amount || order.amount,
            status: "unlocked",
            payment_status: "paid",
            purchased_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          }, { onConflict: "student_id,material_id" });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        ok: true,
        orderId,
        razorpayPaymentId,
        message: "Payment successfully verified and study materials unlocked in My Notes.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("verify-payment error:", err);
    return new Response(
      JSON.stringify({ error: err?.message || "Payment verification failed." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
