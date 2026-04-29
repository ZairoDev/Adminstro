"use client";

import { useState } from "react";
import { ShieldCheck, TrendingUp } from "lucide-react";

import { useAuthStore } from "@/AuthStore";
import { IQuery } from "@/util/type";
import { Toaster } from "@/components/ui/toaster";
import { Badge } from "@/components/ui/badge";
import CompareTable from "./compareTable";

export const CompareLeadsPage = () => {
  const { token } = useAuthStore();
  const [queries, setQueries] = useState<IQuery[]>([]);

  const isLeadGen = token?.role === "LeadGen";

  return (
    <div className="w-full min-h-screen bg-background">
      <Toaster />
      <div className="max-w-[1800px] mx-auto px-3 sm:px-4 lg:px-6 py-4 space-y-4">
        <div className="rounded-xl border bg-card/70 backdrop-blur-sm p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
                Compare Leads
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Analyze daily and monthly lead quality with clear performance breakdowns.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                Performance Overview
              </Badge>
              {isLeadGen && (
                <Badge variant="outline" className="gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Restricted to your data
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card overflow-hidden">
          <CompareTable queries={queries} setQueries={setQueries} />
        </div>
      </div>
    </div>
  );
};
