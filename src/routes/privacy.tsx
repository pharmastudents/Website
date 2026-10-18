import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { ShieldCheck, Lock, Eye, Database, UserCheck, Mail, Bell } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
});

export default function PrivacyPage() {
  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Legal & Compliance"
        title="Privacy Policy"
        description="Effective Date: October 2026. How PharmaStudents collects, uses, protects, and handles your personal data and academic information."
      />

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        {/* Highlight Card */}
        <div className="mb-10 rounded-2xl border border-primary/20 bg-primary/5 p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-primary/10 p-3 text-primary">
              <ShieldCheck className="size-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Our Commitment to Student Privacy</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                PharmaStudents ("Student Pharma", "we", "our", or "us") provides digital educational resources for pharmacy students. We strictly respect your privacy and do not sell, rent, or trade your personal information. All financial transactions are securely processed via certified, PCI-DSS compliant payment gateways.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-10 text-sm leading-relaxed text-muted-foreground">
          {/* Section 1 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-foreground font-semibold text-lg">
              <Eye className="size-5 text-primary" />
              <h2>1. Information We Collect</h2>
            </div>
            <p>
              To provide you with seamless access to our syllabus-aligned B.Pharm study notes, question banks, and account dashboard, we collect the following categories of information:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong className="text-foreground">Student Account Information:</strong> Your full name, email address, mobile phone number, college/institution name, and academic year or semester provided during registration or checkout.
              </li>
              <li>
                <strong className="text-foreground">Authentication Credentials:</strong> Secure login identifiers and passwords managed through encrypted database services (Supabase Authentication).
              </li>
              <li>
                <strong className="text-foreground">Transaction & Order Details:</strong> Razorpay order ID, payment transaction reference, materials purchased, purchase timestamps, and payment status.
              </li>
              <li>
                <strong className="text-foreground">Technical & Usage Data:</strong> IP address, device type, operating system, browser version, and in-app viewing logs used solely to protect copyrighted study notes against unauthorized mass distribution.
              </li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-foreground font-semibold text-lg">
              <Lock className="size-5 text-primary" />
              <h2>2. Payment Information & Security</h2>
            </div>
            <p>
              We do <strong>not</strong> collect, process, or store your credit/debit card numbers, CVVs, net banking passwords, or UPI PINs on our servers.
            </p>
            <p>
              All financial payments are handled through <strong>Razorpay</strong>, an RBI-authorized and PCI-DSS Level 1 compliant payment service provider. When you make a purchase, your payment credentials are submitted directly to Razorpay through secure 256-bit SSL encrypted channels.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-foreground font-semibold text-lg">
              <Database className="size-5 text-primary" />
              <h2>3. How We Use Your Information</h2>
            </div>
            <p>We use the collected information for the following legitimate purposes:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>To create, verify, and maintain your student account.</li>
              <li>To fulfill digital orders and instantly unlock purchased PDFs in your student dashboard.</li>
              <li>To deliver electronic receipts, order confirmations, and access links via email.</li>
              <li>To provide customer support and troubleshoot access issues.</li>
              <li>To safeguard our platform against fraudulent access, pirated sharing, or system abuse.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-foreground font-semibold text-lg">
              <UserCheck className="size-5 text-primary" />
              <h2>4. Data Sharing & Third-Party Services</h2>
            </div>
            <p>
              We do not sell or monetize student data. We only share essential data with vetted infrastructure partners who assist in operating our platform under strict confidentiality agreements:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong className="text-foreground">Database & Cloud Storage:</strong> Supabase (for encrypted account records, database tables, and secure PDF storage).
              </li>
              <li>
                <strong className="text-foreground">Payment Gateway:</strong> Razorpay Software Private Limited (for processing payments and verifying webhooks).
              </li>
              <li>
                <strong className="text-foreground">Hosting & CDN:</strong> Cloud infrastructure for secure, low-latency delivery of website assets.
              </li>
              <li>
                <strong className="text-foreground">Legal Obligations:</strong> We may disclose information if required to comply with applicable laws, court orders, or governmental regulations.
              </li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-foreground font-semibold text-lg">
              <Bell className="size-5 text-primary" />
              <h2>5. Data Retention & Student Rights</h2>
            </div>
            <p>
              Your account details and purchase records are retained as long as your account remains active so that you can view your unlocked study resources whenever needed.
            </p>
            <p>
              As a student, you have the right to inspect your account details, request corrections to erroneous profile data, or request account closure by contacting our support desk.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-foreground font-semibold text-lg">
              <Mail className="size-5 text-primary" />
              <h2>6. Contact & Grievance Redressal</h2>
            </div>
            <p>
              If you have any questions, concerns, or grievances regarding this Privacy Policy or how your personal information is handled, please contact our privacy desk:
            </p>
            <div className="rounded-xl border border-border bg-card p-5 space-y-1.5 text-foreground">
              <p className="font-semibold">PharmaStudents Grievance Desk</p>
              <p className="text-sm text-muted-foreground">Student Pharma Platform</p>
              <p className="text-sm text-muted-foreground">Hyderabad, Telangana, India</p>
              <p className="text-sm">
                Email: <a href="mailto:support@studentpharma.in" className="text-primary hover:underline">support@studentpharma.in</a>
              </p>
              <p className="text-sm">Phone: +91 78010 64412 (Mon - Sat, 10:00 AM - 6:00 PM IST)</p>
            </div>
          </section>
        </div>
      </div>
    </SiteLayout>
  );
}
