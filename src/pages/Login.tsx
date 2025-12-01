import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { Shield, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Login() {
  const navigate = useNavigate();
  const { login, register, isFirstSetup, hasAdminAccess } = useAuth();
  const { toast } = useToast();
  const [isRegistering, setIsRegistering] = useState(isFirstSetup);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");

  // Redirect if already logged in
  if (hasAdminAccess()) {
    navigate("/admin");
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (isRegistering) {
      if (formData.password !== formData.confirmPassword) {
        setError("Les mots de passe ne correspondent pas");
        return;
      }
      
      if (formData.password.length < 6) {
        setError("Le mot de passe doit contenir au moins 6 caractères");
        return;
      }

      const result = register(formData.username, formData.email, formData.password);
      if (result.success) {
        toast({
          title: "Compte créé",
          description: "Votre compte administrateur a été créé avec succès",
        });
        setIsRegistering(false);
        setFormData({ ...formData, password: "", confirmPassword: "" });
      } else {
        setError(result.error || "Erreur lors de la création du compte");
      }
    } else {
      const result = login(formData.username, formData.password);
      if (result.success) {
        toast({
          title: "Connexion réussie",
          description: "Bienvenue dans l'espace d'administration",
        });
        navigate("/admin");
      } else {
        setError(result.error || "Erreur de connexion");
      }
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-1 container mx-auto px-6 py-12 flex items-center justify-center">
        <Card className="w-full max-w-md animate-scale-in">
          <CardHeader className="text-center">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">
              {isRegistering ? "Configuration initiale" : "Espace Administration"}
            </CardTitle>
            <CardDescription>
              {isRegistering
                ? "Créez votre premier compte administrateur"
                : "Connectez-vous pour accéder au panneau d'administration"}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {isFirstSetup && (
              <Alert className="mb-4">
                <AlertDescription>
                  Aucun compte administrateur n'existe. Veuillez créer le premier compte.
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Nom d'utilisateur</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                  className="h-11"
                />
              </div>

              {isRegistering && (
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="h-11"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  className="h-11"
                />
              </div>

              {isRegistering && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                    className="h-11"
                  />
                </div>
              )}

              <Button type="submit" className="w-full h-11">
                {isRegistering ? "Créer le compte" : "Se connecter"}
              </Button>

              {!isFirstSetup && (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setIsRegistering(!isRegistering);
                    setError("");
                    setFormData({ username: "", email: "", password: "", confirmPassword: "" });
                  }}
                >
                  {isRegistering ? "Déjà un compte ? Se connecter" : "Créer un nouveau compte"}
                </Button>
              )}
            </form>
          </CardContent>
        </Card>
      </main>
      
      <Footer />
    </div>
  );
}
