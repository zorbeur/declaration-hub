import { useDeclarations } from "@/hooks/useDeclarations";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Calendar, MapPin } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const priorityConfig = {
  urgente: { label: "Urgente", className: "bg-priority-urgent text-priority-urgent-text" },
  importante: { label: "Importante", className: "bg-priority-important text-priority-important-text" },
  moyenne: { label: "Moyenne", className: "bg-priority-medium text-priority-medium-text" },
  faible: { label: "Faible", className: "bg-priority-low text-priority-low-text" },
};

const typeConfig = {
  plainte: "Plainte",
  perte: "Déclaration de perte",
};

export default function Home() {
  const { getValidatedDeclarations } = useDeclarations();
  const validatedDeclarations = getValidatedDeclarations();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 animate-fade-in">
          <h2 className="text-3xl font-bold text-foreground mb-2">Déclarations validées</h2>
          <p className="text-muted-foreground">
            Consultez les déclarations traitées et validées par l'administration
          </p>
        </div>

        {validatedDeclarations.length === 0 ? (
          <Card className="animate-fade-in">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucune déclaration validée pour le moment</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {validatedDeclarations.map((declaration, index) => (
              <Card
                key={declaration.id}
                className="animate-fade-in hover:shadow-md transition-shadow"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">{typeConfig[declaration.type]}</Badge>
                        {declaration.priority && (
                          <Badge className={priorityConfig[declaration.priority].className}>
                            {priorityConfig[declaration.priority].label}
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-foreground">{declaration.category}</h3>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-foreground line-clamp-3">{declaration.description}</p>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {format(new Date(declaration.incidentDate), "d MMMM yyyy", { locale: fr })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{declaration.location}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
