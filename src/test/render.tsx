import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions, type RenderResult } from "@testing-library/react";
import React, { type ReactElement } from "react";

/**
 * Wrap a component in the same React Query provider the app uses, with retries
 * disabled so tests don't re-fire failing queries. Mirror this for other
 * providers (tRPC, theme) as needed.
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: RenderOptions,
): RenderResult {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
    options,
  );
}

export { QueryClient };
