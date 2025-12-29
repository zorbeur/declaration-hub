import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ImagePlus, X, Camera, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CoverPhotoUploadProps {
  value?: string;
  onChange: (base64: string | undefined) => void;
  className?: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function CoverPhotoUpload({ value, onChange, className }: CoverPhotoUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return "Format non supporté. Utilisez JPEG, PNG ou WebP.";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "Fichier trop volumineux (max 5 Mo)";
    }
    return null;
  };

  const compressImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
          }

          // Calculate dimensions (max 1200px)
          const maxDim = 1200;
          let { width, height } = img;
          
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to JPEG with 80% quality
          const compressed = canvas.toDataURL('image/jpeg', 0.8);
          resolve(compressed);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const processFile = async (file: File) => {
    const error = validateFile(file);
    if (error) {
      toast({
        title: "Erreur",
        description: error,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const compressed = await compressImage(file);
      onChange(compressed);
      toast({
        title: "Photo ajoutée",
        description: "Votre photo de couverture a été ajoutée",
      });
    } catch (err) {
      toast({
        title: "Erreur",
        description: "Impossible de traiter l'image",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
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

    const file = e.dataTransfer.files[0];
    if (file) {
      await processFile(file);
    }
  }, []);

  const handleRemove = () => {
    onChange(undefined);
    toast({
      title: "Photo supprimée",
      description: "La photo de couverture a été retirée",
    });
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label>Photo de couverture (optionnel)</Label>
      <p className="text-xs text-muted-foreground mb-2">
        Ajoutez une photo représentative (document perdu, lieu de l'incident, etc.)
      </p>

      {value ? (
        <div className="relative group rounded-lg overflow-hidden border border-border">
          <img
            src={value}
            alt="Photo de couverture"
            className="w-full aspect-video object-cover"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="h-4 w-4 mr-1" />
              Changer
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRemove}
            >
              <X className="h-4 w-4 mr-1" />
              Supprimer
            </Button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer",
            isDragging 
              ? "border-primary bg-primary/5 scale-[1.02]" 
              : "border-border hover:border-primary/50 hover:bg-muted/50",
            isLoading && "pointer-events-none opacity-60"
          )}
          onClick={() => !isLoading && fileInputRef.current?.click()}
        >
          {isLoading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Traitement de l'image...</p>
            </div>
          ) : (
            <>
              <ImagePlus className={cn(
                "h-10 w-10 mx-auto mb-3 transition-colors",
                isDragging ? "text-primary" : "text-muted-foreground"
              )} />
              <p className="text-sm font-medium">
                {isDragging ? "Déposez votre photo" : "Glissez-déposez une photo"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                ou cliquez pour parcourir
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                JPEG, PNG, WebP • Max 5 Mo
              </p>
            </>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
