import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useDeclarations } from "@/hooks/useDeclarations";
import { AlertCircle, CheckCircle2, Clock, XCircle } from "lucide-react";

const statusConfig = {
  en_attente: { label: "En attente", icon: Clock, color: "bg-warning text-warning-foreground" },
  validee: { label: "Validée", icon: CheckCircle2, color: "bg-success text-success-foreground" },
  rejetee: { label: "Rejetée", icon: XCircle, color: "bg-destructive text-destructive-foreground" },
};

const priorityConfig = {
  urgente: { label: "Urgente", className: "bg-priority-urgent text-priority-urgent-text" },
  importante: { label: "Importante", className: "bg-priority-important text-priority-important-text" },
  moyenne: { label: "Moyenne", className: "bg-priority-medium text-priority-medium-text" },
  faible: { label: "Faible", className: "bg-priority-low text-priority-low-text" },
};

export default function Track() {
  const [searchParams] = useSearchParams();
  const [trackingCode, setTrackingCode] = useState(searchParams.get("code") || "");
  const [searched, setSearched] = useState(false);
  const { getDeclarationByCode } = useDeclarations();
  
  const declaration = searched ? getDeclarationByCode(trackingCode) : null;

  useEffect(() => {
    if (searchParams.get("code")) {
      setSearched(true);
    }
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearched(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="text-2xl">Suivre une déclaration</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="trackingCode">Code de suivi</Label>
                <div className="flex gap-2">
                  <Input
                    id="trackingCode"
                    placeholder="DECL-2025-000001"
                    value={trackingCode}
                    onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
                    className="flex-1"
                  />
                  <Button type="submit">Rechercher</Button>
                </div>
              </div>
            </form>

            {searched && (
              <div className="mt-6 animate-fade-in">
                {declaration ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                      {(() => {
                        const StatusIcon = statusConfig[declaration.status].icon;
                        return (
                          <>
                            <StatusIcon className="h-6 w-6" />
                            <div className="flex-1">
                              <p className="font-semibold">Statut de la déclaration</p>
                              <Badge className={statusConfig[declaration.status].color}>
                                {statusConfig[declaration.status].label}
                              </Badge>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    {declaration.status === "validee" && declaration.priority && (
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground mb-2">Priorité assignée</p>
                        <Badge className={priorityConfig[declaration.priority].className}>
                          {priorityConfig[declaration.priority].label}
                        </Badge>
                      </div>
                    )}

                    <div className="p-4 bg-muted rounded-lg space-y-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Type</p>
                        <p className="font-medium">
                          {declaration.type === "plainte" ? "Plainte" : "Déclaration de perte"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Catégorie</p>
                        <p className="font-medium">{declaration.category}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Date de création</p>
                        <p className="font-medium">
                          {new Date(declaration.createdAt).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Aucune déclaration trouvée avec ce code</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
