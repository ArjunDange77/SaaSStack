import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    mutations: {
      onError: () => {
        /* per-mutation toasts handle user feedback */
      },
    },
  },
});
