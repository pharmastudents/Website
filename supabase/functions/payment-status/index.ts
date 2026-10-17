import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { getAuthenticatedUser, getServiceClient } from "../_shared/supabase.ts";

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { user, error: authError } = await getAuthenticatedUser(req);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: authError || "Unauthorized." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const orderId = url.searchParams.get("orderId");
    const razorpayOrderId = url.searchParams.get("razorpayOrderId");

    if (!orderId && !razorpayOrderId) {
      return new Response(
        JSON.stringify({ error: "Missing orderId or razorpayOrderId query parameter." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = getServiceClient();

    // Check if user is admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const isAdmin = profile?.role === "admin";

    // Build query
    let query = supabase.from("orders").select(`
      id,
      student_id,
      amount,
      total_amount,
      currency,
      status,
      razorpay_order_id,
      transaction_id,
      product_title,
      product_type,
      material_ids,
      order_date,
      payment_date,
      payments (
        id,
        razorpay_payment_id,
        status,
        payment_method,
        failure_reason,
        created_at
      )
    `);

    if (orderId) {
      query = query.eq("id", orderId);
    } else if (razorpayOrderId) {
      query = query.eq("razorpay_order_id", razorpayOrderId);
    }

    const { data: order, error: orderErr } = await query.maybeSingle();

    if (orderErr || !order) {
      return new Response(
        JSON.stringify({ error: "Order not found." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Security check: Must be owner or admin
    if (order.student_id !== user.id && !isAdmin) {
      return new Response(
        JSON.stringify({ error: "Forbidden: You are not authorized to view this order." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        order: {
          id: order.id,
          status: order.status,
          totalAmount: order.total_amount,
          amountInRupees: order.amount,
          currency: order.currency || "INR",
          productTitle: order.product_title,
          razorpayOrderId: order.razorpay_order_id,
          transactionId: order.transaction_id,
          orderDate: order.order_date,
          paymentDate: order.payment_date,
          payments: order.payments || [],
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Internal server error." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
