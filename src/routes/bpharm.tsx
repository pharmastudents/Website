import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { StudentLayout } from "@/components/student/StudentLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useStore, formatPrice } from "@/lib/store";
import { useCart } from "@/lib/cartContext";
import { AcademicService, type Course, type Semester, type SubjectItem, type UnitItem, type MaterialItem } from "@/lib/academicService";
import { supabase } from "@/integrations/supabase/client";
import {
  BookOpen,
  ArrowRight,
  ArrowLeft,
  GraduationCap,
  ChevronRight,
  Search,
  CheckCircle2,
  Lock,
  FileText,
  Check,
  Loader2,
  Image as ImageIcon,
  Sparkles,
} from "lucide-react";
import { SubjectThumbnail } from "@/components/subject/SubjectThumbnail";


export const Route = createFileRoute("/bpharm")({
  validateSearch: (search: Record<string, unknown>): {
    courseId?: string | undefined;
    sem?: number | undefined;
    subjectId?: string | undefined;
  } => {
    return {
      courseId: typeof search["courseId"] === "string" ? (search["courseId"] as string) : undefined,
      sem: typeof search["sem"] === "number" ? (search["sem"] as number) : undefined,
      subjectId: typeof search["subjectId"] === "string" ? (search["subjectId"] as string) : undefined,
    };
  },
  component: SubjectWiseStudentFlowPage,
});

export default function SubjectWiseStudentFlowPage() {
  const searchParams = useSearch({ from: "/bpharm" });
  const navigate = useNavigate();
  const { student, session, ready, isAdmin } = useStore();
  const { addToCart } = useCart();

  // Real Database Academic Data from Supabase
  const [courses, setCourses] = useState<Course[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [dbPurchases, setDbPurchases] = useState<any[]>([]);
  const [dbOrders, setDbOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search input inside Step 3
  const [searchQuery, setSearchQuery] = useState("");

  // Load Real Supabase Academic Data
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const data = await AcademicService.loadAll();
        if (isMounted) {
          setCourses(data.courses);
          setSemesters(data.semesters);
          setSubjects(data.subjects);
          setUnits(data.units);
          setMaterials(data.materials);
        }
      } catch (err) {
        console.warn("Could not load academic data:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    void loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch student's real purchases and paid orders from Supabase
  useEffect(() => {
    if (!student?.id) return;
    const currentStudentId = student.id;
    let isMounted = true;

    async function fetchStudentOwnership() {
      try {
        const { data: purs } = await supabase
          .from("purchases")
          .select("material_id, status, payment_status")
          .eq("student_id", currentStudentId);

        const { data: ords } = await supabase
          .from("orders")
          .select("material_ids, product_id, status")
          .eq("student_id", currentStudentId)
          .eq("status", "Paid");

        if (isMounted) {
          if (purs) setDbPurchases(purs);
          if (ords) setDbOrders(ords);
        }
      } catch (err) {
        console.warn("Could not fetch student purchases:", err);
      }
    }

    void fetchStudentOwnership();
    return () => {
      isMounted = false;
    };
  }, [student?.id]);

  // Current selections
  const selectedCourseId = searchParams.courseId;
  const selectedSem = searchParams.sem;
  const selectedSubjectId = searchParams.subjectId;

  // Selected Course Object
  const currentCourse = useMemo(() => {
    if (!selectedCourseId) return null;
    return (
      courses.find((c) => c.id === selectedCourseId || c.code.toLowerCase() === selectedCourseId.toLowerCase()) ||
      courses.find((c) => c.code.toLowerCase().includes("bpharm")) ||
      courses[0] ||
      null
    );
  }, [selectedCourseId, courses]);

  // Active Subject Object
  const activeSubject = useMemo(() => {
    if (!selectedSubjectId) return null;
    return subjects.find((s) => s.id === selectedSubjectId) || null;
  }, [selectedSubjectId, subjects]);

  // Authoritative check: Does student own this semester package?
  const isSemesterPurchased = (semRecord?: Semester | null, semNum?: number): boolean => {
    if (!student) return false;
    const sNum = semNum ?? semRecord?.semester_number;
    const sId = semRecord?.id;

    const directPurch = dbPurchases.some((p) => {
      const st = (p.status || "").toLowerCase();
      const paySt = ((p as any).payment_status || "").toLowerCase();
      const isPaid = st === "unlocked" || st === "paid" || st === "active" || paySt === "paid";
      if (!isPaid) return false;
      if (sId && p.material_id === sId) return true;
      if (sNum && p.material_id === `sem-${sNum}`) return true;
      return false;
    });
    if (directPurch) return true;

    const orderMatch = dbOrders.some((o) => {
      if (o.status?.toLowerCase() !== "paid") return false;
      if (o.product_type === "semester" || o.product_type === "package") {
        if (sId && o.product_id === sId) return true;
        if (sNum && (o.product_id === `sem-${sNum}` || o.product_title?.toLowerCase().includes(`semester ${sNum}`))) return true;
      }
      return false;
    });
    return orderMatch;
  };

  // Authoritative check: Does student own this subject?
  const isSubjectPurchased = (sub: SubjectItem): boolean => {
    // 1. Free subject requires no payment and unlocks all units
    if (!sub.is_premium || !sub.price || sub.price === 0) return true;
    if (!student) return false;

    // 2. Semester package purchase unlocks all subjects in this semester
    if (isSemesterPurchased(null, sub.semester)) return true;

    // 3. Direct verified purchase record in Supabase
    const directPurch = dbPurchases.find((p) => p.material_id === sub.id);
    if (directPurch) {
      const st = (directPurch.status || "").toLowerCase();
      const paySt = (directPurch.payment_status || "").toLowerCase();
      if (st === "unlocked" || st === "paid" || st === "active" || paySt === "paid" || paySt === "free") {
        return true;
      }
    }

    // 4. Paid order in Supabase
    const orderMatch = dbOrders.some((o) => {
      if (o.product_id === sub.id) return true;
      if (Array.isArray(o.material_ids) && o.material_ids.includes(sub.id)) return true;
      return false;
    });
    if (orderMatch) return true;

    return false;
  };

  // Authoritative check: Does student have access to a specific unit?
  const isUnitAccessible = (unit: UnitItem, parentSub: SubjectItem): boolean => {
    // 1. If subject is purchased or free -> all units unlocked
    if (isSubjectPurchased(parentSub)) return true;
    // 2. If unit is explicitly Free inside an unpaid subject -> accessible
    if (!unit.is_premium) return true;
    // 3. Check direct unit or material purchase
    if (student) {
      const unitPurch = dbPurchases.find((p) => p.material_id === unit.id);
      if (unitPurch) return true;
      const mat = materials.find((m) => m.unit_id === unit.id);
      if (mat) {
        const matPurch = dbPurchases.find((p) => p.material_id === mat.id);
        if (matPurch) return true;
      }
      const ordMatch = dbOrders.some((o) => {
        if (o.product_id === unit.id || (mat && o.product_id === mat.id)) return true;
        if (Array.isArray(o.material_ids) && (o.material_ids.includes(unit.id) || (mat && o.material_ids.includes(mat.id)))) return true;
        return false;
      });
      if (ordMatch) return true;
    }
    // 4. Otherwise locked
    return false;
  };

  // ────────────────────────────────────────────────────────────────────────────
  // VIEW LEVEL 4 & 5: SUBJECT DETAILS & UNIT-WISE NOTES (Unlock All After Purchase)
  // ────────────────────────────────────────────────────────────────────────────
  if (selectedSubjectId && activeSubject) {
    const isPurchased = isSubjectPurchased(activeSubject);

    // Units for this subject
    const subjectUnits = units
      .filter((u) => u.subject_id === activeSubject.id)
      .sort((a, b) => a.unit_number - b.unit_number);

    // Find linked materials for viewer navigation
    const getUnitMaterialId = (unit: UnitItem): string => {
      const directMat = materials.find((m) => m.unit_id === unit.id);
      if (directMat) return directMat.id;
      return unit.id;
    };

    return (
      <StudentLayout>
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Header & Back Button matching Reference Image Step 4 */}
          <div className="flex items-center gap-3">
            <Button
              asChild
              variant="outline"
              size="icon"
              className="size-9 rounded-xl border-slate-200"
            >
              <Link
                to="/bpharm"
                search={{ courseId: activeSubject.course_id || selectedCourseId, sem: selectedSem || activeSubject.semester || 1 } as any}
              >
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {activeSubject.name}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Code: {activeSubject.code} • Semester {selectedSem || activeSubject.semester || 1}
              </p>
            </div>
          </div>

          {/* Purchased Banner (Matching Reference Image Step 4) */}
          {isPurchased ? (
            <div className="flex items-center gap-2.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 px-4 py-3 text-xs font-bold text-emerald-800 shadow-xs">
              <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
              <span>You have purchased this subject</span>
            </div>
          ) : (
            /* Unpurchased Paid Subject Card (Matching Reference Image Step 3/Subject Card) */
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <SubjectThumbnail
                    src={activeSubject.thumbnail_url}
                    name={activeSubject.name}
                    code={activeSubject.code}
                    className="size-20 rounded-xl shrink-0"
                    fallbackSize="lg"
                  />
                  <div>

                    <h2 className="text-lg font-black text-slate-900">
                      {activeSubject.name}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Code: {activeSubject.code}
                    </p>
                    <p className="text-xs text-slate-500">
                      {currentCourse?.name || "B.Pharm"} • Semester {selectedSem || activeSubject.semester || 1}
                    </p>
                  </div>
                </div>

                <div className="text-right sm:text-right w-full sm:w-auto">
                  <div className="text-2xl font-black text-slate-900">
                    ₹{activeSubject.price || 99}
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">One-time payment</span>
                </div>
              </div>

              {/* Buy Subject Button */}
              <Button
                asChild
                size="lg"
                className="w-full h-11 rounded-xl bg-[#0e7490] hover:bg-[#0f766e] text-white font-black text-sm shadow-sm"
              >
                <Link
                  to="/checkout"
                  search={{ productId: activeSubject.id, productType: "subject" } as any}
                >
                  Buy Subject
                </Link>
              </Button>

              {/* Subjects Include List */}
              <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-700">
                <p className="font-bold text-slate-900">Subjects Include:</p>
                <div className="space-y-1.5 pl-1">
                  {subjectUnits.map((u) => (
                    <div key={u.id} className="flex items-center gap-2">
                      <Check className="size-3.5 text-teal-600 shrink-0" />
                      <span>{u.title}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 font-semibold text-teal-800">
                    <Check className="size-3.5 text-teal-600 shrink-0" />
                    <span>All Future Units (No Additional Cost)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Units List (Matching Reference Image Step 4) */}
          <div className="space-y-3">
            <h3 className="text-sm font-black text-slate-900 tracking-tight">
              Units ({subjectUnits.length})
            </h3>

            <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs divide-y divide-slate-100 overflow-hidden">
              {subjectUnits.length === 0 ? (
                <div className="p-12 text-center text-slate-400 space-y-2">
                  <BookOpen className="mx-auto size-8 text-slate-300" />
                  <p className="text-xs font-semibold text-slate-700">No units published yet</p>
                  <p className="text-[11px] text-slate-500">Curriculum notes will appear here soon.</p>
                </div>
              ) : (
                subjectUnits.map((unit) => {
                  const unlocked = isUnitAccessible(unit, activeSubject);
                  const matId = getUnitMaterialId(unit);

                  return (
                    <div
                      key={unit.id}
                      className="flex items-center justify-between p-4 hover:bg-slate-50/60 transition-colors"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 pr-4">
                        {/* Unit Number */}
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-700">
                          {unit.unit_number}
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                            {unit.title}
                          </p>
                          {unit.file_size && (
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {unit.file_size}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right badge & Action Button */}
                      <div className="flex items-center gap-3 shrink-0">
                        {!unit.is_premium ? (
                          <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                            Free
                          </span>
                        ) : unlocked ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-teal-50 px-2 py-0.5 text-xs font-bold text-teal-800 border border-teal-200">
                            <CheckCircle2 className="size-3 text-teal-600" />
                            Purchased
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800 border border-amber-200">
                            <Lock className="size-3 text-amber-600" />
                            Paid
                          </span>
                        )}

                        <div className="flex size-7 items-center justify-center rounded-lg text-slate-400">
                          <FileText className="size-4 text-slate-400" />
                        </div>

                        {unlocked ? (
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="h-8 px-4 rounded-xl text-xs font-bold border-teal-600/40 text-teal-800 hover:bg-teal-50"
                          >
                            <Link
                              to={`/viewer/${matId}` as any}
                              search={{ studentId: student?.id } as any}
                            >
                              Read
                            </Link>
                          </Button>
                        ) : (
                          <Button
                            asChild
                            size="sm"
                            className="h-8 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold gap-1.5 shadow-xs"
                          >
                            <Link
                              to="/checkout"
                              search={{ productId: activeSubject.id, productType: "subject" } as any}
                            >
                              <Lock className="size-3" />
                              <span>Unlock / Buy</span>
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </StudentLayout>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // VIEW LEVEL 3: STEP 3 - SHOW SUBJECTS IN SEMESTER (Subject Wise Sale)
  // ────────────────────────────────────────────────────────────────────────────
  if (selectedCourseId && selectedSem) {
    const semSubjects = subjects.filter(
      (s) => (s.course_id === selectedCourseId || !s.course_id) && s.semester === Number(selectedSem),
    );

    const filteredSubjects = semSubjects.filter((s) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q);
    });

    return (
      <StudentLayout>
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Breadcrumb Header */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Link to="/bpharm" className="hover:text-teal-700 transition-colors">
              Home
            </Link>
            <span>&gt;</span>
            <Link
              to="/bpharm"
              search={{ courseId: selectedCourseId } as any}
              className="hover:text-teal-700 transition-colors"
            >
              {currentCourse?.name || "B.Pharm"}
            </Link>
            <span>&gt;</span>
            <span className="text-slate-900 font-bold">Semester {selectedSem}</span>
          </div>

          {/* Title & Count Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                asChild
                variant="outline"
                size="icon"
                className="size-8 rounded-xl border-slate-200"
              >
                <Link to="/bpharm" search={{ courseId: selectedCourseId } as any}>
                  <ArrowLeft className="size-4" />
                </Link>
              </Button>
              <h1 className="text-2xl font-black text-slate-900">Semester {selectedSem}</h1>
            </div>
            <span className="text-xs font-bold text-slate-500">
              {semSubjects.length} Subjects
            </span>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search subjects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 rounded-xl border-slate-200 bg-white"
            />
          </div>

          {/* Subject Cards List (Matching Reference Image Step 3) */}
          <div className="space-y-3.5">
            {filteredSubjects.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-400 space-y-2">
                <BookOpen className="mx-auto size-9 text-slate-300" />
                <h4 className="text-sm font-bold text-slate-700">No subjects found</h4>
                <p className="text-xs text-slate-500">
                  Try another search query or select another semester.
                </p>
              </div>
            ) : (
              filteredSubjects.map((subject) => {
                const isPaid = subject.is_premium || (subject.price && subject.price > 0);
                const isPurchased = isSubjectPurchased(subject);

                return (
                  <div
                    key={subject.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs hover:border-teal-300 hover:shadow-sm transition-all gap-4"
                  >
                    <Link
                      to="/bpharm"
                      search={{ courseId: selectedCourseId, sem: selectedSem, subjectId: subject.id } as any}
                      className="flex items-center gap-4 min-w-0 flex-1 group"
                    >
                      {/* Thumbnail on Left */}
                      <SubjectThumbnail
                        src={subject.thumbnail_url}
                        name={subject.name}
                        code={subject.code}
                        className="size-16 sm:size-20 rounded-xl shrink-0"
                        fallbackSize="md"
                      />

                      <div className="min-w-0">

                        <h3 className="text-sm sm:text-base font-black text-slate-900 group-hover:text-teal-700 transition-colors line-clamp-2">
                          {subject.name}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Code: {subject.code}
                        </p>
                        {subject.units_count !== undefined && (
                          <span className="text-[11px] text-teal-800 font-semibold mt-1 inline-block">
                            {subject.units_count} Units Included
                          </span>
                        )}
                      </div>
                    </Link>

                    {/* Price & Action Button (Matching Reference Image Step 3) */}
                    <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <div>
                        {isPaid ? (
                          <span className="text-xl font-black text-slate-900">
                            ₹{subject.price || 99}
                          </span>
                        ) : (
                          <span className="rounded-md bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                            Free
                          </span>
                        )}
                      </div>

                      {isPurchased ? (
                        <Button
                          asChild
                          size="sm"
                          className="h-10 px-5 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 hover:bg-teal-100 font-bold text-xs"
                        >
                          <Link
                            to="/bpharm"
                            search={{ courseId: selectedCourseId, sem: selectedSem, subjectId: subject.id } as any}
                          >
                            Open Subject
                          </Link>
                        </Button>
                      ) : isPaid ? (
                        <Button
                          asChild
                          size="sm"
                          className="h-10 px-6 rounded-xl bg-[#0e7490] hover:bg-[#0f766e] text-white font-bold text-xs shadow-xs"
                        >
                          <Link
                            to="/checkout"
                            search={{ productId: subject.id, productType: "subject" } as any}
                          >
                            Buy Subject
                          </Link>
                        </Button>
                      ) : (
                        <Button
                          asChild
                          size="sm"
                          className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
                        >
                          <Link
                            to="/bpharm"
                            search={{ courseId: selectedCourseId, sem: selectedSem, subjectId: subject.id } as any}
                          >
                            Read Now
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </StudentLayout>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // VIEW LEVEL 2: STEP 2 - SHOW SEMESTERS OF SELECTED COURSE
  // ────────────────────────────────────────────────────────────────────────────
  if (selectedCourseId && currentCourse) {
    const courseSemesters = semesters
      .filter((s) => s.course_id === currentCourse.id)
      .sort((a, b) => a.semester_number - b.semester_number);

    // Fallback list if semesters table isn't populated for this course
    const totalSems = courseSemesters.length > 0 ? courseSemesters.length : (currentCourse.duration_years || 4) * 2;
    const semRange = Array.from({ length: totalSems }, (_, i) => i + 1);

    return (
      <StudentLayout>
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Link to="/bpharm" className="hover:text-teal-700 transition-colors">
              Home
            </Link>
            <span>&gt;</span>
            <span className="text-slate-900 font-bold">{currentCourse.name}</span>
          </div>

          {/* Header matching Reference Image Step 2 */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-slate-900">
                {currentCourse.name} ({currentCourse.duration_years} Years)
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Select Semester to view subjects
              </p>
            </div>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="rounded-xl border-slate-200 text-xs font-semibold"
            >
              <Link to="/bpharm">
                Change Course
              </Link>
            </Button>
          </div>

          {/* Semester Cards Grid (Semester-Wise Sales & Buy Now) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {semRange.map((semNum) => {
              const semSubs = subjects.filter(
                (sub) => (sub.course_id === currentCourse.id || !sub.course_id) && sub.semester === semNum,
              );
              const semRecord = courseSemesters.find((s) => s.semester_number === semNum);
              const isOwned = isSemesterPurchased(semRecord, semNum);
              const price = Number(semRecord?.price ?? currentCourse.default_semester_price ?? 399);
              const hasContent = semSubs.length > 0;

              return (
                <div
                  key={semNum}
                  className="flex flex-col justify-between p-5 rounded-2xl border border-slate-200/90 bg-white shadow-xs hover:border-teal-400 hover:shadow-sm transition-all gap-4"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-md border border-teal-200 uppercase">
                            Semester {semNum}
                          </span>
                          {isOwned && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              <CheckCircle2 className="size-3" /> Purchased
                            </span>
                          )}
                        </div>
                        <h3 className="text-base font-black text-slate-900 mt-2">
                          Semester {semNum}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5 font-medium">
                          {hasContent ? `${semSubs.length} Subjects Available` : "Content Coming Soon"}
                        </p>
                      </div>

                      {hasContent ? (
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                            Package Price
                          </span>
                          <span className="text-lg font-black text-slate-900">₹{price}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                          Coming Soon
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                    {isOwned ? (
                      <Button
                        asChild
                        size="sm"
                        className="w-full h-9 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-xs"
                      >
                        <Link
                          to="/bpharm"
                          search={{ courseId: currentCourse.id, sem: semNum } as any}
                        >
                          <span>View Semester Notes</span>
                          <ArrowRight className="size-3.5 ml-1" />
                        </Link>
                      </Button>
                    ) : hasContent ? (
                      <>
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="flex-1 h-9 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs"
                        >
                          <Link
                            to="/bpharm"
                            search={{ courseId: currentCourse.id, sem: semNum } as any}
                          >
                            View Subjects
                          </Link>
                        </Button>
                        <Button
                          asChild
                          size="sm"
                          className="flex-1 h-9 rounded-xl bg-[#0e7490] hover:bg-[#0c627b] text-white font-bold text-xs shadow-xs"
                        >
                          <Link
                            to="/checkout"
                            search={{
                              productId: semRecord?.id || `sem-${semNum}`,
                              productType: "semester",
                            } as any}
                          >
                            Buy Semester (₹{price})
                          </Link>
                        </Button>
                      </>
                    ) : (
                      <Button
                        disabled
                        variant="outline"
                        size="sm"
                        className="w-full h-9 rounded-xl bg-slate-50 border-slate-200 text-slate-400 font-semibold text-xs cursor-not-allowed"
                      >
                        Content Coming Soon
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </StudentLayout>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // VIEW LEVEL 1: STEP 1 - SELECT COURSE (Matching Reference Image Step 1)
  // ────────────────────────────────────────────────────────────────────────────
  return (
    <StudentLayout>
      <div className="mx-auto max-w-xl space-y-6 pt-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Select Course
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Choose your academic program to view semester subjects and study notes.
          </p>
        </div>

        {/* Course Cards (Matching Reference Image Step 1) */}
        <div className="space-y-3.5">
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-400">
              <Loader2 className="mx-auto size-6 animate-spin text-teal-600 mb-2" />
              Loading courses from database...
            </div>
          ) : courses.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-400">
              <GraduationCap className="mx-auto size-8 text-slate-300 mb-2" />
              <p className="text-xs font-semibold text-slate-700">No courses available</p>
            </div>
          ) : (
            courses.map((course) => (
              <Link
                key={course.id}
                to="/bpharm"
                search={{ courseId: course.id } as any}
                className="flex items-center justify-between p-5 rounded-2xl border border-slate-200/90 bg-white shadow-xs hover:border-teal-500 hover:bg-teal-50/20 hover:shadow-sm transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 border border-teal-100">
                    <GraduationCap className="size-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 group-hover:text-teal-700 transition-colors">
                      {course.name} ({course.duration_years} Years)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      PCI Syllabus • {course.total_semesters || course.duration_years * 2} Semesters
                    </p>
                  </div>
                </div>

                <ChevronRight className="size-5 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all" />
              </Link>
            ))
          )}
        </div>
      </div>
    </StudentLayout>
  );
}
