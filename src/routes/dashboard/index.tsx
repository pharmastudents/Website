import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo, useCallback } from "react";
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
  const [dbCourses, setDbCourses] = useState<any[]>([]);
  const [dbSemesters, setDbSemesters] = useState<any[]>([]);
  const [dbUnits, setDbUnits] = useState<any[]>([]);
  const [loadingDb, setLoadingDb] = useState(true);
  const [dbLoaded, setDbLoaded] = useState(false);
  const [selectedSemesterFilter, setSelectedSemesterFilter] = useState<number | "all">("all");

  // Authentication Guard
  useEffect(() => {
    if (ready && !session && !student) {
      void navigate({
        to: "/login",
        search: { redirect: "/dashboard" } as any,
      });
    }
  }, [ready, session, student, navigate]);

  // Load real dynamic data from Supabase for this specific student
  useEffect(() => {
    let isMounted = true;
    async function loadStudentData() {
      if (!student) return;
      setLoadingDb(true);
      try {
        // 1. Fetch ALL subjects ordered by semester and display_order
        const { data: subs } = await supabase
          .from("subjects")
          .select("*")
          .order("semester", { ascending: true })
          .order("display_order", { ascending: true });

        // 2. Fetch published materials
        const { data: mats } = await (supabase.from("materials") as any)
          .select("*")
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

        // 6. Fetch authoritative active courses
        const { data: coursesData } = await supabase
          .from("courses")
          .select("*")
          .eq("is_active", true)
          .order("display_order", { ascending: true });

        // 7. Fetch semesters
        const { data: semestersData } = await supabase
          .from("semesters")
          .select("id, course_id, semester_number")
          .order("semester_number", { ascending: true });

        // 8. Fetch units
        const { data: unitsData } = await supabase
          .from("units")
          .select("id, subject_id, unit_number, title");

        if (isMounted) {
          setDbSubjects(subs || []);
          setDbMaterials(mats || []);
          setDbPurchases(purs || []);
          setDbOrders(ords || []);
          setDbFavorites(favs || []);
          setDbCourses(coursesData || []);
          setDbSemesters(semestersData || []);
          setDbUnits(unitsData || []);
          setDbLoaded(true);
        }
      } catch (err) {
        console.warn("Could not load database records for student dashboard:", err);
      } finally {
        if (isMounted) {
          setLoadingDb(false);
          setDbLoaded(true);
        }
      }
    }

    if (student) {
      void loadStudentData();
    }
    return () => {
      isMounted = false;
    };
  }, [student?.id, student?.semester]);

  // Authoritative full subject catalog from DB
  const allSubjects = useMemo(() => {
    if (dbLoaded && dbSubjects.length > 0) return dbSubjects;
    if (dbSubjects.length > 0) return dbSubjects;
    return db.subjects;
  }, [dbLoaded, dbSubjects, db.subjects]);

  // Dynamic available semesters present in the database
  const availableSemesters = useMemo(() => {
    const sems = new Set<number>();
    allSubjects.forEach((s) => {
      if (s.semester) sems.add(Number(s.semester));
    });
    if (sems.size === 0) return [1, 2, 3, 4, 5, 6, 7, 8];
    return Array.from(sems).sort((a, b) => a - b);
  }, [allSubjects]);

  // Filtered subjects based on active semester tab pill
  const filteredSubjects = useMemo(() => {
    if (selectedSemesterFilter === "all") return allSubjects;
    return allSubjects.filter((s) => Number(s.semester) === Number(selectedSemesterFilter));
  }, [allSubjects, selectedSemesterFilter]);

  // Derived subjects for student's enrolled semester
  const semesterSubjects = useMemo(() => {
    return allSubjects.filter((s) => Number(s.semester) === Number(student?.semester || 1));
  }, [allSubjects, student?.semester]);

  // Derived Materials
  const semesterMaterials = useMemo(() => {
    if (dbLoaded) return dbMaterials;
    if (dbMaterials.length > 0) return dbMaterials;
    return db.materials.filter((m) => m.published);
  }, [dbLoaded, dbMaterials, db.materials]);

  // Check if student owns/unlocked a material
  const checkUnlocked = useCallback(
    (matId: string, isPremium: boolean, price: number): boolean => {
      if (!isPremium || price === 0) return true;
      const directPurchase = dbPurchases.find((p) => p.material_id === matId);
      if (directPurchase) {
        const st = (directPurchase.status || "").toLowerCase();
        const paySt = ((directPurchase as any).payment_status || "").toLowerCase();
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

      // Check if parent subject is purchased
      const targetMat = (semesterMaterials || dbMaterials || []).find((m: any) => m.id === matId);
      const subId = targetMat?.subject_id || targetMat?.subjectId;
      if (subId) {
        const subPurch = dbPurchases.some(
          (p) =>
            p.material_id === subId &&
            ((p.status || "").toLowerCase() === "unlocked" ||
              (p.status || "").toLowerCase() === "paid" ||
              (p.status || "").toLowerCase() === "active"),
        );
        if (subPurch) return true;

        const subOrder = dbOrders.some(
          (o) =>
            o.status?.toLowerCase() === "paid" &&
            (o.product_id === subId || (Array.isArray(o.material_ids) && o.material_ids.includes(subId))),
        );
        if (subOrder) return true;
      }

      const storeMat = db.materials.find((m) => m.id === matId);
      if (storeMat && hasAccess(storeMat)) return true;
      return false;
    },
    [dbPurchases, dbOrders, db.materials, semesterMaterials, dbMaterials, hasAccess],
  );

  // Distinct set of purchased material IDs for student
  const purchasedMaterialIds = useMemo(() => {
    const ids = new Set<string>();
    dbPurchases.forEach((p) => {
      const st = (p.status || "").toLowerCase();
      const paySt = ((p as any).payment_status || "").toLowerCase();
      if (st === "unlocked" || st === "paid" || st === "active" || paySt === "paid" || paySt === "free") {
        if (p.material_id) ids.add(String(p.material_id));
      }
    });
    dbOrders.forEach((o) => {
      if (o.status?.toLowerCase() === "paid") {
        if (Array.isArray(o.material_ids)) {
          o.material_ids.forEach((id: string) => ids.add(String(id)));
        }
        if (o.product_id && o.product_id !== "cart") {
          ids.add(String(o.product_id));
        }
      }
    });
    return ids;
  }, [dbPurchases, dbOrders]);

  // Dynamic Metrics directly calculated from database records
  const myNotesCount = useMemo(() => {
    const accessibleInSem = semesterMaterials.filter((m) => {
      const isPaid = m.is_premium ?? (Number(m.price) > 0);
      return checkUnlocked(m.id, isPaid, Number(m.price || 0));
    }).length;
    return Math.max(purchasedMaterialIds.size, accessibleInSem);
  }, [purchasedMaterialIds, semesterMaterials, checkUnlocked]);

  const savedNotesCount = dbFavorites.length;
  const verifiedPurchasesCount = dbOrders.length;
  const subjectsCount = semesterSubjects.length;

  // Dynamic Course Progress Stats
  const totalSemesterSubjects = semesterSubjects.length;
  const purchasedSubjectsCount = useMemo(() => {
    let count = 0;
    for (const sub of semesterSubjects) {
      const subMats = semesterMaterials.filter((m) => (m.subject_id || m.subjectId) === sub.id);
      if (
        subMats.length > 0 &&
        subMats.some((m) =>
          checkUnlocked(m.id, m.is_premium ?? (Number(m.price) > 0), Number(m.price || 0)),
        )
      ) {
        count++;
      }
    }
    return count;
  }, [semesterSubjects, semesterMaterials, checkUnlocked]);

  const totalSemesterMaterials = semesterMaterials.length;
  const accessedMaterialsCount = useMemo(() => {
    return semesterMaterials.filter((m) => {
      const isPaid = m.is_premium ?? (Number(m.price) > 0);
      return checkUnlocked(m.id, isPaid, Number(m.price || 0));
    }).length;
  }, [semesterMaterials, checkUnlocked]);

  const progressPercent =
    totalSemesterSubjects > 0
      ? Math.min(100, Math.round((purchasedSubjectsCount / totalSemesterSubjects) * 100))
      : 0;

  // Toggle favorite connected directly to database favorites
  const handleToggleFavorite = async (matId: string) => {
    if (!student) return;
    const isCurrentlyFav = dbFavorites.some((f) => (f.material_id || f.materialId) === matId);
    if (isCurrentlyFav) {
      setDbFavorites((prev) => prev.filter((f) => (f.material_id || f.materialId) !== matId));
      try {
        await supabase.from("favorites").delete().eq("student_id", student.id).eq("material_id", matId);
      } catch { }
    } else {
      setDbFavorites((prev) => [...prev, { student_id: student.id, material_id: matId }]);
      try {
        await supabase.from("favorites").insert({ student_id: student.id, material_id: matId });
      } catch { }
    }
    toggleFavorite(matId);
  };

  const isMatFavorite = (matId: string) => {
    return dbFavorites.some((f) => (f.material_id || f.materialId) === matId) || isFavorite(matId);
  };

  // Authoritative check if student owns this subject
  const isSubjectPurchased = useCallback(
    (sub: any): boolean => {
      if (!sub.is_premium || !sub.price || Number(sub.price) === 0) return true;
      if (!student) return false;

      // Check semester package entitlement
      const semNum = sub.semester || 1;
      const semPurch = dbPurchases.some(
        (p) =>
          p.material_id === `sem-${semNum}` ||
          (sub.semester_id && p.material_id === sub.semester_id && ((p.status || "").toLowerCase() === "unlocked" || (p.status || "").toLowerCase() === "paid")),
      );
      if (semPurch) return true;

      const semOrder = dbOrders.some(
        (o) =>
          o.status?.toLowerCase() === "paid" &&
          (o.product_type === "semester" || o.product_type === "package") &&
          ((sub.semester_id && o.product_id === sub.semester_id) || o.product_title?.toLowerCase().includes(`semester ${semNum}`)),
      );
      if (semOrder) return true;

      const directPurch = dbPurchases.some(
        (p) =>
          p.material_id === sub.id &&
          (
            (p.status || "").toLowerCase() === "unlocked" ||
            (p.status || "").toLowerCase() === "paid" ||
            (p.status || "").toLowerCase() === "active" ||
            ((p as any).payment_status || "").toLowerCase() === "paid" ||
            ((p as any).payment_status || "").toLowerCase() === "free"
          ),
      );
      if (directPurch) return true;
      return dbOrders.some(
        (o) =>
          o.status?.toLowerCase() === "paid" &&
          (o.product_id === sub.id || (Array.isArray(o.material_ids) && o.material_ids.includes(sub.id))),
      );
    },
    [dbPurchases, dbOrders, student],
  );

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
            to="/dashboard/my-resources"
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
        {/* ROW 3: AVAILABLE COURSES (Authoritative from Supabase)                    */}
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

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dbCourses.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-400">
                <GraduationCap className="mx-auto size-8 text-slate-300 mb-2" />
                <p className="text-xs font-semibold text-slate-600">No active courses published yet</p>
              </div>
            ) : (
              dbCourses.map((course, idx) => {
                const courseSems = dbSemesters.filter((s) => s.course_id === course.id);
                const totalSems = courseSems.length > 0 ? courseSems.length : (course.duration_years || 4) * 2;
                const colors = [
                  { bg: "bg-blue-50 text-blue-600 border border-blue-100", hover: "hover:border-blue-300", textHover: "group-hover:text-blue-700", iconHover: "group-hover:text-blue-600" },
                  { bg: "bg-emerald-50 text-emerald-600 border border-emerald-100", hover: "hover:border-emerald-300", textHover: "group-hover:text-emerald-700", iconHover: "group-hover:text-emerald-600" },
                  { bg: "bg-purple-50 text-purple-600 border border-purple-100", hover: "hover:border-purple-300", textHover: "group-hover:text-purple-700", iconHover: "group-hover:text-purple-600" },
                ][idx % 3];

                return (
                  <Link
                    key={course.id}
                    to="/bpharm"
                    search={{ courseId: course.id } as any}
                    className={`group flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all ${colors.hover} hover:shadow-sm`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${colors.bg}`}>
                        <GraduationCap className="size-6" />
                      </div>
                      <div>
                        <h3 className={`text-sm font-black text-slate-900 ${colors.textHover} transition-colors`}>
                          {course.name}
                        </h3>
                        <p className="text-xs text-slate-500">{course.description || "Pharmacy Program"}</p>
                        <p className="text-[10px] text-slate-400 mt-1 font-medium flex items-center gap-1">
                          <Calendar className="size-3" /> {totalSems} Semesters
                        </p>
                      </div>
                    </div>
                    <ChevronRight className={`size-5 text-slate-300 ${colors.iconHover} transition-colors`} />
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* ──────────────────────────────────────────────────────────────────────── */}
        {/* ROW 4: ALL SUBJECTS (With Semester Filter Tabs & Direct Prices)          */}
        {/* ──────────────────────────────────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base sm:text-lg font-black text-slate-900">
                  {selectedSemesterFilter === "all" ? "All Subjects" : `Semester ${selectedSemesterFilter} - Subjects`}
                </h2>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                  {filteredSubjects.length} {filteredSubjects.length === 1 ? "Subject" : "Subjects"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Official PCI curriculum subjects, units, notes, and study resources.
              </p>
            </div>

            {/* Semester-Wise Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedSemesterFilter("all")}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all shrink-0 ${
                  selectedSemesterFilter === "all"
                    ? "bg-[#0e7490] text-white shadow-xs"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                All Semesters
              </button>
              {availableSemesters.map((sem) => (
                <button
                  key={sem}
                  type="button"
                  onClick={() => setSelectedSemesterFilter(sem)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all shrink-0 ${
                    selectedSemesterFilter === sem
                      ? "bg-[#0e7490] text-white shadow-xs"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  Sem {sem}
                </button>
              ))}
            </div>
          </div>

          {filteredSubjects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-400">
              <BookOpen className="mx-auto size-10 text-slate-300 mb-2" />
              <p className="text-sm font-bold text-slate-700">No subjects found for Semester {selectedSemesterFilter}</p>
              <p className="text-xs text-slate-400 mt-1">Select another semester tab above or browse Available Courses.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredSubjects.map((sub, idx) => {
                const styling = getSubjectIcon(idx);
                const Icon = styling.icon;
                const subUnitsCount = dbUnits.filter((u) => u.subject_id === sub.id).length;
                const subNotes = dbMaterials.filter(
                  (m) => (m.subject_id || m.subjectId) === sub.id,
                );
                const unitsOrNotesCount = subUnitsCount > 0 ? `${subUnitsCount} Units` : `${subNotes.length} Materials`;
                const isPurchased = isSubjectPurchased(sub);
                const isPaid = sub.is_premium === true || Number(sub.price) > 0;
                const displayPrice = Number(sub.price || 79);

                return (
                  <div
                    key={sub.id}
                    className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs flex flex-col justify-between hover:border-teal-300 hover:shadow-sm transition-all gap-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${styling.bg}`}>
                            <Icon className="size-5" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wide">
                              {sub.code || `BP${(sub.semester || 1) * 100 + idx + 1}T`}
                            </span>
                            <h3 className="text-sm font-black text-slate-900 leading-snug line-clamp-2" title={sub.name}>
                              {sub.name}
                            </h3>
                          </div>
                        </div>
                        <span className="shrink-0 text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                          Sem {sub.semester || 1}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-3">
                        <span className="flex items-center gap-1 font-semibold text-slate-600">
                          <FileText className="size-3.5 text-slate-400" />
                          {unitsOrNotesCount}
                        </span>

                        {isPurchased ? (
                          <span className="inline-flex items-center gap-1 font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                            <CheckCircle2 className="size-3 text-teal-600" />
                            {isPaid ? "Purchased" : "Free Access"}
                          </span>
                        ) : isPaid ? (
                          <span className="font-black text-slate-900 text-sm">
                            ₹{displayPrice}
                          </span>
                        ) : (
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-xs">
                            Free
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      {isPurchased ? (
                        <Button
                          asChild
                          size="sm"
                          className="w-full h-8 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl"
                        >
                          <Link
                            to="/bpharm"
                            search={{ courseId: sub.course_id || "bpharm", sem: sub.semester || 1, subjectId: sub.id } as any}
                          >
                            <span>Access Notes</span>
                            <ArrowRight className="ml-1 size-3.5" />
                          </Link>
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="flex-1 h-8 text-[11px] font-bold text-slate-700 border-slate-200 hover:bg-slate-50 rounded-xl"
                          >
                            <Link
                              to="/bpharm"
                              search={{ courseId: sub.course_id || "bpharm", sem: sub.semester || 1, subjectId: sub.id } as any}
                            >
                              View Materials
                            </Link>
                          </Button>
                          <Button
                            asChild
                            size="sm"
                            className="flex-1 h-8 text-[11px] font-bold bg-[#0e7490] hover:bg-[#0c627b] text-white rounded-xl shadow-xs"
                          >
                            <Link
                              to="/checkout"
                              search={{ productId: sub.id, productType: "subject" } as any}
                            >
                              Buy Subject
                            </Link>
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </StudentLayout>
  );
}
