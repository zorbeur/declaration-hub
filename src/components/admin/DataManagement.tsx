import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDataExport } from "@/hooks/useDataExport";
import { useToast } from "@/hooks/use-toast";
import { Declaration } from "@/types/declaration";
import { Download, Upload, Database, FileJson } from "lucide-react";
import { useRef } from "react";

interface DataManagementProps {
  declarations: Declaration[];
}

export function DataManagement({ declarations }: DataManagementProps) {
  const { exportToCSV, exportToJSON, backupAllData, restoreFromBackup } = useDataExport();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportCSV = () => {
    exportToCSV(declarations);
    toast({ title: "Export CSV réussi" });
  };

  const handleExportJSON = () => {
    exportToJSON(declarations, "declarations.json");
    toast({ title: "Export JSON réussi" });
  };

  const handleBackup = () => {
    backupAllData();
    toast({ title: "Sauvegarde complète créée" });
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await restoreFromBackup(file);
      toast({ title: "Restauration réussie" });
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      toast({ 
        title: "Erreur lors de la restauration", 
        description: "Fichier invalide",
        variant: "destructive" 
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Gestion des données
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Exporter les déclarations</h4>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportCSV} className="flex-1 gap-2">
                <Download className="h-4 w-4" />
                CSV
              </Button>
              <Button variant="outline" onClick={handleExportJSON} className="flex-1 gap-2">
                <FileJson className="h-4 w-4" />
                JSON
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-sm">Sauvegarde complète</h4>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleBackup} className="flex-1 gap-2">
                <Download className="h-4 w-4" />
                Sauvegarder
              </Button>
              <Button 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()} 
                className="flex-1 gap-2"
              >
                <Upload className="h-4 w-4" />
                Restaurer
              </Button>
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleRestore}
          className="hidden"
        />

        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground">
            <strong>Note:</strong> La sauvegarde complète inclut toutes les déclarations, 
            utilisateurs et l'historique d'activité. Conservez-la en lieu sûr.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
