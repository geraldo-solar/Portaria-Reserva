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
import PublicTicket from "./pages/PublicTicket";
import { useEffect, useState } from "react";

// Auth Context
import { createContext, useContext, ReactNode } from "react";

interface AuthContextType {
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const login = () => setIsAuthenticated(true);
  const logout = () => setIsAuthenticated(false);

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    if (window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
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
      <Route path={"/ticket/:token"} component={PublicTicket} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Force unregister any existing service workers to clear stale cache
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister().then(() => {
            console.log('Service Worker unregistered');
          });
        }
      });
    }
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <OfflineIndicator />
          <AuthProvider>
            <Router />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
