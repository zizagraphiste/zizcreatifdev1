import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute, AdminRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Admin from "./pages/Admin";
import Member from "./pages/Member";
import MemberProduct from "./pages/MemberProduct";
import MemberProfile from "./pages/MemberProfile";
import ResetPassword from "./pages/ResetPassword";
import Payment from "./pages/Payment";
import ProductPage from "./pages/ProductPage";
import NotFound from "./pages/NotFound";
import Ticket from "./pages/Ticket";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/payment/:registrationId" element={<Payment />} />
            <Route path="/product/:productId" element={<ProductPage />} />
            <Route path="/p/:slug" element={<ProductPage />} />
            <Route
              path="/admin/*"
              element={
                <AdminRoute>
                  <Admin />
                </AdminRoute>
              }
            />
            <Route
              path="/member"
              element={
                <ProtectedRoute>
                  <Member />
                </ProtectedRoute>
              }
            />
            <Route
              path="/member/:productId"
              element={
                <ProtectedRoute>
                  <MemberProduct />
                </ProtectedRoute>
              }
            />
            <Route
              path="/member/profile"
              element={
                <ProtectedRoute>
                  <MemberProfile />
                </ProtectedRoute>
              }
            />
            <Route path="/ticket/:registrationId" element={<Ticket />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
