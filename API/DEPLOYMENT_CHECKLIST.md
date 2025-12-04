# 🚀 Checklist de Déploiement en Production

## ⚠️ CRITIQUE: Avant toute mise en production

### 1. Configuration d'Environnement
- [ ] **DÉFINI:** `DEBUG=False` (jamais True en production!)
- [ ] **DÉFINI:** `DJANGO_SECRET_KEY` avec une clé forte et unique
- [ ] **DÉFINI:** `ALLOWED_HOSTS` avec votre(vos) domaine(s)
- [ ] **DÉFINI:** `CORS_ALLOWED_ORIGINS` avec les domaines frontend
- [ ] **TESTÉ:** Vérifier que `python manage.py check` retourne 0 erreurs

### 2. Sécurité de Base
- [ ] **CONFIGURÉ:** HTTPS/SSL sur le serveur web (Nginx/Apache)
- [ ] **CONFIGURÉ:** Certificat SSL valide (Let's Encrypt)
- [ ] **CONFIGURÉ:** Redirect HTTP → HTTPS
- [ ] **CONFIGURÉ:** Firewall (UFW, iptables, AWS Security Groups)
- [ ] **CONFIGURÉ:** Fail2Ban ou équivalent
- [ ] **TESTABLE:** Vérifier headers de sécurité: `curl -I https://your-api.com/api/`

### 3. Base de Données
- [ ] **MIGRÉ:** `python manage.py migrate` exécuté
- [ ] **SAUVEGARDÉ:** Backup de la BD effectué
- [ ] **CONFIGURÉ:** BD en accès restreint (pas de connexion anonyme)
- [ ] **CONFIGURÉ:** BD sur un serveur séparé (idéalement)
- [ ] **TESTABLE:** Vérifier que les tables ActivityLog existent

### 4. Logs et Monitoring
- [ ] **CONFIGURÉ:** Logs Django sauvegardés dans un fichier
- [ ] **CONFIGURÉ:** Rotation des logs (logrotate)
- [ ] **CONFIGURÉ:** Monitoring des logs d'erreur
- [ ] **CONFIGURÉ:** Alertes sur erreurs critiques
- [ ] **CONFIGURÉ:** Archivage des logs ActivityLog mensuels

### 5. Performance
- [ ] **OPTIMISÉ:** Database indexes vérifiés
- [ ] **CONFIGURÉ:** Cache (Redis recommandé)
- [ ] **TESTÉ:** Response time acceptable (< 500ms)
- [ ] **CONFIGURÉ:** Compression Gzip
- [ ] **TESTÉ:** Requête concurrentes (load test)

### 6. Backup et Récupération
- [ ] **PLANIFIÉ:** Backup quotidien de la BD
- [ ] **PLANIFIÉ:** Backup des fichiers statiques
- [ ] **PLANIFIÉ:** Backup de la configuration (.env)
- [ ] **TESTÉ:** Restauration d'un backup
- [ ] **DOCUMENTÉ:** Procédure de disaster recovery

### 7. API Tester
- [ ] **TESTÉ:** `/api/api-tester/` fonctionne
- [ ] **SÉCURISÉ:** Restreindre l'accès au tester (optionnel)
- [ ] **TESTÉ:** Tous les endpoints testables via le tester
- [ ] **DOCUMENTÉ:** URL du tester dans la documentation

### 8. Authentification
- [ ] **TESTÉ:** Registration fonctionne
- [ ] **TESTÉ:** JWT token generation fonctionne
- [ ] **TESTÉ:** 2FA fonctionne si implémenté
- [ ] **CONFIGURÉ:** Session timeout approprié
- [ ] **CONFIGURÉ:** Rate limiting sur les logins

---

## 📋 Vérification Finale

### Tests Requis

```bash
# 1. Check Django
python manage.py check
# Résultat attendu: System check identified no issues (0 silenced)

# 2. Vérifier les migrations
python manage.py migrate --check
# Résultat attendu: Keine nicht angewendeten Migrationen

# 3. Test d'API basique
curl -s https://your-api.com/api/ | jq
# Résultat attendu: JSON avec status: "✓ Declaration Hub API is running"

# 4. Test des logs
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-api.com/api/activity-logs/ | jq '.[] | length'
# Résultat attendu: Nombre de logs > 0

# 5. Vérifier les headers de sécurité
curl -I https://your-api.com/api/
# Vérifier présence de:
# - Strict-Transport-Security
# - X-Content-Type-Options
# - X-Frame-Options
# - Content-Security-Policy
```

### Load Testing (Optionnel mais Recommandé)

```bash
# Installer Apache Bench (ab)
sudo apt-get install apache2-utils

# Test de charge simple (100 requêtes, 10 concurrentes)
ab -n 100 -c 10 http://your-api.com/api/

# Résultat attendu:
# - Requests per second > 100
# - Failed requests = 0
# - Time per request < 100ms
```

---

## 🔍 Checklist de Sécurité Post-Déploiement

### Jour 1
- [ ] Vérifier que tous les endpoints sont fonctionnels
- [ ] Tester la création de déclaration (vérifier le log)
- [ ] Tester la modification (vérifier le change log)
- [ ] Tester la suppression (vérifier le delete log)
- [ ] Monitoring des logs pour erreurs

### Semaine 1
- [ ] Audit des logs ActivityLog pour activité suspecte
- [ ] Vérifier les IPs d'accès
- [ ] Vérifier les tentatives d'authentification échouées
- [ ] Performance monitoring
- [ ] Backup verification

### Mensuel
- [ ] Revue de sécurité des logs
- [ ] Audit de compliance
- [ ] Rotation des secrets/clés
- [ ] Update des dépendances si nécessaire
- [ ] Test de restauration depuis backup

---

## 🚨 Commandes d'Urgence

### Si le serveur a un problème

```bash
# 1. Vérifier le statut
systemctl status django-app  # ou votre service name

# 2. Voir les derniers logs
tail -f /var/log/django/error.log

# 3. Redémarrer le service
systemctl restart django-app

# 4. Restaurer depuis backup
python manage.py migrate
# ... suivi de restauration des données

# 5. Vérifier la connectivité BD
python manage.py dbshell
```

### Si les logs sont suspectés

```bash
# Vérifier les modifications récentes
python manage.py shell
from core.models import ActivityLog
from django.utils import timezone
from datetime import timedelta

recent = ActivityLog.objects.filter(
    timestamp__gte=timezone.now()-timedelta(hours=1)
).order_by('-timestamp')

for log in recent:
    print(f"{log.timestamp} - {log.username} - {log.action} - {log.ip_address}")
```

---

## 📞 Support et Escalade

### En Cas de Problème de Sécurité

1. **Isoler immédiatement** si brèche suspectée
2. **Consulter les logs** via ActivityLog
3. **Vérifier les modifications** dans les 24h passées
4. **Restaurer depuis backup** si nécessaire
5. **Notifier les utilisateurs** si données compromises

### Contacts Importants

- [ ] **Admin API:** (A définir)
- [ ] **DBA:** (A définir)
- [ ] **Security Team:** (A définir)
- [ ] **Hébergeur:** (A définir)

---

## 📊 KPIs à Monitorer

### Disponibilité
- [ ] Uptime > 99.5%
- [ ] Response time < 500ms
- [ ] Error rate < 0.1%

### Sécurité
- [ ] Zéro logs de DELETE suspects
- [ ] Zéro tentatives d'authentification échouées répétées
- [ ] Zéro accès d'IPs non whitelistées
- [ ] Zéro modifications non autorisées

### Performance
- [ ] API Tester charge < 2s
- [ ] Créer déclaration < 1s
- [ ] Récupérer logs < 2s
- [ ] Backup quotidien < 5min

---

## ✅ Signature de Déploiement

```
Checklist complétée par: ________________
Date: ________________
Environnement: [ ] DEV [ ] STAGING [ ] PROD

Signatures d'approbation:
- Admin API: ________________
- Security: ________________
- DBA: ________________
```

---

## 🎓 Formation et Documentation

Pour l'équipe:
1. Lire `LOGGING_GUIDE.md` - Guide complet du logging
2. Tester `/api/api-tester/` - Interface interactive
3. Consulter `SECURITY_IMPLEMENTATION_REPORT.md` - Détails techniques
4. Exercices: Créer/Modifier/Supprimer via API

---

## 📝 Notes de Mise en Œuvre

**Notes importantes pour votre déploiement:**

```
1. SECRET_KEY: 
   - Générer avec: python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
   - Stocker dans .env ou variables d'environnement
   - NE JAMAIS committer dans le code!

2. ALLOWED_HOSTS:
   - Indiquer exact: "api.mydomain.com,api.mydomain.fr"
   - PAS de wildcards sauf développement

3. CORS:
   - Restreindre à vos domaines frontend uniquement
   - Exemple: "https://app.mydomain.com,https://admin.mydomain.com"

4. Rate Limiting:
   - Actuellement: 100 reqêtes/heure par IP
   - Ajuster selon vos besoins dans ProtectionSettings

5. Backup:
   - Endpoint: GET /api/backup/ (admin only)
   - Sauvegarder chaque nuit
   - Tester restauration mensuellement
```

---

**Status Final:** ✅ **Prêt pour la production**

*Suivez cette checklist entièrement avant de déployer en production.*
