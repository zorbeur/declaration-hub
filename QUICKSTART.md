# QUICKSTART - Declaration Hub

Démarrez le projet en 5 minutes !

## 1️⃣ Frontend (React/Vite)

```bash
cd /workspaces/declaration-hub

# Installer les dépendances
npm install

# Démarrer le serveur de développement
npm run dev
```

Accès : http://localhost:5173/

## 2️⃣ Backend API (Django)

```bash
cd /workspaces/declaration-hub/API

# Activer le virtualenv
source .venv/bin/activate

# Démarrer le serveur Django
python manage.py runserver 0.0.0.0:8000
```

Accès API : http://localhost:8000/api/
Admin : http://localhost:8000/admin/

## 3️⃣ Tester l'API

### Inscription
```bash
curl -X POST http://localhost:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username":"testuser",
    "email":"test@example.com",
    "password":"SecureP@ssword123",
    "first_name":"Test",
    "last_name":"User"
  }'
```

### Connexion
```bash
curl -X POST http://localhost:8000/api/auth/token/ \
  -H "Content-Type: application/json" \
  -d '{
    "username":"testuser",
    "password":"SecureP@ssword123"
  }'
```

Vous recevez :
```json
{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

### Créer une déclaration (avec token)
```bash
curl -X POST http://localhost:8000/api/declarations/ \
  -H "Authorization: Bearer {ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "declarant_name":"Jean Dupont",
    "phone":"+33612345678",
    "email":"jean@example.com",
    "type":"plainte",
    "category":"vol",
    "description":"Description détaillée du sinistre ou de la déclaration...",
    "incident_date":"2025-12-02T14:00:00Z",
    "location":"Paris, 75001"
  }'
```

### Uploader un fichier
```bash
curl -X POST http://localhost:8000/api/attachments/upload/ \
  -H "Authorization: Bearer {ACCESS_TOKEN}" \
  -F "file=@/path/to/document.pdf"
```

## 4️⃣ Configuration Email

### Gmail (recommandé pour dev)
1. Aller sur https://myaccount.google.com/apppasswords
2. Générer un mot de passe d'application
3. Configurer dans l'API :

```bash
export SMTP_HOST=smtp.gmail.com
export SMTP_PORT=587
export SMTP_USER='your-email@gmail.com'
export SMTP_PASS='your-app-password'
```

## 5️⃣ Admin Django

**URL** : http://localhost:8000/admin/

**Credentials** (à changer immédiatement !) :
- Username: `admin`
- Password: `am-GUWU-B8rNIZK8iMaZNA`

⚠️ **Important** : Changez ce mot de passe !

```bash
python manage.py changepassword admin
```

## 6️⃣ Arrêter les services

```bash
# Frontend (Ctrl+C dans le terminal)
# Backend (Ctrl+C dans le terminal)
```

---

## Troubleshooting

### Port 8000 déjà utilisé
```bash
# Vérifier quel processus utilise le port
lsof -i :8000

# Tuer le processus
kill -9 <PID>

# Ou utiliser un autre port
python manage.py runserver 0.0.0.0:8001
```

### Port 5173 déjà utilisé
```bash
# Vérifier quel processus utilise le port
lsof -i :5173

# Tuer le processus
kill -9 <PID>

# Ou utiliser un autre port
npm run dev -- --port 5174
```

### Erreur de dépendances Python
```bash
# Réinstaller
rm -rf .venv
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Erreur de migration
```bash
# Réinitialiser la DB (dev only!)
rm db.sqlite3
python manage.py migrate
python manage.py createsuperuser
```

---

## Structure des données

### Déclaration
```json
{
  "id": "uuid",
  "tracking_code": "ABCD-EFGH-IJKL",
  "declarant_name": "string",
  "phone": "string",
  "email": "email",
  "type": "plainte|perte",
  "category": "string",
  "description": "string",
  "incident_date": "ISO datetime",
  "location": "string",
  "reward": "string (optional)",
  "status": "en_attente|validee|rejetee",
  "priority": "faible|moyenne|importante|urgente",
  "attachments": [{ id, name, file_url, mime_type, size }],
  "created_at": "ISO datetime",
  "updated_at": "ISO datetime"
}
```

### Utilisateur
```json
{
  "id": "integer",
  "username": "string (unique)",
  "email": "email",
  "first_name": "string",
  "last_name": "string",
  "is_active": "boolean",
  "date_joined": "ISO datetime"
}
```

### Token JWT
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

Access token valide 60 minutes. Refresh token valide 7 jours.

---

## Documentation complète

- **API** : `API/DOCUMENTATION.md`
- **Conformité** : `CONFORMITÉ_RÉSUMÉ.md`
- **Sécurité** : `SÉCURITÉ.md`
- **Django** : https://docs.djangoproject.com/
- **DRF** : https://www.django-rest-framework.org/

---

## Checklist avant déploiement

- [ ] Email SMTP configuré
- [ ] `.env` rempli avec les bonnes valeurs
- [ ] `DEBUG=False` en production
- [ ] `SECRET_KEY` fort (min 50 caractères)
- [ ] HTTPS/SSL activé
- [ ] Base de données PostgreSQL/MySQL
- [ ] Serveur WSGI (gunicorn) configuré
- [ ] Reverse proxy (Nginx) configuré
- [ ] Backups réguliers en place
- [ ] Monitoring et logs actifs
- [ ] CORS restrictif aux domaines autorisés

---

**Happy coding! 🚀**

Pour toute question, consultez la documentation complète dans `API/DOCUMENTATION.md`
