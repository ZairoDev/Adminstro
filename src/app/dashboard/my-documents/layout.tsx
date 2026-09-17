import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default function MyDocumentsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
