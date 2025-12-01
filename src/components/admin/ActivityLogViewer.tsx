import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useActivityLog } from "@/hooks/useActivityLog";
import { Download, Trash2, Activity } from "lucide-react";
import { useDataExport } from "@/hooks/useDataExport";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export function ActivityLogViewer() {
  const { logs, getRecentLogs, clearLogs } = useActivityLog();
  const { exportActivityLogs } = useDataExport();
  const { toast } = useToast();

  const recentLogs = getRecentLogs(100);

  const handleExport = () => {
    exportActivityLogs(logs);
    toast({ title: "Historique exporté avec succès" });
  };

  const handleClear = () => {
    if (confirm("Êtes-vous sûr de vouloir effacer tout l'historique ?")) {
      clearLogs();
      toast({ title: "Historique effacé" });
    }
  };

  const getActionBadgeVariant = (action: string) => {
    if (action.includes("validé")) return "default";
    if (action.includes("rejeté")) return "destructive";
    if (action.includes("connexion")) return "secondary";
    return "outline";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Historique d'activité
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
              <Download className="h-4 w-4" />
              Exporter
            </Button>
            <Button variant="outline" size="sm" onClick={handleClear} className="gap-2">
              <Trash2 className="h-4 w-4" />
              Effacer
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {recentLogs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Aucune activité enregistrée</p>
          ) : (
            recentLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={getActionBadgeVariant(log.action)}>
                      {log.action}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.timestamp).toLocaleString("fr-FR")}
                    </span>
                  </div>
                  <p className="text-sm">{log.details}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Par {log.username}
                    {log.declarationId && ` • Déclaration: ${log.declarationId.slice(0, 8)}`}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
