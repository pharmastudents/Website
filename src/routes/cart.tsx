import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { StudentLayout } from "@/components/student/StudentLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore, formatPrice } from "@/lib/store";
import { useCart } from "@/lib/cartContext";
import { EmptyState } from "@/components/site/EmptyState";
import {
  ShoppingCart,
  Trash2,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Package,
  Layers,
  ShieldCheck,
  FileText,
} from "lucide-react";

export const Route = createFileRoute("/cart")({
  component: CartPage,
});

export default function CartPage() {
  const { student, session, ready } = useStore();
  const { items, count, subtotal, discount, totalAmount, removeFromCart, clearCart } = useCart();
  const navigate = useNavigate();

  // Protect route
  useEffect(() => {
    if (ready && !session && !student) {
      void navigate({
        to: "/login",
        search: { redirect: "/cart" } as any,
      });
    }
  }, [ready, session, student, navigate]);

  if (!ready || !student) return null;

  return (
    <StudentLayout
      title="My Cart"
      subtitle="Review your selected semester notes and packages before completing checkout."
    >
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Top actions: Back to Browse + Clear Cart */}
        <div className="flex items-center justify-between">
          <Button asChild variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <Link to="/bpharm">
              <ArrowLeft className="size-3.5" /> Continue Browsing
            </Link>
          </Button>

          {count > 0 && (
            <button
              onClick={clearCart}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1"
            >
              <Trash2 className="size-3.5" /> Clear All
            </button>
          )}
        </div>

        {count === 0 ? (
          <EmptyState
            title="Your cart is empty"
            description="You haven't added any study materials or semester packages to your cart yet."
            action={
              <Button asChild className="mt-4 bg-[#0e7490] hover:bg-[#0c627b] text-white">
                <Link to="/bpharm">Explore B.Pharm Notes</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left: Cart Items List */}
            <div className="space-y-3.5 lg:col-span-7">
              {items.map((item) => {
                const isPackage = item.type === "package" || item.type === "semester";
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs transition-all hover:border-teal-200"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Icon */}
                      <div
                        className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${
                          isPackage
                            ? "bg-teal-50 text-teal-700 border border-teal-100"
                            : "bg-blue-50 text-blue-700 border border-blue-100"
                        }`}
                      >
                        {isPackage ? <Package className="size-5" /> : <FileText className="size-5" />}
                      </div>

                      {/* Info */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                            {item.title}
                          </h3>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                          {item.subtitle || (item.code ? `${item.code} • Semester Notes` : "PCI Verified Notes")}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="text-[9px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 border-teal-200 px-1.5 py-0"
                          >
                            {isPackage ? "Semester Package" : "Unit Notes"}
                          </Badge>
                          {item.pages && (
                            <span className="text-[10px] text-slate-400">• {item.pages} Pages</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Price & Remove */}
                    <div className="flex items-center gap-4 shrink-0 pl-2">
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-900">{formatPrice(item.price)}</p>
                        {item.originalPrice && item.originalPrice > item.price && (
                          <p className="text-[10px] text-slate-400 line-through">
                            {formatPrice(item.originalPrice)}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        title="Remove from cart"
                        aria-label="Remove item"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right: Price Details Summary */}
            <div className="space-y-4 lg:col-span-5">
              <div className="rounded-3xl border border-border bg-card p-6 shadow-xs space-y-4">
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
                  Price Details
                </h2>

                <div className="divide-y divide-border/60 text-xs">
                  <div className="flex justify-between py-2 text-muted-foreground">
                    <span>Subtotal ({count} {count === 1 ? "item" : "items"})</span>
                    <span className="font-semibold text-foreground">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between py-2 text-emerald-600">
                    <span>Discount</span>
                    <span className="font-semibold">- ₹0</span>
                  </div>
                  <div className="flex justify-between pt-3 pb-1 text-sm font-black text-foreground">
                    <span>Total Amount</span>
                    <span className="text-base text-teal-700">{formatPrice(totalAmount)}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    asChild
                    size="lg"
                    className="w-full h-11 rounded-xl bg-[#0e7490] hover:bg-[#0c627b] text-white font-bold shadow-xs gap-2"
                  >
                    <Link to="/checkout" search={{ fromCart: true } as any}>
                      <span>Proceed to Checkout</span>
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </div>

                <div className="rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500 space-y-1.5 border border-slate-100">
                  <div className="flex items-center gap-1.5 text-teal-700 font-semibold">
                    <ShieldCheck className="size-4 shrink-0" />
                    <span>Razorpay Secure Payment</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    Supports UPI (GPay, PhonePe, Paytm), Credit/Debit Cards, NetBanking, and Wallets. Unlocks instant access in My Notes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
