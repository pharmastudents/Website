import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore, formatPrice } from "@/lib/store";
import { Sparkles, CheckCircle2, ArrowRight, BookOpen, Layers, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/packages")({
  component: PackagesPublicPage,
});

export default function PackagesPublicPage() {
  const { db } = useStore();
  const [filterType, setFilterType] = useState<"all" | "semester" | "year">("all");

  const packages = db.packages.filter((p) => {
    if (filterType === "all") return true;
    return p.type === filterType;
  });

  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Special Discount Bundles"
        title="B.Pharm Complete Packages & Combos"
        description="Unlock entire semesters or full academic years with huge discount packages. High-yield unit notes, formulas, and solved university papers."
      />

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        {/* Top Feature Banner */}
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-background p-6 sm:p-8">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 px-3 py-1 text-xs font-bold text-primary">
              <Sparkles className="size-3.5" /> High-Value Student Bundles
            </span>
            <h2 className="mt-3 text-2xl font-extrabold text-foreground sm:text-3xl">
              Save up to 40% with Complete Packages
            </h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Why purchase individual subject notes separately? Get all semester subjects, question banks, and rapid revision sheets bundled in a single 1-click purchase.
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="mt-8 flex gap-2 border-b border-border pb-4">
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
            Semester Bundles
          </button>
          <button
            onClick={() => setFilterType("year")}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
              filterType === "year"
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-muted-foreground hover:bg-muted"
            }`}
          >
            Annual Bundles
          </button>
        </div>

        {/* Package Grid */}
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="font-bold">
                    {pkg.type === "year" ? `Year ${pkg.year}` : `Semester ${pkg.semester}`}
                  </Badge>
                  {pkg.badge && (
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                      {pkg.badge}
                    </span>
                  )}
                </div>

                <h3 className="mt-4 text-lg font-bold text-foreground">{pkg.name}</h3>
                <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                  {pkg.description}
                </p>

                <div className="mt-6 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-foreground">
                    {formatPrice(pkg.offerPrice)}
                  </span>
                  {pkg.originalPrice > pkg.offerPrice && (
                    <span className="text-sm text-muted-foreground line-through">
                      {formatPrice(pkg.originalPrice)}
                    </span>
                  )}
                </div>

                <div className="mt-6 space-y-2.5 border-t border-border pt-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="size-4 shrink-0 text-primary" />
                    <span>Includes {pkg.materialIds.length} verified subject master notes</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="size-4 shrink-0 text-primary" />
                    <span>Save {pkg.savingsPercent}% compared to individual purchase</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="size-4 shrink-0 text-primary" />
                    <span>Immediate digital access on web & mobile</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-border">
                <Button asChild className="w-full font-bold">
                  <Link to="/checkout" search={{ productId: pkg.id, productType: pkg.type }}>
                    Get Bundle Access <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SiteLayout>
  );
}
