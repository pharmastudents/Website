import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { StudentLayout } from "@/components/student/StudentLayout";
import { EmptyState } from "@/components/site/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore, useSubjectMap, formatPrice } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import {
  BookOpen,
  Unlock,
  Lock,
  Bookmark,
  ShoppingBag,
  Layers,
  FileText,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Eye,
  CheckCircle2,
} from "lucide-react";
import { SubjectThumbnail } from "@/components/subject/SubjectThumbnail";


export const Route = createFileRoute("/dashboard/my-resources")({
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    tab?: string | undefined;
    sem?: number | undefined;
  } => {
    return {
      tab: typeof search["tab"] === "string" ? (search["tab"] as string) : undefined,
      sem: typeof search["sem"] === "number" ? (search["sem"] as number) : undefined,
    };
  },
  component: MyResourcesPage,
});

export default function MyResourcesPage() {
  const { student, session, ready, db, hasAccess, toggleFavorite, isFavorite } = useStore();
  const subjectMap = useSubjectMap();
  const navigate = useNavigate();
  const searchParams = useSearch({ from: "/dashboard/my-resources" });

  const [activeTab, setActiveTab] = useState<"semester" | "all" | "saved" | "purchased">(
    (searchParams.tab as any) || "semester",
  );

  const [selectedSemester, setSelectedSemester] = useState<number>(
    searchParams.sem || student?.semester || 1,
  );

  const [dbUnits, setDbUnits] = useState<any[]>([]);
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (searchParams.tab) {
      setActiveTab(searchParams.tab as any);
    }
  }, [searchParams.tab]);

  useEffect(() => {
    if (ready && !student && !session) {
      void navigate({ to: "/login" });
    }
  }, [ready, student, session, navigate]);

  const [remotePurchases, setRemotePurchases] = useState<string[]>([]);

  // Load units directly from Supabase to guarantee accurate unit mapping
  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("units")
        .select("*")
        .order("unit_number", { ascending: true });
      if (data) {
        setDbUnits(data);
      }
    })();
  }, []);

  // Fetch real-time student purchases from Supabase purchases table and paid orders
  useEffect(() => {
    if (!student?.id) return;
    void (async () => {
      try {
        const { data: purs } = await supabase
          .from("purchases")
          .select("material_id, status, payment_status")
          .eq("student_id", student.id);

        const ids: string[] = [];
        if (purs) {
          purs.forEach((p) => {
            const st = (p.status || "").toLowerCase();
            const paySt = ((p as any).payment_status || "").toLowerCase();
            if (st === "unlocked" || st === "paid" || st === "active" || paySt === "paid" || paySt === "free") {
              if (p.material_id) ids.push(String(p.material_id));
            }
          });
        }

        const { data: ords } = await supabase
          .from("orders")
          .select("material_ids, product_id, status")
          .eq("student_id", student.id)
          .eq("status", "Paid");

        if (ords) {
          ords.forEach((o) => {
            if (Array.isArray(o.material_ids)) {
              o.material_ids.forEach((mid) => ids.push(String(mid)));
            }
            if (o.product_id && o.product_id !== "cart") {
              ids.push(String(o.product_id));
            }
          });
        }

        setRemotePurchases(Array.from(new Set(ids)));
      } catch (err) {
        console.warn("Could not fetch remote purchases for my-resources:", err);
      }
    })();
  }, [student?.id]);

  if (!student) return null;

  // Unified access helper: checks local session + verified Supabase purchases
  const isUnlocked = (m: any) => {
    return hasAccess(m) || remotePurchases.includes(String(m.id));
  };

  // Unlocked materials
  const allUnlocked = db.materials.filter((m) => isUnlocked(m));

  // Saved materials
  const savedMaterials = db.materials.filter((m) =>
    db.favorites.some((f) => f.studentId === student.id && f.materialId === m.id),
  );

  // Purchased paid materials
  const purchasedMaterials = allUnlocked.filter((m) => m.isPremium || m.price > 0 || remotePurchases.includes(String(m.id)));

  // Semester subjects & materials
  const semesterSubjects = db.subjects.filter(
    (s) => s.semester === selectedSemester || s.year === Math.ceil(selectedSemester / 2),
  );

  const semesterMaterials = db.materials.filter(
    (m) => m.semester === selectedSemester || m.year === Math.ceil(selectedSemester / 2),
  );

  const semesterUnlockedCount = semesterMaterials.filter((m) => isUnlocked(m)).length;
  const isFullSemesterUnlocked =
    semesterMaterials.length > 0 && semesterUnlockedCount === semesterMaterials.length;

  // Toggle subject accordion
  const toggleSubject = (subjectId: string) => {
    setExpandedSubjects((prev) => ({
      ...prev,
      [subjectId]: prev[subjectId] === undefined ? false : !prev[subjectId],
    }));
  };

  return (
    <StudentLayout
      title="My Study Library"
      subtitle="Access your semester vault, subject-wise units, licensed notes, and bookmarks."
    >
      <div className="space-y-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
          <button
            onClick={() => setActiveTab("semester")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === "semester"
                ? "bg-teal-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Layers className="size-4" />
            <span>Semester Vault (Subject & Unit Wise)</span>
          </button>

          <button
            onClick={() => setActiveTab("all")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === "all"
                ? "bg-teal-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <BookOpen className="size-4" />
            <span>All My Notes ({allUnlocked.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("purchased")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === "purchased"
                ? "bg-teal-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <ShoppingBag className="size-4" />
            <span>Purchased ({purchasedMaterials.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("saved")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === "saved"
                ? "bg-teal-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Bookmark className="size-4" />
            <span>Saved ({savedMaterials.length})</span>
          </button>
        </div>

        {/* ──────────────────────────────────────────────────────────────────────── */}
        {/* TAB 1: SEMESTER VAULT (SUBJECT & UNIT WISE CLEAR INTERFACE)            */}
        {/* ──────────────────────────────────────────────────────────────────────── */}
        {activeTab === "semester" && (
          <div className="space-y-6">
            {/* Semester Selection Strip */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Select Academic Semester</h3>
                  <p className="text-xs text-slate-500">
                    Browse verified syllabus materials organized by Subject and Unit.
                  </p>
                </div>

                {isFullSemesterUnlocked ? (
                  <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-3 py-1">
                    <CheckCircle2 className="size-3.5 mr-1" /> Semester {selectedSemester} Plan Unlocked
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs font-semibold text-slate-600">
                    {semesterUnlockedCount} of {semesterMaterials.length} Notes Unlocked
                  </Badge>
                )}
              </div>

              {/* Semester Buttons 1 to 8 */}
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((semNum) => (
                  <button
                    key={semNum}
                    onClick={() => setSelectedSemester(semNum)}
                    className={`flex flex-col items-center justify-center rounded-xl p-2.5 text-xs font-bold transition-all border ${
                      selectedSemester === semNum
                        ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>Sem {semNum}</span>
                    <span className="text-[10px] opacity-80">
                      Year {Math.ceil(semNum / 2)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Semester Package Promo Banner if not fully unlocked */}
            {!isFullSemesterUnlocked && semesterMaterials.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50 to-emerald-50 p-5 shadow-xs">
                <div className="flex items-start gap-3.5">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-teal-600 text-white shrink-0 shadow-xs">
                    <Sparkles className="size-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900">
                      Semester {selectedSemester} Complete Study Pack
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Get instant access to all {semesterSubjects.length} subjects, all 5 PCI units, question banks, and rapid revision notes.
                    </p>
                  </div>
                </div>

                <Button
                  asChild
                  className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shrink-0 shadow-sm rounded-xl h-10 px-5"
                >
                  <Link
                    to="/checkout"
                    search={{
                      productId: `sem-${selectedSemester}-pack`,
                      productType: "semester",
                    } as any}
                  >
                    Unlock Semester {selectedSemester} (Save 50%)
                  </Link>
                </Button>
              </div>
            )}

            {/* Subject-Wise & Unit-Wise List */}
            {semesterSubjects.length === 0 ? (
              <EmptyState
                title={`No subjects found for Semester ${selectedSemester}`}
                description="Our academic team is currently curating materials for this semester."
                action={
                  <Button asChild size="sm" className="bg-teal-600 hover:bg-teal-700">
                    <Link to="/resources">Browse All Resources</Link>
                  </Button>
                }
              />
            ) : (
              <div className="space-y-4">
                {semesterSubjects.map((sub) => {
                  const isExpanded = expandedSubjects[sub.id] !== false; // Default expanded
                  const subMaterials = semesterMaterials.filter((m) => m.subjectId === sub.id);
                  const subUnlockedCount = subMaterials.filter((m) => isUnlocked(m)).length;

                  // Find units for this subject
                  const subjectUnits = dbUnits
                    .filter((u) => u.subject_id === sub.id)
                    .sort((a, b) => a.unit_number - b.unit_number);

                  // Standard 5 Units fallback if units table not yet populated
                  const displayUnits =
                    subjectUnits.length > 0
                      ? subjectUnits
                      : [1, 2, 3, 4, 5].map((num) => ({
                          id: `unit-${num}`,
                          unit_number: num,
                          title: `Unit ${num}`,
                        }));

                  return (
                    <div
                      key={sub.id}
                      className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs transition-all hover:border-slate-300"
                    >
                      {/* Subject Header */}
                      <div
                        onClick={() => toggleSubject(sub.id)}
                        className="flex items-center justify-between p-4 sm:p-5 cursor-pointer bg-slate-50/80 hover:bg-slate-100/60 transition-colors border-b border-slate-100"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            type="button"
                            className="size-7 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-600 shadow-xs shrink-0"
                            aria-label="Toggle Subject"
                          >
                            {isExpanded ? (
                              <ChevronDown className="size-4" />
                            ) : (
                              <ChevronRight className="size-4" />
                            )}
                          </button>

                          <SubjectThumbnail
                            src={(sub as any).thumbnail_url}
                            name={sub.name}
                            code={sub.code}
                            className="size-10 sm:size-11 rounded-lg shrink-0"
                            fallbackSize="sm"
                          />

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-extrabold text-slate-900 truncate">
                                {sub.name}
                              </h3>
                              {sub.code && (
                                <Badge variant="secondary" className="text-[10px] font-mono font-bold">
                                  {sub.code}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {subMaterials.length} Study Documents · {subUnlockedCount} Unlocked
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2.5 text-[11px] font-bold text-teal-700 hover:text-teal-800 hover:bg-teal-50 rounded-lg hidden sm:flex"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Link
                              to="/bpharm"
                              search={{ courseId: (sub as any).course_id || "bpharm", sem: selectedSemester, subjectId: sub.id } as any}
                            >
                              Open Subject
                            </Link>
                          </Button>

                          {subUnlockedCount === subMaterials.length && subMaterials.length > 0 ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                              <Unlock className="size-3 mr-1" /> All Unlocked
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-slate-500 font-semibold">
                              {subUnlockedCount}/{subMaterials.length} Unlocked
                            </Badge>
                          )}
                        </div>

                      </div>

                      {/* Subject Units & Files Body */}
                      {isExpanded && (
                        <div className="p-4 sm:p-5 space-y-4">
                          {displayUnits.map((unit) => {
                            // Find materials for this unit
                            const unitMats = subMaterials.filter((m) => {
                              const matUnitNum = (m as any).unitNumber ?? (m as any).unit_number;
                              const matUnitId = (m as any).unitId ?? (m as any).unit_id;
                              return (
                                matUnitId === unit.id ||
                                matUnitNum === unit.unit_number ||
                                m.title?.toLowerCase().includes(`unit ${unit.unit_number}`) ||
                                m.title?.toLowerCase().includes(`unit-${unit.unit_number}`)
                              );
                            });

                            return (
                              <div
                                key={unit.id}
                                className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 sm:p-4"
                              >
                                {/* Unit Title Strip */}
                                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60">
                                  <div className="flex items-center gap-2">
                                    <span className="flex size-5 items-center justify-center rounded-md bg-teal-100 text-teal-800 text-[10px] font-black">
                                      U{unit.unit_number}
                                    </span>
                                    <h4 className="text-xs font-bold text-slate-800">
                                      {unit.title || `Unit ${unit.unit_number}`}
                                    </h4>
                                  </div>
                                  <span className="text-[11px] text-slate-400 font-medium">
                                    {unitMats.length} {unitMats.length === 1 ? "file" : "files"}
                                  </span>
                                </div>

                                {/* Unit Material Files List */}
                                {unitMats.length === 0 ? (
                                  <p className="text-xs text-slate-400 italic py-1 pl-1">
                                    No notes uploaded for this unit yet.
                                  </p>
                                ) : (
                                  <div className="space-y-2">
                                    {unitMats.map((material) => {
                                      const isOwned = isUnlocked(material);

                                      return (
                                        <div
                                          key={material.id}
                                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-slate-200/80 bg-white p-3 transition-all hover:border-teal-300 hover:shadow-xs"
                                        >
                                          <div className="flex items-start gap-3 min-w-0">
                                            <div className="flex size-9 items-center justify-center rounded-lg bg-teal-50 text-teal-700 shrink-0 border border-teal-100">
                                              <FileText className="size-4" />
                                            </div>
                                            <div className="min-w-0">
                                              <div className="flex items-center gap-2 flex-wrap">
                                                <h5 className="text-xs font-bold text-slate-900 truncate max-w-sm">
                                                  {material.title}
                                                </h5>
                                                {isOwned ? (
                                                  <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold py-0 h-4">
                                                    <Unlock className="size-2.5 mr-0.5" /> Licensed
                                                  </Badge>
                                                ) : (
                                                  <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-bold py-0 h-4">
                                                    <Lock className="size-2.5 mr-0.5" /> Premium ({formatPrice(material.price)})
                                                  </Badge>
                                                )}
                                              </div>
                                              <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                                                <span>{material.type || "Unit Notes"}</span>
                                                {material.pages && <span>· {material.pages} Pages</span>}
                                                {material.fileSize && <span>· {material.fileSize}</span>}
                                              </div>
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                            {isOwned ? (
                                              <Button
                                                asChild
                                                size="sm"
                                                className="h-8 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-xs"
                                              >
                                                <Link
                                                  to="/viewer/$studentId/$materialId"
                                                  params={{
                                                    studentId: student.id,
                                                    materialId: material.id,
                                                  }}
                                                >
                                                  <Eye className="size-3.5 mr-1" /> Open Reader
                                                </Link>
                                              </Button>
                                            ) : (
                                              <Button
                                                asChild
                                                size="sm"
                                                variant="outline"
                                                className="h-8 text-xs font-bold border-teal-600 text-teal-700 hover:bg-teal-50 rounded-lg"
                                              >
                                                <Link
                                                  to="/checkout"
                                                  search={{
                                                    productId: material.id,
                                                    productType: "material",
                                                  } as any}
                                                >
                                                  Unlock Note ({formatPrice(material.price)})
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
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────────────────── */}
        {/* TAB 2, 3, 4: GRID LIST FOR ALL / SAVED / PURCHASED                      */}
        {/* ──────────────────────────────────────────────────────────────────────── */}
        {activeTab !== "semester" && (
          <div>
            {(activeTab === "all" ? allUnlocked : activeTab === "saved" ? savedMaterials : purchasedMaterials).length === 0 ? (
              <EmptyState
                title={
                  activeTab === "saved"
                    ? "No saved notes yet"
                    : activeTab === "purchased"
                      ? "No purchased notes yet"
                      : "No unlocked study materials yet"
                }
                description={
                  activeTab === "saved"
                    ? "Click the bookmark icon on any note to save it for quick revision."
                    : "Explore our repository or packages to unlock complete semester notes and question banks."
                }
                action={
                  <Button asChild className="mt-4 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold">
                    <Link to="/resources">
                      <BookOpen className="mr-1.5 size-4" /> Browse Notes
                    </Link>
                  </Button>
                }
              />
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {(activeTab === "all" ? allUnlocked : activeTab === "saved" ? savedMaterials : purchasedMaterials).map((material) => {
                  const subject = subjectMap.get(material.subjectId);
                  const favorited = isFavorite(material.id);

                  return (
                    <div
                      key={material.id}
                      className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs flex flex-col justify-between transition-all hover:border-teal-300 hover:shadow-sm"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                            <Unlock className="mr-1 size-3" /> Licensed Access
                          </Badge>
                          <button
                            type="button"
                            onClick={() => toggleFavorite(material.id)}
                            className={`p-1 rounded-md transition-colors ${
                              favorited
                                ? "text-rose-500 hover:bg-rose-50"
                                : "text-slate-400 hover:text-rose-500 hover:bg-slate-50"
                            }`}
                            aria-label="Save note"
                          >
                            <Bookmark className={`size-4 ${favorited ? "fill-rose-500 text-rose-500" : ""}`} />
                          </button>
                        </div>

                        <h3 className="mt-3 text-sm font-bold text-slate-900 line-clamp-2">
                          {material.title}
                        </h3>
                        <p className="mt-1 text-xs font-semibold text-teal-700">
                          {subject?.name}
                        </p>
                        {material.description && (
                          <p className="mt-2 text-xs text-slate-500 line-clamp-2">
                            {material.description}
                          </p>
                        )}

                        <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-400">
                          <BookOpen className="size-3.5" />
                          <span>Year {material.year} · Semester {material.semester}</span>
                          {material.pages && <span>· {material.pages} pages</span>}
                        </div>
                      </div>

                      <div className="mt-5 border-t border-slate-100 pt-4">
                        <Button asChild size="sm" className="w-full h-8 text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white rounded-xl shadow-xs">
                          <Link
                            to="/viewer/$studentId/$materialId"
                            params={{ studentId: student.id, materialId: material.id }}
                          >
                            <BookOpen className="mr-1.5 size-4" /> Open in Protected Reader
                          </Link>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
