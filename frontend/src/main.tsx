import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { AuthProvider } from "./auth/AuthContext";
import { queryClient } from "./lib/queryClient";
import { TenantScopeSync } from "./components/tenant/TenantScopeSync";
import { AuthToastListener } from "./components/auth/AuthToastListener";
import { ToastProvider } from "./components/ui/ToastProvider";
import "./styles/tokens.css";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <TenantScopeSync />
          <AuthToastListener />
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
