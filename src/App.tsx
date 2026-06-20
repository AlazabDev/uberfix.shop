import { Suspense, lazy, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { publicRoutes } from "./routes/publicRoutes.config";
import { protectedRoutes } from "./routes/routes.config";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { ScrollToTop } from "@/components/ScrollToTop";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import AppErrorBoundary from "@/components/error-boundaries/AppErrorBoundary";
import { AuthProvider } from "@/contexts/AuthContext";
import { UFBotWidget } from "@/components/ufbot/UFBotWidget";

import "./index.css";

const MetaReviewCenter = lazy(() => import("@/pages/admin/MetaReviewCenter"));

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-muted-foreground text-sm">جاري التحميل...</p>
    </div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

// Hydration-safe App wrapper
function AppContent() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Show minimal loading state until client is mounted
  if (!mounted) {
    return <PageLoader />;
  }

  return (
    <BrowserRouter>
      <AuthProvider>
        <ScrollToTop />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/meta-review" element={<MetaReviewCenter />} />
            <Route path="/admin/meta-review" element={<MetaReviewCenter />} />

            {/* Public Routes - لا تتطلب تسجيل دخول */}
            {publicRoutes.map((route) => (
              <Route key={route.path} path={route.path} element={route.element} />
            ))}
            
            {/* Protected Routes - تتطلب تسجيل دخول */}
            {protectedRoutes.map((route) => (
              <Route
                key={route.path}
                path={route.path}
                element={
                  <ProtectedRoute withLayout={route.withLayout}>
                    {route.element}
                  </ProtectedRoute>
                }
              />
            ))}
          </Routes>
        </Suspense>
        <UFBotWidget />
      </AuthProvider>
    </BrowserRouter>
  );
}

function App() {
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <TooltipProvider>
            <AppContent />
            <Toaster />
            <Sonner />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}

export default App;
