import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Phone, MapPin, Calendar, Search, Lightbulb } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Attachment {
  id: string;
  name: string;
  file: string;
  mime_type: string;
  size: number;
  uploaded_at: string;
}

interface Clue {
  id: string;
  declaration: string;
  phone: string;
  description: string;
  image: Attachment | null;
  created_at: string;
  is_verified: boolean;
  verified_by: string | null;
}

interface Declaration {
  id: string;
  tracking_code: string;
  category: string;
  declarant_name: string;
  type: string;
}

export default function AdminClues() {
  const navigate = useNavigate();
  const { currentUser, hasAdminAccess } = useAuth();
  const [clues, setClues] = useState<Clue[]>([]);
  const [declarations, setDeclarations] = useState<Declaration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDeclaration, setSelectedDeclaration] = useState<string | null>(null);
  const { toast } = useToast();

  // Vérifier l'authentification
  useEffect(() => {
    if (!hasAdminAccess()) {
      navigate("/");
    }
  }, [hasAdminAccess, navigate]);

  // Charger les indices et déclarations
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        // Charger les clues
        const cluesData = await api.get('/api/clues/');
        setClues(Array.isArray(cluesData) ? cluesData : cluesData.results || []);

        // Charger les déclarations
        const decsData = await api.get('/api/declarations/');
        setDeclarations(Array.isArray(decsData) ? decsData : decsData.results || []);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur lors du chargement';
        setError(message);
        toast({ title: 'Erreur', description: message, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getDeclaration = (declarationId: string) => {
    return declarations.find((d) => d.id === declarationId);
  };

  const filteredClues = clues.filter((clue) => {
    const declaration = getDeclaration(clue.declaration);
    const matchesSearch = 
      clue.phone.includes(searchTerm) || 
      clue.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      declaration?.tracking_code.includes(searchTerm) ||
      declaration?.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDeclaration = !selectedDeclaration || clue.declaration === selectedDeclaration;
    
    return matchesSearch && matchesDeclaration;
  });

  const unverifiedClues = filteredClues.filter((c) => !c.is_verified);
  const verifiedClues = filteredClues.filter((c) => c.is_verified);

  if (!hasAdminAccess()) {
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-1 container mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Lightbulb className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold">Gestion des Indices</h1>
              <p className="text-sm text-muted-foreground">
                Consultez les indices soumis par le public pour aider à retrouver les objets
              </p>
            </div>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Chargement des indices...</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Filtres */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Filtres</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Recherche */}
                  <div className="space-y-2">
                    <Label htmlFor="search" className="flex items-center gap-2">
                      <Search className="h-4 w-4" />
                      Recherche
                    </Label>
                    <Input
                      id="search"
                      placeholder="Téléphone, description, code..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-10"
                    />
                  </div>

                  {/* Déclaration */}
                  <div className="space-y-2">
                    <Label htmlFor="declaration-filter">Déclaration</Label>
                    <select
                      id="declaration-filter"
                      value={selectedDeclaration || ""}
                      onChange={(e) => setSelectedDeclaration(e.target.value || null)}
                      className="w-full h-10 px-3 border border-input rounded-md bg-background"
                    >
                      <option value="">Toutes les déclarations</option>
                      {declarations.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.tracking_code} - {d.category}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="unverified" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="unverified">
                  À vérifier ({unverifiedClues.length})
                </TabsTrigger>
                <TabsTrigger value="verified">
                  Vérifiés ({verifiedClues.length})
                </TabsTrigger>
              </TabsList>

              {/* Tab: Non vérifiés */}
              <TabsContent value="unverified" className="space-y-4 mt-4">
                {unverifiedClues.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                      <p className="text-muted-foreground">Aucun indice à vérifier</p>
                    </CardContent>
                  </Card>
                ) : (
                  unverifiedClues.map((clue) => (
                    <ClueCard key={clue.id} clue={clue} declaration={getDeclaration(clue.declaration)} />
                  ))
                )}
              </TabsContent>

              {/* Tab: Vérifiés */}
              <TabsContent value="verified" className="space-y-4 mt-4">
                {verifiedClues.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                      <p className="text-muted-foreground">Aucun indice vérifié</p>
                    </CardContent>
                  </Card>
                ) : (
                  verifiedClues.map((clue) => (
                    <ClueCard key={clue.id} clue={clue} declaration={getDeclaration(clue.declaration)} />
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
}

function ClueCard({ clue, declaration }: { clue: Clue; declaration?: Declaration }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="font-mono text-xs">
                {declaration?.tracking_code || "Unknown"}
              </Badge>
              <Badge variant={clue.is_verified ? "default" : "secondary"}>
                {clue.is_verified ? "✓ Vérifié" : "En attente"}
              </Badge>
            </div>
            <CardTitle className="text-lg">{declaration?.category || "N/A"}</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Info déclarant */}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-muted-foreground uppercase">
            Informations du déclarant
          </p>
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-primary" />
            <span>{clue.phone}</span>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-muted-foreground uppercase">
            Description de l'indice
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {clue.description}
          </p>
        </div>

        {/* Image */}
        {clue.image && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-muted-foreground uppercase">
              Photo de l'objet trouvé
            </p>
            <a
              href={clue.image.file}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary hover:underline text-sm"
            >
              📷 {clue.image.name}
            </a>
          </div>
        )}

        {/* Meta */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
          <Calendar className="h-3.5 w-3.5" />
          {new Date(clue.created_at).toLocaleDateString("fr-FR", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </CardContent>
    </Card>
  );
}
