import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminProfile } from "@/contexts/AdminProfileContext";
import {
  LayoutDashboard, Package, Users, FolderOpen, Mail, LogOut,
  Home, FileText, Tags, Ticket, MessageCircle, GraduationCap,
  Smartphone, TrendingUp, Menu, X, CalendarHeart, ChevronLeft, ChevronRight,
  UserCheck, CreditCard, BellRing,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AvatarCircle } from "@/components/ui/AvatarCircle";
import { NotificationBell } from "@/components/admin/NotificationBell";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Tableau de bord", path: "/admin", icon: LayoutDashboard },
  // ── Contenu ──
  { label: "Produits", path: "/admin/products", icon: Package },
  { label: "Formations", path: "/admin/formations", icon: GraduationCap },
  { label: "Activités", path: "/admin/activites", icon: CalendarHeart },
  // ── Communauté ──
  { label: "Utilisateurs", path: "/admin/users", icon: UserCheck },
  { label: "Réservations & Paiements", path: "/admin/registrations", icon: CreditCard },
  { label: "Liste d'attente", path: "/admin/waitlist", icon: BellRing },
  { label: "Comptabilité", path: "/admin/comptabilite", icon: TrendingUp },
  // ── Relation ──
  { label: "Mentor", path: "/admin/mentor", icon: MessageCircle },
  { label: "Emails", path: "/admin/emails", icon: Mail },
  // ── Paramètres ──
  { label: "Ressources", path: "/admin/resources", icon: FolderOpen },
  { label: "Modes de paiement", path: "/admin/payment-settings", icon: Smartphone },
  { label: "Catégories", path: "/admin/categories", icon: Tags },
  { label: "Codes promo", path: "/admin/promo-codes", icon: Ticket },
  { label: "Page d'accueil", path: "/admin/site-content", icon: FileText },
];

type AdminProfile = { full_name: string | null; avatar_url: string | null };

function SidebarContent({
  location,
  signOut,
  user,
  adminProfile,
  onClose,
  collapsed,
  onToggleCollapse,
}: {
  location: { pathname: string };
  signOut: () => void;
  user: any;
  adminProfile: AdminProfile | null;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  return (
    <>
      {/* Header */}
      <div className={cn(
        "flex h-16 items-center border-b border-border shrink-0",
        collapsed ? "justify-center px-2" : "gap-2 px-6"
      )}>
        {!collapsed && (
          <>
            <span className="text-lg font-bold text-foreground">
              Ziz<span className="text-primary">creatif</span>
            </span>
            <span className="text-xs text-muted-foreground font-light">.dev</span>
          </>
        )}
        {collapsed && (
          <span className="text-lg font-bold text-primary">Z</span>
        )}
        <button className="ml-auto lg:hidden p-1 text-muted-foreground hover:text-foreground rounded" onClick={onClose}>
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className={cn("flex-1 space-y-1 py-4 overflow-y-auto", collapsed ? "px-2" : "px-3")}>
        {navItems.map((item) => {
          const isActive = item.path === "/admin"
            ? location.pathname === "/admin"
            : location.pathname === item.path || (item.path !== "/admin" && location.pathname.startsWith(item.path));
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center rounded-lg py-2.5 text-sm font-medium transition-colors",
                collapsed ? "justify-center px-2" : "gap-3 px-3",
                isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-primary/5 hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={cn("border-t border-border p-3 space-y-2 shrink-0", collapsed && "flex flex-col items-center")}>
        <NavLink
          to="/"
          onClick={onClose}
          title={collapsed ? "Page d'accueil" : undefined}
          className={cn(
            "flex items-center rounded-lg py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors",
            collapsed ? "justify-center px-2 w-full" : "gap-3 px-3 w-full"
          )}
        >
          <Home className="h-4 w-4" />
          {!collapsed && "Page d'accueil"}
        </NavLink>

        {!collapsed && (
          <NavLink
            to="/admin/profile"
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors group w-full",
                isActive ? "bg-primary/10 ring-1 ring-primary/20" : "hover:bg-muted/60"
              )
            }
          >
            <AvatarCircle name={adminProfile?.full_name || user?.email} avatarUrl={adminProfile?.avatar_url} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{adminProfile?.full_name || "Admin"}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
            </div>
            <span className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-xs">✎</span>
          </NavLink>
        )}

        {collapsed && (
          <NavLink
            to="/admin/profile"
            onClick={onClose}
            title="Mon profil"
            className="flex justify-center w-full py-2"
          >
            <AvatarCircle name={adminProfile?.full_name || user?.email} avatarUrl={adminProfile?.avatar_url} size="sm" />
          </NavLink>
        )}

        <button
          onClick={signOut}
          title={collapsed ? "Déconnexion" : undefined}
          className={cn(
            "flex items-center rounded-lg py-2.5 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors w-full",
            collapsed ? "justify-center px-2" : "gap-3 px-3"
          )}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && "Déconnexion"}
        </button>

        {/* Toggle collapse — desktop only */}
        <button
          onClick={onToggleCollapse}
          className={cn(
            "hidden lg:flex items-center rounded-lg py-2 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors w-full",
            collapsed ? "justify-center px-2" : "gap-2 px-3"
          )}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <><ChevronLeft className="h-4 w-4" /><span>Réduire</span></>}
        </button>
      </div>
    </>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { signOut, user } = useAuth();
  const { adminProfile } = useAdminProfile();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("admin-sidebar-collapsed") === "true"; } catch { return false; }
  });

  const toggleCollapse = () => {
    setCollapsed((v) => {
      const next = !v;
      try { localStorage.setItem("admin-sidebar-collapsed", String(next)); } catch {}
      return next;
    });
  };

  const sharedProps = {
    location,
    signOut,
    user,
    adminProfile,
    onClose: () => setSidebarOpen(false),
    collapsed,
    onToggleCollapse: toggleCollapse,
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className={cn(
        "hidden lg:flex fixed inset-y-0 left-0 z-40 flex-col border-r border-border bg-[#EDEAE2] dark:bg-[#060610] transition-all duration-300",
        collapsed ? "w-16" : "w-60"
      )}>
        <SidebarContent {...sharedProps} />
      </aside>

      {/* Mobile: backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Mobile: sidebar drawer */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-[#EDEAE2] dark:bg-[#060610] transition-transform duration-300 ease-in-out lg:hidden",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <SidebarContent {...sharedProps} collapsed={false} onToggleCollapse={() => {}} />
      </aside>

      {/* Main content */}
      <main className={cn(
        "flex-1 min-h-screen w-full overflow-x-hidden transition-all duration-300",
        collapsed ? "lg:ml-16" : "lg:ml-60"
      )}>
        <div className="flex h-16 items-center justify-between border-b border-border px-4 lg:px-6">
          <button
            className="lg:hidden flex items-center gap-2 rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3">
            <NotificationBell />
            <ThemeToggle />
            <NavLink
              to="/admin/profile"
              className="hidden lg:flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-muted/60 transition-colors"
            >
              <AvatarCircle name={adminProfile?.full_name || user?.email} avatarUrl={adminProfile?.avatar_url} size="sm" />
              {!collapsed && (
                <span className="text-sm text-muted-foreground font-medium hidden xl:block">
                  {adminProfile?.full_name || "Admin"}
                </span>
              )}
            </NavLink>
          </div>
        </div>
        <div className="p-4 lg:p-6">{children}</div>
      </main>
    </div>
  );
}
