import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDataExport } from "@/hooks/useDataExport";
import { useToast } from "@/hooks/use-toast";
import { Declaration } from "@/types/declaration";
import { Download, Upload, Database, FileJson, Loader2, RefreshCw } from "lucide-react";
import { useRef, useState } from "react";

interface DataManagementProps {
  declarations: Declaration[];
}

export function DataManagement({ declarations }: DataManagementProps) {
  const { exportToCSV, exportToJSON, backupAllData, restoreFromBackup } = useDataExport();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSyncing, setIsSyncing] = useState(false);

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

  const handleSyncData = async () => {
    setIsSyncing(true);
    try {
      const pendingDeclarations = localStorage.getItem("declarations");
      if (!pendingDeclarations) {
        toast({
          title: "Aucune donnée à synchroniser",
          description: "Le localStorage est vide",
        });
        setIsSyncing(false);
        return;
      }

      const data = JSON.parse(pendingDeclarations);
      const declarationsToSync = Array.isArray(data) ? data : [];

      if (declarationsToSync.length === 0) {
        toast({
          title: "Aucune donnée à synchroniser",
          description: "Toutes les données sont déjà synchronisées",
        });
        setIsSyncing(false);
        return;
      }

      const result = await (await import('@/lib/api')).default.post('/api/sync/', { declarations: declarationsToSync });
      
      toast({
        title: "Synchronisation réussie",
        description: `${result.synced_count} déclaration(s) synchronisée(s)${result.error_count > 0 ? `, ${result.error_count} erreur(s)` : ''}`,
      });
    } catch (error) {
      toast({
        title: "Erreur de synchronisation",
        description: error instanceof Error ? error.message : "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
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
        <div className="grid gap-4 md:grid-cols-3">
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

          <div className="space-y-3">
            <h4 className="font-medium text-sm">Synchroniser</h4>
            <Button 
              variant="outline" 
              onClick={handleSyncData} 
              disabled={isSyncing}
              className="w-full gap-2"
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {isSyncing ? "Sync..." : "Sync DB"}
            </Button>
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
