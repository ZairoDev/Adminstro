"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import axios from "@/util/axios";
import Heading from "@/components/Heading";
import HandLoader from "@/components/HandLoader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatMoney } from "./_lib/types";

type OverviewData = {
  todayCollection: number;
  weekCollection: number;
  monthCollection: number;
  pendingMapping: number;
  mapped: number;
  failedPayments: number;
  refunded: number;
  revenue: number;
  totalPayments: number;
};

export default function FinanceOverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/finance/overview");
      if (res.data.success) setData(res.data.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const cards: { label: string; value: string | number }[] = data
    ? [
        { label: "Today's Collection", value: formatMoney(data.todayCollection) },
        { label: "This Week", value: formatMoney(data.weekCollection) },
        { label: "This Month", value: formatMoney(data.monthCollection) },
        { label: "Pending Mapping", value: data.pendingMapping },
        { label: "Mapped", value: data.mapped },
        { label: "Failed Payments", value: data.failedPayments },
        { label: "Refunded", value: data.refunded },
        { label: "Revenue", value: formatMoney(data.revenue) },
      ]
    : [];

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Heading
          heading="Finance Overview"
          subheading="Razorpay collections and mapping status"
        />
        <div className="flex gap-2">
          <Button asChild variant="secondary">
            <Link href="/dashboard/finance/transactions">Transactions</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/finance/webhook-logs">Webhook Logs</Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <HandLoader />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <Card key={card.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{card.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
