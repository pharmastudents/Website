import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { getServiceClient } from "../_shared/supabase.ts";
import { verifyRazorpayWebhookSignature } from "../_shared/razorpay.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } });
  }

  try {
    // 1. Get raw request body and signature header
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      console.error("Missing x-razorpay-signature header");
      return new Response(JSON.stringify({ error: "Missing signature header." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2. Verify Webhook Signature against exact raw body
    const isValid = await verifyRazorpayWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.error("Invalid Razorpay webhook signature.");
      return new Response(JSON.stringify({ error: "Invalid webhook signature." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const payload = JSON.parse(rawBody);
    const eventType = payload.event || "unknown";
    const eventId = payload.id || req.headers.get("x-razorpay-event-id") || crypto.randomUUID();

    const supabase = getServiceClient();

    // 3. Idempotency Check via payment_webhook_events
    const { data: existingEvent } = await supabase
      .from("payment_webhook_events")
      .select("id, processing_status")
      .eq("gateway_event_id", eventId)
      .maybeSingle();

    if (existingEvent && existingEvent.processing_status === "processed") {
      console.log(`Webhook event ${eventId} already processed.`);
      return new Response(JSON.stringify({ status: "already_processed" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Record incoming webhook event
    await supabase.from("payment_webhook_events").upsert({
      gateway_event_id: eventId,
      event_type: eventType,
      processing_status: "pending",
      payload: {
        event: eventType,
        created_at: payload.created_at,
        contains: Object.keys(payload.payload || {}),
      },
      received_at: new Date().toISOString(),
    }, { onConflict: "gateway_event_id" });

    // 4. Handle Event Types
    if (eventType === "payment.captured" || eventType === "order.paid") {
      const paymentEntity = payload.payload?.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id || payload.payload?.order?.entity?.id;
      const razorpayPaymentId = paymentEntity?.id;
      const paymentMethod = paymentEntity?.method || "online";

      if (razorpayOrderId) {
        // Find internal order
        const { data: order } = await supabase
          .from("orders")
          .select("id, status")
          .eq("razorpay_order_id", razorpayOrderId)
          .maybeSingle();

        if (order) {
          // Idempotently confirm order and unlock access
          await supabase.rpc("confirm_order_and_grant_access", {
            p_order_id: order.id,
            p_razorpay_order_id: razorpayOrderId,
            p_razorpay_payment_id: razorpayPaymentId,
            p_razorpay_signature: signature,
            p_payment_method: paymentMethod,
          });
        }
      }
    } else if (eventType === "payment.failed") {
      const paymentEntity = payload.payload?.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id;
      const razorpayPaymentId = paymentEntity?.id;
      const reason = paymentEntity?.error_description || paymentEntity?.error_reason || "Payment failed";

      if (razorpayOrderId) {
        const { data: order } = await supabase
          .from("orders")
          .select("id, status")
          .eq("razorpay_order_id", razorpayOrderId)
          .maybeSingle();

        // Do not overwrite an already Paid order
        if (order && order.status !== "Paid" && order.status !== "paid") {
          await supabase
            .from("orders")
            .update({ status: "Failed", updated_at: new Date().toISOString() })
            .eq("id", order.id);

          await supabase.from("payments").upsert({
            order_id: order.id,
            student_id: paymentEntity?.notes?.student_id || crypto.randomUUID(),
            gateway: "razorpay",
            razorpay_order_id: razorpayOrderId,
            razorpay_payment_id: razorpayPaymentId,
            status: "failed",
            failure_reason: reason,
            updated_at: new Date().toISOString(),
          }, { onConflict: "razorpay_payment_id" });
        }
      }
    } else if (eventType === "refund.processed") {
      const refundEntity = payload.payload?.refund?.entity;
      const paymentId = refundEntity?.payment_id;

      if (paymentId) {
        await supabase
          .from("payments")
          .update({ status: "refunded", updated_at: new Date().toISOString() })
          .eq("razorpay_payment_id", paymentId);

        const { data: payment } = await supabase
          .from("payments")
          .select("order_id")
          .eq("razorpay_payment_id", paymentId)
          .maybeSingle();

        if (payment?.order_id) {
          await supabase
            .from("orders")
            .update({ status: "Refunded", updated_at: new Date().toISOString() })
            .eq("id", payment.order_id);
        }
      }
    }

    // 5. Mark webhook event as processed
    await supabase
      .from("payment_webhook_events")
      .update({
        processing_status: "processed",
        processed_at: new Date().toISOString(),
      })
      .eq("gateway_event_id", eventId);

    return new Response(JSON.stringify({ status: "success", event: eventType }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Razorpay webhook processing error:", err);
    return new Response(JSON.stringify({ error: err?.message || "Webhook error." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
