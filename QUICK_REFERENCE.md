# Quick Reference - Accès aux Services

## 🌐 Frontend
- **URL**: http://localhost:5174
- **Port**: 5174 (5173 était occupé)
- **Démarrage**: `cd /workspaces/declaration-hub && npm run dev`

## 🔧 Backend API
- **URL**: http://127.0.0.1:8000
- **Port**: 8000
- **Démarrage**: `cd /workspaces/declaration-hub/API && source .venv/bin/activate && python manage.py runserver 0.0.0.0:8000`

## 📊 API Testing Interfaces

### 🎯 Swagger UI (Interactive)
- **URL**: http://127.0.0.1:8000/api/docs/
- **Fonction**: Tester les routes interactivement
- **Authentification**: Cliquez "Authorize" pour ajouter JWT token

### 📖 ReDoc (Documentation)
- **URL**: http://127.0.0.1:8000/api/redoc/
- **Fonction**: Documentation complète et lisible

### 📋 OpenAPI Schema
- **URL**: http://127.0.0.1:8000/api/schema/
- **Fonction**: Fichier JSON/YAML pour intégration

## 🔐 Admin Interfaces

### Django Admin
- **URL**: http://127.0.0.1:8000/admin/
- **Fonction**: Gestion directe des modèles (Declaration, User, etc.)
- **Authentification**: Créer un superuser avec `python manage.py createsuperuser`

### Frontend Admin Panel
- **URL**: http://localhost:5174/admin
- **Fonction**: Interface pour valider/rejeter les déclarations
- **Authentification**: Login/Register via frontend

## 📁 Fichiers Importants

### Documentation
- `README.md` - Vue d'ensemble du projet
- `FIXES_SUMMARY.md` - Résumé des corrections apportées
- `API_TESTING_INTERFACES.md` - Guide exhaustif des tests API
- `API/API_TESTING_GUIDE.md` - Guide détaillé API

### Configuration Frontend
- `vite.config.ts` - Configuration Vite
- `tsconfig.json` - Configuration TypeScript
- `tailwind.config.ts` - Configuration Tailwind CSS

### Configuration Backend
- `API/api_project/settings.py` - Paramètres Django
- `API/api_project/urls.py` - Routes principales
- `API/core/views.py` - ViewSets API
- `API/core/models.py` - Modèles de données

## 📦 Dépendances Clés

### Frontend
```json
{
  "react": "^18.3.1",
  "vite": "^5.4.19",
  "typescript": "^5.6.3",
  "tailwindcss": "^3.4.15",
  "react-google-recaptcha": "^3.10.0"
}
```

### Backend
```txt
Django>=4.2
djangorestframework>=3.14
djangorestframework-simplejwt>=5.2
django-cors-headers>=4.0
django-ratelimit>=4.1.0
drf-spectacular>=0.26
```

## 🔑 Configuration Importante

### reCAPTCHA (Test Keys - à remplacer en production)
```
Site Key: 6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI
Secret Key: 6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe
```

### JWT Configuration
```python
ACCESS_TOKEN_LIFETIME: 60 minutes
REFRESH_TOKEN_LIFETIME: 7 days
```

### Phone Format
```
Format requis: +228XXXXXXXX (ex: +22812345678)
```

## 🚀 Quick Start Commands

### Setup complet
```bash
# Frontend
cd /workspaces/declaration-hub
npm install
npm run dev

# Backend (dans une autre terminal)
cd /workspaces/declaration-hub/API
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver 0.0.0.0:8000
```

### Test API
```bash
# Via Swagger
curl http://127.0.0.1:8000/api/docs/

# Via cURL
curl -X GET http://127.0.0.1:8000/api/declarations/
```

## 📝 Logs

### Frontend
```
Vite logs: Check console in browser DevTools
```

### Backend
```bash
# Django server console affiche les requêtes
# Logs additionnels peuvent être configurés dans settings.py
```

## ✅ Checklist de Vérification

- [ ] Frontend compile sans erreur: `npm run dev`
- [ ] Backend démarre: `python manage.py runserver`
- [ ] Swagger accessible: http://127.0.0.1:8000/api/docs/
- [ ] Base de données initialisée: `python manage.py migrate`
- [ ] Superuser créé: `python manage.py createsuperuser`
- [ ] CORS configuré correctement: `CORS_ALLOW_ALL_ORIGINS = True`
- [ ] reCAPTCHA keys configurées (test ou production)

## 🆘 Troubleshooting

### Port 5173 occupé
→ Utiliser port 5174: `npm run dev` (configurable dans vite.config.ts)

### Django ne démarre pas
→ Vérifier migrations: `python manage.py migrate`
→ Vérifier port 8000 libre: `lsof -i :8000`

### Erreur 401 (Unauthorized)
→ Token JWT expiré ou invalide
→ Obtenir nouveau token: POST /api/auth/token/

### CORS Error
→ Frontend sur 5174, Backend sur 8000
→ Vérifier `CORS_ALLOW_ALL_ORIGINS = True` dans Django

## 📞 Support

Pour questions ou problèmes:
1. Consulter `FIXES_SUMMARY.md` pour historique des corrections
2. Consulter `API_TESTING_INTERFACES.md` pour tests API
3. Vérifier logs backend: `python manage.py runserver` (verbose mode)
4. Vérifier logs frontend: DevTools Console (F12)
