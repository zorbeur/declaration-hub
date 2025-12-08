# API de Gestion des Déclarations

API sécurisée pour la gestion des déclarations de pertes et plaintes.

## 🔒 Fonctionnalités de Sécurité

- **Authentification JWT** avec tokens d'accès et de rafraîchissement
- **2FA (Two-Factor Authentication)** par code OTP
- **Hashing Argon2** pour les mots de passe (recommandé OWASP)
- **Rate Limiting** par IP pour prévenir les abus
- **Headers de sécurité** (CSP, HSTS, X-Frame-Options, etc.)
- **Validation stricte** des entrées avec Pydantic
- **Sanitisation HTML** avec Bleach
- **Logging structuré** pour audit
- **Séparation des rôles** dans une table dédiée (prévention escalade de privilèges)

## 📋 Prérequis

- Python 3.11+
- pip ou poetry

## 🚀 Installation

### Développement local

```bash
# Cloner et aller dans le dossier api
cd api

# Créer un environnement virtuel
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
.\venv\Scripts\activate  # Windows

# Installer les dépendances
pip install -r requirements.txt

# Copier et configurer l'environnement
cp .env.example .env
# Éditer .env avec vos valeurs

# Lancer l'application
python run.py
```

### Docker

```bash
# Construire et lancer
docker-compose up -d

# Voir les logs
docker-compose logs -f api
```

## 📚 Endpoints API

### Authentification (`/api/v1/auth`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/register` | Inscription |
| POST | `/login` | Connexion |
| POST | `/verify-2fa` | Vérification 2FA |
| POST | `/refresh` | Rafraîchir le token |
| POST | `/logout` | Déconnexion |
| GET | `/me` | Profil utilisateur |

### Déclarations (`/api/v1/declarations`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/` | Créer une déclaration (public) |
| GET | `/track/{code}` | Suivre une déclaration (public) |
| GET | `/public` | Liste des déclarations publiques |
| GET | `/admin` | Liste admin (auth requise) |
| GET | `/admin/{id}` | Détails admin (auth requise) |
| PATCH | `/admin/{id}` | Mise à jour admin (auth requise) |

### Indices (`/api/v1/tips`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/` | Soumettre un indice (public) |
| GET | `/admin` | Liste des indices (auth requise) |
| GET | `/admin/{id}` | Détails indice (auth requise) |
| PATCH | `/admin/{id}` | Mise à jour indice (auth requise) |

## 🔧 Configuration

Toutes les variables sont dans `.env`:

| Variable | Description | Défaut |
|----------|-------------|--------|
| `SECRET_KEY` | Clé secrète JWT (obligatoire!) | Généré aléatoirement |
| `DEBUG` | Mode debug | `false` |
| `DATABASE_URL` | URL de la base SQLite | `sqlite+aiosqlite:///./data/declarations.db` |
| `RATE_LIMIT_PER_MINUTE` | Limite requêtes/minute/IP | `60` |
| `ALLOWED_ORIGINS` | Domaines CORS autorisés | `["http://localhost:5173"]` |

## 📁 Structure du Projet

```
api/
├── app/
│   ├── api/
│   │   ├── deps.py          # Dépendances d'injection
│   │   └── routes/          # Endpoints API
│   ├── core/
│   │   ├── config.py        # Configuration
│   │   ├── database.py      # SQLAlchemy
│   │   └── security.py      # JWT, hashing
│   ├── middleware/
│   │   └── security.py      # Middlewares sécurité
│   ├── models/              # Modèles SQLAlchemy
│   ├── schemas/             # Schémas Pydantic
│   └── main.py              # Point d'entrée
├── data/                    # Base SQLite (persisté)
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
└── run.py
```

## 🔗 Connexion au Frontend

Dans votre frontend React, configurez l'URL de l'API:

```typescript
// src/lib/api.ts
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export async function createDeclaration(data: DeclarationCreate) {
  const response = await fetch(`${API_URL}/declarations/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}
```

## ⚠️ Sécurité en Production

1. **Changez `SECRET_KEY`** - Générez une clé unique
2. **Désactivez `DEBUG`** - Jamais en production
3. **Configurez HTTPS** - Utilisez un reverse proxy (nginx, traefik)
4. **Limitez CORS** - Mettez votre domaine exact
5. **Backup régulier** - Sauvegardez `./data/declarations.db`
6. **Monitoring** - Surveillez les logs et les erreurs

## 📜 Licence

MIT
