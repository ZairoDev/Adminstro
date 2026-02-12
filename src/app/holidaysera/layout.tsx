 "use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/sidebar";

export default function HolidayLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="flex min-h-screen w-full">
      <div className={collapsed ? "w-16" : "w-64"}>
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      </div>

      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}

