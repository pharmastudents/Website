import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
});

export default function PrivacyPage() {
  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Legal"
        title="Privacy Policy"
        description="Last updated: January 2026. How we protect and manage your information on Student Pharma."
      />
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 prose prose-neutral text-sm leading-relaxed text-muted-foreground space-y-6">
        <p>
          At Student Pharma B.Pharm, we prioritize the privacy and security of our students. We only collect essential information required to maintain your academic profile and access to unlocked learning materials.
        </p>
        <h2 className="text-base font-bold text-foreground">Information We Collect</h2>
        <p>
          We collect your name, email address, mobile number, college name, and current academic year/semester solely for account personalization and resource management. We do not sell or trade your personal data to third parties.
        </p>
        <h2 className="text-base font-bold text-foreground">Data Storage & Security</h2>
        <p>
          Your account credentials and purchase logs are secured. Access to premium materials is associated exclusively with your authenticated student account.
        </p>
      </div>
    </SiteLayout>
  );
}
