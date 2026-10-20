import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { StudentLayout } from "@/components/student/StudentLayout";
import { SubjectThumbnail } from "@/components/subject/SubjectThumbnail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import { AcademicService, type SubjectItem, type UnitItem } from "@/lib/academicService";
import { supabase } from "@/integrations/supabase/client";
import {
  Search,
  BookOpen,
  CheckCircle2,
  Lock,
  ArrowRight,
  Filter,
  X,
  Layers,
  GraduationCap,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/resources/")({
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    subjectId?: string | undefined;
    year?: number | undefined;
    sem?: number | undefined;
    q?: string | undefined;
  } => {
    return {
      subjectId: typeof search["subjectId"] === "string" ? (search["subjectId"] as string) : undefined,
      year: typeof search["year"] === "number" ? (search["year"] as number) : undefined,
      sem: typeof search["sem"] === "number" ? (search["sem"] as number) : undefined,
      q: typeof search["q"] === "string" ? (search["q"] as string) : undefined,
    };
  },
  component: ResourcesPage,
});

export default function ResourcesPage() {
  const { db, student, session, ready } = useStore();
  const searchParams = useSearch({ from: "/resources/" });
  const navigate = useNavigate();

  // Route protection
  useEffect(() => {
    if (ready && !session && !student) {
      void navigate({
        to: "/login",
        search: { redirect: window.location.pathname + window.location.search } as any,
      });
    }
  }, [ready, session, student, navigate]);

  // Real Database Academic Data
  const [dbSubjects, setDbSubjects] = useState<SubjectItem[]>([]);
  const [dbUnits, setDbUnits] = useState<UnitItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Student purchases and orders from Supabase
  const [dbPurchases, setDbPurchases] = useState<any[]>([]);
  const [dbOrders, setDbOrders] = useState<any[]>([]);

  // Filter states
  const [searchQuery, setSearchQuery] = useState(searchParams.q || "");
  const [selectedSem, setSelectedSem] = useState<number | "all">(
    searchParams.sem ? Number(searchParams.sem) : "all",
  );
  const [pricingFilter, setPricingFilter] = useState<"all" | "free" | "premium" | "purchased">("all");

  // Load authoritative academic data directly from Supabase
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const data = await AcademicService.loadAll();
        if (isMounted) {
          setDbSubjects(data.subjects);
          setDbUnits(data.units);
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
          .select("material_ids, product_id, status, product_title")
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

  // Combined subjects list (fallback to store if database still loading)
  const allSubjects = useMemo(() => {
    if (dbSubjects.length > 0) return dbSubjects;
    return (db.subjects || []).map((s) => ({
      id: s.id,
      course_id: (s as any).courseId || (s as any).course_id || "bpharm",
      semester_id: (s as any).semesterId || (s as any).semester_id || "",
      semester_number: s.semester || 1,
      semester: s.semester || 1,
      year: s.year || Math.ceil((s.semester || 1) / 2),
      name: s.name,
      code: s.code || "",
      description: s.description || "",
      is_active: true,
      display_order: 1,
      units_count: dbUnits.filter((u) => u.subject_id === s.id).length || 5,
      price: (s as any).price ? Number((s as any).price) : 79,
      is_premium: (s as any).is_premium ?? (s as any).isPremium ?? true,
      thumbnail_url: (s as any).thumbnail_url || (s as any).thumbnailUrl || null,
    }));
  }, [dbSubjects, db.subjects, dbUnits]);

  // Authoritative check: Does student own this subject?
  const isSubjectPurchased = (sub: SubjectItem): boolean => {
    // 1. Free subject requires no payment and unlocks all units
    if (!sub.is_premium || !sub.price || sub.price === 0) return true;
    if (!student) return false;

    // 2. Direct verified purchase record in Supabase
    const directPurch = dbPurchases.find((p) => p.material_id === sub.id);
    if (directPurch) {
      const st = (directPurch.status || "").toLowerCase();
      const paySt = (directPurch.payment_status || "").toLowerCase();
      if (st === "unlocked" || st === "paid" || st === "active" || paySt === "paid" || paySt === "free") {
        return true;
      }
    }

    // 3. Paid order in Supabase
    const orderMatch = dbOrders.some((o) => {
      if (o.product_id === sub.id) return true;
      if (Array.isArray(o.material_ids) && o.material_ids.includes(sub.id)) return true;
      return false;
    });
    if (orderMatch) return true;

    // 4. Semester package purchase unlocks all subjects in that semester
    const semNum = sub.semester || sub.semester_number || 1;
    const semPurch = dbPurchases.some(
      (p) =>
        p.material_id === `sem-${semNum}` ||
        (sub.semester_id && p.material_id === sub.semester_id && ((p.status || "").toLowerCase() === "unlocked" || (p.status || "").toLowerCase() === "paid")),
    );
    if (semPurch) return true;

    const semOrder = dbOrders.some(
      (o) =>
        (o.product_type === "semester" || o.product_type === "package") &&
        ((sub.semester_id && o.product_id === sub.semester_id) || o.product_title?.toLowerCase().includes(`semester ${semNum}`)),
    );
    if (semOrder) return true;

    return false;
  };

  // Filtered Subjects list
  const filteredSubjects = useMemo(() => {
    return allSubjects.filter((sub) => {
      if (!sub.is_active) return false;

      // Semester filter
      if (selectedSem !== "all" && Number(sub.semester || sub.semester_number) !== Number(selectedSem)) {
        return false;
      }

      // Pricing / Access filter
      const isPaid = sub.is_premium && Number(sub.price || 0) > 0;
      const isPurchased = isSubjectPurchased(sub);

      if (pricingFilter === "free" && isPaid) return false;
      if (pricingFilter === "premium" && !isPaid) return false;
      if (pricingFilter === "purchased" && !isPurchased) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = sub.name.toLowerCase().includes(q);
        const matchCode = (sub.code || "").toLowerCase().includes(q);
        const matchDesc = (sub.description || "").toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchDesc) return false;
      }

      return true;
    });
  }, [allSubjects, selectedSem, pricingFilter, searchQuery, dbPurchases, dbOrders, student]);

  // Total purchased count for badge/filter
  const purchasedCount = useMemo(() => {
    return allSubjects.filter((s) => isSubjectPurchased(s)).length;
  }, [allSubjects, dbPurchases, dbOrders, student]);

  const hasActiveFilters = selectedSem !== "all" || pricingFilter !== "all" || searchQuery.trim().length > 0;

  const resetFilters = () => {
    setSelectedSem("all");
    setPricingFilter("all");
    setSearchQuery("");
  };

  if (!ready || !student) return null;

  return (
    <StudentLayout
      title="B.Pharm Subject Notes & Resources"
      subtitle="Select your subject to access unit-wise theory notes, formulas, question banks, and exam revision guides."
    >
      <div className="mx-auto max-w-6xl space-y-5 px-1 sm:px-0">
        
        {/* ── HEADER BANNER & MOBILE STATS ── */}
        <div className="rounded-3xl border border-teal-500/20 bg-gradient-to-br from-teal-900 via-teal-800 to-slate-900 p-5 sm:p-7 text-white shadow-md relative overflow-hidden">
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-xl">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-md px-3 py-1 text-[11px] font-bold text-teal-200 border border-white/10">
                <GraduationCap className="size-3.5" />
                <span>PCI Syllabus Standard Curriculum</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                All B.Pharm Subjects
              </h2>
              <p className="text-xs sm:text-sm text-teal-100/80 leading-relaxed">
                Browse complete semester subjects. Each subject includes unit notes, downloadable revision guides, and practice questions.
              </p>
            </div>

            {/* Quick stats badge */}
            <div className="flex items-center gap-2.5 sm:gap-3 bg-white/10 backdrop-blur-md p-2.5 rounded-2xl border border-white/15 shrink-0 self-stretch sm:self-auto justify-around">
              <div className="text-center px-2">
                <span className="block text-base sm:text-lg font-black text-white">{allSubjects.length}</span>
                <span className="text-[10px] uppercase font-bold text-teal-200">Total Subjects</span>
              </div>
              <div className="h-8 w-px bg-white/20" />
              <div className="text-center px-2">
                <span className="block text-base sm:text-lg font-black text-emerald-300">{purchasedCount}</span>
                <span className="text-[10px] uppercase font-bold text-teal-200">Unlocked</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── MOBILE-OPTIMIZED FILTER CONTROLS ── */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs space-y-4">
          
          {/* Top Search Bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by subject name or code (e.g. Inorganic Chemistry, BP101T)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-9 h-11 text-xs sm:text-sm rounded-xl border-slate-200 bg-slate-50/60 focus:bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Horizontally Scrollable Semester Pills (Touch Friendly on Mobile) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-0.5">
              <span className="flex items-center gap-1.5">
                <Layers className="size-3.5 text-teal-600" />
                <span>Filter by Semester:</span>
              </span>
              {selectedSem !== "all" && (
                <button
                  onClick={() => setSelectedSem("all")}
                  className="text-xs text-teal-700 font-bold hover:underline"
                >
                  View All
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-none -mx-1 px-1 sm:mx-0 sm:px-0">
              <button
                onClick={() => setSelectedSem("all")}
                className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                  selectedSem === "all"
                    ? "bg-[#0d9488] text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95"
                }`}
              >
                All Semesters
              </button>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                <button
                  key={sem}
                  onClick={() => setSelectedSem(sem)}
                  className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                    selectedSem === sem
                      ? "bg-[#0d9488] text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95"
                  }`}
                >
                  Sem {sem}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Access Badges (All / Free / Premium / Unlocked) */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mr-1">
                Access:
              </span>
              <button
                onClick={() => setPricingFilter("all")}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                  pricingFilter === "all"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setPricingFilter("free")}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                  pricingFilter === "free"
                    ? "bg-emerald-600 text-white"
                    : "bg-emerald-50 text-emerald-800 border border-emerald-200/80 hover:bg-emerald-100"
                }`}
              >
                Free
              </button>
              <button
                onClick={() => setPricingFilter("premium")}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                  pricingFilter === "premium"
                    ? "bg-teal-700 text-white"
                    : "bg-teal-50 text-teal-800 border border-teal-200/80 hover:bg-teal-100"
                }`}
              >
                Premium
              </button>
              {purchasedCount > 0 && (
                <button
                  onClick={() => setPricingFilter("purchased")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors inline-flex items-center gap-1 ${
                    pricingFilter === "purchased"
                      ? "bg-teal-800 text-white"
                      : "bg-teal-50 text-teal-800 border border-teal-300 hover:bg-teal-100"
                  }`}
                >
                  <CheckCircle2 className="size-3" />
                  <span>My Purchased ({purchasedCount})</span>
                </button>
              )}
            </div>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="text-xs text-slate-500 hover:text-teal-700 font-bold inline-flex items-center gap-1"
              >
                <X className="size-3" />
                <span>Reset filters</span>
              </button>
            )}
          </div>
        </div>

        {/* ── RESULTS BAR ── */}
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
          <span>
            Showing <strong className="text-slate-800">{filteredSubjects.length}</strong> subjects
            {selectedSem !== "all" ? ` for Semester ${selectedSem}` : " across all semesters"}
          </span>
          {loading && <span className="text-teal-600 animate-pulse text-[11px]">Updating library...</span>}
        </div>

        {/* ── SUBJECT CARDS GRID (MOBILE-FIRST) ── */}
        {filteredSubjects.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 sm:p-14 text-center space-y-3">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <BookOpen className="size-7 text-slate-400" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No subjects found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              We couldn't find any subjects matching your current search or filter criteria. Try clearing the search query or selecting another semester.
            </p>
            {hasActiveFilters && (
              <div className="pt-2">
                <Button
                  onClick={resetFilters}
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-slate-200 font-bold text-xs"
                >
                  Reset All Filters
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-3.5 sm:gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {filteredSubjects.map((subject) => {
              const isPaid = subject.is_premium || (subject.price && Number(subject.price) > 0);
              const isPurchased = isSubjectPurchased(subject);
              const semNumber = subject.semester || subject.semester_number || 1;
              const displayPrice = Number(subject.price || 79);
              const unitsCount = subject.units_count ?? 5;

              return (
                <div
                  key={subject.id}
                  className="group rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs hover:border-teal-300 hover:shadow-md transition-all flex flex-col justify-between gap-4"
                >
                  {/* Card Header & Metadata */}
                  <div className="space-y-3">
                    <div className="flex items-start gap-3.5">
                      {/* Subject Thumbnail on Left */}
                      <Link
                        to="/bpharm"
                        search={{
                          courseId: subject.course_id || "bpharm",
                          sem: semNumber,
                          subjectId: subject.id,
                        } as any}
                        className="shrink-0 transition-transform active:scale-95"
                      >
                        <SubjectThumbnail
                          src={subject.thumbnail_url}
                          name={subject.name}
                          code={subject.code}
                          className="size-16 sm:size-18 rounded-xl shrink-0 shadow-xs"
                          fallbackSize="md"
                        />
                      </Link>

                      {/* Title & Codes */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-600">
                            {subject.code || `BP${semNumber}01T`}
                          </span>
                          <span className="rounded-md bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-800 border border-teal-200/50">
                            Sem {semNumber}
                          </span>
                        </div>

                        <Link
                          to="/bpharm"
                          search={{
                            courseId: subject.course_id || "bpharm",
                            sem: semNumber,
                            subjectId: subject.id,
                          } as any}
                          className="block mt-1 group-hover:text-teal-700 transition-colors"
                        >
                          <h3 className="text-sm sm:text-base font-black text-slate-900 leading-snug line-clamp-2" title={subject.name}>
                            {subject.name}
                          </h3>
                        </Link>
                      </div>
                    </div>

                    {/* Features snippet */}
                    <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2.5">
                      <span className="font-semibold text-slate-600 flex items-center gap-1">
                        <BookOpen className="size-3.5 text-teal-600" />
                        <span>{unitsCount} Units Complete Notes</span>
                      </span>

                      {/* Status / Price Tag */}
                      <div>
                        {isPurchased ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-teal-50 px-2.5 py-0.5 text-xs font-bold text-teal-800 border border-teal-200">
                            <CheckCircle2 className="size-3 text-teal-600" />
                            Purchased
                          </span>
                        ) : isPaid ? (
                          <span className="text-lg font-black text-slate-900">
                            ₹{displayPrice}
                          </span>
                        ) : (
                          <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                            Free
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons (Full width on Mobile) */}
                  <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                    {isPurchased ? (
                      <Button
                        asChild
                        size="sm"
                        className="w-full h-10 rounded-xl bg-teal-50 border border-teal-300 text-teal-900 hover:bg-teal-100 font-bold text-xs transition-all shadow-xs"
                      >
                        <Link
                          to="/bpharm"
                          search={{
                            courseId: subject.course_id || "bpharm",
                            sem: semNumber,
                            subjectId: subject.id,
                          } as any}
                        >
                          <span>Open Subject Notes</span>
                          <ArrowRight className="ml-1.5 size-3.5" />
                        </Link>
                      </Button>
                    ) : isPaid ? (
                      <>
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="flex-1 h-10 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs"
                        >
                          <Link
                            to="/bpharm"
                            search={{
                              courseId: subject.course_id || "bpharm",
                              sem: semNumber,
                              subjectId: subject.id,
                            } as any}
                          >
                            View Units
                          </Link>
                        </Button>
                        <Button
                          asChild
                          size="sm"
                          className="flex-1 h-10 rounded-xl bg-[#0e7490] hover:bg-[#0f766e] text-white font-bold text-xs shadow-xs"
                        >
                          <Link
                            to="/checkout"
                            search={{
                              productId: subject.id,
                              productType: "subject",
                            } as any}
                          >
                            Buy ₹{displayPrice}
                          </Link>
                        </Button>
                      </>
                    ) : (
                      <Button
                        asChild
                        size="sm"
                        className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
                      >
                        <Link
                          to="/bpharm"
                          search={{
                            courseId: subject.course_id || "bpharm",
                            sem: semNumber,
                            subjectId: subject.id,
                          } as any}
                        >
                          <span>Read Free Notes</span>
                          <ArrowRight className="ml-1.5 size-3.5" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </StudentLayout>
  );
}
