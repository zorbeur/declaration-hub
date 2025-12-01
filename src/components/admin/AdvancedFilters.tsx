import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { DeclarationStatus, Priority } from "@/types/declaration";

interface AdvancedFiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  statusFilter: DeclarationStatus | "all";
  setStatusFilter: (value: DeclarationStatus | "all") => void;
  priorityFilter: Priority | "all";
  setPriorityFilter: (value: Priority | "all") => void;
  typeFilter: "all" | "plainte" | "perte";
  setTypeFilter: (value: "all" | "plainte" | "perte") => void;
  onReset: () => void;
}

export function AdvancedFilters({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  priorityFilter,
  setPriorityFilter,
  typeFilter,
  setTypeFilter,
  onReset,
}: AdvancedFiltersProps) {
  return (
    <div className="grid gap-4 md:grid-cols-5 mb-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
        <SelectTrigger>
          <SelectValue placeholder="Statut" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les statuts</SelectItem>
          <SelectItem value="en_attente">En attente</SelectItem>
          <SelectItem value="validee">Validées</SelectItem>
          <SelectItem value="rejetee">Rejetées</SelectItem>
        </SelectContent>
      </Select>

      <Select value={priorityFilter} onValueChange={(value) => setPriorityFilter(value as any)}>
        <SelectTrigger>
          <SelectValue placeholder="Priorité" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes priorités</SelectItem>
          <SelectItem value="urgente">Urgente</SelectItem>
          <SelectItem value="importante">Importante</SelectItem>
          <SelectItem value="moyenne">Moyenne</SelectItem>
          <SelectItem value="faible">Faible</SelectItem>
        </SelectContent>
      </Select>

      <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as any)}>
        <SelectTrigger>
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les types</SelectItem>
          <SelectItem value="plainte">Plaintes</SelectItem>
          <SelectItem value="perte">Pertes</SelectItem>
        </SelectContent>
      </Select>

      <Button variant="outline" onClick={onReset} className="gap-2">
        <X className="h-4 w-4" />
        Réinitialiser
      </Button>
    </div>
  );
}
