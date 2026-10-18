import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { Truck, Zap, Download, MonitorCheck, HelpCircle, Mail, Clock, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/shipping")({
  component: ShippingPolicyPage,
});

export default function ShippingPolicyPage() {
  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Fulfilment & Delivery"
        title="Shipping & Delivery Policy"
        description="Effective Date: October 2026. Important information regarding digital delivery, instant access timelines, and fees for our B.Pharm PDF study materials."
      />

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        {/* Highlight Card */}
        <div className="mb-10 rounded-2xl border border-primary/20 bg-primary/5 p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-primary/10 p-3 text-primary">
              <Zap className="size-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">100% Instant Digital Delivery</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                PharmaStudents exclusively provides <strong>digital educational content</strong> (PDF study notes, syllabus-based guides, question banks, and semester bundles). We do <strong>not</strong> print or ship physical paper books, CD-ROMs, or tangible parcels via postal mail or courier.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-10 text-sm leading-relaxed text-muted-foreground">
          {/* Section 1 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-foreground font-semibold text-lg">
              <Truck className="size-5 text-primary" />
              <h2>1. Shipping Costs & Charges</h2>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Free Digital Delivery (₹0 Shipping Fee)</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Because all study materials are electronic PDF assets accessible online, <strong>shipping charges are ₹0 (FREE)</strong> for all orders across all regions in India and worldwide.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-foreground font-semibold text-lg">
              <Clock className="size-5 text-primary" />
              <h2>2. Delivery Method & Timelines</h2>
            </div>
            <p>
              We know academic preparation cannot wait. Our system is built with automated payment-to-access synchronization:
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
                  <Zap className="size-4 text-primary" />
                  <h3>Standard Digital Delivery Time</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Instant (Seconds to 2 Minutes):</strong> As soon as your payment is confirmed by Razorpay, the purchased subject notes or combo bundle is automatically unlocked in your student account dashboard.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
                  <Clock className="size-4 text-primary" />
                  <h3>Maximum Resolution Window</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Maximum 12 to 24 Hours:</strong> In the rare event of inter-bank downtime or delayed webhook processing, our automated reconciler or support team will activate your access within 12-24 hours.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-foreground font-semibold text-lg">
              <MonitorCheck className="size-5 text-primary" />
              <h2>3. How to Access Your Unlocked Materials</h2>
            </div>
            <p>Once your order is complete, you can access your resources anytime using any device:</p>
            <ol className="list-decimal pl-6 space-y-2.5">
              <li>
                <strong className="text-foreground">Login to Your Account:</strong> Visit <Link to="/login" className="text-primary hover:underline">studentpharma.in/login</Link> using your registered student credentials.
              </li>
              <li>
                <strong className="text-foreground">Navigate to My Resources:</strong> Click on your profile menu and select <strong>"My Resources"</strong> or <strong>"Orders"</strong> in your student dashboard.
              </li>
              <li>
                <strong className="text-foreground">View & Study:</strong> Click on any unlocked material to open our high-speed, secure digital reader directly in your browser.
              </li>
              <li>
                <strong className="text-foreground">Email Confirmation:</strong> An order confirmation containing your transaction reference is also sent to your registered email address immediately.
              </li>
            </ol>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-foreground font-semibold text-lg">
              <Download className="size-5 text-primary" />
              <h2>4. System & Device Requirements</h2>
            </div>
            <p>
              Our PDF study materials are optimized to run smoothly on any modern device without requiring specialized software:
            </p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Compatible with Android smartphones, iPhones, iPads, Windows PCs, Macs, and Linux systems.</li>
              <li>Supported on all modern browsers (Google Chrome, Mozilla Firefox, Safari, Microsoft Edge, Brave).</li>
              <li>Requires an active standard internet connection for streaming content in the viewer.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-foreground font-semibold text-lg">
              <HelpCircle className="size-5 text-primary" />
              <h2>5. Support for Delivery & Access Issues</h2>
            </div>
            <p>
              If your payment was debited from your bank but your material does not show as "Unlocked" in your dashboard within 15 minutes, please reach out to us with your Razorpay Payment ID:
            </p>
            <div className="rounded-xl border border-border bg-card p-5 space-y-1.5 text-foreground">
              <p className="font-semibold">PharmaStudents Fulfillment Desk</p>
              <p className="text-sm text-muted-foreground">Student Pharma Platform</p>
              <p className="text-sm text-muted-foreground">Hyderabad, Telangana, India</p>
              <p className="text-sm">
                Support Email: <a href="mailto:support@studentpharma.in" className="text-primary hover:underline">support@studentpharma.in</a>
              </p>
              <p className="text-sm">Helpline: +91 78010 64412 (10:00 AM - 6:00 PM IST)</p>
              <p className="text-xs text-muted-foreground mt-2">
                Guaranteed response to access-related issues within 2 to 4 business hours.
              </p>
            </div>
          </section>
        </div>
      </div>
    </SiteLayout>
  );
}
