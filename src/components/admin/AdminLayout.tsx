import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LayoutDashboard, Package, Users, FolderOpen, Mail, LogOut, Home, FileText, Tags, Ticket, MessageCircle, GraduationCap } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Tableau de bord", path: "/admin", icon: LayoutDashboard },
  { label: "Produits", path: "/admin/products", icon: Package },
  { label: "Formations", path: "/admin/formations", icon: GraduationCap },
  { label: "Inscriptions", path: "/admin/registrations", icon: Users },
  { label: "Ressources", path: "/admin/resources", icon: FolderOpen },
  { label: "Emails", path: "/admin/emails", icon: Mail },
  { label: "Catégories", path: "/admin/categories", icon: Tags },
  { label: "Codes promo", path: "/admin/promo-codes", icon: Ticket },
  { label: "Mentor", path: "/admin/mentor", icon: MessageCircle },
  { label: "Page d'accueil", path: "/admin/site-content", icon: FileText },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { signOut, user } = useAuth();
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-border bg-[#EDEAE2] dark:bg-[#060610]">
        <div className="flex h-16 items-center gap-2 border-b border-border px-6">
          <span className="text-lg font-bold text-foreground">
            Ziz<span className="text-primary">creatif</span>
          </span>
          <span className="text-xs text-muted-foreground font-light">.dev</span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.path !== "/admin" && location.pathname.startsWith(item.path));
            const isExactDashboard = item.path === "/admin" && location.pathname === "/admin";
            const active = item.path === "/admin" ? isExactDashboard : isActive;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-primary/5 hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-border p-3 space-y-2">
          <NavLink
            to="/"
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
      </aside>

      {/* Main content */}
      <main className="ml-60 flex-1 min-h-screen">
        <div className="flex h-16 items-center justify-end border-b border-border px-6">
          <ThemeToggle />
        </div>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
