"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Singleton QueryClient — created once outside the component so it is
 * stable across React re-renders without needing useRef.
 */
let browserQueryClient: QueryClient | undefined;

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,       // 30 s
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}

function getQueryClient() {
  if (typeof window === "undefined") {
    // Server: always make a new client (no singleton on server)
    return makeQueryClient();
  }
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

export default function QueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // useState ensures the client is only created once per component mount
  const [queryClient] = useState(getQueryClient);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
