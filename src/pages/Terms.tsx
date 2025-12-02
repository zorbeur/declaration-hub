import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl flex-1">
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="text-3xl">Conditions d'utilisation</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Objet</h2>
              <p className="text-muted-foreground">
                Le Portail Citoyen est un service public permettant aux citoyens de soumettre des déclarations de perte
                et des plaintes de manière dématérialisée. L'utilisation de ce service implique l'acceptation pleine et
                entière des présentes conditions.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Accès au service</h2>
              <p className="text-muted-foreground">
                L'accès au service est gratuit pour tous les citoyens. L'utilisateur est responsable de maintenir la
                confidentialité de son code de suivi de déclaration.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Obligations de l'utilisateur</h2>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Fournir des informations exactes et véridiques</li>
                <li>Ne pas soumettre de fausses déclarations</li>
                <li>Respecter les lois en vigueur</li>
                <li>Ne pas utiliser le service à des fins frauduleuses ou malveillantes</li>
                <li>Ne pas tenter de compromettre la sécurité du système</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Responsabilité</h2>
              <p className="text-muted-foreground">
                Le service s'engage à traiter les déclarations dans les meilleurs délais. Toutefois, la plateforme ne
                garantit pas un résultat spécifique et ne peut être tenue responsable des décisions administratives ou
                judiciaires prises suite aux déclarations.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Propriété intellectuelle</h2>
              <p className="text-muted-foreground">
                Tous les éléments du Portail Citoyen (design, contenus, logos) sont protégés par le droit d'auteur.
                Toute reproduction ou utilisation non autorisée est interdite.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Disponibilité du service</h2>
              <p className="text-muted-foreground">
                Le service est accessible 24h/24 et 7j/7, sauf en cas de force majeure, de maintenance programmée ou de
                pannes techniques. Le service ne saurait être tenu responsable des interruptions temporaires.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Modification des conditions</h2>
              <p className="text-muted-foreground">
                Les présentes conditions peuvent être modifiées à tout moment. Les utilisateurs seront informés de toute
                modification substantielle.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Droit applicable</h2>
              <p className="text-muted-foreground">
                Les présentes conditions sont régies par le droit en vigueur. Tout litige sera soumis aux juridictions
                compétentes.
              </p>
            </section>

            <div className="mt-8 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
