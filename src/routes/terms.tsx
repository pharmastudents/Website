import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
});

export default function TermsPage() {
  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Legal"
        title="Terms of Service"
        description="Conditions governing access to Student Pharma study materials and digital resources."
      />
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 prose prose-neutral text-sm leading-relaxed text-muted-foreground space-y-6">
        <p>
          By accessing or using the Student Pharma B.Pharm platform, you agree to comply with and be bound by these Terms of Service.
        </p>
        <h2 className="text-base font-bold text-foreground">Usage of Study Materials</h2>
        <p>
          All PDF notes, question banks, diagrams, and revision sheets provided on this platform are for individual personal academic study. Unauthorized redistribution, copying, or commercial reselling of materials is strictly prohibited.
        </p>
        <h2 className="text-base font-bold text-foreground">Account Responsibilities</h2>
        <p>
          You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your student profile.
        </p>
      </div>
    </SiteLayout>
  );
}
