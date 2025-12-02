import { Link, useLocation } from "react-router-dom";
import { Button } from "./ui/button";
import { Home, FileUp, Search, Shield, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export const Header = () => {
  const location = useLocation();
  const { currentUser, logout, hasAdminAccess } = useAuth();
  
  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 backdrop-blur-apple border-b border-border/50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center transition-transform group-hover:scale-105">
              <Shield className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Portail Citoyen</h1>
              <p className="text-xs text-muted-foreground">Service de déclarations</p>
            </div>
          </Link>
          
          <nav className="flex items-center gap-2">
            <Link to="/">
              <Button 
                variant={isActive("/") ? "secondary" : "ghost"} 
                size="sm" 
                className="gap-2"
              >
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">Accueil</span>
              </Button>
            </Link>
            <Link to="/submit">
              <Button 
                variant={isActive("/submit") ? "secondary" : "ghost"} 
                size="sm" 
                className="gap-2"
              >
                <FileUp className="h-4 w-4" />
                <span className="hidden sm:inline">Déclarer</span>
              </Button>
            </Link>
            <Link to="/track">
              <Button 
                variant={isActive("/track") ? "secondary" : "ghost"} 
                size="sm" 
                className="gap-2"
              >
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline">Suivre</span>
              </Button>
            </Link>
            
            {hasAdminAccess() ? (
              <>
                <Link to="/admin">
                  <Button 
                    variant={isActive("/admin") ? "default" : "outline"} 
                    size="sm" 
                    className="gap-2"
                  >
                    <Shield className="h-4 w-4" />
                    <span className="hidden sm:inline">Administration</span>
                  </Button>
                </Link>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={logout}
                  className="gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Déconnexion</span>
                </Button>
              </>
            ) : (
              <Link to="/login">
                <Button 
                  variant={isActive("/login") ? "default" : "outline"} 
                  size="sm" 
                  className="gap-2"
                >
                  <Shield className="h-4 w-4" />
                  <span className="hidden sm:inline">Admin</span>
                </Button>
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};
