import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useState, useMemo, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { formatPrice, YEARS, SEMESTERS } from "@/lib/store";
import { formatStudentId } from "@/lib/studentUtils";
import { toast } from "sonner";
import { Search, Eye, RefreshCw, AlertTriangle, Users } from "lucide-react";

export const Route = createFileRoute("/admin/students/")({
  validateSearch: (search: Record<string, unknown>): { year?: number | undefined; status?: string | undefined } => {
    return {
      year: typeof search["year"] === "number" ? (search["year"] as number) : undefined,
      status: typeof search["status"] === "string" ? (search["status"] as string) : undefined,
    };
  },
  component: AdminStudentsDirectoryPage,
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
}

export default function AdminStudentsDirectoryPage() {
  const searchParams = useSearch({ from: "/admin/students/" });

  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [filterYear, setFilterYear] = useState<string>(
    searchParams.year ? String(searchParams.year) : "all",
  );
  const [filterSem, setFilterSem] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>(
    searchParams.status || "all",
  );

  // Deactivation confirmation modal state
  const [confirmTarget, setConfirmTarget] = useState<StudentProfile | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const fetchRealData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      // 1. Fetch real student profiles, excluding admins
      const { data: profs, error: pErr } = await supabase
        .from("profiles")
        .select("*")
        .neq("role", "admin")
        .order("created_at", { ascending: false });

      if (pErr) throw pErr;

      // 2. Fetch real orders to compute verified purchases
      const { data: ords, error: oErr } = await supabase
        .from("orders")
        .select("id, student_id, amount, final_amount, status");

      if (oErr) {
        console.warn("Could not query orders table:", oErr.message);
      }

      setStudents((profs as StudentProfile[]) || []);
      setOrders((ords as OrderRecord[]) || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load students directory";
      console.error("Error fetching students:", err);
      toast.error(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchRealData();
  }, [fetchRealData]);

  // Handle Account Status Toggle (Activate / Deactivate)
  const handleToggleStatus = async (st: StudentProfile) => {
    if (!st.disabled) {
      // Prompt for confirmation before deactivating
      setConfirmTarget(st);
      return;
    }

    // Direct activation
    setStatusUpdating(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ disabled: false })
        .eq("id", st.id);

      if (error) throw error;

      setStudents((prev) =>
        prev.map((item) => (item.id === st.id ? { ...item, disabled: false } : item)),
      );
      toast.success(`Account for ${st.full_name || st.email} has been activated.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update account status";
      toast.error(msg);
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleConfirmDeactivation = async () => {
    if (!confirmTarget) return;
    setStatusUpdating(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ disabled: true })
        .eq("id", confirmTarget.id);

      if (error) throw error;

      setStudents((prev) =>
        prev.map((item) =>
          item.id === confirmTarget.id ? { ...item, disabled: true } : item,
        ),
      );
      toast.success(
        `Account for ${confirmTarget.full_name || confirmTarget.email} has been deactivated.`,
      );
      setConfirmTarget(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to deactivate account";
      toast.error(msg);
    } finally {
      setStatusUpdating(false);
    }
  };

  // Filtered students
  const filtered = useMemo(() => {
    return students.filter((st) => {
      if (filterYear !== "all" && st.year !== Number(filterYear)) return false;
      if (filterSem !== "all" && st.semester !== Number(filterSem)) return false;
      if (filterStatus === "active" && st.disabled) return false;
      if (filterStatus === "disabled" && !st.disabled) return false;

      if (query.trim()) {
        const q = query.toLowerCase();
        const studentId = formatStudentId(st).toLowerCase();
        const matchId = studentId.includes(q);
        const matchName = (st.full_name || "").toLowerCase().includes(q);
        const matchEmail = (st.email || "").toLowerCase().includes(q);
        const matchMobile = (st.mobile || "").includes(q);
        const matchCollege = (st.college || "").toLowerCase().includes(q);
        if (!matchId && !matchName && !matchEmail && !matchMobile && !matchCollege) {
          return false;
        }
      }
      return true;
    });
  }, [students, filterYear, filterSem, filterStatus, query]);

  return (
    <AdminLayout
      title="Registered Students Directory"
      subtitle="Complete database of enrolled pharmacy students with academic credentials and order history."
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => void fetchRealData(true)}
          disabled={loading || refreshing}
          className="h-9 gap-1.5 text-xs"
        >
          <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing..." : "Refresh Database"}
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Filters Box */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search students by name, email, mobile, or college..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9 h-10 text-xs"
              />
            </div>

            <select
              aria-label="Filter by Academic Year"
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-xs"
            >
              <option value="all">All Academic Years</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  Year {y}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter by Semester"
              value={filterSem}
              onChange={(e) => setFilterSem(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-xs"
            >
              <option value="all">All Semesters</option>
              {SEMESTERS.map((s) => (
                <option key={s} value={s}>
                  Semester {s}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
            <span>
              Showing <strong>{filtered.length}</strong> of {students.length} students
            </span>
            {(filterYear !== "all" || filterSem !== "all" || query || filterStatus !== "all") && (
              <button
                onClick={() => {
                  setFilterYear("all");
                  setFilterSem("all");
                  setFilterStatus("all");
                  setQuery("");
                }}
                className="text-primary font-semibold hover:underline"
              >
                Reset filters
              </button>
            )}
          </div>
        </div>

        {/* Students Table */}
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-xs">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground">
              <tr>
                <th className="p-4">Student ID & Name</th>
                <th className="p-4">Contact & College</th>
                <th className="p-4">Academic Status</th>
                <th className="p-4">Purchases / Spent</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-xs text-muted-foreground">
                    <RefreshCw className="mx-auto mb-2 size-5 animate-spin text-primary" />
                    Loading verified students from database...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <Users className="mx-auto mb-3 size-8 text-muted-foreground/50" />
                    <p className="text-sm font-semibold text-foreground">No students found</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {students.length === 0
                        ? "There are currently no registered student accounts in the database."
                        : "No students matched your search criteria."}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((st) => {
                  const studentIdNumber = formatStudentId(st);
                  const studentOrders = orders.filter((o) => o.student_id === st.id);
                  const totalPaid = studentOrders
                    .filter((o) => o.status === "Paid")
                    .reduce((sum, o) => sum + (o.final_amount ?? o.amount ?? 0), 0);

                  return (
                    <tr key={st.id} className="hover:bg-muted/10 transition-colors">
                      <td className="p-4">
                        <p className="font-bold text-foreground text-xs">
                          {st.full_name || "Unnamed Student"}
                        </p>
                        <span className="font-mono text-[11px] font-semibold text-primary">
                          {studentIdNumber}
                        </span>
                      </td>
                      <td className="p-4 text-xs">
                        <p className="font-medium text-foreground">{st.email}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {st.mobile || "No phone"} · {st.college || "No college specified"}
                        </p>
                      </td>
                      <td className="p-4 text-xs">
                        <span className="rounded-md bg-muted px-2 py-0.5 font-medium text-foreground">
                          Year {st.year ?? "N/A"} · Sem {st.semester ?? "N/A"}
                        </span>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          Joined {new Date(st.created_at).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="p-4 text-xs">
                        <p className="font-bold text-foreground">
                          {studentOrders.length} {studentOrders.length === 1 ? "order" : "orders"}
                        </p>
                        <p className="text-primary font-semibold">
                          {formatPrice(totalPaid)} paid
                        </p>
                      </td>
                      <td className="p-4">
                        {st.disabled ? (
                          <Badge variant="destructive" className="text-[10px]">
                            Deactivated
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                            Active
                          </Badge>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                            <Link to="/admin/students/$id" params={{ id: st.id }}>
                              <Eye className="mr-1 size-3.5" /> Profile
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={statusUpdating}
                            className={`h-8 text-xs ${
                              st.disabled
                                ? "text-emerald-600 hover:text-emerald-700"
                                : "text-muted-foreground hover:text-destructive"
                            }`}
                            onClick={() => void handleToggleStatus(st)}
                          >
                            {st.disabled ? "Enable" : "Disable"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Dialog for Account Deactivation */}
      <AlertDialog
        open={confirmTarget !== null}
        onOpenChange={(open) => !open && setConfirmTarget(null)}
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
                  {confirmTarget?.full_name || confirmTarget?.email}
                </strong>{" "}
                (Student ID:{" "}
                <strong className="font-mono text-foreground">
                  {confirmTarget ? formatStudentId(confirmTarget) : ""}
                </strong>
                )?
              </p>
              <p className="text-xs text-muted-foreground">
                Deactivating will prevent this student from signing in and accessing study materials.
                Their profile data and purchase records will be safely preserved.
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
