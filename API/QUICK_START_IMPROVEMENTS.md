# 🚀 Guide Rapide - Nouvelles Features API

## Accès Admin Django

```
http://127.0.0.1:8000/admin/
```

### Dashboard Admin - Nouveautés

#### 1️⃣ **Pending Declarations** (Nouveau)
- **URL**: `/admin/core/pendingdeclaration/`
- **Voir**: Déclarations en attente de traitement (du client offline)
- **Actions**:
  - ✅ **"Traiter les déclarations sélectionnées"** → Convertit en Declaration si valide
  - Affiche badge **⏳ En attente** ou **✓ Traité** avec couleur
  - Payload JSON présenté proprement
  - Erreurs affichées en rouge avec détails validation

#### 2️⃣ **Protection Settings** (Amélioré)
- **URL**: `/admin/core/protectionsettings/`
- **Nouveaux champs**:
  - `pending_declaration_retention_days` (30j défaut)
  - `activity_log_retention_days` (90j défaut)
  - `admin_session_retention_days` (7j défaut)

#### 3️⃣ **Admin Sessions** (Nouveau)
- **URL**: `/admin/core/adminsession/`
- **Voir**: Qui est connecté, d'où (IP), quand dernière activité
- **Utile pour**: Détecter sessions abandonnées, attaques

#### 4️⃣ **Declarations** (Amélioré)
- Téléphone affiché masqué: `+228****78` (sécurité)
- Lien vers logs d'activité associés
- Filtrage avancé par statut/priorité/date

#### 5️⃣ **Activity Logs** (Amélioré)
- Lien direct vers la Declaration concernée
- Filtrage par action/date

---

## 🔌 Routes API

### Métriques et Monitoring (Admin only)

```bash
# Voir les stats en temps réel
curl -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8000/api/admin/metrics/

# Réponse:
{
  "counters": {
    "declarations_created": 42,
    "declarations_synced": 15,
    "pending_declarations_created": 3,
    "pending_declarations_processed": 2,
    "sync_errors": 1,
    "recaptcha_failures": 0,
    "rate_limit_hits": 0
  },
  "database_stats": {
    "total_declarations": 42,
    "total_pending_declarations": 3,
    "pending_processed": 2,
    "pending_unprocessed": 1,
    "total_activity_logs": 150,
    "total_admin_sessions": 3,
    "active_admin_sessions": 2
  }
}
```

### Session Admin

```bash
# Démarrer/mettre à jour une session
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8000/api/admin-sessions/heartbeat/

# Lister toutes mes sessions
curl -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8000/api/admin-sessions/
```

### Pending Declarations

```bash
# Lister pending declarations
curl -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8000/api/pending-declarations/

# Voir détails d'une pending declaration
curl -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8000/api/pending-declarations/{id}/

# Créer pending declaration (client offline, public)
curl -X POST http://127.0.0.1:8000/api/pending-declarations/ \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "client-uuid",
    "payload": { /* declaration data */ }
  }'
```

---

## 🧹 Maintenance

### Cleanup automatique des vieilles données

```bash
# Test d'abord (dry-run)
python manage.py cleanup_retention --dry-run

# Exécuter le cleanup réel
python manage.py cleanup_retention

# Scheduler via cron (2h du matin tous les jours)
# 0 2 * * * /path/to/venv/bin/python /path/to/API/manage.py cleanup_retention
```

---

## 📊 Monitorer avec les Metrics

### Script de monitoring basique

```bash
#!/bin/bash
while true; do
  curl -s -H "Authorization: Bearer $TOKEN" \
    http://127.0.0.1:8000/api/admin/metrics/ | python -m json.tool
  echo "---"
  sleep 60
done
```

### Alertes à mettre en place

```bash
# Trop de rate limit hits? → Attaque en cours
jq '.counters.rate_limit_hits' metrics.json | [ $(.) -gt 100 ] && alert "RATE LIMIT ATTACK"

# Trop d'erreurs sync? → Problème validation
jq '.counters.sync_errors' metrics.json | [ $(.) -gt 10 ] && alert "SYNC ERRORS"

# Sessions abandonnées? → Nettoyage obsolète
jq '.database_stats.total_admin_sessions' metrics.json
```

---

## 🎯 Workflow Complet: Client Offline → Admin Validation

### Côté Client (offline-first)

```typescript
// useDeclarations.ts
const sync = async () => {
  if (navigator.onLine) {
    // Envoyer batch local vers /api/sync/
    const response = await fetch('/api/sync/', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ declarations: offlineQueue })
    });
    
    const result = await response.json();
    console.log(`Created: ${result.created_count}, Pending: ${result.pending_count}`);
  }
};
```

### Côté Admin (monitoring)

```typescript
// Dans Admin.tsx
useEffect(() => {
  // Heartbeat toutes les 5 min
  const interval = setInterval(async () => {
    await fetch('/api/admin-sessions/heartbeat/', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
  }, 5 * 60 * 1000);
  
  return () => clearInterval(interval);
}, []);

// Voir metrics
const metrics = await fetch('/api/admin/metrics/', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());
console.log(`Declarations créées: ${metrics.counters.declarations_created}`);
```

### Côté Admin (Web UI)

1. Accédez `/admin/core/pendingdeclaration/`
2. Voyez les déclarations en attente avec payload JSON
3. Sélectionnez les déclarations à valider
4. Cliquez **"Traiter les déclarations sélectionnées"**
5. ✅ Elles deviennent des Declarations complètes
6. Vérifiez dans Declaration list et cliquez pour détails

---

## 🧪 Tester les nouvelles features

```bash
# Tester la suite complète
python manage.py test core.tests.SyncAPIViewTestCase -v 2

# Résultat attendu:
# test_sync_valid_declarations ... ok
# test_sync_invalid_declarations_creates_pending ... ok
# test_sync_duplicate_declarations_not_created ... ok
# test_sync_mixed_batch ... ok
# test_sync_requires_authentication ... ok
# test_sync_empty_list_rejected ... ok
# test_sync_missing_declarations_key_rejected ... ok
# Ran 7 tests in 2.373s - OK
```

---

## 🔐 Points de sécurité

✅ **Masquage phone**: Affiche `+228****78` dans admin, données complètes en BD  
✅ **No JWT in DB**: AdminSession n'enregistre que session_key, pas tokens  
✅ **Permission checks**: Metrics/Protection sont admin-only  
✅ **Rate limit tracking**: Detectez les attaques via counters  
✅ **Retention policies**: Auto-cleanup pour RGPD compliance  

---

## 💡 Troubleshooting

**Q: Je vois "No declarations to process"?**  
A: Allez à `/api/pending-declarations/` pour voir ce qui est en attente.

**Q: Cleanup ne supprime rien?**  
A: Vérifiez `retention_days` dans ProtectionSettings. Par défaut: 30j pour pending, 90j logs.

**Q: Metrics montre beaucoup d'erreurs sync?**  
A: Vérifiez `/admin/core/pendingdeclaration/` pour voir les erreurs spécifiques.

**Q: Session heartbeat ne persiste pas?**  
A: Assurez-vous de faire POST `/api/admin-sessions/heartbeat/` avec token JWT valide.

---

**Pour plus de détails**: Voir `API/IMPROVEMENTS_SUMMARY.md` 📖
