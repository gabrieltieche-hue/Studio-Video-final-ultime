# Instructions Claude / Agents — Studio Short

Voir et appliquer impérativement **`AGENTS.md`** à la racine du dépôt.

## Règle obligatoire en fin de tâche
Chaque fois qu’un agent termine son travail sur ce projet, il **DOIT** :
1. Vérifier `npm run lint`, `npm run build` et les tests unitaires, et supprimer tout projet/fichier de test temporaire (`storage/projects/`, `data/saved-projects/`).
2. **Commit & Push** son travail sur GitHub (`gabrieltieche-hue/Studio-Video-final-ultime`, branche `main`), sans jamais committer `.env*`, `storage/`, `bun.lock` ni aucun secret.
3. **Mettre à jour Railway** (via le Deploy Hook Railway s’il est configuré + synchronisation `/api/sync/*` des projets/médias) et vérifier `/api/health` et `/api/sync/status` sur l’URL Railway configurée.

Commande standard :
```bash
npm run sync:deploy -- "chore: resume des modifications"
```
