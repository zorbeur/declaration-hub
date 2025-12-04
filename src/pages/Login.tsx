import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { Shield, AlertCircle, KeyRound, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export default function Login() {
  const navigate = useNavigate();
  const { 
    login, 
    register, 
    isFirstSetup, 
    hasAdminAccess, 
    verify2FA, 
    pendingVerification,
    cancelPending2FA,
    error: authError,
    setError: setAuthError
  } = useAuth();
  const { toast } = useToast();
  const [isRegistering, setIsRegistering] = useState(isFirstSetup);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    enable2FA: false,
  });
  const [error, setError] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [demoCode, setDemoCode] = useState<string | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (hasAdminAccess()) {
      navigate("/admin");
    }
  }, [hasAdminAccess, navigate]);

  // Update isRegistering when isFirstSetup changes
  useEffect(() => {
    setIsRegistering(isFirstSetup);
  }, [isFirstSetup]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setAuthError("");

    if (isRegistering) {
      if (formData.password !== formData.confirmPassword) {
        setError("Les mots de passe ne correspondent pas");
        return;
      }
      if (formData.password.length < 8) {
        setError("Le mot de passe doit contenir au moins 8 caractères");
        return;
      }
      const result = await register(formData.username, formData.email, formData.password);
      if (result.success) {
        toast({
          title: "Compte créé",
          description: formData.enable2FA 
            ? "Votre compte avec authentification 2FA a été créé avec succès"
            : "Votre compte administrateur a été créé avec succès",
        });
        setIsRegistering(false);
        setFormData({ ...formData, password: "", confirmPassword: "" });
      } else {
        setError(result.error || authError || "Erreur lors de la création du compte");
      }
    } else {
      const result = await login(formData.username, formData.password);
      if (result.success) {
        toast({
          title: "Connexion réussie",
          description: "Bienvenue dans l'espace d'administration",
        });
        navigate("/admin");
      } else if (result.requires2FA) {
        setDemoCode(result.verificationCode || null);
        toast({
          title: "Vérification requise",
          description: "Entrez le code de vérification à 6 chiffres",
        });
      } else {
        setError(result.error || authError || "Erreur de connexion");
      }
    }
  };

  const handleVerify2FA = () => {
    setError("");
    const result = verify2FA(otpCode);
    
    if (result.success) {
      toast({
        title: "Connexion réussie",
        description: "Bienvenue dans l'espace d'administration",
      });
      navigate("/admin");
    } else {
      setError(result.error || "Erreur de vérification");
    }
  };

  const handleCancel2FA = () => {
    cancelPending2FA();
    setOtpCode("");
    setDemoCode(null);
  };

  if (hasAdminAccess()) {
    return null;
  }

  // Show 2FA verification screen
  if (pendingVerification) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        
        <main className="flex-1 container mx-auto px-6 py-12 flex items-center justify-center">
          <Card className="w-full max-w-md animate-scale-in">
            <CardHeader className="text-center">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <KeyRound className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Vérification à deux facteurs</CardTitle>
              <CardDescription>
                Entrez le code de vérification à 6 chiffres
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Demo code display - remove in production */}
              {demoCode && (
                <Alert className="bg-primary/10 border-primary/20">
                  <AlertDescription className="text-center">
                    <span className="text-sm text-muted-foreground">Code de démonstration :</span>
                    <span className="block font-mono text-2xl font-bold text-primary tracking-widest mt-1">
                      {demoCode}
                    </span>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otpCode}
                  onChange={(value) => setOtpCode(value)}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <p className="text-sm text-muted-foreground text-center">
                Le code expire dans 5 minutes
              </p>

              <div className="space-y-3">
                <Button 
                  onClick={handleVerify2FA} 
                  className="w-full h-11"
                  disabled={otpCode.length !== 6}
                >
                  Vérifier
                </Button>
                
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={handleCancel2FA}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour à la connexion
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
        
        <Footer />
      </div>
    );
  }

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
            {(error || authError) && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error || authError}</AlertDescription>
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
                <>
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

                  <div className="flex items-center space-x-2 py-2">
                    <Checkbox
                      id="enable2FA"
                      checked={formData.enable2FA}
                      onCheckedChange={(checked) => setFormData({ ...formData, enable2FA: checked as boolean })}
                    />
                    <Label htmlFor="enable2FA" className="text-sm font-normal cursor-pointer">
                      Activer l'authentification à deux facteurs (2FA)
                    </Label>
                  </div>
                </>
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
                    setFormData({ username: "", email: "", password: "", confirmPassword: "", enable2FA: false });
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
