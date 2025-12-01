import { Shield, Mail, Phone, MapPin } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="border-t border-border bg-muted/30 mt-auto">
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
                <Shield className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Portail Citoyen</h3>
                <p className="text-xs text-muted-foreground">Service de déclarations en ligne</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground max-w-md">
              Plateforme sécurisée permettant aux citoyens de soumettre leurs déclarations 
              de perte et leurs plaintes de manière simple et efficace.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Liens rapides</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/" className="text-muted-foreground hover:text-foreground transition-colors">
                  Accueil
                </a>
              </li>
              <li>
                <a href="/submit" className="text-muted-foreground hover:text-foreground transition-colors">
                  Nouvelle déclaration
                </a>
              </li>
              <li>
                <a href="/track" className="text-muted-foreground hover:text-foreground transition-colors">
                  Suivre ma déclaration
                </a>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>Avenue de la République<br />Ville, Pays</span>
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4 flex-shrink-0" />
                <span>+00 000 000 000</span>
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4 flex-shrink-0" />
                <span>contact@portail.gov</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-border">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} Portail Citoyen. Tous droits réservés.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-foreground transition-colors">
                Politique de confidentialité
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                Conditions d'utilisation
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                Accessibilité
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
