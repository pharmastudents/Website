import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import {
  CreditCard,
  ShieldCheck,
  Lock,
  Save,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Key,
} from "lucide-react";

export const Route = createFileRoute("/admin/settings/payment")({
  component: AdminPaymentSettingsPage,
});

export default function AdminPaymentSettingsPage() {
  const { db, setPaymentGateway } = useStore();

  const [gateway, setGateway] = useState<"razorpay" | "stripe">(db.paymentGateway?.gateway || "razorpay");
  const [keyId, setKeyId] = useState(db.paymentGateway?.keyId || "rzp_test_pharma_2026_demo");
  const [secretKey, setSecretKey] = useState("••••••••••••••••••••••••");
  const [webhookSecret, setWebhookSecret] = useState("whsec_••••••••••••••••");
  const [currency, setCurrency] = useState(db.paymentGateway?.currency || "INR");
  const [mode, setMode] = useState<"test" | "live">(db.paymentGateway?.mode || "test");
  const [status, setStatus] = useState<"active" | "inactive">(db.paymentGateway?.status || "active");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    setPaymentGateway({
      gateway,
      keyId: keyId.trim(),
      currency,
      mode,
      status,
      secretKeyConfigured: true,
      webhookConfigured: true,
    });

    toast.success("Payment gateway configuration saved securely.");
  };

  return (
    <AdminLayout
      title="Payment Gateway Integration"
      subtitle="Configure online checkout payment processors (Razorpay / Stripe) and API credentials."
      actions={
        <Button asChild variant="outline" size="sm">
          <Link to="/admin/settings">
            <ArrowLeft className="mr-1.5 size-4" /> Back to Settings
          </Link>
        </Button>
      }
    >
      <div className="mx-auto max-w-3xl">
        <form onSubmit={handleSave} className="space-y-8">
          {/* Security Notice */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 text-xs text-muted-foreground space-y-2">
            <div className="flex items-center gap-2 font-bold text-primary">
              <ShieldCheck className="size-4" /> Secure Payment Architecture
            </div>
            <p>
              Private API Secret Keys and Webhook signing secrets are stored strictly in server-side environment variables and vault storage. The public client only ever receives the public Key ID and session tokens.
            </p>
          </div>

          {/* Gateway Provider Selection */}
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xs space-y-5">
            <h2 className="text-base font-bold text-foreground">1. Primary Gateway Provider</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <label
                className={`flex cursor-pointer items-center justify-between rounded-2xl border p-5 transition-colors ${
                  gateway === "razorpay" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="gateway_provider"
                    checked={gateway === "razorpay"}
                    onChange={() => setGateway("razorpay")}
                  />
                  <div>
                    <p className="text-sm font-bold text-foreground">Razorpay</p>
                    <p className="text-[11px] text-muted-foreground">UPI, RuPay, Indian NetBanking</p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-[10px]">
                  India Standard
                </Badge>
              </label>

              <label
                className={`flex cursor-pointer items-center justify-between rounded-2xl border p-5 transition-colors ${
                  gateway === "stripe" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="gateway_provider"
                    checked={gateway === "stripe"}
                    onChange={() => setGateway("stripe")}
                  />
                  <div>
                    <p className="text-sm font-bold text-foreground">Stripe</p>
                    <p className="text-[11px] text-muted-foreground">International Cards & Multi-Currency</p>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* API Credentials */}
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xs space-y-5">
            <h2 className="text-base font-bold text-foreground">2. API Keys & Webhooks</h2>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">
                Public Key ID *
              </label>
              <Input
                required
                value={keyId}
                onChange={(e) => setKeyId(e.target.value)}
                placeholder={gateway === "razorpay" ? "rzp_test_..." : "pk_test_..."}
                className="mt-1.5 h-11 font-mono text-xs"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-muted-foreground">Secret Key *</label>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Lock className="size-3" /> Encrypted Vault
                </span>
              </div>
              <Input
                type="password"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder="Enter secret key to update"
                className="mt-1.5 h-11 font-mono text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">Webhook Secret</label>
              <Input
                type="password"
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                placeholder="whsec_..."
                className="mt-1.5 h-11 font-mono text-xs"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Default Currency</label>
                <Input
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  placeholder="INR"
                  className="mt-1.5 h-11 uppercase"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Environment Mode</label>
                <select
                  aria-label="Environment Mode"
                  value={mode}
                  onChange={(e) => setMode(e.target.value as any)}
                  className="mt-1.5 h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus:ring-2 focus:ring-primary"
                >
                  <option value="test">Test / Sandbox Mode</option>
                  <option value="live">Live Production Mode</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">Gateway Status</label>
              <div className="mt-2 flex items-center gap-6 text-xs font-semibold">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="gwStatus"
                    checked={status === "active"}
                    onChange={() => setStatus("active")}
                  />
                  <span>Active & Accepting Orders</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="gwStatus"
                    checked={status === "inactive"}
                    onChange={() => setStatus("inactive")}
                  />
                  <span>Disabled</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button asChild variant="outline" size="lg">
              <Link to="/admin">Cancel</Link>
            </Button>
            <Button type="submit" size="lg" className="px-8 font-bold">
              <Save className="mr-2 size-5" /> Save Gateway Settings
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
