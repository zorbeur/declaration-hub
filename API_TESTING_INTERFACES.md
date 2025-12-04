# Interfaces de Test de l'API

## Vue d'ensemble

Après démarrage du serveur Django (`python manage.py runserver 0.0.0.0:8000`), les interfaces suivantes sont automatiquement disponibles pour tester l'API:

## 1. Swagger UI (Interface interactive)

**URL**: http://127.0.0.1:8000/api/docs/

Swagger UI permet de:
- Lister toutes les routes API disponibles
- Voir la documentation complète de chaque endpoint
- Exécuter des requêtes directement depuis l'interface
- Authentifier avec JWT en un seul clic

### Comment utiliser Swagger:
1. Accédez à http://127.0.0.1:8000/api/docs/
2. Si vous avez besoin d'authentification:
   - Cliquez sur "Authorize" en haut à droite
   - Entrez votre token JWT (format: `Bearer <votre_token>`)
3. Cliquez sur une route pour la développer
4. Cliquez sur "Try it out"
5. Modifiez les paramètres si nécessaire
6. Cliquez sur "Execute"
7. Consultez la réponse

## 2. ReDoc (Documentation lisible)

**URL**: http://127.0.0.1:8000/api/redoc/

ReDoc fournit une documentation complète et professionnelle de l'API:
- Navigation facile par sections
- Modèles de requête/réponse détaillés
- Schémas JSON complets
- Parfait pour lire et comprendre l'API

## 3. Schema OpenAPI (JSON)

**URL**: http://127.0.0.1:8000/api/schema/

Le fichier OpenAPI 3.0 en JSON peut être:
- Importé dans Postman
- Utilisé par d'autres outils (Insomnia, etc.)
- Intégré dans votre pipeline CI/CD
- Documenté automatiquement

## Routes principales testables

### Authentification
- `POST /api/auth/register/` - Créer un compte
- `POST /api/auth/token/` - Obtenir JWT token
- `POST /api/auth/token/refresh/` - Renouveler le token
- `POST /api/auth/verify-email/` - Vérifier email
- `POST /api/auth/2fa/send/` - Envoyer 2FA
- `POST /api/auth/2fa/verify/` - Vérifier 2FA

### Déclarations (Main)
- `GET /api/declarations/` - Lister toutes (public)
- `POST /api/declarations/` - Créer (public)
- `GET /api/declarations/{id}/` - Détails
- `PATCH /api/declarations/{id}/` - Mettre à jour (admin)
- `PUT /api/declarations/{id}/` - Remplacer (admin)
- `DELETE /api/declarations/{id}/` - Supprimer (admin)

### Indices/Clues
- `GET /api/clues/` - Lister
- `POST /api/clues/` - Créer
- `PATCH /api/clues/{id}/` - Mettre à jour
- `DELETE /api/clues/{id}/` - Supprimer

### Logs d'activité
- `GET /api/activity-logs/` - Lister (admin)
- `POST /api/activity-logs/` - Créer (admin)

### Paramètres de protection
- `GET /api/admin/protection/` - Obtenir config
- `PUT /api/admin/protection/` - Mettre à jour config

### Administration
- `POST /api/admin/backup/` - Créer backup

## Exemple complet: Créer et valider une déclaration

### Étape 1: Obtenir un token (Swagger)
1. Accédez à http://127.0.0.1:8000/api/docs/
2. Trouvez `POST /api/auth/token/`
3. Cliquez "Try it out"
4. Entrez credentials (exemple):
   ```json
   {
     "username": "admin",
     "password": "admin_password"
   }
   ```
5. Cliquez "Execute"
6. Copiez la valeur `access` de la réponse

### Étape 2: Authentifier dans Swagger
1. Cliquez sur "Authorize"
2. Entrez: `Bearer YOUR_ACCESS_TOKEN`
3. Cliquez "Authorize"

### Étape 3: Créer une déclaration
1. Trouvez `POST /api/declarations/`
2. Cliquez "Try it out"
3. Entrez les données (exemple):
   ```json
   {
     "declarant_name": "Jean Dupont",
     "phone": "+22812345678",
     "email": "jean@example.com",
     "type": "perte",
     "category": "Passeport",
     "description": "Mon passeport a été perdu en voyage",
     "incident_date": "2025-12-04T10:00:00Z",
     "location": "Lome",
     "reward": "500,000 XOF"
   }
   ```
4. Cliquez "Execute"
5. Notez le `tracking_code` retourné

### Étape 4: Valider la déclaration (Admin)
1. Trouvez `PATCH /api/declarations/{id}/`
2. Cliquez "Try it out"
3. Entrez l'ID ou tracking_code
4. Entrez les données:
   ```json
   {
     "status": "validee",
     "priority": "urgente",
     "validated_by": "Admin"
   }
   ```
5. Cliquez "Execute"

## Tips & Tricks

### Pour tester sans interface graphique (cURL)

Obtenir un token:
```bash
curl -X POST http://127.0.0.1:8000/api/auth/token/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'
```

Créer une déclaration:
```bash
curl -X POST http://127.0.0.1:8000/api/declarations/ \
  -H "Content-Type: application/json" \
  -d '{
    "declarant_name": "Test",
    "phone": "+22812345678",
    "email": "test@example.com",
    "type": "perte",
    "category": "Test",
    "description": "Test",
    "incident_date": "2025-12-04T10:00:00Z",
    "location": "Test"
  }'
```

Valider avec token:
```bash
curl -X PATCH http://127.0.0.1:8000/api/declarations/1/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"status":"validee","priority":"urgente"}'
```

### Validation des formats

- **Phone**: Doit respecter `+228XXXXXXXX` (8 chiffres après +228)
- **Status**: `en_attente`, `validee`, `rejetee`
- **Priority**: `faible`, `moyenne`, `importante`, `urgente`
- **Type**: `plainte`, `perte`
- **incident_date**: Format ISO 8601 (ex: `2025-12-04T10:00:00Z`)

## Dépannage

### Erreur 401 Unauthorized
- Vous devez vous authentifier
- Obtenez un token et incluez-le dans l'header `Authorization: Bearer <token>`

### Erreur 400 Bad Request
- Vérifiez les données envoyées
- Consultez le message d'erreur pour les champs invalides
- Utilisez les formats exacts (phone, dates, etc.)

### Erreur 403 Forbidden
- Cette route nécessite une permission spécifique
- Certains endpoints sont réservés aux administrateurs

### Swagger affiche "No operations defined"
- Redémarrez le serveur Django
- Vérifiez que `drf-spectacular` est installé et configuré

## Pour plus d'information

Consultez:
- [API/README.md](./API/README.md) - Documentation API
- [API/DOCUMENTATION.md](./API/DOCUMENTATION.md) - Documentation détaillée
- [API/API_TESTING_GUIDE.md](./API/API_TESTING_GUIDE.md) - Guide complet des tests
