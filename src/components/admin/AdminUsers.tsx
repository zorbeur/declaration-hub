import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useActivityLog } from "@/hooks/useActivityLog";
import { UserPlus, Shield, ShieldCheck, ShieldOff } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function AdminUsers() {
  const { toast } = useToast();
  const auth = useAuth();
  const { addLog } = useActivityLog();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", email: "", password: "", enable2FA: false });

  const users = JSON.parse(localStorage.getItem("admin_users") || "[]");

  const handleAddUser = () => {
    if (!newUser.username || !newUser.email || !newUser.password) {
      toast({ title: "Tous les champs sont requis", variant: "destructive" });
      return;
    }

    const result = auth.register(newUser.username, newUser.email, newUser.password, newUser.enable2FA);
    if (result.success) {
      // Log the action
      if (auth.currentUser) {
        addLog(
          auth.currentUser.id,
          auth.currentUser.username,
          "utilisateur_ajoute",
          `Nouvel administrateur créé: ${newUser.username}`,
          undefined,
          undefined,
          { newUsername: newUser.username, newEmail: newUser.email, has2FA: newUser.enable2FA }
        );
      }

      toast({ title: "Utilisateur ajouté avec succès" });
      setShowAddDialog(false);
      setNewUser({ username: "", email: "", password: "", enable2FA: false });
    } else {
      toast({ title: result.error || "Erreur lors de l'ajout", variant: "destructive" });
    }
  };

  const handleToggle2FA = (userId: string, currentlyEnabled: boolean) => {
    if (currentlyEnabled) {
      const result = auth.disable2FA(userId);
      if (result.success) {
        if (auth.currentUser) {
          addLog(
            auth.currentUser.id,
            auth.currentUser.username,
            "2fa_desactive",
            `2FA désactivé pour l'utilisateur`,
            undefined,
            undefined,
            { targetUserId: userId }
          );
        }
        toast({ title: "2FA désactivé" });
        window.location.reload();
      }
    } else {
      const result = auth.enable2FA(userId);
      if (result.success) {
        if (auth.currentUser) {
          addLog(
            auth.currentUser.id,
            auth.currentUser.username,
            "2fa_active",
            `2FA activé pour l'utilisateur`,
            undefined,
            undefined,
            { targetUserId: userId }
          );
        }
        toast({ title: "2FA activé" });
        window.location.reload();
      }
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Gestion des utilisateurs</CardTitle>
            <Button onClick={() => setShowAddDialog(true)} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Ajouter un utilisateur
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Les administrateurs ne peuvent pas être supprimés. Contactez le super-administrateur pour la gestion des comptes.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            {users.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Aucun utilisateur</p>
            ) : (
              users.map((user: any) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{user.username}</p>
                        {user.twoFactorEnabled && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <ShieldCheck className="h-3 w-3" />
                            2FA
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Créé le {new Date(user.createdAt).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {user.id === auth.currentUser?.id && (
                      <Badge variant="outline">Vous</Badge>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggle2FA(user.id, user.twoFactorEnabled)}
                      className="gap-2"
                    >
                      {user.twoFactorEnabled ? (
                        <>
                          <ShieldOff className="h-4 w-4" />
                          Désactiver 2FA
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="h-4 w-4" />
                          Activer 2FA
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un administrateur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Nom d'utilisateur</Label>
              <Input
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                placeholder="admin2"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="admin@example.com"
              />
            </div>
            <div>
              <Label>Mot de passe</Label>
              <Input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="••••••••"
              />
            </div>
            <div className="flex items-center space-x-2 py-2">
              <Checkbox
                id="enable2FA"
                checked={newUser.enable2FA}
                onCheckedChange={(checked) => setNewUser({ ...newUser, enable2FA: checked as boolean })}
              />
              <Label htmlFor="enable2FA" className="text-sm font-normal cursor-pointer">
                Activer l'authentification à deux facteurs (2FA)
              </Label>
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={handleAddUser} className="flex-1">
                Ajouter
              </Button>
              <Button variant="outline" onClick={() => setShowAddDialog(false)} className="flex-1">
                Annuler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
