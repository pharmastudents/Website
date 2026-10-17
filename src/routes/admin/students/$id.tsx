import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/store";
import { formatStudentId } from "@/lib/studentUtils";
import { toast } from "sonner";
import {
  ArrowLeft,
  User,
  GraduationCap,
  RefreshCw,
  AlertTriangle,
  Receipt,
  BookOpen,
} from "lucide-react";

export const Route = createFileRoute("/admin/students/$id")({
  component: AdminStudentDetailPage,
});

interface StudentProfile {
  id: string;
  email: string;
  full_name: string;
  mobile: string | null;
  college: string | null;
  year: number | null;
  semester: number | null;
  role: string;
  avatar_url: string | null;
  disabled: boolean;
  student_number?: string | null;
  created_at: string;
  updated_at: string;
}

interface OrderRecord {
  id: string;
  student_id: string;
  amount: number;
  final_amount?: number | null;
  status: string;
  transaction_id?: string | null;
  order_date: string;
  product_title?: string | null;
}

interface PurchaseRecord {
  id: string;
  student_id: string;
  material_id: string;
  created_at: string;
  status?: string | null;
}

interface MaterialInfo {
  id: string;
  title: string;
  type?: string | null;
}

export default function AdminStudentDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [materials, setMaterials] = useState<MaterialInfo[]>([]);
  const [favoritesCount, setFavoritesCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Status updating & confirmation modal
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const fetchStudentData = useCallback(async () => {
    setLoading(true);
    setNotFound(false);

    try {
      // 1. Fetch real student profile by UUID
      const { data: prof, error: pErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (pErr) throw pErr;
      if (!prof || prof.role === "admin") {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setStudent(prof as StudentProfile);

      // 2. Fetch real orders for this student
      const { data: ords } = await supabase
        .from("orders")
        .select("*")
        .eq("student_id", id)
        .order("order_date", { ascending: false });

      setOrders((ords as OrderRecord[]) || []);

      // 3. Fetch real purchases
      const { data: purch } = await supabase
        .from("purchases")
        .select("*")
        .eq("student_id", id);

      const purchList = (purch as PurchaseRecord[]) || [];
      setPurchases(purchList);

      // 4. Fetch materials info if purchases exist
      if (purchList.length > 0) {
        const matIds = purchList.map((p) => p.material_id).filter(Boolean);
        if (matIds.length > 0) {
          const { data: mats } = await supabase
            .from("materials")
            .select("id, title, type")
            .in("id", matIds);
          setMaterials((mats as MaterialInfo[]) || []);
        }
      }

      // 5. Fetch real favorites/bookmarks
      const { count } = await supabase
        .from("favorites")
        .select("*", { count: "exact", head: true })
        .eq("student_id", id);

      setFavoritesCount(count || 0);
    } catch (err: unknown) {
      console.error("Error fetching student profile:", err);
      toast.error("Failed to load student profile details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchStudentData();
  }, [fetchStudentData]);

  // Account status actions
  const handleToggleStatus = async () => {
    if (!student) return;

    if (!student.disabled) {
      // Prompt confirmation before deactivating
      setShowDeactivateDialog(true);
      return;
    }

    // Direct activation
    setStatusUpdating(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ disabled: false })
        .eq("id", student.id);

      if (error) throw error;

      setStudent((prev) => (prev ? { ...prev, disabled: false } : null));
      toast.success("Student account activated successfully.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to activate account";
      toast.error(msg);
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleConfirmDeactivation = async () => {
    if (!student) return;
    setStatusUpdating(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ disabled: true })
        .eq("id", student.id);

      if (error) throw error;

      setStudent((prev) => (prev ? { ...prev, disabled: true } : null));
      toast.success("Student account deactivated.");
      setShowDeactivateDialog(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to deactivate account";
      toast.error(msg);
    } finally {
      setStatusUpdating(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Student Profile" subtitle="Loading verified student profile...">
        <div className="py-24 text-center">
          <RefreshCw className="mx-auto mb-3 size-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Retrieving student records from Supabase...</p>
        </div>
      </AdminLayout>
    );
  }

  if (notFound || !student) {
    return (
      <AdminLayout title="Student Not Found">
        <div className="rounded-3xl border border-border bg-card p-12 text-center shadow-xs">
          <AlertTriangle className="mx-auto mb-3 size-10 text-amber-500" />
          <h2 className="text-lg font-bold text-foreground">Student Record Not Found</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            The requested student account does not exist in the database or belongs to an administrator.
          </p>
          <Button asChild className="mt-5 h-9 text-xs">
            <Link to="/admin/students">Back to Students Directory</Link>
          </Button>
        </div>
      </AdminLayout>
    );
  }

  // Financial summary calculated strictly from real orders
  const studentIdNumber = formatStudentId(student);
  const successfulOrders = orders.filter((o) => o.status === "Paid");
  const pendingOrders = orders.filter((o) => o.status === "Pending");
  const totalPaid = successfulOrders.reduce(
    (sum, o) => sum + (o.final_amount ?? o.amount ?? 0),
    0,
  );
  const totalPending = pendingOrders.reduce(
    (sum, o) => sum + (o.final_amount ?? o.amount ?? 0),
    0,
  );

  const formattedRegDate = student.created_at
    ? new Date(student.created_at).toLocaleDateString()
    : "Not provided";

  const formattedRegDateTime = student.created_at
    ? new Date(student.created_at).toLocaleString()
    : "Not provided";

  return (
    <AdminLayout
      title={`Student: ${student.full_name || student.email}`}
      subtitle={`Student Profile ID: ${studentIdNumber} · Registered on ${formattedRegDate}`}
      actions={
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="h-9 text-xs">
            <Link to="/admin/students">
              <ArrowLeft className="mr-1.5 size-3.5" /> Back to Directory
            </Link>
          </Button>
          <Button
            size="sm"
            disabled={statusUpdating}
            variant={student.disabled ? "default" : "destructive"}
            className="h-9 text-xs font-semibold"
            onClick={() => void handleToggleStatus()}
          >
            {student.disabled ? "Activate Account" : "Deactivate Account"}
          </Button>
        </div>
      }
    >
      <div className="space-y-8">
        {/* Row 1: Financial & Digital Licenses Summary Cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
            <span className="text-xs font-semibold text-muted-foreground">Total Orders</span>
            <p className="mt-1 text-2xl font-black text-foreground">{orders.length}</p>
            <div className="mt-1 text-[11px] text-muted-foreground">
              {successfulOrders.length} Paid · {pendingOrders.length} Pending
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
            <span className="text-xs font-semibold text-muted-foreground">Total Amount Paid</span>
            <p className="mt-1 text-2xl font-black text-emerald-600">
              {formatPrice(totalPaid)}
            </p>
            <div className="mt-1 text-[11px] text-muted-foreground">All completed licenses</div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
            <span className="text-xs font-semibold text-muted-foreground">Total Pending</span>
            <p className="mt-1 text-2xl font-black text-amber-600">
              {totalPending > 0 ? formatPrice(totalPending) : "Free"}
            </p>
            <div className="mt-1 text-[11px] text-muted-foreground">Awaiting payment</div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
            <span className="text-xs font-semibold text-muted-foreground">Unlocked Notes</span>
            <p className="mt-1 text-2xl font-black text-foreground">{purchases.length}</p>
            <div className="mt-1 text-[11px] text-muted-foreground">Active digital licenses</div>
          </div>
        </div>

        {/* Row 2: Personal & Academic Details */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Personal Details */}
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xs space-y-5">
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <User className="size-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-foreground">Personal & Contact Details</h3>
                <p className="text-xs text-muted-foreground">Enrolled student identity</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground">Full Name:</span>
                <p className="font-semibold text-foreground text-sm">
                  {student.full_name || "Not provided"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Student ID:</span>
                <p className="font-mono text-primary font-bold text-sm">{studentIdNumber}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Email:</span>
                <p className="font-medium text-foreground">{student.email || "Not provided"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Mobile Phone:</span>
                <p className="font-medium text-foreground">{student.mobile || "Not provided"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Account Status:</span>
                <div className="mt-1">
                  {student.disabled ? (
                    <Badge variant="destructive" className="text-[10px]">
                      Deactivated
                    </Badge>
                  ) : (
                    <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px]">
                      Active
                    </Badge>
                  )}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Registration Date:</span>
                <p className="font-medium text-foreground">{formattedRegDateTime}</p>
              </div>
            </div>
          </div>

          {/* Academic Details */}
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xs space-y-5">
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <GraduationCap className="size-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-foreground">Academic Status</h3>
                <p className="text-xs text-muted-foreground">B.Pharm college curriculum</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="col-span-2">
                <span className="text-muted-foreground">Pharmacy College:</span>
                <p className="font-semibold text-foreground text-sm">
                  {student.college || "Not provided"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Current B.Pharm Year:</span>
                <p className="font-bold text-foreground text-sm">
                  {student.year ? `Year ${student.year}` : "Not provided"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Current Semester:</span>
                <p className="font-bold text-foreground text-sm">
                  {student.semester ? `Semester ${student.semester}` : "Not provided"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Last Document Read:</span>
                <p className="font-medium text-foreground">
                  {materials[0]?.title || "None recorded"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Saved Bookmarks:</span>
                <p className="font-semibold text-foreground">{favoritesCount} notes</p>
              </div>
            </div>
          </div>
        </div>

        {/* Row 3: Order & Payment History Table */}
        <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h3 className="text-base font-bold text-foreground">Order & Payment History</h3>
              <p className="text-xs text-muted-foreground">Complete transaction logs for this student</p>
            </div>
            <span className="text-xs font-bold text-muted-foreground">
              {orders.length} {orders.length === 1 ? "Order" : "Orders"}
            </span>
          </div>

          {orders.length === 0 ? (
            <div className="py-12 text-center">
              <Receipt className="mx-auto mb-2 size-7 text-muted-foreground/40" />
              <p className="text-xs font-medium text-muted-foreground">
                No orders or purchases found for this student.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border text-muted-foreground">
                  <tr>
                    <th className="py-3 px-3">Order ID</th>
                    <th className="py-3 px-3">Product</th>
                    <th className="py-3 px-3">Amount</th>
                    <th className="py-3 px-3">Gateway / Txn ID</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-muted/10">
                      <td className="py-3 px-3 font-mono font-bold text-foreground">{ord.id}</td>
                      <td className="py-3 px-3 font-semibold max-w-[240px] truncate text-foreground">
                        {ord.product_title || "Pharma Study Material"}
                      </td>
                      <td className="py-3 px-3 font-bold text-foreground">
                        {formatPrice(ord.final_amount ?? ord.amount)}
                      </td>
                      <td className="py-3 px-3 font-mono text-muted-foreground">
                        {ord.transaction_id || "N/A"}
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">
                        {ord.order_date ? new Date(ord.order_date).toLocaleDateString() : "N/A"}
                      </td>
                      <td className="py-3 px-3">
                        <Badge
                          className={
                            ord.status === "Paid"
                              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[9px]"
                              : ord.status === "Pending"
                                ? "bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[9px]"
                                : "bg-rose-500/10 text-rose-600 border border-rose-500/20 text-[9px]"
                          }
                        >
                          {ord.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog for Deactivation */}
      <AlertDialog
        open={showDeactivateDialog}
        onOpenChange={(open) => !open && setShowDeactivateDialog(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" />
              <AlertDialogTitle>Deactivate Student Account?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="space-y-2 pt-2">
              <p>
                Are you sure you want to deactivate the account for{" "}
                <strong className="text-foreground">
                  {student.full_name || student.email}
                </strong>{" "}
                (Student ID: <strong className="font-mono text-foreground">{studentIdNumber}</strong>)?
              </p>
              <p className="text-xs text-muted-foreground">
                Deactivating will prevent this student from signing in and downloading materials.
                All their past purchases and account details will remain saved.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={statusUpdating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleConfirmDeactivation()}
              disabled={statusUpdating}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {statusUpdating ? "Deactivating..." : "Yes, Deactivate Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
