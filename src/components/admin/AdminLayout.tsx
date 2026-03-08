import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Package, Users, FolderOpen, Mail, LogOut,
  Home, FileText, Tags, Ticket, MessageCircle, GraduationCap,
  Smartphone, TrendingUp, Menu, X, CalendarHeart,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Tableau de bord", path: "/admin", icon: LayoutDashboard },
  { label: "Produits", path: "/admin/products", icon: Package },
  { label: "Formations", path: "/admin/formations", icon: GraduationCap },
  { label: "Activités", path: "/admin/activites", icon: CalendarHeart },
  { label: "Inscriptions", path: "/admin/registrations", icon: Users },
  { label: "Comptabilité", path: "/admin/comptabilite", icon: TrendingUp },
  { label: "Modes de paiement", path: "/admin/payment-settings", icon: Smartphone },
  { label: "Ressources", path: "/admin/resources", icon: FolderOpen },
  { label: "Emails", path: "/admin/emails", icon: Mail },
  { label: "Catégories", path: "/admin/categories", icon: Tags },
  { label: "Codes promo", path: "/admin/promo-codes", icon: Ticket },
  { label: "Mentor", path: "/admin/mentor", icon: MessageCircle },
  { label: "Page d'accueil", path: "/admin/site-content", icon: FileText },
];

function SidebarContent({
  location,
  signOut,
  user,
  onClose,
}: {
  location: { pathname: string };
  signOut: () => void;
  user: any;
  onClose: () => void;
}) {
  return (
    <>
      <div className="flex h-16 items-center gap-2 border-b border-border px-6 shrink-0">
        <span className="text-lg font-bold text-foreground">
          Ziz<span className="text-primary">creatif</span>
        </span>
        <span className="text-xs text-muted-foreground font-light">.dev</span>
        <button
          className="ml-auto lg:hidden p-1 text-muted-foreground hover:text-foreground rounded"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            item.path === "/admin"
              ? location.pathname === "/admin"
              : location.pathname === item.path ||
                (item.path !== "/admin" && location.pathname.startsWith(item.path));

          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-primary/5 hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-border p-3 space-y-2 shrink-0">
        <NavLink
          to="/"
          onClick={onClose}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <Home className="h-4 w-4" />
          Page d'accueil
        </NavLink>
        <p className="truncate px-3 text-xs text-muted-foreground">{user?.email}</p>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </button>
      </div>
    </>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { signOut, user } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const sharedProps = {
    location,
    signOut,
    user,
    onClose: () => setSidebarOpen(false),
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* ── Desktop sidebar (always visible ≥ lg) ── */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-60 flex-col border-r border-border bg-[#EDEAE2] dark:bg-[#060610]">
        <SidebarContent {...sharedProps} />
      </aside>

      {/* ── Mobile: backdrop ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Mobile: sidebar drawer ── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-[#EDEAE2] dark:bg-[#060610] transition-transform duration-300 ease-in-out lg:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent {...sharedProps} />
      </aside>

      {/* ── Main content ── */}
      <main className="lg:ml-60 flex-1 min-h-screen w-full overflow-x-hidden">
        <div className="flex h-16 items-center justify-between border-b border-border px-4 lg:px-6">
          {/* Hamburger mobile */}
          <button
            className="lg:hidden flex items-center gap-2 rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            onClick={() => setSidebarOpen(true)}
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden lg:block" />
          <ThemeToggle />
        </div>
        <div className="p-4 lg:p-6">{children}</div>
      </main>
    </div>
  );
}
