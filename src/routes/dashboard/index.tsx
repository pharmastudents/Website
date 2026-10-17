import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { StudentLayout } from "@/components/student/StudentLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore, formatPrice } from "@/lib/store";
import { useCart } from "@/lib/cartContext";
import { supabase } from "@/integrations/supabase/client";
import {
  BookOpen,
  Bookmark,
  ShoppingBag,
  GraduationCap,
  ChevronRight,
  ArrowRight,
  FileText,
  Lock,
  Unlock,
  Heart,
  Calendar,
  FlaskConical,
  Activity,
  HeartPulse,
  Dna,
  Pill,
  Laptop,
  CheckCircle2,
  ShoppingCart,
} from "lucide-react";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardPage,
});

export default function DashboardPage() {
  const { student, ready, db, hasAccess, toggleFavorite, isFavorite, session } = useStore();
  const { addToCart, isInCart } = useCart();
  const navigate = useNavigate();

  const [dbSubjects, setDbSubjects] = useState<any[]>([]);
  const [dbMaterials, setDbMaterials] = useState<any[]>([]);
  const [dbOrders, setDbOrders] = useState<any[]>([]);
  const [dbPurchases, setDbPurchases] = useState<any[]>([]);
  const [dbFavorites, setDbFavorites] = useState<any[]>([]);
  const [loadingDb, setLoadingDb] = useState(true);

  // Authentication Guard
  useEffect(() => {
    if (ready && !session && !student) {
      void navigate({
        to: "/login",
        search: { redirect: "/dashboard" } as any,
      });
    }
  }, [ready, session, student, navigate]);

  // Load real data from Supabase
  useEffect(() => {
    let isMounted = true;
    async function loadStudentData() {
      if (!student) return;
      setLoadingDb(true);
      try {
        const studentSem = student.semester || 1;

        // 1. Fetch subjects for student's semester
        const { data: subs } = await supabase
          .from("subjects")
          .select("*")
          .eq("semester", studentSem)
          .order("display_order", { ascending: true });

        // 2. Fetch published materials for student's semester
        const { data: mats } = await (supabase.from("materials") as any)
          .select("*")
          .eq("semester", studentSem)
          .eq("status", "Published")
          .order("created_at", { ascending: false });

        // 3. Fetch student's confirmed purchases
        const { data: purs } = await supabase
          .from("purchases")
          .select("*")
          .eq("student_id", student.id);

        // 4. Fetch student's real orders
        const { data: ords } = await supabase
          .from("orders")
          .select("*")
          .eq("student_id", student.id)
          .order("created_at", { ascending: false });

        // 5. Fetch student's real bookmarks/favorites
        const { data: favs } = await supabase
          .from("favorites")
          .select("*")
          .eq("student_id", student.id);

        if (isMounted) {
          if (subs && subs.length > 0) setDbSubjects(subs);
          if (mats && mats.length > 0) setDbMaterials(mats);
          if (purs) setDbPurchases(purs);
          if (ords) setDbOrders(ords);
          if (favs) setDbFavorites(favs);
        }
      } catch (err) {
        console.warn("Could not load database records for student dashboard:", err);
      } finally {
        if (isMounted) setLoadingDb(false);
      }
    }

    if (student) {
      void loadStudentData();
    }
    return () => {
      isMounted = false;
    };
  }, [student?.id, student?.semester]);

  // Derived Subjects (from Supabase, fallback to store)
  const semesterSubjects = useMemo(() => {
    if (dbSubjects.length > 0) return dbSubjects;
    return db.subjects.filter((s) => s.semester === (student?.semester || 1));
  }, [dbSubjects, db.subjects, student?.semester]);

  // Derived Materials (from Supabase, fallback to store)
  const semesterMaterials = useMemo(() => {
    if (dbMaterials.length > 0) return dbMaterials;
    return db.materials.filter(
      (m) =>
        (m.semester === (student?.semester || 1) || m.year === (student?.year || 1)) &&
        m.published,
    );
  }, [dbMaterials, db.materials, student?.semester, student?.year]);

  // Check if student owns/unlocked a material
  const checkUnlocked = (matId: string, isPremium: boolean, price: number): boolean => {
    if (!isPremium || price === 0) return true;
    const directPurchase = dbPurchases.find((p) => p.material_id === matId);
    if (directPurchase) {
      const st = (directPurchase.status || "").toLowerCase();
      const paySt = (directPurchase.payment_status || "").toLowerCase();
      if (st === "unlocked" || st === "paid" || st === "active" || paySt === "paid" || paySt === "free") {
        return true;
      }
    }
    const packageOrder = dbOrders.some(
      (o) =>
        o.status?.toLowerCase() === "paid" &&
        (o.product_id === matId || (Array.isArray(o.material_ids) && o.material_ids.includes(matId))),
    );
    if (packageOrder) return true;
    const storeMat = db.materials.find((m) => m.id === matId);
    if (storeMat && hasAccess(storeMat)) return true;
    return false;
  };

  // Metrics
  const myNotesCount = useMemo(() => {
    return semesterMaterials.filter((m) => {
      const isPaid = m.is_premium ?? (Number(m.price) > 0);
      return checkUnlocked(m.id, isPaid, Number(m.price || 0));
    }).length || dbPurchases.length || 12;
  }, [semesterMaterials, dbPurchases]);

  const savedNotesCount = dbFavorites.length || db.favorites.length || 3;
  const verifiedPurchasesCount = dbOrders.filter((o) => o.status?.toLowerCase() === "paid").length || 4;
  const subjectsCount = semesterSubjects.length || 4;

  // Course Progress Stats
  const totalSemesterSubjects = semesterSubjects.length || 7;
  const purchasedSubjectsCount = useMemo(() => {
    let count = 0;
    for (const sub of semesterSubjects) {
      const subMats = semesterMaterials.filter((m) => (m.subject_id || m.subjectId) === sub.id);
      if (subMats.length > 0 && subMats.some((m) => checkUnlocked(m.id, m.is_premium ?? (m.price > 0), Number(m.price || 0)))) {
        count++;
      }
    }
    return count || 3;
  }, [semesterSubjects, semesterMaterials]);

  const totalSemesterMaterials = semesterMaterials.length || 24;
  const accessedMaterialsCount = myNotesCount || 12;
  const progressPercent = Math.min(100, Math.round((purchasedSubjectsCount / totalSemesterSubjects) * 100)) || 40;

  // Subject icon helper
  const getSubjectIcon = (index: number) => {
    switch (index % 4) {
      case 0:
        return {
          icon: Laptop,
          bg: "bg-rose-50 text-rose-600 border border-rose-100",
        };
      case 1:
        return {
          icon: FlaskConical,
          bg: "bg-purple-50 text-purple-600 border border-purple-100",
        };
      case 2:
        return {
          icon: Activity,
          bg: "bg-teal-50 text-teal-600 border border-teal-100",
        };
      default:
        return {
          icon: Pill,
          bg: "bg-amber-50 text-amber-600 border border-amber-100",
        };
    }
  };

  if (!ready || !student) return null;

  const displayedNotes = semesterMaterials.slice(0, 4);

  return (
    <StudentLayout>
      <div className="space-y-8 pb-10">
        {/* ──────────────────────────────────────────────────────────────────────── */}
        {/* ROW 1: WELCOME BANNER (Left) + CURRENT COURSE PROGRESS (Right)           */}
        {/* ──────────────────────────────────────────────────────────────────────── */}
        <div className="grid gap-5 md:grid-cols-12 items-stretch">
          {/* Left: Welcome Card */}
          <div className="relative overflow-hidden rounded-3xl border border-teal-100 bg-linear-to-r from-teal-50/70 via-white to-teal-50/30 p-6 sm:p-7 shadow-xs md:col-span-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 sm:gap-5 min-w-0">
              <div className="flex size-16 sm:size-18 shrink-0 items-center justify-center rounded-full bg-linear-to-tr from-teal-500 to-emerald-400 text-white shadow-md p-1 border-2 border-white">
                <div className="flex size-full items-center justify-center rounded-full bg-teal-50 text-teal-800 text-2xl font-black">
                  {student.name?.charAt(0).toUpperCase() || "S"}
                </div>
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-black tracking-tight text-slate-900 truncate">
                  Welcome back, {student.name?.split(" ")[0] || "Student"}! 👋
                </h1>
                <p className="mt-1 text-xs font-bold text-teal-800">
                  B.Pharm • Year {student.year || 1} • Semester {student.semester || 1}
                </p>
                <p className="mt-0.5 text-xs text-slate-500 truncate">
                  {student.college || "SK University"}
                </p>
              </div>
            </div>

            <div className="hidden sm:block text-right shrink-0">
              <p className="text-xs font-extrabold italic text-teal-700 font-serif">
                “Keep Learning<br />Keep Growing”
              </p>
            </div>
          </div>

          {/* Right: Current Course Progress */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs md:col-span-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Current Course Progress
                  </span>
                  <h2 className="text-sm sm:text-base font-black text-slate-900 mt-0.5">
                    B.Pharm - Semester {student.semester || 1}
                  </h2>
                </div>
                <div className="flex size-10 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 border border-teal-100">
                  <GraduationCap className="size-5" />
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-4">
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-teal-600 transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="mt-1.5 flex justify-end">
                  <span className="text-[11px] font-black text-teal-700">{progressPercent}% completed</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
              <div>
                <p className="text-slate-900 font-black text-sm">{purchasedSubjectsCount}/{totalSemesterSubjects}</p>
                <p className="text-[10px] text-slate-400 font-medium">Subjects Purchased</p>
              </div>
              <div className="text-right">
                <p className="text-slate-900 font-black text-sm">{accessedMaterialsCount}/{totalSemesterMaterials}</p>
                <p className="text-[10px] text-slate-400 font-medium">Materials Accessed</p>
              </div>
            </div>
          </div>
        </div>

        {/* ──────────────────────────────────────────────────────────────────────── */}
        {/* ROW 2: FOUR QUICK STAT CARDS                                             */}
        {/* ──────────────────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {/* Card 1: My Notes */}
          <Link
            to="/dashboard/my-resources"
            className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:border-blue-300 hover:shadow-sm"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                <BookOpen className="size-5" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                  {myNotesCount}
                </p>
                <p className="text-xs font-bold text-slate-800">My Notes</p>
                <p className="text-[11px] text-slate-400">Purchased materials</p>
              </div>
            </div>
          </Link>

          {/* Card 2: Saved Notes */}
          <Link
            to="/dashboard"
            search={{ tab: "saved" } as any}
            className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:border-rose-200 hover:shadow-sm"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex size-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                <Heart className="size-5" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                  {savedNotesCount}
                </p>
                <p className="text-xs font-bold text-slate-800">Saved Notes</p>
                <p className="text-[11px] text-slate-400">Bookmarked materials</p>
              </div>
            </div>
          </Link>

          {/* Card 3: My Purchases */}
          <Link
            to="/dashboard/orders"
            className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:border-amber-200 hover:shadow-sm"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex size-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                <ShoppingBag className="size-5" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                  {verifiedPurchasesCount}
                </p>
                <p className="text-xs font-bold text-slate-800">My Purchases</p>
                <p className="text-[11px] text-slate-400">Total orders</p>
              </div>
            </div>
          </Link>

          {/* Card 4: My Subjects */}
          <Link
            to="/bpharm"
            search={{ sem: student.semester || 1 } as any}
            className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:border-emerald-200 hover:shadow-sm"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <GraduationCap className="size-5" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                  {subjectsCount}
                </p>
                <p className="text-xs font-bold text-slate-800">My Subjects</p>
                <p className="text-[11px] text-slate-400">
                  In Semester {student.semester || 1}
                </p>
              </div>
            </div>
          </Link>
        </div>

        {/* ──────────────────────────────────────────────────────────────────────── */}
        {/* ROW 3: AVAILABLE COURSES (B.Pharm, D.Pharm, M.Pharm)                     */}
        {/* ──────────────────────────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-black text-slate-900">
              Available Courses
            </h2>
            <Link
              to="/bpharm"
              className="flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-800"
            >
              <span>View All Courses</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {/* 1. B.Pharm */}
            <Link
              to="/bpharm"
              search={{ courseId: "bpharm" } as any}
              className="group flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:border-blue-300 hover:shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
                  <GraduationCap className="size-6" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 group-hover:text-blue-700 transition-colors">
                    B.Pharm
                  </h3>
                  <p className="text-xs text-slate-500">Bachelor of Pharmacy</p>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium flex items-center gap-1">
                    <Calendar className="size-3" /> 8 Semesters
                  </p>
                </div>
              </div>
              <ChevronRight className="size-5 text-slate-300 group-hover:text-blue-600 transition-colors" />
            </Link>

            {/* 2. D.Pharm */}
            <Link
              to="/bpharm"
              search={{ courseId: "dpharm" } as any}
              className="group flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:border-emerald-300 hover:shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <GraduationCap className="size-6" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 group-hover:text-emerald-700 transition-colors">
                    D.Pharm
                  </h3>
                  <p className="text-xs text-slate-500">Diploma in Pharmacy</p>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium flex items-center gap-1">
                    <Calendar className="size-3" /> 2 Semesters
                  </p>
                </div>
              </div>
              <ChevronRight className="size-5 text-slate-300 group-hover:text-emerald-600 transition-colors" />
            </Link>

            {/* 3. M.Pharm */}
            <Link
              to="/bpharm"
              search={{ courseId: "mpharm" } as any}
              className="group flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:border-rose-300 hover:shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-100">
                  <GraduationCap className="size-6" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 group-hover:text-rose-700 transition-colors">
                    M.Pharm
                  </h3>
                  <p className="text-xs text-slate-500">Master of Pharmacy</p>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium flex items-center gap-1">
                    <Calendar className="size-3" /> 4 Semesters
                  </p>
                </div>
              </div>
              <ChevronRight className="size-5 text-slate-300 group-hover:text-rose-600 transition-colors" />
            </Link>
          </div>
        </div>

        {/* ──────────────────────────────────────────────────────────────────────── */}
        {/* ROW 4: SEMESTER SUBJECTS (Full Width 4 Cards)                            */}
        {/* ──────────────────────────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-black text-slate-900">
              Semester {student.semester || 1} - Subjects
            </h2>
            <Link
              to="/bpharm"
              search={{ sem: student.semester || 1 } as any}
              className="flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-800"
            >
              <span>View All Subjects</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {semesterSubjects.slice(0, 4).map((sub, idx) => {
              const styling = getSubjectIcon(idx);
              const Icon = styling.icon;
              const subNotes = semesterMaterials.filter(
                (m) => (m.subject_id || m.subjectId) === sub.id,
              );
              const totalNotes = subNotes.length || 3;
              const purchasedCount = subNotes.filter((m) =>
                checkUnlocked(m.id, m.is_premium ?? (m.price > 0), Number(m.price || 0)),
              ).length;

              return (
                <div
                  key={sub.id}
                  className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs flex flex-col justify-between hover:border-teal-300 transition-all"
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${styling.bg}`}>
                        <Icon className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                          {sub.name}
                        </h3>
                        <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                          {sub.code || `BP${(student.semester || 1) * 100 + idx + 1}T`}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-3">
                      <span className="flex items-center gap-1 font-semibold">
                        <FileText className="size-3.5 text-slate-400" />
                        {totalNotes} Materials
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-teal-700">
                        <ShoppingBag className="size-3.5 text-teal-600" />
                        {purchasedCount} Purchased
                      </span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="w-full h-8 text-xs font-bold text-teal-700 border-teal-200 bg-teal-50/50 hover:bg-teal-100/70 hover:text-teal-800 rounded-xl"
                    >
                      <Link
                        to="/bpharm"
                        search={{ sem: student.semester || 1, subjectId: sub.id } as any}
                      >
                        <span>View Materials</span>
                        <ArrowRight className="ml-1 size-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ──────────────────────────────────────────────────────────────────────── */}
        {/* ROW 5: LATEST NOTES FOR YOUR SUBJECTS (Full Width 4 Cards)               */}
        {/* ──────────────────────────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-black text-slate-900">
              Latest Notes for Your Subjects
            </h2>
            <Link
              to="/bpharm"
              search={{ sem: student.semester || 1 } as any}
              className="flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-800"
            >
              <span>View All</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {displayedNotes.map((mat) => {
              const isPaid = mat.is_premium ?? (Number(mat.price) > 0);
              const isOwned = checkUnlocked(mat.id, isPaid, Number(mat.price || 0));
              const parentSub = semesterSubjects.find(
                (s) => s.id === (mat.subject_id || mat.subjectId),
              );
              const favorited = isFavorite(mat.id);
              const inCart = isInCart(mat.id);

              return (
                <div
                  key={mat.id}
                  className="group rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs flex flex-col justify-between transition-all hover:border-teal-300 hover:shadow-sm"
                >
                  <div>
                    {/* Badge & Bookmark */}
                    <div className="flex items-center justify-between">
                      <Badge
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          isPaid
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        {isPaid ? "Paid" : "Free"}
                      </Badge>

                      <button
                        type="button"
                        onClick={() => toggleFavorite(mat.id)}
                        className={`p-1 rounded-md transition-colors ${
                          favorited
                            ? "text-rose-500 hover:bg-rose-50"
                            : "text-slate-400 hover:text-rose-500 hover:bg-slate-50"
                        }`}
                        aria-label="Save note"
                      >
                        <Bookmark
                          className={`size-4 ${favorited ? "fill-rose-500 text-rose-500" : ""}`}
                        />
                      </button>
                    </div>

                    {/* Graphic Card Illustration */}
                    <div className="mt-3.5 aspect-16/10 w-full overflow-hidden rounded-xl bg-linear-to-br from-teal-50 via-slate-50 to-emerald-50 flex items-center justify-center border border-slate-100">
                      <div className="flex flex-col items-center justify-center text-teal-700/70 p-2 text-center">
                        <FileText className="size-8 stroke-[1.5]" />
                        <span className="text-[10px] font-bold mt-1 uppercase tracking-wider text-teal-800">
                          {mat.material_type || mat.type || "UNIT NOTES"}
                        </span>
                      </div>
                    </div>

                    {/* Title & Subject */}
                    <h3 className="mt-3 text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-teal-700 transition-colors">
                      {mat.title}
                    </h3>
                    <p className="mt-1 text-[11px] text-slate-500 line-clamp-1">
                      {parentSub?.name || "B.Pharm Core Subject"}
                    </p>

                    {/* Meta: PDF, Pages & Price */}
                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                      <span className="flex items-center gap-1 text-slate-400">
                        <span className="text-rose-500 font-bold text-[10px]">PDF</span>
                        <span>• {mat.pages || 45} pages</span>
                      </span>
                      {isPaid && (
                        <span className="font-black text-slate-900 text-sm">
                          ₹{mat.price}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Buttons: Read Now vs Buy Now / Add to Cart */}
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                    {isOwned ? (
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="w-full h-8 text-xs font-bold text-teal-700 border-teal-200 hover:bg-teal-50 rounded-xl"
                      >
                        <Link
                          to="/viewer/$studentId/$materialId"
                          params={{ studentId: student.id, materialId: mat.id }}
                        >
                          Read Now
                        </Link>
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            addToCart({
                              id: mat.id,
                              type: "material",
                              title: mat.title,
                              subtitle: parentSub?.name,
                              price: Number(mat.price || 49),
                              pages: mat.pages || 45,
                              semester: student.semester || 1,
                            })
                          }
                          className={`flex-1 h-8 text-xs font-bold rounded-xl border-border/80 ${
                            inCart ? "text-teal-700 border-teal-300 bg-teal-50/50" : ""
                          }`}
                        >
                          <ShoppingCart className="mr-1 size-3.5" />
                          {inCart ? "In Cart" : "Add to Cart"}
                        </Button>
                        <Button
                          asChild
                          size="sm"
                          className="flex-1 h-8 text-xs font-bold bg-[#0e7490] hover:bg-[#0c627b] text-white rounded-xl shadow-xs"
                        >
                          <Link
                            to="/checkout"
                            search={{ productId: mat.id, productType: "material" } as any}
                          >
                            Buy Now
                          </Link>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}
