import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { StudentLayout } from "@/components/student/StudentLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore, formatPrice } from "@/lib/store";
import { Sparkles, CheckCircle2, ArrowRight, BookOpen, Layers, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/student/combos")({
  component: CombosPage,
});

export default function CombosPage() {
  const { db, student } = useStore();
  const [filterType, setFilterType] = useState<"all" | "semester" | "year">("all");

  const packages = db.packages.filter((p) => {
    if (filterType === "all") return true;
    return p.type === filterType;
  });

  return (
    <StudentLayout
      title="Combos & Bundles"
      subtitle="Unlock entire semesters or full academic years with huge discount packages."
    >
      <div className="space-y-8">
        {/* Top Banner */}
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-background p-6 sm:p-8">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 px-3 py-1 text-xs font-bold text-primary">
              <Sparkles className="size-3.5" /> High-Value Student Bundles
            </span>
            <h2 className="mt-3 text-2xl font-extrabold text-foreground sm:text-3xl">
              Save up to 40% with Complete Packages
            </h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Why buy individual subject notes separately? Get all semester subjects, question banks, and rapid revision sheets bundled in a single 1-click purchase.
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 border-b border-border pb-4">
          <button
            onClick={() => setFilterType("all")}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
              filterType === "all"
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-muted-foreground hover:bg-muted"
            }`}
          >
            All Packages ({db.packages.length})
          </button>
          <button
            onClick={() => setFilterType("semester")}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
              filterType === "semester"
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-muted-foreground hover:bg-muted"
            }`}
          >
            Semester Packages (₹999)
          </button>
          <button
            onClick={() => setFilterType("year")}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
              filterType === "year"
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-muted-foreground hover:bg-muted"
            }`}
          >
            Full Year Annual Bundles (₹2,499)
          </button>
        </div>

        {/* Packages Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => {
            const includedSubjects = db.subjects.filter((s) => pkg.subjectIds.includes(s.id));

            return (
              <div
                key={pkg.id}
                className="relative flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-xs transition-all hover:border-primary/40 hover:shadow-md"
              >
                {pkg.badge && (
                  <div className="absolute right-4 top-4">
                    <Badge className="bg-primary text-primary-foreground font-bold text-[10px]">
                      {pkg.badge}
                    </Badge>
                  </div>
                )}

                <div>
                  <span className="text-xs font-bold text-primary uppercase">
                    Year {pkg.year} {pkg.semester ? `· Semester ${pkg.semester}` : "· Full Year"}
                  </span>
                  <h3 className="mt-2 text-lg font-bold text-foreground">{pkg.name}</h3>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    {pkg.description}
                  </p>

                  {/* Included Subjects List */}
                  <div className="mt-5 border-t border-border pt-4">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase">
                      Subjects Included ({includedSubjects.length}):
                    </p>
                    <ul className="mt-2.5 space-y-1.5 text-xs text-foreground">
                      {includedSubjects.map((s) => (
                        <li key={s.id} className="flex items-center gap-2">
                          <CheckCircle2 className="size-3.5 text-primary shrink-0" />
                          <span className="truncate">{s.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Price & Buy Action */}
                <div className="mt-6 border-t border-border pt-4">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-xl font-black text-foreground">
                        {formatPrice(pkg.offerPrice)}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground line-through">
                        {formatPrice(pkg.originalPrice)}
                      </span>
                    </div>
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-600">
                      Save {pkg.savingsPercent}%
                    </span>
                  </div>

                  <Button asChild className="mt-4 w-full" size="lg">
                    <Link
                      to="/checkout"
                      search={{ productId: pkg.id, productType: pkg.type } as any}
                    >
                      Buy Package <ArrowRight className="ml-2 size-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </StudentLayout>
  );
}
