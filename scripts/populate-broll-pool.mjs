import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const OUT_DIR = path.join(ROOT_DIR, 'public', 'broll-pool');
const MANIFEST_PATH = path.join(ROOT_DIR, 'src', 'data', 'brollPoolManifest.json');

const SCENES = [
  // 1. budget_quotidien (11)
  { id: 'budget_supermarket_cart', domain: 'budget_quotidien', title: 'Panier · Grande surface', query: 'supermarket grocery aisle shopping cart', keywords: ['supermarche', 'courses', 'panier', 'caddie', 'achat', 'inflation', 'prix', 'alimentation', 'rayon'], lighting: 'bright' },
  { id: 'budget_cash_receipt', domain: 'budget_quotidien', title: 'Ticket · Addition réelle', query: 'paper cash register receipt', keywords: ['ticket', 'caisse', 'addition', 'facture', 'montant', 'payer', 'depense', 'tva'], lighting: 'bright' },
  { id: 'budget_card_payment', domain: 'budget_quotidien', title: 'Paiement · Carte bancaire', query: 'contactless credit card payment terminal', keywords: ['carte', 'bancaire', 'paiement', 'terminal', 'sans contact', 'cb', 'achat', 'compte'], lighting: 'bright' },
  { id: 'budget_coffee_morning', domain: 'budget_quotidien', title: 'Quotidien · Dépenses courantes', query: 'coffee cup croissant cafe table', keywords: ['cafe', 'matin', 'quotidien', 'budget', 'menage', 'pouvoir', 'consommation'], lighting: 'bright' },
  { id: 'budget_grocery_prices', domain: 'budget_quotidien', title: 'Étiquettes · Hausses de prix', query: 'market produce price tags', keywords: ['prix', 'etiquette', 'hausse', 'inflation', 'legumes', 'marche', 'cout'], lighting: 'bright' },
  { id: 'budget_piggy_bank', domain: 'budget_quotidien', title: 'Épargne · Réserve foyer', query: 'piggy bank coins savings', keywords: ['epargne', 'economie', 'tirelire', 'argent', 'reserve', 'mensuel', 'reste'], lighting: 'bright' },
  { id: 'budget_fuel_pump', domain: 'budget_quotidien', title: 'Carburant · Facture énergie', query: 'gas station fuel pump nozzle', keywords: ['carburant', 'essence', 'energie', 'transport', 'voiture', 'prix', 'litre', 'trajet'], lighting: 'bright' },
  { id: 'budget_household_desk', domain: 'budget_quotidien', title: 'Budget · Calcul mensuel', query: 'notebook pen budget calculation desk', keywords: ['budget', 'mensuel', 'salaire', 'net', 'brut', 'smic', 'fiche', 'paie', 'calcul'], lighting: 'bright' },
  { id: 'budget_bakery_counter', domain: 'budget_quotidien', title: 'Boulangerie · Pouvoir d’achat', query: 'artisan bakery bread counter', keywords: ['boulangerie', 'pain', 'pouvoir', 'achat', 'commercant', 'quartier', 'client'], lighting: 'bright' },
  { id: 'budget_electricity_meter', domain: 'budget_quotidien', title: 'Énergie · Charges du foyer', query: 'home electric utility meter', keywords: ['electricite', 'facture', 'energie', 'logement', 'charges', 'chauffage', 'kwh'], lighting: 'bright' },
  { id: 'budget_wallet_cash', domain: 'budget_quotidien', title: 'Portefeuille · Reste à vivre', query: 'leather wallet euro banknotes cash', keywords: ['portefeuille', 'liquide', 'espece', 'euro', 'euros', 'smic', 'salaire', 'pouvoir'], lighting: 'bright' },

  // 2. economie_finance (11)
  { id: 'econ_euro_banknotes', domain: 'economie_finance', title: 'Monnaie · Flux financiers', query: 'euro banknotes currency closeup', keywords: ['euro', 'euros', 'argent', 'billet', 'salaire', 'smic', 'brut', 'net', 'paye'], lighting: 'bright' },
  { id: 'econ_stock_chart', domain: 'economie_finance', title: 'Marchés · Courbes & taux', query: 'financial stock market chart display', keywords: ['bourse', 'marche', 'taux', 'action', 'investissement', 'courbe', 'indice', 'cac'], lighting: 'bright' },
  { id: 'econ_bank_facade', domain: 'economie_finance', title: 'Banques · Crédit & dépôts', query: 'neoclassical bank building facade', keywords: ['banque', 'bancaire', 'credit', 'decouvert', 'agios', 'pret', 'emprunt', 'interet'], lighting: 'bright' },
  { id: 'econ_coins_stack', domain: 'economie_finance', title: 'Capital · Rendement cumulé', query: 'stacked coins finance desk', keywords: ['interet', 'rendement', 'capital', 'patrimoine', 'retraite', 'epargne', 'livret'], lighting: 'bright' },
  { id: 'econ_balance_sheet', domain: 'economie_finance', title: 'Comptabilité · Bilan réel', query: 'accounting financial statement paper desk', keywords: ['bilan', 'comptabilite', 'charge', 'charges', 'patronale', 'patronales', 'cotisation', 'marge'], lighting: 'bright' },
  { id: 'econ_calculator_desk', domain: 'economie_finance', title: 'Fiscalité · Calcul des taxes', query: 'calculator tax financial papers', keywords: ['impot', 'taxe', 'fiscal', 'tva', 'urssaf', 'cotisation', 'exoneration', 'calcul'], lighting: 'bright' },
  { id: 'econ_shipping_containers', domain: 'economie_finance', title: 'Commerce · Chaîne mondiale', query: 'cargo ship port shipping containers', keywords: ['export', 'import', 'industrie', 'competitivite', 'douane', 'tarif', 'logistique'], lighting: 'bright' },
  { id: 'econ_factory_industry', domain: 'economie_finance', title: 'Production · Industrie réelle', query: 'modern manufacturing factory assembly', keywords: ['industrie', 'usine', 'production', 'entreprise', 'pme', 'productivite', 'cout'], lighting: 'bright' },
  { id: 'econ_gold_reserve', domain: 'economie_finance', title: 'Réserves · Valeur refuge', query: 'gold bullion bars finance', keywords: ['or', 'inflation', 'dette', 'reserve', 'valeur', 'monnaie', 'banque centrale'], lighting: 'bright' },
  { id: 'econ_paris_business', domain: 'economie_finance', title: 'Économie · Pôle d’affaires', query: 'la defense paris skyline daylight', keywords: ['france', 'economie', 'entreprise', 'siege', 'croissance', 'pib', 'paris'], lighting: 'bright' },
  { id: 'econ_newspaper_coffee', domain: 'economie_finance', title: 'Conjoncture · Actualité éco', query: 'newspaper coffee morning business', keywords: ['presse', 'economie', 'rapport', 'conjoncture', 'etude', 'banque de france', 'insee'], lighting: 'bright' },

  // 3. politique_institutions (11)
  { id: 'pol_parliament_chamber', domain: 'politique_institutions', title: 'Parlement · Vote de la loi', query: 'parliament assembly hall chamber', keywords: ['parlement', 'assemblee', 'loi', 'vote', 'depute', 'reforme', 'projet'], lighting: 'bright' },
  { id: 'pol_eu_flags', domain: 'politique_institutions', title: 'Europe · Directives & normes', query: 'european union flags brussels', keywords: ['europe', 'bruxelles', 'directive', 'reglement', 'norme', 'ue', 'commission'], lighting: 'bright' },
  { id: 'pol_ballot_box', domain: 'politique_institutions', title: 'Scrutin · Décision publique', query: 'election ballot box voting', keywords: ['vote', 'election', 'citoyen', 'referendum', 'scrutin', 'democratie'], lighting: 'bright' },
  { id: 'pol_ministry_palace', domain: 'politique_institutions', title: 'État · Décisions publiques', query: 'government palace building architecture paris', keywords: ['etat', 'gouvernement', 'ministere', 'matignon', 'bercy', 'budget', 'public'], lighting: 'bright' },
  { id: 'pol_press_microphones', domain: 'politique_institutions', title: 'Annonce · Conférence officielle', query: 'press conference microphones podium', keywords: ['conference', 'sociale', 'annonce', 'discours', 'ministre', 'syndicat', 'negociation'], lighting: 'bright' },
  { id: 'pol_law_decree', domain: 'politique_institutions', title: 'Texte · Décrets & codes', query: 'official law book constitution pages', keywords: ['decret', 'article', 'code', 'texte', 'journal officiel', 'obligation', 'interdiction'], lighting: 'bright' },
  { id: 'pol_town_hall', domain: 'politique_institutions', title: 'Collectivités · Territoires', query: 'french town hall mairie architecture', keywords: ['mairie', 'commune', 'ville', 'prefecture', 'local', 'service public'], lighting: 'bright' },
  { id: 'pol_courthouse_pillars', domain: 'politique_institutions', title: 'Justice · Cadre légal', query: 'courthouse neoclassical columns facade', keywords: ['justice', 'tribunal', 'conseil', 'constitution', 'sanction', 'amende'], lighting: 'bright' },
  { id: 'pol_public_march', domain: 'politique_institutions', title: 'Débat · Mobilisation sociale', query: 'public square gathering daylight crowd', keywords: ['social', 'greve', 'syndicat', 'pouvoir', 'retraite', 'salaire', 'manifestation'], lighting: 'bright' },
  { id: 'pol_diplomatic_table', domain: 'politique_institutions', title: 'Sommet · Négociation sociale', query: 'conference summit round table hall', keywords: ['conference', 'sociale', 'patronat', 'syndicat', 'accord', 'dialogue', 'table'], lighting: 'bright' },
  { id: 'pol_flag_french', domain: 'politique_institutions', title: 'France · Politique nationale', query: 'french flag tricolor building', keywords: ['france', 'francais', 'etat', 'republique', 'smic', 'gouvernement', 'loi'], lighting: 'bright' },

  // 4. droit_contrats (11)
  { id: 'law_contract_sign', domain: 'droit_contrats', title: 'Contrat · Signature engagée', query: 'signing business contract pen paper', keywords: ['contrat', 'signature', 'clause', 'cdi', 'cdd', 'bail', 'engagement', 'accord'], lighting: 'bright' },
  { id: 'law_notary_stamp', domain: 'droit_contrats', title: 'Acte · Validation officielle', query: 'rubber stamp office document paper', keywords: ['tampon', 'attestation', 'declaration', 'notaire', 'valide', 'officiel', 'cerfa'], lighting: 'bright' },
  { id: 'law_books_library', domain: 'droit_contrats', title: 'Droit · Jurisprudence & textes', query: 'law books library shelves', keywords: ['droit', 'code', 'travail', 'civil', 'penal', 'avocat', 'jurisprudence'], lighting: 'bright' },
  { id: 'law_justice_scales', domain: 'droit_contrats', title: 'Équilibre · Droits & devoirs', query: 'brass scales of justice', keywords: ['justice', 'droit', 'equilibre', 'litige', 'prudhommes', 'arbitrage'], lighting: 'bright' },
  { id: 'law_gavel_wood', domain: 'droit_contrats', title: 'Sanction · Décision de justice', query: 'wooden judge gavel courtroom', keywords: ['tribunal', 'amende', 'sanction', 'condamnation', 'proces', 'juge'], lighting: 'bright' },
  { id: 'law_privacy_folder', domain: 'droit_contrats', title: 'Conformité · Données protégées', query: 'confidential folder padlock security', keywords: ['rgpd', 'donnees', 'cnil', 'confidentialite', 'secret', 'conformite', 'audit'], lighting: 'bright' },
  { id: 'law_archive_files', domain: 'droit_contrats', title: 'Dossiers · Suivi administratif', query: 'office archive folders binders', keywords: ['dossier', 'administration', 'papier', 'bureaucratie', 'registre', 'controle'], lighting: 'bright' },
  { id: 'law_meeting_advisor', domain: 'droit_contrats', title: 'Conseil · Expertise juridique', query: 'business lawyer advisor office meeting', keywords: ['avocat', 'juriste', 'conseil', 'expert', 'litige', 'rupture', 'preavis'], lighting: 'bright' },
  { id: 'law_tax_form', domain: 'droit_contrats', title: 'Déclaration · Règles fiscales', query: 'tax return form pen desk', keywords: ['declaration', 'impot', 'fisc', 'controle', 'penalite', 'abattement'], lighting: 'bright' },
  { id: 'law_lease_paper', domain: 'droit_contrats', title: 'Bail · Clauses cachées', query: 'legal document paper close up pen', keywords: ['bail', 'caution', 'loyer', 'preavis', 'clause', 'abusive', 'contrat'], lighting: 'bright' },
  { id: 'law_id_badge', domain: 'droit_contrats', title: 'Identité · Vérification d’âge', query: 'passport identification card desk', keywords: ['identite', 'age', 'mineur', 'verification', 'carte', 'controle', 'acces'], lighting: 'bright' },

  // 5. restauration_hotellerie (11)
  { id: 'resto_chef_plating', domain: 'restauration_hotellerie', title: 'Cuisine · Préparation du service', query: 'restaurant chef plating food kitchen', keywords: ['restaurant', 'chef', 'cuisine', 'plat', 'menu', 'gastronomie', 'marge', 'service'], lighting: 'bright' },
  { id: 'resto_espresso_bar', domain: 'restauration_hotellerie', title: 'Café · Comptoir & débit', query: 'barista making espresso coffee machine', keywords: ['cafe', 'barista', 'bar', 'brasserie', 'comptoir', 'boisson', 'bistrot'], lighting: 'bright' },
  { id: 'resto_bistro_terrace', domain: 'restauration_hotellerie', title: 'Terrasse · Bistrot français', query: 'paris cafe bistro terrace chairs sunny', keywords: ['bistrot', 'terrasse', 'paris', 'restaurant', 'table', 'client', 'independant'], lighting: 'bright' },
  { id: 'resto_pos_register', domain: 'restauration_hotellerie', title: 'Caisse · Encaissement & marge', query: 'point of sale cash register restaurant', keywords: ['caisse', 'addition', 'encaissement', 'commission', 'marge', 'tva', 'livraison'], lighting: 'bright' },
  { id: 'resto_fresh_market', domain: 'restauration_hotellerie', title: 'Denrées · Coût matière première', query: 'fresh vegetables market crate organic', keywords: ['matiere', 'premiere', 'denree', 'fournisseur', 'produit', 'frais', 'cout'], lighting: 'bright' },
  { id: 'resto_steel_kitchen', domain: 'restauration_hotellerie', title: 'Brigade · Cuisine pro', query: 'commercial restaurant kitchen stainless steel', keywords: ['cuisine', 'brigade', 'equipement', 'fourneau', 'hygiene', 'loyer', 'charges'], lighting: 'bright' },
  { id: 'resto_waiter_service', domain: 'restauration_hotellerie', title: 'Salle · Service à table', query: 'waiter serving restaurant table', keywords: ['serveur', 'salle', 'couvert', 'service', 'client', 'pourboire', 'rotation'], lighting: 'bright' },
  { id: 'resto_bakery_oven', domain: 'restauration_hotellerie', title: 'Artisan · Four & boulangerie', query: 'bakery croissants bread display', keywords: ['boulangerie', 'artisan', 'patisserie', 'pain', 'energie', 'four', 'commerce'], lighting: 'bright' },
  { id: 'resto_food_truck', domain: 'restauration_hotellerie', title: 'Street-food · Modèle agile', query: 'food truck street market serving', keywords: ['food truck', 'snack', 'vente', 'emporter', 'loyer', 'marge', 'rapide'], lighting: 'bright' },
  { id: 'resto_menu_board', domain: 'restauration_hotellerie', title: 'Carte · Choix des plats', query: 'restaurant menu chalkboard sign', keywords: ['menu', 'carte', 'plat', 'prix', 'gaspillage', 'stock', 'selection'], lighting: 'bright' },
  { id: 'resto_dining_room', domain: 'restauration_hotellerie', title: 'Salle · Remplissage & couverts', query: 'bright modern restaurant dining interior', keywords: ['restaurant', 'restaurants', 'independant', 'independants', 'fermeture', 'table', 'chiffre'], lighting: 'bright' },

  // 6. immobilier_logement (11)
  { id: 'immo_house_keys', domain: 'immobilier_logement', title: 'Clés · Achat & location', query: 'house keys handover real estate', keywords: ['cle', 'cles', 'immobilier', 'achat', 'location', 'appartement', 'maison'], lighting: 'bright' },
  { id: 'immo_paris_balcony', domain: 'immobilier_logement', title: 'Haussmann · Marché urbain', query: 'paris haussmann apartment facade', keywords: ['paris', 'loyer', 'appartement', 'metre', 'carre', 'encadrement', 'ville'], lighting: 'bright' },
  { id: 'immo_living_room', domain: 'immobilier_logement', title: 'Intérieur · Valeur du bien', query: 'bright modern apartment living room', keywords: ['logement', 'salon', 'surface', 'bien', 'meuble', 'locataire', 'proprietaire'], lighting: 'bright' },
  { id: 'immo_construction_crane', domain: 'immobilier_logement', title: 'Chantier · Offre de logements', query: 'building construction tower crane sky', keywords: ['construction', 'neuf', 'chantier', 'promoteur', 'permis', 'penurie'], lighting: 'bright' },
  { id: 'immo_moving_boxes', domain: 'immobilier_logement', title: 'Déménagement · Coûts cachés', query: 'cardboard moving boxes bright room', keywords: ['demenagement', 'caution', 'frais', 'agence', 'dossier', 'locataire'], lighting: 'bright' },
  { id: 'immo_architect_blueprint', domain: 'immobilier_logement', title: 'Plans · Surface & normes', query: 'architectural blueprint floor plan desk', keywords: ['plan', 'architecte', 'surface', 'norme', 're2020', 'renovation', 'travaux'], lighting: 'bright' },
  { id: 'immo_solar_roof', domain: 'immobilier_logement', title: 'DPE · Rénovation énergétique', query: 'solar panels residential house roof', keywords: ['dpe', 'passoire', 'thermique', 'isolation', 'energie', 'chauffage', 'aide'], lighting: 'bright' },
  { id: 'immo_suburban_house', domain: 'immobilier_logement', title: 'Pavillon · Crédit long terme', query: 'modern residential house sunny exterior', keywords: ['maison', 'emprunt', 'credit', 'taux', 'apport', 'notaire', 'famille'], lighting: 'bright' },
  { id: 'immo_renovation_paint', domain: 'immobilier_logement', title: 'Travaux · Budget rénovation', query: 'home interior renovation wall painting', keywords: ['renovation', 'travaux', 'artisan', 'devis', 'isolation', 'plus-value'], lighting: 'bright' },
  { id: 'immo_kitchen_modern', domain: 'immobilier_logement', title: 'Habitat · Standing & loyer', query: 'bright modern kitchen interior', keywords: ['cuisine', 'logement', 'colocation', 'airbnb', 'rentabilite', 'lmnp'], lighting: 'bright' },
  { id: 'immo_street_buildings', domain: 'immobilier_logement', title: 'Quartier · Pression foncière', query: 'european apartment buildings street', keywords: ['immeuble', 'copropriete', 'charges', 'taxe fonciere', 'quartier', 'investissement'], lighting: 'bright' },

  // 7. commerce_retail (11)
  { id: 'retail_boutique_shop', domain: 'commerce_retail', title: 'Boutique · Commerce local', query: 'small boutique storefront window', keywords: ['boutique', 'magasin', 'commerce', 'vitrine', 'centre-ville', 'client'], lighting: 'bright' },
  { id: 'retail_delivery_packages', domain: 'commerce_retail', title: 'Livraison · Coût logistique', query: 'delivery courier cardboard package', keywords: ['livraison', 'colis', 'coursier', 'plateforme', 'commission', 'transport'], lighting: 'bright' },
  { id: 'retail_warehouse_boxes', domain: 'commerce_retail', title: 'Stock · Entrepôt & rotation', query: 'warehouse logistics cardboard boxes', keywords: ['stock', 'entrepot', 'logistique', 'rupture', 'inventaire', 'grossiste'], lighting: 'bright' },
  { id: 'retail_card_terminal', domain: 'commerce_retail', title: 'Caisse · Frais bancaires', query: 'payment terminal retail counter', keywords: ['paiement', 'frais', 'commission', 'tpe', 'vente', 'panier'], lighting: 'bright' },
  { id: 'retail_artisan_workshop', domain: 'commerce_retail', title: 'Atelier · Savoir-faire terrain', query: 'craftsman workshop artisan tools', keywords: ['artisan', 'atelier', 'savoir-faire', 'pme', 'fabrication', 'local'], lighting: 'bright' },
  { id: 'retail_clothing_store', domain: 'commerce_retail', title: 'Retail · Vente en rayon', query: 'clothing store rack retail', keywords: ['vetement', 'mode', 'solde', 'marge', 'retour', 'client'], lighting: 'bright' },
  { id: 'retail_pharmacy_counter', domain: 'commerce_retail', title: 'Officine · Distribution santé', query: 'modern pharmacy shop counter', keywords: ['pharmacie', 'comptoir', 'ordonnance', 'prix', 'remboursement'], lighting: 'bright' },
  { id: 'retail_hardware_aisle', domain: 'commerce_retail', title: 'Fournitures · Coût matériel', query: 'hardware store aisle shelves', keywords: ['materiel', 'outillage', 'fournisseur', 'matiere', 'inflation'], lighting: 'bright' },
  { id: 'retail_packing_desk', domain: 'commerce_retail', title: 'E-commerce · Expédition', query: 'ecommerce shipping box packing desk', keywords: ['ecommerce', 'commande', 'expedition', 'marge', 'boutique', 'ligne'], lighting: 'bright' },
  { id: 'retail_flower_market', domain: 'commerce_retail', title: 'Marché · Vente directe', query: 'outdoor flower market stall', keywords: ['marche', 'direct', 'producteur', 'circuit', 'court', 'client'], lighting: 'bright' },
  { id: 'retail_cafe_counter', domain: 'commerce_retail', title: 'Comptoir · Ticket moyen', query: 'pastry cafe counter shop', keywords: ['ticket', 'moyen', 'panier', 'vente', 'fidelite', 'client'], lighting: 'bright' },

  // 8. sante_sport (11)
  { id: 'health_morning_runner', domain: 'sante_sport', title: 'Sport · Énergie matinale', query: 'runner jogging park morning sunlight', keywords: ['sport', 'course', 'energie', 'matin', 'forme', 'endurance', 'habitude'], lighting: 'bright' },
  { id: 'health_gym_weights', domain: 'sante_sport', title: 'Entraînement · Discipline', query: 'fitness gym weights training', keywords: ['musculation', 'salle', 'sport', 'force', 'entrainement', 'discipline'], lighting: 'bright' },
  { id: 'health_doctor_desk', domain: 'sante_sport', title: 'Médecine · Diagnostic clinique', query: 'doctor stethoscope medical consultation', keywords: ['medecin', 'sante', 'patient', 'mutuelle', 'secu', 'consultation'], lighting: 'bright' },
  { id: 'health_healthy_bowl', domain: 'sante_sport', title: 'Nutrition · Énergie durable', query: 'healthy fresh salad food bowl', keywords: ['nutrition', 'alimentation', 'calorie', 'proteine', 'sucre', 'glycemie'], lighting: 'bright' },
  { id: 'health_cycling_city', domain: 'sante_sport', title: 'Mobilité · Trajet actif', query: 'bicycle commuter sunny city street', keywords: ['velo', 'mobilite', 'ville', 'transport', 'sante', 'ecologie'], lighting: 'bright' },
  { id: 'health_morning_bedroom', domain: 'sante_sport', title: 'Sommeil · Récupération', query: 'sunlit clean bedroom morning window', keywords: ['sommeil', 'fatigue', 'recuperation', 'nuit', 'reveil', 'cortisol', 'cerveau'], lighting: 'bright' },
  { id: 'health_meditation_calm', domain: 'sante_sport', title: 'Calme · Charge mentale', query: 'yoga mindfulness bright room', keywords: ['stress', 'mental', 'calme', 'concentration', 'respiration', 'burnout'], lighting: 'bright' },
  { id: 'health_swimming_pool', domain: 'sante_sport', title: 'Endurance · Régularité', query: 'swimming pool lanes indoor bright', keywords: ['natation', 'piscine', 'rythme', 'coeur', 'cardio', 'performance'], lighting: 'bright' },
  { id: 'health_hospital_corridor', domain: 'sante_sport', title: 'Hôpital · Système de soins', query: 'modern hospital hallway clean bright', keywords: ['hopital', 'soins', 'urgence', 'securite sociale', 'cotisation', 'sante'], lighting: 'bright' },
  { id: 'health_mountain_hike', domain: 'sante_sport', title: 'Plein air · Oxygénation', query: 'mountain hiking trail sunny', keywords: ['nature', 'marche', 'pas', 'deconnexion', 'plein air', 'vitalite'], lighting: 'bright' },
  { id: 'health_water_glass', domain: 'sante_sport', title: 'Hydratation · Focus simple', query: 'glass of water sunlight table', keywords: ['eau', 'hydratation', 'cerveau', 'fatigue', 'attention', 'simple'], lighting: 'bright' },

  // 9. emploi_carriere (11)
  { id: 'work_job_interview', domain: 'emploi_carriere', title: 'Recrutement · Entretien réel', query: 'job interview office handshake', keywords: ['entretien', 'recrutement', 'embauche', 'candidat', 'cv', 'poste', 'junior'], lighting: 'bright' },
  { id: 'work_campus_students', domain: 'emploi_carriere', title: 'Jeunes · Sortie d’études', query: 'university students campus walking', keywords: ['diplome', 'etudiant', 'jeune', 'juniors', 'ecole', 'formation', 'premier emploi'], lighting: 'bright' },
  { id: 'work_coworking_bright', domain: 'emploi_carriere', title: 'Bureau · Travail hybride', query: 'bright modern coworking office', keywords: ['bureau', 'travail', 'equipe', 'coworking', 'freelance', 'salarie', 'open space'], lighting: 'bright' },
  { id: 'work_technician_tablet', domain: 'emploi_carriere', title: 'Terrain · Métiers qualifiés', query: 'engineer tablet industrial inspection', keywords: ['metier', 'technicien', 'terrain', 'ingenieur', 'competence', 'penurie'], lighting: 'bright' },
  { id: 'work_laptop_resume', domain: 'emploi_carriere', title: 'Candidature · Sélection IA', query: 'laptop desk resume document workspace', keywords: ['cv', 'offre', 'offres', 'candidature', 'linkedin', 'tri', 'junior'], lighting: 'bright' },
  { id: 'work_teacher_board', domain: 'emploi_carriere', title: 'Transmission · Formation', query: 'teacher classroom whiteboard', keywords: ['formation', 'mentorat', 'senior', 'seniors', 'transmission', 'apprentissage'], lighting: 'bright' },
  { id: 'work_delivery_driver', domain: 'emploi_carriere', title: 'Services · Emploi de terrain', query: 'delivery van city logistics', keywords: ['livreur', 'chauffeur', 'service', 'smic', 'horaire', 'temps partiel'], lighting: 'bright' },
  { id: 'work_team_standing', domain: 'emploi_carriere', title: 'Équipe · Juniors & seniors', query: 'office team standing discussion', keywords: ['equipe', 'senior', 'junior', 'manager', 'productivite', 'collaboration'], lighting: 'bright' },
  { id: 'work_remote_balcony', domain: 'emploi_carriere', title: 'Indépendant · Télétravail', query: 'person working laptop cafe sunny', keywords: ['teletravail', 'freelance', 'independant', 'autoentrepreneur', 'salaire'], lighting: 'bright' },
  { id: 'work_construction_helmet', domain: 'emploi_carriere', title: 'Bâtiment · Emplois non délocalisables', query: 'engineer hard hat construction site', keywords: ['chantier', 'batiment', 'ouvrier', 'manuel', 'artisan', 'penurie'], lighting: 'bright' },
  { id: 'work_office_corridor', domain: 'emploi_carriere', title: 'Entreprise · Échelle des salaires', query: 'modern office glass interior corridor', keywords: ['entreprise', 'carriere', 'augmentation', 'grille', 'smic', 'salaire', 'cadre'], lighting: 'bright' },

  // 10. strategie_entreprise (11)
  { id: 'biz_whiteboard_strategy', domain: 'strategie_entreprise', title: 'Stratégie · Plan d’exécution', query: 'business strategy whiteboard markers', keywords: ['strategie', 'modele', 'plan', 'pivot', 'levier', 'decision', 'execution'], lighting: 'bright' },
  { id: 'biz_boardroom_meeting', domain: 'strategie_entreprise', title: 'Direction · Arbitrages clés', query: 'modern glass boardroom meeting', keywords: ['direction', 'comex', 'investisseur', 'budget', 'rentabilite', 'pme'], lighting: 'bright' },
  { id: 'biz_handshake_deal', domain: 'strategie_entreprise', title: 'Partenariat · Accord commercial', query: 'business handshake office bright', keywords: ['partenariat', 'client', 'vente', 'accord', 'negociation', 'contrat'], lighting: 'bright' },
  { id: 'biz_modern_hq', domain: 'strategie_entreprise', title: 'Entreprise · Passage à l’échelle', query: 'modern glass corporate building sky', keywords: ['croissance', 'entreprise', 'concurrent', 'marche', 'valorisation'], lighting: 'bright' },
  { id: 'biz_notebook_pen', domain: 'strategie_entreprise', title: 'Idées · Structuration rapide', query: 'open notebook pen wooden desk', keywords: ['note', 'idee', 'offre', 'positionnement', 'cible', 'message'], lighting: 'bright' },
  { id: 'biz_startup_loft', domain: 'strategie_entreprise', title: 'Startup · Agilité produit', query: 'startup office team laptops', keywords: ['startup', 'fondateur', 'produit', 'mvp', 'lancement', 'client'], lighting: 'bright' },
  { id: 'biz_window_view', domain: 'strategie_entreprise', title: 'Vision · Cap à 12 mois', query: 'executive looking out office window city', keywords: ['vision', 'cap', 'risque', 'tendance', 'futur', 'secteur'], lighting: 'bright' },
  { id: 'biz_prototype_desk', domain: 'strategie_entreprise', title: 'Produit · Tests sans risque', query: 'product design prototype desk', keywords: ['test', 'prototype', 'offre', 'client', 'feedback', 'validation'], lighting: 'bright' },
  { id: 'biz_coffee_meeting', domain: 'strategie_entreprise', title: 'Réseau · Échange terrain', query: 'two people coffee meeting discussion', keywords: ['client', 'reseau', 'terrain', 'retour', 'vente', 'prospection'], lighting: 'bright' },
  { id: 'biz_chess_strategy', domain: 'strategie_entreprise', title: 'Jeu · Coup d’avance', query: 'chess pieces wooden board strategy', keywords: ['concurrence', 'avantage', 'monopole', 'positionnement', 'tactique'], lighting: 'bright' },
  { id: 'biz_desk_minimal', domain: 'strategie_entreprise', title: 'Pilotage · Clarté opérationnelle', query: 'clean wooden office desk laptop', keywords: ['business', 'gestion', 'tresorerie', 'marge', 'resultat', 'rentable'], lighting: 'bright' },

  // 11. donnees_etudes (11)
  { id: 'data_bar_chart', domain: 'donnees_etudes', title: 'Chiffres · Preuve statistique', query: 'printed business bar chart paper', keywords: ['chiffre', 'pour cent', 'statistique', 'graphique', 'tendance', 'hausse', 'baisse'], lighting: 'bright' },
  { id: 'data_magnifying_glass', domain: 'donnees_etudes', title: 'Audit · Loupe sur les écarts', query: 'magnifying glass over financial document', keywords: ['audit', 'detail', 'ecart', 'preuve', 'analyse', 'verite', 'cache'], lighting: 'bright' },
  { id: 'data_science_lab', domain: 'donnees_etudes', title: 'Recherche · Étude empirique', query: 'scientific research laboratory microscope', keywords: ['etude', 'recherche', 'universite', 'stanford', 'mit', 'insee', 'experience'], lighting: 'bright' },
  { id: 'data_library_study', domain: 'donnees_etudes', title: 'Sources · Rapports vérifiés', query: 'university library study books', keywords: ['rapport', 'source', 'document', 'etude', 'publication', 'banque de france'], lighting: 'bright' },
  { id: 'data_dual_monitors', domain: 'donnees_etudes', title: 'Métriques · Tableau de bord', query: 'analytics charts computer screens', keywords: ['donnee', 'donnees', 'indice', 'mesure', 'tableau', 'kpi', 'comparaison'], lighting: 'bright' },
  { id: 'data_survey_clipboard', domain: 'donnees_etudes', title: 'Enquête · Échantillon mesuré', query: 'survey clipboard checklist desk', keywords: ['enquete', 'sondage', 'echantillon', 'panneau', 'interroge', 'panel'], lighting: 'bright' },
  { id: 'data_world_map', domain: 'donnees_etudes', title: 'Comparaison · Échelle globale', query: 'world map pins geography', keywords: ['pays', 'monde', 'europe', 'france', 'comparaison', 'ocde', 'classement'], lighting: 'bright' },
  { id: 'data_spreadsheet_screen', domain: 'donnees_etudes', title: 'Calcul · Modèle chiffré', query: 'spreadsheet data table monitor', keywords: ['tableur', 'calcul', 'simulation', 'cout', 'projection', 'moyenne'], lighting: 'bright' },
  { id: 'data_chalkboard_math', domain: 'donnees_etudes', title: 'Équation · Rapport de force', query: 'mathematics equations chalkboard', keywords: ['formule', 'ratio', 'effet', 'proportion', 'mathematique', 'croissance'], lighting: 'bright' },
  { id: 'data_archive_books', domain: 'donnees_etudes', title: 'Historique · Série longue', query: 'stacked research journals books', keywords: ['historique', 'annee', 'decennie', 'evolution', 'serie', '2023', '2026'], lighting: 'bright' },
  { id: 'data_pie_chart', domain: 'donnees_etudes', title: 'Répartition · Parts réelles', query: 'printed analytics report desk', keywords: ['part', 'repartition', 'pourcentage', 'total', 'ratio', 'poids'], lighting: 'bright' },

  // 12. productivite_reunions (11)
  { id: 'prod_calendar_desk', domain: 'productivite_reunions', title: 'Agenda · Temps bloqué', query: 'monthly planner desk calendar', keywords: ['calendrier', 'agenda', 'semaine', 'mois', 'echeance', 'planning'], lighting: 'bright' },
  { id: 'prod_sticky_notes', domain: 'productivite_reunions', title: 'Tâches · Tri prioritaire', query: 'sticky notes wall kanban', keywords: ['tache', 'priorite', 'liste', 'tri', 'organisation', 'backlog'], lighting: 'bright' },
  { id: 'prod_video_call', domain: 'productivite_reunions', title: 'Visio · Réunions en série', query: 'video call laptop office', keywords: ['reunion', 'reunions', 'visio', 'zoom', 'teams', 'meeting', 'appel'], lighting: 'bright' },
  { id: 'prod_minimal_desk', domain: 'productivite_reunions', title: 'Focus · Espace épuré', query: 'minimalist desk monitor workspace', keywords: ['focus', 'calme', 'concentration', 'travail', 'profond', 'productivite'], lighting: 'bright' },
  { id: 'prod_headphones_focus', domain: 'productivite_reunions', title: 'Isolement · Travail utile', query: 'headphones laptop desk workspace', keywords: ['casque', 'deep work', 'productif', 'heure', 'efficace', 'bruit'], lighting: 'bright' },
  { id: 'prod_empty_meeting', domain: 'productivite_reunions', title: 'Salle · Réunions évitées', query: 'empty glass conference room table', keywords: ['reunion', 'inutile', 'salle', 'async', 'compte-rendu', 'synthese'], lighting: 'bright' },
  { id: 'prod_morning_notebook', domain: 'productivite_reunions', title: 'Plan · Trois priorités', query: 'open notebook coffee morning desk', keywords: ['matin', 'plan', 'checklist', 'regle', 'routine', 'methode'], lighting: 'bright' },
  { id: 'prod_kanban_wall', domain: 'productivite_reunions', title: 'Flux · Suivi d’équipe', query: 'agile board office wall', keywords: ['processus', 'etape', 'validation', 'workflow', 'equipe', 'slack'], lighting: 'bright' },
  { id: 'prod_typing_laptop', domain: 'productivite_reunions', title: 'Exécution · Vitesse réelle', query: 'hands typing laptop bright desk', keywords: ['ecrire', 'rapidite', 'livrer', 'produire', 'action', 'resultat'], lighting: 'bright' },
  { id: 'prod_desk_plant', domain: 'productivite_reunions', title: 'Équilibre · Cadence durable', query: 'office desk plant sunlight', keywords: ['rythme', 'durable', 'fatigue', 'charge', 'semaine'], lighting: 'bright' },
  { id: 'prod_timer_desk', domain: 'productivite_reunions', title: 'Chrono · Minutes économisées', query: 'desk clock timer notebook', keywords: ['minute', 'heure', 'economiser', 'gagner', 'temps', 'rapide'], lighting: 'bright' },

  // 13. temps_mecanique (11)
  { id: 'time_watch_gears', domain: 'temps_mecanique', title: 'Mécanisme · Effet caché', query: 'mechanical watch gears macro', keywords: ['mecanisme', 'engrenage', 'effet', 'cause', 'systeme', 'rouage'], lighting: 'bright' },
  { id: 'time_station_clock', domain: 'temps_mecanique', title: 'Horloge · Compte à rebours', query: 'train station clock interior', keywords: ['horloge', 'heure', 'delai', 'urgence', 'bientot', 'avant'], lighting: 'bright' },
  { id: 'time_hourglass_sand', domain: 'temps_mecanique', title: 'Sablier · Temps compté', query: 'sand hourglass timer glass', keywords: ['temps', 'limite', 'sablier', 'compte', 'rebours', 'fin'], lighting: 'bright' },
  { id: 'time_highspeed_train', domain: 'temps_mecanique', title: 'Vitesse · Accélération nette', query: 'high speed train tgv station', keywords: ['vitesse', 'rapide', 'accelerer', 'transition', 'mutation', 'train'], lighting: 'bright' },
  { id: 'time_sunrise_city', domain: 'temps_mecanique', title: 'Demain · Nouveau cycle', query: 'city skyline bright sunrise', keywords: ['demain', '2026', 'avenir', 'prochain', 'cycle', 'nouveau'], lighting: 'bright' },
  { id: 'time_calendar_pages', domain: 'temps_mecanique', title: 'Échéance · Date butoir', query: 'desk calendar dates paper', keywords: ['date', 'mois', 'janvier', 'annee', 'echeance', 'delai'], lighting: 'bright' },
  { id: 'time_stopwatch_hand', domain: 'temps_mecanique', title: 'Mesure · Secondes clés', query: 'hand holding analog stopwatch', keywords: ['seconde', 'chronometre', 'instant', 'record', 'delai', 'vitesse'], lighting: 'bright' },
  { id: 'time_spiral_stairs', domain: 'temps_mecanique', title: 'Boucle · Effet domino', query: 'architectural spiral staircase', keywords: ['spirale', 'boucle', 'cercle', 'effet', 'escalade', 'consequence'], lighting: 'bright' },
  { id: 'time_bridge_traffic', domain: 'temps_mecanique', title: 'Flux · Activité continue', query: 'city bridge traffic daylight', keywords: ['flux', 'quotidien', 'trajet', 'urbain', 'rythme', 'ville'], lighting: 'bright' },
  { id: 'time_compass_brass', domain: 'temps_mecanique', title: 'Direction · Bon cap', query: 'brass compass navigation map', keywords: ['cap', 'direction', 'choix', 'orientation', 'repere', 'boussole'], lighting: 'bright' },
  { id: 'time_metro_platform', domain: 'temps_mecanique', title: 'Cadence · Rythme quotidien', query: 'modern subway metro station', keywords: ['metro', 'quotidien', 'matin', 'travailleur', 'trajet', 'heure'], lighting: 'bright' },

  // 14. attention_numerique (11)
  { id: 'mob_phone_hand', domain: 'attention_numerique', title: 'Mobile · Usage réflexe', query: 'hand holding smartphone screen', keywords: ['telephone', 'smartphone', 'appli', 'mobile', 'main', 'ecran'], lighting: 'high-contrast' },
  { id: 'mob_ring_light', domain: 'attention_numerique', title: 'Réseaux · Captation vidéo', query: 'smartphone tripod ring light', keywords: ['tiktok', 'instagram', 'reels', 'short', 'video', 'createur', 'vue'], lighting: 'high-contrast' },
  { id: 'mob_cafe_scroll', domain: 'attention_numerique', title: 'Scroll · Attention fragmentée', query: 'person scrolling smartphone cafe', keywords: ['scroll', 'feed', 'algorithme', 'attention', 'reseau', 'social'], lighting: 'bright' },
  { id: 'mob_commuter_phone', domain: 'attention_numerique', title: 'Transit · Écrans partout', query: 'passenger looking at phone train', keywords: ['transport', 'ecran', 'notification', 'alerte', 'abonnement'], lighting: 'bright' },
  { id: 'mob_screen_apps', domain: 'attention_numerique', title: 'Applications · Écosystème', query: 'smartphone screen app icons', keywords: ['application', 'appli', 'ios', 'android', 'plateforme', 'abonnement'], lighting: 'high-contrast' },
  { id: 'mob_podcast_mic', domain: 'attention_numerique', title: 'Voix · Format audio', query: 'podcast microphone table setup', keywords: ['podcast', 'audio', 'voix', 'micro', 'interview', 'media'], lighting: 'high-contrast' },
  { id: 'mob_camera_lens', domain: 'attention_numerique', title: 'Image · Qualité perçue', query: 'camera lens desk photography', keywords: ['image', 'photo', 'camera', 'visuel', 'qualite', 'cadre'], lighting: 'high-contrast' },
  { id: 'mob_tablet_stylus', domain: 'attention_numerique', title: 'Interface · Design tactile', query: 'tablet computer digital stylus', keywords: ['interface', 'design', 'tablette', 'ergonomie', 'outil', 'creation'], lighting: 'bright' },
  { id: 'mob_multiple_phones', domain: 'attention_numerique', title: 'Notifications · Surcharge', query: 'smartphones desk notifications', keywords: ['notification', 'alerte', 'spam', 'message', 'saturation'], lighting: 'bright' },
  { id: 'mob_subway_crowd', domain: 'attention_numerique', title: 'Usage · Masse connectée', query: 'commuters smartphones subway', keywords: ['reseaux', 'public', 'audience', 'utilisateurs', 'millions'], lighting: 'bright' },
  { id: 'mob_video_editing', domain: 'attention_numerique', title: 'Montage · Rétention écran', query: 'laptop video editing software', keywords: ['montage', 'youtube', 'video', 'retention', 'hook', 'format'], lighting: 'high-contrast' },

  // 15. jeunesse_ecrans (11)
  { id: 'youth_student_desk', domain: 'jeunesse_ecrans', title: 'Études · Devoirs & écrans', query: 'student studying desk lamp books', keywords: ['eleve', 'etudiant', 'devoir', 'revision', 'ecole', 'lycee'], lighting: 'bright' },
  { id: 'youth_school_hallway', domain: 'jeunesse_ecrans', title: 'Collège · Vie scolaire', query: 'school hallway lockers bright', keywords: ['college', 'lycee', 'ecole', 'mineur', 'ado', 'ados', '15 ans'], lighting: 'bright' },
  { id: 'youth_library_reading', domain: 'jeunesse_ecrans', title: 'Lecture · Concentration', query: 'student reading book library', keywords: ['lecture', 'livre', 'attention', 'cerveau', 'apprentissage', 'jeune'], lighting: 'bright' },
  { id: 'youth_classroom_window', domain: 'jeunesse_ecrans', title: 'Classe · Règles numériques', query: 'bright classroom school desks', keywords: ['classe', 'eleves', 'portable', 'interdiction', 'education'], lighting: 'bright' },
  { id: 'youth_campus_backpack', domain: 'jeunesse_ecrans', title: 'Campus · Génération Z', query: 'student backpack university yard', keywords: ['jeunes', 'generation', 'etudiant', 'avenir', 'orientation'], lighting: 'bright' },
  { id: 'youth_sports_field', domain: 'jeunesse_ecrans', title: 'Collectif · Vie hors écran', query: 'youth soccer field grass', keywords: ['sport', 'dehors', 'terrain', 'jeu', 'activite', 'sante'], lighting: 'bright' },
  { id: 'youth_family_dinner', domain: 'jeunesse_ecrans', title: 'Famille · Cadre parental', query: 'family dinner table conversation', keywords: ['parent', 'parents', 'famille', 'foyer', 'regle', 'enfant'], lighting: 'bright' },
  { id: 'youth_park_reading', domain: 'jeunesse_ecrans', title: 'Pause · Retour au réel', query: 'person reading book city park', keywords: ['parc', 'calme', 'deconnexion', 'sommeil', 'equilibre'], lighting: 'bright' },
  { id: 'youth_bus_commute', domain: 'jeunesse_ecrans', title: 'Trajet · Matin scolaire', query: 'city bus passenger window', keywords: ['matin', 'bus', 'trajet', 'ecole', 'quotidien'], lighting: 'bright' },
  { id: 'youth_headphones_study', domain: 'jeunesse_ecrans', title: 'Révision · Outils numériques', query: 'student headphones laptop library', keywords: ['cours', 'ia', 'revision', 'examen', 'bac', 'fac'], lighting: 'bright' },
  { id: 'youth_notebook_study', domain: 'jeunesse_ecrans', title: 'Examen · Mémorisation', query: 'open notebook pen school study', keywords: ['note', 'examen', 'niveau', 'pisa', 'ecriture'], lighting: 'bright' },

  // 16. intelligence_artificielle (11)
  { id: 'ai_robotics_lab', domain: 'intelligence_artificielle', title: 'Robotique · Automatisation', query: 'modern robotics laboratory arm', keywords: ['ia', 'robot', 'automatisation', 'remplacement', 'tache', 'machine'], lighting: 'high-contrast' },
  { id: 'ai_microchip_macro', domain: 'intelligence_artificielle', title: 'Calcul · Puissance silicium', query: 'computer microchip silicon macro', keywords: ['puce', 'gpu', 'nvidia', 'calcul', 'inference', 'modele', 'llm'], lighting: 'high-contrast' },
  { id: 'ai_data_center', domain: 'intelligence_artificielle', title: 'Infrastructure · Coût cloud', query: 'modern bright data center servers', keywords: ['serveur', 'cloud', 'energie', 'datacenter', 'token', 'requete'], lighting: 'high-contrast' },
  { id: 'ai_engineer_robot', domain: 'intelligence_artificielle', title: 'Supervision · Humain & agent', query: 'engineer testing robot arm lab', keywords: ['agent', 'agents', 'supervision', 'ia', 'senior', 'controle'], lighting: 'bright' },
  { id: 'ai_workstation_clean', domain: 'intelligence_artificielle', title: 'Station · Modèles locaux', query: 'modern desktop computer workstation', keywords: ['local', 'claude', 'openai', 'gpt', 'deepseek', 'copilot', 'assistant'], lighting: 'bright' },
  { id: 'ai_audio_waveform', domain: 'intelligence_artificielle', title: 'Voix IA · Synthèse & clonage', query: 'audio waveform monitor studio', keywords: ['voix', 'audio', 'clone', 'synthese', 'tts', 'speech'], lighting: 'high-contrast' },
  { id: 'ai_fiber_optics', domain: 'intelligence_artificielle', title: 'Réseaux · Flux instantanés', query: 'fiber optic cables light', keywords: ['reseau', 'connexion', 'flux', 'latence', 'vitesse', 'donnees'], lighting: 'high-contrast' },
  { id: 'ai_tech_campus', domain: 'intelligence_artificielle', title: 'Laboratoires · Course à l’IA', query: 'modern glass technology building atrium', keywords: ['openai', 'anthropic', 'google', 'meta', 'course', 'milliard'], lighting: 'bright' },
  { id: 'ai_satellite_orbit', domain: 'intelligence_artificielle', title: 'Échelle · Rupture technologique', query: 'aerospace satellite dish antenna', keywords: ['technologie', 'rupture', 'innovation', 'spatial', 'echelle'], lighting: 'bright' },
  { id: 'ai_3d_printer', domain: 'intelligence_artificielle', title: 'Prototypage · Génération rapide', query: '3d printer manufacturing machine', keywords: ['generer', 'prototype', 'rapide', 'cout', 'zero', 'creation'], lighting: 'bright' },
  { id: 'ai_drone_tech', domain: 'intelligence_artificielle', title: 'Autonomie · Systèmes embarqués', query: 'autonomous drone camera flight', keywords: ['autonome', 'agent', 'capteur', 'automatique', 'precision'], lighting: 'bright' },

  // 17. logiciel_ingenierie (11, devOnly)
  { id: 'dev_server_rack', domain: 'logiciel_ingenierie', title: 'Serveurs · Ports & protocoles', query: 'network server rack ethernet cables', keywords: ['serveur', 'mcp', 'port', 'reseau', 'backend', 'infra', 'hebergement'], lighting: 'high-contrast', isDevOnly: true },
  { id: 'dev_dual_screen', domain: 'logiciel_ingenierie', title: 'Code · Environnement dev', query: 'software developer dual screen code', keywords: ['code', 'developpeur', 'dev', 'ide', 'typescript', 'react', 'python'], lighting: 'high-contrast', isDevOnly: true },
  { id: 'dev_mech_keyboard', domain: 'logiciel_ingenierie', title: 'Clavier · Ligne de commande', query: 'mechanical keyboard computer desk', keywords: ['cli', 'terminal', 'bash', 'commande', 'raccourci', 'claude code'], lighting: 'high-contrast', isDevOnly: true },
  { id: 'dev_cloud_aisle', domain: 'logiciel_ingenierie', title: 'Cloud · Montée en charge', query: 'server room corridor racks', keywords: ['cloud', 'api', 'scalabilite', 'latence', 'quota', 'token'], lighting: 'high-contrast', isDevOnly: true },
  { id: 'dev_terminal_desk', domain: 'logiciel_ingenierie', title: 'Terminal · Déploiement live', query: 'laptop computer code terminal', keywords: ['terminal', 'git', 'github', 'deploiement', 'build', 'ci'], lighting: 'high-contrast', isDevOnly: true },
  { id: 'dev_circuit_board', domain: 'logiciel_ingenierie', title: 'Matériel · Architecture basse couche', query: 'electronic circuit board macro', keywords: ['hardware', 'sdk', 'driver', 'memoire', 'performance'], lighting: 'high-contrast', isDevOnly: true },
  { id: 'dev_security_lock', domain: 'logiciel_ingenierie', title: 'Sécurité · Faille & permissions', query: 'laptop computer cybersecurity lock', keywords: ['faille', 'securite', 'token', 'auth', 'oauth', 'mcp', 'injection'], lighting: 'high-contrast', isDevOnly: true },
  { id: 'dev_cafe_coding', domain: 'logiciel_ingenierie', title: 'Indie · Développement solo', query: 'developer laptop coffee shop', keywords: ['saas', 'indie', 'solo', 'mvp', 'vibecoding', 'cursor'], lighting: 'bright', isDevOnly: true },
  { id: 'dev_pair_coding', domain: 'logiciel_ingenierie', title: 'Revue · Qualité logicielle', query: 'two programmers laptop office', keywords: ['bug', 'test', 'revue', 'refactoring', 'architecture', 'junior'], lighting: 'bright', isDevOnly: true },
  { id: 'dev_architecture_board', domain: 'logiciel_ingenierie', title: 'Schéma · Flux API & MCP', query: 'software architecture diagram whiteboard', keywords: ['api', 'mcp', 'connecteur', 'schema', 'webhook', 'endpoint'], lighting: 'bright', isDevOnly: true },
  { id: 'dev_linux_monitor', domain: 'logiciel_ingenierie', title: 'Système · Logs & monitoring', query: 'desktop monitor coding workspace', keywords: ['log', 'monitoring', 'debug', 'erreur', 'production', 'docker'], lighting: 'high-contrast', isDevOnly: true },

  // 18. synthese_creator (11)
  { id: 'crt_creator_desk', domain: 'synthese_creator', title: 'Studio · Chaîne d’analyse', query: 'content creator camera studio desk', keywords: ['abonne', 'chaine', 'episode', 'analyse', 'decryptage', 'suivre'], lighting: 'bright' },
  { id: 'crt_condenser_mic', domain: 'synthese_creator', title: 'Micro · Narration directe', query: 'condenser studio microphone desk', keywords: ['micro', 'voix', 'episode', 'cloche', 'suite', 'decryptage'], lighting: 'bright' },
  { id: 'crt_camera_tripod', domain: 'synthese_creator', title: 'Caméra · Prochain numéro', query: 'mirrorless camera tripod studio', keywords: ['camera', 'tournage', 'short', 'video', 'suivre'], lighting: 'bright' },
  { id: 'crt_audio_mixer', domain: 'synthese_creator', title: 'Mixage · Rendu final', query: 'audio mixing console sliders', keywords: ['son', 'mixage', 'qualite', 'production', 'studio'], lighting: 'high-contrast' },
  { id: 'crt_softbox_light', domain: 'synthese_creator', title: 'Éclairage · Setup studio', query: 'studio softbox lighting stand', keywords: ['lumiere', 'studio', 'set', 'image', 'pro'], lighting: 'bright' },
  { id: 'crt_timeline_edit', domain: 'synthese_creator', title: 'Montage · Rythme final', query: 'video editing timeline computer', keywords: ['montage', 'cut', 'rythme', 'retrouver', 'chaine'], lighting: 'high-contrast' },
  { id: 'crt_script_notebook', domain: 'synthese_creator', title: 'Script · Prochaine enquête', query: 'script notebook pen coffee', keywords: ['script', 'enquete', 'sujet', 'demain', 'abonne'], lighting: 'bright' },
  { id: 'crt_clapperboard', domain: 'synthese_creator', title: 'Action · Épisode suivant', query: 'film clapperboard cinema slate', keywords: ['action', 'suite', 'episode', 'cloche', 'abonne'], lighting: 'bright' },
  { id: 'crt_acoustic_wall', domain: 'synthese_creator', title: 'Acoustique · Voix pure', query: 'recording studio acoustic foam wall', keywords: ['studio', 'voix', 'audio', 'clair', 'net'], lighting: 'high-contrast' },
  { id: 'crt_teleprompter', domain: 'synthese_creator', title: 'Régie · Production quotidienne', query: 'video studio broadcast monitor', keywords: ['regie', 'direct', 'analyse', 'jour', 'chaine'], lighting: 'bright' },
  { id: 'crt_desk_lamp', domain: 'synthese_creator', title: 'Veille · Décryptage continu', query: 'desk lamp microphone workspace', keywords: ['veille', 'recherche', 'decryptage', 'suivre', 'cloche'], lighting: 'bright' },
];

function ffprobeInfo(filePath) {
  const out = execFileSync(
    'ffprobe',
    ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,codec_name', '-of', 'json', filePath],
    { encoding: 'utf8', timeout: 10000 }
  );
  const parsed = JSON.parse(out);
  const s = parsed.streams?.[0];
  return s ? { width: Number(s.width || 0), height: Number(s.height || 0), codec: s.codec_name } : null;
}

function measureStats(filePath) {
  const out = execFileSync(
    'ffmpeg',
    ['-v', 'info', '-i', filePath, '-vf', 'signalstats,metadata=mode=print:file=-', '-f', 'null', '-'],
    { encoding: 'utf8', timeout: 15000 }
  );
  const avgM = out.match(/lavfi\.signalstats\.YAVG=([\d.]+)/);
  const minM = out.match(/lavfi\.signalstats\.YMIN=([\d.]+)/);
  const maxM = out.match(/lavfi\.signalstats\.YMAX=([\d.]+)/);
  return {
    yavg: avgM ? Number(avgM[1]) : 120,
    ymin: minM ? Number(minM[1]) : 0,
    ymax: maxM ? Number(maxM[1]) : 255,
  };
}

function normalizeToJpeg(srcPath, destPath) {
  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-v',
      'error',
      '-i',
      srcPath,
      '-vf',
      "scale='min(1080,iw)':-2:flags=lanczos,eq=contrast=1.04:saturation=1.05",
      '-q:v',
      '3',
      destPath,
    ],
    { timeout: 15000 }
  );
}

async function fetchCandidateUrls(query) {
  const urls = [];
  try {
    const ov = await fetch(
      `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=14&size=large,medium`,
      { headers: { 'User-Agent': 'StudioShortBrollBuilder/1.0' }, signal: AbortSignal.timeout(10000) }
    );
    if (ov.ok) {
      const data = await ov.json();
      for (const r of data.results || []) {
        const u = r.url || '';
        const t = String(r.title || '').toLowerCase();
        if (!u || /\.(svg|gif|webp)(\?|$)/i.test(u)) continue;
        if (/(logo|icon|diagram|map|screenshot|chart_svg|watermark|stock_vector)/i.test(t)) continue;
        if ((r.width || 0) >= 700 && (r.height || 0) >= 420) {
          urls.push(u);
        }
      }
    }
  } catch {
    // try wikimedia below
  }

  try {
    const wm = await fetch(
      `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
        query
      )}&gsrnamespace=6&gsrlimit=12&prop=imageinfo&iiprop=url|size|mime&iiurlwidth=1080&format=json`,
      { headers: { 'User-Agent': 'StudioShortBrollBuilder/1.0 (https://localhost)' }, signal: AbortSignal.timeout(10000) }
    );
    if (wm.ok) {
      const data = await wm.json();
      for (const p of Object.values(data?.query?.pages || {})) {
        const info = p?.imageinfo?.[0];
        if (!info) continue;
        if (info.mime !== 'image/jpeg' && info.mime !== 'image/png') continue;
        if ((info.width || 0) < 720 || (info.height || 0) < 420) continue;
        const u = info.thumburl || info.url;
        if (u) urls.push(u);
      }
    }
  } catch {
    // ignore
  }
  return [...new Set(urls)];
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'broll-fetch-'));
  const seenHashes = new Set();
  const seenUrls = new Set();
  const manifest = [];

  // Register any already-downloaded valid files first
  for (const scene of SCENES) {
    const target = path.join(OUT_DIR, `${scene.id}.jpg`);
    if (fs.existsSync(target) && fs.statSync(target).size > 20_000) {
      const h = crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex');
      if (!seenHashes.has(h)) {
        seenHashes.add(h);
        manifest.push({ ...scene, file: `/broll-pool/${scene.id}.jpg` });
      }
    }
  }
  const doneIds = new Set(manifest.map((m) => m.id));
  const pending = SCENES.filter((s) => !doneIds.has(s.id));
  console.log(`Already ready: ${manifest.length}, pending: ${pending.length}`);

  let idx = 0;
  async function worker() {
    while (idx < pending.length) {
      const scene = pending[idx++];
      const target = path.join(OUT_DIR, `${scene.id}.jpg`);
      let candidates = await fetchCandidateUrls(scene.query);
      if (candidates.length < 3) {
        const shorter = scene.query.split(/\s+/).slice(0, 2).join(' ');
        candidates = [...candidates, ...(await fetchCandidateUrls(shorter))];
      }
      if (candidates.length < 2) {
        const single = scene.query.split(/\s+/)[0];
        candidates = [...candidates, ...(await fetchCandidateUrls(single))];
      }

      let saved = false;
      for (const u of candidates) {
        if (seenUrls.has(u)) continue;
        seenUrls.add(u);
        const rawTmp = path.join(tmpDir, `${scene.id}_raw`);
        const normTmp = path.join(tmpDir, `${scene.id}_norm.jpg`);
        try {
          const resp = await fetch(u, {
            headers: { 'User-Agent': 'StudioShortBrollBuilder/1.0' },
            signal: AbortSignal.timeout(12000),
          });
          if (!resp.ok) continue;
          const ct = resp.headers.get('content-type') || '';
          if (!ct.startsWith('image/') || ct.includes('svg')) continue;
          const buf = Buffer.from(await resp.arrayBuffer());
          if (buf.length < 18_000 || buf.length > 15_000_000) continue;
          fs.writeFileSync(rawTmp, buf);

          const info = ffprobeInfo(rawTmp);
          if (!info || info.width < 640 || info.height < 400) continue;

          normalizeToJpeg(rawTmp, normTmp);
          const stats = measureStats(normTmp);
          // Enforce bright / readable & contrast gate (allow slightly moody only for high-contrast slots)
          const minAvg = scene.lighting === 'high-contrast' ? 42 : 66;
          if (stats.yavg < minAvg || stats.yavg > 232 || stats.ymax - stats.ymin < 70) {
            continue;
          }

          const outBuf = fs.readFileSync(normTmp);
          const hash = crypto.createHash('sha256').update(outBuf).digest('hex');
          if (seenHashes.has(hash)) continue;
          seenHashes.add(hash);

          fs.copyFileSync(normTmp, target);
          manifest.push({ ...scene, file: `/broll-pool/${scene.id}.jpg` });
          saved = true;
          if (manifest.length % 15 === 0) {
            console.log(`Progress: ${manifest.length}/${SCENES.length} verified bright photos`);
          }
          break;
        } catch {
          // try next candidate
        } finally {
          fs.rmSync(rawTmp, { force: true });
          fs.rmSync(normTmp, { force: true });
        }
      }
      if (!saved) {
        console.warn(`MISSING for ${scene.id} (${scene.query})`);
      }
    }
  }

  await Promise.all(Array.from({ length: 6 }, () => worker()));
  fs.rmSync(tmpDir, { recursive: true, force: true });

  // Order manifest deterministically like SCENES
  const byId = new Map(manifest.map((m) => [m.id, m]));
  const ordered = SCENES.map((s) => byId.get(s.id)).filter(Boolean);
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(ordered, null, 2) + '\n', 'utf8');
  console.log(`DONE: ${ordered.length}/${SCENES.length} unique verified photos saved in public/broll-pool/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
