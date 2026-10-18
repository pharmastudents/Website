import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { RefreshCw, CheckCircle2, XCircle, Clock, AlertCircle, HelpCircle, Mail, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/refund")({
  component: RefundPage,
});

export default function RefundPage() {
  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Consumer Protection"
        title="Refund & Cancellation Policy"
        description="Clear, transparent terms regarding payments, digital product delivery, and refund eligibility for PharmaStudents."
      />

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        {/* Highlight Card */}
        <div className="mb-10 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-primary/10 p-3 text-primary">
              <RefreshCw className="size-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Digital Products Policy Overview</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                PharmaStudents provides intangible, irrevocable digital goods (study notes, exam guides, question banks, and semester combos). Because access is unlocked immediately upon successful payment, we provide specific guidelines on cancellation and refund scenarios below.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-10 text-sm leading-relaxed text-muted-foreground">
          {/* Section 1 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-foreground font-semibold text-lg">
              <Clock className="size-5 text-primary" />
              <h2>1. Order Cancellation</h2>
            </div>
            <p>
              Since our digital study notes and PDF bundles are delivered instantly to your student dashboard upon successful payment verification, <strong>orders cannot be cancelled once digital delivery is fulfilled</strong>.
            </p>
            <p>
              If a transaction was initiated inadvertently or failed during checkout, no cancellation request is necessary as uncompleted orders are automatically voided without debits.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-foreground font-semibold text-lg">
              <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
              <h2>2. Scenarios Eligible for a 100% Refund</h2>
            </div>
            <p>
              We stand behind our students and ensure you are never penalized for technical glitches or payment failures. You are eligible for a prompt full refund under the following verified conditions:
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-1.5">
                <p className="font-semibold text-foreground flex items-center gap-1.5 text-sm">
                  <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" /> Duplicate Payments
                </p>
                <p className="text-xs text-muted-foreground">
                  If your bank account or UPI was charged more than once for the same single material or combo package due to a network delay or gateway timeout.
                </p>
              </div>

              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-1.5">
                <p className="font-semibold text-foreground flex items-center gap-1.5 text-sm">
                  <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" /> Failed Material Delivery
                </p>
                <p className="text-xs text-muted-foreground">
                  If payment was successfully debited but the purchased resource was not unlocked in your dashboard within 24 hours and our technical team cannot manually resolve access.
                </p>
              </div>

              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-1.5">
                <p className="font-semibold text-foreground flex items-center gap-1.5 text-sm">
                  <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" /> Defective or Corrupted PDF
                </p>
                <p className="text-xs text-muted-foreground">
                  If the unlocked file has corrupted pages, unreadable text, or incorrect subject material, and our team cannot provide a corrected replacement file within 48 hours.
                </p>
              </div>

              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-1.5">
                <p className="font-semibold text-foreground flex items-center gap-1.5 text-sm">
                  <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" /> Incorrect Billing Amount
                </p>
                <p className="text-xs text-muted-foreground">
                  If you were charged an amount higher than the advertised price displayed on the checkout summary at the time of payment.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-foreground font-semibold text-lg">
              <XCircle className="size-5 text-rose-600 dark:text-rose-400" />
              <h2>3. Non-Refundable Circumstances</h2>
            </div>
            <p>Refunds will <strong>not</strong> be granted under the following circumstances:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Change of mind:</strong> Deciding that you no longer require the notes after purchasing and viewing the content.
              </li>
              <li>
                <strong>Exam performance:</strong> Academic grades, pass percentages, or university exam outcomes.
              </li>
              <li>
                <strong>Device/Software Incompatibility:</strong> Inability to view documents caused by obsolete third-party mobile browsers or unsupported device configurations when the standard web viewer functions properly.
              </li>
              <li>
                <strong>Account suspension:</strong> Any account terminated or restricted due to copyright infringement, unauthorized sharing, or credential leakage.
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-foreground font-semibold text-lg">
              <Clock className="size-5 text-primary" />
              <h2>4. Refund Request Procedure & Timelines</h2>
            </div>
            <p>
              To initiate an eligible refund claim, please submit a written request within <strong>7 days</strong> of your transaction date following these steps:
            </p>
            <ol className="list-decimal pl-6 space-y-2">
              <li>
                Send an email to <a href="mailto:support@studentpharma.in" className="text-primary hover:underline font-medium">support@studentpharma.in</a> with the subject line <code>Refund Request - [Your Order ID]</code>.
              </li>
              <li>
                Include your <strong>Registered Email Address</strong>, <strong>Razorpay Payment ID</strong> (starts with <code>pay_...</code>), and the exact reason for the refund.
              </li>
              <li>
                Attach a screenshot of the payment receipt or issue where applicable.
              </li>
            </ol>
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs space-y-1.5 text-foreground mt-2">
              <p className="font-semibold flex items-center gap-1.5 text-primary">
                <ShieldCheck className="size-4" /> Processing & Settlement Time
              </p>
              <p className="text-muted-foreground">
                Once reviewed and verified (typically within 24 to 48 hours), approved refunds are issued directly through Razorpay back to your original source of payment (Bank Account, UPI ID, or Card). In accordance with standard banking cycles, the funds typically credit within <strong>5 to 7 business days</strong>.
              </p>
            </div>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-foreground font-semibold text-lg">
              <HelpCircle className="size-5 text-primary" />
              <h2>5. Contact Our Support Team</h2>
            </div>
            <p>
              For urgent payment issues or queries regarding a transaction, contact our student support team:
            </p>
            <div className="rounded-xl border border-border bg-card p-4 space-y-1 text-foreground">
              <p className="font-medium">PharmaStudents Billing & Support</p>
              <p className="text-xs text-muted-foreground">Email: support@studentpharma.in</p>
              <p className="text-xs text-muted-foreground">Phone: +91 78010 64412 (10 AM - 6 PM IST)</p>
              <p className="text-xs text-muted-foreground">Location: Hyderabad, Telangana, India</p>
            </div>
          </section>
        </div>
      </div>
    </SiteLayout>
  );
}
