import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, ArrowRight, ShieldCheck, Zap, BookOpen, Layers } from "lucide-react";

export const Route = createFileRoute("/why")({
  component: WhyPage,
});

export default function WhyPage() {
  return (
    <SiteLayout>
      <PageHeader
        eyebrow="The Student Advantage"
        title="Why Student Pharma B.Pharm?"
        description="We built the platform we wished we had during our pharmacy college days: clean, structured, verified, and laser-focused on university excellence."
      />

      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 md:grid-cols-2">
          {/* Unorganized study */}
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 sm:p-8">
            <h2 className="text-xl font-bold text-destructive">The Traditional Pain Points</h2>
            <p className="mt-2 text-xs text-muted-foreground">
              What pharmacy students traditionally deal with every semester.
            </p>

            <ul className="mt-6 space-y-4 text-sm text-muted-foreground">
              <li className="flex items-start gap-3">
                <XCircle className="size-5 shrink-0 text-destructive mt-0.5" />
                <span>
                  <strong>Chaotic Group Chats:</strong> Notes lost in WhatsApp groups with expired download links and fragmented pages.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <XCircle className="size-5 shrink-0 text-destructive mt-0.5" />
                <span>
                  <strong>Blurry Photocopies:</strong> Difficult-to-read handwritten copies with missing drug classification tables and diagrams.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <XCircle className="size-5 shrink-0 text-destructive mt-0.5" />
                <span>
                  <strong>Unstructured Syllabus:</strong> Generic internet notes that don't follow the official PCI marks distribution or university question patterns.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <XCircle className="size-5 shrink-0 text-destructive mt-0.5" />
                <span>
                  <strong>Last Night Panic:</strong> Spending 3 hours the night before an exam trying to compile notes instead of actually studying.
                </span>
              </li>
            </ul>
          </div>

          {/* Student Pharma */}
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 sm:p-8 shadow-xs">
            <h2 className="text-xl font-bold text-primary">The Student Pharma Solution</h2>
            <p className="mt-2 text-xs text-muted-foreground">
              A single digital vault structured from Day 1 to Graduation.
            </p>

            <ul className="mt-6 space-y-4 text-sm text-foreground">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="size-5 shrink-0 text-primary mt-0.5" />
                <span>
                  <strong>PCI Compliant Structure:</strong> Mapped Year 1 to 4 and Semesters 1 to 8, with subject-wise clarity.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="size-5 shrink-0 text-primary mt-0.5" />
                <span>
                  <strong>Crystal-Clear Diagrams:</strong> High resolution chemical mechanisms, pathways, and pharmacology charts.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="size-5 shrink-0 text-primary mt-0.5" />
                <span>
                  <strong>Exam-Ready Answers:</strong> Formatted specifically for 10-mark, 5-mark, and 2-mark university questions.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="size-5 shrink-0 text-primary mt-0.5" />
                <span>
                  <strong>Free Revision Sheets:</strong> Instant 1-page summaries to recap key drugs, adverse effects, and formulas in minutes.
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 text-center">
          <Button asChild size="lg">
            <Link to="/resources">
              Browse Available Notes <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </SiteLayout>
  );
}
