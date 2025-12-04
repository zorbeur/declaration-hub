import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useDeclarations } from "@/hooks/useDeclarations";
import { DeclarationDetailsModal } from "@/components/DeclarationDetailsModal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, FileText, AlertTriangle } from "lucide-react";

export default function Home() {
  const [selectedDeclaration, setSelectedDeclaration] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const { getValidatedDeclarations } = useDeclarations();
  const validatedDeclarations = getValidatedDeclarations();
  
  // Séparer les déclarations de perte des plaintes
  const lossDeclarations = validatedDeclarations.filter(d => d.type === "perte");

  const openDeclarationDetails = (declaration: any) => {
    setSelectedDeclaration(declaration);
    setModalOpen(true);
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

  const getPriorityLabel = (priority?: string) => {
    switch (priority) {
      case "urgente":
        return "Urgente";
      case "importante":
        return "Importante";
      case "moyenne":
        return "Moyenne";
      default:
        return "Faible";
    }
  };

  const DeclarationCard = ({ declaration }: { declaration: any }) => (
    <Card
      className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer"
      onClick={() => openDeclarationDetails(declaration)}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="font-mono text-xs">
                {declaration.trackingCode}
              </Badge>
              <Badge className={getPriorityColor(declaration.priority)}>
                {getPriorityLabel(declaration.priority)}
              </Badge>
            </div>
            <CardTitle className="text-xl">{declaration.category}</CardTitle>
          </div>
          <FileText className="h-6 w-6 text-primary" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {declaration.description}
        </p>
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {new Date(declaration.incidentDate).toLocaleDateString("fr-FR")}
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            {declaration.location}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-1 container mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="mb-16 text-center animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-semibold mb-4 tracking-tight">
            Déclarations Publiques
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Consultez les déclarations de perte validées par notre service
          </p>
        </div>

        {/* Déclarations de perte - Section publique principale */}
        <section className="mb-16 animate-slide-up">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold">Déclarations de Perte</h2>
              <p className="text-sm text-muted-foreground">
                {lossDeclarations.length} déclaration{lossDeclarations.length > 1 ? "s" : ""} validée{lossDeclarations.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {lossDeclarations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">Aucune déclaration de perte validée pour le moment</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {lossDeclarations.map((declaration) => (
                <DeclarationCard key={declaration.id} declaration={declaration} />
              ))}
            </div>
          )}
        </section>

        {/* Note de confidentialité */}
        <div className="mt-12 p-6 rounded-2xl bg-muted/50 border border-border">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Protection de la vie privée
          </h3>
          <p className="text-sm text-muted-foreground">
            Seules les déclarations de perte validées sont affichées publiquement. 
            Les informations personnelles (nom, téléphone, email) ne sont jamais rendues publiques. 
            Les plaintes ne sont pas affichées publiquement pour protéger la vie privée des déclarants.
          </p>
        </div>
      </main>

      <DeclarationDetailsModal
        declaration={selectedDeclaration}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
      
      <Footer />
    </div>
  );
}
