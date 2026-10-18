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
      studentName: clientStudentName,
      studentEmail: clientStudentEmail,
    } = body;

    const supabase = getServiceClient();

    // 2. Fetch authenticated student profile to resolve authoritative name & email
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", user.id)
      .maybeSingle();

    const resolvedStudentName = (
      profile?.full_name?.trim() ||
      user.user_metadata?.full_name?.trim() ||
      user.user_metadata?.name?.trim() ||
      (typeof clientStudentName === "string" ? clientStudentName.trim() : "") ||
      ""
    );

    const resolvedStudentEmail = (
      profile?.email?.trim() ||
      user.email?.trim() ||
      (typeof clientStudentEmail === "string" ? clientStudentEmail.trim() : "") ||
      ""
    );

    // Validate the name before inserting the order. If unavailable, return a clear error instead of inserting null.
    if (!resolvedStudentName) {
      return new Response(
        JSON.stringify({
          error: "Student name is required to complete this order. Please ensure your profile full name is configured.",
          code: "MISSING_STUDENT_NAME",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    // Map to hold package ID -> actual constituent material IDs
    const packageMaterialsMap = new Map<string, string[]>();

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
          // Resolve package materials and authoritative price from database
          const { data: pkg, error: pkgErr } = await supabase
            .from("packages")
            .select("*")
            .eq("id", it.id)
            .maybeSingle();

          if (pkgErr || !pkg) {
            return new Response(
              JSON.stringify({ error: `Package not found or invalid package ID: ${it.id}` }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          if (pkg.is_active === false) {
            return new Response(
              JSON.stringify({ error: `Package '${it.id}' is currently inactive.` }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          const rawPrice = pkg.price ?? pkg.original_price;
          const pkgPrice = typeof rawPrice === "number" ? rawPrice : Number(rawPrice);
          if (isNaN(pkgPrice) || pkgPrice <= 0) {
            return new Response(
              JSON.stringify({ error: `Invalid price configuration for package: ${it.id}` }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          const semNum = pkg.semester;

          // Get all published materials in this semester using actual database relationships
          let semMatIds: string[] = [];
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
              semMatIds = sMats
                .filter((m: any) =>
                  (m.semester === semNum || semSubIds.includes(m.subject_id)) &&
                  m.published !== false &&
                  m.status !== "Draft"
                )
                .map((m) => String(m.id));
            }
          }

          // If no materials owned yet or partially owned
          const unownedInPkg = semMatIds.filter((mId) => !ownedMaterialIds.has(mId));
          if (semMatIds.length > 0 && unownedInPkg.length === 0) {
            // Already owns everything in this package
            continue;
          }

          packageMaterialsMap.set(it.id, unownedInPkg.length > 0 ? unownedInPkg : semMatIds);

          resolvedItems.push({
            materialId: it.id,
            title: pkg.type ? `Semester ${semNum} Complete Package` : (it.title || `Semester ${semNum} Package`),
            price: pkgPrice,
          });
        } else {
          // Single study material in cart
          const { data: mat, error: matErr } = await supabase
            .from("materials")
            .select("id, title, price, is_premium, published")
            .eq("id", it.id)
            .maybeSingle();

          if (matErr || !mat) continue;
          if (mat.published === false) continue;

          // Check duplicate
          if (ownedMaterialIds.has(String(mat.id))) {
            continue; // Skip already owned item in cart
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
      if (!targetPkgId) {
        return new Response(
          JSON.stringify({ error: "Missing package ID." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: pkg, error: pkgErr } = await supabase
        .from("packages")
        .select("*")
        .eq("id", targetPkgId)
        .maybeSingle();

      if (pkgErr || !pkg) {
        return new Response(
          JSON.stringify({ error: "Package not found or invalid package ID." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (pkg.is_active === false) {
        return new Response(
          JSON.stringify({ error: "This package is currently inactive." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const rawPrice = pkg.price ?? pkg.original_price;
      const pkgPrice = typeof rawPrice === "number" ? rawPrice : Number(rawPrice);
      if (isNaN(pkgPrice) || pkgPrice <= 0) {
        return new Response(
          JSON.stringify({ error: "Invalid price configuration for this package in database." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const semNum = pkg.semester;

      // Fetch all published materials in this semester using actual database relationships
      let semMatIds: string[] = [];
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
          semMatIds = sMats
            .filter((m: any) =>
              (m.semester === semNum || semSubIds.includes(m.subject_id)) &&
              m.published !== false &&
              m.status !== "Draft"
            )
            .map((m) => String(m.id));
        }
      }

      // Check if student already owns all materials in this package
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
        packageMaterialsMap.set(String(targetPkgId), unownedInPkg);
      } else {
        packageMaterialsMap.set(String(targetPkgId), []);
      }

      primaryTitle = pkg.type ? `Semester ${semNum} Complete Package` : `Semester ${semNum || ""} Package`;
      effectiveProductId = String(targetPkgId);
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

      // Authoritative database check
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

      // Already owned validation
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
        const { error: freeOrderErr } = await supabase.from("orders").insert({
          id: freeOrderId,
          student_id: user.id,
          student_name: resolvedStudentName,
          student_email: resolvedStudentEmail || null,
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

        if (freeOrderErr) {
          console.error("Free order insert failed:", freeOrderErr);
          return new Response(
            JSON.stringify({ error: "Failed to record free order in database." }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error: freePurErr } = await supabase.from("purchases").upsert({
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

        if (freePurErr) {
          console.error("Free purchase record failed:", freePurErr);
          return new Response(
            JSON.stringify({ error: "Failed to unlock free material in database." }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

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

    // Resolve material IDs to store in order: packages expand to their included materials
    const materialIdsSet = new Set<string>();
    for (const it of resolvedItems) {
      if (packageMaterialsMap.has(it.materialId)) {
        const mIds = packageMaterialsMap.get(it.materialId) || [];
        for (const mid of mIds) materialIdsSet.add(mid);
      } else {
        materialIdsSet.add(it.materialId);
      }
    }
    const materialIdsToStore = Array.from(materialIdsSet);

    // 5. Create Pending Internal Order in Database
    const { error: orderInsertErr } = await supabase.from("orders").insert({
      id: internalOrderId,
      student_id: user.id,
      student_name: resolvedStudentName,
      student_email: resolvedStudentEmail || null,
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

    // 6. Insert Order Items snapshots (packages have material_id = null so package IDs are never treated as material IDs)
    const orderItemsRows = resolvedItems.map((it) => ({
      order_id: internalOrderId,
      material_id: packageMaterialsMap.has(it.materialId) ? null : it.materialId,
      material_title_snapshot: it.title,
      unit_price: Math.round(it.price * 100),
      quantity: 1,
      line_total: Math.round(it.price * 100),
      created_at: new Date().toISOString(),
    }));

    await supabase.from("order_items").insert(orderItemsRows).catch((e: any) => {
      console.warn("order_items insert warning:", e?.message);
    });

    // 7. Verify Razorpay Server Credentials & Create Razorpay Server Order
    const { keyId, keySecret } = getRazorpayCredentials();

    if (!keyId || !keySecret) {
      console.error("Missing server Razorpay credentials (RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET)");
      return new Response(
        JSON.stringify({
          error: "Payment gateway credentials are not configured on the server. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Supabase secrets.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let razorpayOrder;

    try {
      razorpayOrder = await createRazorpayServerOrder({
        amountPaise: amountInPaise,
        currency: "INR",
        receipt: internalOrderId.slice(0, 40),
        notes: {
          internal_order_id: internalOrderId,
          student_id: user.id,
          student_name: resolvedStudentName.slice(0, 40),
          student_email: resolvedStudentEmail.slice(0, 40),
          product_title: primaryTitle.slice(0, 40),
          product_type: effectiveProductType,
        },
      });
    } catch (rzpErr: any) {
      console.error("Razorpay order creation failed:", rzpErr);

      // Mark order as failed
      const { error: updateFailedErr } = await supabase
        .from("orders")
        .update({ status: "Failed", updated_at: new Date().toISOString() })
        .eq("id", internalOrderId);

      if (updateFailedErr) {
        console.error("Failed to update order status to Failed:", updateFailedErr);
      }

      return new Response(
        JSON.stringify({ error: rzpErr.message || "Failed to initialize Razorpay checkout order." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 8. Update Order with Razorpay Order ID & Insert Initial Payment Record
    const { error: orderUpdateErr } = await supabase
      .from("orders")
      .update({
        razorpay_order_id: razorpayOrder.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", internalOrderId);

    if (orderUpdateErr) {
      console.error("Failed to update order with razorpay_order_id:", orderUpdateErr);
      return new Response(
        JSON.stringify({ error: "Failed to update internal order with payment gateway order ID." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: paymentInsertErr } = await supabase.from("payments").insert({
      order_id: internalOrderId,
      student_id: user.id,
      gateway: "razorpay",
      razorpay_order_id: razorpayOrder.id,
      amount: amountInPaise,
      currency: "INR",
      status: "created",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (paymentInsertErr) {
      console.warn("Initial payment record notice:", paymentInsertErr);
    }

    // 9. Return Public Checkout Details to Frontend (Authoritative Real Key ID only)
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
        keyId: keyId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Unhandled error in create-order:", err);
    return new Response(
      JSON.stringify({ error: err?.message || "Internal server error." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
