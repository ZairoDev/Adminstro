"use client";
import { ApolloClient, ApolloProvider, InMemoryCache } from "@apollo/client";
import { useState } from "react";

export function ApolloWrapper({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    new ApolloClient({
      uri: "/api/playarea/graphql",
      cache: new InMemoryCache(),
    })
  );

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
