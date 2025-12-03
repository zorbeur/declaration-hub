import { useState, useRef, useCallback } from "react";
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
import { Upload, X, ChevronRight, ChevronLeft, FileImage, FileText, File } from "lucide-react";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [formData, setFormData] = useState({
    declarantName: "",
    phone: "",
    email: "",
    type: "" as DeclarationType | "",
    category: "",
    customCategory: "",
    description: "",
    incidentDate: "",
    location: "",
    reward: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<DeclarationAttachment[]>([]);

  // Validation functions
  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^(\+221|00221)?[0-9\s]{9,15}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const validateEmail = (email: string): boolean => {
    if (!email) return true; // Email is optional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateDate = (date: string): boolean => {
    if (!date) return false;
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return selectedDate <= today;
  };

  const processFiles = async (fileList: FileList | File[]) => {
    const newAttachments: DeclarationAttachment[] = [];
    const files = Array.from(fileList);

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Fichier trop volumineux",
          description: `${file.name} dépasse 5 Mo`,
          variant: "destructive",
        });
        continue;
      }

      const reader = new FileReader();
      await new Promise<void>((resolve) => {
        reader.onload = () => {
          newAttachments.push({
            id: crypto.randomUUID(),
            name: file.name,
            data: reader.result as string,
            type: file.type,
          });
          resolve();
        };
        reader.readAsDataURL(file);
      });
    }

    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    await processFiles(files);
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await processFiles(files);
    }
  }, []);

  const removeAttachment = (id: string) => {
    setAttachments(attachments.filter((a) => a.id !== id));
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return FileImage;
    if (type === 'application/pdf') return FileText;
    return File;
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!formData.declarantName.trim()) {
          newErrors.declarantName = "Le nom est requis";
        } else if (formData.declarantName.trim().length < 3) {
          newErrors.declarantName = "Le nom doit contenir au moins 3 caractères";
        }
        
        if (!formData.phone.trim()) {
          newErrors.phone = "Le téléphone est requis";
        } else if (!validatePhone(formData.phone)) {
          newErrors.phone = "Format de téléphone invalide";
        }
        
        if (formData.email && !validateEmail(formData.email)) {
          newErrors.email = "Format d'email invalide";
        }
        break;

      case 2:
        if (!formData.type) {
          newErrors.type = "Le type est requis";
        }
        if (!formData.category) {
          newErrors.category = "La catégorie est requise";
        }
        if ((formData.category === "Autre objet" || formData.category === "Autre plainte") && !formData.customCategory.trim()) {
          newErrors.customCategory = "Veuillez préciser la catégorie";
        }
        if (!formData.description.trim()) {
          newErrors.description = "La description est requise";
        } else if (formData.description.trim().length < 20) {
          newErrors.description = "La description doit contenir au moins 20 caractères";
        }
        break;

      case 3:
        if (!formData.incidentDate) {
          newErrors.incidentDate = "La date est requise";
        } else if (!validateDate(formData.incidentDate)) {
          newErrors.incidentDate = "La date ne peut pas être dans le futur";
        }
        
        if (!formData.location.trim()) {
          newErrors.location = "Le lieu est requis";
        } else if (formData.location.trim().length < 5) {
          newErrors.location = "Veuillez préciser davantage le lieu";
        }
        break;

      default:
        break;
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      toast({
        title: "Erreurs de validation",
        description: "Veuillez corriger les erreurs indiquées",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleNext = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const handlePrevious = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const getDeviceInfo = () => {
    const ua = navigator.userAgent;
    let deviceType = "Desktop";
    let deviceModel = "Unknown";

    if (/Mobile|Android|iPhone/i.test(ua)) {
      deviceType = "Mobile";
    } else if (/Tablet|iPad/i.test(ua)) {
      deviceType = "Tablet";
    }

    if (/iPhone/i.test(ua)) {
      const match = ua.match(/iPhone OS ([0-9_]+)/);
      deviceModel = match ? `iPhone (iOS ${match[1].replace(/_/g, '.')})` : "iPhone";
    } else if (/iPad/i.test(ua)) {
      deviceModel = "iPad";
    } else if (/Android/i.test(ua)) {
      const match = ua.match(/Android ([0-9.]+)/);
      const brandMatch = ua.match(/;\s*([^;)]+)\s+Build/);
      deviceModel = brandMatch 
        ? `${brandMatch[1]} (Android ${match?.[1] || 'Unknown'})` 
        : `Android ${match?.[1] || 'Unknown'}`;
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
    let version = "";

    if (/Firefox\/(\d+)/i.test(ua)) {
      browser = "Firefox";
      version = ua.match(/Firefox\/(\d+)/i)?.[1] || "";
    } else if (/Edg\/(\d+)/i.test(ua)) {
      browser = "Edge";
      version = ua.match(/Edg\/(\d+)/i)?.[1] || "";
    } else if (/Chrome\/(\d+)/i.test(ua) && !/Edg/i.test(ua)) {
      browser = "Chrome";
      version = ua.match(/Chrome\/(\d+)/i)?.[1] || "";
    } else if (/Safari\/(\d+)/i.test(ua) && !/Chrome/i.test(ua)) {
      browser = "Safari";
      version = ua.match(/Version\/(\d+)/i)?.[1] || "";
    }

    return `${browser}${version ? ` v${version}` : ''} - ${navigator.platform}`;
  };

  const handleFinalSubmit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!validateStep(currentStep)) return;

    const { deviceType, deviceModel } = getDeviceInfo();
    const browserInfo = getBrowserInfo();

    // Use custom category if "Autre" is selected
    const finalCategory = (formData.category === "Autre objet" || formData.category === "Autre plainte")
      ? formData.customCategory
      : formData.category;

    const trackingCode = addDeclaration({
      ...formData,
      category: finalCategory,
      type: formData.type as DeclarationType,
      attachments,
      browserInfo,
      deviceType,
      deviceModel,
      ipAddress: "Non disponible côté client",
    });

    toast({
      title: "Déclaration enregistrée avec succès!",
      description: `Votre code de suivi : ${trackingCode}`,
    });

    navigate(`/track?code=${trackingCode}`);
  };

  const categories = formData.type === "plainte" ? PLAINTE_CATEGORIES : PERTE_CATEGORIES;
  const progress = (currentStep / totalSteps) * 100;
  const maxDate = new Date().toISOString().split('T')[0];

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
            <div className="space-y-6">
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
                      onChange={(e) => {
                        setFormData({ ...formData, declarantName: e.target.value });
                        if (errors.declarantName) setErrors({ ...errors, declarantName: '' });
                      }}
                      className={errors.declarantName ? "border-destructive" : ""}
                    />
                    {errors.declarantName && (
                      <p className="text-sm text-destructive">{errors.declarantName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Téléphone *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+221 XX XXX XX XX"
                      value={formData.phone}
                      onChange={(e) => {
                        setFormData({ ...formData, phone: e.target.value });
                        if (errors.phone) setErrors({ ...errors, phone: '' });
                      }}
                      className={errors.phone ? "border-destructive" : ""}
                    />
                    {errors.phone && (
                      <p className="text-sm text-destructive">{errors.phone}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email (optionnel)</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="votre@email.com"
                      value={formData.email}
                      onChange={(e) => {
                        setFormData({ ...formData, email: e.target.value });
                        if (errors.email) setErrors({ ...errors, email: '' });
                      }}
                      className={errors.email ? "border-destructive" : ""}
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email}</p>
                    )}
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
                      onValueChange={(value) => {
                        setFormData({ ...formData, type: value as DeclarationType, category: "", customCategory: "" });
                        if (errors.type) setErrors({ ...errors, type: '' });
                      }}
                    >
                      <SelectTrigger id="type" className={errors.type ? "border-destructive" : ""}>
                        <SelectValue placeholder="Sélectionner le type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="plainte">Plainte</SelectItem>
                        <SelectItem value="perte">Déclaration de perte</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.type && (
                      <p className="text-sm text-destructive">{errors.type}</p>
                    )}
                  </div>

                  {formData.type && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="category">Catégorie *</Label>
                        <Select
                          value={formData.category}
                          onValueChange={(value) => {
                            setFormData({ ...formData, category: value, customCategory: "" });
                            if (errors.category) setErrors({ ...errors, category: '' });
                          }}
                        >
                          <SelectTrigger id="category" className={errors.category ? "border-destructive" : ""}>
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
                        {errors.category && (
                          <p className="text-sm text-destructive">{errors.category}</p>
                        )}
                      </div>

                      {/* Custom category input for "Autre" */}
                      {(formData.category === "Autre objet" || formData.category === "Autre plainte") && (
                        <div className="space-y-2 animate-fade-in">
                          <Label htmlFor="customCategory">Précisez la catégorie *</Label>
                          <Input
                            id="customCategory"
                            placeholder="Entrez votre catégorie personnalisée"
                            value={formData.customCategory}
                            onChange={(e) => {
                              setFormData({ ...formData, customCategory: e.target.value });
                              if (errors.customCategory) setErrors({ ...errors, customCategory: '' });
                            }}
                            className={errors.customCategory ? "border-destructive" : ""}
                          />
                          {errors.customCategory && (
                            <p className="text-sm text-destructive">{errors.customCategory}</p>
                          )}
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="description">Description détaillée *</Label>
                        <Textarea
                          id="description"
                          rows={6}
                          placeholder="Décrivez en détail votre déclaration (minimum 20 caractères)..."
                          value={formData.description}
                          onChange={(e) => {
                            setFormData({ ...formData, description: e.target.value });
                            if (errors.description) setErrors({ ...errors, description: '' });
                          }}
                          className={errors.description ? "border-destructive" : ""}
                        />
                        <p className="text-sm text-muted-foreground">
                          {formData.description.length}/20 caractères minimum
                        </p>
                        {errors.description && (
                          <p className="text-sm text-destructive">{errors.description}</p>
                        )}
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
                      max={maxDate}
                      value={formData.incidentDate}
                      onChange={(e) => {
                        setFormData({ ...formData, incidentDate: e.target.value });
                        if (errors.incidentDate) setErrors({ ...errors, incidentDate: '' });
                      }}
                      className={errors.incidentDate ? "border-destructive" : ""}
                    />
                    {errors.incidentDate && (
                      <p className="text-sm text-destructive">{errors.incidentDate}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Lieu *</Label>
                    <Input
                      id="location"
                      placeholder="Ex: Dakar, Plateau, Avenue Léopold Sédar Senghor"
                      value={formData.location}
                      onChange={(e) => {
                        setFormData({ ...formData, location: e.target.value });
                        if (errors.location) setErrors({ ...errors, location: '' });
                      }}
                      className={errors.location ? "border-destructive" : ""}
                    />
                    {errors.location && (
                      <p className="text-sm text-destructive">{errors.location}</p>
                    )}
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
                  
                  {/* Drag & Drop Zone */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`
                      border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
                      ${isDragging 
                        ? "border-primary bg-primary/5 scale-[1.02]" 
                        : "border-border hover:border-primary hover:bg-muted/50"
                      }
                    `}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      id="file-upload"
                      multiple
                      accept="image/*,.pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Upload className={`h-12 w-12 mx-auto mb-3 transition-colors ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
                      <p className="text-sm font-medium mb-1">
                        {isDragging ? "Déposez les fichiers ici" : "Glissez-déposez vos fichiers ici"}
                      </p>
                      <p className="text-sm text-muted-foreground mb-2">ou</p>
                      <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                        Parcourir les fichiers
                      </Button>
                      <p className="text-xs text-muted-foreground mt-3">
                        Images ou PDF (max 5 Mo par fichier)
                      </p>
                    </label>
                  </div>

                  {/* Attachments Preview */}
                  {attachments.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium">{attachments.length} fichier(s) ajouté(s)</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {attachments.map((att) => {
                          const IconComponent = getFileIcon(att.type);
                          return (
                            <div
                              key={att.id}
                              className="relative group bg-muted/50 rounded-lg border border-border overflow-hidden"
                            >
                              {att.type.startsWith('image/') ? (
                                <div className="aspect-video relative">
                                  <img
                                    src={att.data}
                                    alt={att.name}
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => removeAttachment(att.id)}
                                    >
                                      <X className="h-4 w-4 mr-1" />
                                      Supprimer
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="p-4 flex items-center gap-3">
                                  <IconComponent className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                                  <span className="text-sm truncate flex-1">{att.name}</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeAttachment(att.id)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                              {att.type.startsWith('image/') && (
                                <div className="p-2 border-t border-border">
                                  <p className="text-xs truncate">{att.name}</p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Navigation buttons */}
              <div className="flex justify-between pt-4 border-t">
                {currentStep > 1 ? (
                  <Button type="button" variant="outline" onClick={handlePrevious}>
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Précédent
                  </Button>
                ) : (
                  <div />
                )}
                <div>
                  {currentStep < totalSteps ? (
                    <Button type="button" onClick={handleNext}>
                      Suivant
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  ) : (
                    <Button type="button" onClick={handleFinalSubmit}>
                      Soumettre la déclaration
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
