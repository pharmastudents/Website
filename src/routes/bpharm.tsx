import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { StudentLayout } from "@/components/student/StudentLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore, formatPrice } from "@/lib/store";
import { useCart } from "@/lib/cartContext";
import { AcademicService, type Course, type Semester, type SubjectItem, type MaterialItem } from "@/lib/academicService";
import { supabase } from "@/integrations/supabase/client";
import {
  BookOpen,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Package,
  Layers,
  FileText,
  CheckCircle2,
  Lock,
  Unlock,
  ShoppingCart,
  Check,
  ChevronRight,
  GraduationCap,
  Download,
  Eye,
} from "lucide-react";

export const Route = createFileRoute("/bpharm")({
  validateSearch: (search: Record<string, unknown>): {
    courseId?: string | undefined;
    year?: number | undefined;
    sem?: number | undefined;
    subjectId?: string | undefined;
    unit?: number | undefined;
  } => {
    return {
      courseId: typeof search["courseId"] === "string" ? (search["courseId"] as string) : undefined,
      year: typeof search["year"] === "number" ? (search["year"] as number) : undefined,
      sem: typeof search["sem"] === "number" ? (search["sem"] as number) : undefined,
      subjectId: typeof search["subjectId"] === "string" ? (search["subjectId"] as string) : undefined,
      unit: typeof search["unit"] === "number" ? (search["unit"] as number) : undefined,
    };
  },
  component: BPharmBrowsePage,
});

export default function BPharmBrowsePage() {
  const searchParams = useSearch({ from: "/bpharm" });
  const navigate = useNavigate();
  const { student, session, ready, db, hasAccess } = useStore();
  const { addToCart, isInCart } = useCart();

  // Protect student browsing route
  useEffect(() => {
    if (ready && !session && !student) {
      void navigate({
        to: "/login",
        search: { redirect: window.location.pathname + window.location.search } as any,
      });
    }
  }, [ready, session, student, navigate]);

  // Real Database Academic Data
  const [courses, setCourses] = useState<Course[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [dbPurchases, setDbPurchases] = useState<any[]>([]);
  const [dbOrders, setDbOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const data = await AcademicService.loadAll();
        if (isMounted) {
          setCourses(data.courses);
          setSemesters(data.semesters);
          setSubjects(data.subjects);
          setMaterials(data.materials);
        }
      } catch (e) {
        console.warn("Could not load academic data:", e);
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
    let isMounted = true;
    async function fetchStudentOwnership() {
      try {
        const { data: purs } = await supabase
          .from("purchases")
          .select("material_id, status, payment_status")
          .eq("student_id", student.id);

        const { data: ords } = await supabase
          .from("orders")
          .select("material_ids, product_id, status")
          .eq("student_id", student.id)
          .eq("status", "Paid");

        if (isMounted) {
          if (purs) setDbPurchases(purs);
          if (ords) setDbOrders(ords);
        }
      } catch (err) {
        console.warn("Could not fetch student purchases in bpharm:", err);
      }
    }
    void fetchStudentOwnership();
    return () => {
      isMounted = false;
    };
  }, [student?.id]);

  // Selected state from URL query params
  const selectedCourseCode = searchParams.courseId || "bpharm";
  const selectedSem = searchParams.sem;
  const selectedSubjectId = searchParams.subjectId;
  const selectedUnit = searchParams.unit ?? 0; // 0 = All units

  // Active Subject when in Subject View (Step 4)
  const activeSubject = useMemo(() => {
    if (!selectedSubjectId) return null;
    return subjects.find((s) => s.id === selectedSubjectId) || db.subjects.find((s) => s.id === selectedSubjectId);
  }, [selectedSubjectId, subjects, db.subjects]);

  // Materials for the Active Subject
  const subjectMaterials = useMemo(() => {
    if (!selectedSubjectId) return [];
    const dbFiltered = materials.filter((m) => m.subject_id === selectedSubjectId && m.status === "Published");
    if (dbFiltered.length > 0) return dbFiltered;
    // Fallback to local store
    return db.materials.filter((m) => m.subjectId === selectedSubjectId && m.published);
  }, [selectedSubjectId, materials, db.materials]);

  // Check if student owns material
  const checkOwned = (matId: string, isPremium: boolean, price: number) => {
    if (!isPremium || price === 0) return true;
    if (!student) return false;

    // 1. Direct verified purchase in Supabase
    const directPurch = dbPurchases.find((p) => p.material_id === matId);
    if (directPurch) {
      const st = (directPurch.status || "").toLowerCase();
      const paySt = (directPurch.payment_status || "").toLowerCase();
      if (st === "unlocked" || st === "paid" || st === "active" || paySt === "paid" || paySt === "free") {
        return true;
      }
    }

    // 2. Verified package or semester order in Supabase
    const orderMatch = dbOrders.some((o) => {
      if (o.product_id === matId) return true;
      if (Array.isArray(o.material_ids) && o.material_ids.includes(matId)) return true;
      return false;
    });
    if (orderMatch) return true;

    // 3. Fallback to store
    const storeMat = db.materials.find((m) => m.id === matId);
    return Boolean(storeMat && hasAccess(storeMat));
  };

  // ────────────────────────────────────────────────────────────────────────────
  // VIEW LEVEL 3: STEP 4 - SUBJECT MATERIALS (Unit-wise Notes, View Details, Add to Cart, Buy Now)
  // ────────────────────────────────────────────────────────────────────────────
  if (selectedSubjectId && activeSubject) {
    const units = [
      { id: 0, label: `All (${subjectMaterials.length})` },
      { id: 1, label: "Unit 1" },
      { id: 2, label: "Unit 2" },
      { id: 3, label: "Unit 3" },
      { id: 4, label: "Unit 4" },
      { id: 5, label: "Unit 5" },
    ];

    const filteredMaterials = subjectMaterials.filter((m) => {
      if (selectedUnit === 0) return true;
      const uNum = (m as any).unit_number ?? (m as any).unitNumber ?? 1;
      return uNum === selectedUnit;
    });

    return (
      <StudentLayout>
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Header & Back Button */}
          <div className="flex items-center gap-3">
            <Button
              asChild
              variant="outline"
              size="icon"
              className="size-9 rounded-xl border-slate-200"
            >
              <Link to="/bpharm" search={{ sem: selectedSem || activeSubject.semester || 1 } as any}>
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                {activeSubject.name} {activeSubject.code ? `(${activeSubject.code})` : ""}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                B.Pharm • Semester {selectedSem || activeSubject.semester || 1} • PCI Syllabus Units
              </p>
            </div>
          </div>

          {/* Unit Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {units.map((u) => (
              <button
                key={u.id}
                onClick={() =>
                  void navigate({
                    to: "/bpharm",
                    search: { sem: selectedSem, subjectId: selectedSubjectId, unit: u.id } as any,
                  })
                }
                className={`rounded-xl px-4 py-2 text-xs font-bold whitespace-nowrap transition-all ${
                  selectedUnit === u.id
                    ? "bg-[#0e7490] text-white shadow-xs"
                    : "border border-border/80 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {u.label}
              </button>
            ))}
          </div>

          {/* Unit Notes List */}
          <div className="space-y-4">
            {filteredMaterials.length === 0 ? (
              <div className="rounded-3xl border border-border bg-white p-12 text-center">
                <BookOpen className="mx-auto size-10 text-slate-300" />
                <h3 className="mt-3 text-sm font-bold text-slate-900">No notes available for this unit</h3>
                <p className="text-xs text-slate-500 mt-1">Check other units or return to all modules.</p>
              </div>
            ) : (
              filteredMaterials.map((mat, idx) => {
                const price = Number(mat.price || 49);
                const isPaid = (mat as any).is_premium ?? (mat as any).isPremium ?? (price > 0);
                const owned = checkOwned(mat.id, isPaid, price);
                const inCart = isInCart(mat.id);
                const unitNum = (mat as any).unit_number ?? (mat as any).unitNumber ?? (idx + 1);

                return (
                  <div
                    key={mat.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs transition-all hover:border-teal-200 gap-4"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 border border-teal-100">
                        <FileText className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900 truncate">
                            Unit {unitNum} - {mat.title}
                          </h3>
                          <Badge
                            className={`text-[9px] font-bold px-1.5 py-0 rounded-md ${
                              isPaid
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}
                          >
                            {isPaid ? "Paid" : "Free"}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          PDF • {(mat as any).file_size ? `${(mat as any).file_size}` : "2.4 MB"} • {(mat as any).pages || 45} pages
                        </p>
                        {mat.description && (
                          <p className="text-xs text-slate-600 mt-1 line-clamp-1">{mat.description}</p>
                        )}
                      </div>
                    </div>

                    {/* Price & Actions */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      {isPaid && (
                        <div className="text-right sm:mr-2">
                          <span className="text-base font-black text-slate-900">{formatPrice(price)}</span>
                        </div>
                      )}

                      {owned ? (
                        <Button
                          asChild
                          size="sm"
                          className="h-9 px-4 text-xs font-bold rounded-xl bg-teal-700 hover:bg-teal-800 text-white shadow-xs"
                        >
                          <Link
                            to="/viewer/$studentId/$materialId"
                            params={{ studentId: student?.id || "demo", materialId: mat.id }}
                          >
                            <Eye className="mr-1.5 size-3.5" /> Read Now
                          </Link>
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="h-9 px-3 text-xs font-bold rounded-xl border-slate-200 hover:bg-slate-50"
                          >
                            <Link to="/resources/$materialId" params={{ materialId: mat.id }}>
                              View Details
                            </Link>
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              addToCart({
                                id: mat.id,
                                type: "material",
                                title: mat.title,
                                subtitle: activeSubject.name,
                                code: activeSubject.code,
                                price: price,
                                pages: (mat as any).pages || 45,
                                semester: selectedSem || activeSubject.semester || 1,
                              })
                            }
                            className={`h-9 px-3.5 text-xs font-bold rounded-xl border-teal-200 text-teal-700 hover:bg-teal-50 ${
                              inCart ? "bg-teal-50 border-teal-400" : ""
                            }`}
                          >
                            <ShoppingCart className="mr-1.5 size-3.5" />
                            {inCart ? "In Cart" : "Add to Cart"}
                          </Button>

                          <Button
                            asChild
                            size="sm"
                            className="h-9 px-4 text-xs font-bold rounded-xl bg-[#0e7490] hover:bg-[#0c627b] text-white shadow-xs"
                          >
                            <Link to="/checkout" search={{ productId: mat.id, productType: "material" } as any}>
                              Buy Now
                            </Link>
                          </Button>
                        </div>
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
  // VIEW LEVEL 2: STEP 3 - SEMESTER DETAILS (Package + Individual Subjects)
  // ────────────────────────────────────────────────────────────────────────────
  if (selectedSem) {
    const semNum = Number(selectedSem);
    const subjectsInSem = subjects.filter(
      (s) => Number(s.semester_number || s.semester || 1) === semNum,
    );
    const semCombo = db.packages.find((p) => p.semester === semNum);
    const semMaterialsCount = materials.filter(
      (m) => Number(m.semester || 1) === semNum,
    ).length || 45;

    return (
      <StudentLayout>
        <div className="mx-auto max-w-4xl space-y-7">
          {/* Back to Semesters Button */}
          <div className="flex items-center gap-3">
            <Button
              asChild
              variant="outline"
              size="icon"
              className="size-9 rounded-xl border-slate-200"
            >
              <Link to="/bpharm" search={{ courseId: selectedCourseCode } as any}>
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                B.Pharm - Semester {semNum}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Complete semester curriculum, complete combo packages, and unit-wise subject notes.
              </p>
            </div>
          </div>

          {/* 1. SEMESTER PACKAGE CARD (Matching Image 3 Step 3) */}
          <div className="rounded-3xl border border-teal-200/80 bg-linear-to-br from-teal-50/70 via-white to-emerald-50/40 p-6 sm:p-8 shadow-xs relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-md">
                  <GraduationCap className="size-8" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-black text-slate-900">
                      Semester {semNum} Package
                    </h2>
                    <Badge className="bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5">
                      Popular
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    {subjectsInSem.length || 7} Subjects • {semMaterialsCount} Materials
                  </p>

                  <div className="mt-3 flex items-baseline gap-2.5">
                    <span className="text-2xl sm:text-3xl font-black text-teal-800">
                      {formatPrice(semCombo?.offerPrice || 799)}
                    </span>
                    <span className="text-sm text-slate-400 line-through font-semibold">
                      {formatPrice(semCombo?.originalPrice || 1200)}
                    </span>
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs font-black">
                      33% OFF
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Package Actions */}
              <div className="flex flex-col sm:items-end gap-2.5 pt-2 sm:pt-0">
                <Button
                  asChild
                  size="lg"
                  className="h-11 px-6 rounded-xl bg-[#0e7490] hover:bg-[#0c627b] text-white font-bold shadow-xs gap-2"
                >
                  <Link
                    to="/checkout"
                    search={{
                      productId: semCombo?.id || `package-sem-${semNum}`,
                      productType: "semester",
                    } as any}
                  >
                    <span>Buy Complete Semester</span>
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    addToCart({
                      id: semCombo?.id || `package-sem-${semNum}`,
                      type: "semester",
                      title: `Semester ${semNum} Package (B.Pharm)`,
                      subtitle: `${subjectsInSem.length || 7} Subjects • All Study Notes`,
                      price: semCombo?.offerPrice || 799,
                      originalPrice: semCombo?.originalPrice || 1200,
                      semester: semNum,
                    })
                  }
                  className="h-9 px-4 text-xs font-bold rounded-xl border-teal-300 text-teal-800 hover:bg-teal-100/50 gap-1.5"
                >
                  <ShoppingCart className="size-3.5" />
                  <span>{isInCart(semCombo?.id || `package-sem-${semNum}`) ? "In Cart" : "Add to Cart"}</span>
                </Button>
              </div>
            </div>

            {/* Checklist of what is included */}
            <div className="mt-6 pt-5 border-t border-teal-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-semibold text-slate-700">
              <div className="flex items-center gap-2">
                <Check className="size-4 text-teal-600 shrink-0 stroke-[2.5]" />
                <span>All subjects notes</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="size-4 text-teal-600 shrink-0 stroke-[2.5]" />
                <span>Unit-wise materials</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="size-4 text-teal-600 shrink-0 stroke-[2.5]" />
                <span>Previous year questions</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="size-4 text-teal-600 shrink-0 stroke-[2.5]" />
                <span>Study guides & summaries</span>
              </div>
            </div>
          </div>

          {/* 2. SUBJECTS LIST */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                Subjects in Semester {semNum} ({subjectsInSem.length})
              </h2>
              <span className="text-xs text-slate-500">Choose individual subjects to study or buy</span>
            </div>

            <div className="space-y-3.5">
              {subjectsInSem.map((subject) => {
                const subNotes = materials.filter(
                  (m) => m.subject_id === subject.id && m.status === "Published",
                );
                const subPrice = 149;
                const inCart = isInCart(subject.id);

                return (
                  <div
                    key={subject.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs transition-all hover:border-teal-200 gap-4"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-teal-700 font-black text-xs">
                        {subject.code?.slice(0, 5) || "PCI"}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 truncate">
                          {subject.name}
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {subject.code || "BP101T"} • {subNotes.length || 5} Materials
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <span className="text-base font-black text-slate-900 sm:mr-3">
                        {formatPrice(subPrice)}
                      </span>

                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="h-9 px-3.5 text-xs font-bold rounded-xl border-slate-200 hover:bg-slate-50"
                      >
                        <Link
                          to="/bpharm"
                          search={{ sem: semNum, subjectId: subject.id } as any}
                        >
                          View Details
                        </Link>
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        onClick={() =>
                          addToCart({
                            id: subject.id,
                            type: "subject",
                            title: subject.name,
                            subtitle: `Semester ${semNum} Subject Notes`,
                            code: subject.code,
                            price: subPrice,
                            semester: semNum,
                          })
                        }
                        className={`h-9 px-3.5 text-xs font-bold rounded-xl bg-[#0e7490] hover:bg-[#0c627b] text-white shadow-xs gap-1.5 ${
                          inCart ? "bg-teal-800" : ""
                        }`}
                      >
                        <ShoppingCart className="size-3.5" />
                        <span>{inCart ? "In Cart" : "Add to Cart"}</span>
                      </Button>
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

  // ────────────────────────────────────────────────────────────────────────────
  // VIEW LEVEL 1: STEP 2 - SEMESTER SELECTION (All 8 Semesters with Pricing)
  // ────────────────────────────────────────────────────────────────────────────
  const semList = [
    { sem: 1, subjects: 7, materials: 45, price: 799, originalPrice: 1200 },
    { sem: 2, subjects: 8, materials: 52, price: 799, originalPrice: 1200 },
    { sem: 3, subjects: 8, materials: 50, price: 899, originalPrice: 1300 },
    { sem: 4, subjects: 8, materials: 48, price: 899, originalPrice: 1300 },
    { sem: 5, subjects: 8, materials: 46, price: 999, originalPrice: 1500 },
    { sem: 6, subjects: 8, materials: 44, price: 999, originalPrice: 1500 },
    { sem: 7, subjects: 7, materials: 42, price: 999, originalPrice: 1500 },
    { sem: 8, subjects: 7, materials: 40, price: 999, originalPrice: 1500 },
  ];

  return (
    <StudentLayout>
      <div className="mx-auto max-w-4xl space-y-7">
        {/* Course Header with Course Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">B.Pharm Curriculum</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Choose your semester to view subject syllabi, unit notes, and complete packages.
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl">
            <button
              onClick={() => void navigate({ to: "/bpharm", search: { courseId: "bpharm" } as any })}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedCourseCode === "bpharm" ? "bg-white text-teal-800 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              B.Pharm (8 Sem)
            </button>
            <button
              onClick={() => void navigate({ to: "/bpharm", search: { courseId: "dpharm" } as any })}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedCourseCode === "dpharm" ? "bg-white text-teal-800 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              D.Pharm (2 Sem)
            </button>
            <button
              onClick={() => void navigate({ to: "/bpharm", search: { courseId: "mpharm" } as any })}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedCourseCode === "mpharm" ? "bg-white text-teal-800 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              M.Pharm (4 Sem)
            </button>
          </div>
        </div>

        {/* Semesters Cards List (Matching Image 3 Step 2) */}
        <div className="space-y-3.5">
          {semList.map((item) => (
            <div
              key={item.sem}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:border-teal-300 hover:shadow-sm gap-4"
            >
              <Link
                to="/bpharm"
                search={{ sem: item.sem } as any}
                className="flex items-center gap-4 min-w-0 flex-1 group"
              >
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 font-black text-sm">
                  S{item.sem}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-black text-slate-900 group-hover:text-teal-700 transition-colors">
                    Semester {item.sem}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {item.subjects} Subjects • {item.materials} Materials
                  </p>
                </div>
              </Link>

              <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                <div className="text-right">
                  <span className="text-base font-black text-slate-900">{formatPrice(item.price)}</span>
                  <span className="text-xs text-slate-400 line-through block font-medium">
                    {formatPrice(item.originalPrice)}
                  </span>
                </div>

                <Button
                  asChild
                  size="sm"
                  className="h-9 px-4 rounded-xl bg-[#0e7490] hover:bg-[#0c627b] text-white font-bold shadow-xs gap-1.5"
                >
                  <Link to="/bpharm" search={{ sem: item.sem } as any}>
                    <span>Buy Semester</span>
                    <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </StudentLayout>
  );
}
