# API Django - Documentation Complète

## Vue d'ensemble

API Django sécurisée et complète avec :
- ✓ Authentification JWT (SimpleJWT)
- ✓ Inscription avec vérification email (utilisateur inactif jusqu'à vérification)
- ✓ Two-Factor Authentication (2FA) par email
- ✓ Envoi d'emails via script Node `mail.js` (nodemailer)
- ✓ Upload de fichiers (multipart) avec validation
- ✓ Validations robustes (email, téléphone, fichiers)
- ✓ Gestion d'erreurs cohérente
- ✓ SQLite (développement) / PostgreSQL (production)
- ✓ Logging d'activité et audit
- ✓ Backup/restore JSON

## Installation

### Pré-requis
- Python 3.11+
- Node.js 16+ et npm
- pip, venv

### Étapes

```bash
cd /workspaces/declaration-hub/API

# 1. Environnement virtuel Python
python -m venv .venv
source .venv/bin/activate  # ou .venv\Scripts\activate sous Windows

# 2. Dépendances Python
pip install -r requirements.txt

# 3. Dépendances Node
npm install

# 4. Variables d'environnement (ajouter à .env ou export)
export SMTP_HOST=smtp.gmail.com
export SMTP_PORT=587
export SMTP_USER='your-email@gmail.com'
export SMTP_PASS='your-app-password'
export DJANGO_SECRET_KEY='your-secret-key'

# 5. Migrations (déjà appliquées)
python manage.py migrate

# 6. Créer un superuser (optionnel)
python manage.py createsuperuser

# 7. Démarrer le serveur
python manage.py runserver 0.0.0.0:8000
```

Accès :
- API : http://localhost:8000/api/
- Admin : http://localhost:8000/admin/

## Sécurité

| Aspect | Mesure |
|--------|--------|
| Mots de passe | Django PBKDF2 |
| Tokens email/reset | Hachés SHA-256 |
| JWT | 60 min (access) / 7 jours (refresh) |
| Uploads | Max 50MB, validation MIME |
| CORS | Configuré pour frontend |
| 2FA | Code OTP 6 chiffres, 5 min |
| Rate limiting | django-ratelimit (optionnel) |

## Endpoints API

### Authentification

#### Inscription
```http
POST /api/auth/register/
Content-Type: application/json

{
  "username": "user123",
  "email": "user@example.com",
  "password": "SecureP@ssw0rd",
  "first_name": "Jean",
  "last_name": "Dupont"
}
```

Réponse :
```json
{
  "id": 1,
  "username": "user123",
  "email": "user@example.com"
}
```

**Important** : L'utilisateur est créé avec `is_active=False`. Un email avec un token de vérification est envoyé (valide 24h).

#### Vérifier email
```http
POST /api/auth/verify-email/
Content-Type: application/json

{
  "token": "le-token-recu-par-email"
}
```

Réponse :
```json
{
  "detail": "verified",
  "username": "user123"
}
```

#### Connexion (JWT)
```http
POST /api/auth/token/
Content-Type: application/json

{
  "username": "user123",
  "password": "SecureP@ssw0rd"
}
```

Réponse :
```json
{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

#### Rafraîchir token
```http
POST /api/auth/token/refresh/
Content-Type: application/json

{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

#### 2FA - Demander code
```http
POST /api/auth/2fa/send/
Content-Type: application/json

{
  "username": "user123"
}
```

Réponse :
```json
{
  "detail": "code sent"
}
```

#### 2FA - Vérifier code
```http
POST /api/auth/2fa/verify/
Content-Type: application/json

{
  "username": "user123",
  "code": "123456"
}
```

Réponse :
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

### Déclarations

#### Créer une déclaration
```http
POST /api/declarations/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "declarant_name": "Jean Dupont",
  "phone": "+33612345678",
  "email": "jean@example.com",
  "type": "plainte",
  "category": "vol",
  "description": "Dépôt de plainte pour vol de portefeuille...",
  "incident_date": "2025-12-02T14:30:00Z",
  "location": "Paris, France",
  "reward": "200€",
  "browser_info": "Mozilla/5.0...",
  "device_type": "mobile",
  "device_model": "iPhone 12",
  "ip_address": "192.168.1.1"
}
```

Réponse :
```json
{
  "id": "abc123...",
  "tracking_code": "ABCD-EFGH-IJKL",
  "declarant_name": "Jean Dupont",
  "status": "en_attente",
  "created_at": "2025-12-03T10:00:00Z"
}
```

#### Lister les déclarations
```http
GET /api/declarations/
Authorization: Bearer {access_token}
```

Réponse :
```json
[
  {
    "id": "abc123...",
    "tracking_code": "ABCD-EFGH-IJKL",
    "declarant_name": "Jean Dupont",
    "status": "en_attente"
  }
]
```

#### Chercher par code de suivi (public)
```http
GET /api/declarations/by-code/?code=ABCD-EFGH-IJKL
```

#### Mettre à jour le statut
```http
PATCH /api/declarations/{id}/
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "status": "validee",
  "priority": "importante"
}
```

### Fichiers

#### Upload de fichier
```http
POST /api/attachments/upload/
Authorization: Bearer {access_token}
Content-Type: multipart/form-data

file: <fichier binary>
```

Réponse :
```json
{
  "id": "xyz789...",
  "name": "document.pdf",
  "file": "http://localhost:8000/media/attachments/2025/12/document.pdf",
  "mime_type": "application/pdf",
  "size": 1024000,
  "uploaded_at": "2025-12-03T10:00:00Z"
}
```

Restrictions :
- Taille max : 50 MB
- Types : tous acceptés (PDF, images, documents, etc.)

### Logs & Admin

#### Lister les logs d'activité
```http
GET /api/activity-logs/
Authorization: Bearer {admin_token}
```

#### Effacer les logs
```http
POST /api/activity-logs/clear/
Authorization: Bearer {admin_token}
```

#### Exporter (backup)
```http
GET /api/admin/backup/
Authorization: Bearer {admin_token}
```

Réponse : JSON avec déclarations, utilisateurs, et logs d'activité.

#### Importer (restore)
```http
POST /api/admin/backup/
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "declarations": [...],
  "users": [...],
  "activity_logs": [...]
}
```

### Utilisateurs

#### Activer 2FA
```http
POST /api/users/{user_id}/enable_2fa/
Authorization: Bearer {admin_token}
```

#### Désactiver 2FA
```http
POST /api/users/{user_id}/disable_2fa/
Authorization: Bearer {admin_token}
```

## Frontend - Synchronisation offline/online

### Stratégie

Le frontend synchronise les données localement et avec l'API :

1. **En ligne** (navigator.onLine = true)
   - Charge les données depuis l'API
   - Envoie les modifications à l'API
   - Met en cache localement pour fallback

2. **Hors ligne** (navigator.onLine = false)
   - Utilise le cache localStorage
   - Queue les modifications (offline queue)

3. **Reconnexion**
   - Synchro auto des données depuis l'API
   - Push de l'offline queue vers l'API

### Hooks modifiés

**useDeclarations.ts**
```typescript
const { declarations, addDeclaration, online } = useDeclarations();
// online = true/false selon connexion
// addDeclaration = sync auto vers API si online, sinon queue
```

**useAuth.ts**
```typescript
const { currentUser, login, register, online } = useAuth();
// Connexion/inscription via API si online, sinon fallback localStorage
```

**useActivityLog.ts**
```typescript
const { logs, addLog, online } = useActivityLog();
// Logs synchronisés avec API, fallback local en offline
```

## Structure du code

```
API/
├── manage.py                  # Utilitaire Django
├── requirements.txt           # Dépendances Python
├── package.json              # Dépendances Node
├── mail.js                   # Script envoi emails
│
├── api_project/
│   ├── settings.py           # Config Django
│   ├── urls.py               # Routage principal
│   ├── wsgi.py               # WSGI
│   └── asgi.py               # ASGI
│
├── core/
│   ├── models.py             # Declaration, Attachment, ActivityLog, etc.
│   ├── serializers.py        # Validation & sérialisation DRF
│   ├── views.py              # APIView & ViewSets
│   ├── urls.py               # Routes de l'API
│   ├── admin.py              # Interface admin Django
│   ├── apps.py               # Config app
│   └── migrations/
│       └── 0001_initial.py   # Migrations initiales
│
├── media/                     # Uploads (attachments)
├── db.sqlite3                # Base de données (dev)
└── .venv/                    # Virtualenv Python
```

## Workflow type

### Inscription sécurisée

```
1. User POST /auth/register/ (username, email, password)
   ↓
2. API crée User (is_active=False)
   ↓
3. API envoie email avec token (24h)
   ↓
4. User clique lien ou POST /auth/verify-email/ (token)
   ↓
5. API active User (is_active=True)
   ↓
6. User peut se connecter via /auth/token/
```

### Création de déclaration (offline-aware)

```
Frontend (online=true)
  ↓
  POST /declarations/ (new declaration)
  ↓
API stocke en DB
  ↓
Frontend recharge depuis API
  ↓
Affichage déclaration avec status "en_attente"

---

Frontend (online=false)
  ↓
addDeclaration() → localStorage + offlineQueue
  ↓
Affichage déclaration localement
  ↓
Reconnexion (online=true)
  ↓
Sync auto: offlineQueue → API
  ↓
Recharge depuis API
```

## Erreurs et gestion

### Codes HTTP

| Code | Signification |
|------|---------------|
| 200 | Succès |
| 201 | Créé |
| 400 | Erreur validation |
| 401 | Non authentifié |
| 403 | Accès refusé |
| 404 | Non trouvé |
| 500 | Erreur serveur |

### Exemples d'erreurs

```json
{
  "detail": "Ce nom d'utilisateur existe déjà"
}
```

```json
{
  "detail": "token expired"
}
```

```json
{
  "detail": "invalid code"
}
```

## Configuration email

### Gmail
```bash
export SMTP_HOST=smtp.gmail.com
export SMTP_PORT=587
export SMTP_USER=your-email@gmail.com
export SMTP_PASS=your-app-password  # Pas le mot de passe Gmail!
```

[Générer un mot de passe d'application Gmail](https://myaccount.google.com/apppasswords)

### Sendgrid
```bash
export SMTP_HOST=smtp.sendgrid.net
export SMTP_PORT=587
export SMTP_USER=apikey
export SMTP_PASS=SG.your-api-key
```

### Outlook/Office365
```bash
export SMTP_HOST=smtp.office365.com
export SMTP_PORT=587
export SMTP_USER=your-email@outlook.com
export SMTP_PASS=your-password
```

## Tests & développement

```bash
# Créer un utilisateur de test
python manage.py shell
>>> from django.contrib.auth.models import User
>>> User.objects.create_user('testuser', 'test@example.com', 'testpass123')

# Voir les logs
tail -f logs/django.log

# Simuler offline en dev
# Frontend: localStorage.setItem('offline', 'true')
```

## Déploiement

### Production checklist

- [ ] `DEBUG=False` dans settings.py
- [ ] `SECRET_KEY` fort et sécurisé
- [ ] HTTPS/SSL activé
- [ ] ALLOWED_HOSTS configuré
- [ ] Base de données PostgreSQL/MySQL
- [ ] Serveur WSGI (gunicorn, uWSGI)
- [ ] Nginx/Apache reverse proxy
- [ ] Email SMTP configuré
- [ ] Backups réguliers
- [ ] Monitoring et logs
- [ ] Rate limiting activé
- [ ] CORS restrictif (domaines spécifiques)

### Commandes utiles

```bash
# Collecter les fichiers statiques
python manage.py collectstatic --noinput

# Vérifier la configuration
python manage.py check --deploy

# Créer backup
python manage.py dumpdata > backup.json

# Restaurer depuis backup
python manage.py loaddata backup.json
```

## Support & Documentation

- Django : https://docs.djangoproject.com/
- DRF : https://www.django-rest-framework.org/
- JWT : https://django-rest-framework-simplejwt.readthedocs.io/
- Nodemailer : https://nodemailer.com/

---

**Version** : 1.0.0  
**Dernière mise à jour** : 3 décembre 2025  
**Auteur** : Declaration Hub API Team
