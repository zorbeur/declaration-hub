import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { DeclarationAttachment, Tip } from "@/types/declaration";
import { Upload, X, Send, FileImage, Lightbulb } from "lucide-react";
import { MathCaptcha } from "./MathCaptcha";

interface TipSubmitFormProps {
  declarationId: string;
  trackingCode: string;
  onSubmit: (tip: Omit<Tip, "id" | "createdAt" | "isRead">) => void;
  isInModal?: boolean;
}

export function TipSubmitForm({ declarationId, trackingCode, onSubmit, isInModal = false }: TipSubmitFormProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  
  const [formData, setFormData] = useState({
    tipsterPhone: "",
    description: "",
  });
  const [attachments, setAttachments] = useState<DeclarationAttachment[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validatePhone = (phone: string): boolean => {
    // Format Togo: +228 suivi de 8 chiffres
    const phoneRegex = /^\+228[0-9]{8}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

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

    setAttachments([...attachments, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments(attachments.filter(a => a.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.tipsterPhone.trim()) {
      newErrors.tipsterPhone = "Le numéro de téléphone est requis";
    } else if (!validatePhone(formData.tipsterPhone)) {
      newErrors.tipsterPhone = "Format invalide. Utilisez +228 suivi de 8 chiffres";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Veuillez décrire votre indice";
    } else if (formData.description.trim().length < 10) {
      newErrors.description = "La description doit contenir au moins 10 caractères";
    }

    if (!captchaVerified) {
      newErrors.captcha = "Veuillez résoudre le captcha";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      toast({
        title: "Erreurs de validation",
        description: "Veuillez corriger les erreurs",
        variant: "destructive",
      });
      return;
    }

    onSubmit({
      declarationId,
      tipsterPhone: formData.tipsterPhone,
      description: formData.description,
      attachments,
    });

    toast({
      title: "Indice soumis avec succès",
      description: "Merci pour votre contribution. L'administrateur sera notifié.",
    });

    // Reset form
    setFormData({ tipsterPhone: "", description: "" });
    setAttachments([]);
    setCaptchaVerified(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tipsterPhone">Votre numéro de téléphone *</Label>
            <Input
              id="tipsterPhone"
              type="tel"
              placeholder="+22890123456"
              value={formData.tipsterPhone}
              onChange={(e) => {
                setFormData({ ...formData, tipsterPhone: e.target.value });
                if (errors.tipsterPhone) setErrors({ ...errors, tipsterPhone: '' });
              }}
              className={errors.tipsterPhone ? "border-destructive" : ""}
            />
            <p className="text-xs text-muted-foreground">Format: +228 suivi de 8 chiffres</p>
            {errors.tipsterPhone && (
              <p className="text-sm text-destructive">{errors.tipsterPhone}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipDescription">Votre indice *</Label>
            <Textarea
              id="tipDescription"
              placeholder="Décrivez ce que vous savez ou avez vu..."
              rows={4}
              value={formData.description}
              onChange={(e) => {
                setFormData({ ...formData, description: e.target.value });
                if (errors.description) setErrors({ ...errors, description: '' });
              }}
              className={errors.description ? "border-destructive" : ""}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description}</p>
            )}
          </div>

          {/* File upload */}
          <div className="space-y-2">
            <Label>Photos ou documents (optionnel)</Label>
            <div className="border-2 border-dashed rounded-lg p-4 text-center">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="hidden"
                id="tip-file-upload"
              />
              <label htmlFor="tip-file-upload" className="cursor-pointer">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Cliquez pour ajouter des fichiers</p>
              </label>
            </div>

            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {attachments.map((att) => (
                  <div key={att.id} className="flex items-center gap-2 bg-muted px-3 py-1 rounded-full text-sm">
                    <FileImage className="h-4 w-4" />
                    <span className="truncate max-w-[100px]">{att.name}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(att.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Captcha */}
          <MathCaptcha onVerified={setCaptchaVerified} />
          {errors.captcha && (
            <p className="text-sm text-destructive">{errors.captcha}</p>
          )}

      <Button type="submit" className="w-full gap-2">
        <Send className="h-4 w-4" />
        Envoyer l'indice
      </Button>
    </form>
  );
}
