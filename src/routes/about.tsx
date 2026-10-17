import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Award, Heart, GraduationCap } from "lucide-react";

export const Route = createFileRoute("/about")({
  component: AboutPage,
});

export default function AboutPage() {
  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Our Mission"
        title="About Student Pharma B.Pharm"
        description="Empowering pharmacy students across India with well-crafted, verified academic resources, study guides, and exam preparation material."
      />

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 space-y-12">
        <div className="prose prose-neutral max-w-none text-muted-foreground leading-relaxed">
          <p className="text-base text-foreground font-medium">
            Student Pharma B.Pharm was founded with a singular focus: to make pharmacy education organized, accessible, and exam-oriented for every B.Pharm student in India.
          </p>
          <p className="mt-4 text-sm">
            The Bachelor of Pharmacy curriculum is rigorous and vast — covering pharmaceutical chemistry, pharmacology, pharmaceutics, pharmacognosy, and clinical therapeutics across 8 intensive semesters. Students often struggle not with intelligence, but with access to structured, clean, and reliable study material.
          </p>
          <p className="mt-4 text-sm">
            We collaborate with academic rank holders, university toppers, and seasoned pharmacy educators to develop chapter notes that respect the official Pharmacy Council of India (PCI) syllabus while teaching students how to write high-scoring answers in university examinations.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-xs">
            <GraduationCap className="mx-auto size-8 text-primary" />
            <h3 className="mt-3 font-bold text-foreground">PCI Syllabus</h3>
            <p className="mt-1 text-xs text-muted-foreground">Standardized coverage across all 8 semesters.</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-xs">
            <Award className="mx-auto size-8 text-primary" />
            <h3 className="mt-3 font-bold text-foreground">Exam Oriented</h3>
            <p className="mt-1 text-xs text-muted-foreground">Curated for 10-mark, 5-mark & 2-mark answer writing.</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-xs">
            <Heart className="mx-auto size-8 text-primary" />
            <h3 className="mt-3 font-bold text-foreground">Student First</h3>
            <p className="mt-1 text-xs text-muted-foreground">Transparent, affordable, and free revision notes.</p>
          </div>
        </div>

        <div className="text-center pt-6">
          <Button asChild size="lg">
            <Link to="/resources">Explore Study Resources</Link>
          </Button>
        </div>
      </div>
    </SiteLayout>
  );
}
