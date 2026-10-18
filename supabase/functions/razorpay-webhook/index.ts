import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/supabase.ts";
import {
  verifyRazorpayWebhookSignature,
  getRazorpayCredentials,
} from "../_shared/razorpay.ts";

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // 1. Extract raw request body and signature header
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");
    const eventIdHeader = req.headers.get("x-razorpay-event-id");

    const { webhookSecret } = getRazorpayCredentials();
    const isSecretConfigured = Boolean(webhookSecret && webhookSecret.trim().length > 0);
    const signatureLength = signature ? signature.length : 0;
    const signaturePrefix = signature ? `${signature.slice(0, 6)}...` : "none";

    // Safe diagnostic log (never prints secret or full signature)
    console.log(
      `[Webhook Request] Secret configured: ${isSecretConfigured}, Signature header present: ${Boolean(signature)} (len: ${signatureLength}, prefix: ${signaturePrefix}), Body bytes: ${rawBody.length}`
    );

    if (!isSecretConfigured) {
      console.error("[Webhook Error] RAZORPAY_WEBHOOK_SECRET is not configured in Supabase environment secrets.");
      return new Response(
        JSON.stringify({ error: "Server webhook configuration incomplete." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!signature) {
      console.warn("[Webhook Auth Error] Missing x-razorpay-signature header.");
      return new Response(
        JSON.stringify({ error: "Missing x-razorpay-signature header." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Authenticate Webhook: Verify signature against exact raw request body
    const isValid = await verifyRazorpayWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.warn(`[Webhook Auth Error] Signature verification failed (sig prefix: ${signaturePrefix}).`);
      return new Response(
        JSON.stringify({ error: "Invalid webhook signature." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[Webhook Auth] Signature successfully verified.");

    let payload: any = {};
    try {
      payload = JSON.parse(rawBody);
    } catch (parseErr: any) {
      console.error("[Webhook Error] Malformed JSON payload:", parseErr);
      return new Response(
        JSON.stringify({ error: "Malformed JSON payload." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const eventType: string = payload.event || "unknown";
    const eventId: string = payload.id || eventIdHeader || crypto.randomUUID();

    console.log(`[Webhook Event] Processing event: ${eventType}, ID: ${eventId}`);

    const supabase = getServiceClient();

    // 3. Idempotency Check via payment_webhook_events
    const { data: existingEvent } = await supabase
      .from("payment_webhook_events")
      .select("id, processing_status")
      .eq("gateway_event_id", eventId)
      .maybeSingle();

    if (existingEvent && existingEvent.processing_status === "processed") {
      console.log(`[Webhook Idempotency] Event ${eventId} was already processed. Skipping.`);
      return new Response(
        JSON.stringify({ status: "already_processed", eventId }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Record incoming webhook event as pending
    await supabase.from("payment_webhook_events").upsert({
      gateway_event_id: eventId,
      event_type: eventType,
      processing_status: "pending",
      payload: {
        event: eventType,
        created_at: payload.created_at,
        keys: Object.keys(payload.payload || {}),
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
          .select("*")
          .eq("razorpay_order_id", razorpayOrderId)
          .maybeSingle();

        if (order) {
          // Always ensure the payment transaction record is updated with captured payment ID & signature
          if (razorpayPaymentId) {
            const { data: updatedPayment } = await supabase
              .from("payments")
              .update({
                razorpay_payment_id: razorpayPaymentId,
                razorpay_signature: signature,
                status: "captured",
                payment_method: paymentMethod,
                updated_at: new Date().toISOString(),
              })
              .eq("razorpay_order_id", razorpayOrderId)
              .select("id");

            let paymentConfirmed = Boolean(updatedPayment && updatedPayment.length > 0);

            if (!paymentConfirmed) {
              const { data: updatedByOrder } = await supabase
                .from("payments")
                .update({
                  razorpay_order_id: razorpayOrderId,
                  razorpay_payment_id: razorpayPaymentId,
                  razorpay_signature: signature,
                  status: "captured",
                  payment_method: paymentMethod,
                  updated_at: new Date().toISOString(),
                })
                .eq("order_id", order.id)
                .select("id");

              paymentConfirmed = Boolean(updatedByOrder && updatedByOrder.length > 0);
            }

            if (!paymentConfirmed) {
              await supabase.from("payments").upsert({
                order_id: order.id,
                student_id: order.student_id,
                gateway: "razorpay",
                razorpay_order_id: razorpayOrderId,
                razorpay_payment_id: razorpayPaymentId,
                razorpay_signature: signature,
                amount: order.total_amount || Math.round((order.final_amount || order.amount) * 100),
                currency: "INR",
                status: "captured",
                payment_method: paymentMethod,
                updated_at: new Date().toISOString(),
              }, { onConflict: "razorpay_order_id" });
            }
          }

          // Idempotently confirm order and unlock access if not already marked Paid
          if (order.status !== "Paid" && order.status !== "paid") {
            const { data: rpcRes, error: rpcErr } = await supabase.rpc("confirm_order_and_grant_access", {
              p_order_id: order.id,
              p_razorpay_order_id: razorpayOrderId,
              p_razorpay_payment_id: razorpayPaymentId,
              p_razorpay_signature: signature,
              p_payment_method: paymentMethod,
            });

            if (rpcErr || (rpcRes && rpcRes.success === false)) {
              console.warn("[Webhook Fallback] RPC order confirmation notice:", rpcErr || rpcRes);

              // Fallback direct updates using service role
              await supabase
                .from("orders")
                .update({
                  status: "Paid",
                  transaction_id: razorpayPaymentId,
                  payment_date: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq("id", order.id);

              // Resolve genuine material IDs to unlock (never saving package IDs as material IDs)
              let matIdsToUnlock: string[] = [];
              if (Array.isArray(order.material_ids) && order.material_ids.length > 0) {
                matIdsToUnlock = order.material_ids;
              } else if (order.product_type === "package" || order.product_type === "semester") {
                const { data: pkg } = await supabase
                  .from("packages")
                  .select("semester")
                  .eq("id", order.product_id)
                  .maybeSingle();

                const semNum = pkg?.semester || (order.product_title?.match(/Semester\s*([1-8])/i)?.[1] ? Number(order.product_title.match(/Semester\s*([1-8])/i)?.[1]) : null);

                if (semNum) {
                  const { data: semSubs } = await supabase
                    .from("subjects")
                    .select("id")
                    .eq("semester", semNum);
                  const semSubIds = (semSubs || []).map((s) => s.id);

                  const { data: sMats } = await supabase
                    .from("materials")
                    .select("id, semester, subject_id, published, status");

                  if (sMats) {
                    matIdsToUnlock = sMats
                      .filter((m: any) =>
                        (m.semester === semNum || semSubIds.includes(m.subject_id)) &&
                        m.published !== false &&
                        m.status !== "Draft"
                      )
                      .map((m) => String(m.id));
                  }
                }
              } else if (order.product_id && order.product_id !== "cart") {
                matIdsToUnlock = [order.product_id];
              }

              for (const mid of matIdsToUnlock) {
                if (mid) {
                  await supabase.from("purchases").upsert({
                    id: `pur_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                    student_id: order.student_id,
                    material_id: String(mid),
                    order_id: order.id,
                    amount: order.final_amount || order.amount,
                    status: "unlocked",
                    payment_status: "paid",
                    purchased_at: new Date().toISOString(),
                    created_at: new Date().toISOString(),
                  }, { onConflict: "student_id,material_id" });
                }
              }
            }
          }
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

          // Update existing payment record for this order by razorpay_order_id first, then order_id
          const { data: updatedFail } = await supabase
            .from("payments")
            .update({
              razorpay_payment_id: razorpayPaymentId,
              status: "failed",
              failure_reason: reason,
              updated_at: new Date().toISOString(),
            })
            .eq("razorpay_order_id", razorpayOrderId)
            .select("id");

          let failRecorded = Boolean(updatedFail && updatedFail.length > 0);

          if (!failRecorded) {
            const { data: updatedByOrder } = await supabase
              .from("payments")
              .update({
                razorpay_order_id: razorpayOrderId,
                razorpay_payment_id: razorpayPaymentId,
                status: "failed",
                failure_reason: reason,
                updated_at: new Date().toISOString(),
              })
              .eq("order_id", order.id)
              .select("id");

            failRecorded = Boolean(updatedByOrder && updatedByOrder.length > 0);
          }

          if (!failRecorded) {
            await supabase.from("payments").upsert({
              order_id: order.id,
              student_id: paymentEntity?.notes?.student_id || crypto.randomUUID(),
              gateway: "razorpay",
              razorpay_order_id: razorpayOrderId,
              razorpay_payment_id: razorpayPaymentId,
              status: "failed",
              failure_reason: reason,
              updated_at: new Date().toISOString(),
            }, { onConflict: "razorpay_order_id" });
          }
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
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[Webhook Exception] Error during webhook processing:", err);
    return new Response(JSON.stringify({ error: err?.message || "Internal webhook error." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
