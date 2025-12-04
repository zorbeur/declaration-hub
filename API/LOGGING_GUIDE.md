# 📊 Guide Complet du Système de Logging

## 🎯 Vue d'ensemble

Le système de logging enregistre **TOUTES** les actions importantes du système dans la table `ActivityLog`. Chaque action inclut:
- 🕐 Timestamp précis
- 👤 Utilisateur (si authentifié)
- 🏷️ Type d'action (CREATE, UPDATE, DELETE, etc.)
- 📦 Type de ressource affectée
- 🔗 ID de la ressource
- 📝 Détails JSON complets
- 🌐 IP address
- 🖥️ User-agent navigateur
- ⚠️ Flag sensible

---

## 📋 Actions Loggées par Endpoint

### Declarations

#### POST /api/declarations/ - Créer une déclaration
```
Action: CREATE
Resource Type: Declaration
Details:
{
  "tracking_code": "YWPooWynlYKe",
  "type": "perte",
  "location": "Lome, Togo"
}
Sensible: OUI
```

**Exemple cURL:**
```bash
curl -X POST http://api.com/api/declarations/ \
  -H "Content-Type: application/json" \
  -d '{
    "declarant_name": "John Doe",
    "phone": "+22890123456",
    "email": "john@example.com",
    "type": "perte",
    "category": "documents_identite",
    "description": "Lost my passport",
    "incident_date": "2025-12-01T10:00:00Z",
    "location": "Lome, Togo"
  }'
```

---

#### PUT /api/declarations/{id}/ - Mettre à jour une déclaration
```
Action: UPDATE
Resource Type: Declaration
User: admin_test
Details:
{
  "changed_fields": {
    "status": {
      "old": "en_attente",
      "new": "validee"
    },
    "description": {
      "old": "original text",
      "new": "updated text"
    }
  }
}
Sensible: OUI
```

**Exemple cURL (avec token):**
```bash
curl -X PUT http://api.com/api/declarations/abc123/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "declarant_name": "John Doe",
    "phone": "+22890123456",
    "type": "perte",
    "category": "documents_identite",
    "description": "Lost my passport - updated",
    "incident_date": "2025-12-01T10:00:00Z",
    "location": "Lome, Togo",
    "status": "validee"
  }'
```

---

#### DELETE /api/declarations/{id}/ - Supprimer une déclaration
```
Action: DELETE
Resource Type: Declaration
User: admin_test
Details:
{
  "tracking_code": "YWPooWynlYKe",
  "type": "perte",
  "location": "Lome, Togo"
}
Sensible: OUI
```

**Exemple cURL:**
```bash
curl -X DELETE http://api.com/api/declarations/abc123/ \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### Clues (Indices)

#### POST /api/clues/ - Soumettre un indice
```
Action: CREATE
Resource Type: Clue
Details:
{
  "declaration_id": "abc123",
  "description_length": 256
}
Sensible: OUI
```

**Exemple:**
```bash
curl -X POST http://api.com/api/clues/ \
  -H "Content-Type: application/json" \
  -d '{
    "declaration": "abc123",
    "description": "I saw something suspicious",
    "evidence": "photo.jpg"
  }'
```

---

#### PUT /api/clues/{id}/ - Mettre à jour un indice
```
Action: UPDATE
Resource Type: Clue
Details:
{
  "changed_fields": {
    "description": {
      "old": "...",
      "new": "..."
    }
  }
}
Sensible: OUI
```

---

#### DELETE /api/clues/{id}/ - Supprimer un indice
```
Action: DELETE
Resource Type: Clue
Details:
{
  "declaration_id": "abc123"
}
Sensible: OUI
```

---

### Attachments (Fichiers)

#### POST /api/attachments/ - Télécharger un fichier
```
Action: UPLOAD
Resource Type: Attachment
Details:
{
  "filename": "evidence.pdf",
  "size": 1024000,
  "mime_type": "application/pdf"
}
Sensible: OUI
```

**Exemple:**
```bash
curl -X POST http://api.com/api/attachments/ \
  -F "file=@evidence.pdf"
```

---

### Authentication (2FA)

#### POST /api/users/{id}/enable_2fa/ - Activer 2FA
```
Action: ENABLE_2FA
Resource Type: User
Details:
{
  "username": "john_doe",
  "target_user_id": 123
}
Sensible: OUI
```

**Exemple:**
```bash
curl -X POST http://api.com/api/users/123/enable_2fa/ \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

#### POST /api/users/{id}/disable_2fa/ - Désactiver 2FA
```
Action: DISABLE_2FA
Resource Type: User
Details:
{
  "username": "john_doe",
  "target_user_id": 123
}
Sensible: OUI
```

---

#### POST /api/auth/verify-2fa/ - Vérifier code 2FA
```
Action: VERIFY_2FA_SUCCESS ou VERIFY_2FA_FAILED
Resource Type: User
Details:
{
  "username": "john_doe"
}
Sensible: OUI
```

---

### Admin Operations

#### GET /api/backup/ - Sauvegarder les données
```
Action: BACKUP
Resource Type: System
Details:
{
  "declarations_count": 150,
  "users_count": 25,
  "logs_count": 1500
}
Sensible: OUI
```

**Exemple:**
```bash
curl -X GET http://api.com/api/backup/ \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" > backup.json
```

---

#### POST /api/backup/ - Restaurer les données
```
Action: RESTORE
Resource Type: System
Details:
{
  "users": 25,
  "declarations": 150,
  "logs": 1500
}
Sensible: OUI
```

**Exemple:**
```bash
curl -X POST http://api.com/api/backup/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d @backup.json
```

---

#### PUT /api/protection-settings/ - Modifier paramètres de protection
```
Action: UPDATE_PROTECTION_SETTINGS
Resource Type: ProtectionSettings
Details:
{
  "enable_rate_limit_declarations": {
    "old": false,
    "new": true
  },
  "rate_limit_declarations": {
    "old": "100/h",
    "new": "50/h"
  }
}
Sensible: OUI
```

**Exemple:**
```bash
curl -X PUT http://api.com/api/protection-settings/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "enable_rate_limit_declarations": true,
    "rate_limit_declarations": "50/h",
    "enable_captcha_declarations": true
  }'
```

---

## 🔍 Consulter les Logs

### Via API

#### Récupérer tous les logs
```bash
curl -X GET http://api.com/api/activity-logs/ \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Réponse:**
```json
[
  {
    "id": "abc123",
    "timestamp": "2025-12-04T12:06:45Z",
    "user": "admin_test",
    "username": "admin_test",
    "action": "CREATE",
    "resource_type": "Declaration",
    "resource_id": "5ed28774e47e5bac8ffb7b19c984224f",
    "details": "{...}",
    "ip_address": "127.0.0.1",
    "user_agent": "Mozilla/5.0...",
    "is_sensitive": true
  },
  ...
]
```

---

#### Filtrer par action
```bash
curl -X GET "http://api.com/api/activity-logs/?action=UPDATE" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

#### Filtrer par utilisateur
```bash
curl -X GET "http://api.com/api/activity-logs/?user=admin_test" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

#### Filtrer par ressource
```bash
curl -X GET "http://api.com/api/activity-logs/?resource_type=Declaration&resource_id=abc123" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

#### Récupérer les opérations sensibles
```bash
curl -X GET "http://api.com/api/activity-logs/?is_sensitive=true" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### Via la Base de Données

```sql
-- Récupérer les 20 derniers logs
SELECT * FROM core_activitylog 
ORDER BY timestamp DESC 
LIMIT 20;

-- Logs par action
SELECT action, COUNT(*) as count 
FROM core_activitylog 
GROUP BY action 
ORDER BY count DESC;

-- Logs par utilisateur
SELECT username, COUNT(*) as count 
FROM core_activitylog 
GROUP BY username 
ORDER BY count DESC;

-- Logs sensibles
SELECT * FROM core_activitylog 
WHERE is_sensitive = true 
ORDER BY timestamp DESC;

-- Modifications d'une déclaration spécifique
SELECT * FROM core_activitylog 
WHERE resource_type = 'Declaration' 
  AND resource_id = 'abc123'
ORDER BY timestamp;

-- Activité d'un utilisateur
SELECT * FROM core_activitylog 
WHERE username = 'admin_test'
ORDER BY timestamp DESC;

-- Activités entre deux dates
SELECT * FROM core_activitylog 
WHERE timestamp >= '2025-12-01' 
  AND timestamp <= '2025-12-04'
ORDER BY timestamp;

-- Deletions (potentiellement suspectes)
SELECT * FROM core_activitylog 
WHERE action = 'DELETE'
ORDER BY timestamp DESC;

-- Activités depuis une IP spécifique
SELECT * FROM core_activitylog 
WHERE ip_address = '127.0.0.1'
ORDER BY timestamp DESC;
```

---

## 📈 Analysez les Données

### Distribution des actions
```python
from core.models import ActivityLog
from django.db.models import Count

distribution = ActivityLog.objects.values('action').annotate(count=Count('id'))
for item in distribution:
    print(f"{item['action']}: {item['count']}")
```

---

### Utilisateurs les plus actifs
```python
from core.models import ActivityLog
from django.db.models import Count

top_users = ActivityLog.objects.values('username').annotate(count=Count('id')).order_by('-count')[:10]
for user in top_users:
    print(f"{user['username']}: {user['count']} actions")
```

---

### Ressources les plus modifiées
```python
from core.models import ActivityLog
from django.db.models import Count

top_resources = ActivityLog.objects.values('resource_type', 'resource_id').annotate(count=Count('id')).order_by('-count')[:10]
for resource in top_resources:
    print(f"{resource['resource_type']} {resource['resource_id']}: {resource['count']} modifications")
```

---

### Détail des modifications
```python
from core.models import ActivityLog
import json

# Récupérer les modifications d'une déclaration
logs = ActivityLog.objects.filter(
    resource_type='Declaration',
    resource_id='abc123',
    action='UPDATE'
).order_by('timestamp')

for log in logs:
    details = json.loads(log.details)
    print(f"{log.timestamp} - {log.username}:")
    for field, change in details.get('changed_fields', {}).items():
        print(f"  {field}: {change['old']} → {change['new']}")
```

---

## 🔐 Bonnes Pratiques

### 1. Audit Régulier
```bash
# Vérifier les deletions chaque jour
curl -X GET "http://api.com/api/activity-logs/?action=DELETE" | jq
```

### 2. Monitorer les IP Suspectes
```bash
# Logs groupés par IP
SELECT ip_address, COUNT(*) as count 
FROM core_activitylog 
WHERE timestamp > NOW() - INTERVAL 24 HOUR
GROUP BY ip_address 
ORDER BY count DESC;
```

### 3. Alerter sur les Tentatives Échouées
```bash
# Vérifier les vérifications 2FA échouées
SELECT * FROM core_activitylog 
WHERE action = 'VERIFY_2FA_FAILED'
ORDER BY timestamp DESC;
```

### 4. Archiver les Logs
```bash
# Exporter les logs mensuels
python manage.py shell
from core.models import ActivityLog
import csv
from datetime import datetime

logs = ActivityLog.objects.filter(
    timestamp__month=11,
    timestamp__year=2025
)

with open('logs_2025_11.csv', 'w') as f:
    writer = csv.writer(f)
    writer.writerow(['timestamp', 'username', 'action', 'resource_type', 'resource_id', 'ip_address'])
    for log in logs:
        writer.writerow([log.timestamp, log.username, log.action, log.resource_type, log.resource_id, log.ip_address])
```

---

## ⚠️ Alertes Recommandées

Configurez des alertes pour:

1. ❌ **Deletions massives** - Plus de 10 DELETEs en 1 heure
2. ❌ **Accès non autorisés** - Erreurs 401/403
3. ❌ **Modifications sensibles** - UPDATE/DELETE sur données confidentielles
4. ❌ **Tentatives échouées** - Plus de 5 VERIFY_2FA_FAILED par IP
5. ❌ **Activité administrateur** - BACKUP, RESTORE, PROTECTION_SETTINGS changes
6. ❌ **Rate limit atteint** - Indique une tentative d'attaque

---

## 📞 Exemple Complet: Audit d'une Suppression Suspecte

```python
from core.models import ActivityLog
import json
from datetime import datetime, timedelta

# Déterminer si une suppression est suspecte
dec_id = "5ed28774e47e5bac8ffb7b19c984224f"

# 1. Récupérer tous les logs pour cette déclaration
logs = ActivityLog.objects.filter(
    resource_type='Declaration',
    resource_id=dec_id
).order_by('timestamp')

# 2. Analyser l'historique
print(f"Historique complet de la déclaration {dec_id}:")
for log in logs:
    print(f"\n[{log.timestamp}] {log.action}")
    print(f"  Utilisateur: {log.username}")
    print(f"  IP: {log.ip_address}")
    print(f"  User-Agent: {log.user_agent[:50]}...")
    
    if log.action == 'UPDATE':
        details = json.loads(log.details)
        print(f"  Modifications:")
        for field, change in details.get('changed_fields', {}).items():
            print(f"    {field}: {change['old']} → {change['new']}")
    
    elif log.action == 'DELETE':
        print(f"  ⚠️ SUPPRESSION ENREGISTRÉE")

# 3. Vérifier si d'autres actions ont suivi la création
first_log = logs.first()
if first_log:
    print(f"\nTémps entre création et suppression:")
    last_log = logs.last()
    delta = last_log.timestamp - first_log.timestamp
    print(f"  {delta.days} jours, {delta.seconds // 3600} heures")
```

---

**Note Importante:** Tous les logs sont automatiquement enregistrés. Assurez-vous de les consulter régulièrement pour identifier tout comportement suspect!
