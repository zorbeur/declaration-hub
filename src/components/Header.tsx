import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { FileText, Search, Shield } from "lucide-react";

export const Header = () => {
  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-foreground">Portail des Déclarations</h1>
              <p className="text-xs text-muted-foreground">Service Administratif</p>
            </div>
          </Link>
          <nav className="flex gap-2">
            <Link to="/submit">
              <Button variant="outline" size="sm" className="gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Nouvelle déclaration</span>
              </Button>
            </Link>
            <Link to="/track">
              <Button variant="outline" size="sm" className="gap-2">
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline">Suivre</span>
              </Button>
            </Link>
            <Link to="/admin">
              <Button variant="secondary" size="sm" className="gap-2">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Admin</span>
              </Button>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
};
