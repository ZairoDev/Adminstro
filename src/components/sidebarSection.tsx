"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { JSX } from "react";
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

type Route = {
  path: string;
  label: string;
  Icon?: JSX.Element;
};

export default function SidebarSection({
  title,
  routes,
  showText = true,
  currentPath,
  defaultOpen = false,
  onNavigate,
}: {
  title: string;
  routes: Route[];
  showText?: boolean;
  currentPath: string;
  defaultOpen?: boolean;
  onNavigate?: () => void;
}) {
  const hasActive = routes.some((r) => r.path === currentPath);
  const [open, setOpen] = useState<boolean>(defaultOpen || hasActive);

  if (!routes || routes.length === 0) return null;

  // When collapsed (showText=false), always render the items (icon-only). We hide the section header.
  const expanded = showText ? open : true;

  return (
    <section className="mt-4">
      {showText && (
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center text-sm justify-between w-full px-4 py-2 font-semibold text-muted-foreground hover:text-foreground"
          aria-expanded={open}
          aria-controls={`section-${title}`}
        >
          <span>{title}</span>
          <span>
            {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </span>
        </button>
      )}

      {expanded && (
        <ul
          id={`section-${title}`}
          className={cn("overflow-y-auto", showText ? "pl-2" : "")}
        >
          {routes.map(({ path, label, Icon }) => {
            const active = currentPath === path;
            return (
              <li key={path}>
                <Link
                  href={path}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-2 py-2 px-3 rounded-l-sm transition-colors",
                    active
                      ? "bg-primary/10 text-primary border-r-4 border-primary"
                      : "hover:bg-accent"
                  )}
                >
                  {Icon}
                  {showText && <span className="text-sm">{label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
