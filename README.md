# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/a2c375c7-8ce8-48c0-bf19-c83eb43fd3ad

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/a2c375c7-8ce8-48c0-bf19-c83eb43fd3ad) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/a2c375c7-8ce8-48c0-bf19-c83eb43fd3ad) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Dépendances et tests locaux

**Backend (API Django)**
- Fichiers de dépendances: `API/requirements.txt`
- Principales dépendances : `Django`, `djangorestframework`, `djangorestframework-simplejwt`, `django-cors-headers`, `django-ratelimit`, `pillow`, `requests`.

Installation et lancement (depuis le dossier `API`):
```bash
# créer et activer un virtualenv
python -m venv .venv
source .venv/bin/activate

# installer les dépendances
pip install -r requirements.txt

# appliquer les migrations
python manage.py migrate

# créer un superuser (optionnel)
python manage.py createsuperuser

# lancer le serveur de développement
python manage.py runserver 0.0.0.0:8000
```

**Frontend (React + Vite)**
- Fichier de dépendances : `package.json`
- Principales dépendances : React, Vite, TypeScript, `react-google-recaptcha`, `lucide-react`, `@radix-ui/*`, `tailwindcss`, etc.

Installation et lancement (depuis la racine du projet) :
```bash
npm install
npm run dev
```

## Test E2E local (exemple)
Un script de test simple est fourni dans `API/tmp/e2e_test_post.py` qui poste une déclaration vers l'API en utilisant les clés reCAPTCHA de test. Le projet utilise par défaut les clés de test reCAPTCHA :

- Site key (test) : `6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI`
- Secret (test) : `6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe`

Pour exécuter le test E2E local (serveur Django démarré et virtualenv activé) :
```bash
# depuis le dossier API
source .venv/bin/activate
/usr/bin/env python API/tmp/e2e_test_post.py
```

Le script affichera le status HTTP et le JSON renvoyé par l'API (le `tracking_code` généré côté serveur).

## Notes
- Le serveur génère désormais automatiquement `id` et `tracking_code` si le client ne les fournit pas (sécurité et prévention des collisions).
- Les protections (rate-limiting, reCAPTCHA) sont gérées via le modèle `ProtectionSettings` et peuvent être activées/désactivées depuis l'interface d'administration.
