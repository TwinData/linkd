import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import Transactions from "./pages/Transactions";
import FloatDeposits from "./pages/FloatDeposits";
import Promotions from "./pages/Promotions";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AuditLogs from "./pages/AuditLogs";

import Settings from "./pages/Settings";
import Users from "./pages/Users";

import Reports from "./pages/Reports";
import AppLayout from "@/layouts/AppLayout";
import { AuthProvider } from "@/context/AuthProvider";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard" element={<AppLayout><Dashboard /></AppLayout>} />
            <Route path="/clients" element={<AppLayout><Clients /></AppLayout>} />
            <Route path="/clients/:clientId" element={<AppLayout><ClientDetail /></AppLayout>} />
            <Route path="/transactions" element={<AppLayout><Transactions /></AppLayout>} />
            <Route path="/float-deposits" element={<AppLayout><FloatDeposits /></AppLayout>} />
            <Route path="/promotions" element={<AppLayout><Promotions /></AppLayout>} />
            
            <Route path="/settings" element={<AppLayout><Settings /></AppLayout>} />
            <Route path="/users" element={<AppLayout><Users /></AppLayout>} />
            <Route path="/reports" element={<AppLayout><Reports /></AppLayout>} />
            <Route path="/audit-logs" element={<AppLayout><AuditLogs /></AppLayout>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
