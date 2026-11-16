# Règles obligatoires du projet — Studio Short

## 1. Publication systématique en fin de tâche (OBLIGATOIRE)

À la fin de **chaque** tâche ou modification du code / des projets validés, tout agent travaillant sur ce dépôt **DOIT** :

1. **Vérifier la qualité avant commit** :
   - Exécuter `npm run lint` (`tsc --noEmit`), `npm run build` et les tests unitaires concernés (`npx tsx --test ...`).
   - Nettoyer tous les fichiers ou projets de test temporaires (`data/saved-projects/` et `storage/projects/` ne doivent contenir que les vrais projets utilisateur, sans doublons de test ni captures temporaires).
   - **Ne jamais committer de secrets ni de fichiers locaux sensibles** : ne jamais stager `.env*`, `storage/`, `bun.lock`, ni aucun token GitHub/Railway/API.

2. **Commit & Push sur GitHub (`main`)** :
   - Committer proprement toutes les modifications sur la branche `main` du dépôt `gabrieltieche-hue/Studio-Video-final-ultime` et pousser vers `origin/main`.
   - En environnement sans credential helper global, utiliser le jeton stocké dans `storage/sync-config.json` (ou `GITHUB_TOKEN`) via un `GIT_ASKPASS` éphémère (comme dans `src/server/syncManager.ts` ou `npm run sync:deploy`) sans jamais afficher le token dans les logs ni le stocker dans `.git/config`.

3. **Mettre à jour et vérifier Railway** :
   - Déclencher la mise à jour de Railway après le push vers `main` :
     - Si un **Deploy Hook Railway** (`railwayDeployHookUrl` / `RAILWAY_DEPLOY_HOOK_URL`) est configuré, l’appeler (`triggerRailwayDeployHook()` ou `npm run sync:deploy`).
     - Pousser les projets et médias vers Railway via `pushAllProjectsToRailway()` (routes `/api/sync/*`) dès que Railway est en ligne sur la dernière version.
   - Vérifier `${RAILWAY_URL}/api/health` et `${RAILWAY_URL}/api/sync/status` (via `getLivePublicSyncStatus(true)`).
   - Si Railway répond encore sur une ancienne version (ex. sans `/api/sync/*`), attendre la fin du redéploiement ou signaler explicitement à l’utilisateur dans le compte-rendu final de cliquer **Redeploy** / vérifier **Settings → Source (`main`)** sur Railway.

## 2. Commande tout-en-un recommandée

```bash
npm run sync:deploy -- "type(scope): description du changement"
```

Ce script (`scripts/publish-github-and-railway.ts`) vérifie le lint et le build, committe et pousse les chemins autorisés vers `origin/main`, déclenche le Deploy Hook Railway s’il est configuré, synchronise les projets/médias vers Railway et vérifie la version déployée.
