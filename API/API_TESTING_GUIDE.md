# Guide de Test de l'API Declaration Hub

## Interfaces de Test des Routes API

Après démarrage du serveur Django, les interfaces suivantes sont disponibles pour tester l'API:

### 1. **Swagger UI** (Interface interactive)
- **URL**: http://127.0.0.1:8000/api/docs/
- Permet de lister et tester interactivement toutes les routes
- Intégration JWT: cliquez sur le bouton "Authorize" pour entrer votre access_token

### 2. **ReDoc** (Documentation lisible)
- **URL**: http://127.0.0.1:8000/api/redoc/
- Affiche la documentation complète des routes de manière lisible et structurée

### 3. **Schema OpenAPI (JSON)**
- **URL**: http://127.0.0.1:8000/api/schema/
- Fichier de schéma OpenAPI 3.0 qui peut être utilisé dans d'autres outils

## Comment tester une route avec Swagger

1. **Accédez à l'interface Swagger**:
   ```
   http://127.0.0.1:8000/api/docs/
   ```

2. **Si vous avez besoin d'authentification JWT**:
   - Créez un compte: POST `/api/auth/register/`
   - Obtenez un token: POST `/api/auth/token/`
   - Cliquez sur le bouton "Authorize" en haut à droite
   - Collez votre access_token (format: `Bearer <votre_token>`)

3. **Tester une route**:
   - Cliquez sur la route à tester (ex: GET `/api/declarations/`)
   - Cliquez sur "Try it out"
   - Modifiez les paramètres si nécessaire
   - Cliquez sur "Execute"
   - Consultez la réponse et le code HTTP de retour

## Routes principales testables

### Authentication
- `POST /api/auth/register/` - Inscription d'un nouvel utilisateur
- `POST /api/auth/token/` - Obtention des tokens JWT
- `POST /api/auth/token/refresh/` - Renouvellement du token d'accès
- `POST /api/auth/verify-email/` - Vérification de l'email

### Declarations
- `GET /api/declarations/` - Lister toutes les déclarations (public)
- `POST /api/declarations/` - Créer une nouvelle déclaration (public)
- `GET /api/declarations/{id}/` - Détails d'une déclaration
- `PATCH /api/declarations/{id}/` - Mettre à jour une déclaration (admin)
- `PUT /api/declarations/{id}/` - Remplacer une déclaration (admin)
- `DELETE /api/declarations/{id}/` - Supprimer une déclaration (admin)

### Activity Log
- `GET /api/activity-logs/` - Lister les logs d'activité (admin)

### Clues
- `GET /api/clues/` - Lister les indices
- `POST /api/clues/` - Créer un nouvel indice

### Protection Settings
- `GET /api/admin/protection/` - Obtenir les paramètres de protection
- `PUT /api/admin/protection/` - Mettre à jour les paramètres de protection

### Synchronisation
- `POST /api/sync/` - Synchroniser les déclarations

## Exemple de test complet

### 1. Créer une compte administrateur via Django Admin
```
http://127.0.0.1:8000/admin/
```

### 2. Obtenir un token JWT
```bash
curl -X POST http://127.0.0.1:8000/api/auth/token/ \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "your_password"}'
```

### 3. Utiliser le token pour tester une route protégée
```bash
curl -X GET http://127.0.0.1:8000/api/declarations/ \
  -H "Authorization: Bearer your_access_token"
```

### 4. Créer une déclaration
```bash
curl -X POST http://127.0.0.1:8000/api/declarations/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_access_token" \
  -d '{
    "tracking_code": "TEST001",
    "declarant_name": "John Doe",
    "phone": "+22812345678",
    "email": "john@example.com",
    "type": "perte",
    "category": "Passeport",
    "description": "Mon passeport a été perdu",
    "incident_date": "2025-12-04T10:00:00Z",
    "location": "Lome"
  }'
```

## Notes importantes

- L'authentification JWT est requise pour les opérations sensibles (PATCH, PUT, DELETE)
- Le format du token est: `Bearer <access_token>` (remarque: pas d'espace supplémentaire)
- Les déclarations sont filtrées par statut: `en_attente`, `validee`, `rejetee`
- Les paramètres de priorité supportés: `faible`, `moyenne`, `importante`, `urgente`
- Consultez les validations de form pour les formats requis (ex: téléphone +228XXXXXXXX)
