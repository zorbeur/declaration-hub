import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Trash2, Shield } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export function AdminUsers() {
  const { toast } = useToast();
  const auth = useAuth();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", email: "", password: "" });

  const users = JSON.parse(localStorage.getItem("admin_users") || "[]");

  const handleAddUser = () => {
    if (!newUser.username || !newUser.email || !newUser.password) {
      toast({ title: "Tous les champs sont requis", variant: "destructive" });
      return;
    }

    const result = auth.register(newUser.username, newUser.email, newUser.password);
    if (result.success) {
      toast({ title: "Utilisateur ajouté avec succès" });
      setShowAddDialog(false);
      setNewUser({ username: "", email: "", password: "" });
    } else {
      toast({ title: result.error || "Erreur lors de l'ajout", variant: "destructive" });
    }
  };

  const handleDeleteUser = (userId: string) => {
    if (userId === auth.currentUser?.id) {
      toast({ title: "Vous ne pouvez pas supprimer votre propre compte", variant: "destructive" });
      return;
    }

    const updatedUsers = users.filter((u: any) => u.id !== userId);
    localStorage.setItem("admin_users", JSON.stringify(updatedUsers));
    toast({ title: "Utilisateur supprimé" });
    window.location.reload();
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
                      <p className="font-medium">{user.username}</p>
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
                      onClick={() => handleDeleteUser(user.id)}
                      disabled={user.id === auth.currentUser?.id}
                      className="gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
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
