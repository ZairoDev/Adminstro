"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import axios from "@/util/axios";
import Heading from "@/components/Heading";
import HandLoader from "@/components/HandLoader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MapPaymentModal from "../../_components/map-payment-modal";
import GenerateInvoiceModal from "../../_components/generate-invoice-modal";
import {
  formatDateTime,
  formatMoney,
  type FinanceTransaction,
  type WebhookLogRow,
  type FinanceInvoiceRow,
} from "../../_lib/types";
import { FileText, Send, ExternalLink, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const INVOICE_STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> =
  {
    generated: "default",
    sent: "secondary",
    failed: "destructive",
    superseded: "outline",
  };

const INVOICE_STATUS_LABEL: Record<string, string> = {
  not_generated: "No invoice",
  generated: "Invoice generated",
  sent: "Invoice sent",
  failed: "Send failed",
};

export default function TransactionDetailsClient() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const id = params?.id ?? "";
  const type = searchParams?.get("type") ?? "payment";

  const [data, setData] = useState<FinanceTransaction | null>(null);
  const [webhookHistory, setWebhookHistory] = useState<WebhookLogRow[]>([]);
  const [invoices, setInvoices] = useState<FinanceInvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapOpen, setMapOpen] = useState(false);
  const [genOpen, setGenOpen] = useState(false);
  const [sendingAll, setSendingAll] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await axios.get(`/api/finance/transaction/${id}`, {
        params: { type },
      });
      if (res.data.success) {
        setData(res.data.data);
        setWebhookHistory(res.data.webhookHistory ?? []);
        setInvoices(res.data.invoices ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [id, type]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSendAll = async () => {
    if (!data) return;
    setSendingAll(true);
    try {
      const { data: res } = await axios.post("/api/finance/send-invoice", {
        paymentId: data.paymentId ?? undefined,
        paymentLinkId: data.paymentLinkId ?? undefined,
      });
      if (res.success) {
        toast({ title: res.message ?? "Invoices sent" });
      } else {
        const failCount = res.results?.filter((r: { status: string }) => r.status === "failed").length ?? 0;
        toast({
          title: `${failCount} invoice(s) failed to send`,
          description: res.message,
          variant: "destructive",
        });
      }
      await load();
    } catch {
      toast({ title: "Failed to send invoices", variant: "destructive" });
    } finally {
      setSendingAll(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <HandLoader />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 space-y-4">
        <Heading heading="Transaction" subheading="Not found" />
        <Button asChild variant="outline">
          <Link href="/dashboard/finance/transactions">Back</Link>
        </Button>
      </div>
    );
  }

  const timeline = [
    { label: "Created (Razorpay)", at: data.createdAtRazorpay },
    { label: "Authorized", at: data.authorizedAt },
    { label: "Captured", at: data.capturedAt },
    { label: "Paid", at: data.paidAt },
    { label: "Failed", at: data.failedAt },
    { label: "Received in Adminstro", at: data.createdAt },
    { label: "Mapped", at: data.mappedAt },
  ].filter((t) => t.at);

  const canGenerate = data.mapped;
  const canSend =
    invoices.some((inv) => inv.status === "generated" || inv.status === "failed") &&
    data.invoiceStatus !== "not_generated";

  const activeInvoices = invoices.filter((inv) => inv.status !== "superseded");
  const supersededInvoices = invoices.filter((inv) => inv.status === "superseded");

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Heading
          heading="Transaction Details"
          subheading={data.paymentId || data.paymentLinkId || "Payment"}
        />
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/finance/transactions">Back</Link>
          </Button>
          <Button
            variant={data.mapped ? "secondary" : "default"}
            onClick={() => setMapOpen(true)}
          >
            {data.mapped ? "Remap Payment" : "Map Payment"}
          </Button>
          {canGenerate && (
            <Button
              variant="outline"
              onClick={() => setGenOpen(true)}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              {data.invoiceStatus === "not_generated" ? "Generate Invoice" : "Regenerate Invoice"}
            </Button>
          )}
          {canSend && (
            <Button
              onClick={() => void handleSendAll()}
              disabled={sendingAll}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              {sendingAll ? "Sending…" : "Send Invoice(s)"}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">General Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Status" value={<Badge>{data.status}</Badge>} />
            <Row label="Customer" value={data.customerName || "—"} />
            <Row label="Phone" value={data.customerPhone || "—"} />
            <Row label="Email" value={data.customerEmail || "—"} />
            <Row label="Amount" value={formatMoney(data.amount, data.currency)} />
            <Row label="Method" value={data.method || "—"} />
            <Row label="Payment ID" value={data.paymentId || "—"} mono />
            <Row label="Payment Link ID" value={data.paymentLinkId || "—"} mono />
            <Row label="Order ID" value={data.orderId || "—"} mono />
            <Row label="Last Event" value={data.lastEvent || "—"} />
            <Row label="Description" value={data.description || "—"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mapping Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row
              label="Mapped"
              value={
                data.mapped ? (
                  <Badge>Mapped</Badge>
                ) : (
                  <Badge variant="outline">Unmapped</Badge>
                )
              }
            />
            <Row label="Booking ID" value={data.bookingId || "—"} />
            <Row label="Guest" value={data.guestName || "—"} />
            <Row label="Guest Email" value={data.guestEmail || "—"} />
            <Row label="Mapped By" value={data.mappedByName || data.mappedBy || "—"} />
            <Row label="Mapped At" value={formatDateTime(data.mappedAt)} />
            {data.mappingHistory?.length > 0 && (
              <div className="pt-2 space-y-2">
                <div className="font-medium">Mapping history</div>
                {data.mappingHistory.map((h, i) => (
                  <div key={`${h.mappedAt}-${i}`} className="rounded border p-2 text-xs">
                    <div>
                      {h.mappedByName || h.mappedBy} · {formatDateTime(h.mappedAt)}
                    </div>
                    <div>
                      {h.previousBookingId || "—"} → {h.newBookingId || "—"}
                    </div>
                    {h.reason && <div>{h.reason}</div>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {timeline.length === 0 ? (
              <p className="text-muted-foreground">No timeline events</p>
            ) : (
              timeline.map((t) => (
                <Row key={t.label} label={t.label} value={formatDateTime(t.at)} />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment Metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Bank" value={data.bank || "—"} />
            <Row label="Wallet" value={data.wallet || "—"} />
            <Row label="UPI" value={data.upi || "—"} />
            <Row label="Fee" value={data.fee != null ? String(data.fee) : "—"} />
            <Row label="Tax" value={data.tax != null ? String(data.tax) : "—"} />
            <Row
              label="Net"
              value={
                data.netAmount != null ? formatMoney(data.netAmount, data.currency) : "—"
              }
            />
            <Row label="Source" value={data.source} />
            {data.shortUrl && (
              <Row
                label="Short URL"
                value={
                  <a
                    href={data.shortUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline"
                  >
                    Open link
                  </a>
                }
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Invoice Lifecycle Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Invoices</CardTitle>
            <div className="flex items-center gap-2">
              {data.invoiceStatus && (
                <Badge variant={INVOICE_STATUS_VARIANT[data.invoiceStatus] ?? "outline"}>
                  {INVOICE_STATUS_LABEL[data.invoiceStatus] ?? data.invoiceStatus}
                </Badge>
              )}
              {data.paymentClassification && (
                <Badge variant="secondary" className="capitalize">
                  {data.paymentClassification}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {!data.mapped && (
            <p className="text-muted-foreground">
              Map this payment to a booking first to generate invoices.
            </p>
          )}

          {data.mapped && data.invoiceStatus === "not_generated" && (
            <p className="text-muted-foreground">
              No invoices generated yet.{" "}
              <button
                className="text-primary underline"
                onClick={() => setGenOpen(true)}
              >
                Generate now
              </button>
            </p>
          )}

          {activeInvoices.length > 0 && (
            <div className="space-y-2">
              {activeInvoices.map((inv) => (
                <div key={inv.id} className="border rounded-md p-3 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-medium">{inv.invoiceNumber}</span>
                    <Badge variant={INVOICE_STATUS_VARIANT[inv.status] ?? "outline"} className="capitalize">
                      {inv.status}
                    </Badge>
                    <Badge variant="secondary" className="capitalize">{inv.classification}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>{inv.guestName || "—"} · {inv.guestEmail || "—"}</span>
                    <span className="font-medium text-foreground">
                      {inv.currency} {inv.amountBilled.toLocaleString()}
                    </span>
                    {inv.discountGiven != null && inv.discountGiven > 0 && (
                      <span className="text-green-700 dark:text-green-400">
                        Discount: {inv.currency} {inv.discountGiven}
                      </span>
                    )}
                    {inv.pendingAmount != null && inv.pendingAmount > 0 && (
                      <span className="text-amber-700 dark:text-amber-400">
                        Pending: {inv.currency} {inv.pendingAmount}
                      </span>
                    )}
                    {inv.emailedAt && <span>Sent: {formatDateTime(inv.emailedAt)}</span>}
                    {inv.emailError && (
                      <span className="text-destructive">Error: {inv.emailError}</span>
                    )}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <a
                      href={`/api/finance/invoice/${inv.invoiceNumber}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary underline"
                    >
                      <ExternalLink className="h-3 w-3" /> Preview PDF
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}

          {supersededInvoices.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                <RefreshCw className="h-3 w-3 inline mr-1" />
                {supersededInvoices.length} superseded invoice(s)
              </summary>
              <div className="mt-2 space-y-1 pl-4">
                {supersededInvoices.map((inv) => (
                  <div key={inv.id} className="flex items-center gap-2 text-muted-foreground line-through">
                    <span className="font-mono">{inv.invoiceNumber}</span>
                    <span className="capitalize">{inv.classification}</span>
                    <span>{inv.currency} {inv.amountBilled}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Webhook History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {webhookHistory.length === 0 ? (
            <p className="text-muted-foreground">No related webhook logs</p>
          ) : (
            webhookHistory.map((log) => (
              <div key={log.id} className="rounded border p-3">
                <div className="flex flex-wrap gap-2 items-center">
                  <Badge variant="secondary">{log.event || "unknown"}</Badge>
                  <Badge variant="outline">{log.status}</Badge>
                  <span className="text-muted-foreground">
                    {formatDateTime(log.receivedAt)}
                  </span>
                  <span>
                    Signature: {log.signatureVerified ? "verified" : "no"}
                  </span>
                </div>
                {log.error && (
                  <p className="text-destructive text-xs mt-1">{log.error}</p>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Raw Razorpay Data</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs overflow-x-auto rounded bg-muted p-3 max-h-96">
            {JSON.stringify(data.rawPayload ?? data.notes ?? {}, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <MapPaymentModal
        open={mapOpen}
        onOpenChange={setMapOpen}
        transaction={data}
        onMapped={() => void load()}
      />

      {data && (
        <GenerateInvoiceModal
          open={genOpen}
          onOpenChange={setGenOpen}
          paymentId={data.paymentId}
          paymentLinkId={data.paymentLinkId}
          bookingId={data.bookingId}
          currency={data.currency}
          paymentAmount={data.amount}
          invoiceStatus={data.invoiceStatus ?? "not_generated"}
          onGenerated={(newInvoices) => {
            setInvoices(newInvoices);
            void load();
          }}
        />
      )}
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex gap-3 justify-between">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={`text-right break-all ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </span>
    </div>
  );
}
