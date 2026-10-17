import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Mail, Phone, MapPin, Send } from "lucide-react";

export const Route = createFileRoute("/contact")({
  component: ContactPage,
});

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    toast.success("Message sent successfully! Our academic support team will contact you shortly.");
  };

  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Help & Support"
        title="Contact Student Pharma"
        description="Have questions about study notes, access, or suggestions for new subjects? Reach out to our academic team."
      />

      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-2">
          {/* Contact Details */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-foreground">Get in touch</h2>
            <p className="text-sm text-muted-foreground">
              We respond to student inquiries regarding syllabus notes, payments, and account queries within 24 hours.
            </p>

            <div className="space-y-4 text-sm text-foreground">
              <div className="flex items-center gap-3">
                <Mail className="size-5 text-primary" />
                <span>support@studentpharma.in</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="size-5 text-primary" />
                <span>+91 78010 64412</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="size-5 text-primary" />
                <span>Hyderabad, Telangana, India</span>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
            {submitted ? (
              <div className="py-10 text-center">
                <h3 className="text-lg font-bold text-success">Thank You!</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your message has been received. We will get back to you soon.
                </p>
                <Button className="mt-4" variant="outline" onClick={() => setSubmitted(false)}>
                  Send another message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Your Name</label>
                  <Input required placeholder="e.g. Rahul Sharma" className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Email Address</label>
                  <Input required type="email" placeholder="rahul@example.com" className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Subject / Query</label>
                  <Input required placeholder="e.g. Question about 3rd Sem Pharmacology notes" className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Message</label>
                  <Textarea required placeholder="How can we help you?" rows={4} className="mt-1" />
                </div>
                <Button type="submit" className="w-full">
                  <Send className="mr-2 size-4" /> Send Message
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
