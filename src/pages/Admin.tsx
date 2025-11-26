import { useState } from "react";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDeclarations } from "@/hooks/useDeclarations";
import { useToast } from "@/hooks/use-toast";
import { Declaration, DeclarationStatus, Priority } from "@/types/declaration";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lock, Eye, Download } from "lucide-react";

const ADMIN_PASSWORD = "admin123";

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [selectedDeclaration, setSelectedDeclaration] = useState<Declaration | null>(null);
  const [statusFilter, setStatusFilter] = useState<DeclarationStatus | "all">("all");
  const { declarations, updateDeclarationStatus } = useDeclarations();
  const { toast } = useToast();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      toast({ title: "Connexion réussie" });
    } else {
      toast({ title: "Mot de passe incorrect", variant: "destructive" });
    }
  };

  const handleUpdateStatus = (id: string, status: DeclarationStatus, priority?: Priority) => {
    updateDeclarationStatus(id, status, priority, "Admin");
    toast({ title: "Déclaration mise à jour" });
    setSelectedDeclaration(null);
  };

  const filteredDeclarations = declarations.filter(
    (d) => statusFilter === "all" || d.status === statusFilter
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-md">
          <Card className="animate-fade-in">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Lock className="h-5 w-5 text-primary" />
                <CardTitle>Authentification Admin</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Entrez le mot de passe"
                  />
                </div>
                <Button type="submit" className="w-full">
                  Se connecter
                </Button>
              </form>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-3xl font-bold">Gestion des déclarations</h2>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="en_attente">En attente</SelectItem>
              <SelectItem value="validee">Validées</SelectItem>
              <SelectItem value="rejetee">Rejetées</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4">
          {filteredDeclarations.map((declaration) => (
            <Card key={declaration.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge>{declaration.type === "plainte" ? "Plainte" : "Perte"}</Badge>
                      <Badge
                        variant={
                          declaration.status === "validee"
                            ? "default"
                            : declaration.status === "rejetee"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {declaration.status}
                      </Badge>
                      {declaration.priority && (
                        <Badge variant="outline">{declaration.priority}</Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-lg">{declaration.category}</h3>
                    <p className="text-sm text-muted-foreground">Code: {declaration.trackingCode}</p>
                    <p className="text-sm">
                      <span className="font-medium">Déclarant:</span> {declaration.declarantName} -{" "}
                      {declaration.phone}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDeclaration(declaration)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Détails
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      <Dialog open={!!selectedDeclaration} onOpenChange={() => setSelectedDeclaration(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedDeclaration && (
            <>
              <DialogHeader>
                <DialogTitle>Détails de la déclaration</DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="details">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="details">Détails</TabsTrigger>
                  <TabsTrigger value="attachments">
                    Pièces jointes ({selectedDeclaration.attachments.length})
                  </TabsTrigger>
                  <TabsTrigger value="actions">Actions</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4">
                  <div className="grid gap-4">
                    <div>
                      <Label>Code de suivi</Label>
                      <p className="font-mono">{selectedDeclaration.trackingCode}</p>
                    </div>
                    <div>
                      <Label>Nom complet</Label>
                      <p>{selectedDeclaration.declarantName}</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label>Téléphone</Label>
                        <p>{selectedDeclaration.phone}</p>
                      </div>
                      <div>
                        <Label>Email</Label>
                        <p>{selectedDeclaration.email || "Non fourni"}</p>
                      </div>
                    </div>
                    <div>
                      <Label>Description</Label>
                      <p className="whitespace-pre-wrap">{selectedDeclaration.description}</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label>Date incident</Label>
                        <p>{new Date(selectedDeclaration.incidentDate).toLocaleDateString("fr-FR")}</p>
                      </div>
                      <div>
                        <Label>Lieu</Label>
                        <p>{selectedDeclaration.location}</p>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="attachments" className="space-y-4">
                  {selectedDeclaration.attachments.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Aucune pièce jointe</p>
                  ) : (
                    <div className="grid gap-4">
                      {selectedDeclaration.attachments.map((att) => (
                        <div key={att.id} className="border rounded p-4">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-medium">{att.name}</p>
                            <a href={att.data} download={att.name}>
                              <Button size="sm" variant="outline">
                                <Download className="h-4 w-4" />
                              </Button>
                            </a>
                          </div>
                          {att.type.startsWith("image/") && (
                            <img src={att.data} alt={att.name} className="max-w-full h-auto rounded" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="actions" className="space-y-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Changer le statut</Label>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() =>
                            handleUpdateStatus(selectedDeclaration.id, "en_attente")
                          }
                        >
                          En attente
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() =>
                            handleUpdateStatus(selectedDeclaration.id, "rejetee")
                          }
                        >
                          Rejeter
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Valider avec priorité</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          onClick={() =>
                            handleUpdateStatus(selectedDeclaration.id, "validee", "faible")
                          }
                        >
                          Faible
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() =>
                            handleUpdateStatus(selectedDeclaration.id, "validee", "moyenne")
                          }
                        >
                          Moyenne
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() =>
                            handleUpdateStatus(selectedDeclaration.id, "validee", "importante")
                          }
                        >
                          Importante
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() =>
                            handleUpdateStatus(selectedDeclaration.id, "validee", "urgente")
                          }
                        >
                          Urgente
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
