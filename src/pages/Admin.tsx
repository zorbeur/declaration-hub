import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDeclarations } from "@/hooks/useDeclarations";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useActivityLog } from "@/hooks/useActivityLog";
import { Declaration, DeclarationStatus, Priority } from "@/types/declaration";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Download, FileText, Clock, CheckCircle, XCircle, Settings } from "lucide-react";
import { Label } from "@/components/ui/label";
import { AdminStats } from "@/components/admin/AdminStats";
import { AdminUsers } from "@/components/admin/AdminUsers";
import { ActivityLogViewer } from "@/components/admin/ActivityLogViewer";
import { DataManagement } from "@/components/admin/DataManagement";
import { AdvancedFilters } from "@/components/admin/AdvancedFilters";
import { TipsViewer } from "@/components/admin/TipsViewer";
import { ComplaintManagement } from "@/components/admin/ComplaintManagement";
import { STATUS_LABELS, STATUS_COLORS } from "@/types/declaration";

export default function Admin() {
  const navigate = useNavigate();
  const { hasAdminAccess, isLoading, currentUser, logout } = useAuth();
  const [selectedDeclaration, setSelectedDeclaration] = useState<Declaration | null>(null);
  const [statusFilter, setStatusFilter] = useState<DeclarationStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "plainte" | "perte">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("declarations");
  const { declarations, updateDeclarationStatus } = useDeclarations();
  const { toast } = useToast();
  const { addLog } = useActivityLog();

  useEffect(() => {
    if (!isLoading && !hasAdminAccess()) {
      navigate("/login");
    }
  }, [hasAdminAccess, isLoading, navigate]);

  const handleLogout = () => {
    logout();
    toast({
      title: "Déconnexion",
      description: "Vous avez été déconnecté avec succès",
    });
    navigate("/login");
  };

  const handleUpdateStatus = (id: string, status: DeclarationStatus, priority?: Priority) => {
    const declaration = declarations.find(d => d.id === id);
    updateDeclarationStatus(id, status, priority, currentUser?.username || "Admin");
    
    // Log the activity
    if (declaration) {
      const actionType = status === "validee" ? "declaration_validee" : 
                        status === "rejetee" ? "declaration_rejetee" :
                        status === "en_cours" ? "declaration_en_cours" :
                        status === "resolue" ? "declaration_resolue" :
                        status === "classee" ? "declaration_classee" : "autre";
      addLog(
        currentUser?.id || "unknown",
        currentUser?.username || "Admin",
        actionType as any,
        `Statut modifié vers ${status} - ${declaration.trackingCode}${priority ? ` avec priorité ${priority}` : ""}`,
        id,
        declaration.trackingCode
      );
    }
    
    toast({ title: "Déclaration mise à jour avec succès" });
    setSelectedDeclaration(null);
  };

  const filteredDeclarations = useMemo(() => {
    return declarations.filter((d) => {
      const matchesStatus = statusFilter === "all" || d.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || d.priority === priorityFilter;
      const matchesType = typeFilter === "all" || d.type === typeFilter;
      const matchesSearch = searchTerm === "" || 
        d.trackingCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.declarantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesStatus && matchesPriority && matchesType && matchesSearch;
    });
  }, [declarations, statusFilter, priorityFilter, typeFilter, searchTerm]);

  const handleResetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setPriorityFilter("all");
    setTypeFilter("all");
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "urgente":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "importante":
        return "bg-warning/10 text-warning border-warning/20";
      case "moyenne":
        return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      default:
        return "bg-success/10 text-success border-success/20";
    }
  };

  const getStatusColor = (status: DeclarationStatus) => {
    switch (status) {
      case "validee":
        return "bg-success/10 text-success border-success/20";
      case "rejetee":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-warning/10 text-warning border-warning/20";
    }
  };

  if (isLoading) {
    return null;
  }

  if (!hasAdminAccess()) {
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-1 container mx-auto px-6 py-12">
        <div className="mb-12 animate-fade-in">
          <h1 className="text-4xl font-semibold mb-4 tracking-tight">Administration</h1>
          <p className="text-muted-foreground text-lg">
            Tableau de bord et gestion complète de la plateforme
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="declarations">Déclarations</TabsTrigger>
            <TabsTrigger value="plaintes">Plaintes</TabsTrigger>
            <TabsTrigger value="tips">Indices</TabsTrigger>
            <TabsTrigger value="stats">Statistiques</TabsTrigger>
            <TabsTrigger value="users">Utilisateurs</TabsTrigger>
            <TabsTrigger value="activity">Activité</TabsTrigger>
            <TabsTrigger value="data">Données</TabsTrigger>
          </TabsList>

          <TabsContent value="plaintes" className="space-y-6">
            <ComplaintManagement />
          </TabsContent>

          <TabsContent value="tips" className="space-y-6">
            <TipsViewer />
          </TabsContent>


          <TabsContent value="declarations" className="space-y-6">
            <AdminStats declarations={declarations} />
            
            <AdvancedFilters
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              priorityFilter={priorityFilter}
              setPriorityFilter={setPriorityFilter}
              typeFilter={typeFilter}
              setTypeFilter={setTypeFilter}
              onReset={handleResetFilters}
            />

            <div className="grid gap-4">
              {filteredDeclarations.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground">Aucune déclaration trouvée</p>
                  </CardContent>
                </Card>
              ) : (
                filteredDeclarations.map((declaration) => (
                  <Card key={declaration.id} className="hover:shadow-lg transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="font-mono">
                              {declaration.trackingCode}
                            </Badge>
                            <Badge variant="outline">
                              {declaration.type === "plainte" ? "Plainte" : "Perte"}
                            </Badge>
                            <Badge className={getStatusColor(declaration.status)}>
                              {declaration.status === "en_attente" ? "En attente" : 
                               declaration.status === "validee" ? "Validée" : "Rejetée"}
                            </Badge>
                            {declaration.priority && (
                              <Badge className={getPriorityColor(declaration.priority)}>
                                {declaration.priority.charAt(0).toUpperCase() + declaration.priority.slice(1)}
                              </Badge>
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg mb-1">{declaration.category}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {declaration.description}
                            </p>
                          </div>
                          <div className="flex gap-6 text-sm text-muted-foreground">
                            <span><span className="font-medium">Déclarant:</span> {declaration.declarantName}</span>
                            <span><span className="font-medium">Tél:</span> {declaration.phone}</span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedDeclaration(declaration)}
                          className="gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          Détails
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="stats" className="space-y-6">
            <AdminStats declarations={declarations} />
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <AdminUsers />
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <ActivityLogViewer />
          </TabsContent>

          <TabsContent value="data" className="space-y-6">
            <DataManagement declarations={declarations} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Declaration Details Dialog */}
      <Dialog open={!!selectedDeclaration} onOpenChange={() => setSelectedDeclaration(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedDeclaration && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">Détails de la déclaration</DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="details" className="mt-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="details">Informations</TabsTrigger>
                  <TabsTrigger value="attachments">
                    Pièces jointes ({selectedDeclaration.attachments.length})
                  </TabsTrigger>
                  <TabsTrigger value="actions">Actions</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-6 mt-6">
                  <div className="grid gap-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label className="text-sm text-muted-foreground">Code de suivi</Label>
                        <p className="font-mono text-lg mt-1">{selectedDeclaration.trackingCode}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Type</Label>
                        <p className="text-lg mt-1">
                          {selectedDeclaration.type === "plainte" ? "Plainte" : "Déclaration de perte"}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label className="text-sm text-muted-foreground">Nom complet</Label>
                        <p className="text-lg mt-1">{selectedDeclaration.declarantName}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Téléphone</Label>
                        <p className="text-lg mt-1">{selectedDeclaration.phone}</p>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm text-muted-foreground">Email</Label>
                      <p className="text-lg mt-1">{selectedDeclaration.email || "Non fourni"}</p>
                    </div>

                    <div>
                      <Label className="text-sm text-muted-foreground">Catégorie</Label>
                      <p className="text-lg mt-1">{selectedDeclaration.category}</p>
                    </div>

                    {selectedDeclaration.type === "perte" && selectedDeclaration.reward && (
                      <div>
                        <Label className="text-sm text-muted-foreground">Récompense offerte</Label>
                        <p className="text-lg mt-1 text-primary font-semibold">{selectedDeclaration.reward}</p>
                      </div>
                    )}

                    <div>
                      <Label className="text-sm text-muted-foreground">Description</Label>
                      <p className="text-base mt-1 whitespace-pre-wrap">{selectedDeclaration.description}</p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label className="text-sm text-muted-foreground">Date de l'incident</Label>
                        <p className="text-lg mt-1">
                          {new Date(selectedDeclaration.incidentDate).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "long",
                            year: "numeric"
                          })}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Lieu</Label>
                        <p className="text-lg mt-1">{selectedDeclaration.location}</p>
                      </div>
                    </div>

                    {/* Technical Information Section */}
                    <div className="border-t pt-6 mt-2">
                      <h4 className="font-semibold mb-4 text-muted-foreground">Informations techniques</h4>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <Label className="text-sm text-muted-foreground">Navigateur</Label>
                          <p className="text-sm mt-1">{selectedDeclaration.browserInfo || "Non disponible"}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Type d'appareil</Label>
                          <p className="text-sm mt-1">{selectedDeclaration.deviceType || "Non disponible"}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Modèle / OS</Label>
                          <p className="text-sm mt-1">{selectedDeclaration.deviceModel || "Non disponible"}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Adresse IP</Label>
                          <p className="text-sm mt-1">{selectedDeclaration.ipAddress || "Non disponible"}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 text-sm text-muted-foreground border-t pt-4">
                      <div>
                        <span>Créé le: </span>
                        <span>{new Date(selectedDeclaration.createdAt).toLocaleString("fr-FR")}</span>
                      </div>
                      <div>
                        <span>Mis à jour le: </span>
                        <span>{new Date(selectedDeclaration.updatedAt).toLocaleString("fr-FR")}</span>
                      </div>
                      {selectedDeclaration.validatedBy && (
                        <div className="md:col-span-2">
                          <span>Traité par: </span>
                          <span className="font-medium">{selectedDeclaration.validatedBy}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="attachments" className="space-y-4 mt-6">
                  {selectedDeclaration.attachments.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                      <p className="text-muted-foreground">Aucune pièce jointe</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {selectedDeclaration.attachments.map((att) => (
                        <Card key={att.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <p className="font-medium">{att.name}</p>
                              <a href={att.data} download={att.name}>
                                <Button size="sm" variant="outline" className="gap-2">
                                  <Download className="h-4 w-4" />
                                  Télécharger
                                </Button>
                              </a>
                            </div>
                            {att.type.startsWith("image/") && (
                              <img 
                                src={att.data} 
                                alt={att.name} 
                                className="max-w-full h-auto rounded-lg border" 
                              />
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="actions" className="space-y-6 mt-6">
                  <div className="space-y-6">
                    <div>
                      <Label className="text-base mb-3 block">Changer le statut</Label>
                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          className="flex-1 h-12"
                          onClick={() => handleUpdateStatus(selectedDeclaration.id, "en_attente")}
                        >
                          <Clock className="h-4 w-4 mr-2" />
                          En attente
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1 h-12"
                          onClick={() => handleUpdateStatus(selectedDeclaration.id, "rejetee")}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Rejeter
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label className="text-base mb-3 block">Valider avec priorité</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          variant="outline"
                          className="h-12"
                          onClick={() => handleUpdateStatus(selectedDeclaration.id, "validee", "faible")}
                        >
                          Faible
                        </Button>
                        <Button
                          variant="outline"
                          className="h-12"
                          onClick={() => handleUpdateStatus(selectedDeclaration.id, "validee", "moyenne")}
                        >
                          Moyenne
                        </Button>
                        <Button
                          variant="outline"
                          className="h-12"
                          onClick={() => handleUpdateStatus(selectedDeclaration.id, "validee", "importante")}
                        >
                          Importante
                        </Button>
                        <Button
                          variant="outline"
                          className="h-12"
                          onClick={() => handleUpdateStatus(selectedDeclaration.id, "validee", "urgente")}
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

      <Footer />
    </div>
  );
}
