import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Accessibility() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl flex-1">
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="text-3xl">Déclaration d'accessibilité</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">Engagement d'accessibilité</h2>
              <p className="text-muted-foreground">
                Le Portail Citoyen s'engage à rendre son service accessible à tous les citoyens, conformément aux
                standards d'accessibilité numérique en vigueur.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">État de conformité</h2>
              <p className="text-muted-foreground">
                Ce site web est en cours d'optimisation pour atteindre la conformité avec les directives d'accessibilité
                pour le contenu Web (WCAG) 2.1 niveau AA.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Fonctionnalités d'accessibilité</h2>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Navigation au clavier possible sur toutes les fonctionnalités</li>
                <li>Contraste suffisant entre le texte et l'arrière-plan</li>
                <li>Tailles de texte ajustables via les paramètres du navigateur</li>
                <li>Structure sémantique HTML correcte</li>
                <li>Formulaires avec labels explicites</li>
                <li>Messages d'erreur clairs et descriptifs</li>
                <li>Design responsive adapté à tous les écrans</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Technologies utilisées</h2>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>HTML5 sémantique</li>
                <li>CSS3 responsive</li>
                <li>JavaScript avec React</li>
                <li>ARIA (Accessible Rich Internet Applications) pour les composants interactifs</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Assistance et contact</h2>
              <p className="text-muted-foreground mb-3">
                Si vous rencontrez des difficultés pour accéder à ce service ou si vous souhaitez signaler un problème
                d'accessibilité, vous pouvez nous contacter :
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Email : accessibilite@portail.gov</li>
                <li>Téléphone : +00 000 000 000</li>
                <li>Adresse postale : Avenue de la République, Ville, Pays</li>
              </ul>
              <p className="text-muted-foreground mt-3">
                Nous nous engageons à vous répondre dans un délai de 72 heures et à trouver une solution alternative
                si nécessaire.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Améliorations continues</h2>
              <p className="text-muted-foreground">
                Nous travaillons continuellement à améliorer l'accessibilité de notre service. Des audits réguliers sont
                effectués et les retours des utilisateurs sont pris en compte pour corriger les problèmes identifiés.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Voies de recours</h2>
              <p className="text-muted-foreground">
                Si vous constatez un défaut d'accessibilité vous empêchant d'accéder à un contenu ou une fonctionnalité
                et que nous ne parvenons pas à le résoudre, vous êtes en droit de faire parvenir vos doléances ou une
                demande de saisine au Défenseur des Droits.
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
