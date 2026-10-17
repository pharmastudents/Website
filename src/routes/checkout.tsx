import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore, formatPrice } from "@/lib/store";
import { useCart } from "@/lib/cartContext";
import { PaymentService } from "@/lib/paymentService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  BookOpen,
  Package,
  CreditCard,
  User,
  AlertCircle,
  XCircle,
  RotateCcw,
  Loader2,
  Clock,
} from "lucide-react";

export const Route = createFileRoute("/checkout")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { productId?: string | undefined; productType?: string | undefined; fromCart?: boolean | undefined } => {
    return {
      productId: typeof search["productId"] === "string" ? (search["productId"] as string) : undefined,
      productType: typeof search["productType"] === "string" ? (search["productType"] as string) : undefined,
      fromCart: Boolean(search["fromCart"]),
    };
  },
  component: CheckoutPage,
});

type CheckoutStatus = "idle" | "creating_order" | "ready" | "verifying" | "success" | "failed" | "cancelled" | "already_owned";

import { usePurchaseDetection } from "@/lib/purchaseDetection";

export default function CheckoutPage() {
  const searchParams = useSearch({ from: "/checkout" });
  const navigate = useNavigate();
  const { student, db, ready } = useStore();
  const { items: cartItems, totalAmount: cartTotal, clearCart } = useCart();

  const [termsAgreed, setTermsAgreed] = useState(false);
  const [status, setStatus] = useState<CheckoutStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Live item metadata fetched directly from database
  const [dbMaterial, setDbMaterial] = useState<any | null>(null);
  const [loadingItem, setLoadingItem] = useState(true);

  // Completed order data
  const [orderResult, setOrderResult] = useState<{
    orderId: string;
    razorpayPaymentId?: string;
    productTitle: string;
    amountPaid: number; // in Rupees
  } | null>(null);

  const fromCart = Boolean(searchParams.fromCart && cartItems.length > 0);
  const productId = fromCart ? cartItems[0]?.id : searchParams.productId;
  const productType = fromCart ? (cartItems[0]?.type || "material") : (searchParams.productType || "material");

  // Authoritative purchase detection against Supabase database
  const targetCheckId = fromCart ? null : productId;
  const ownership = usePurchaseDetection(
    student?.id,
    targetCheckId,
    (productType as any) || "material"
  );

  // Check login requirement
  useEffect(() => {
    if (ready && !student) {
      toast.info("Please login or create a student account before purchasing.");
      void navigate({
        to: "/login",
        search: { redirect: `/checkout?productId=${productId}&productType=${productType}` } as any,
      });
    }
  }, [ready, student, navigate, productId, productType]);

  // Fetch verified material from database to ensure price integrity
  useEffect(() => {
    const targetId = productId;
    if (!targetId) {
      setLoadingItem(false);
      return;
    }

    let isMounted = true;
    async function fetchVerifiedItem(id: string) {
      setLoadingItem(true);
      try {
        if (productType === "material") {
          const { data, error } = await supabase
            .from("materials")
            .select("id, title, description, price, is_premium, subject_id, year, semester")
            .eq("id", id)
            .maybeSingle();

          if (isMounted) {
            if (data && !error) {
              setDbMaterial(data);
            } else {
              // Fallback to store
              const localMat = db.materials.find((m) => m.id === id);
              setDbMaterial(localMat || null);
            }
            setLoadingItem(false);
          }
        } else {
          // Package / Semester Bundle
          const { data, error } = await supabase
            .from("packages")
            .select("*")
            .eq("id", id)
            .maybeSingle();

          if (isMounted) {
            if (data && !error) {
              setDbMaterial(data);
            } else {
              const localPkg = db.packages.find((p) => p.id === id);
              setDbMaterial(localPkg || null);
            }
            setLoadingItem(false);
          }
        }
      } catch (e) {
        console.warn("Item fetch notice:", e);
        if (isMounted) setLoadingItem(false);
      }
    }

    void fetchVerifiedItem(targetId);

    return () => {
      isMounted = false;
    };
  }, [productId, productType, db.materials, db.packages]);

  // Resolve title and price from database record or cart
  const title = fromCart
    ? (cartItems.length === 1 ? cartItems[0]!.title : `${cartItems.length} Study Items in Cart`)
    : (dbMaterial?.title || dbMaterial?.name || "B.Pharm Study Document");
  const verifiedPrice = fromCart
    ? cartTotal
    : Number(dbMaterial?.price ?? dbMaterial?.offer_price ?? 79);
  const isPremium = fromCart ? (verifiedPrice > 0) : (dbMaterial?.is_premium ?? (verifiedPrice > 0));
  const subject = dbMaterial?.subject_id
    ? db.subjects.find((s) => s.id === dbMaterial.subject_id)
    : undefined;

  if (!ready || !student) return null;

  // ────────────────────────────────────────────────────────────────────────────
  // PAYMENT TRIGGER: Create order on backend and launch Razorpay Checkout
  // ────────────────────────────────────────────────────────────────────────────
  const handleInitiatePayment = async () => {
    if (!termsAgreed) {
      toast.error("Please accept the Terms & Conditions and Refund Policy to proceed.");
      return;
    }

    if (!fromCart && !productId) {
      toast.error("Invalid product selected.");
      return;
    }

    if (fromCart && cartItems.length === 0) {
      toast.error("Your cart is empty.");
      return;
    }

    setStatus("creating_order");
    setErrorMessage(null);

    try {
      // 1. Create Order via Supabase Edge Function
      const orderRes = await PaymentService.createOrder(
        fromCart
          ? {
              productType: "cart",
              items: cartItems.map((item) => ({
                id: item.id,
                type: item.type,
                title: item.title,
                price: item.price,
              })),
            }
          : {
              materialId: productType === "material" ? productId : undefined,
              packageId: productType !== "material" ? productId : undefined,
              productId: productId,
              productType: productType as any,
            }
      );

      // Handle Already Owned
      if (orderRes.alreadyOwned) {
        setStatus("already_owned");
        toast.info("You already own this material! Access is unlocked in your library.");
        return;
      }

      // Handle Free Material Workflow
      if (orderRes.isFree) {
        setOrderResult({
          orderId: orderRes.orderId || "FREE-ORDER",
          productTitle: title,
          amountPaid: 0,
        });
        setStatus("success");
        toast.success("Free study notes added to your library!");
        return;
      }

      if (!orderRes.ok || !orderRes.orderId || !orderRes.razorpayOrderId) {
        setStatus("failed");
        const msg = orderRes.error || "Failed to initialize secure payment order.";
        setErrorMessage(msg);
        toast.error(msg);
        return;
      }

      // 2. Open Razorpay Checkout Modal
      const keyId = orderRes.keyId || "rzp_test_placeholder_key";

      await PaymentService.openCheckout({
        keyId,
        amount: orderRes.amount || Math.round(verifiedPrice * 100),
        currency: orderRes.currency || "INR",
        orderId: orderRes.razorpayOrderId,
        internalOrderId: orderRes.orderId,
        name: "PharmaStudents.com",
        description: title,
        prefill: {
          name: student.name,
          email: student.email,
          contact: student.mobile,
        },
        onSuccess: async (rzpResponse) => {
          // 3. Server-side payment verification
          setStatus("verifying");

          const verifyRes = await PaymentService.verifyPayment({
            orderId: orderRes.orderId!,
            razorpayOrderId: rzpResponse.razorpay_order_id,
            razorpayPaymentId: rzpResponse.razorpay_payment_id,
            razorpaySignature: rzpResponse.razorpay_signature,
          });

          if (verifyRes.ok) {
            setOrderResult({
              orderId: orderRes.orderId!,
              razorpayPaymentId: rzpResponse.razorpay_payment_id,
              productTitle: title,
              amountPaid: verifiedPrice,
            });
            setStatus("success");
            clearCart();
            toast.success("Payment confirmed! Study notes unlocked in your reader.");
          } else {
            setStatus("failed");
            setErrorMessage(verifyRes.error || "Server verification failed. Please contact support.");
            toast.error("Payment verification failed.");
          }
        },
        onDismiss: () => {
          setStatus("cancelled");
          toast.info("Payment was cancelled. You have not been charged.");
        },
        onFailure: (err) => {
          setStatus("failed");
          setErrorMessage(err?.description || "Payment failed at bank gateway.");
          toast.error(err?.description || "Payment failed.");
        },
      });
    } catch (err: any) {
      console.error("Payment initiation error:", err);
      setStatus("failed");
      setErrorMessage(err?.message || "An unexpected error occurred.");
      toast.error(err?.message || "Payment could not be started.");
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  // STATE 0: LOADING ITEM OR CHECKING OWNERSHIP
  // ────────────────────────────────────────────────────────────────────────────
  if (loadingItem || (!fromCart && productId && ownership.state === "loading")) {
    return (
      <SiteLayout>
        <div className="flex min-h-[calc(100vh-14rem)] items-center justify-center px-4 py-16">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 sm:p-10 text-center shadow-xl">
            <Loader2 className="mx-auto size-12 animate-spin text-teal-600" />
            <h2 className="mt-5 text-xl font-bold text-foreground">Verifying License Status...</h2>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              Checking your student library and verified permissions with Supabase. Please wait a moment.
            </p>
          </div>
        </div>
      </SiteLayout>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // STATE 0.5: OWNERSHIP CHECK ERROR (A QUERY ERROR MUST NEVER GRANT ACCESS)
  // ────────────────────────────────────────────────────────────────────────────
  if (!fromCart && productId && ownership.state === "error") {
    return (
      <SiteLayout>
        <div className="flex min-h-[calc(100vh-14rem)] items-center justify-center px-4 py-16">
          <div className="w-full max-w-lg rounded-3xl border border-rose-500/20 bg-card p-8 sm:p-10 text-center shadow-xl">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600">
              <AlertCircle className="size-10" />
            </div>
            <h1 className="mt-5 text-2xl font-extrabold text-foreground">Verification Error</h1>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              {ownership.error || "We could not securely verify your license status due to a network or database issue. Access cannot be granted without verification."}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                onClick={() => ownership.refetch()}
                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-bold"
              >
                <RotateCcw className="mr-2 size-4" /> Retry Verification
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/bpharm">Back to Materials</Link>
              </Button>
            </div>
          </div>
        </div>
      </SiteLayout>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // STATE 1: ALREADY OWNED / PURCHASED
  // ────────────────────────────────────────────────────────────────────
  if ((!fromCart && ownership.state === "purchased") || status === "already_owned") {
    return (
      <SiteLayout>
        <div className="flex min-h-[calc(100vh-14rem)] items-center justify-center px-4 py-16">
          <div className="w-full max-w-lg rounded-3xl border border-teal-500/30 bg-card p-8 sm:p-10 text-center shadow-xl">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600">
              <CheckCircle2 className="size-10" />
            </div>
            <h1 className="mt-5 text-2xl font-extrabold text-foreground">Already in Your Library!</h1>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              You already hold an active personal license for <strong>{title}</strong>. You do not need to purchase it again.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              {productId && productType === "material" ? (
                <Button asChild size="lg" className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-bold">
                  <Link
                    to="/viewer/$studentId/$materialId"
                    params={{ studentId: student?.id || "student", materialId: productId }}
                  >
                    <BookOpen className="mr-2 size-4" /> Open in Protected Reader
                  </Link>
                </Button>
              ) : (
                <Button asChild size="lg" className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-bold">
                  <Link to="/dashboard/my-resources">
                    <BookOpen className="mr-2 size-4" /> Go to My Study Library
                  </Link>
                </Button>
              )}
              <Button asChild variant="outline" size="lg">
                <Link to="/bpharm">Back to Materials</Link>
              </Button>
            </div>
          </div>
        </div>
      </SiteLayout>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // STATE 2: PAYMENT SUCCESSFUL (CONFIRMED BY SERVER)
  // ────────────────────────────────────────────────────────────────────────────
  if (status === "success" && orderResult) {
    return (
      <SiteLayout>
        <div className="flex min-h-[calc(100vh-14rem)] items-center justify-center px-4 py-16">
          <div className="w-full max-w-lg rounded-3xl border border-emerald-500/30 bg-card p-8 sm:p-10 text-center shadow-xl">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="size-10" />
            </div>

            <Badge className="mt-4 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
              ✓ Verified & Confirmed
            </Badge>

            <h1 className="mt-3 text-2xl font-extrabold text-foreground">Payment Successful!</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Your study notes have been unlocked and licensed to your student account.
            </p>

            <div className="mt-6 rounded-2xl border border-border bg-muted/30 p-5 text-left text-xs space-y-2.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order ID:</span>
                <span className="font-mono font-semibold text-foreground">{orderResult.orderId}</span>
              </div>
              {orderResult.razorpayPaymentId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment ID:</span>
                  <span className="font-mono text-foreground">{orderResult.razorpayPaymentId}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Document Title:</span>
                <span className="font-semibold text-foreground max-w-[200px] truncate">{orderResult.productTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount Paid:</span>
                <span className="font-bold text-foreground">{formatPrice(orderResult.amountPaid)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">License Holder:</span>
                <span className="font-medium text-foreground">{student.name} ({student.email})</span>
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Button asChild size="lg" className="flex-1 bg-[#0e7490] hover:bg-[#0c627b] text-white font-bold shadow-xs">
                <Link to="/dashboard/my-resources">
                  <BookOpen className="mr-2 size-4" /> View My Notes
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="flex-1 border-slate-200 font-bold">
                <Link to="/bpharm">
                  Continue Browsing
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </SiteLayout>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // STATE 3: PAYMENT VERIFICATION IN PROGRESS (SERVER CONFIRMATION)
  // ────────────────────────────────────────────────────────────────────────────
  if (status === "verifying") {
    return (
      <SiteLayout>
        <div className="flex min-h-[calc(100vh-14rem)] items-center justify-center px-4 py-16">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-card p-8 sm:p-10 text-center shadow-xl">
            <Loader2 className="mx-auto size-12 animate-spin text-teal-600" />
            <h2 className="mt-5 text-xl font-bold text-foreground">Verifying Payment Signature...</h2>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              Contacting secure payment gateway to verify cryptographic signature and grant digital access. Please do not refresh.
            </p>
          </div>
        </div>
      </SiteLayout>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // STATE 4: PAYMENT FAILED OR CANCELLED (WITH RETRY OPTION)
  // ────────────────────────────────────────────────────────────────────────────
  if (status === "failed" || status === "cancelled") {
    const isCancelled = status === "cancelled";
    return (
      <SiteLayout>
        <div className="flex min-h-[calc(100vh-14rem)] items-center justify-center px-4 py-16">
          <div className="w-full max-w-lg rounded-3xl border border-rose-500/20 bg-card p-8 sm:p-10 text-center shadow-xl">
            <div className={`mx-auto flex size-16 items-center justify-center rounded-2xl ${
              isCancelled ? "bg-amber-500/10 text-amber-600" : "bg-rose-500/10 text-rose-600"
            }`}>
              {isCancelled ? <Clock className="size-10" /> : <XCircle className="size-10" />}
            </div>

            <h1 className="mt-5 text-2xl font-extrabold text-foreground">
              {isCancelled ? "Payment Cancelled" : "Payment Incomplete"}
            </h1>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              {errorMessage || (isCancelled
                ? "You dismissed the payment gateway before completing the transaction. No amount has been deducted."
                : "The bank or card network was unable to complete the transaction.")}
            </p>

            <div className="mt-6 rounded-2xl border border-border bg-muted/20 p-4 text-xs text-left">
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Product:</span>
                <span className="font-semibold text-foreground truncate max-w-[200px]">{title}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-bold text-foreground">{formatPrice(verifiedPrice)}</span>
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                onClick={() => {
                  setStatus("idle");
                  void handleInitiatePayment();
                }}
                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-bold"
              >
                <RotateCcw className="mr-2 size-4" /> Retry Payment
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/resources">Browse Other Notes</Link>
              </Button>
            </div>
          </div>
        </div>
      </SiteLayout>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // STANDARD CHECKOUT UI (DEFAULT STATE)
  // ────────────────────────────────────────────────────────────────────────────
  return (
    <SiteLayout>
      <div className="border-b border-border surface-section">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          <p className="text-xs font-bold tracking-widest text-primary uppercase">Razorpay Secure Checkout</p>
          <h1 className="mt-1 text-2xl font-extrabold text-foreground sm:text-3xl">
            Confirm & Complete Order
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Instant digital delivery with PCI Syllabus compliance and protected online reader access.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Checkout Columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Student Details Card */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <User className="size-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground">Student Account Information</h2>
                  <p className="text-xs text-muted-foreground">Licensed owner of study material</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4 rounded-xl border border-border bg-muted/20 p-4 text-xs">
                <div>
                  <span className="text-muted-foreground">Name:</span>
                  <p className="font-semibold text-foreground">{student.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Email:</span>
                  <p className="font-semibold text-foreground">{student.email}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">College:</span>
                  <p className="font-medium text-foreground">{student.college || "B.Pharm College"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Academic Status:</span>
                  <p className="font-medium text-foreground">
                    Year {student.year} · Sem {student.semester}
                  </p>
                </div>
              </div>
            </div>

            {/* Product Summary Card */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Package className="size-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground">Selected Study Resource</h2>
                  <p className="text-xs text-muted-foreground">Verified database pricing</p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-border/80 p-4">
                {loadingItem ? (
                  <div className="flex items-center gap-2 py-4 text-slate-400 text-xs">
                    <Loader2 className="size-4 animate-spin text-teal-600" />
                    <span>Loading verified pricing from database...</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <Badge variant="outline" className="text-[10px] uppercase font-bold text-primary">
                          {productType}
                        </Badge>
                        <h3 className="mt-2 text-base font-bold text-foreground">{title}</h3>
                        {subject && (
                          <p className="mt-0.5 text-xs font-semibold text-primary">{subject.name}</p>
                        )}
                        {dbMaterial?.description && (
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                            {dbMaterial.description}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-black text-foreground">
                          {verifiedPrice === 0 ? "Free" : formatPrice(verifiedPrice)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="size-3.5 text-emerald-500" /> PCI Syllabus Aligned
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="size-3.5 text-emerald-500" /> Mobile & Canvas Protected Reader
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="size-3.5 text-emerald-500" /> Lifetime Academic Access
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Payment Method Banner */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600">
                  <CreditCard className="size-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground">Payment Gateway</h2>
                  <p className="text-xs text-muted-foreground">Official Razorpay Checkout Integration</p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-teal-500/30 bg-teal-50/50 dark:bg-teal-950/20 p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-teal-900 dark:text-teal-200">Razorpay Gateway (All In One)</p>
                  <p className="text-[11px] text-teal-700 dark:text-teal-400 mt-0.5">
                    UPI (Google Pay, PhonePe, Paytm), Debit/Credit Cards, NetBanking, Wallets
                  </p>
                </div>
                <Badge className="bg-teal-600 text-white font-bold text-[10px]">Active</Badge>
              </div>
            </div>

            {/* Mandatory Terms & Conditions Checkbox */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Terms & Digital Licensing Agreement
              </h3>

              <div className="rounded-xl border border-border/80 bg-muted/20 p-3 text-[11px] text-muted-foreground space-y-1.5">
                <p>• Digital materials are immediately unlocked and subject to the Refund Policy.</p>
                <p>• Purchased notes are for your personal academic revision only.</p>
                <p>• Screenshotting, sharing, re-selling, or redistribution is strictly prohibited.</p>
              </div>

              <label className="flex items-start gap-3 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={termsAgreed}
                  onChange={(e) => setTermsAgreed(e.target.checked)}
                  className="mt-0.5 size-4 rounded border-input text-teal-600 focus:ring-teal-500"
                />
                <span className="text-xs text-foreground leading-normal">
                  I agree to the{" "}
                  <Link to="/terms" target="_blank" className="font-semibold text-primary hover:underline">
                    Terms & Conditions
                  </Link>
                  ,{" "}
                  <Link to="/privacy" target="_blank" className="font-semibold text-primary hover:underline">
                    Privacy Policy
                  </Link>{" "}
                  and{" "}
                  <Link to="/refund" target="_blank" className="font-semibold text-primary hover:underline">
                    Refund Policy
                  </Link>
                  .
                </span>
              </label>
            </div>
          </div>

          {/* Right Column: Order Summary & Pay Action */}
          <div>
            <div className="sticky top-24 rounded-2xl border border-border bg-card p-6 shadow-xs space-y-5">
              <h2 className="text-base font-bold text-foreground">Order Breakdown</h2>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Document Price:</span>
                  <span className="font-semibold text-foreground">{formatPrice(verifiedPrice)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Processing & GST:</span>
                  <span className="text-foreground">₹0 (Included)</span>
                </div>
                <div className="border-t border-border pt-3 flex justify-between items-baseline text-sm font-bold text-foreground">
                  <span>Total Payable:</span>
                  <span className="text-2xl font-black text-teal-700 dark:text-teal-400">
                    {verifiedPrice === 0 ? "Free" : formatPrice(verifiedPrice)}
                  </span>
                </div>
              </div>

              <Button
                onClick={handleInitiatePayment}
                disabled={!termsAgreed || status === "creating_order" || loadingItem}
                className="w-full h-12 text-base font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-lg"
              >
                {status === "creating_order" ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" /> Preparing Checkout...
                  </span>
                ) : verifiedPrice === 0 ? (
                  <>
                    <BookOpen className="mr-2 size-5" /> Add to Library for Free
                  </>
                ) : (
                  <>
                    <ShieldCheck className="mr-2 size-5" /> Pay {formatPrice(verifiedPrice)}
                  </>
                )}
              </Button>

              {!termsAgreed && (
                <p className="text-center text-[11px] text-amber-600 font-medium">
                  Please accept the terms checkbox to proceed to payment.
                </p>
              )}

              <div className="border-t border-border pt-4 text-center text-[10px] text-muted-foreground space-y-1">
                <p className="flex items-center justify-center gap-1 font-semibold">
                  <Lock className="size-3 text-emerald-600" /> 256-Bit SSL Encrypted Razorpay Checkout
                </p>
                <p>Licensed under PharmaStudents.com Digital Educational Vault</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
