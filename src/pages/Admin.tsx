import { AdminLayout } from "@/components/admin/AdminLayout";
import { Routes, Route } from "react-router-dom";
import AdminDashboard from "@/components/admin/AdminDashboard";
import AdminProducts from "@/components/admin/AdminProducts";
import AdminRegistrations from "@/components/admin/AdminRegistrations";
import AdminResources from "@/components/admin/AdminResources";
import AdminEmails from "@/components/admin/AdminEmails";
import AdminSiteContent from "@/components/admin/AdminSiteContent";
import AdminCategories from "@/components/admin/AdminCategories";
import AdminPromoCodes from "@/components/admin/AdminPromoCodes";
import AdminMentorMessages from "@/components/admin/AdminMentorMessages";
import AdminFormations from "@/components/admin/AdminFormations";

export default function Admin() {
  return (
    <AdminLayout>
      <Routes>
        <Route index element={<AdminDashboard />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="formations" element={<AdminFormations />} />
        <Route path="registrations" element={<AdminRegistrations />} />
        <Route path="resources" element={<AdminResources />} />
        <Route path="emails" element={<AdminEmails />} />
        <Route path="site-content" element={<AdminSiteContent />} />
        <Route path="categories" element={<AdminCategories />} />
        <Route path="promo-codes" element={<AdminPromoCodes />} />
        <Route path="mentor" element={<AdminMentorMessages />} />
      </Routes>
    </AdminLayout>
  );
}
