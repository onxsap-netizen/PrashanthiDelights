import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/figtree";
import App from "./App";
import { StoreProvider } from "./lib/store";
import "./index.css";

const client = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <StoreProvider><App /></StoreProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
