import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { RenderOptions } from "@testing-library/react";
import { render as rtlRender } from "@testing-library/react";
import type { ReactNode } from "react";

/** Render with an isolated QueryClient so cached state never leaks between tests. */
export function renderWithQueryClient(ui: ReactNode, options?: Omit<RenderOptions, "wrapper">) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const result = rtlRender(ui, {
    ...options,
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });

  return { ...result, queryClient };
}
