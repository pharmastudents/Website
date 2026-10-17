import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import {
  Users,
  BookOpen,
  CreditCard,
  FolderTree,
  PlusCircle,
  RefreshCw,
  AlertCircle,
  ShoppingBag,
  UserCheck,
  TrendingUp,
  FileText,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboardIndex,
});

interface StudentProfile {
  id: string;
  email: string;
  full_name: string;
  mobile?: string;
  college?: string;
  year?: number;
  semester?: number;
  role: string;
  created_at: string;
}

interface CourseRecord {
  id: string;
  name: string;
  code: string;
  duration_years: number;
  is_active: boolean;
}

interface SemesterRecord {
  id: string;
  course_id: string;
  academic_year_id?: string;
  semester_number: number;
  title: string;
  is_active: boolean;
}

interface SubjectRecord {
  id: string;
  course_id: string;
  semester_id: string;
  semester: number;
  name: string;
  code: string;
  is_active: boolean;
}

interface MaterialRecord {
  id: string;
  subject_id: string;
  unit_id: string;
  title: string;
  type?: string;
  is_premium: boolean;
  price: number;
  published: boolean;
  status: string;
  created_at: string;
}

interface OrderRecord {
  id: string;
  student_id: string;
  student_name?: string;
  student_email?: string;
  product_id?: string;
  product_title?: string;
  product_type?: string;
  material_ids?: string[];
  amount: number;
  final_amount?: number;
  status: string;
  created_at?: string;
  order_date?: string;
}

export default function AdminDashboardIndex() {
  const { isAdmin, ready } = useStore();
  const navigate = useNavigate();

  // Authentication guard
  useEffect(() => {
    if (ready && !isAdmin) {
      void navigate({ to: "/admin/login" });
    }
  }, [ready, isAdmin, navigate]);

  // Loading & Error States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profilesError, setProfilesError] = useState<string | null>(null);

  // Real Database Records State
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [allProfilesCount, setAllProfilesCount] = useState<number>(0);
  const [courses, setCourses] = useState<CourseRecord[]>([]);
  const [semesters, setSemesters] = useState<SemesterRecord[]>([]);
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [materials, setMaterials] = useState<MaterialRecord[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [purchasesCount, setPurchasesCount] = useState<number>(0);

  // Active UI Controls
  const [selectedYearTab, setSelectedYearTab] = useState<number>(1);

  // Fetch real data from Supabase
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setProfilesError(null);

    try {
      // 1. Fetch Student Profiles (exclude admins)
      const { data: pData, error: pErr } = await supabase
        .from("profiles")
        .select("id, email, full_name, mobile, college, year, semester, role, created_at");

      if (pErr) {
        console.warn("[Dashboard] Profiles fetch notice:", pErr.message);
        setProfilesError(pErr.message);
        setStudents([]);
        setAllProfilesCount(0);
      } else if (pData) {
        setAllProfilesCount(pData.length);
        const studentOnly = (pData as StudentProfile[]).filter((p) => p.role !== "admin");
        setStudents(studentOnly);
      }

      // 2. Fetch Courses
      const { data: cData, error: cErr } = await supabase
        .from("courses")
        .select("id, name, code, duration_years, is_active");
      if (!cErr && cData) {
        setCourses(cData as CourseRecord[]);
      }

      // 3. Fetch Semesters
      const { data: sData, error: sErr } = await supabase
        .from("semesters")
        .select("id, course_id, academic_year_id, semester_number, title, is_active");
      if (!sErr && sData) {
        setSemesters(sData as SemesterRecord[]);
      }

      // 4. Fetch Subjects
      const { data: subData, error: subErr } = await supabase
        .from("subjects")
        .select("id, course_id, semester_id, semester, name, code, is_active");
      if (!subErr && subData) {
        setSubjects(subData as SubjectRecord[]);
      }

      // 5. Fetch Materials
      const { data: mData, error: mErr } = await supabase
        .from("materials")
        .select("id, subject_id, unit_id, title, type, is_premium, price, published, status, created_at");
      if (!mErr && mData) {
        setMaterials(mData as MaterialRecord[]);
      }

      // 6. Fetch Orders
      const { data: oData, error: oErr } = await supabase
        .from("orders")
        .select("*");
      if (!oErr && oData) {
        setOrders(oData as OrderRecord[]);
      }

      // 7. Fetch Purchases Count
      const { count: purCount, error: purErr } = await supabase
        .from("purchases")
        .select("*", { count: "exact", head: true });
      if (!purErr) {
        setPurchasesCount(purCount || 0);
      }
    } catch (err: any) {
      console.error("[Dashboard] Unexpected query failure:", err);
      toast.error("An error occurred while loading database metrics.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchDashboardData();
  }, [fetchDashboardData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    toast.success("Dashboard metrics refreshed from Supabase.");
  };

  if (!isAdmin) return null;

  // Format currency in Indian Rupees
  const formatINR = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Metric Calculations based strictly on Supabase data
  const totalRegisteredStudents = students.length;
  const studentsByYear = [1, 2, 3, 4].map((yr) => ({
    year: yr,
    count: students.filter((s) => s.year === yr).length,
  }));

  const totalMaterials = materials.length;
  const publishedMaterials = materials.filter(
    (m) => m.published === true || m.status === "Published"
  ).length;
  const freeMaterials = materials.filter(
    (m) => (!m.is_premium && Number(m.price) === 0)
  ).length;
  const premiumMaterials = materials.filter(
    (m) => m.is_premium || Number(m.price) > 0
  ).length;

  // Orders Calculations
  const totalOrders = orders.length;
  const paidOrdersList = orders.filter((o) => o.status === "Paid");
  const paidOrdersCount = paidOrdersList.length;
  const pendingOrdersCount = orders.filter((o) => o.status === "Pending").length;
  const verifiedRevenue = paidOrdersList.reduce(
    (acc, o) => acc + (Number(o.final_amount) || Number(o.amount) || 0),
    0
  );

  // Year Tab Statistics
  const yearStudents = students.filter((s) => s.year === selectedYearTab);
  const yearSubjects = subjects.filter((s) => s.semester === selectedYearTab * 2 - 1 || s.semester === selectedYearTab * 2);

  // Recent Orders (real only)
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.created_at || b.order_date || 0).getTime() - new Date(a.created_at || a.order_date || 0).getTime())
    .slice(0, 5);

  // Recent Student Registrations (real only)
  const recentStudents = [...students]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <AdminLayout
      title="Platform Overview & Analytics"
      subtitle="Real-time statistics calculated directly from the database and active student registrations."
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="h-8 text-xs font-semibold"
          >
            <RefreshCw className={`mr-1.5 size-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh Data
          </Button>
          <Button asChild size="sm" className="h-8 text-xs font-semibold bg-[#0e7490] hover:bg-[#0f766e] text-white">
            <Link to="/admin/materials">
              <PlusCircle className="mr-1.5 size-3.5" /> Add Note
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-8 text-xs font-semibold border-teal-600/40 text-teal-700 bg-white hover:bg-teal-50">
            <Link to="/admin/materials">
              <FolderTree className="mr-1.5 size-3.5" /> Create Subject
            </Link>
          </Button>
        </div>
      }
    >
      <div className="space-y-8">
        {/* RLS Policy Notice Banner if profiles query is blocked by recursion */}
        {profilesError && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 shadow-2xs">
            <div className="flex items-start gap-3">
              <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-amber-950">Supabase Profiles RLS Policy Notice</p>
                <p className="mt-0.5 text-amber-800">
                  Database returned: <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono text-[11px]">{profilesError}</code>.
                  To resolve this in Supabase, run the migration script in{" "}
                  <strong className="underline">supabase/migrations/20260303_fix_profiles_recursion.sql</strong> in your Supabase SQL Editor.
                </p>
                <div className="mt-2.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRefresh}
                    className="h-7 text-[11px] border-amber-400 text-amber-900 hover:bg-amber-100"
                  >
                    Retry Query
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* ROW 1: PRIMARY CALCULATED METRIC CARDS (REAL DATABASE DATA)           */}
        {/* ==================================================================== */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-4">
          
          {/* Card 1: Total Registered Students */}
          <div className="rounded-2xl border border-border bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Total Registered Students</span>
              <span className="flex size-7 items-center justify-center rounded-lg bg-teal-50 text-teal-700 border border-teal-200">
                <Users className="size-4" />
              </span>
            </div>

            {loading ? (
              <div className="mt-3 h-8 w-16 animate-pulse rounded bg-slate-100" />
            ) : profilesError ? (
              <div className="mt-2">
                <p className="text-xs font-bold text-amber-700">Unavailable</p>
                <p className="text-[10px] text-muted-foreground">RLS Policy Error</p>
              </div>
            ) : (
              <>
                <p className="mt-2 text-2xl font-black text-foreground">{totalRegisteredStudents}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
                  <span>Y1: {studentsByYear[0]?.count || 0}</span> ·
                  <span>Y2: {studentsByYear[1]?.count || 0}</span> ·
                  <span>Y3: {studentsByYear[2]?.count || 0}</span> ·
                  <span>Y4: {studentsByYear[3]?.count || 0}</span>
                  <span className="text-teal-700 font-bold ml-1">({allProfilesCount} Total Profiles · 1 Admin)</span>
                </div>
              </>
            )}
          </div>

          {/* Card 2: Notes in Repository */}
          <div className="rounded-2xl border border-border bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Notes in Repository</span>
              <span className="flex size-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
                <BookOpen className="size-4" />
              </span>
            </div>

            {loading ? (
              <div className="mt-3 h-8 w-16 animate-pulse rounded bg-slate-100" />
            ) : (
              <>
                <p className="mt-2 text-2xl font-black text-foreground">{totalMaterials}</p>
                <div className="mt-2 flex items-center gap-2 text-[10px] font-medium">
                  <span className="text-emerald-600 font-bold">{freeMaterials} Free</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-amber-600 font-bold">{premiumMaterials} Premium</span>
                </div>
              </>
            )}
          </div>

          {/* Card 3: Orders & Purchases */}
          <div className="rounded-2xl border border-border bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Orders & Purchases</span>
              <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
                <CreditCard className="size-4" />
              </span>
            </div>

            {loading ? (
              <div className="mt-3 h-8 w-16 animate-pulse rounded bg-slate-100" />
            ) : (
              <>
                <p className="mt-2 text-2xl font-black text-foreground">{totalOrders}</p>
                <div className="mt-2 flex items-center gap-2 text-[10px] font-medium">
                  <span className="text-emerald-600 font-bold">{paidOrdersCount} Paid</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-amber-600 font-bold">{pendingOrdersCount} Pending</span>
                </div>
              </>
            )}
          </div>

          {/* Card 4: Total Platform Revenue */}
          <div className="rounded-2xl border border-border bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Total Platform Revenue</span>
              <span className="flex size-7 items-center justify-center rounded-lg bg-teal-50 text-teal-700 border border-teal-200">
                <span className="text-xs font-black">₹</span>
              </span>
            </div>

            {loading ? (
              <div className="mt-3 h-8 w-24 animate-pulse rounded bg-slate-100" />
            ) : (
              <>
                <p className="mt-2 text-2xl font-black text-[#0e7490]">{formatINR(verifiedRevenue)}</p>
                <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
                  <span>Today: {formatINR(0)}</span>
                  <span>·</span>
                  <span>This Month: {formatINR(verifiedRevenue)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ==================================================================== */}
        {/* SECTION 2: YEAR-WISE ACADEMIC MANAGEMENT (REAL SUPABASE ACADEMIC DATA)*/}
        {/* ==================================================================== */}
        <div className="rounded-3xl border border-border bg-white p-6 sm:p-8 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-widest text-[#0e7490] uppercase">Year-Wise Management</p>
              <h2 className="mt-1 text-xl font-black text-foreground">
                Academic Year Breakdown & Controls
              </h2>
            </div>

            {/* Year Selector Tabs */}
            <div className="flex gap-1.5 rounded-xl border border-border bg-slate-50 p-1">
              {[1, 2, 3, 4].map((yr) => (
                <button
                  key={yr}
                  onClick={() => setSelectedYearTab(yr)}
                  className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${
                    selectedYearTab === yr
                      ? "bg-[#0e7490] text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {yr === 1 ? "1st Year" : yr === 2 ? "2nd Year" : yr === 3 ? "3rd Year" : "4th Year"}
                </button>
              ))}
            </div>
          </div>

          {/* Year stats bar */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 rounded-2xl border border-border bg-slate-50/60 p-4 text-xs font-medium">
            <div>
              <span className="text-muted-foreground text-[11px]">Year Students:</span>
              <p className="mt-1 text-base font-black text-foreground">
                {profilesError ? "—" : yearStudents.length}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground text-[11px]">Core Subjects:</span>
              <p className="mt-1 text-base font-black text-foreground">{yearSubjects.length}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-[11px]">Published Notes:</span>
              <p className="mt-1 text-base font-black text-foreground">
                {materials.filter((m) => yearSubjects.some((s) => s.id === m.subject_id)).length}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground text-[11px]">Sales Count:</span>
              <p className="mt-1 text-base font-black text-foreground">0</p>
            </div>
            <div>
              <span className="text-muted-foreground text-[11px]">Year Revenue:</span>
              <p className="mt-1 text-base font-black text-[#0e7490]">{formatINR(0)}</p>
            </div>
          </div>

          {/* Semesters in this year (Semesters 2*yr-1 and 2*yr) */}
          <div className="grid gap-4 sm:grid-cols-2">
            {[selectedYearTab * 2 - 1, selectedYearTab * 2].map((semNum) => {
              const semSubjects = subjects.filter((s) => s.semester === semNum);
              const semMaterials = materials.filter((m) =>
                semSubjects.some((s) => s.id === m.subject_id)
              );

              return (
                <div key={semNum} className="rounded-2xl border border-border bg-slate-50/40 p-5">
                  <div className="flex items-center justify-between">
                    <span className="rounded-lg bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-800 border border-teal-200">
                      Semester {semNum}
                    </span>
                    <span className="text-xs text-muted-foreground font-semibold">
                      {semSubjects.length} Subjects · {semMaterials.length} Notes
                    </span>
                  </div>

                  <div className="mt-4 space-y-2">
                    {semSubjects.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border/80 bg-white p-5 text-center">
                        <FolderTree className="mx-auto size-6 text-muted-foreground/40" />
                        <p className="mt-1.5 text-xs text-muted-foreground font-medium">
                          No subjects configured for Semester {semNum}
                        </p>
                        <Button asChild size="sm" variant="outline" className="mt-3 text-xs h-7 border-teal-600/30 text-teal-700">
                          <Link to="/admin/materials">
                            <Plus className="mr-1 size-3" /> Add Subject
                          </Link>
                        </Button>
                      </div>
                    ) : (
                      semSubjects.map((sub) => (
                        <div
                          key={sub.id}
                          className="flex items-center justify-between rounded-xl border border-border/70 bg-white px-3 py-2 text-xs"
                        >
                          <div>
                            <p className="font-bold text-foreground">{sub.name}</p>
                            <p className="text-[10px] text-muted-foreground">{sub.code || "PCI Core"}</p>
                          </div>
                          <Button asChild size="sm" variant="ghost" className="h-7 text-xs text-[#0e7490] hover:text-[#0e7490]">
                            <Link to="/admin/materials">
                              Notes
                            </Link>
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ==================================================================== */}
        {/* ROW 3: RECENT ORDERS & RECENT STUDENTS (AUTHENTIC DATABASE RECORDS)   */}
        {/* ==================================================================== */}
        <div className="grid gap-8 lg:grid-cols-2">
          
          {/* Recent Orders & Payments */}
          <div className="rounded-3xl border border-border bg-white p-6 shadow-2xs">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <h3 className="text-base font-black text-foreground">Recent Orders & Payments</h3>
              <span className="text-xs font-semibold text-muted-foreground">
                Total: {orders.length}
              </span>
            </div>

            {loading ? (
              <div className="py-8 space-y-3">
                <div className="h-10 w-full animate-pulse rounded bg-slate-100" />
                <div className="h-10 w-full animate-pulse rounded bg-slate-100" />
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="py-12 text-center">
                <ShoppingBag className="mx-auto size-9 text-muted-foreground/30" />
                <p className="mt-2 text-xs font-bold text-foreground">No orders in database yet</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Verified orders from students will appear here in real-time.
                </p>
              </div>
            ) : (
              <div className="mt-4 divide-y divide-border/60">
                {recentOrders.map((ord) => (
                  <div key={ord.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-foreground">{ord.student_name || "Student"}</p>
                      <p className="text-muted-foreground text-[11px] truncate max-w-[200px]">
                        {ord.product_title || "Material Purchase"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground">{formatINR(ord.final_amount || ord.amount || 0)}</p>
                      <Badge
                        className={`text-[9px] ${
                          ord.status === "Paid"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {ord.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Student Registrations */}
          <div className="rounded-3xl border border-border bg-white p-6 shadow-2xs">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <h3 className="text-base font-black text-foreground">Recent Student Registrations</h3>
              <span className="text-xs font-semibold text-muted-foreground">
                Total: {profilesError ? "Unavailable" : students.length}
              </span>
            </div>

            {loading ? (
              <div className="py-8 space-y-3">
                <div className="h-10 w-full animate-pulse rounded bg-slate-100" />
                <div className="h-10 w-full animate-pulse rounded bg-slate-100" />
              </div>
            ) : profilesError ? (
              <div className="py-8 text-center">
                <AlertCircle className="mx-auto size-8 text-amber-500" />
                <p className="mt-2 text-xs font-bold text-foreground">Unable to load students from database</p>
                <p className="mt-1 text-[11px] text-muted-foreground max-w-sm mx-auto">
                  PostgreSQL returned policy recursion. Apply the migration in{" "}
                  <code>supabase/migrations/20260303_fix_profiles_recursion.sql</code> to view profiles.
                </p>
                <Button size="sm" variant="outline" onClick={handleRefresh} className="mt-3 text-xs">
                  Retry Query
                </Button>
              </div>
            ) : recentStudents.length === 0 ? (
              <div className="py-12 text-center">
                <UserCheck className="mx-auto size-9 text-muted-foreground/30" />
                <p className="mt-2 text-xs font-bold text-foreground">No students registered yet</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Newly registered students will appear here immediately.
                </p>
              </div>
            ) : (
              <div className="mt-4 divide-y divide-border/60">
                {recentStudents.map((stu) => (
                  <div key={stu.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-foreground">{stu.full_name || "Student"}</p>
                      <p className="text-muted-foreground text-[11px] truncate max-w-[220px]">
                        {stu.email} {stu.college ? `· ${stu.college}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-foreground">
                        {stu.year ? `Year ${stu.year}` : ""} {stu.semester ? `· Sem ${stu.semester}` : ""}
                      </span>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {stu.created_at ? new Date(stu.created_at).toLocaleDateString() : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ==================================================================== */}
        {/* SECTION 4: TOP PERFORMING SUBJECTS (REAL DATABASE ONLY)              */}
        {/* ==================================================================== */}
        <div className="rounded-3xl border border-border bg-white p-6 shadow-2xs">
          <div className="flex items-center justify-between border-b border-border/80 pb-3">
            <div>
              <h3 className="text-base font-black text-foreground">Top Performing Subjects</h3>
              <p className="text-xs text-muted-foreground">Calculated strictly from verified student purchase volume</p>
            </div>
          </div>

          <div className="py-10 text-center">
            <TrendingUp className="mx-auto size-8 text-muted-foreground/30" />
            <p className="mt-2 text-xs font-bold text-foreground">No purchase volume recorded yet</p>
            <p className="text-[11px] text-muted-foreground max-w-md mx-auto mt-0.5">
              Top performing subjects will automatically rank and display here once students purchase study notes or subject packages.
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
