import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="text-center space-y-6 max-w-md">
        <div className="text-8xl font-black text-primary">404</div>
        <h1 className="text-2xl font-bold text-foreground">Page introuvable</h1>
        <p className="text-muted-foreground">
          La page <code className="text-sm bg-muted px-2 py-0.5 rounded">{location.pathname}</code> n'existe pas ou a été déplacée.
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Button onClick={() => window.history.back()} variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Retour
          </Button>
          <Link to="/">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
              <Home className="h-4 w-4" /> Accueil
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
