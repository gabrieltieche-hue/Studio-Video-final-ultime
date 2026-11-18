# Étape 0 obligatoire · Veille Multi-Domaines & Mise à jour CSV

Avant toute rédaction de script ou création d'un nouveau Short (dans l'interface Studio ou via les skills `/studio-script` / `/short-editing`), le système doit exécuter cette étape dans l'ordre :

## 1. Lecture de l'historique CSV (`video-agent/shorts-topics.csv`)
- Charger tous les thèmes déjà présents (`Produit`, `Retenu (Choix IA)`, `Candidat`).
- Interdiction stricte de réutiliser un thème ou un angle déjà traité dans le CSV.

## 2. Recherche multi-axes approfondie (France)
Effectuer des recherches web actualisées sur au moins **5 piliers** :
1. **Actualité France & Société** (réformes datées, consommation, pouvoir d'achat, faits marquants du mois)
2. **Intelligence Artificielle (IA)** (impact emploi, nouveaux modèles, agents autonomes, risques concrets)
3. **Business & Économie** (entrepreneuriat, freelance, impôts, productivité réelle, coûts cachés)
4. **Politique & Régulation** (lois votées/censurées, sommet européen, décisions publiques vérifiables)
5. **Conseils de vie & Psychologie pratique** (micro-habitudes, charge mentale, gestion temps/budget)

## 3. Scoring `/outliers` & viralité sur les réseaux sociaux français
Chaque candidat est évalué selon la méthode `/outliers` (écart à la moyenne + mécanique reproductible) et noté sur 100 selon 3 axes pondérés :
- `score_viral_fr` (45 %) : force du hook en < 3s (chiffre choc, date légale ou paradoxe), clarté de l'open loop, résonance 18–35 ans FR
- `score_save_share` (35 %) : potentiel d'enregistrement et d'envoi en DM (utilité concrète, seuil exact, règle actionnable)
- `score_actualite` (20 %) : fraîcheur de la semaine/du mois avec source citable à l'écran (`source_quote`)

Exigences de sélection :
- Un chiffre ou une date vérifiable exploitable en `chart_curve` ou `source_quote`
- Zéro sujet abstrait sans impact concret pour le spectateur français

## 4. Sélection autonome & Mise à jour du CSV
- Le système choisit **lui-même** le sujet n°1 (`statut = Retenu (Choix IA)`) ayant le meilleur score composite sans doublon.
- Tous les candidats étudiés pendant la session (`REQ-YYYY-MM-DD-XX`) sont ajoutés à `video-agent/shorts-topics.csv` afin de garder une trace complète de la veille et de la décision.
- Une fois le Short généré et rendu, son statut passe à `Produit`.

