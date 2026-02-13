import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { onCLS, onINP, onFCP, onLCP, onTTFB } from "web-vitals";
import App from "./App.tsx";
import "./index.css";
import { queryClient } from "./lib/query-client";

// Web Vitals Tracking
function sendToAnalytics(metric: any) {
  // Log to console in development
  if (import.meta.env.DEV) {
    console.log(`[Web Vitals] ${metric.name}:`, {
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
    });
  }

  // TODO: Send to analytics service in production
  // Example: analytics.track('web-vital', metric);
}

// Track Core Web Vitals
onCLS(sendToAnalytics);
onINP(sendToAnalytics); // Replaced FID with INP in web-vitals v5
onFCP(sendToAnalytics);
onLCP(sendToAnalytics);
onTTFB(sendToAnalytics);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>,
);
