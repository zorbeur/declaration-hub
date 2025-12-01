import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Declaration } from "@/types/declaration";
import { FileText, Clock, CheckCircle, XCircle, TrendingUp, AlertTriangle } from "lucide-react";
import { useMemo } from "react";

interface AdminStatsProps {
  declarations: Declaration[];
}

export function AdminStats({ declarations }: AdminStatsProps) {
  const stats = useMemo(() => {
    const total = declarations.length;
    const pending = declarations.filter(d => d.status === "en_attente").length;
    const validated = declarations.filter(d => d.status === "validee").length;
    const rejected = declarations.filter(d => d.status === "rejetee").length;
    const urgent = declarations.filter(d => d.priority === "urgente").length;
    const important = declarations.filter(d => d.priority === "importante").length;

    // Last 7 days stats
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentDeclarations = declarations.filter(
      d => new Date(d.createdAt) >= sevenDaysAgo
    );

    // Average processing time (for completed declarations)
    const completedDeclarations = declarations.filter(
      d => d.status !== "en_attente"
    );
    const avgProcessingTime = completedDeclarations.length > 0
      ? completedDeclarations.reduce((sum, d) => {
          const created = new Date(d.createdAt).getTime();
          const updated = new Date(d.updatedAt).getTime();
          return sum + (updated - created);
        }, 0) / completedDeclarations.length / (1000 * 60 * 60)
      : 0;

    return {
      total,
      pending,
      validated,
      rejected,
      urgent,
      important,
      recentCount: recentDeclarations.length,
      avgProcessingHours: avgProcessingTime.toFixed(1),
      validationRate: total > 0 ? ((validated / total) * 100).toFixed(1) : "0",
    };
  }, [declarations]);

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-3xl font-semibold">{stats.total}</p>
            </div>
            <FileText className="h-8 w-8 text-muted-foreground opacity-50" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">En attente</p>
              <p className="text-3xl font-semibold">{stats.pending}</p>
            </div>
            <Clock className="h-8 w-8 text-warning opacity-50" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Validées</p>
              <p className="text-3xl font-semibold">{stats.validated}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-success opacity-50" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Rejetées</p>
              <p className="text-3xl font-semibold">{stats.rejected}</p>
            </div>
            <XCircle className="h-8 w-8 text-destructive opacity-50" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Urgentes</p>
              <p className="text-3xl font-semibold">{stats.urgent}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-destructive opacity-50" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Importantes</p>
              <p className="text-3xl font-semibold">{stats.important}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-warning opacity-50" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">7 derniers jours</p>
              <p className="text-3xl font-semibold">{stats.recentCount}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-primary opacity-50" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div>
            <p className="text-sm text-muted-foreground">Taux validation</p>
            <p className="text-3xl font-semibold">{stats.validationRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              Traitement moyen: {stats.avgProcessingHours}h
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
