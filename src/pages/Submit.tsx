import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDeclarations } from "@/hooks/useDeclarations";
import { useToast } from "@/hooks/use-toast";
import { DeclarationAttachment, DeclarationType } from "@/types/declaration";
import { Upload, X, ChevronRight, ChevronLeft } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const PLAINTE_CATEGORIES = [
  "Agression physique",
  "Vol avec violence",
  "Harcèlement",
  "Escroquerie",
  "Vandalisme",
  "Discrimination",
  "Autre plainte"
];

const PERTE_CATEGORIES = [
  "Carte d'identité",
  "Passeport",
  "Permis de conduire",
  "Carte bancaire",
  "Téléphone",
  "Portefeuille",
  "Clés",
  "Documents officiels",
  "Bijoux",
  "Autre objet"
];

export default function Submit() {
  const navigate = useNavigate();
  const { addDeclaration } = useDeclarations();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const [formData, setFormData] = useState({
    declarantName: "",
    phone: "",
    email: "",
    type: "" as DeclarationType | "",
    category: "",
    description: "",
    incidentDate: "",
    location: "",
    reward: "",
  });

  const [attachments, setAttachments] = useState<DeclarationAttachment[]>([]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: DeclarationAttachment[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Fichier trop volumineux",
          description: `${file.name} dépasse 5 Mo`,
          variant: "destructive",
        });
        continue;
      }

      const reader = new FileReader();
      await new Promise((resolve) => {
        reader.onload = () => {
          newAttachments.push({
            id: crypto.randomUUID(),
            name: file.name,
            data: reader.result as string,
            type: file.type,
          });
          resolve(null);
        };
        reader.readAsDataURL(file);
      });
    }

    setAttachments([...attachments, ...newAttachments]);
  };

  const removeAttachment = (id: string) => {
    setAttachments(attachments.filter((a) => a.id !== id));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.declarantName.trim() || !formData.phone.trim()) {
          toast({
            title: "Champs requis manquants",
            description: "Veuillez remplir votre nom et téléphone",
            variant: "destructive",
          });
          return false;
        }
        return true;
      case 2:
        if (!formData.type || !formData.category || !formData.description.trim()) {
          toast({
            title: "Champs requis manquants",
            description: "Veuillez remplir le type, la catégorie et la description",
            variant: "destructive",
          });
          return false;
        }
        return true;
      case 3:
        if (!formData.incidentDate || !formData.location.trim()) {
          toast({
            title: "Champs requis manquants",
            description: "Veuillez remplir la date et le lieu",
            variant: "destructive",
          });
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(Math.min(currentStep + 1, totalSteps));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(Math.max(currentStep - 1, 1));
  };

  const getDeviceInfo = () => {
    const ua = navigator.userAgent;
    let deviceType = "Desktop";
    let deviceModel = "Unknown";

    // Détection du type d'appareil
    if (/Mobile|Android|iPhone/i.test(ua)) {
      deviceType = "Mobile";
    } else if (/Tablet|iPad/i.test(ua)) {
      deviceType = "Tablet";
    }

    // Extraction du modèle (approximatif)
    if (/iPhone/i.test(ua)) {
      const match = ua.match(/iPhone OS ([0-9_]+)/);
      deviceModel = match ? `iPhone (iOS ${match[1].replace(/_/g, '.')})` : "iPhone";
    } else if (/iPad/i.test(ua)) {
      deviceModel = "iPad";
    } else if (/Android/i.test(ua)) {
      const match = ua.match(/Android ([0-9.]+)/);
      deviceModel = match ? `Android ${match[1]}` : "Android";
    } else if (/Windows/i.test(ua)) {
      deviceModel = "Windows PC";
    } else if (/Mac/i.test(ua)) {
      deviceModel = "Mac";
    } else if (/Linux/i.test(ua)) {
      deviceModel = "Linux";
    }

    return { deviceType, deviceModel };
  };

  const getBrowserInfo = () => {
    const ua = navigator.userAgent;
    let browser = "Unknown";

    if (/Firefox/i.test(ua)) {
      browser = "Firefox";
    } else if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) {
      browser = "Chrome";
    } else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
      browser = "Safari";
    } else if (/Edg/i.test(ua)) {
      browser = "Edge";
    } else if (/MSIE|Trident/i.test(ua)) {
      browser = "Internet Explorer";
    }

    return `${browser} - ${ua}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (currentStep < totalSteps) {
      handleNext();
      return;
    }

    if (!validateStep(currentStep)) return;

    const { deviceType, deviceModel } = getDeviceInfo();
    const browserInfo = getBrowserInfo();

    const trackingCode = addDeclaration({
      ...formData,
      type: formData.type as DeclarationType,
      attachments,
      browserInfo,
      deviceType,
      deviceModel,
      ipAddress: "Non disponible côté client", // L'IP nécessiterait un backend
    });

    toast({
      title: "Déclaration enregistrée",
      description: `Code de suivi : ${trackingCode}`,
    });

    navigate(`/track?code=${trackingCode}`);
  };

  const categories = formData.type === "plainte" ? PLAINTE_CATEGORIES : PERTE_CATEGORIES;
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="text-2xl">Nouvelle déclaration</CardTitle>
            <CardDescription>
              Étape {currentStep} sur {totalSteps}
            </CardDescription>
            <Progress value={progress} className="mt-4" />
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Étape 1: Informations personnelles */}
              {currentStep === 1 && (
                <div className="space-y-4 animate-fade-in">
                  <h3 className="text-lg font-semibold">Informations personnelles</h3>
                  <div className="space-y-2">
                    <Label htmlFor="declarantName">Nom complet *</Label>
                    <Input
                      id="declarantName"
                      placeholder="Entrez votre nom complet"
                      value={formData.declarantName}
                      onChange={(e) => setFormData({ ...formData, declarantName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Téléphone *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+221 XX XXX XX XX"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email (optionnel)</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="votre@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* Étape 2: Type et détails */}
              {currentStep === 2 && (
                <div className="space-y-4 animate-fade-in">
                  <h3 className="text-lg font-semibold">Type de déclaration</h3>
                  <div className="space-y-2">
                    <Label htmlFor="type">Type *</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => setFormData({ ...formData, type: value as DeclarationType, category: "" })}
                    >
                      <SelectTrigger id="type">
                        <SelectValue placeholder="Sélectionner le type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="plainte">Plainte</SelectItem>
                        <SelectItem value="perte">Déclaration de perte</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.type && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="category">Catégorie *</Label>
                        <Select
                          value={formData.category}
                          onValueChange={(value) => setFormData({ ...formData, category: value })}
                        >
                          <SelectTrigger id="category">
                            <SelectValue placeholder="Sélectionner la catégorie" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">Description détaillée *</Label>
                        <Textarea
                          id="description"
                          rows={6}
                          placeholder="Décrivez en détail votre déclaration..."
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Étape 3: Détails de l'incident */}
              {currentStep === 3 && (
                <div className="space-y-4 animate-fade-in">
                  <h3 className="text-lg font-semibold">Détails de l'incident</h3>
                  <div className="space-y-2">
                    <Label htmlFor="incidentDate">Date de l'incident *</Label>
                    <Input
                      id="incidentDate"
                      type="date"
                      value={formData.incidentDate}
                      onChange={(e) => setFormData({ ...formData, incidentDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Lieu *</Label>
                    <Input
                      id="location"
                      placeholder="Ex: Dakar, Plateau, Rue X"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                  </div>

                  {formData.type === "perte" && (
                    <div className="space-y-2">
                      <Label htmlFor="reward">Récompense offerte (optionnel)</Label>
                      <Input
                        id="reward"
                        placeholder="Ex: 10 000 FCFA"
                        value={formData.reward}
                        onChange={(e) => setFormData({ ...formData, reward: e.target.value })}
                      />
                      <p className="text-sm text-muted-foreground">
                        Indiquez la récompense que vous offrez à la personne qui retrouvera votre bien
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Étape 4: Pièces jointes */}
              {currentStep === 4 && (
                <div className="space-y-4 animate-fade-in">
                  <h3 className="text-lg font-semibold">Pièces jointes</h3>
                  <p className="text-sm text-muted-foreground">
                    Ajoutez des photos ou documents pour appuyer votre déclaration (optionnel)
                  </p>
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors">
                    <input
                      type="file"
                      id="file-upload"
                      multiple
                      accept="image/*,.pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Upload className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-sm font-medium mb-1">
                        Cliquez pour ajouter des fichiers
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Images ou PDF (max 5 Mo par fichier)
                      </p>
                    </label>
                  </div>
                  {attachments.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">{attachments.length} fichier(s) ajouté(s)</p>
                      {attachments.map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center justify-between bg-muted/50 p-3 rounded-lg border border-border"
                        >
                          <span className="text-sm truncate flex-1">{att.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAttachment(att.id)}
                            className="ml-2"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Navigation buttons */}
              <div className="flex justify-between pt-4 border-t">
                {currentStep > 1 && (
                  <Button type="button" variant="outline" onClick={handlePrevious}>
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Précédent
                  </Button>
                )}
                <div className="ml-auto">
                  {currentStep < totalSteps ? (
                    <Button type="button" onClick={handleNext}>
                      Suivant
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  ) : (
                    <Button type="submit">
                      Soumettre la déclaration
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
