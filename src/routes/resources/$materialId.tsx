import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore, formatPrice } from "@/lib/store";
import { useCart } from "@/lib/cartContext";
import {
  Lock,
  Unlock,
  BookOpen,
  ArrowLeft,
  Heart,
  Share2,
  CheckCircle2,
  FileText,
  ShieldCheck,
  Eye,
  GraduationCap,
  ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/resources/$materialId")({
  component: MaterialDetailPage,
});

export default function MaterialDetailPage() {
  const { materialId } = Route.useParams();
  const navigate = useNavigate();
  const {
    db,
    student,
    session,
    ready,
    hasAccess,
    toggleFavorite,
    isFavorite,
    trackView,
  } = useStore();
  const { addToCart, isInCart } = useCart();

  // Authentication guard
  useEffect(() => {
    if (ready && !session && !student) {
      void navigate({
        to: "/login",
        search: { redirect: window.location.pathname } as any,
      });
    }
  }, [ready, session, student, navigate]);

  const material = db.materials.find((m) => m.id === materialId);
  const subject = material ? db.subjects.find((s) => s.id === material.subjectId) : undefined;
  const owned = material ? hasAccess(material) : false;
  const favorite = material ? isFavorite(material.id) : false;
  const inCart = material ? isInCart(material.id) : false;

  useEffect(() => {
    if (material) {
      trackView(material.id);
    }
  }, [material, trackView]);

  if (!material) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-4xl px-4 py-20 text-center">
          <h1 className="text-2xl font-bold">Resource Not Found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The study material you are trying to view does not exist or has been removed.
          </p>
          <Button asChild className="mt-6">
            <Link to="/resources">Back to Resources</Link>
          </Button>
        </div>
      </SiteLayout>
    );
  }

  const handleShare = () => {
    if (navigator.share) {
      void navigator.share({
        title: material.title,
        text: material.description,
        url: window.location.href,
      });
    } else {
      void navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    }
  };

  return (
    <SiteLayout>
      <div className="border-b border-border surface-section">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          <Link
            to="/resources"
            className="inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-1 size-3.5" /> Back to all resources
          </Link>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              {material.isPremium ? (
                <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/20">
                  <Lock className="mr-1 size-3" /> Premium Licensed
                </Badge>
              ) : (
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                  <Unlock className="mr-1 size-3" /> Free Revision Note
                </Badge>
              )}
              <Badge variant="outline">{material.type}</Badge>
              <span className="text-xs text-muted-foreground font-medium">
                Year {material.year} · Sem {material.semester} ({subject?.code || "PCI"})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!student) {
                    toast.info("Please login to save to favorites.");
                    return;
                  }
                  toggleFavorite(material.id);
                  toast.success(favorite ? "Removed from saved" : "Saved to your favorites!");
                }}
              >
                <Heart className={`size-4 mr-1.5 ${favorite ? "fill-rose-500 text-rose-500" : ""}`} />
                {favorite ? "Saved" : "Save"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="size-4 mr-1.5" /> Share
              </Button>
            </div>
          </div>

          <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl text-foreground">{material.title}</h1>
          <p className="mt-1 text-sm font-bold text-primary">{subject?.name}</p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-foreground">About this Study Resource</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {material.description}
              </p>

              <div className="grid grid-cols-2 gap-4 rounded-2xl border border-border bg-muted/20 p-4 text-xs">
                <div>
                  <span className="text-muted-foreground">Author / Reviewer:</span>
                  <p className="font-semibold text-foreground">{material.author || "Academic Faculty"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Document Volume:</span>
                  <p className="font-semibold text-foreground">{material.pages || 50} Pages (PDF)</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Curriculum Standard:</span>
                  <p className="font-semibold text-foreground">PCI Unified Syllabus</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Format:</span>
                  <p className="font-semibold text-foreground">Protected Digital Reader</p>
                </div>
              </div>

              {material.topics.length > 0 && (
                <div className="border-t border-border pt-4">
                  <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                    Key Topics & Syllabus Units
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {material.topics.map((t) => (
                      <span
                        key={t}
                        className="rounded-lg border border-border/80 bg-background px-3 py-1 text-xs text-foreground font-medium"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Document Reader Container */}
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xs">
              <h2 className="text-base font-bold text-foreground">Digital Document Access</h2>

              {owned ? (
                <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center">
                  <CheckCircle2 className="mx-auto size-10 text-emerald-600" />
                  <h3 className="mt-3 text-base font-bold text-foreground">
                    Access Unlocked & Licensed
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    You have lifetime personal access to this verified study document.
                  </p>
                  <div className="mt-5 flex justify-center">
                    <Button asChild size="lg">
                      {student ? (
                        <Link
                          to="/viewer/$studentId/$materialId"
                          params={{ studentId: student.id, materialId: material.id }}
                        >
                          <Eye className="mr-2 size-4" /> Open in Protected Reader
                        </Link>
                      ) : (
                        <Link to="/viewer/$materialId" params={{ materialId: material.id }}>
                          <Eye className="mr-2 size-4" /> Open in Protected Reader
                        </Link>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-border bg-muted/30 p-6 text-center">
                  {material.isPremium && material.price > 0 ? (
                    <>
                      <Lock className="mx-auto size-8 text-muted-foreground" />
                      <h3 className="mt-3 text-base font-bold text-foreground">
                        Licensed Premium Content
                      </h3>
                      <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
                        Unlock chapter notes, diagrams, high-scoring university answers, and formula sheets.
                      </p>
                      <Button asChild size="lg" className="mt-5">
                        <Link to="/checkout" search={{ productId: material.id, productType: "material" } as any}>
                          Buy Now for {formatPrice(material.price)}
                        </Link>
                      </Button>
                    </>
                  ) : (
                    <>
                      <Unlock className="mx-auto size-8 text-emerald-600" />
                      <h3 className="mt-3 text-base font-bold text-foreground">
                        Free Study Material
                      </h3>
                      <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
                        Available free for all pharmacy students. Add it to your personal library for instant access.
                      </p>
                      <Button asChild size="lg" className="mt-5 bg-emerald-600 hover:bg-emerald-700 text-white">
                        <Link to="/checkout" search={{ productId: material.id, productType: "material" } as any}>
                          Get Free Access
                        </Link>
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Action Box */}
          <div>
            <div className="sticky top-24 rounded-3xl border border-border bg-card p-6 shadow-xs space-y-5">
              <div className="flex items-baseline justify-between border-b border-border pb-4">
                <span className="text-xs font-semibold text-muted-foreground uppercase">
                  Price
                </span>
                <span className="text-2xl font-black text-foreground">
                  {owned
                    ? "Unlocked"
                    : !material.isPremium || material.price === 0
                    ? "Free"
                    : formatPrice(material.price)}
                </span>
              </div>

              <div className="space-y-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-primary" />
                  <span>100% PCI Syllabus Compliant</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-primary" />
                  <span>Protected watermarked online reader</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-primary" />
                  <span>Verified by academic rankers & faculty</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-primary" />
                  <span>Instant access across mobile, tablet & PC</span>
                </div>
              </div>

              <div className="mt-6 pt-2">
                {owned ? (
                  <Button asChild className="w-full" size="lg">
                    {student ? (
                      <Link
                        to="/viewer/$studentId/$materialId"
                        params={{ studentId: student.id, materialId: material.id }}
                      >
                        <Eye className="mr-2 size-4" /> Open in Protected Reader
                      </Link>
                    ) : (
                      <Link to="/viewer/$materialId" params={{ materialId: material.id }}>
                        <Eye className="mr-2 size-4" /> Open in Protected Reader
                      </Link>
                    )}
                  </Button>
                ) : (
                  <div className="space-y-2.5">
                    {material.isPremium && material.price > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        onClick={() =>
                          addToCart({
                            id: material.id,
                            type: "material",
                            title: material.title,
                            subtitle: subject?.name,
                            price: material.price,
                            pages: material.pages,
                            semester: material.semester,
                          })
                        }
                        className={`w-full font-bold gap-2 rounded-xl border-teal-200 text-teal-700 hover:bg-teal-50 ${
                          inCart ? "bg-teal-50 border-teal-400" : ""
                        }`}
                      >
                        <ShoppingCart className="size-4" />
                        <span>{inCart ? "In Cart" : "Add to Cart"}</span>
                      </Button>
                    )}

                    <Button
                      asChild
                      className={`w-full font-bold rounded-xl ${
                        !material.isPremium || material.price === 0
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : "bg-[#0e7490] hover:bg-[#0c627b] text-white"
                      }`}
                      size="lg"
                    >
                      <Link to="/checkout" search={{ productId: material.id, productType: "material" } as any}>
                        {!material.isPremium || material.price === 0
                          ? "Get Free Access"
                          : `Buy Now (${formatPrice(material.price)})`}
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
