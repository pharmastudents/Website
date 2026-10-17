import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { StudentLayout } from "@/components/student/StudentLayout";
import { ResourceCard } from "@/components/site/ResourceCard";
import { EmptyState } from "@/components/site/EmptyState";
import { Input } from "@/components/ui/input";
import { useStore, useSubjectMap, YEARS } from "@/lib/store";
import { MATERIAL_TYPES, type MaterialType } from "@/lib/types";
import { Search, Filter, BookOpen } from "lucide-react";

export const Route = createFileRoute("/resources/")({
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    subjectId?: string | undefined;
    year?: number | undefined;
    q?: string | undefined;
  } => {
    return {
      subjectId: typeof search["subjectId"] === "string" ? (search["subjectId"] as string) : undefined,
      year: typeof search["year"] === "number" ? (search["year"] as number) : undefined,
      q: typeof search["q"] === "string" ? (search["q"] as string) : undefined,
    };
  },
  component: ResourcesPage,
});

export default function ResourcesPage() {
  const { db, student, session, ready } = useStore();
  const subjectMap = useSubjectMap();
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

  const [query, setQuery] = useState(searchParams.q || "");
  const [selectedYear, setSelectedYear] = useState<string>(
    searchParams.year ? String(searchParams.year) : "all",
  );
  const [selectedSubject, setSelectedSubject] = useState<string>(
    searchParams.subjectId ?? "all",
  );
  const [selectedType, setSelectedType] = useState<string>("all");
  const [pricingFilter, setPricingFilter] = useState<"all" | "free" | "premium">("all");

  const filteredMaterials = useMemo(() => {
    return db.materials.filter((m) => {
      if (!m.published) return false;
      if (selectedYear !== "all" && m.year !== Number(selectedYear)) return false;
      if (selectedSubject !== "all" && m.subjectId !== selectedSubject) return false;
      if (selectedType !== "all" && m.type !== selectedType) return false;
      if (pricingFilter === "free" && m.isPremium) return false;
      if (pricingFilter === "premium" && !m.isPremium) return false;

      if (query.trim()) {
        const q = query.toLowerCase();
        const subject = subjectMap.get(m.subjectId);
        const matchTitle = m.title.toLowerCase().includes(q);
        const matchDesc = m.description.toLowerCase().includes(q);
        const matchSub = subject?.name.toLowerCase().includes(q) ?? false;
        const matchTopics = m.topics.some((t) => t.toLowerCase().includes(q));
        if (!matchTitle && !matchDesc && !matchSub && !matchTopics) return false;
      }

      return true;
    });
  }, [
    db.materials,
    selectedYear,
    selectedSubject,
    selectedType,
    pricingFilter,
    query,
    subjectMap,
  ]);

  if (!ready || !student) return null;

  return (
    <StudentLayout
      title="B.Pharm Resources & Study Notes"
      subtitle="Search through complete semester notes, rapid revision sheets, question banks, and formulas aligned with the Pharmacy Council of India curriculum."
    >
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Search & Filters */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
          <div className="grid gap-4 md:grid-cols-4">
            {/* Search Input */}
            <div className="relative md:col-span-2">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by topic, keyword, or title..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Year Filter */}
            <div>
              <select
                aria-label="Filter by Year"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus:outline-hidden focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Years</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    Year {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject Filter */}
            <div>
              <select
                aria-label="Filter by Subject"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus:outline-hidden focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Subjects</option>
                {db.subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (Y{s.year}-S{s.semester})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Filters Row */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4">
            {/* Type buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs font-semibold text-muted-foreground">Type:</span>
              <button
                onClick={() => setSelectedType("all")}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  selectedType === "all"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                All Types
              </button>
              {MATERIAL_TYPES.slice(0, 5).map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    selectedType === type
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* Pricing pills */}
            <div className="flex items-center gap-1.5">
              <span className="mr-1 text-xs font-semibold text-muted-foreground">Access:</span>
              <button
                onClick={() => setPricingFilter("all")}
                className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                  pricingFilter === "all"
                    ? "bg-foreground text-background"
                    : "border border-border text-muted-foreground"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setPricingFilter("free")}
                className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                  pricingFilter === "free"
                    ? "bg-success text-success-foreground"
                    : "border border-border text-muted-foreground"
                }`}
              >
                Free
              </button>
              <button
                onClick={() => setPricingFilter("premium")}
                className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                  pricingFilter === "premium"
                    ? "bg-premium text-premium-foreground"
                    : "border border-border text-muted-foreground"
                }`}
              >
                Premium
              </button>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing <strong>{filteredMaterials.length}</strong> resources
          </span>
          {(selectedYear !== "all" ||
            selectedSubject !== "all" ||
            selectedType !== "all" ||
            pricingFilter !== "all" ||
            query) && (
            <button
              onClick={() => {
                setSelectedYear("all");
                setSelectedSubject("all");
                setSelectedType("all");
                setPricingFilter("all");
                setQuery("");
              }}
              className="text-primary hover:underline"
            >
              Reset all filters
            </button>
          )}
        </div>

        {/* Resources Grid */}
        {filteredMaterials.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              title="No study materials found"
              description="Try adjusting your filters, search term, or selecting a different academic year."
            />
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredMaterials.map((material) => (
              <ResourceCard
                key={material.id}
                material={material}
                subject={subjectMap.get(material.subjectId)}
              />
            ))}
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
