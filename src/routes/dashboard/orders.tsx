import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { StudentLayout } from "@/components/student/StudentLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useStore, formatPrice } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState } from "@/components/site/EmptyState";
import {
  CheckCircle2,
  Clock,
  BookOpen,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

export const Route = createFileRoute("/dashboard/orders")({
  component: StudentOrdersPage,
});

interface StudentOrder {
  id: string;
  created_at?: string | null;
  order_date?: string | null;
  product_id?: string | null;
  product_title?: string | null;
  product_type?: string | null;
  amount: number;
  final_amount?: number | null;
  total_amount?: number | null; // in paise
  status: string;
  gateway?: string | null;
  transaction_id?: string | null;
  razorpay_order_id?: string | null;
}

export default function StudentOrdersPage() {
  const { student, db } = useStore();
  const [orders, setOrders] = useState<StudentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStudentOrders = useCallback(async () => {
    if (!student?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("student_id", student.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Could not fetch orders from DB, falling back to local cache:", error);
        // Fallback to local store
        const fallback = db.orders
          .filter((o) => o.studentId === student.id)
          .map((o) => ({
            id: o.id,
            created_at: o.orderDate || new Date().toISOString(),
            product_id: o.productId,
            product_title: o.productTitle,
            product_type: o.productType,
            amount: o.amount,
            final_amount: o.finalAmount,
            status: o.status.toLowerCase(),
            gateway: o.gateway,
            transaction_id: o.transactionId,
          }));
        setOrders(fallback);
      } else {
        setOrders((data as unknown as StudentOrder[]) || []);
      }
    } catch (e) {
      console.error("Order fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [student?.id, db.orders]);

  useEffect(() => {
    void fetchStudentOrders();
  }, [fetchStudentOrders]);

  if (!student) return null;

  return (
    <StudentLayout
      title="Orders & Payment History"
      subtitle="View all your past study note purchases, payment statuses, and unlocked licenses."
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Displaying official purchase records registered to{" "}
            <strong className="text-foreground">{student.email}</strong>.
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void fetchStudentOrders()}
            disabled={loading}
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {orders.length === 0 && !loading ? (
          <EmptyState
            title="No orders found"
            description="You haven't made any purchases yet. Browse verified semester notes or revision bundles to get started."
            action={
              <Button asChild className="mt-4 bg-[#0e7490] hover:bg-[#0c627b] text-white">
                <Link to="/resources">Explore Resources</Link>
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/30 text-muted-foreground font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Order ID & Date</th>
                  <th className="py-3.5 px-4">Study Material / Package</th>
                  <th className="py-3.5 px-4">Amount Paid</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {orders.map((order) => {
                  const normalizedStatus = (order.status || "").toLowerCase();
                  const isPaid = normalizedStatus === "paid";
                  const isPending = normalizedStatus === "pending";
                  const isFailed = normalizedStatus === "failed" || normalizedStatus === "cancelled";
                  const isRefunded =
                    normalizedStatus === "refunded" || normalizedStatus === "partially_refunded";

                  // Display amount in rupees
                  const displayAmount =
                    order.final_amount ??
                    order.amount ??
                    (order.total_amount ? order.total_amount / 100 : 0);

                  return (
                    <tr key={order.id} className="hover:bg-muted/10 transition-colors">
                      <td className="py-3.5 px-4">
                        <p className="font-mono font-bold text-foreground text-xs">
                          {order.id.slice(0, 16)}...
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {new Date(order.created_at || order.order_date || Date.now()).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 max-w-[240px]">
                        <p className="font-bold text-foreground text-xs truncate">
                          {order.product_title || "Study Material"}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground uppercase font-medium">
                            {order.product_type || "material"}
                          </span>
                          {order.gateway && (
                            <span className="text-[10px] text-muted-foreground">
                              • {order.gateway}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-black text-foreground text-xs">
                        {formatPrice(displayAmount)}
                      </td>
                      <td className="py-3.5 px-4">
                        {isPaid ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] font-bold">
                            <CheckCircle2 className="mr-1 size-3" /> Paid & Licensed
                          </Badge>
                        ) : isPending ? (
                          <Badge className="bg-amber-500/10 text-amber-700 border border-amber-500/20 text-[10px] font-bold">
                            <Clock className="mr-1 size-3" /> Awaiting Payment
                          </Badge>
                        ) : isRefunded ? (
                          <Badge variant="outline" className="text-muted-foreground text-[10px] font-bold">
                            Refunded
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px] font-bold">
                            <AlertTriangle className="mr-1 size-3" /> Failed
                          </Badge>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {isPaid ? (
                          <Button asChild size="sm" variant="outline" className="h-7 text-xs rounded-xl font-bold">
                            <Link to="/dashboard/my-resources">
                              <BookOpen className="mr-1.5 size-3.5 text-[#0e7490]" /> Access Material
                            </Link>
                          </Button>
                        ) : isFailed || isPending ? (
                          order.product_id ? (
                            <Button
                              asChild
                              size="sm"
                              className="h-7 text-xs rounded-xl bg-[#0e7490] hover:bg-[#0c627b] text-white font-bold"
                            >
                              <Link
                                to="/checkout"
                                search={{
                                  productId: order.product_id,
                                  productType: (order.product_type as any) || "material",
                                }}
                              >
                                <RotateCcw className="mr-1.5 size-3" /> Retry Payment
                              </Link>
                            </Button>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">—</span>
                          )
                        ) : (
                          <span className="text-[11px] text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
