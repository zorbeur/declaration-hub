import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, MapPin, Phone, Mail, FileText, Image as ImageIcon, AlertCircle } from "lucide-react";

interface Declaration {
  id: string;
  trackingCode: string;
  category: string;
  description: string;
  incidentDate: string;
  location: string;
  type: string;
  priority?: string;
  declarantName?: string;
  phone?: string;
  email?: string;
  reward?: string;
}

interface DeclarationDetailsModalProps {
  declaration: Declaration | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeclarationDetailsModal({
  declaration,
  open,
  onOpenChange,
}: DeclarationDetailsModalProps) {
  const [clueForm, setClueForm] = useState({
    phone: "",
    description: "",
    image: null as File | null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [clueSubmitted, setClueSubmitted] = useState(false);
  const [error, setError] = useState("");

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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        setError("L'image ne doit pas dépasser 50 MB");
        return;
      }
      setClueForm({ ...clueForm, image: file });
      setError("");
    }
  };

  const handleSubmitClue = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    // Validation
    if (!clueForm.phone.trim()) {
      setError("Le numéro de téléphone est requis");
      setSubmitting(false);
      return;
    }

    if (!clueForm.description.trim()) {
      setError("La description de l'indice est requise");
      setSubmitting(false);
      return;
    }

    if (!clueForm.image) {
      setError("Une image de l'objet trouvé est requise");
      setSubmitting(false);
      return;
    }

    try {
      // Créer FormData pour l'upload multipart
      const formData = new FormData();
      formData.append("file", clueForm.image);

      // 1. Upload l'image
      const attachmentData = await (await import('@/lib/api')).default.post('/api/attachments/upload/', formData);

      // 2. Créer l'indice via l'API
      const cluePayload = {
        declaration: declaration?.id,
        phone: clueForm.phone,
        description: clueForm.description,
        image: attachmentData.id,
      };

      await (await import('@/lib/api')).default.post('/api/clues/', cluePayload);

      // Réinitialiser le formulaire
      setClueForm({ phone: "", description: "", image: null });
      setClueSubmitted(true);

      // Afficher le message de succès pendant 3 secondes
      setTimeout(() => {
        setClueSubmitted(false);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la soumission");
    } finally {
      setSubmitting(false);
    }
  };

  if (!declaration) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between w-full mb-4">
            <div>
              <DialogTitle className="text-2xl mb-2">
                {declaration.category}
              </DialogTitle>
              <DialogDescription>
                Code de suivi: {declaration.trackingCode}
              </DialogDescription>
            </div>
            <Badge className={getPriorityColor(declaration.priority)}>
              {getPriorityLabel(declaration.priority)}
            </Badge>
          </div>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Détails</TabsTrigger>
            <TabsTrigger value="clue">Ajouter un indice</TabsTrigger>
          </TabsList>

          {/* TAB DÉTAILS */}
          <TabsContent value="details" className="space-y-6">
            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {declaration.description}
                </p>
              </CardContent>
            </Card>

            {/* Infos principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase">
                        Date de l'incident
                      </p>
                      <p className="text-sm mt-1">
                        {new Date(declaration.incidentDate).toLocaleDateString("fr-FR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Localisation */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase">
                        Localisation
                      </p>
                      <p className="text-sm mt-1">{declaration.location}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Récompense */}
            {declaration.reward && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-6">
                  <p className="text-xs font-semibold text-primary uppercase mb-2">
                    Récompense offerte
                  </p>
                  <p className="text-lg font-semibold">{declaration.reward}</p>
                </CardContent>
              </Card>
            )}

            {/* Info confidentialité */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Les informations de contact du déclarant ne sont pas affichées publiquement.
                Votre indice sera transmis directement au déclarant.
              </AlertDescription>
            </Alert>
          </TabsContent>

          {/* TAB AJOUTER INDICE */}
          <TabsContent value="clue" className="space-y-6">
            {declaration.type === "perte" ? (
              <>
                {clueSubmitted && (
                  <Alert className="bg-success/10 border-success/20">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-success">
                      ✓ Merci ! Votre indice a été envoyé au déclarant.
                    </AlertDescription>
                  </Alert>
                )}

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Soumettre un indice</CardTitle>
                    <CardDescription>
                      Avez-vous vu cet objet ? Aidez-nous en partageant votre indice
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    <form onSubmit={handleSubmitClue} className="space-y-6">
                      {/* Téléphone */}
                      <div className="space-y-2">
                        <Label htmlFor="clue-phone" className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-primary" />
                          Votre numéro de téléphone *
                        </Label>
                        <Input
                          id="clue-phone"
                          type="tel"
                          placeholder="+33 6 12 34 56 78"
                          value={clueForm.phone}
                          onChange={(e) =>
                            setClueForm({ ...clueForm, phone: e.target.value })
                          }
                          className="h-11"
                        />
                        <p className="text-xs text-muted-foreground">
                          Sera utilisé uniquement pour contacter vous concernant cet indice
                        </p>
                      </div>

                      {/* Description de l'indice */}
                      <div className="space-y-2">
                        <Label htmlFor="clue-desc" className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          Description de l'indice *
                        </Label>
                        <textarea
                          id="clue-desc"
                          placeholder="Décrivez où vous avez vu l'objet, dans quelles circonstances, toute information utile..."
                          value={clueForm.description}
                          onChange={(e) =>
                            setClueForm({ ...clueForm, description: e.target.value })
                          }
                          rows={4}
                          className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      {/* Image */}
                      <div className="space-y-2">
                        <Label htmlFor="clue-image" className="flex items-center gap-2">
                          <ImageIcon className="h-4 w-4 text-primary" />
                          Image de l'objet trouvé *
                        </Label>
                        <div className="relative">
                          <input
                            id="clue-image"
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors">
                            <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                            <p className="text-sm font-medium">
                              {clueForm.image ? clueForm.image.name : "Cliquez pour ajouter une image"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              PNG, JPG, GIF jusqu'à 50 MB
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Submit Button */}
                      <Button
                        type="submit"
                        className="w-full h-11"
                        disabled={submitting}
                      >
                        {submitting ? "Envoi en cours..." : "Soumettre l'indice"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Les indices ne peuvent être soumis que pour les déclarations de perte.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
