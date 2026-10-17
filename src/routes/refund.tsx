import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";

export const Route = createFileRoute("/refund")({
  component: RefundPage,
});

export default function RefundPage() {
  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Policy"
        title="Refund & Cancellation Policy"
        description="Information regarding digital product access and refund terms."
      />
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 prose prose-neutral text-sm leading-relaxed text-muted-foreground space-y-6">
        <p>
          Student Pharma provides digital educational resources, including downloadable and viewable PDF notes, question banks, and revision guides.
        </p>
        <h2 className="text-base font-bold text-foreground">Digital Access & Refunds</h2>
        <p>
          Because our study materials are digital items instantly accessible upon unlocking, purchases are generally non-refundable once unlocked. However, if you encounter technical difficulties accessing an unlocked document, our support team will resolve the issue or provide an appropriate replacement or refund.
        </p>
        <p>
          For any billing inquiries, reach out to us at <strong>support@studentpharma.in</strong>.
        </p>
      </div>
    </SiteLayout>
  );
}
