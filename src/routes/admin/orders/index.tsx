import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useState, useMemo, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { AcademicService, type Course, type Semester, type SubjectItem, type MaterialItem } from "@/lib/academicService";
import { formatPrice } from "@/lib/store";
import { toast } from "sonner";
import {
  CreditCard,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  RotateCcw,
  RefreshCw,
  Calendar,
  Filter,
  User,
  Package,
  IndianRupee,
  Download,
  AlertTriangle,
} from "lucide-react";

export const Route = createFileRoute("/admin/orders/")({
  validateSearch: (search: Record<string, unknown>): { status?: string } => {
    const st = typeof search["status"] === "string" ? (search["status"] as string) : "";
    return st ? { status: st } : {};
  },
  component: AdminOrdersPage,
});

interface OrderRecord {
  id: string;
  student_id?: string | null;
  student_name?: string | null;
  student_email?: string | null;
  product_id?: string | null;
  product_title?: string | null;
  product_type?: string | null;
  material_ids?: string[] | null;
  amount: number;
  final_amount?: number | null;
  discount?: number | null;
  status: string;
  gateway?: string | null;
  transaction_id?: string | null;
  order_date?: string | null;
  created_at?: string | null;
  payment_date?: string | null;
}

interface ProfileRecord {
  id: string;
  full_name?: string | null;
  email?: string | null;
  mobile?: string | null;
  college?: string | null;
  year?: number | null;
  semester?: number | null;
}

export default function AdminOrdersPage() {
  const searchParams = useSearch({ from: "/admin/orders/" });

  // Database Data States
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileRecord>>({});
  const [courses, setCourses] = useState<Course[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [query, setQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>(
    searchParams.status ? searchParams.status.toLowerCase() : "all",
  );
  const [selectedCourseId, setSelectedCourseId] = useState<string>("all");
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>("all");
  const [selectedProductType, setSelectedProductType] = useState<string>("all");
  const [dateRange, setDateRange] = useState<"all" | "today" | "month" | "last30" | "custom">("all");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  // Details Modal
  const [detailsOrder, setDetailsOrder] = useState<OrderRecord | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // 1. Fetch Real Orders & Associated Database Relations
  const fetchOrdersData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        { data: rawOrders, error: oErr },
        { data: rawProfiles, error: pErr },
        academicData,
      ] = await Promise.all([
        supabase
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("id, full_name, email, mobile, college, year, semester"),
        AcademicService.loadAll(),
      ]);

      if (oErr) console.error("Error fetching orders:", oErr);
      if (pErr) console.error("Error fetching profiles:", pErr);

      const profMap: Record<string, ProfileRecord> = {};
      (rawProfiles || []).forEach((p) => {
        profMap[p.id] = p;
      });

      setOrders((rawOrders as OrderRecord[]) || []);
      setProfiles(profMap);
      setCourses(academicData.courses || []);
      setSemesters(academicData.semesters || []);
      setSubjects(academicData.subjects || []);
      setMaterials(academicData.materials || []);
    } catch (err: unknown) {
      console.error("Failed to load orders data:", err);
      toast.error("Failed to fetch database orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchOrdersData();
  }, [fetchOrdersData]);

  // Dynamic Semesters for Selected Course
  const courseSemesters = useMemo(() => {
    if (selectedCourseId === "all") return semesters;
    return semesters.filter((s) => s.course_id === selectedCourseId);
  }, [semesters, selectedCourseId]);

  // When course changes, reset semester filter if not in the new course
  useEffect(() => {
    if (selectedCourseId !== "all" && selectedSemesterId !== "all") {
      const validInCourse = semesters.some(
        (s) => s.course_id === selectedCourseId && s.id === selectedSemesterId,
      );
      if (!validInCourse) {
        setSelectedSemesterId("all");
      }
    }
  }, [selectedCourseId, selectedSemesterId, semesters]);

  // Quick lookup helper: determine which course and semester an order belongs to
  const getOrderAcademicPlacement = useCallback(
    (ord: OrderRecord) => {
      // 1. Direct course/semester match on product_id
      if (ord.product_id) {
        const directCourse = courses.find((c) => c.id === ord.product_id);
        if (directCourse) return { courseId: directCourse.id, semesterId: null };

        const directSemester = semesters.find((s) => s.id === ord.product_id);
        if (directSemester) return { courseId: directSemester.course_id, semesterId: directSemester.id };

        const directSubject = subjects.find((s) => s.id === ord.product_id);
        if (directSubject) return { courseId: directSubject.course_id, semesterId: directSubject.semester_id };

        const directMat = materials.find((m) => m.id === ord.product_id);
        if (directMat) return { courseId: directMat.course_id, semesterId: directMat.semester_id };
      }

      // 2. Material IDs array match
      if (Array.isArray(ord.material_ids) && ord.material_ids.length > 0) {
        for (const mid of ord.material_ids) {
          const mat = materials.find((m) => m.id === mid);
          if (mat) {
            return { courseId: mat.course_id, semesterId: mat.semester_id };
          }
        }
      }

      // 3. Fallback to student profile placement if available
      if (ord.student_id && profiles[ord.student_id]) {
        const student = profiles[ord.student_id];
        // match student semester if possible
        const studentSem = student?.semester
          ? semesters.find((s) => s.semester_number === student.semester)
          : null;
        if (studentSem) {
          return { courseId: studentSem.course_id, semesterId: studentSem.id };
        }
      }

      return { courseId: null, semesterId: null };
    },
    [courses, semesters, subjects, materials, profiles],
  );

  // Date In Range Check
  const isDateInRange = useCallback(
    (dateString?: string | null) => {
      if (!dateString) return true;
      if (dateRange === "all") return true;

      const itemDate = new Date(dateString);
      if (isNaN(itemDate.getTime())) return true;
      const now = new Date();

      if (dateRange === "today") {
        return itemDate.toDateString() === now.toDateString();
      }
      if (dateRange === "month") {
        return (
          itemDate.getFullYear() === now.getFullYear() &&
          itemDate.getMonth() === now.getMonth()
        );
      }
      if (dateRange === "last30") {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return itemDate >= thirtyDaysAgo && itemDate <= now;
      }
      if (dateRange === "custom") {
        if (customStartDate && itemDate < new Date(customStartDate)) return false;
        if (customEndDate) {
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          if (itemDate > end) return false;
        }
        return true;
      }
      return true;
    },
    [dateRange, customStartDate, customEndDate],
  );

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      // 1. Status Filter
      if (filterStatus !== "all") {
        const st = (ord.status || "").toLowerCase();
        if (st !== filterStatus.toLowerCase()) return false;
      }

      // 2. Product Type Filter
      if (selectedProductType !== "all") {
        const pType = (ord.product_type || "material").toLowerCase();
        if (selectedProductType === "material" && !pType.includes("material") && !pType.includes("note")) return false;
        if (selectedProductType === "semester" && !pType.includes("sem")) return false;
        if (selectedProductType === "course" && !pType.includes("course") && !pType.includes("year")) return false;
      }

      // 3. Academic Course & Semester Filter
      if (selectedCourseId !== "all" || selectedSemesterId !== "all") {
        const placement = getOrderAcademicPlacement(ord);
        if (selectedCourseId !== "all" && placement.courseId && placement.courseId !== selectedCourseId) {
          return false;
        }
        if (selectedSemesterId !== "all" && placement.semesterId && placement.semesterId !== selectedSemesterId) {
          return false;
        }
      }

      // 4. Date Range Filter
      if (!isDateInRange(ord.order_date || ord.created_at)) {
        return false;
      }

      // 5. Search Text Filter (Order ID, Student Name, Email, Txn ID)
      if (query.trim()) {
        const q = query.toLowerCase();
        const studentInfo = ord.student_id ? profiles[ord.student_id] : null;
        const studentName = (ord.student_name || studentInfo?.full_name || "").toLowerCase();
        const studentEmail = (ord.student_email || studentInfo?.email || "").toLowerCase();
        const idMatch = (ord.id || "").toLowerCase().includes(q);
        const nameMatch = studentName.includes(q);
        const emailMatch = studentEmail.includes(q);
        const txnMatch = (ord.transaction_id || "").toLowerCase().includes(q);
        const productMatch = (ord.product_title || "").toLowerCase().includes(q);

        if (!idMatch && !nameMatch && !emailMatch && !txnMatch && !productMatch) {
          return false;
        }
      }

      return true;
    });
  }, [
    orders,
    filterStatus,
    selectedProductType,
    selectedCourseId,
    selectedSemesterId,
    query,
    profiles,
    getOrderAcademicPlacement,
    isDateInRange,
  ]);

  // Reset All Filters
  const handleResetFilters = () => {
    setQuery("");
    setFilterStatus("all");
    setSelectedCourseId("all");
    setSelectedSemesterId("all");
    setSelectedProductType("all");
    setDateRange("all");
    setCustomStartDate("");
    setCustomEndDate("");
  };

  const hasActiveFilters =
    query !== "" ||
    filterStatus !== "all" ||
    selectedCourseId !== "all" ||
    selectedSemesterId !== "all" ||
    selectedProductType !== "all" ||
    dateRange !== "all";

  // Update Status in Supabase
  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);

      if (error) throw error;

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)),
      );
      if (detailsOrder && detailsOrder.id === orderId) {
        setDetailsOrder({ ...detailsOrder, status: newStatus });
      }
      toast.success(`Order status updated to "${newStatus}".`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Compute Financial & Order Metrics
  const stats = useMemo(() => {
    let totalOrders = orders.length;
    let paidCount = 0;
    let pendingCount = 0;
    let failedCount = 0;
    let refundCount = 0;
    let confirmedRevenue = 0;

    for (const o of orders) {
      const st = (o.status || "").toLowerCase();
      const ordAmount = Number(o.final_amount ?? o.amount ?? 0);
      if (st === "paid") {
        paidCount++;
        confirmedRevenue += ordAmount;
      } else if (st === "pending") {
        pendingCount++;
      } else if (st === "failed" || st === "cancelled") {
        failedCount++;
      } else if (st === "refunded" || st === "partially_refunded") {
        refundCount++;
      }
    }

    return { totalOrders, paidCount, pendingCount, failedCount, refundCount, confirmedRevenue };
  }, [orders]);

  // CSV Exporter for Orders Ledger
  const handleExportCSV = () => {
    if (!filteredOrders.length) {
      toast.info("No order records match the selected filters.");
      return;
    }
    const headers = [
      "Order ID",
      "Date",
      "Student Name",
      "Student Email",
      "Product Title",
      "Amount (INR)",
      "Payment Gateway",
      "Transaction ID",
      "Status",
    ];
    const rows = filteredOrders.map((o) => {
      const studentInfo = o.student_id ? profiles[o.student_id] : null;
      return [
        o.id,
        new Date(o.order_date || o.created_at || "").toLocaleString(),
        o.student_name || studentInfo?.full_name || "Student",
        o.student_email || studentInfo?.email || "—",
        o.product_title || o.product_type || "Material",
        o.final_amount ?? o.amount ?? 0,
        o.gateway || "Razorpay",
        o.transaction_id || "—",
        o.status,
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        headers.join(","),
        ...rows.map((r) =>
          r.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","),
        ),
      ].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `orders_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Orders ledger exported to CSV successfully!");
  };

  return (
    <AdminLayout
      title="Orders & Payment Transactions"
      subtitle="Complete ledger of student study note purchases, gateway transactions, and licensing records."
    >
      <div className="space-y-6 max-w-6xl">
        {/* ===================================================================== */}
        {/* KPI OVERVIEW METRICS CARDS                                            */}
        {/* ===================================================================== */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
          {/* 1. Confirmed Revenue */}
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex flex-col justify-between col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-emerald-700">
              <span className="text-[11px] font-bold uppercase tracking-wider">Confirmed Revenue</span>
              <IndianRupee className="size-4" />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-emerald-700">{formatPrice(stats.confirmedRevenue)}</div>
              <p className="text-[10px] text-emerald-600/80 mt-0.5">Paid transactions only</p>
            </div>
          </div>

          {/* 2. Total Orders */}
          <div className="rounded-2xl border border-border bg-card p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Orders</span>
              <Package className="size-4" />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-foreground">{stats.totalOrders}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Across all statuses</p>
            </div>
          </div>

          {/* 3. Successful Payments */}
          <div className="rounded-2xl border border-border bg-card p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-teal-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Successful</span>
              <CheckCircle2 className="size-4" />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-teal-700">{stats.paidCount}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Verified & unlocked</p>
            </div>
          </div>

          {/* 4. Pending Orders */}
          <div className="rounded-2xl border border-border bg-card p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-amber-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Pending</span>
              <Clock className="size-4" />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-amber-700">{stats.pendingCount}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Awaiting checkout</p>
            </div>
          </div>

          {/* 5. Failed & Refunds */}
          <div className="rounded-2xl border border-border bg-card p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-rose-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Failed / Refunds</span>
              <AlertTriangle className="size-4" />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-rose-700">{stats.failedCount + stats.refundCount}</div>
              <p className="text-[10px] text-rose-600/80 mt-0.5">{stats.refundCount} refunded, {stats.failedCount} failed</p>
            </div>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* FILTERS CARD (Search, Status Pills, Dynamic Dropdowns, Date Range)   */}
        {/* ===================================================================== */}
        <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-4">
          {/* Row 1: Search Input & Status Pills */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by Order ID, Student, Email, or Transaction ID..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10 h-10 text-xs rounded-xl border-border/80 bg-background"
              />
            </div>

            {/* Status Filter Pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 lg:pb-0">
              {[
                { id: "all", label: "All Orders" },
                { id: "paid", label: "Paid" },
                { id: "pending", label: "Pending" },
                { id: "failed", label: "Failed" },
                { id: "refunded", label: "Refunded" },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setFilterStatus(st.id)}
                  className={`rounded-xl px-4 py-2 text-xs font-bold whitespace-nowrap transition-all ${
                    filterStatus === st.id
                      ? "bg-[#0e7490] text-white shadow-xs"
                      : "border border-border/80 bg-background text-muted-foreground hover:bg-slate-100 hover:text-foreground"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Row 2: Secondary Dropdown Filters (Course, Semester, Product Type, Date) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-border/60">
            {/* Course Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Course
              </label>
              <select
                aria-label="Filter by Course"
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full h-9 rounded-xl border border-border/80 bg-background px-2.5 text-xs font-medium focus:ring-2 focus:ring-[#0e7490]"
              >
                <option value="all">All Courses</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Semester Filter (Populated dynamically from selected course) */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Semester
              </label>
              <select
                aria-label="Filter by Semester"
                value={selectedSemesterId}
                onChange={(e) => setSelectedSemesterId(e.target.value)}
                className="w-full h-9 rounded-xl border border-border/80 bg-background px-2.5 text-xs font-medium focus:ring-2 focus:ring-[#0e7490]"
              >
                <option value="all">
                  {selectedCourseId === "all" ? "All Semesters" : "All Course Semesters"}
                </option>
                {courseSemesters.map((s) => (
                  <option key={s.id} value={s.id}>
                    Semester {s.semester_number} ({s.title || `Sem ${s.semester_number}`})
                  </option>
                ))}
              </select>
            </div>

            {/* Product Type Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Product Type
              </label>
              <select
                aria-label="Filter by Product Type"
                value={selectedProductType}
                onChange={(e) => setSelectedProductType(e.target.value)}
                className="w-full h-9 rounded-xl border border-border/80 bg-background px-2.5 text-xs font-medium focus:ring-2 focus:ring-[#0e7490]"
              >
                <option value="all">All Types</option>
                <option value="material">Material (Notes)</option>
                <option value="semester">Semester Package</option>
                <option value="course">Year / Course Bundle</option>
              </select>
            </div>

            {/* Date Range Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Date Range
              </label>
              <select
                aria-label="Filter by Date Range"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
                className="w-full h-9 rounded-xl border border-border/80 bg-background px-2.5 text-xs font-medium focus:ring-2 focus:ring-[#0e7490]"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="month">This Month</option>
                <option value="last30">Last 30 Days</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>
          </div>

          {/* Row 3: Custom Date Range Picker when selected */}
          {dateRange === "custom" && (
            <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/40 rounded-xl border border-border/60 text-xs">
              <Calendar className="size-4 text-muted-foreground" />
              <span className="font-semibold text-foreground">From:</span>
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="h-8 w-36 text-xs bg-background"
              />
              <span className="font-semibold text-foreground">To:</span>
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="h-8 w-36 text-xs bg-background"
              />
            </div>
          )}

          {/* Row 4: Summary Bar & Reset Action */}
          <div className="flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <button
                onClick={() => void fetchOrdersData()}
                disabled={loading}
                className="flex size-6 items-center justify-center rounded-md hover:bg-slate-100 text-muted-foreground"
                title="Reload Orders"
              >
                <RefreshCw className={`size-3 ${loading ? "animate-spin" : ""}`} />
              </button>
              <span>
                Showing <strong>{filteredOrders.length}</strong> of {orders.length} transactions
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="h-8 rounded-xl border-border/80 text-xs font-semibold gap-1.5"
              >
                <Download className="size-3.5" /> Export CSV
              </Button>

              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="flex items-center gap-1 font-bold text-[#0e7490] hover:underline"
                >
                  <RotateCcw className="size-3" /> Reset all filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* ORDERS & TRANSACTIONS TABLE                                           */}
        {/* ===================================================================== */}
        <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border/80 bg-slate-50/70 text-muted-foreground font-semibold">
              <tr>
                <th className="py-3 px-4">Order ID & Date</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Product Purchased</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Gateway & Txn</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <p className="text-sm font-semibold">No transactions match the selected filters.</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Try clearing filters or search criteria.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => {
                  const student = ord.student_id ? profiles[ord.student_id] : null;
                  const studentName = ord.student_name || student?.full_name || "Registered Student";
                  const studentEmail = ord.student_email || student?.email || "—";
                  const isPaid = (ord.status || "").toLowerCase() === "paid";
                  const isPending = (ord.status || "").toLowerCase() === "pending";
                  const isFailed = (ord.status || "").toLowerCase() === "failed";

                  return (
                    <tr key={ord.id} className="hover:bg-muted/20 transition-colors">
                      {/* Order ID & Date */}
                      <td className="py-3 px-4">
                        <p className="font-mono font-bold text-foreground">{ord.id.slice(0, 13)}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(ord.order_date || ord.created_at || "").toLocaleString()}
                        </p>
                      </td>

                      {/* Student */}
                      <td className="py-3 px-4">
                        <p className="font-bold text-foreground">{studentName}</p>
                        <p className="text-[11px] text-muted-foreground truncate max-w-[150px]">
                          {studentEmail}
                        </p>
                      </td>

                      {/* Product Purchased */}
                      <td className="py-3 px-4 max-w-[200px]">
                        <p className="font-semibold text-foreground truncate">
                          {ord.product_title || "Study Material"}
                        </p>
                        <span className="text-[9px] uppercase font-bold text-muted-foreground">
                          {ord.product_type || "MATERIAL"}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 font-black text-foreground">
                        {formatPrice(ord.final_amount ?? ord.amount ?? 0)}
                      </td>

                      {/* Gateway & Txn */}
                      <td className="py-3 px-4 text-muted-foreground">
                        <p className="capitalize font-semibold text-foreground">
                          {ord.gateway || "Razorpay"}
                        </p>
                        <p className="font-mono text-[10px] truncate max-w-[120px]">
                          {ord.transaction_id || "—"}
                        </p>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <Badge
                          className={
                            isPaid
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]"
                              : isPending
                              ? "bg-amber-50 text-amber-700 border-amber-200 text-[10px]"
                              : isFailed
                              ? "bg-rose-50 text-rose-700 border-rose-200 text-[10px]"
                              : "bg-slate-100 text-slate-700 border-slate-200 text-[10px]"
                          }
                        >
                          {ord.status}
                        </Badge>
                      </td>

                      {/* Details Button */}
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDetailsOrder(ord)}
                          className="h-8 rounded-xl border-border/80 text-xs font-bold gap-1"
                        >
                          <Eye className="size-3.5" /> Details
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ===================================================================== */}
        {/* ORDER DETAILS MODAL                                                   */}
        {/* ===================================================================== */}
        {detailsOrder && (
          <Dialog open={!!detailsOrder} onOpenChange={(open) => !open && setDetailsOrder(null)}>
            <DialogContent className="max-w-md rounded-3xl p-6">
              <DialogHeader>
                <DialogTitle className="text-base font-bold">Transaction Details</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Order ID: <span className="font-mono font-bold text-foreground">{detailsOrder.id}</span>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 text-xs pt-2">
                {/* Student Info Box */}
                <div className="rounded-2xl border border-border/70 bg-slate-50/70 p-3.5 space-y-1.5">
                  <div className="flex items-center gap-2 text-foreground font-bold">
                    <User className="size-4 text-[#0e7490]" />
                    <span>Student Profile</span>
                  </div>
                  <div className="text-muted-foreground pl-6 space-y-0.5">
                    <p className="font-semibold text-foreground">
                      {detailsOrder.student_name ||
                        (detailsOrder.student_id ? profiles[detailsOrder.student_id]?.full_name : null) ||
                        "Student"}
                    </p>
                    <p>
                      Email:{" "}
                      {detailsOrder.student_email ||
                        (detailsOrder.student_id ? profiles[detailsOrder.student_id]?.email : null) ||
                        "—"}
                    </p>
                    {detailsOrder.student_id && profiles[detailsOrder.student_id]?.mobile && (
                      <p>Mobile: {profiles[detailsOrder.student_id]?.mobile}</p>
                    )}
                    {detailsOrder.student_id && profiles[detailsOrder.student_id]?.college && (
                      <p>College: {profiles[detailsOrder.student_id]?.college}</p>
                    )}
                  </div>
                </div>

                {/* Product & Payment Info */}
                <div className="rounded-2xl border border-border/70 bg-slate-50/70 p-3.5 space-y-2">
                  <div className="flex items-center gap-2 text-foreground font-bold">
                    <Package className="size-4 text-[#0e7490]" />
                    <span>Purchase Summary</span>
                  </div>
                  <div className="pl-6 space-y-1 text-muted-foreground">
                    <p>
                      Product: <strong className="text-foreground">{detailsOrder.product_title || "Study Material"}</strong>
                    </p>
                    <p>Type: <span className="uppercase font-semibold">{detailsOrder.product_type || "MATERIAL"}</span></p>
                    <p>Gross Amount: {formatPrice(detailsOrder.amount)}</p>
                    {detailsOrder.discount ? (
                      <p>Discount: {formatPrice(detailsOrder.discount)}</p>
                    ) : null}
                    <p className="font-bold text-foreground text-sm">
                      Final Paid: {formatPrice(detailsOrder.final_amount ?? detailsOrder.amount)}
                    </p>
                    <p>Gateway: {detailsOrder.gateway || "Razorpay"}</p>
                    <p className="font-mono text-[10px]">
                      Txn ID: {detailsOrder.transaction_id || "—"}
                    </p>
                    <p>
                      Date:{" "}
                      {new Date(detailsOrder.order_date || detailsOrder.created_at || "").toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Status Updater */}
                <div className="rounded-2xl border border-border/70 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">Current Status:</span>
                    <Badge className="text-xs">{detailsOrder.status}</Badge>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-muted-foreground font-medium">Update to:</span>
                    {["Paid", "Pending", "Failed", "Refunded"].map((st) => (
                      <Button
                        key={st}
                        variant={detailsOrder.status.toLowerCase() === st.toLowerCase() ? "default" : "outline"}
                        size="sm"
                        disabled={updatingStatus || detailsOrder.status.toLowerCase() === st.toLowerCase()}
                        onClick={() => handleUpdateStatus(detailsOrder.id, st)}
                        className="h-7 text-[11px] rounded-lg px-2.5"
                      >
                        {st}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AdminLayout>
  );
}
