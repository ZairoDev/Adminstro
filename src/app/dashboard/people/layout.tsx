"use client";

import { usePathname } from "next/navigation";

export default function PeopleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isList = pathname === "/dashboard/people";

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto">
        {isList ? (
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">People</h1>
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}
