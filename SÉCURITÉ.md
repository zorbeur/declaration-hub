# Declaration Hub - Config sensible

## Fichiers à ne PAS committer

### Secrets
- `.env` (variables d'environnement sensibles)
- API superuser password
- JWT secrets
- SMTP passwords

### Generated/Cache
- `*.pyc`
- `__pycache__/`
- `.pytest_cache/`
- `.venv/`
- `node_modules/`
- `db.sqlite3` (devlopment)

### Uploads
- `media/attachments/`
- `media/` (fichiers utilisateur)

### Logs
- `logs/`
- `*.log`

### IDE
- `.vscode/`
- `.idea/`
- `*.swp`
- `.DS_Store`

## Fichiers à TOUJOURS committer

- `API/requirements.txt` (dépendances Python)
- `API/package.json` (dépendances Node)
- `API/.env.example` (template sans secrets)
- `CONFORMITÉ_RÉSUMÉ.md` (documentation)
- `API/DOCUMENTATION.md` (API docs)
- Code source de l'API et Frontend

## Procédure de sécurité

1. **Ne jamais committer `.env`**
   ```bash
   echo ".env" >> .gitignore
   ```

2. **Utiliser `.env.example` pour la config**
   - Committer `API/.env.example`
   - Copier en `.env` local
   - Remplir avec vos secrets

3. **Secrets Management**
   - Utiliser un password manager (1Password, LastPass)
   - Stocker les secrets en sécurité
   - Partager via canaux sécurisés uniquement

4. **Admin credentials**
   - Mot de passe superuser généré aléatoirement
   - Stocker en sûr, ne pas laisser en clair
   - Changer après premier accès

## Exemple .gitignore pour API

```
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
.venv
venv/
ENV/
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg

# Django
db.sqlite3
media/
/static/

# IDE
.vscode/
.idea/
*.swp
*.swo
*~
.DS_Store

# Environment
.env
.env.local
.env.*.local

# Logs
logs/
*.log

# Node
node_modules/
npm-debug.log
yarn-error.log

# OS
.DS_Store
Thumbs.db
```

## Checklist avant push

- [ ] Pas de `.env` en clair
- [ ] Pas de mot de passe en dur dans le code
- [ ] Pas de token/API key exposé
- [ ] `.env.example` rempli de valeurs fictives
- [ ] Migrations incluses
- [ ] Documentation à jour
- [ ] Tests passent (si applicables)

---

**Important** : Avant toute production, vérifier que les secrets ne sont pas leakés sur GitHub !

Utiliser : https://github.com/gitleaks/gitleaks-action
