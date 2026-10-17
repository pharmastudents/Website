import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useState, useMemo, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { AcademicService, type Course, type Semester, type SubjectItem, type MaterialItem } from "@/lib/academicService";
import { formatPrice } from "@/lib/store";
import { toast } from "sonner";
import {
  BarChart3,
  Download,
  Users,
  DollarSign,
  BookOpen,
  Calendar,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

export const Route = createFileRoute("/admin/reports/")({
  validateSearch: (search: Record<string, unknown>): { type?: string } => {
    const tp = typeof search["type"] === "string" ? (search["type"] as string) : "";
    return tp ? { type: tp } : {};
  },
  component: AdminReportsPage,
});

interface ProfileRow {
  id: string;
  email: string;
  full_name: string;
  mobile?: string | null;
  college?: string | null;
  year?: number | null;
  semester?: number | null;
  role?: string | null;
  created_at: string;
}

interface OrderRow {
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
}

interface PurchaseRow {
  id: string;
  student_id: string;
  material_id: string;
  amount?: number | null;
  status?: string | null;
  created_at: string;
}

export default function AdminReportsPage() {
  const searchParams = useSearch({ from: "/admin/reports/" });
  const [activeReport, setActiveReport] = useState<string>(searchParams.type || "students");

  // Date Filtering State
  const [dateRange, setDateRange] = useState<"all" | "today" | "month" | "last30" | "custom">("all");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  // Real Database States
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);

  // 1. Fetch Real Database Data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        { data: profs, error: pErr },
        { data: ords, error: oErr },
        { data: purs, error: puErr },
        academicData,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("purchases")
          .select("*"),
        AcademicService.loadAll(),
      ]);

      if (pErr) console.error("Error fetching profiles:", pErr);
      if (oErr) console.error("Error fetching orders:", oErr);
      if (puErr) console.error("Error fetching purchases:", puErr);

      setProfiles((profs as ProfileRow[]) || []);
      setOrders((ords as OrderRow[]) || []);
      setPurchases((purs as PurchaseRow[]) || []);
      setCourses(academicData.courses || []);
      setSemesters(academicData.semesters || []);
      setSubjects(academicData.subjects || []);
      setMaterials(academicData.materials || []);
    } catch (err: unknown) {
      console.error("Failed to load reports data:", err);
      toast.error("Failed to fetch database reports.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Date Filter Predicate
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

  // Filtered Students (Real Profiles filtered for students or non-admins)
  const filteredStudents = useMemo(() => {
    return profiles
      .filter((p) => p.role !== "admin")
      .filter((p) => isDateInRange(p.created_at));
  }, [profiles, isDateInRange]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => isDateInRange(o.order_date || o.created_at));
  }, [orders, isDateInRange]);

  // Verified Paid Orders Only
  const paidOrders = useMemo(() => {
    return filteredOrders.filter((o) => (o.status || "").toLowerCase() === "paid");
  }, [filteredOrders]);

  // Financial Metrics (Verified paid only, strictly avoiding pending/failed)
  const revenueMetrics = useMemo(() => {
    const now = new Date();

    const totalRevenue = paidOrders.reduce(
      (acc, o) => acc + Number(o.final_amount ?? o.amount ?? 0),
      0,
    );

    const todayRevenue = paidOrders
      .filter((o) => {
        const d = new Date(o.order_date || o.created_at || "");
        return d.toDateString() === now.toDateString();
      })
      .reduce((acc, o) => acc + Number(o.final_amount ?? o.amount ?? 0), 0);

    const monthlyRevenue = paidOrders
      .filter((o) => {
        const d = new Date(o.order_date || o.created_at || "");
        return (
          d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
        );
      })
      .reduce((acc, o) => acc + Number(o.final_amount ?? o.amount ?? 0), 0);

    const pendingCount = filteredOrders.filter(
      (o) => (o.status || "").toLowerCase() === "pending",
    ).length;

    const refundedCount = filteredOrders.filter(
      (o) => (o.status || "").toLowerCase() === "refunded",
    ).length;

    return {
      totalRevenue,
      todayRevenue,
      monthlyRevenue,
      paidCount: paidOrders.length,
      pendingCount,
      refundedCount,
    };
  }, [filteredOrders, paidOrders]);

  // Year-wise Summary (1st to 4th Year B.Pharm/Pharmacy)
  const yearWiseData = useMemo(() => {
    const years = [1, 2, 3, 4];

    return years.map((yearNum) => {
      // Students in this year
      const enrolledStudents = filteredStudents.filter(
        (s) => Number(s.year) === yearNum,
      ).length;

      // Subjects in this year
      const yearSubjects = subjects.filter(
        (sub) =>
          Number(sub.year) === yearNum ||
          Math.ceil(Number(sub.semester_number || 1) / 2) === yearNum,
      );
      const subjectIds = yearSubjects.map((s) => s.id);

      // Materials in this year
      const yearMaterials = materials.filter((m) =>
        subjectIds.includes(m.subject_id),
      );
      const publishedMaterials = yearMaterials.filter(
        (m) => m.status === "Published",
      );

      // Purchases for materials in this year
      const matIds = yearMaterials.map((m) => m.id);
      const yearPurchases = purchases.filter(
        (p) =>
          matIds.includes(p.material_id) &&
          isDateInRange(p.created_at),
      );

      // Revenue from orders for this year
      const yearOrdersRevenue = paidOrders
        .filter((o) => {
          if (o.product_type?.toLowerCase() === "year" && Number(o.product_id) === yearNum) {
            return true;
          }
          if (Array.isArray(o.material_ids) && o.material_ids.some((id) => matIds.includes(id))) {
            return true;
          }
          if (o.product_id && matIds.includes(o.product_id)) {
            return true;
          }
          return false;
        })
        .reduce((sum, o) => sum + Number(o.final_amount ?? o.amount ?? 0), 0);

      return {
        year: yearNum,
        yearLabel: `${yearNum}${yearNum === 1 ? "st" : yearNum === 2 ? "nd" : yearNum === 3 ? "rd" : "th"} Year`,
        enrolledStudents,
        subjectsCount: yearSubjects.length,
        materialsCount: publishedMaterials.length,
        purchasesCount: yearPurchases.length,
        revenue: yearOrdersRevenue,
      };
    });
  }, [filteredStudents, subjects, materials, purchases, paidOrders, isDateInRange]);

  // Subject-wise Sales Data
  const subjectWiseData = useMemo(() => {
    return subjects.map((sub) => {
      const parentCourse = courses.find((c) => c.id === sub.course_id);
      const subMaterials = materials.filter((m) => m.subject_id === sub.id);
      const paidMats = subMaterials.filter((m) => m.is_premium || m.price > 0);
      const freeMats = subMaterials.filter((m) => !m.is_premium && m.price === 0);

      const matIds = subMaterials.map((m) => m.id);
      const subPurchases = purchases.filter((p) =>
        matIds.includes(p.material_id) && isDateInRange(p.created_at),
      );

      const subRevenue = paidOrders
        .filter((o) => {
          if (o.product_id === sub.id) return true;
          if (Array.isArray(o.material_ids) && o.material_ids.some((id) => matIds.includes(id))) {
            return true;
          }
          if (o.product_id && matIds.includes(o.product_id)) return true;
          return false;
        })
        .reduce((acc, o) => acc + Number(o.final_amount ?? o.amount ?? 0), 0);

      return {
        id: sub.id,
        name: sub.name,
        code: sub.code,
        courseName: parentCourse?.name || "B.Pharm",
        semesterNumber: sub.semester_number || sub.semester || 1,
        totalMaterials: subMaterials.length,
        paidMaterials: paidMats.length,
        freeMaterials: freeMats.length,
        purchasesCount: subPurchases.length,
        revenue: subRevenue,
      };
    });
  }, [subjects, courses, materials, purchases, paidOrders, isDateInRange]);

  // CSV Exporter
  const handleExportCSV = (reportName: string, rows: Record<string, unknown>[]) => {
    if (!rows.length) {
      toast.info("No data available to export for the selected date range.");
      return;
    }
    const headers = Object.keys(rows[0]!);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        headers.join(","),
        ...rows.map((r) =>
          headers.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(","),
        ),
      ].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `${reportName}_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${reportName}.csv successfully!`);
  };

  return (
    <AdminLayout
      title="Platform Academic & Revenue Reports"
      subtitle="Detailed analytical statements for student registrations, semester performance, sales, and notes volume."
    >
      <div className="space-y-6 max-w-6xl">
        {/* Navigation Tabs and Date Range Selector */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/80 pb-4">
          <div className="flex flex-wrap gap-2">
            {[
              { id: "students", label: "Student Registrations", icon: Users },
              { id: "revenue", label: "Revenue & Sales", icon: DollarSign },
              { id: "year", label: "Year-wise Report", icon: BarChart3 },
              { id: "subject", label: "Subject-wise Sales", icon: BookOpen },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveReport(tab.id)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                    activeReport === tab.id
                      ? "bg-[#0e7490] text-white shadow-xs"
                      : "border border-border/80 bg-card text-muted-foreground hover:bg-slate-100 hover:text-foreground"
                  }`}
                >
                  <Icon className="size-4" /> {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => void fetchData()}
              disabled={loading}
              className="flex size-8 items-center justify-center rounded-lg border border-border/70 hover:bg-slate-100 text-muted-foreground hover:text-foreground transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground">Range:</span>
              <select
                aria-label="Filter by Date Range"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
                className="h-8 rounded-lg border border-border/80 bg-background px-3 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-[#0e7490]"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="month">This Month</option>
                <option value="last30">Last 30 Days</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>
          </div>
        </div>

        {/* Custom Range Inputs */}
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

        {/* ===================================================================== */}
        {/* TAB 1: STUDENT REGISTRATIONS LEDGER                                    */}
        {/* ===================================================================== */}
        {activeReport === "students" && (
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-4">
              <div>
                <h3 className="text-base font-bold text-foreground">Student Registration Ledger</h3>
                <p className="text-xs text-muted-foreground">
                  All registered student accounts with current curriculum placement ({filteredStudents.length} students)
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-border/80 text-xs font-bold"
                onClick={() =>
                  handleExportCSV(
                    "Student_Registrations",
                    filteredStudents.map((s) => ({
                      StudentID: s.id,
                      Name: s.full_name || "Student",
                      Email: s.email,
                      Mobile: s.mobile || "—",
                      College: s.college || "—",
                      AcademicYear: `Year ${s.year || 1}`,
                      Semester: `Sem ${s.semester || 1}`,
                      RegisteredAt: new Date(s.created_at).toLocaleDateString(),
                    })),
                  )
                }
              >
                <Download className="mr-1.5 size-4" /> Export CSV
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border/80 text-muted-foreground font-semibold">
                  <tr>
                    <th className="py-3 px-3">Student Name</th>
                    <th className="py-3 px-3">Email & Phone</th>
                    <th className="py-3 px-3">College</th>
                    <th className="py-3 px-3">Curriculum</th>
                    <th className="py-3 px-3">Joined Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        No student registrations found for this filter.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((s) => (
                      <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-3 font-bold text-foreground">
                          {s.full_name || "Registered Student"}
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">
                          {s.email} {s.mobile ? `· ${s.mobile}` : ""}
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">
                          {s.college || "Government College of Pharmacy"}
                        </td>
                        <td className="py-3 px-3 font-semibold text-foreground">
                          Year {s.year || 1} (Sem {s.semester || 1})
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">
                          {new Date(s.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* TAB 2: REVENUE & SALES FINANCIAL STATEMENT                           */}
        {/* ===================================================================== */}
        {activeReport === "revenue" && (
          <div className="space-y-6">
            {/* 6 Financial Metric KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs">
                <p className="text-[11px] font-semibold text-muted-foreground">Total Revenue</p>
                <p className="mt-1 text-lg font-black text-emerald-600">
                  {formatPrice(revenueMetrics.totalRevenue)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Verified paid only</p>
              </div>

              <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs">
                <p className="text-[11px] font-semibold text-muted-foreground">Today's Revenue</p>
                <p className="mt-1 text-lg font-black text-foreground">
                  {formatPrice(revenueMetrics.todayRevenue)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Settled today</p>
              </div>

              <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs">
                <p className="text-[11px] font-semibold text-muted-foreground">Monthly Revenue</p>
                <p className="mt-1 text-lg font-black text-foreground">
                  {formatPrice(revenueMetrics.monthlyRevenue)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Current month</p>
              </div>

              <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs">
                <p className="text-[11px] font-semibold text-muted-foreground">Paid Orders</p>
                <p className="mt-1 text-lg font-black text-[#0e7490]">
                  {revenueMetrics.paidCount}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Completed txns</p>
              </div>

              <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs">
                <p className="text-[11px] font-semibold text-muted-foreground">Pending Orders</p>
                <p className="mt-1 text-lg font-black text-amber-600">
                  {revenueMetrics.pendingCount}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Not in revenue</p>
              </div>

              <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs">
                <p className="text-[11px] font-semibold text-muted-foreground">Refunds</p>
                <p className="mt-1 text-lg font-black text-rose-600">
                  {revenueMetrics.refundedCount}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Reversed orders</p>
              </div>
            </div>

            {/* Financial Ledger Table */}
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-4">
                <div>
                  <h3 className="text-base font-bold text-foreground">Sales & Revenue Financial Statement</h3>
                  <p className="text-xs text-muted-foreground">
                    Verified ledger of student transactions ({filteredOrders.length} records)
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-border/80 text-xs font-bold"
                  onClick={() =>
                    handleExportCSV(
                      "Sales_Revenue_Ledger",
                      filteredOrders.map((o) => ({
                        OrderID: o.id,
                        Student: o.student_name || "Student",
                        Email: o.student_email || "—",
                        Product: o.product_title || o.product_type || "Material",
                        GrossAmount: o.amount,
                        Discount: o.discount || 0,
                        PaidAmount: o.final_amount ?? o.amount,
                        Gateway: o.gateway || "Razorpay",
                        TxnID: o.transaction_id || "—",
                        Status: o.status,
                        Date: new Date(o.order_date || o.created_at || "").toLocaleDateString(),
                      })),
                    )
                  }
                >
                  <Download className="mr-1.5 size-4" /> Export CSV
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border/80 text-muted-foreground font-semibold">
                    <tr>
                      <th className="py-3 px-3">Order ID & Date</th>
                      <th className="py-3 px-3">Student</th>
                      <th className="py-3 px-3">Product</th>
                      <th className="py-3 px-3">Paid Amount</th>
                      <th className="py-3 px-3">Gateway & Txn</th>
                      <th className="py-3 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-muted-foreground">
                          No order transactions recorded for this filter.
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((o) => {
                        const isPaid = (o.status || "").toLowerCase() === "paid";
                        const isPending = (o.status || "").toLowerCase() === "pending";
                        return (
                          <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                            <td className="py-3 px-3">
                              <p className="font-mono font-bold text-foreground">{o.id.slice(0, 13)}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {new Date(o.order_date || o.created_at || "").toLocaleString()}
                              </p>
                            </td>
                            <td className="py-3 px-3">
                              <p className="font-bold text-foreground">{o.student_name || "Student"}</p>
                              <p className="text-[11px] text-muted-foreground">{o.student_email || "—"}</p>
                            </td>
                            <td className="py-3 px-3 max-w-[200px]">
                              <p className="font-semibold text-foreground truncate">
                                {o.product_title || "Study Material"}
                              </p>
                              <span className="text-[9px] uppercase font-bold text-muted-foreground">
                                {o.product_type || "MATERIAL"}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-bold text-foreground">
                              {formatPrice(o.final_amount ?? o.amount ?? 0)}
                            </td>
                            <td className="py-3 px-3 text-muted-foreground">
                              <p className="capitalize font-semibold text-foreground">{o.gateway || "Razorpay"}</p>
                              <p className="font-mono text-[10px] truncate max-w-[120px]">
                                {o.transaction_id || "—"}
                              </p>
                            </td>
                            <td className="py-3 px-3">
                              <Badge
                                className={
                                  isPaid
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]"
                                    : isPending
                                    ? "bg-amber-50 text-amber-700 border-amber-200 text-[10px]"
                                    : "bg-slate-100 text-slate-700 border-slate-200 text-[10px]"
                                }
                              >
                                {o.status}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* TAB 3: YEAR-WISE ACADEMIC & SALES REPORT                             */}
        {/* ===================================================================== */}
        {activeReport === "year" && (
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-4">
              <div>
                <h3 className="text-base font-bold text-foreground">Academic Year Performance Breakdown</h3>
                <p className="text-xs text-muted-foreground">
                  Registered students, subjects, published materials, purchases, and revenue by academic year
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-border/80 text-xs font-bold"
                onClick={() =>
                  handleExportCSV(
                    "Academic_Year_Report",
                    yearWiseData.map((y) => ({
                      AcademicYear: y.yearLabel,
                      RegisteredStudents: y.enrolledStudents,
                      SubjectsCount: y.subjectsCount,
                      PublishedMaterials: y.materialsCount,
                      PurchasesCount: y.purchasesCount,
                      VerifiedRevenue: y.revenue,
                    })),
                  )
                }
              >
                <Download className="mr-1.5 size-4" /> Export CSV
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {yearWiseData.map((y) => (
                <div
                  key={y.year}
                  className="rounded-2xl border border-border/80 bg-slate-50/60 p-5 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-bold text-foreground">
                        {y.yearLabel} B.Pharm
                      </span>
                      <p className="text-[11px] text-muted-foreground">
                        Semesters {y.year * 2 - 1} & {y.year * 2}
                      </p>
                    </div>
                    <span className="font-black text-[#0e7490] text-base">
                      {formatPrice(y.revenue)}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center border-t border-border/70 pt-3">
                    <div className="bg-white rounded-xl p-2 border border-border/50">
                      <span className="text-[10px] text-muted-foreground font-semibold">Students</span>
                      <p className="text-sm font-bold text-foreground mt-0.5">{y.enrolledStudents}</p>
                    </div>
                    <div className="bg-white rounded-xl p-2 border border-border/50">
                      <span className="text-[10px] text-muted-foreground font-semibold">Subjects</span>
                      <p className="text-sm font-bold text-foreground mt-0.5">{y.subjectsCount}</p>
                    </div>
                    <div className="bg-white rounded-xl p-2 border border-border/50">
                      <span className="text-[10px] text-muted-foreground font-semibold">Materials</span>
                      <p className="text-sm font-bold text-foreground mt-0.5">{y.materialsCount}</p>
                    </div>
                    <div className="bg-white rounded-xl p-2 border border-border/50">
                      <span className="text-[10px] text-muted-foreground font-semibold">Purchases</span>
                      <p className="text-sm font-bold text-foreground mt-0.5">{y.purchasesCount}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* TAB 4: SUBJECT-WISE SALES & STUDY DEMAND                              */}
        {/* ===================================================================== */}
        {activeReport === "subject" && (
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-4">
              <div>
                <h3 className="text-base font-bold text-foreground">Subject-Wise Sales & Demand</h3>
                <p className="text-xs text-muted-foreground">
                  Individual subject metrics, materials breakdown, and genuine sales ({subjectWiseData.length} subjects)
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-border/80 text-xs font-bold"
                onClick={() =>
                  handleExportCSV(
                    "Subject_Wise_Sales_Report",
                    subjectWiseData.map((s) => ({
                      SubjectName: s.name,
                      Code: s.code,
                      Course: s.courseName,
                      Semester: `Sem ${s.semesterNumber}`,
                      TotalMaterials: s.totalMaterials,
                      PaidMaterials: s.paidMaterials,
                      FreeMaterials: s.freeMaterials,
                      ActualPurchases: s.purchasesCount,
                      Revenue: s.revenue,
                    })),
                  )
                }
              >
                <Download className="mr-1.5 size-4" /> Export CSV
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border/80 text-muted-foreground font-semibold">
                  <tr>
                    <th className="py-3 px-3">Subject Name & Code</th>
                    <th className="py-3 px-3">Course & Semester</th>
                    <th className="py-3 px-3">Materials (Paid / Free)</th>
                    <th className="py-3 px-3">Purchases</th>
                    <th className="py-3 px-3">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {subjectWiseData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        No subjects found in database.
                      </td>
                    </tr>
                  ) : (
                    subjectWiseData.map((sub) => (
                      <tr key={sub.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-3">
                          <p className="font-bold text-foreground">{sub.name}</p>
                          <span className="font-mono text-[10px] text-muted-foreground font-semibold">
                            {sub.code}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">
                          {sub.courseName} · Sem {sub.semesterNumber}
                        </td>
                        <td className="py-3 px-3 font-semibold text-foreground">
                          {sub.totalMaterials}{" "}
                          <span className="text-[10px] text-muted-foreground font-normal">
                            ({sub.paidMaterials} paid, {sub.freeMaterials} free)
                          </span>
                        </td>
                        <td className="py-3 px-3 font-semibold text-foreground">
                          {sub.purchasesCount}
                        </td>
                        <td className="py-3 px-3 font-bold text-foreground">
                          {formatPrice(sub.revenue)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
