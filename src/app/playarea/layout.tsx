// File: app/playarea/layout.tsx

import { ApolloWrapper } from "@/components/playcomponent/ApolloWrapper";

export default function PlayAreaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ApolloWrapper>{children}</ApolloWrapper>;
}
