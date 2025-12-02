import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl flex-1">
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="text-3xl">Politique de confidentialité</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Collecte des données</h2>
              <p className="text-muted-foreground">
                Le Portail Citoyen collecte uniquement les informations nécessaires au traitement de vos déclarations :
                nom complet, numéro de téléphone, adresse email (optionnel), détails de la déclaration, et informations
                techniques de connexion (type de navigateur, appareil, adresse IP).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Utilisation des données</h2>
              <p className="text-muted-foreground">
                Vos données personnelles sont utilisées exclusivement pour le traitement de votre déclaration et ne seront
                jamais partagées avec des tiers sans votre consentement explicite, sauf obligation légale.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Protection des données</h2>
              <p className="text-muted-foreground">
                Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles appropriées pour protéger
                vos données contre tout accès, modification, divulgation ou destruction non autorisés.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Durée de conservation</h2>
              <p className="text-muted-foreground">
                Vos données sont conservées pendant la durée nécessaire au traitement de votre déclaration et conformément
                aux obligations légales en vigueur.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Vos droits</h2>
              <p className="text-muted-foreground">
                Conformément à la réglementation en vigueur, vous disposez d'un droit d'accès, de rectification et de
                suppression de vos données personnelles. Pour exercer ces droits, contactez-nous à l'adresse :
                contact@portail.gov
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Cookies</h2>
              <p className="text-muted-foreground">
                Notre plateforme utilise uniquement des cookies essentiels au fonctionnement du service (stockage local
                pour le suivi de déclarations). Aucun cookie de traçage ou publicitaire n'est utilisé.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Modifications</h2>
              <p className="text-muted-foreground">
                Cette politique de confidentialité peut être modifiée. Toute modification substantielle sera communiquée
                aux utilisateurs via la plateforme.
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
