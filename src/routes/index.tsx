import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import {
  BookOpen,
  GraduationCap,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  FileText,
  Brain,
  ShieldCheck,
  Award,
  Zap,
  ChevronRight,
  Search,
  Star,
  Users,
  Compass,
  FileCheck,
  Clock,
  Layers,
  FlaskConical,
  XCircle,
  Link2,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { ResourceCard } from "@/components/site/ResourceCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useStore, useSubjectMap, YEARS, semestersForYear } from "@/lib/store";

export const Route = createFileRoute("/")({
  component: Index,
});

export default function Index() {
  const { db, session, student, isAdmin, ready } = useStore();
  const navigate = useNavigate();
  const subjectMap = useSubjectMap();

  // Automatic Re-visit: Always redirect logged-in users directly to their dashboard
  useEffect(() => {
    if (ready) {
      if (isAdmin) {
        void navigate({ to: "/admin" });
      } else if (session || student) {
        void navigate({ to: "/dashboard" });
      }
    }
  }, [ready, isAdmin, session, student, navigate]);

  const [selectedYear, setSelectedYear] = useState<number>(1);
  const [selectedSemester, setSelectedSemester] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  const semesters = semestersForYear(selectedYear);

  // Keep semester in sync with selected year
  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    setSelectedSemester(year * 2 - 1);
  };

  const currentSubjects = useMemo(() => {
    return db.subjects.filter(
      (s) => s.year === selectedYear && s.semester === selectedSemester,
    );
  }, [db.subjects, selectedYear, selectedSemester]);

  const featuredMaterials = useMemo(() => {
    let list = db.materials.filter((m) => m.published);
    if (filterType === "free") {
      list = list.filter((m) => !m.isPremium);
    } else if (filterType === "notes") {
      list = list.filter((m) => m.type === "PDF Notes");
    } else if (filterType === "questions") {
      list = list.filter((m) => m.type === "Important Questions");
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q) ||
          (subjectMap.get(m.subjectId)?.name.toLowerCase().includes(q) ?? false),
      );
    }
    return list.slice(0, 6);
  }, [db.materials, filterType, searchQuery, subjectMap]);

  return (
    <SiteLayout>
      {/* 1. Hero Section matching screenshot */}
      <section className="relative overflow-hidden border-b border-border/80 bg-gradient-to-b from-emerald-50/50 via-background to-background py-16 sm:py-24">
        {/* Soft radial glow */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(13,148,136,0.12),rgba(255,255,255,0))]" />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col items-center text-center">
            {/* Tagline Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50/70 px-4 py-1.5 text-xs font-semibold text-[#0d9488] shadow-xs dark:border-teal-800 dark:bg-teal-950/50 dark:text-teal-300">
              <Link2 className="size-3.5 text-[#0d9488] dark:text-teal-300" aria-hidden />
              <span>Dynamic Pharmacy Learning Platform · India</span>
            </div>

            {/* Main Headline */}
            <h1 className="mt-8 max-w-4xl text-4xl font-black tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Master Pharmacy with<br />
              <span className="text-[#0d9488]">Verified Study Notes</span>
            </h1>

            {/* Subheading */}
            <p className="mt-6 max-w-3xl text-base text-muted-foreground sm:text-lg lg:text-xl leading-relaxed">
              Centralized study platform for B.Pharm, D.Pharm, M.Pharm, and Pharm.D students. Access high-yield unit notes, model question papers, and syllabus-compliant study guides.
            </p>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Button asChild size="lg" className="h-12 rounded-xl bg-[#0d9488] hover:bg-[#0f766e] text-white px-7 text-base font-semibold shadow-sm">
                <a href="#academic-navigator">
                  <GraduationCap className="mr-2 size-5" /> Browse by Year
                </a>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 rounded-xl border-2 border-[#0d9488] bg-card text-[#0d9488] hover:bg-emerald-50 px-7 text-base font-semibold dark:hover:bg-emerald-950/40">
                <Link to="/register">
                  <BookOpen className="mr-2 size-5 text-[#0d9488]" /> Start Free
                </Link>
              </Button>
            </div>

            {/* Platform Stats Row (4 Programs, 29+ Subjects, 9+ Verified Notes, 4.9 Student Rating) */}
            <div className="mt-14 grid w-full max-w-4xl grid-cols-2 gap-6 sm:grid-cols-4 pt-4">
              <div className="text-center">
                <p className="text-3xl sm:text-4xl font-extrabold text-foreground">4</p>
                <p className="mt-1 text-xs font-medium text-muted-foreground">Programs Configured</p>
              </div>
              <div className="text-center">
                <p className="text-3xl sm:text-4xl font-extrabold text-foreground">29+</p>
                <p className="mt-1 text-xs font-medium text-muted-foreground">Subjects Covered</p>
              </div>
              <div className="text-center">
                <p className="text-3xl sm:text-4xl font-extrabold text-foreground">{db.materials.length || 9}+</p>
                <p className="mt-1 text-xs font-medium text-muted-foreground">Verified Notes</p>
              </div>
              <div className="text-center">
                <p className="text-3xl sm:text-4xl font-extrabold text-foreground inline-flex items-center justify-center gap-1">
                  4.9 <Star className="size-5 fill-[#0d9488] text-[#0d9488]" />
                </p>
                <p className="mt-1 text-xs font-medium text-muted-foreground">Student Rating</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Interactive B.Pharm Resource Navigator (Year -> Semester -> Subject) */}
      <section id="academic-navigator" className="py-16 sm:py-20 scroll-mt-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-bold tracking-widest text-primary uppercase">
                Resource Structure
              </p>
              <h2 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
                Browse by Academic Year & Semester
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Find chapter-wise notes and question banks according to the official Pharmacy Council of India (PCI) syllabus.
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <Button asChild variant="outline" size="sm">
                <Link to="/resources">
                  View All Resources <ChevronRight className="ml-1 size-4" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Year Selector Tabs */}
          <div className="mt-8 flex flex-wrap gap-2 border-b border-border pb-4">
            {YEARS.map((yr) => (
              <button
                key={yr}
                onClick={() => handleYearChange(yr)}
                className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition-all ${
                  selectedYear === yr
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
              >
                Year {yr}
              </button>
            ))}
          </div>

          {/* Semester Selector */}
          <div className="mt-4 flex items-center gap-3">
            <span className="text-xs font-semibold text-muted-foreground">Select Semester:</span>
            {semesters.map((sem) => (
              <button
                key={sem}
                onClick={() => setSelectedSemester(sem)}
                className={`rounded-full px-4 py-1 text-xs font-medium transition-colors ${
                  selectedSemester === sem
                    ? "bg-accent text-accent-foreground font-semibold"
                    : "border border-border bg-card text-muted-foreground hover:bg-muted"
                }`}
              >
                Semester {sem}
              </button>
            ))}
          </div>

          {/* Subjects Grid for Selected Semester */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {currentSubjects.map((sub) => {
              const subMaterials = db.materials.filter((m) => m.subjectId === sub.id && m.published);
              return (
                <div
                  key={sub.id}
                  className="card-shell card-hover flex flex-col justify-between p-5"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                        Sem {sub.semester}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {subMaterials.length} {subMaterials.length === 1 ? "Material" : "Materials"}
                      </span>
                    </div>
                    <h3 className="mt-3 text-base font-bold text-foreground">{sub.name}</h3>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {sub.description || "Comprehensive syllabus notes and exam preparation material."}
                    </p>
                  </div>

                  <div className="mt-5 border-t border-border pt-4">
                    <Button asChild variant="ghost" size="sm" className="w-full justify-between px-2 text-primary hover:text-primary">
                      <Link to="/resources" search={{ subjectId: sub.id } as any}>
                        <span>Explore Notes</span>
                        <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. Featured Study Materials & Instant Preview */}
      <section className="border-t border-border surface-section py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-bold tracking-widest text-primary uppercase">
                Featured Notes
              </p>
              <h2 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
                Popular B.Pharm Study Materials
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                High-yield PDF notes, formula sheets, and repeated university questions.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="mt-4 flex flex-wrap gap-2 md:mt-0">
              <button
                onClick={() => setFilterType("all")}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  filterType === "all"
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card text-muted-foreground hover:bg-muted"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType("free")}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  filterType === "free"
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card text-muted-foreground hover:bg-muted"
                }`}
              >
                Free Revision
              </button>
              <button
                onClick={() => setFilterType("notes")}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  filterType === "notes"
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card text-muted-foreground hover:bg-muted"
                }`}
              >
                PDF Notes
              </button>
              <button
                onClick={() => setFilterType("questions")}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  filterType === "questions"
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card text-muted-foreground hover:bg-muted"
                }`}
              >
                Question Banks
              </button>
            </div>
          </div>

          {/* Grid of Materials */}
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredMaterials.map((material) => (
              <ResourceCard
                key={material.id}
                material={material}
                subject={subjectMap.get(material.subjectId)}
              />
            ))}
          </div>

          <div className="mt-12 text-center">
            <Button asChild size="lg" variant="outline">
              <Link to="/resources">
                Browse Complete Resource Directory <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* 4. How It Works Section */}
      <section id="how-it-works" className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center">
            <p className="text-xs font-bold tracking-widest text-primary uppercase">
              Simple 3-Step Process
            </p>
            <h2 className="mt-2 text-3xl font-extrabold text-foreground sm:text-4xl">
              How Student Pharma Works
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base text-muted-foreground">
              We eliminate endless searching through unverified web links and blurry photocopies with an organized digital repository.
            </p>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {/* Step 1 */}
            <div className="relative rounded-2xl border border-border bg-card p-6 shadow-xs">
              <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <GraduationCap className="size-6" />
              </div>
              <span className="absolute right-6 top-6 text-3xl font-black text-muted-foreground/20">
                01
              </span>
              <h3 className="mt-5 text-lg font-bold text-foreground">
                1. Select Year & Semester
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Choose your exact academic year and semester mapped precisely to the standard PCI syllabus across all 8 semesters.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative rounded-2xl border border-border bg-card p-6 shadow-xs">
              <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FileCheck className="size-6" />
              </div>
              <span className="absolute right-6 top-6 text-3xl font-black text-muted-foreground/20">
                02
              </span>
              <h3 className="mt-5 text-lg font-bold text-foreground">
                2. Access Verified Notes
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Read free quick-revision sheets or unlock complete chapter-wise notes and important question banks with answer hints.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative rounded-2xl border border-border bg-card p-6 shadow-xs">
              <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Award className="size-6" />
              </div>
              <span className="absolute right-6 top-6 text-3xl font-black text-muted-foreground/20">
                03
              </span>
              <h3 className="mt-5 text-lg font-bold text-foreground">
                3. Ace University Exams
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Study with clean diagrams, high-scoring university format answers, and clear clinical explanations to boost your GPA.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Student Benefits */}
      <section className="border-t border-border surface-section py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center">
            <p className="text-xs font-bold tracking-widest text-primary uppercase">
              Built for Pharmacy Scholars
            </p>
            <h2 className="mt-2 text-3xl font-extrabold text-foreground sm:text-4xl">
              Why Pharmacy Students Prefer Us
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-base text-muted-foreground">
              Everything you need to thrive in university theory exams, lab vivas, and competitive tests like GPAT.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
              <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 className="size-5" />
              </div>
              <h3 className="mt-4 text-base font-bold text-foreground">PCI Syllabus Compliant</h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Every document follows the official Pharmacy Council of India curriculum. No outdated or irrelevant content.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
              <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                <Brain className="size-5" />
              </div>
              <h3 className="mt-4 text-base font-bold text-foreground">Exam-Focused Format</h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Structured with headings, subheadings, bullet points, and chemical structures matching university evaluation schemes.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
              <div className="flex size-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                <Zap className="size-5" />
              </div>
              <h3 className="mt-4 text-base font-bold text-foreground">Last-Day Revision Sheets</h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Summary sheets covering repetitive questions, reactions, and key formulas so you can revise entire units in under 2 hours.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
              <div className="flex size-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600">
                <FlaskConical className="size-5" />
              </div>
              <h3 className="mt-4 text-base font-bold text-foreground">Lab & Viva Ready</h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Includes practical experiment flowcharts, reagent preparations, and viva question answers for pharmaceutical labs.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
              <div className="flex size-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600">
                <Clock className="size-5" />
              </div>
              <h3 className="mt-4 text-base font-bold text-foreground">Instant Drive & Cloud Access</h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Open on mobile, tablet, or laptop. No waiting for physical photocopies or scanning pages from classmates.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ShieldCheck className="size-5" />
              </div>
              <h3 className="mt-4 text-base font-bold text-foreground">Student-Friendly Pricing</h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Generous free tier with quick revision notes, and ultra-affordable semester bundles priced fairly for students.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Why Student Pharma (Comparison Card) */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center">
            <p className="text-xs font-bold tracking-widest text-primary uppercase">
              The Difference
            </p>
            <h2 className="mt-2 text-3xl font-extrabold text-foreground sm:text-4xl">
              Why Student Pharma?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base text-muted-foreground">
              See why hundreds of pharmacy students leave behind chaotic group chats for our clean platform.
            </p>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-2">
            {/* The Old Way */}
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                  <XCircle className="size-5" />
                </div>
                <h3 className="text-lg font-bold text-destructive">Old Messy Way</h3>
              </div>
              <ul className="mt-6 space-y-3.5 text-sm text-muted-foreground">
                <li className="flex items-start gap-2.5">
                  <span className="text-destructive font-bold">✕</span>
                  <span>Scattered WhatsApp and Telegram chats with dead Google Drive links</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-destructive font-bold">✕</span>
                  <span>Unreadable handwritten photocopies missing crucial pages</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-destructive font-bold">✕</span>
                  <span>Outdated non-PCI content that doesn't match exam marking patterns</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-destructive font-bold">✕</span>
                  <span>Wasting hours before exam nights searching for basic chapter notes</span>
                </li>
              </ul>
            </div>

            {/* The Student Pharma Way */}
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 sm:p-8 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/20 text-primary">
                  <CheckCircle2 className="size-5" />
                </div>
                <h3 className="text-lg font-bold text-primary">Student Pharma Platform</h3>
              </div>
              <ul className="mt-6 space-y-3.5 text-sm text-foreground">
                <li className="flex items-start gap-2.5">
                  <span className="text-primary font-bold">✓</span>
                  <span>Organized Year → Semester → Subject hierarchy with 1-click access</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-primary font-bold">✓</span>
                  <span>Clean digital typography with high-resolution structural formulas and diagrams</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-primary font-bold">✓</span>
                  <span>100% compliant with Pharmacy Council of India guidelines & university papers</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-primary font-bold">✓</span>
                  <span>Instant access to Revision Guides, Important Questions, and Formula Sheets</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 7. AI in Pharmacy Spotlight */}
      <section className="border-t border-border surface-section py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 p-8 sm:p-12 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  <Sparkles className="size-3.5" />
                  <span>Future-Ready Pharmacists</span>
                </div>
                <h2 className="mt-4 text-2xl font-extrabold text-foreground sm:text-3xl">
                  AI in Pharmacy & Pharmacology
                </h2>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  The pharmaceutical industry is evolving rapidly with artificial intelligence in drug design, molecular docking, and clinical trials. Our curated modules incorporate modern computational pharmacy trends to keep you ahead of traditional curriculum.
                </p>
                <div className="mt-6 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                  <div className="rounded-lg border border-border bg-background p-3">
                    <p className="font-semibold text-foreground">AI Drug Discovery</p>
                    <p className="mt-0.5 text-muted-foreground">QSAR & molecular simulation</p>
                  </div>
                  <div className="rounded-lg border border-border bg-background p-3">
                    <p className="font-semibold text-foreground">Clinical AI</p>
                    <p className="mt-0.5 text-muted-foreground">Predictive toxicity & trial design</p>
                  </div>
                  <div className="rounded-lg border border-border bg-background p-3">
                    <p className="font-semibold text-foreground">Smart Revision</p>
                    <p className="mt-0.5 text-muted-foreground">AI-assisted question patterns</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row lg:flex-col gap-3">
                <Button asChild size="lg">
                  <Link to="/resources">
                    Explore Pharmacy Resources <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/why">Learn More About Platform</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Call to Action (CTA) */}
      <section className="border-t border-border py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Ready to master your B.Pharm exams?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
            Join thousands of pharmacy students studying smarter with structured notes, revision guides, and exam-focused question banks.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg" className="h-12 px-8 text-base font-semibold">
              <Link to="/register">Create Free Account</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 px-8 text-base">
              <Link to="/bpharm">Explore B.Pharm Curriculum</Link>
            </Button>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
