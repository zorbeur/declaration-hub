import { useState, useMemo } from "react";
import { useDeclarations } from "@/hooks/useDeclarations";
import { useAuth } from "@/hooks/useAuth";
import { useActivityLog } from "@/hooks/useActivityLog";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileText, 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  Archive, 
  User, 
  Phone,
  Calendar,
  Send,
  History,
  AlertCircle
} from "lucide-react";
import { Declaration, DeclarationStatus, Priority } from "@/types/declaration";

const COMPLAINT_STATUSES: { value: DeclarationStatus; label: string; icon: React.ReactNode; color: string }[] = [
  { value: "en_attente", label: "En attente", icon: <Clock className="h-4 w-4" />, color: "bg-warning/10 text-warning" },
  { value: "en_cours", label: "En cours", icon: <AlertCircle className="h-4 w-4" />, color: "bg-primary/10 text-primary" },
  { value: "resolue", label: "Résolue", icon: <CheckCircle className="h-4 w-4" />, color: "bg-success/10 text-success" },
  { value: "classee", label: "Classée", icon: <Archive className="h-4 w-4" />, color: "bg-muted text-muted-foreground" },
];

export function ComplaintManagement() {
  const { declarations, updateDeclarationStatus, addMessage, markMessagesAsRead } = useDeclarations();
  const { currentUser } = useAuth();
  const { addLog } = useActivityLog();
  const { toast } = useToast();

  const [selectedComplaint, setSelectedComplaint] = useState<Declaration | null>(null);
  const [statusFilter, setStatusFilter] = useState<DeclarationStatus | "all">("all");
  const [newMessage, setNewMessage] = useState("");
  const [statusComment, setStatusComment] = useState("");
  const [newPriority, setNewPriority] = useState<Priority>("moyenne");

  // Get only complaints (type === "plainte")
  const complaints = useMemo(() => {
    return declarations
      .filter(d => d.type === "plainte")
      .filter(d => statusFilter === "all" || d.status === statusFilter)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [declarations, statusFilter]);

  const handleStatusChange = (complaint: Declaration, newStatus: DeclarationStatus) => {
    updateDeclarationStatus(
      complaint.id,
      newStatus,
      newPriority,
      currentUser?.username || "Admin",
      statusComment || undefined
    );

    addLog(
      currentUser?.id || "unknown",
      currentUser?.username || "Admin",
      newStatus === "resolue" ? "declaration_resolue" : 
      newStatus === "classee" ? "declaration_classee" :
      newStatus === "en_cours" ? "declaration_en_cours" : "autre",
      `Plainte ${complaint.trackingCode}: statut changé vers ${newStatus}${statusComment ? ` - ${statusComment}` : ""}`,
      complaint.id,
      complaint.trackingCode
    );

    toast({
      title: "Statut mis à jour",
      description: `La plainte a été marquée comme "${COMPLAINT_STATUSES.find(s => s.value === newStatus)?.label}"`,
    });

    setStatusComment("");
  };

  const handleSendMessage = () => {
    if (!selectedComplaint || !newMessage.trim()) return;

    addMessage(selectedComplaint.id, {
      declarationId: selectedComplaint.id,
      content: newMessage,
      senderType: "admin",
      senderId: currentUser?.id || "admin",
      senderName: currentUser?.username || "Admin",
    });

    addLog(
      currentUser?.id || "unknown",
      currentUser?.username || "Admin",
      "message_envoye",
      `Message envoyé sur la plainte ${selectedComplaint.trackingCode}`,
      selectedComplaint.id,
      selectedComplaint.trackingCode
    );

    toast({ title: "Message envoyé" });
    setNewMessage("");
  };

  const openComplaintDetails = (complaint: Declaration) => {
    setSelectedComplaint(complaint);
    setNewPriority(complaint.priority || "moyenne");
    // Mark messages as read
    if (complaint.messages?.some(m => m.senderType === "declarant" && !m.isRead)) {
      markMessagesAsRead(complaint.id, "admin");
    }
  };

  const getStatusConfig = (status: DeclarationStatus) => {
    return COMPLAINT_STATUSES.find(s => s.value === status) || COMPLAINT_STATUSES[0];
  };

  const getUnreadCount = (complaint: Declaration) => {
    return complaint.messages?.filter(m => m.senderType === "declarant" && !m.isRead).length || 0;
  };

  const stats = useMemo(() => ({
    total: complaints.length,
    enAttente: declarations.filter(d => d.type === "plainte" && d.status === "en_attente").length,
    enCours: declarations.filter(d => d.type === "plainte" && d.status === "en_cours").length,
    resolues: declarations.filter(d => d.type === "plainte" && d.status === "resolue").length,
    classees: declarations.filter(d => d.type === "plainte" && d.status === "classee").length,
  }), [declarations, complaints.length]);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total plaintes</p>
          </CardContent>
        </Card>
        <Card className="border-warning/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-warning">{stats.enAttente}</p>
            <p className="text-sm text-muted-foreground">En attente</p>
          </CardContent>
        </Card>
        <Card className="border-primary/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{stats.enCours}</p>
            <p className="text-sm text-muted-foreground">En cours</p>
          </CardContent>
        </Card>
        <Card className="border-success/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-success">{stats.resolues}</p>
            <p className="text-sm text-muted-foreground">Résolues</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-muted-foreground">{stats.classees}</p>
            <p className="text-sm text-muted-foreground">Classées</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={statusFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("all")}
        >
          Toutes
        </Button>
        {COMPLAINT_STATUSES.map(status => (
          <Button
            key={status.value}
            variant={statusFilter === status.value ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(status.value)}
            className="gap-2"
          >
            {status.icon}
            {status.label}
          </Button>
        ))}
      </div>

      {/* Complaints List */}
      <div className="grid gap-4">
        {complaints.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">Aucune plainte trouvée</p>
            </CardContent>
          </Card>
        ) : (
          complaints.map(complaint => {
            const statusConfig = getStatusConfig(complaint.status);
            const unreadCount = getUnreadCount(complaint);

            return (
              <Card 
                key={complaint.id} 
                className="hover:shadow-lg transition-all cursor-pointer"
                onClick={() => openComplaintDetails(complaint)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="font-mono">
                          {complaint.trackingCode}
                        </Badge>
                        <Badge className={statusConfig.color}>
                          {statusConfig.icon}
                          <span className="ml-1">{statusConfig.label}</span>
                        </Badge>
                        {complaint.priority && (
                          <Badge variant="secondary">
                            Priorité: {complaint.priority}
                          </Badge>
                        )}
                        {unreadCount > 0 && (
                          <Badge variant="destructive" className="gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {unreadCount} nouveau{unreadCount > 1 ? "x" : ""}
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-semibold">{complaint.category}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {complaint.description}
                      </p>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {complaint.declarantName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(complaint.createdAt).toLocaleDateString("fr-FR")}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Complaint Details Dialog */}
      <Dialog open={!!selectedComplaint} onOpenChange={() => setSelectedComplaint(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          {selectedComplaint && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Plainte {selectedComplaint.trackingCode}
                </DialogTitle>
              </DialogHeader>

              <div className="grid md:grid-cols-2 gap-6 flex-1 overflow-hidden">
                {/* Left Column - Details */}
                <div className="space-y-4 overflow-y-auto">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Informations</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{selectedComplaint.declarantName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedComplaint.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{new Date(selectedComplaint.incidentDate).toLocaleDateString("fr-FR")}</span>
                      </div>
                      <div className="pt-2 border-t">
                        <p className="font-medium mb-1">{selectedComplaint.category}</p>
                        <p className="text-muted-foreground">{selectedComplaint.description}</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Status History */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <History className="h-4 w-4" />
                        Historique des modifications
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[150px]">
                        <div className="space-y-2">
                          {selectedComplaint.statusHistory?.map((entry, idx) => (
                            <div key={idx} className="text-xs border-l-2 border-primary/20 pl-3 py-1">
                              <p className="font-medium">{entry.status}</p>
                              <p className="text-muted-foreground">
                                {entry.changedBy} - {new Date(entry.changedAt).toLocaleString("fr-FR")}
                              </p>
                              {entry.comment && (
                                <p className="text-muted-foreground italic">"{entry.comment}"</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>

                  {/* Status Change */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Changer le statut</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Priorité</Label>
                          <Select value={newPriority} onValueChange={(v) => setNewPriority(v as Priority)}>
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="faible">Faible</SelectItem>
                              <SelectItem value="moyenne">Moyenne</SelectItem>
                              <SelectItem value="importante">Importante</SelectItem>
                              <SelectItem value="urgente">Urgente</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Commentaire (optionnel)</Label>
                        <Input
                          value={statusComment}
                          onChange={(e) => setStatusComment(e.target.value)}
                          placeholder="Raison du changement..."
                          className="h-8"
                        />
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {COMPLAINT_STATUSES.filter(s => s.value !== "en_attente").map(status => (
                          <Button
                            key={status.value}
                            size="sm"
                            variant={selectedComplaint.status === status.value ? "default" : "outline"}
                            onClick={() => handleStatusChange(selectedComplaint, status.value)}
                            className="gap-1"
                          >
                            {status.icon}
                            {status.label}
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column - Messages */}
                <div className="flex flex-col overflow-hidden">
                  <Card className="flex-1 flex flex-col overflow-hidden">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Communication
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col overflow-hidden">
                      <ScrollArea className="flex-1 pr-4">
                        <div className="space-y-3">
                          {(!selectedComplaint.messages || selectedComplaint.messages.length === 0) ? (
                            <p className="text-sm text-muted-foreground text-center py-8">
                              Aucun message pour cette plainte
                            </p>
                          ) : (
                            selectedComplaint.messages.map(msg => (
                              <div
                                key={msg.id}
                                className={`p-3 rounded-lg text-sm ${
                                  msg.senderType === "admin"
                                    ? "bg-primary/10 ml-4"
                                    : "bg-muted mr-4"
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium text-xs">
                                    {msg.senderName || (msg.senderType === "admin" ? "Admin" : "Déclarant")}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(msg.createdAt).toLocaleString("fr-FR")}
                                  </span>
                                </div>
                                <p>{msg.content}</p>
                              </div>
                            ))
                          )}
                        </div>
                      </ScrollArea>

                      <div className="pt-3 mt-3 border-t flex gap-2">
                        <Textarea
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Écrire un message..."
                          rows={2}
                          className="resize-none"
                        />
                        <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
