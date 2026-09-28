"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { QueryProvider } from "@/providers/QueryProvider";

export default function HousingSagaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const isLoginPage = pathname === "/housingsaga/login";

  if (isLoginPage) {
    return <QueryProvider>{children}</QueryProvider>;
  }

  return (
    <QueryProvider>
      <div className="flex min-h-screen w-full">
        <div className={collapsed ? "w-16" : "w-64"}>
          <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
        </div>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </QueryProvider>
  );
}
