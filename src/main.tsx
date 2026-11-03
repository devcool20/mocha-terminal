import React from "react";
import ReactDOM from "react-dom/client";
import { lazy, Suspense, useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig, LazyMotion } from "motion/react";
const features = () => import("./motion-features").then((m) => m.default);
const App = lazy(() => import("./App"));
import Landing from "./Landing";
import { ErrorBoundary } from "./ErrorBoundary";
import "./style.css";
import "./landing.css";
if (new URLSearchParams(location.search).get("embed") === "1") document.documentElement.classList.add("embedded-terminal");
const client = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false } },
});

function Surface() {
  const [terminal, setTerminal] = useState(() => location.pathname.startsWith("/terminal"));

  useEffect(() => {
    const sync = () => setTerminal(location.pathname.startsWith("/terminal"));
    addEventListener("popstate", sync);
    return () => removeEventListener("popstate", sync);
  }, []);

  const openTerminal = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    history.pushState({}, "", "/terminal");
    setTerminal(true);
    window.scrollTo(0, 0);
  };

  return terminal ? (
    <Suspense fallback={<div className="route-loading" aria-label="Loading Practice Lab" />}>
      <App />
    </Suspense>
  ) : (
    <Landing onOpen={openTerminal} />
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={client}>
        <MotionConfig reducedMotion="user">
          <LazyMotion features={features}>
            <Surface />
          </LazyMotion>
        </MotionConfig>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
