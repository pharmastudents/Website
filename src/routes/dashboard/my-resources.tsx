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
    (searchParams.tab as any) || "purchased",
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
    if (!m.isPremium && Number(m.price || 0) === 0) return true;
    const subId = m.subjectId || (m as any).subject_id;
    return (
      hasAccess(m) ||
      remotePurchases.includes(String(m.id)) ||
      (Boolean(subId) && remotePurchases.includes(String(subId)))
    );
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
      subtitle="Access licensed notes, and bookmarks."
    >
      <div className="space-y-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
          {/* <button
            onClick={() => setActiveTab("semester")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === "semester"
                ? "bg-teal-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Layers className="size-4" />
            <span>Semester Vault (Subject & Unit Wise)</span>
          </button> */}



          <button
            onClick={() => setActiveTab("purchased")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${activeTab === "purchased"
              ? "bg-teal-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
              }`}
          >
            <ShoppingBag className="size-4" />
            <span>Purchased ({purchasedMaterials.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("saved")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${activeTab === "saved"
              ? "bg-teal-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
              }`}
          >
            <Bookmark className="size-4" />
            <span>Saved ({savedMaterials.length})</span>
          </button>
        </div>


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
                            className={`p-1 rounded-md transition-colors ${favorited
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
