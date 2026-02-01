import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { OfflineIndicator } from "./components/OfflineIndicator";
import Login from "./pages/Login";
import Home from "./pages/Home";
import SellTicket from "./pages/SellTicket";
import CancelTicket from "./pages/CancelTicket";
import Dashboard from "./pages/Dashboard";
import Reports from "./pages/Reports";
import ManageProducts from "./pages/ManageProducts";
import Scanner from "./pages/Scanner";
import { useEffect, useState } from "react";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = localStorage.getItem("portaria_authenticated");
    setIsAuthenticated(auth === "true");
    setLoading(false);
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  if (!isAuthenticated) {
    window.location.href = "/login";
    return null;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path={"/login"} component={Login} />
      <Route path={"/"} component={() => <ProtectedRoute component={Home} />} />
      <Route path={"/sell"} component={() => <ProtectedRoute component={SellTicket} />} />
      <Route path={"/cancel"} component={() => <ProtectedRoute component={CancelTicket} />} />
      <Route path={"/dashboard"} component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path={"/reports"} component={() => <ProtectedRoute component={Reports} />} />
      <Route path={"/products"} component={() => <ProtectedRoute component={ManageProducts} />} />
      <Route path={"/scanner"} component={() => <ProtectedRoute component={Scanner} />} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Registrar service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service Worker registered:', registration);
        })
        .catch((error) => {
          console.error('[PWA] Service Worker registration failed:', error);
        });
    }
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <OfflineIndicator />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
