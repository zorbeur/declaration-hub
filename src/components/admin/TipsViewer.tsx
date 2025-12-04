import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDeclarations } from "@/hooks/useDeclarations";
import { Lightbulb, Phone, Eye, FileImage, File } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import { useActivityLog } from "@/hooks/useActivityLog";
import { useAuth } from "@/hooks/useAuth";
import { Tip } from "@/types/declaration";

export function TipsViewer() {
  const { declarations, markTipAsRead } = useDeclarations();
  const { addLog } = useActivityLog();
  const { currentUser } = useAuth();
  const [selectedTip, setSelectedTip] = useState<{ declarationId: string; tip: Tip } | null>(null);

  // Get all tips from all declarations
  const allTips = declarations.flatMap(d => 
    (d.tips || []).map(tip => ({
      ...tip,
      declarationId: d.id,
      declarationCode: d.trackingCode,
      declarationCategory: d.category,
    }))
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const unreadCount = allTips.filter(t => !t.isRead).length;

  const handleViewTip = (declarationId: string, tip: Tip & { declarationCode: string; declarationCategory: string }) => {
    setSelectedTip({ declarationId, tip });
    
    if (!tip.isRead) {
      markTipAsRead(declarationId, tip.id);
      
      if (currentUser) {
        addLog(
          currentUser.id,
          currentUser.username,
          "indice_lu",
          `Indice consulté pour la déclaration ${tip.declarationCode}`,
          declarationId,
          tip.declarationCode
        );
      }
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return FileImage;
    return File;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Indices reçus
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount} nouveau{unreadCount > 1 ? "x" : ""}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {allTips.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Aucun indice reçu</p>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {allTips.map((tip) => (
                  <div
                    key={tip.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-accent/50 ${
                      !tip.isRead ? "bg-primary/5 border-primary/20" : ""
                    }`}
                    onClick={() => handleViewTip(tip.declarationId, tip)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {!tip.isRead && (
                            <Badge variant="destructive" className="text-xs">Nouveau</Badge>
                          )}
                          <Badge variant="outline" className="font-mono text-xs">
                            {tip.declarationCode}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium">{tip.declarationCategory}</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {tip.description}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {tip.tipsterPhone}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(tip.createdAt).toLocaleString("fr-FR")}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Tip Detail Dialog */}
      <Dialog open={!!selectedTip} onOpenChange={() => setSelectedTip(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              Détails de l'indice
            </DialogTitle>
          </DialogHeader>
          
          {selectedTip && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Déclaration</p>
                <Badge variant="outline" className="font-mono mt-1">
                  {(selectedTip.tip as any).declarationCode}
                </Badge>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Contact</p>
                <div className="flex items-center gap-2 mt-1">
                  <Phone className="h-4 w-4 text-primary" />
                  <a 
                    href={`tel:${selectedTip.tip.tipsterPhone}`}
                    className="text-primary hover:underline font-medium"
                  >
                    {selectedTip.tip.tipsterPhone}
                  </a>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Description</p>
                <p className="text-sm whitespace-pre-wrap">{selectedTip.tip.description}</p>
              </div>

              {selectedTip.tip.attachments && selectedTip.tip.attachments.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Pièces jointes</p>
                  <div className="grid gap-2">
                    {selectedTip.tip.attachments.map((att) => {
                      const IconComponent = getFileIcon(att.type);
                      return (
                        <div key={att.id}>
                          {att.type.startsWith('image/') ? (
                            <img 
                              src={att.data} 
                              alt={att.name}
                              className="rounded-lg border max-h-64 w-full object-contain"
                            />
                          ) : (
                            <div className="flex items-center gap-2 p-2 border rounded">
                              <IconComponent className="h-5 w-5" />
                              <span className="text-sm">{att.name}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="text-xs text-muted-foreground border-t pt-3">
                Reçu le {new Date(selectedTip.tip.createdAt).toLocaleString("fr-FR")}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
