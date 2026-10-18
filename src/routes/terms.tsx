import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { BookOpen, ShieldAlert, Award, FileText, Scale, UserX, AlertTriangle, HelpCircle } from "lucide-react";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
});

export default function TermsPage() {
  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Legal Agreement"
        title="Terms & Conditions"
        description="Effective Date: October 2026. Please read these terms carefully before accessing or purchasing study materials on PharmaStudents."
      />

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        {/* Highlight Card */}
        <div className="mb-10 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-primary/10 p-3 text-primary">
              <FileText className="size-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Welcome to PharmaStudents</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                These Terms and Conditions ("Terms") govern your use of the website <strong>studentpharma.in</strong> ("Platform") and all educational content, PDF study guides, question papers, and semester bundles provided by PharmaStudents ("we", "us", or "our").
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-10 text-sm leading-relaxed text-muted-foreground">
          {/* Section 1 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-foreground font-semibold text-lg">
              <BookOpen className="size-5 text-primary" />
              <h2>1. Agreement to Terms</h2>
            </div>
            <p>
              By accessing our platform, creating a student account, or purchasing any digital learning material, you acknowledge that you have read, understood, and agreed to be legally bound by these Terms and our Privacy Policy. If you do not agree with any part of these Terms, you must not use our platform or purchase our digital materials.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-foreground font-semibold text-lg">
              <Award className="size-5 text-primary" />
              <h2>2. Digital License & Permitted Academic Use</h2>
            </div>
            <p>
              Upon completing a purchase, PharmaStudents grants you a <strong>personal, non-exclusive, non-transferable, revocable license</strong> to view and study the unlocked digital materials solely for your individual educational preparation.
            </p>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-xs leading-relaxed space-y-1.5 text-foreground">
              <p className="font-semibold flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="size-4" /> Strict Prohibition on Redistribution & Resale
              </p>
              <p className="text-muted-foreground">
                You are strictly prohibited from copying, distributing, sharing your login credentials, re-uploading to public channels (such as Telegram, WhatsApp groups, Google Drive, or competitor websites), selling, renting, or commercially exploiting any material obtained from PharmaStudents. Violators are subject to immediate account termination and legal action under the Indian Copyright Act, 1957.
              </p>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-foreground font-semibold text-lg">
              <UserX className="size-5 text-primary" />
              <h2>3. Student Account Obligations</h2>
            </div>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                You must provide accurate, current, and complete registration information (name, valid email, mobile number).
              </li>
              <li>
                You are responsible for safeguarding your account password and restricting access to your personal devices.
              </li>
              <li>
                Concurrent logins or bot scraping attempts may trigger automated security suspensions to protect intellectual property.
              </li>
              <li>
                You must notify us immediately at <strong>support@studentpharma.in</strong> if you suspect any unauthorized use of your account.
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-foreground font-semibold text-lg">
              <ShieldAlert className="size-5 text-primary" />
              <h2>4. Pricing, Payments & Taxes</h2>
            </div>
            <p>
              All prices for single notes, subject packs, and semester combos are listed in Indian Rupees (INR) and are inclusive of applicable taxes unless stated otherwise.
            </p>
            <p>
              We reserve the right to revise pricing, offer seasonal student promotional discounts, or modify package contents at any time. Any price changes will not affect previously completed purchases. Payments are processed through Razorpay's secure checkout.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-foreground font-semibold text-lg">
              <Scale className="size-5 text-primary" />
              <h2>5. Academic Disclaimer & Limitation of Liability</h2>
            </div>
            <p>
              PharmaStudents produces high-quality, exam-oriented study materials compiled by experienced pharmacy faculty and toppers based on standard Pharmacy Council of India (PCI) syllabus guidelines.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Our materials are intended as supplementary revision aids and do not replace official university textbooks, laboratory manuals, or formal classroom instruction.
              </li>
              <li>
                While we make every effort to maintain accuracy, PharmaStudents does not guarantee that studying our notes will guarantee specific exam grades or academic outcomes.
              </li>
              <li>
                To the maximum extent permitted by law, PharmaStudents shall not be liable for any indirect, incidental, or consequential damages resulting from platform downtime or reliance on study materials.
              </li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-foreground font-semibold text-lg">
              <HelpCircle className="size-5 text-primary" />
              <h2>6. Governing Law & Dispute Resolution</h2>
            </div>
            <p>
              These Terms and your use of the platform are governed by and construed in accordance with the laws of India. Any disputes arising out of or in connection with these Terms shall be subject to the exclusive jurisdiction of the competent courts in Hyderabad, Telangana, India.
            </p>
            <p>
              For inquiries regarding these Terms, contact us at:
            </p>
            <div className="rounded-xl border border-border bg-card p-4 space-y-1 text-foreground">
              <p className="font-medium">PharmaStudents Legal & Support Team</p>
              <p className="text-xs text-muted-foreground">Email: support@studentpharma.in</p>
              <p className="text-xs text-muted-foreground">Phone: +91 78010 64412</p>
              <p className="text-xs text-muted-foreground">Address: Hyderabad, Telangana, India</p>
            </div>
          </section>
        </div>
      </div>
    </SiteLayout>
  );
}
