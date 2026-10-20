import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore, formatPrice } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import {
  Sparkles,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  Layers,
  ShieldCheck,
  Check,
  GraduationCap,
  Star,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/packages")({
  component: PackagesPublicPage,
});

interface SemesterPackage {
  id: string;
  title: string;
  description: string;
  semester: number;
  year: number;
  price: number;
  original_price: number;
  badge?: string | null;
  subjects?: string[];
  is_active: boolean;
}

// PCI Standard curriculum subjects fallback if semester has not yet populated custom subjects
const FALLBACK_SEMESTER_SUBJECTS: Record<number, string[]> = {
  1: [
    "Human Anatomy and Physiology I",
    "Pharmaceutical Analysis I",
    "Pharmaceutics I",
    "Pharmaceutical Inorganic Chemistry",
    "Communication Skills / Remedial",
  ],
  2: [
    "Human Anatomy and Physiology II",
    "Pharmaceutical Organic Chemistry I",
    "Biochemistry",
    "Pathophysiology",
    "Computer Applications in Pharmacy",
  ],
  3: [
    "Pharmaceutical Organic Chemistry II",
    "Physical Pharmaceutics I",
    "Pharmaceutical Microbiology",
    "Pharmaceutical Engineering",
  ],
  4: [
    "Pharmaceutical Organic Chemistry III",
    "Medicinal Chemistry I",
    "Physical Pharmaceutics II",
    "Pharmacology I",
    "Pharmacognosy and Phytochemistry I",
  ],
  5: [
    "Medicinal Chemistry II",
    "Industrial Pharmacy I",
    "Pharmacology II",
    "Pharmacognosy and Phytochemistry II",
    "Pharmaceutical Jurisprudence",
  ],
  6: [
    "Medicinal Chemistry III",
    "Pharmacology III",
    "Herbal Drug Technology",
    "Biopharmaceutics and Pharmacokinetics",
    "Pharmaceutical Biotechnology",
    "Quality Assurance",
  ],
  7: [
    "Instrumental Methods of Analysis",
    "Industrial Pharmacy II",
    "Pharmacy Practice",
    "Novel Drug Delivery System (NDDS)",
  ],
  8: [
    "Biostatistics and Research Methodology",
    "Social and Preventive Pharmacy",
    "Pharmaceutical Marketing Management",
    "Pharmacovigilance",
  ],
};

const SEMESTER_HIGHLIGHT_BADGES: Record<number, { text: string; bg: string }> = {
  1: { text: "🔥 Most Popular", bg: "bg-amber-500/10 text-amber-700 border-amber-300" },
  2: { text: "⭐ Best Value", bg: "bg-teal-500/10 text-teal-700 border-teal-300" },
  3: { text: "💎 PCI Aligned", bg: "bg-indigo-500/10 text-indigo-700 border-indigo-300" },
  4: { text: "🎯 Core Tech", bg: "bg-blue-500/10 text-blue-700 border-blue-300" },
  5: { text: "📚 High Yield", bg: "bg-emerald-500/10 text-emerald-700 border-emerald-300" },
  6: { text: "🚀 Clinical Focus", bg: "bg-purple-500/10 text-purple-700 border-purple-300" },
  7: { text: "⚡ Industry Prep", bg: "bg-rose-500/10 text-rose-700 border-rose-300" },
  8: { text: "🏆 Final Semester", bg: "bg-amber-500/10 text-amber-700 border-amber-300" },
};

export default function PackagesPublicPage() {
  const { student } = useStore();
  const [selectedYearFilter, setSelectedYearFilter] = useState<number | "all">("all");

  const [dbPackages, setDbPackages] = useState<SemesterPackage[]>([]);
  const [dbSubjectsBySem, setDbSubjectsBySem] = useState<Record<number, string[]>>({});
  const [dbPurchases, setDbPurchases] = useState<any[]>([]);
  const [dbOrders, setDbOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Fetch live semester packages and subjects from Supabase
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);

        const [pkgRes, subRes] = await Promise.all([
          supabase
            .from("packages")
            .select("id, title, description, semester, year, price, original_price, is_active, badge")
            .eq("is_active", true)
            .order("semester", { ascending: true }),
          supabase
            .from("subjects")
            .select("id, name, semester, is_active")
            .eq("is_active", true)
            .order("semester", { ascending: true }),
        ]);

        if (isMounted) {
          // Map subjects by semester
          const subMap: Record<number, string[]> = {};
          (subRes.data || []).forEach((s: any) => {
            const semNum = Number(s.semester || 1);
            subMap[semNum] = subMap[semNum] || [];
            subMap[semNum].push(s.name);
          });
          setDbSubjectsBySem(subMap);

          if (pkgRes.data && pkgRes.data.length > 0) {
            const mappedPkgs: SemesterPackage[] = pkgRes.data.map((p: any) => ({
              id: p.id,
              title: p.title || `Semester ${p.semester} Complete Study Pack`,
              description:
                p.description ||
                `Get instant access to all subjects, units, question banks, and rapid revision notes for Semester ${p.semester}.`,
              semester: Number(p.semester || 1),
              year: Number(p.year || Math.ceil((p.semester || 1) / 2)),
              price: Number(p.price || 349),
              original_price: Number(p.original_price || 799),
              badge: p.badge || null,
              is_active: p.is_active ?? true,
            }));
            // Sort by semester 1 through 8
            mappedPkgs.sort((a, b) => a.semester - b.semester);
            setDbPackages(mappedPkgs);
          } else {
            // Fallback generation for 8 semesters
            const generated: SemesterPackage[] = [1, 2, 3, 4, 5, 6, 7, 8].map((sem) => ({
              id: `pkg-sem-${sem}`,
              title: `Semester ${sem} Complete Study Pack`,
              description: `Unlock all theory notes, question banks, and rapid revision notes for Semester ${sem}.`,
              semester: sem,
              year: Math.ceil(sem / 2),
              price: 349,
              original_price: 799,
              is_active: true,
            }));
            setDbPackages(generated);
          }
        }
      } catch (err) {
        console.warn("Could not load packages from database:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch logged-in student's purchases and paid orders
  useEffect(() => {
    if (!student?.id) return;
    const currentStudentId = student.id;
    let isMounted = true;

    async function loadStudentOwnership() {
      try {
        const [purRes, ordRes] = await Promise.all([
          supabase
            .from("purchases")
            .select("material_id, status, payment_status")
            .eq("student_id", currentStudentId),
          supabase
            .from("orders")
            .select("id, product_id, product_type, product_title, material_ids, status")
            .eq("student_id", currentStudentId)
            .eq("status", "Paid"),
        ]);

        if (isMounted) {
          if (purRes.data) setDbPurchases(purRes.data);
          if (ordRes.data) setDbOrders(ordRes.data);
        }
      } catch (err) {
        console.warn("Could not load student ownership for packages:", err);
      }
    }

    void loadStudentOwnership();
    return () => {
      isMounted = false;
    };
  }, [student?.id]);

  // Check if student owns a semester package
  const isSemesterPurchased = (pkg: SemesterPackage): boolean => {
    if (!student) return false;
    const semNum = pkg.semester;

    // Direct purchase record
    const hasPur = dbPurchases.some(
      (p) =>
        p.material_id === pkg.id ||
        p.material_id === `sem-${semNum}` ||
        p.material_id === `pkg-sem-${semNum}`,
    );
    if (hasPur) return true;

    // Paid order record
    const hasOrd = dbOrders.some((o) => {
      if (o.product_id === pkg.id || o.product_id === `sem-${semNum}` || o.product_id === `pkg-sem-${semNum}`) {
        return true;
      }
      if (
        (o.product_type === "semester" || o.product_type === "package") &&
        o.product_title?.toLowerCase().includes(`semester ${semNum}`)
      ) {
        return true;
      }
      return false;
    });

    return hasOrd;
  };

  // Filter packages by Year
  const filteredPackages = useMemo(() => {
    if (selectedYearFilter === "all") return dbPackages;
    return dbPackages.filter((p) => p.year === selectedYearFilter);
  }, [dbPackages, selectedYearFilter]);

  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Semester-Wise All-Access Bundles"
        title="B.Pharm Semester Study Packages"
        description="Select your semester to unlock all core subjects, unit notes, question banks, and rapid revision sheets in a single all-inclusive bundle."
      />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 space-y-8">
        
        {/* Top Feature Banner */}
        <div className="rounded-3xl border border-teal-500/20 bg-gradient-to-br from-teal-900 via-teal-800 to-slate-900 p-6 sm:p-10 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10 max-w-2xl space-y-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-md px-3.5 py-1 text-xs font-bold text-teal-200 border border-white/10">
              <Sparkles className="size-3.5 text-teal-300" />
              <span>Full Semester Unlocked in 1-Click</span>
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Semester-Wise Study Packages
            </h2>
            <p className="text-xs sm:text-sm text-teal-100/80 leading-relaxed">
              Why purchase subjects individually? Each semester package grants instant, lifetime digital access to all subjects, complete unit notes (Units 1 - 5), and exam revision notes for that entire semester.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-6 text-xs font-semibold text-teal-200 border-t border-white/10 pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-400" />
              <span>All Core Semester Subjects</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-400" />
              <span>Units 1 to 5 Comprehensive Notes</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-400" />
              <span>PCI Standard Syllabus Aligned</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-400" />
              <span>Mobile Protected Reader Access</span>
            </div>
          </div>
        </div>

        {/* Academic Year Filter Pills */}
        <div className="flex items-center justify-between gap-4 flex-wrap border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedYearFilter("all")}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all shrink-0 ${
                selectedYearFilter === "all"
                  ? "bg-[#0d9488] text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95"
              }`}
            >
              All Semesters (8)
            </button>
            <button
              onClick={() => setSelectedYearFilter(1)}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all shrink-0 ${
                selectedYearFilter === 1
                  ? "bg-[#0d9488] text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95"
              }`}
            >
              Year 1 (Sem 1 & 2)
            </button>
            <button
              onClick={() => setSelectedYearFilter(2)}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all shrink-0 ${
                selectedYearFilter === 2
                  ? "bg-[#0d9488] text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95"
              }`}
            >
              Year 2 (Sem 3 & 4)
            </button>
            <button
              onClick={() => setSelectedYearFilter(3)}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all shrink-0 ${
                selectedYearFilter === 3
                  ? "bg-[#0d9488] text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95"
              }`}
            >
              Year 3 (Sem 5 & 6)
            </button>
            <button
              onClick={() => setSelectedYearFilter(4)}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all shrink-0 ${
                selectedYearFilter === 4
                  ? "bg-[#0d9488] text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95"
              }`}
            >
              Year 4 (Sem 7 & 8)
            </button>
          </div>

          <span className="text-xs text-slate-500 font-semibold">
            Showing <strong>{filteredPackages.length}</strong> Semester Plans
          </span>
        </div>

        {/* ── SEMESTER PLANS GRID ── */}
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredPackages.map((pkg) => {
            const isOwned = isSemesterPurchased(pkg);
            const semSubjects =
              (dbSubjectsBySem[pkg.semester] && dbSubjectsBySem[pkg.semester].length > 0)
                ? dbSubjectsBySem[pkg.semester]
                : (FALLBACK_SEMESTER_SUBJECTS[pkg.semester] || []);
            const badgeMeta = SEMESTER_HIGHLIGHT_BADGES[pkg.semester] || {
              text: `Semester ${pkg.semester}`,
              bg: "bg-teal-500/10 text-teal-700 border-teal-300",
            };
            const savingsPercent =
              pkg.original_price > pkg.price
                ? Math.round(((pkg.original_price - pkg.price) / pkg.original_price) * 100)
                : 50;

            return (
              <div
                key={pkg.id}
                className={`relative flex flex-col justify-between rounded-3xl border bg-white p-5 sm:p-6 shadow-xs transition-all hover:shadow-lg ${
                  isOwned
                    ? "border-emerald-300 ring-2 ring-emerald-400/20"
                    : "border-slate-200/90 hover:border-teal-300"
                }`}
              >
                <div>
                  {/* Top Badge & Semester pill */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700">
                      Semester {pkg.semester}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${badgeMeta.bg}`}
                    >
                      {badgeMeta.text}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="mt-4 text-lg font-black text-slate-900 leading-snug">
                    {pkg.title}
                  </h3>
                  <p className="mt-1.5 text-xs text-slate-500 leading-relaxed line-clamp-2">
                    {pkg.description}
                  </p>

                  {/* Pricing row */}
                  <div className="mt-5 flex items-baseline gap-2.5 border-t border-slate-100 pt-4">
                    <span className="text-3xl font-black text-slate-900">
                      ₹{pkg.price}
                    </span>
                    {pkg.original_price > pkg.price && (
                      <span className="text-sm font-semibold text-slate-400 line-through">
                        ₹{pkg.original_price}
                      </span>
                    )}
                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                      {savingsPercent}% OFF
                    </span>
                  </div>

                  {/* Included Subjects List */}
                  <div className="mt-5 space-y-2 border-t border-slate-100 pt-4">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                      <span>Subjects Included ({semSubjects.length}):</span>
                    </div>

                    <ul className="space-y-1.5 pl-0.5">
                      {semSubjects.slice(0, 5).map((subName, sIdx) => (
                        <li key={sIdx} className="flex items-start gap-2 text-xs text-slate-600">
                          <Check className="size-3.5 text-teal-600 shrink-0 mt-0.5" />
                          <span className="line-clamp-1">{subName}</span>
                        </li>
                      ))}
                      {semSubjects.length > 5 && (
                        <li className="text-[11px] text-teal-800 font-bold pl-5">
                          + {semSubjects.length - 5} more subjects included
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* Package Features Guarantee */}
                  <div className="mt-5 space-y-2 border-t border-slate-100 pt-3.5 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-3.5 text-teal-600 shrink-0" />
                      <span>Units 1 to 5 Complete Theory Notes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-3.5 text-teal-600 shrink-0" />
                      <span>Solved Question Banks & Formulas</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-3.5 text-teal-600 shrink-0" />
                      <span>Immediate Digital Protected Access</span>
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <div className="mt-6 pt-4 border-t border-slate-100">
                  {isOwned ? (
                    <Button
                      asChild
                      className="w-full h-11 rounded-xl bg-teal-50 border border-teal-300 text-teal-900 hover:bg-teal-100 font-bold text-xs shadow-xs"
                    >
                      <Link to="/bpharm" search={{ sem: pkg.semester } as any}>
                        <CheckCircle2 className="mr-1.5 size-4 text-teal-700" />
                        <span>Access Semester Notes</span>
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      asChild
                      className="w-full h-11 rounded-xl bg-[#0d9488] hover:bg-[#0f766e] text-white font-bold text-xs shadow-md transition-all active:scale-98"
                    >
                      <Link
                        to="/checkout"
                        search={{
                          productId: pkg.id,
                          productType: "semester",
                        } as any}
                      >
                        <span>Get Semester {pkg.semester} Pack</span>
                        <ArrowRight className="ml-1.5 size-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Trust Guarantee */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6 text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-teal-800 font-bold text-sm">
            <ShieldCheck className="size-5 text-teal-600" />
            <span>PharmaStudents.com Digital Academic Vault Guarantee</span>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl mx-auto">
            All semester packs include verified notes authored by top pharmacy rank holders, strictly following Pharmacy Council of India (PCI) syllabus regulations. Payments are processed securely with SSL encryption.
          </p>
        </div>

      </div>
    </SiteLayout>
  );
}
