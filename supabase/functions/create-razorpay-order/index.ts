import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { getAuthenticatedUser, getServiceClient } from "../_shared/supabase.ts";
import { createRazorpayServerOrder, getRazorpayCredentials } from "../_shared/razorpay.ts";

interface CartInputItem {
  id: string;
  type?: "material" | "package" | "semester" | "subject";
  title?: string;
  price?: number;
}

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // 1. Authenticate student via Supabase Auth
    const { user, error: authError } = await getAuthenticatedUser(req);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: authError || "Unauthorized. Please log in to complete purchase." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const {
      materialId,
      packageId,
      productId,
      productType = "material",
      items = [],
      cartItems = [],
    } = body;

    const supabase = getServiceClient();

    // 2. Fetch student's existing purchases to prevent duplicate purchases
    const { data: existingPurchases } = await supabase
      .from("purchases")
      .select("material_id, status")
      .eq("student_id", user.id);

    const ownedMaterialIds = new Set<string>();
    if (existingPurchases) {
      for (const p of existingPurchases) {
        if (p.material_id && (p.status === "unlocked" || p.status === "paid" || p.status === "active")) {
          ownedMaterialIds.add(String(p.material_id));
        }
      }
    }

    // 3. Resolve purchase items (Cart Checkout vs Single Item)
    const rawItems: CartInputItem[] = Array.isArray(items) && items.length > 0
      ? items
      : Array.isArray(cartItems) && cartItems.length > 0
      ? cartItems
      : [];

    let resolvedItems: {
      materialId: string;
      title: string;
      price: number;
    }[] = [];

    let primaryTitle = "";
    let effectiveProductType = productType;
    let effectiveProductId = productId || materialId || packageId || "";

    if (rawItems.length > 0) {
      // ── MULTI-ITEM CART CHECKOUT ───────────────────────────────────────────
      effectiveProductType = "cart";
      effectiveProductId = "cart";

      for (const it of rawItems) {
        if (!it.id) continue;

        if (it.type === "package" || it.type === "semester") {
          const { data: pkg } = await supabase
            .from("packages")
            .select("*")
            .eq("id", it.id)
            .maybeSingle();

          const pkgPrice = Number(pkg?.price ?? pkg?.original_price ?? it.price ?? 799);
          const semNum = pkg?.semester || (it.title?.match(/Semester\s*([1-8])/i)?.[1] ? Number(it.title.match(/Semester\s*([1-8])/i)?.[1]) : null);

          let semMatIds: string[] = [];
          if (semNum) {
            const { data: sMats } = await supabase
              .from("materials")
              .select("id, title")
              .eq("semester", semNum);
            if (sMats) {
              semMatIds = sMats.map((m) => String(m.id));
            }
          }

          const unownedInPkg = semMatIds.filter((mId) => !ownedMaterialIds.has(mId));
          if (semMatIds.length > 0 && unownedInPkg.length === 0) {
            continue;
          }

          resolvedItems.push({
            materialId: it.id,
            title: pkg?.type ? `Semester ${semNum} Complete Package` : (it.title || "Semester Bundle"),
            price: pkgPrice,
          });
        } else {
          const { data: mat, error: matErr } = await supabase
            .from("materials")
            .select("id, title, price, is_premium, published")
            .eq("id", it.id)
            .maybeSingle();

          if (matErr || !mat) continue;
          if (mat.published === false) continue;

          if (ownedMaterialIds.has(String(mat.id))) {
            continue;
          }

          resolvedItems.push({
            materialId: String(mat.id),
            title: mat.title,
            price: Number(mat.price || 0),
          });
        }
      }

      if (resolvedItems.length === 0) {
        return new Response(
          JSON.stringify({
            error: "All selected items are already unlocked in your library or unavailable.",
            alreadyOwned: true,
          }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      primaryTitle = resolvedItems.length === 1 
        ? resolvedItems[0].title 
        : `${resolvedItems.length} Study Notes Bundle`;

    } else if (productType === "package" || productType === "semester" || packageId) {
      // ── SEMESTER PACKAGE / BUNDLE CHECKOUT ────────────────────────────────
      const targetPkgId = packageId || productId;
      let pkg: any = null;

      if (targetPkgId) {
        const { data } = await supabase
          .from("packages")
          .select("*")
          .eq("id", targetPkgId)
          .maybeSingle();
        pkg = data;
      }

      const semNum = pkg?.semester || (body.semester ? Number(body.semester) : null);
      const pkgPrice = Number(pkg?.price ?? pkg?.original_price ?? body.price ?? 799);

      let semMatIds: string[] = [];
      if (semNum) {
        const { data: sMats } = await supabase
          .from("materials")
          .select("id, title")
          .eq("semester", semNum);
        if (sMats) {
          semMatIds = sMats.map((m) => String(m.id));
        }
      }

      if (semMatIds.length > 0) {
        const unownedInPkg = semMatIds.filter((mId) => !ownedMaterialIds.has(mId));
        if (unownedInPkg.length === 0) {
          return new Response(
            JSON.stringify({
              error: `You already own all materials in Semester ${semNum}.`,
              alreadyOwned: true,
            }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      primaryTitle = pkg?.type ? `Semester ${semNum} Complete Package` : `Semester ${semNum || ""} Package`;
      effectiveProductId = String(targetPkgId || `sem_${semNum}`);
      effectiveProductType = "package";

      resolvedItems.push({
        materialId: effectiveProductId,
        title: primaryTitle,
        price: pkgPrice,
      });

    } else {
      // ── SINGLE STUDY MATERIAL CHECKOUT ─────────────────────────────────────
      const targetMatId = materialId || productId;
      if (!targetMatId) {
        return new Response(
          JSON.stringify({ error: "Missing material ID." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: material, error: matErr } = await supabase
        .from("materials")
        .select("id, title, price, is_premium, published")
        .eq("id", targetMatId)
        .maybeSingle();

      if (matErr || !material) {
        return new Response(
          JSON.stringify({ error: "Study material not found." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (material.published === false) {
        return new Response(
          JSON.stringify({ error: "This study material is currently not available for purchase." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (ownedMaterialIds.has(String(material.id))) {
        return new Response(
          JSON.stringify({
            error: "You already own this study note. Access is unlocked in My Notes.",
            alreadyOwned: true,
            materialId: material.id,
          }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const price = Number(material.price || 0);

      // Handle Free Material
      if (!material.is_premium || price <= 0) {
        const freeOrderId = `ord_free_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await supabase.from("orders").insert({
          id: freeOrderId,
          student_id: user.id,
          amount: 0,
          final_amount: 0,
          total_amount: 0,
          currency: "INR",
          status: "Paid",
          product_id: String(material.id),
          product_title: material.title,
          product_type: "material",
          material_ids: [String(material.id)],
          gateway: "free",
          order_date: new Date().toISOString(),
          payment_date: new Date().toISOString(),
        });

        await supabase.from("purchases").upsert({
          id: `pur_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          student_id: user.id,
          material_id: String(material.id),
          order_id: freeOrderId,
          amount: 0,
          status: "unlocked",
          payment_status: "free",
          purchased_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        }, { onConflict: "student_id,material_id" });

        return new Response(
          JSON.stringify({
            success: true,
            ok: true,
            isFree: true,
            orderId: freeOrderId,
            productTitle: material.title,
            message: "Free study note has been added to your library.",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      primaryTitle = material.title;
      effectiveProductId = String(material.id);
      effectiveProductType = "material";

      resolvedItems.push({
        materialId: String(material.id),
        title: material.title,
        price,
      });
    }

    // 4. Calculate Authoritative Total & Paise Conversion
    const totalRupees = resolvedItems.reduce((sum, item) => sum + item.price, 0);
    if (totalRupees <= 0) {
      return new Response(
        JSON.stringify({ error: "Invalid order amount." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const amountInPaise = Math.round(totalRupees * 100);
    const internalOrderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const materialIdsToStore = resolvedItems.map((it) => it.materialId);

    // 5. Create Pending Internal Order in Database
    const { error: orderInsertErr } = await supabase.from("orders").insert({
      id: internalOrderId,
      student_id: user.id,
      amount: totalRupees,
      discount: 0,
      final_amount: totalRupees,
      total_amount: amountInPaise,
      currency: "INR",
      status: "Pending", // Exact casing constraint
      product_id: effectiveProductId,
      product_title: primaryTitle,
      product_type: effectiveProductType,
      material_ids: materialIdsToStore,
      gateway: "razorpay",
      order_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (orderInsertErr) {
      console.error("Order insertion failed:", orderInsertErr);
      return new Response(
        JSON.stringify({ error: "Failed to create internal order record." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Insert Order Items snapshots
    const orderItemsRows = resolvedItems.map((it) => ({
      order_id: internalOrderId,
      material_id: it.materialId,
      material_title_snapshot: it.title,
      unit_price: Math.round(it.price * 100),
      quantity: 1,
      line_total: Math.round(it.price * 100),
      created_at: new Date().toISOString(),
    }));

    await supabase.from("order_items").insert(orderItemsRows).catch((e: any) => {
      console.warn("order_items insert warning:", e?.message);
    });

    // 7. Create Razorpay Server Order via REST API
    const { keyId } = getRazorpayCredentials();
    let razorpayOrder;

    try {
      razorpayOrder = await createRazorpayServerOrder({
        amountPaise: amountInPaise,
        currency: "INR",
        receipt: internalOrderId.slice(0, 40),
        notes: {
          internal_order_id: internalOrderId,
          student_id: user.id,
          product_title: primaryTitle.slice(0, 40),
          product_type: effectiveProductType,
        },
      });
    } catch (rzpErr: any) {
      console.error("Razorpay order creation failed:", rzpErr);

      await supabase
        .from("orders")
        .update({ status: "Failed", updated_at: new Date().toISOString() })
        .eq("id", internalOrderId);

      return new Response(
        JSON.stringify({ error: rzpErr.message || "Failed to initialize Razorpay checkout order." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 8. Update Order with Razorpay Order ID & Insert Initial Payment Record
    await supabase
      .from("orders")
      .update({
        razorpay_order_id: razorpayOrder.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", internalOrderId);

    await supabase.from("payments").insert({
      order_id: internalOrderId,
      student_id: user.id,
      gateway: "razorpay",
      razorpay_order_id: razorpayOrder.id,
      amount: amountInPaise,
      currency: "INR",
      status: "created",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).catch((e: any) => console.warn("Initial payment record notice:", e?.message));

    // 9. Return Public Checkout Details to Frontend
    return new Response(
      JSON.stringify({
        ok: true,
        success: true,
        orderId: internalOrderId,
        razorpayOrderId: razorpayOrder.id,
        amount: amountInPaise,
        amountInRupees: totalRupees,
        currency: "INR",
        productTitle: primaryTitle,
        keyId: keyId || "rzp_test_placeholder_key",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Unhandled error in create-razorpay-order:", err);
    return new Response(
      JSON.stringify({ error: err?.message || "Internal server error." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
