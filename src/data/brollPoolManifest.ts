export interface BrollPoolEntry {
  id: string;
  domain: string;
  title: string;
  keywords: string[];
  lighting: "bright" | "high-contrast";
  isDevOnly?: boolean;
  file: string;
}

export const BROLL_POOL_MANIFEST: BrollPoolEntry[] = [
  {
    "id": "budget_supermarket_cart",
    "domain": "budget_quotidien",
    "title": "Panier · Grande surface",
    "keywords": [
      "supermarche",
      "courses",
      "panier",
      "caddie",
      "achat",
      "inflation",
      "prix",
      "alimentation",
      "rayon"
    ],
    "lighting": "bright",
    "file": "/broll-pool/budget_supermarket_cart.jpg"
  },
  {
    "id": "budget_cash_receipt",
    "domain": "budget_quotidien",
    "title": "Ticket · Addition réelle",
    "keywords": [
      "ticket",
      "caisse",
      "addition",
      "facture",
      "montant",
      "payer",
      "depense",
      "tva"
    ],
    "lighting": "bright",
    "file": "/broll-pool/budget_cash_receipt.jpg"
  },
  {
    "id": "budget_card_payment",
    "domain": "budget_quotidien",
    "title": "Paiement · Carte bancaire",
    "keywords": [
      "carte",
      "bancaire",
      "paiement",
      "terminal",
      "sans contact",
      "cb",
      "achat",
      "compte"
    ],
    "lighting": "bright",
    "file": "/broll-pool/budget_card_payment.jpg"
  },
  {
    "id": "budget_coffee_morning",
    "domain": "budget_quotidien",
    "title": "Quotidien · Dépenses courantes",
    "keywords": [
      "cafe",
      "matin",
      "quotidien",
      "budget",
      "menage",
      "pouvoir",
      "consommation"
    ],
    "lighting": "bright",
    "file": "/broll-pool/budget_coffee_morning.jpg"
  },
  {
    "id": "budget_grocery_prices",
    "domain": "budget_quotidien",
    "title": "Étiquettes · Hausses de prix",
    "keywords": [
      "prix",
      "etiquette",
      "hausse",
      "inflation",
      "legumes",
      "marche",
      "cout"
    ],
    "lighting": "bright",
    "file": "/broll-pool/budget_grocery_prices.jpg"
  },
  {
    "id": "budget_piggy_bank",
    "domain": "budget_quotidien",
    "title": "Épargne · Réserve foyer",
    "keywords": [
      "epargne",
      "economie",
      "tirelire",
      "argent",
      "reserve",
      "mensuel",
      "reste"
    ],
    "lighting": "bright",
    "file": "/broll-pool/budget_piggy_bank.jpg"
  },
  {
    "id": "budget_fuel_pump",
    "domain": "budget_quotidien",
    "title": "Carburant · Facture énergie",
    "keywords": [
      "carburant",
      "essence",
      "energie",
      "transport",
      "voiture",
      "prix",
      "litre",
      "trajet"
    ],
    "lighting": "bright",
    "file": "/broll-pool/budget_fuel_pump.jpg"
  },
  {
    "id": "budget_household_desk",
    "domain": "budget_quotidien",
    "title": "Budget · Calcul mensuel",
    "keywords": [
      "budget",
      "mensuel",
      "salaire",
      "net",
      "brut",
      "smic",
      "fiche",
      "paie",
      "calcul"
    ],
    "lighting": "bright",
    "file": "/broll-pool/budget_household_desk.jpg"
  },
  {
    "id": "budget_bakery_counter",
    "domain": "budget_quotidien",
    "title": "Boulangerie · Pouvoir d’achat",
    "keywords": [
      "boulangerie",
      "pain",
      "pouvoir",
      "achat",
      "commercant",
      "quartier",
      "client"
    ],
    "lighting": "bright",
    "file": "/broll-pool/budget_bakery_counter.jpg"
  },
  {
    "id": "budget_electricity_meter",
    "domain": "budget_quotidien",
    "title": "Énergie · Charges du foyer",
    "keywords": [
      "electricite",
      "facture",
      "energie",
      "logement",
      "charges",
      "chauffage",
      "kwh"
    ],
    "lighting": "bright",
    "file": "/broll-pool/budget_electricity_meter.jpg"
  },
  {
    "id": "budget_wallet_cash",
    "domain": "budget_quotidien",
    "title": "Portefeuille · Reste à vivre",
    "keywords": [
      "portefeuille",
      "liquide",
      "espece",
      "euro",
      "euros",
      "smic",
      "salaire",
      "pouvoir"
    ],
    "lighting": "bright",
    "file": "/broll-pool/budget_wallet_cash.jpg"
  },
  {
    "id": "econ_euro_banknotes",
    "domain": "economie_finance",
    "title": "Monnaie · Flux financiers",
    "keywords": [
      "euro",
      "euros",
      "argent",
      "billet",
      "salaire",
      "smic",
      "brut",
      "net",
      "paye"
    ],
    "lighting": "bright",
    "file": "/broll-pool/econ_euro_banknotes.jpg"
  },
  {
    "id": "econ_stock_chart",
    "domain": "economie_finance",
    "title": "Marchés · Courbes & taux",
    "keywords": [
      "bourse",
      "marche",
      "taux",
      "action",
      "investissement",
      "courbe",
      "indice",
      "cac"
    ],
    "lighting": "bright",
    "file": "/broll-pool/econ_stock_chart.jpg"
  },
  {
    "id": "econ_bank_facade",
    "domain": "economie_finance",
    "title": "Banques · Crédit & dépôts",
    "keywords": [
      "banque",
      "bancaire",
      "credit",
      "decouvert",
      "agios",
      "pret",
      "emprunt",
      "interet"
    ],
    "lighting": "bright",
    "file": "/broll-pool/econ_bank_facade.jpg"
  },
  {
    "id": "econ_coins_stack",
    "domain": "economie_finance",
    "title": "Capital · Rendement cumulé",
    "keywords": [
      "interet",
      "rendement",
      "capital",
      "patrimoine",
      "retraite",
      "epargne",
      "livret"
    ],
    "lighting": "bright",
    "file": "/broll-pool/econ_coins_stack.jpg"
  },
  {
    "id": "econ_balance_sheet",
    "domain": "economie_finance",
    "title": "Comptabilité · Bilan réel",
    "keywords": [
      "bilan",
      "comptabilite",
      "charge",
      "charges",
      "patronale",
      "patronales",
      "cotisation",
      "marge"
    ],
    "lighting": "bright",
    "file": "/broll-pool/econ_balance_sheet.jpg"
  },
  {
    "id": "econ_calculator_desk",
    "domain": "economie_finance",
    "title": "Fiscalité · Calcul des taxes",
    "keywords": [
      "impot",
      "taxe",
      "fiscal",
      "tva",
      "urssaf",
      "cotisation",
      "exoneration",
      "calcul"
    ],
    "lighting": "bright",
    "file": "/broll-pool/econ_calculator_desk.jpg"
  },
  {
    "id": "econ_shipping_containers",
    "domain": "economie_finance",
    "title": "Commerce · Chaîne mondiale",
    "keywords": [
      "export",
      "import",
      "industrie",
      "competitivite",
      "douane",
      "tarif",
      "logistique"
    ],
    "lighting": "bright",
    "file": "/broll-pool/econ_shipping_containers.jpg"
  },
  {
    "id": "econ_factory_industry",
    "domain": "economie_finance",
    "title": "Production · Industrie réelle",
    "keywords": [
      "industrie",
      "usine",
      "production",
      "entreprise",
      "pme",
      "productivite",
      "cout"
    ],
    "lighting": "bright",
    "file": "/broll-pool/econ_factory_industry.jpg"
  },
  {
    "id": "econ_gold_reserve",
    "domain": "economie_finance",
    "title": "Réserves · Valeur refuge",
    "keywords": [
      "or",
      "inflation",
      "dette",
      "reserve",
      "valeur",
      "monnaie",
      "banque centrale"
    ],
    "lighting": "bright",
    "file": "/broll-pool/econ_gold_reserve.jpg"
  },
  {
    "id": "econ_paris_business",
    "domain": "economie_finance",
    "title": "Économie · Pôle d’affaires",
    "keywords": [
      "france",
      "economie",
      "entreprise",
      "siege",
      "croissance",
      "pib",
      "paris"
    ],
    "lighting": "bright",
    "file": "/broll-pool/econ_paris_business.jpg"
  },
  {
    "id": "econ_newspaper_coffee",
    "domain": "economie_finance",
    "title": "Conjoncture · Actualité éco",
    "keywords": [
      "presse",
      "economie",
      "rapport",
      "conjoncture",
      "etude",
      "banque de france",
      "insee"
    ],
    "lighting": "bright",
    "file": "/broll-pool/econ_newspaper_coffee.jpg"
  },
  {
    "id": "pol_parliament_chamber",
    "domain": "politique_institutions",
    "title": "Parlement · Vote de la loi",
    "keywords": [
      "parlement",
      "assemblee",
      "loi",
      "vote",
      "depute",
      "reforme",
      "projet"
    ],
    "lighting": "bright",
    "file": "/broll-pool/pol_parliament_chamber.jpg"
  },
  {
    "id": "pol_eu_flags",
    "domain": "politique_institutions",
    "title": "Europe · Directives & normes",
    "keywords": [
      "europe",
      "bruxelles",
      "directive",
      "reglement",
      "norme",
      "ue",
      "commission"
    ],
    "lighting": "bright",
    "file": "/broll-pool/pol_eu_flags.jpg"
  },
  {
    "id": "pol_ballot_box",
    "domain": "politique_institutions",
    "title": "Scrutin · Décision publique",
    "keywords": [
      "vote",
      "election",
      "citoyen",
      "referendum",
      "scrutin",
      "democratie"
    ],
    "lighting": "bright",
    "file": "/broll-pool/pol_ballot_box.jpg"
  },
  {
    "id": "pol_ministry_palace",
    "domain": "politique_institutions",
    "title": "État · Décisions publiques",
    "keywords": [
      "etat",
      "gouvernement",
      "ministere",
      "matignon",
      "bercy",
      "budget",
      "public"
    ],
    "lighting": "bright",
    "file": "/broll-pool/pol_ministry_palace.jpg"
  },
  {
    "id": "pol_press_microphones",
    "domain": "politique_institutions",
    "title": "Annonce · Conférence officielle",
    "keywords": [
      "conference",
      "sociale",
      "annonce",
      "discours",
      "ministre",
      "syndicat",
      "negociation"
    ],
    "lighting": "bright",
    "file": "/broll-pool/pol_press_microphones.jpg"
  },
  {
    "id": "pol_law_decree",
    "domain": "politique_institutions",
    "title": "Texte · Décrets & codes",
    "keywords": [
      "decret",
      "article",
      "code",
      "texte",
      "journal officiel",
      "obligation",
      "interdiction"
    ],
    "lighting": "bright",
    "file": "/broll-pool/pol_law_decree.jpg"
  },
  {
    "id": "pol_town_hall",
    "domain": "politique_institutions",
    "title": "Collectivités · Territoires",
    "keywords": [
      "mairie",
      "commune",
      "ville",
      "prefecture",
      "local",
      "service public"
    ],
    "lighting": "bright",
    "file": "/broll-pool/pol_town_hall.jpg"
  },
  {
    "id": "pol_courthouse_pillars",
    "domain": "politique_institutions",
    "title": "Justice · Cadre légal",
    "keywords": [
      "justice",
      "tribunal",
      "conseil",
      "constitution",
      "sanction",
      "amende"
    ],
    "lighting": "bright",
    "file": "/broll-pool/pol_courthouse_pillars.jpg"
  },
  {
    "id": "pol_public_march",
    "domain": "politique_institutions",
    "title": "Débat · Mobilisation sociale",
    "keywords": [
      "social",
      "greve",
      "syndicat",
      "pouvoir",
      "retraite",
      "salaire",
      "manifestation"
    ],
    "lighting": "bright",
    "file": "/broll-pool/pol_public_march.jpg"
  },
  {
    "id": "pol_diplomatic_table",
    "domain": "politique_institutions",
    "title": "Sommet · Négociation sociale",
    "keywords": [
      "conference",
      "sociale",
      "patronat",
      "syndicat",
      "accord",
      "dialogue",
      "table"
    ],
    "lighting": "bright",
    "file": "/broll-pool/pol_diplomatic_table.jpg"
  },
  {
    "id": "pol_flag_french",
    "domain": "politique_institutions",
    "title": "France · Politique nationale",
    "keywords": [
      "france",
      "francais",
      "etat",
      "republique",
      "smic",
      "gouvernement",
      "loi"
    ],
    "lighting": "bright",
    "file": "/broll-pool/pol_flag_french.jpg"
  },
  {
    "id": "law_contract_sign",
    "domain": "droit_contrats",
    "title": "Contrat · Signature engagée",
    "keywords": [
      "contrat",
      "signature",
      "clause",
      "cdi",
      "cdd",
      "bail",
      "engagement",
      "accord"
    ],
    "lighting": "bright",
    "file": "/broll-pool/law_contract_sign.jpg"
  },
  {
    "id": "law_notary_stamp",
    "domain": "droit_contrats",
    "title": "Acte · Validation officielle",
    "keywords": [
      "tampon",
      "attestation",
      "declaration",
      "notaire",
      "valide",
      "officiel",
      "cerfa"
    ],
    "lighting": "bright",
    "file": "/broll-pool/law_notary_stamp.jpg"
  },
  {
    "id": "law_books_library",
    "domain": "droit_contrats",
    "title": "Droit · Jurisprudence & textes",
    "keywords": [
      "droit",
      "code",
      "travail",
      "civil",
      "penal",
      "avocat",
      "jurisprudence"
    ],
    "lighting": "bright",
    "file": "/broll-pool/law_books_library.jpg"
  },
  {
    "id": "law_justice_scales",
    "domain": "droit_contrats",
    "title": "Équilibre · Droits & devoirs",
    "keywords": [
      "justice",
      "droit",
      "equilibre",
      "litige",
      "prudhommes",
      "arbitrage"
    ],
    "lighting": "bright",
    "file": "/broll-pool/law_justice_scales.jpg"
  },
  {
    "id": "law_gavel_wood",
    "domain": "droit_contrats",
    "title": "Sanction · Décision de justice",
    "keywords": [
      "tribunal",
      "amende",
      "sanction",
      "condamnation",
      "proces",
      "juge"
    ],
    "lighting": "bright",
    "file": "/broll-pool/law_gavel_wood.jpg"
  },
  {
    "id": "law_privacy_folder",
    "domain": "droit_contrats",
    "title": "Conformité · Données protégées",
    "keywords": [
      "rgpd",
      "donnees",
      "cnil",
      "confidentialite",
      "secret",
      "conformite",
      "audit"
    ],
    "lighting": "bright",
    "file": "/broll-pool/law_privacy_folder.jpg"
  },
  {
    "id": "law_archive_files",
    "domain": "droit_contrats",
    "title": "Dossiers · Suivi administratif",
    "keywords": [
      "dossier",
      "administration",
      "papier",
      "bureaucratie",
      "registre",
      "controle"
    ],
    "lighting": "bright",
    "file": "/broll-pool/law_archive_files.jpg"
  },
  {
    "id": "law_meeting_advisor",
    "domain": "droit_contrats",
    "title": "Conseil · Expertise juridique",
    "keywords": [
      "avocat",
      "juriste",
      "conseil",
      "expert",
      "litige",
      "rupture",
      "preavis"
    ],
    "lighting": "bright",
    "file": "/broll-pool/law_meeting_advisor.jpg"
  },
  {
    "id": "law_tax_form",
    "domain": "droit_contrats",
    "title": "Déclaration · Règles fiscales",
    "keywords": [
      "declaration",
      "impot",
      "fisc",
      "controle",
      "penalite",
      "abattement"
    ],
    "lighting": "bright",
    "file": "/broll-pool/law_tax_form.jpg"
  },
  {
    "id": "law_lease_paper",
    "domain": "droit_contrats",
    "title": "Bail · Clauses cachées",
    "keywords": [
      "bail",
      "caution",
      "loyer",
      "preavis",
      "clause",
      "abusive",
      "contrat"
    ],
    "lighting": "bright",
    "file": "/broll-pool/law_lease_paper.jpg"
  },
  {
    "id": "law_id_badge",
    "domain": "droit_contrats",
    "title": "Identité · Vérification d’âge",
    "keywords": [
      "identite",
      "age",
      "mineur",
      "verification",
      "carte",
      "controle",
      "acces"
    ],
    "lighting": "bright",
    "file": "/broll-pool/law_id_badge.jpg"
  },
  {
    "id": "resto_chef_plating",
    "domain": "restauration_hotellerie",
    "title": "Cuisine · Préparation du service",
    "keywords": [
      "restaurant",
      "chef",
      "cuisine",
      "plat",
      "menu",
      "gastronomie",
      "marge",
      "service"
    ],
    "lighting": "bright",
    "file": "/broll-pool/resto_chef_plating.jpg"
  },
  {
    "id": "resto_espresso_bar",
    "domain": "restauration_hotellerie",
    "title": "Café · Comptoir & débit",
    "keywords": [
      "cafe",
      "barista",
      "bar",
      "brasserie",
      "comptoir",
      "boisson",
      "bistrot"
    ],
    "lighting": "bright",
    "file": "/broll-pool/resto_espresso_bar.jpg"
  },
  {
    "id": "resto_bistro_terrace",
    "domain": "restauration_hotellerie",
    "title": "Terrasse · Bistrot français",
    "keywords": [
      "bistrot",
      "terrasse",
      "paris",
      "restaurant",
      "table",
      "client",
      "independant"
    ],
    "lighting": "bright",
    "file": "/broll-pool/resto_bistro_terrace.jpg"
  },
  {
    "id": "resto_pos_register",
    "domain": "restauration_hotellerie",
    "title": "Caisse · Encaissement & marge",
    "keywords": [
      "caisse",
      "addition",
      "encaissement",
      "commission",
      "marge",
      "tva",
      "livraison"
    ],
    "lighting": "bright",
    "file": "/broll-pool/resto_pos_register.jpg"
  },
  {
    "id": "resto_fresh_market",
    "domain": "restauration_hotellerie",
    "title": "Denrées · Coût matière première",
    "keywords": [
      "matiere",
      "premiere",
      "denree",
      "fournisseur",
      "produit",
      "frais",
      "cout"
    ],
    "lighting": "bright",
    "file": "/broll-pool/resto_fresh_market.jpg"
  },
  {
    "id": "resto_steel_kitchen",
    "domain": "restauration_hotellerie",
    "title": "Brigade · Cuisine pro",
    "keywords": [
      "cuisine",
      "brigade",
      "equipement",
      "fourneau",
      "hygiene",
      "loyer",
      "charges"
    ],
    "lighting": "bright",
    "file": "/broll-pool/resto_steel_kitchen.jpg"
  },
  {
    "id": "resto_waiter_service",
    "domain": "restauration_hotellerie",
    "title": "Salle · Service à table",
    "keywords": [
      "serveur",
      "salle",
      "couvert",
      "service",
      "client",
      "pourboire",
      "rotation"
    ],
    "lighting": "bright",
    "file": "/broll-pool/resto_waiter_service.jpg"
  },
  {
    "id": "resto_bakery_oven",
    "domain": "restauration_hotellerie",
    "title": "Artisan · Four & boulangerie",
    "keywords": [
      "boulangerie",
      "artisan",
      "patisserie",
      "pain",
      "energie",
      "four",
      "commerce"
    ],
    "lighting": "bright",
    "file": "/broll-pool/resto_bakery_oven.jpg"
  },
  {
    "id": "resto_food_truck",
    "domain": "restauration_hotellerie",
    "title": "Street-food · Modèle agile",
    "keywords": [
      "food truck",
      "snack",
      "vente",
      "emporter",
      "loyer",
      "marge",
      "rapide"
    ],
    "lighting": "bright",
    "file": "/broll-pool/resto_food_truck.jpg"
  },
  {
    "id": "resto_menu_board",
    "domain": "restauration_hotellerie",
    "title": "Carte · Choix des plats",
    "keywords": [
      "menu",
      "carte",
      "plat",
      "prix",
      "gaspillage",
      "stock",
      "selection"
    ],
    "lighting": "bright",
    "file": "/broll-pool/resto_menu_board.jpg"
  },
  {
    "id": "resto_dining_room",
    "domain": "restauration_hotellerie",
    "title": "Salle · Remplissage & couverts",
    "keywords": [
      "restaurant",
      "restaurants",
      "independant",
      "independants",
      "fermeture",
      "table",
      "chiffre"
    ],
    "lighting": "bright",
    "file": "/broll-pool/resto_dining_room.jpg"
  },
  {
    "id": "immo_house_keys",
    "domain": "immobilier_logement",
    "title": "Clés · Achat & location",
    "keywords": [
      "cle",
      "cles",
      "immobilier",
      "achat",
      "location",
      "appartement",
      "maison"
    ],
    "lighting": "bright",
    "file": "/broll-pool/immo_house_keys.jpg"
  },
  {
    "id": "immo_paris_balcony",
    "domain": "immobilier_logement",
    "title": "Haussmann · Marché urbain",
    "keywords": [
      "paris",
      "loyer",
      "appartement",
      "metre",
      "carre",
      "encadrement",
      "ville"
    ],
    "lighting": "bright",
    "file": "/broll-pool/immo_paris_balcony.jpg"
  },
  {
    "id": "immo_living_room",
    "domain": "immobilier_logement",
    "title": "Intérieur · Valeur du bien",
    "keywords": [
      "logement",
      "salon",
      "surface",
      "bien",
      "meuble",
      "locataire",
      "proprietaire"
    ],
    "lighting": "bright",
    "file": "/broll-pool/immo_living_room.jpg"
  },
  {
    "id": "immo_construction_crane",
    "domain": "immobilier_logement",
    "title": "Chantier · Offre de logements",
    "keywords": [
      "construction",
      "neuf",
      "chantier",
      "promoteur",
      "permis",
      "penurie"
    ],
    "lighting": "bright",
    "file": "/broll-pool/immo_construction_crane.jpg"
  },
  {
    "id": "immo_moving_boxes",
    "domain": "immobilier_logement",
    "title": "Déménagement · Coûts cachés",
    "keywords": [
      "demenagement",
      "caution",
      "frais",
      "agence",
      "dossier",
      "locataire"
    ],
    "lighting": "bright",
    "file": "/broll-pool/immo_moving_boxes.jpg"
  },
  {
    "id": "immo_architect_blueprint",
    "domain": "immobilier_logement",
    "title": "Plans · Surface & normes",
    "keywords": [
      "plan",
      "architecte",
      "surface",
      "norme",
      "re2020",
      "renovation",
      "travaux"
    ],
    "lighting": "bright",
    "file": "/broll-pool/immo_architect_blueprint.jpg"
  },
  {
    "id": "immo_solar_roof",
    "domain": "immobilier_logement",
    "title": "DPE · Rénovation énergétique",
    "keywords": [
      "dpe",
      "passoire",
      "thermique",
      "isolation",
      "energie",
      "chauffage",
      "aide"
    ],
    "lighting": "bright",
    "file": "/broll-pool/immo_solar_roof.jpg"
  },
  {
    "id": "immo_suburban_house",
    "domain": "immobilier_logement",
    "title": "Pavillon · Crédit long terme",
    "keywords": [
      "maison",
      "emprunt",
      "credit",
      "taux",
      "apport",
      "notaire",
      "famille"
    ],
    "lighting": "bright",
    "file": "/broll-pool/immo_suburban_house.jpg"
  },
  {
    "id": "immo_renovation_paint",
    "domain": "immobilier_logement",
    "title": "Travaux · Budget rénovation",
    "keywords": [
      "renovation",
      "travaux",
      "artisan",
      "devis",
      "isolation",
      "plus-value"
    ],
    "lighting": "bright",
    "file": "/broll-pool/immo_renovation_paint.jpg"
  },
  {
    "id": "immo_kitchen_modern",
    "domain": "immobilier_logement",
    "title": "Habitat · Standing & loyer",
    "keywords": [
      "cuisine",
      "logement",
      "colocation",
      "airbnb",
      "rentabilite",
      "lmnp"
    ],
    "lighting": "bright",
    "file": "/broll-pool/immo_kitchen_modern.jpg"
  },
  {
    "id": "immo_street_buildings",
    "domain": "immobilier_logement",
    "title": "Quartier · Pression foncière",
    "keywords": [
      "immeuble",
      "copropriete",
      "charges",
      "taxe fonciere",
      "quartier",
      "investissement"
    ],
    "lighting": "bright",
    "file": "/broll-pool/immo_street_buildings.jpg"
  },
  {
    "id": "retail_boutique_shop",
    "domain": "commerce_retail",
    "title": "Boutique · Commerce local",
    "keywords": [
      "boutique",
      "magasin",
      "commerce",
      "vitrine",
      "centre-ville",
      "client"
    ],
    "lighting": "bright",
    "file": "/broll-pool/retail_boutique_shop.jpg"
  },
  {
    "id": "retail_delivery_packages",
    "domain": "commerce_retail",
    "title": "Livraison · Coût logistique",
    "keywords": [
      "livraison",
      "colis",
      "coursier",
      "plateforme",
      "commission",
      "transport"
    ],
    "lighting": "bright",
    "file": "/broll-pool/retail_delivery_packages.jpg"
  },
  {
    "id": "retail_warehouse_boxes",
    "domain": "commerce_retail",
    "title": "Stock · Entrepôt & rotation",
    "keywords": [
      "stock",
      "entrepot",
      "logistique",
      "rupture",
      "inventaire",
      "grossiste"
    ],
    "lighting": "bright",
    "file": "/broll-pool/retail_warehouse_boxes.jpg"
  },
  {
    "id": "retail_card_terminal",
    "domain": "commerce_retail",
    "title": "Caisse · Frais bancaires",
    "keywords": [
      "paiement",
      "frais",
      "commission",
      "tpe",
      "vente",
      "panier"
    ],
    "lighting": "bright",
    "file": "/broll-pool/retail_card_terminal.jpg"
  },
  {
    "id": "retail_artisan_workshop",
    "domain": "commerce_retail",
    "title": "Atelier · Savoir-faire terrain",
    "keywords": [
      "artisan",
      "atelier",
      "savoir-faire",
      "pme",
      "fabrication",
      "local"
    ],
    "lighting": "bright",
    "file": "/broll-pool/retail_artisan_workshop.jpg"
  },
  {
    "id": "retail_clothing_store",
    "domain": "commerce_retail",
    "title": "Retail · Vente en rayon",
    "keywords": [
      "vetement",
      "mode",
      "solde",
      "marge",
      "retour",
      "client"
    ],
    "lighting": "bright",
    "file": "/broll-pool/retail_clothing_store.jpg"
  },
  {
    "id": "retail_pharmacy_counter",
    "domain": "commerce_retail",
    "title": "Officine · Distribution santé",
    "keywords": [
      "pharmacie",
      "comptoir",
      "ordonnance",
      "prix",
      "remboursement"
    ],
    "lighting": "bright",
    "file": "/broll-pool/retail_pharmacy_counter.jpg"
  },
  {
    "id": "retail_hardware_aisle",
    "domain": "commerce_retail",
    "title": "Fournitures · Coût matériel",
    "keywords": [
      "materiel",
      "outillage",
      "fournisseur",
      "matiere",
      "inflation"
    ],
    "lighting": "bright",
    "file": "/broll-pool/retail_hardware_aisle.jpg"
  },
  {
    "id": "retail_packing_desk",
    "domain": "commerce_retail",
    "title": "E-commerce · Expédition",
    "keywords": [
      "ecommerce",
      "commande",
      "expedition",
      "marge",
      "boutique",
      "ligne"
    ],
    "lighting": "bright",
    "file": "/broll-pool/retail_packing_desk.jpg"
  },
  {
    "id": "retail_cafe_counter",
    "domain": "commerce_retail",
    "title": "Comptoir · Ticket moyen",
    "keywords": [
      "ticket",
      "moyen",
      "panier",
      "vente",
      "fidelite",
      "client"
    ],
    "lighting": "bright",
    "file": "/broll-pool/retail_cafe_counter.jpg"
  },
  {
    "id": "health_morning_runner",
    "domain": "sante_sport",
    "title": "Sport · Énergie matinale",
    "keywords": [
      "sport",
      "course",
      "energie",
      "matin",
      "forme",
      "endurance",
      "habitude"
    ],
    "lighting": "bright",
    "file": "/broll-pool/health_morning_runner.jpg"
  },
  {
    "id": "health_gym_weights",
    "domain": "sante_sport",
    "title": "Entraînement · Discipline",
    "keywords": [
      "musculation",
      "salle",
      "sport",
      "force",
      "entrainement",
      "discipline"
    ],
    "lighting": "bright",
    "file": "/broll-pool/health_gym_weights.jpg"
  },
  {
    "id": "health_doctor_desk",
    "domain": "sante_sport",
    "title": "Médecine · Diagnostic clinique",
    "keywords": [
      "medecin",
      "sante",
      "patient",
      "mutuelle",
      "secu",
      "consultation"
    ],
    "lighting": "bright",
    "file": "/broll-pool/health_doctor_desk.jpg"
  },
  {
    "id": "health_healthy_bowl",
    "domain": "sante_sport",
    "title": "Nutrition · Énergie durable",
    "keywords": [
      "nutrition",
      "alimentation",
      "calorie",
      "proteine",
      "sucre",
      "glycemie"
    ],
    "lighting": "bright",
    "file": "/broll-pool/health_healthy_bowl.jpg"
  },
  {
    "id": "health_cycling_city",
    "domain": "sante_sport",
    "title": "Mobilité · Trajet actif",
    "keywords": [
      "velo",
      "mobilite",
      "ville",
      "transport",
      "sante",
      "ecologie"
    ],
    "lighting": "bright",
    "file": "/broll-pool/health_cycling_city.jpg"
  },
  {
    "id": "health_morning_bedroom",
    "domain": "sante_sport",
    "title": "Sommeil · Récupération",
    "keywords": [
      "sommeil",
      "fatigue",
      "recuperation",
      "nuit",
      "reveil",
      "cortisol",
      "cerveau"
    ],
    "lighting": "bright",
    "file": "/broll-pool/health_morning_bedroom.jpg"
  },
  {
    "id": "health_meditation_calm",
    "domain": "sante_sport",
    "title": "Calme · Charge mentale",
    "keywords": [
      "stress",
      "mental",
      "calme",
      "concentration",
      "respiration",
      "burnout"
    ],
    "lighting": "bright",
    "file": "/broll-pool/health_meditation_calm.jpg"
  },
  {
    "id": "health_swimming_pool",
    "domain": "sante_sport",
    "title": "Endurance · Régularité",
    "keywords": [
      "natation",
      "piscine",
      "rythme",
      "coeur",
      "cardio",
      "performance"
    ],
    "lighting": "bright",
    "file": "/broll-pool/health_swimming_pool.jpg"
  },
  {
    "id": "health_hospital_corridor",
    "domain": "sante_sport",
    "title": "Hôpital · Système de soins",
    "keywords": [
      "hopital",
      "soins",
      "urgence",
      "securite sociale",
      "cotisation",
      "sante"
    ],
    "lighting": "bright",
    "file": "/broll-pool/health_hospital_corridor.jpg"
  },
  {
    "id": "health_mountain_hike",
    "domain": "sante_sport",
    "title": "Plein air · Oxygénation",
    "keywords": [
      "nature",
      "marche",
      "pas",
      "deconnexion",
      "plein air",
      "vitalite"
    ],
    "lighting": "bright",
    "file": "/broll-pool/health_mountain_hike.jpg"
  },
  {
    "id": "health_water_glass",
    "domain": "sante_sport",
    "title": "Hydratation · Focus simple",
    "keywords": [
      "eau",
      "hydratation",
      "cerveau",
      "fatigue",
      "attention",
      "simple"
    ],
    "lighting": "bright",
    "file": "/broll-pool/health_water_glass.jpg"
  },
  {
    "id": "work_job_interview",
    "domain": "emploi_carriere",
    "title": "Recrutement · Entretien réel",
    "keywords": [
      "entretien",
      "recrutement",
      "embauche",
      "candidat",
      "cv",
      "poste",
      "junior"
    ],
    "lighting": "bright",
    "file": "/broll-pool/work_job_interview.jpg"
  },
  {
    "id": "work_campus_students",
    "domain": "emploi_carriere",
    "title": "Jeunes · Sortie d’études",
    "keywords": [
      "diplome",
      "etudiant",
      "jeune",
      "juniors",
      "ecole",
      "formation",
      "premier emploi"
    ],
    "lighting": "bright",
    "file": "/broll-pool/work_campus_students.jpg"
  },
  {
    "id": "work_coworking_bright",
    "domain": "emploi_carriere",
    "title": "Bureau · Travail hybride",
    "keywords": [
      "bureau",
      "travail",
      "equipe",
      "coworking",
      "freelance",
      "salarie",
      "open space"
    ],
    "lighting": "bright",
    "file": "/broll-pool/work_coworking_bright.jpg"
  },
  {
    "id": "work_technician_tablet",
    "domain": "emploi_carriere",
    "title": "Terrain · Métiers qualifiés",
    "keywords": [
      "metier",
      "technicien",
      "terrain",
      "ingenieur",
      "competence",
      "penurie"
    ],
    "lighting": "bright",
    "file": "/broll-pool/work_technician_tablet.jpg"
  },
  {
    "id": "work_laptop_resume",
    "domain": "emploi_carriere",
    "title": "Candidature · Sélection IA",
    "keywords": [
      "cv",
      "offre",
      "offres",
      "candidature",
      "linkedin",
      "tri",
      "junior"
    ],
    "lighting": "bright",
    "file": "/broll-pool/work_laptop_resume.jpg"
  },
  {
    "id": "work_teacher_board",
    "domain": "emploi_carriere",
    "title": "Transmission · Formation",
    "keywords": [
      "formation",
      "mentorat",
      "senior",
      "seniors",
      "transmission",
      "apprentissage"
    ],
    "lighting": "bright",
    "file": "/broll-pool/work_teacher_board.jpg"
  },
  {
    "id": "work_delivery_driver",
    "domain": "emploi_carriere",
    "title": "Services · Emploi de terrain",
    "keywords": [
      "livreur",
      "chauffeur",
      "service",
      "smic",
      "horaire",
      "temps partiel"
    ],
    "lighting": "bright",
    "file": "/broll-pool/work_delivery_driver.jpg"
  },
  {
    "id": "work_team_standing",
    "domain": "emploi_carriere",
    "title": "Équipe · Juniors & seniors",
    "keywords": [
      "equipe",
      "senior",
      "junior",
      "manager",
      "productivite",
      "collaboration"
    ],
    "lighting": "bright",
    "file": "/broll-pool/work_team_standing.jpg"
  },
  {
    "id": "work_remote_balcony",
    "domain": "emploi_carriere",
    "title": "Indépendant · Télétravail",
    "keywords": [
      "teletravail",
      "freelance",
      "independant",
      "autoentrepreneur",
      "salaire"
    ],
    "lighting": "bright",
    "file": "/broll-pool/work_remote_balcony.jpg"
  },
  {
    "id": "work_construction_helmet",
    "domain": "emploi_carriere",
    "title": "Bâtiment · Emplois non délocalisables",
    "keywords": [
      "chantier",
      "batiment",
      "ouvrier",
      "manuel",
      "artisan",
      "penurie"
    ],
    "lighting": "bright",
    "file": "/broll-pool/work_construction_helmet.jpg"
  },
  {
    "id": "work_office_corridor",
    "domain": "emploi_carriere",
    "title": "Entreprise · Échelle des salaires",
    "keywords": [
      "entreprise",
      "carriere",
      "augmentation",
      "grille",
      "smic",
      "salaire",
      "cadre"
    ],
    "lighting": "bright",
    "file": "/broll-pool/work_office_corridor.jpg"
  },
  {
    "id": "biz_whiteboard_strategy",
    "domain": "strategie_entreprise",
    "title": "Stratégie · Plan d’exécution",
    "keywords": [
      "strategie",
      "modele",
      "plan",
      "pivot",
      "levier",
      "decision",
      "execution"
    ],
    "lighting": "bright",
    "file": "/broll-pool/biz_whiteboard_strategy.jpg"
  },
  {
    "id": "biz_boardroom_meeting",
    "domain": "strategie_entreprise",
    "title": "Direction · Arbitrages clés",
    "keywords": [
      "direction",
      "comex",
      "investisseur",
      "budget",
      "rentabilite",
      "pme"
    ],
    "lighting": "bright",
    "file": "/broll-pool/biz_boardroom_meeting.jpg"
  },
  {
    "id": "biz_handshake_deal",
    "domain": "strategie_entreprise",
    "title": "Partenariat · Accord commercial",
    "keywords": [
      "partenariat",
      "client",
      "vente",
      "accord",
      "negociation",
      "contrat"
    ],
    "lighting": "bright",
    "file": "/broll-pool/biz_handshake_deal.jpg"
  },
  {
    "id": "biz_modern_hq",
    "domain": "strategie_entreprise",
    "title": "Entreprise · Passage à l’échelle",
    "keywords": [
      "croissance",
      "entreprise",
      "concurrent",
      "marche",
      "valorisation"
    ],
    "lighting": "bright",
    "file": "/broll-pool/biz_modern_hq.jpg"
  },
  {
    "id": "biz_notebook_pen",
    "domain": "strategie_entreprise",
    "title": "Idées · Structuration rapide",
    "keywords": [
      "note",
      "idee",
      "offre",
      "positionnement",
      "cible",
      "message"
    ],
    "lighting": "bright",
    "file": "/broll-pool/biz_notebook_pen.jpg"
  },
  {
    "id": "biz_startup_loft",
    "domain": "strategie_entreprise",
    "title": "Startup · Agilité produit",
    "keywords": [
      "startup",
      "fondateur",
      "produit",
      "mvp",
      "lancement",
      "client"
    ],
    "lighting": "bright",
    "file": "/broll-pool/biz_startup_loft.jpg"
  },
  {
    "id": "biz_window_view",
    "domain": "strategie_entreprise",
    "title": "Vision · Cap à 12 mois",
    "keywords": [
      "vision",
      "cap",
      "risque",
      "tendance",
      "futur",
      "secteur"
    ],
    "lighting": "bright",
    "file": "/broll-pool/biz_window_view.jpg"
  },
  {
    "id": "biz_prototype_desk",
    "domain": "strategie_entreprise",
    "title": "Produit · Tests sans risque",
    "keywords": [
      "test",
      "prototype",
      "offre",
      "client",
      "feedback",
      "validation"
    ],
    "lighting": "bright",
    "file": "/broll-pool/biz_prototype_desk.jpg"
  },
  {
    "id": "biz_coffee_meeting",
    "domain": "strategie_entreprise",
    "title": "Réseau · Échange terrain",
    "keywords": [
      "client",
      "reseau",
      "terrain",
      "retour",
      "vente",
      "prospection"
    ],
    "lighting": "bright",
    "file": "/broll-pool/biz_coffee_meeting.jpg"
  },
  {
    "id": "biz_chess_strategy",
    "domain": "strategie_entreprise",
    "title": "Jeu · Coup d’avance",
    "keywords": [
      "concurrence",
      "avantage",
      "monopole",
      "positionnement",
      "tactique"
    ],
    "lighting": "bright",
    "file": "/broll-pool/biz_chess_strategy.jpg"
  },
  {
    "id": "biz_desk_minimal",
    "domain": "strategie_entreprise",
    "title": "Pilotage · Clarté opérationnelle",
    "keywords": [
      "business",
      "gestion",
      "tresorerie",
      "marge",
      "resultat",
      "rentable"
    ],
    "lighting": "bright",
    "file": "/broll-pool/biz_desk_minimal.jpg"
  },
  {
    "id": "data_bar_chart",
    "domain": "donnees_etudes",
    "title": "Chiffres · Preuve statistique",
    "keywords": [
      "chiffre",
      "pour cent",
      "statistique",
      "graphique",
      "tendance",
      "hausse",
      "baisse"
    ],
    "lighting": "bright",
    "file": "/broll-pool/data_bar_chart.jpg"
  },
  {
    "id": "data_magnifying_glass",
    "domain": "donnees_etudes",
    "title": "Audit · Loupe sur les écarts",
    "keywords": [
      "audit",
      "detail",
      "ecart",
      "preuve",
      "analyse",
      "verite",
      "cache"
    ],
    "lighting": "bright",
    "file": "/broll-pool/data_magnifying_glass.jpg"
  },
  {
    "id": "data_science_lab",
    "domain": "donnees_etudes",
    "title": "Recherche · Étude empirique",
    "keywords": [
      "etude",
      "recherche",
      "universite",
      "stanford",
      "mit",
      "insee",
      "experience"
    ],
    "lighting": "bright",
    "file": "/broll-pool/data_science_lab.jpg"
  },
  {
    "id": "data_library_study",
    "domain": "donnees_etudes",
    "title": "Sources · Rapports vérifiés",
    "keywords": [
      "rapport",
      "source",
      "document",
      "etude",
      "publication",
      "banque de france"
    ],
    "lighting": "bright",
    "file": "/broll-pool/data_library_study.jpg"
  },
  {
    "id": "data_dual_monitors",
    "domain": "donnees_etudes",
    "title": "Métriques · Tableau de bord",
    "keywords": [
      "donnee",
      "donnees",
      "indice",
      "mesure",
      "tableau",
      "kpi",
      "comparaison"
    ],
    "lighting": "bright",
    "file": "/broll-pool/data_dual_monitors.jpg"
  },
  {
    "id": "data_survey_clipboard",
    "domain": "donnees_etudes",
    "title": "Enquête · Échantillon mesuré",
    "keywords": [
      "enquete",
      "sondage",
      "echantillon",
      "panneau",
      "interroge",
      "panel"
    ],
    "lighting": "bright",
    "file": "/broll-pool/data_survey_clipboard.jpg"
  },
  {
    "id": "data_world_map",
    "domain": "donnees_etudes",
    "title": "Comparaison · Échelle globale",
    "keywords": [
      "pays",
      "monde",
      "europe",
      "france",
      "comparaison",
      "ocde",
      "classement"
    ],
    "lighting": "bright",
    "file": "/broll-pool/data_world_map.jpg"
  },
  {
    "id": "data_spreadsheet_screen",
    "domain": "donnees_etudes",
    "title": "Calcul · Modèle chiffré",
    "keywords": [
      "tableur",
      "calcul",
      "simulation",
      "cout",
      "projection",
      "moyenne"
    ],
    "lighting": "bright",
    "file": "/broll-pool/data_spreadsheet_screen.jpg"
  },
  {
    "id": "data_chalkboard_math",
    "domain": "donnees_etudes",
    "title": "Équation · Rapport de force",
    "keywords": [
      "formule",
      "ratio",
      "effet",
      "proportion",
      "mathematique",
      "croissance"
    ],
    "lighting": "bright",
    "file": "/broll-pool/data_chalkboard_math.jpg"
  },
  {
    "id": "data_archive_books",
    "domain": "donnees_etudes",
    "title": "Historique · Série longue",
    "keywords": [
      "historique",
      "annee",
      "decennie",
      "evolution",
      "serie",
      "2023",
      "2026"
    ],
    "lighting": "bright",
    "file": "/broll-pool/data_archive_books.jpg"
  },
  {
    "id": "data_pie_chart",
    "domain": "donnees_etudes",
    "title": "Répartition · Parts réelles",
    "keywords": [
      "part",
      "repartition",
      "pourcentage",
      "total",
      "ratio",
      "poids"
    ],
    "lighting": "bright",
    "file": "/broll-pool/data_pie_chart.jpg"
  },
  {
    "id": "prod_calendar_desk",
    "domain": "productivite_reunions",
    "title": "Agenda · Temps bloqué",
    "keywords": [
      "calendrier",
      "agenda",
      "semaine",
      "mois",
      "echeance",
      "planning"
    ],
    "lighting": "bright",
    "file": "/broll-pool/prod_calendar_desk.jpg"
  },
  {
    "id": "prod_sticky_notes",
    "domain": "productivite_reunions",
    "title": "Tâches · Tri prioritaire",
    "keywords": [
      "tache",
      "priorite",
      "liste",
      "tri",
      "organisation",
      "backlog"
    ],
    "lighting": "bright",
    "file": "/broll-pool/prod_sticky_notes.jpg"
  },
  {
    "id": "prod_video_call",
    "domain": "productivite_reunions",
    "title": "Visio · Réunions en série",
    "keywords": [
      "reunion",
      "reunions",
      "visio",
      "zoom",
      "teams",
      "meeting",
      "appel"
    ],
    "lighting": "bright",
    "file": "/broll-pool/prod_video_call.jpg"
  },
  {
    "id": "prod_minimal_desk",
    "domain": "productivite_reunions",
    "title": "Focus · Espace épuré",
    "keywords": [
      "focus",
      "calme",
      "concentration",
      "travail",
      "profond",
      "productivite"
    ],
    "lighting": "bright",
    "file": "/broll-pool/prod_minimal_desk.jpg"
  },
  {
    "id": "prod_headphones_focus",
    "domain": "productivite_reunions",
    "title": "Isolement · Travail utile",
    "keywords": [
      "casque",
      "deep work",
      "productif",
      "heure",
      "efficace",
      "bruit"
    ],
    "lighting": "bright",
    "file": "/broll-pool/prod_headphones_focus.jpg"
  },
  {
    "id": "prod_empty_meeting",
    "domain": "productivite_reunions",
    "title": "Salle · Réunions évitées",
    "keywords": [
      "reunion",
      "inutile",
      "salle",
      "async",
      "compte-rendu",
      "synthese"
    ],
    "lighting": "bright",
    "file": "/broll-pool/prod_empty_meeting.jpg"
  },
  {
    "id": "prod_morning_notebook",
    "domain": "productivite_reunions",
    "title": "Plan · Trois priorités",
    "keywords": [
      "matin",
      "plan",
      "checklist",
      "regle",
      "routine",
      "methode"
    ],
    "lighting": "bright",
    "file": "/broll-pool/prod_morning_notebook.jpg"
  },
  {
    "id": "prod_kanban_wall",
    "domain": "productivite_reunions",
    "title": "Flux · Suivi d’équipe",
    "keywords": [
      "processus",
      "etape",
      "validation",
      "workflow",
      "equipe",
      "slack"
    ],
    "lighting": "bright",
    "file": "/broll-pool/prod_kanban_wall.jpg"
  },
  {
    "id": "prod_typing_laptop",
    "domain": "productivite_reunions",
    "title": "Exécution · Vitesse réelle",
    "keywords": [
      "ecrire",
      "rapidite",
      "livrer",
      "produire",
      "action",
      "resultat"
    ],
    "lighting": "bright",
    "file": "/broll-pool/prod_typing_laptop.jpg"
  },
  {
    "id": "prod_desk_plant",
    "domain": "productivite_reunions",
    "title": "Équilibre · Cadence durable",
    "keywords": [
      "rythme",
      "durable",
      "fatigue",
      "charge",
      "semaine"
    ],
    "lighting": "bright",
    "file": "/broll-pool/prod_desk_plant.jpg"
  },
  {
    "id": "prod_timer_desk",
    "domain": "productivite_reunions",
    "title": "Chrono · Minutes économisées",
    "keywords": [
      "minute",
      "heure",
      "economiser",
      "gagner",
      "temps",
      "rapide"
    ],
    "lighting": "bright",
    "file": "/broll-pool/prod_timer_desk.jpg"
  },
  {
    "id": "time_watch_gears",
    "domain": "temps_mecanique",
    "title": "Mécanisme · Effet caché",
    "keywords": [
      "mecanisme",
      "engrenage",
      "effet",
      "cause",
      "systeme",
      "rouage"
    ],
    "lighting": "bright",
    "file": "/broll-pool/time_watch_gears.jpg"
  },
  {
    "id": "time_station_clock",
    "domain": "temps_mecanique",
    "title": "Horloge · Compte à rebours",
    "keywords": [
      "horloge",
      "heure",
      "delai",
      "urgence",
      "bientot",
      "avant"
    ],
    "lighting": "bright",
    "file": "/broll-pool/time_station_clock.jpg"
  },
  {
    "id": "time_hourglass_sand",
    "domain": "temps_mecanique",
    "title": "Sablier · Temps compté",
    "keywords": [
      "temps",
      "limite",
      "sablier",
      "compte",
      "rebours",
      "fin"
    ],
    "lighting": "bright",
    "file": "/broll-pool/time_hourglass_sand.jpg"
  },
  {
    "id": "time_highspeed_train",
    "domain": "temps_mecanique",
    "title": "Vitesse · Accélération nette",
    "keywords": [
      "vitesse",
      "rapide",
      "accelerer",
      "transition",
      "mutation",
      "train"
    ],
    "lighting": "bright",
    "file": "/broll-pool/time_highspeed_train.jpg"
  },
  {
    "id": "time_sunrise_city",
    "domain": "temps_mecanique",
    "title": "Demain · Nouveau cycle",
    "keywords": [
      "demain",
      "2026",
      "avenir",
      "prochain",
      "cycle",
      "nouveau"
    ],
    "lighting": "bright",
    "file": "/broll-pool/time_sunrise_city.jpg"
  },
  {
    "id": "time_calendar_pages",
    "domain": "temps_mecanique",
    "title": "Échéance · Date butoir",
    "keywords": [
      "date",
      "mois",
      "janvier",
      "annee",
      "echeance",
      "delai"
    ],
    "lighting": "bright",
    "file": "/broll-pool/time_calendar_pages.jpg"
  },
  {
    "id": "time_stopwatch_hand",
    "domain": "temps_mecanique",
    "title": "Mesure · Secondes clés",
    "keywords": [
      "seconde",
      "chronometre",
      "instant",
      "record",
      "delai",
      "vitesse"
    ],
    "lighting": "bright",
    "file": "/broll-pool/time_stopwatch_hand.jpg"
  },
  {
    "id": "time_spiral_stairs",
    "domain": "temps_mecanique",
    "title": "Boucle · Effet domino",
    "keywords": [
      "spirale",
      "boucle",
      "cercle",
      "effet",
      "escalade",
      "consequence"
    ],
    "lighting": "bright",
    "file": "/broll-pool/time_spiral_stairs.jpg"
  },
  {
    "id": "time_bridge_traffic",
    "domain": "temps_mecanique",
    "title": "Flux · Activité continue",
    "keywords": [
      "flux",
      "quotidien",
      "trajet",
      "urbain",
      "rythme",
      "ville"
    ],
    "lighting": "bright",
    "file": "/broll-pool/time_bridge_traffic.jpg"
  },
  {
    "id": "time_compass_brass",
    "domain": "temps_mecanique",
    "title": "Direction · Bon cap",
    "keywords": [
      "cap",
      "direction",
      "choix",
      "orientation",
      "repere",
      "boussole"
    ],
    "lighting": "bright",
    "file": "/broll-pool/time_compass_brass.jpg"
  },
  {
    "id": "time_metro_platform",
    "domain": "temps_mecanique",
    "title": "Cadence · Rythme quotidien",
    "keywords": [
      "metro",
      "quotidien",
      "matin",
      "travailleur",
      "trajet",
      "heure"
    ],
    "lighting": "bright",
    "file": "/broll-pool/time_metro_platform.jpg"
  },
  {
    "id": "mob_phone_hand",
    "domain": "attention_numerique",
    "title": "Mobile · Usage réflexe",
    "keywords": [
      "telephone",
      "smartphone",
      "appli",
      "mobile",
      "main",
      "ecran"
    ],
    "lighting": "high-contrast",
    "file": "/broll-pool/mob_phone_hand.jpg"
  },
  {
    "id": "mob_ring_light",
    "domain": "attention_numerique",
    "title": "Réseaux · Captation vidéo",
    "keywords": [
      "tiktok",
      "instagram",
      "reels",
      "short",
      "video",
      "createur",
      "vue"
    ],
    "lighting": "high-contrast",
    "file": "/broll-pool/mob_ring_light.jpg"
  },
  {
    "id": "mob_cafe_scroll",
    "domain": "attention_numerique",
    "title": "Scroll · Attention fragmentée",
    "keywords": [
      "scroll",
      "feed",
      "algorithme",
      "attention",
      "reseau",
      "social"
    ],
    "lighting": "bright",
    "file": "/broll-pool/mob_cafe_scroll.jpg"
  },
  {
    "id": "mob_commuter_phone",
    "domain": "attention_numerique",
    "title": "Transit · Écrans partout",
    "keywords": [
      "transport",
      "ecran",
      "notification",
      "alerte",
      "abonnement"
    ],
    "lighting": "bright",
    "file": "/broll-pool/mob_commuter_phone.jpg"
  },
  {
    "id": "mob_screen_apps",
    "domain": "attention_numerique",
    "title": "Applications · Écosystème",
    "keywords": [
      "application",
      "appli",
      "ios",
      "android",
      "plateforme",
      "abonnement"
    ],
    "lighting": "high-contrast",
    "file": "/broll-pool/mob_screen_apps.jpg"
  },
  {
    "id": "mob_podcast_mic",
    "domain": "attention_numerique",
    "title": "Voix · Format audio",
    "keywords": [
      "podcast",
      "audio",
      "voix",
      "micro",
      "interview",
      "media"
    ],
    "lighting": "high-contrast",
    "file": "/broll-pool/mob_podcast_mic.jpg"
  },
  {
    "id": "mob_camera_lens",
    "domain": "attention_numerique",
    "title": "Image · Qualité perçue",
    "keywords": [
      "image",
      "photo",
      "camera",
      "visuel",
      "qualite",
      "cadre"
    ],
    "lighting": "high-contrast",
    "file": "/broll-pool/mob_camera_lens.jpg"
  },
  {
    "id": "mob_tablet_stylus",
    "domain": "attention_numerique",
    "title": "Interface · Design tactile",
    "keywords": [
      "interface",
      "design",
      "tablette",
      "ergonomie",
      "outil",
      "creation"
    ],
    "lighting": "bright",
    "file": "/broll-pool/mob_tablet_stylus.jpg"
  },
  {
    "id": "mob_multiple_phones",
    "domain": "attention_numerique",
    "title": "Notifications · Surcharge",
    "keywords": [
      "notification",
      "alerte",
      "spam",
      "message",
      "saturation"
    ],
    "lighting": "bright",
    "file": "/broll-pool/mob_multiple_phones.jpg"
  },
  {
    "id": "mob_subway_crowd",
    "domain": "attention_numerique",
    "title": "Usage · Masse connectée",
    "keywords": [
      "reseaux",
      "public",
      "audience",
      "utilisateurs",
      "millions"
    ],
    "lighting": "bright",
    "file": "/broll-pool/mob_subway_crowd.jpg"
  },
  {
    "id": "mob_video_editing",
    "domain": "attention_numerique",
    "title": "Montage · Rétention écran",
    "keywords": [
      "montage",
      "youtube",
      "video",
      "retention",
      "hook",
      "format"
    ],
    "lighting": "high-contrast",
    "file": "/broll-pool/mob_video_editing.jpg"
  },
  {
    "id": "youth_student_desk",
    "domain": "jeunesse_ecrans",
    "title": "Études · Devoirs & écrans",
    "keywords": [
      "eleve",
      "etudiant",
      "devoir",
      "revision",
      "ecole",
      "lycee"
    ],
    "lighting": "bright",
    "file": "/broll-pool/youth_student_desk.jpg"
  },
  {
    "id": "youth_school_hallway",
    "domain": "jeunesse_ecrans",
    "title": "Collège · Vie scolaire",
    "keywords": [
      "college",
      "lycee",
      "ecole",
      "mineur",
      "ado",
      "ados",
      "15 ans"
    ],
    "lighting": "bright",
    "file": "/broll-pool/youth_school_hallway.jpg"
  },
  {
    "id": "youth_library_reading",
    "domain": "jeunesse_ecrans",
    "title": "Lecture · Concentration",
    "keywords": [
      "lecture",
      "livre",
      "attention",
      "cerveau",
      "apprentissage",
      "jeune"
    ],
    "lighting": "bright",
    "file": "/broll-pool/youth_library_reading.jpg"
  },
  {
    "id": "youth_classroom_window",
    "domain": "jeunesse_ecrans",
    "title": "Classe · Règles numériques",
    "keywords": [
      "classe",
      "eleves",
      "portable",
      "interdiction",
      "education"
    ],
    "lighting": "bright",
    "file": "/broll-pool/youth_classroom_window.jpg"
  },
  {
    "id": "youth_campus_backpack",
    "domain": "jeunesse_ecrans",
    "title": "Campus · Génération Z",
    "keywords": [
      "jeunes",
      "generation",
      "etudiant",
      "avenir",
      "orientation"
    ],
    "lighting": "bright",
    "file": "/broll-pool/youth_campus_backpack.jpg"
  },
  {
    "id": "youth_sports_field",
    "domain": "jeunesse_ecrans",
    "title": "Collectif · Vie hors écran",
    "keywords": [
      "sport",
      "dehors",
      "terrain",
      "jeu",
      "activite",
      "sante"
    ],
    "lighting": "bright",
    "file": "/broll-pool/youth_sports_field.jpg"
  },
  {
    "id": "youth_family_dinner",
    "domain": "jeunesse_ecrans",
    "title": "Famille · Cadre parental",
    "keywords": [
      "parent",
      "parents",
      "famille",
      "foyer",
      "regle",
      "enfant"
    ],
    "lighting": "bright",
    "file": "/broll-pool/youth_family_dinner.jpg"
  },
  {
    "id": "youth_park_reading",
    "domain": "jeunesse_ecrans",
    "title": "Pause · Retour au réel",
    "keywords": [
      "parc",
      "calme",
      "deconnexion",
      "sommeil",
      "equilibre"
    ],
    "lighting": "bright",
    "file": "/broll-pool/youth_park_reading.jpg"
  },
  {
    "id": "youth_bus_commute",
    "domain": "jeunesse_ecrans",
    "title": "Trajet · Matin scolaire",
    "keywords": [
      "matin",
      "bus",
      "trajet",
      "ecole",
      "quotidien"
    ],
    "lighting": "bright",
    "file": "/broll-pool/youth_bus_commute.jpg"
  },
  {
    "id": "youth_headphones_study",
    "domain": "jeunesse_ecrans",
    "title": "Révision · Outils numériques",
    "keywords": [
      "cours",
      "ia",
      "revision",
      "examen",
      "bac",
      "fac"
    ],
    "lighting": "bright",
    "file": "/broll-pool/youth_headphones_study.jpg"
  },
  {
    "id": "youth_notebook_study",
    "domain": "jeunesse_ecrans",
    "title": "Examen · Mémorisation",
    "keywords": [
      "note",
      "examen",
      "niveau",
      "pisa",
      "ecriture"
    ],
    "lighting": "bright",
    "file": "/broll-pool/youth_notebook_study.jpg"
  },
  {
    "id": "ai_robotics_lab",
    "domain": "intelligence_artificielle",
    "title": "Robotique · Automatisation",
    "keywords": [
      "ia",
      "robot",
      "automatisation",
      "remplacement",
      "tache",
      "machine"
    ],
    "lighting": "high-contrast",
    "file": "/broll-pool/ai_robotics_lab.jpg"
  },
  {
    "id": "ai_microchip_macro",
    "domain": "intelligence_artificielle",
    "title": "Calcul · Puissance silicium",
    "keywords": [
      "puce",
      "gpu",
      "nvidia",
      "calcul",
      "inference",
      "modele",
      "llm"
    ],
    "lighting": "high-contrast",
    "file": "/broll-pool/ai_microchip_macro.jpg"
  },
  {
    "id": "ai_data_center",
    "domain": "intelligence_artificielle",
    "title": "Infrastructure · Coût cloud",
    "keywords": [
      "serveur",
      "cloud",
      "energie",
      "datacenter",
      "token",
      "requete"
    ],
    "lighting": "high-contrast",
    "file": "/broll-pool/ai_data_center.jpg"
  },
  {
    "id": "ai_engineer_robot",
    "domain": "intelligence_artificielle",
    "title": "Supervision · Humain & agent",
    "keywords": [
      "agent",
      "agents",
      "supervision",
      "ia",
      "senior",
      "controle"
    ],
    "lighting": "bright",
    "file": "/broll-pool/ai_engineer_robot.jpg"
  },
  {
    "id": "ai_workstation_clean",
    "domain": "intelligence_artificielle",
    "title": "Station · Modèles locaux",
    "keywords": [
      "local",
      "claude",
      "openai",
      "gpt",
      "deepseek",
      "copilot",
      "assistant"
    ],
    "lighting": "bright",
    "file": "/broll-pool/ai_workstation_clean.jpg"
  },
  {
    "id": "ai_audio_waveform",
    "domain": "intelligence_artificielle",
    "title": "Voix IA · Synthèse & clonage",
    "keywords": [
      "voix",
      "audio",
      "clone",
      "synthese",
      "tts",
      "speech"
    ],
    "lighting": "high-contrast",
    "file": "/broll-pool/ai_audio_waveform.jpg"
  },
  {
    "id": "ai_fiber_optics",
    "domain": "intelligence_artificielle",
    "title": "Réseaux · Flux instantanés",
    "keywords": [
      "reseau",
      "connexion",
      "flux",
      "latence",
      "vitesse",
      "donnees"
    ],
    "lighting": "high-contrast",
    "file": "/broll-pool/ai_fiber_optics.jpg"
  },
  {
    "id": "ai_tech_campus",
    "domain": "intelligence_artificielle",
    "title": "Laboratoires · Course à l’IA",
    "keywords": [
      "openai",
      "anthropic",
      "google",
      "meta",
      "course",
      "milliard"
    ],
    "lighting": "bright",
    "file": "/broll-pool/ai_tech_campus.jpg"
  },
  {
    "id": "ai_satellite_orbit",
    "domain": "intelligence_artificielle",
    "title": "Échelle · Rupture technologique",
    "keywords": [
      "technologie",
      "rupture",
      "innovation",
      "spatial",
      "echelle"
    ],
    "lighting": "bright",
    "file": "/broll-pool/ai_satellite_orbit.jpg"
  },
  {
    "id": "ai_3d_printer",
    "domain": "intelligence_artificielle",
    "title": "Prototypage · Génération rapide",
    "keywords": [
      "generer",
      "prototype",
      "rapide",
      "cout",
      "zero",
      "creation"
    ],
    "lighting": "bright",
    "file": "/broll-pool/ai_3d_printer.jpg"
  },
  {
    "id": "ai_drone_tech",
    "domain": "intelligence_artificielle",
    "title": "Autonomie · Systèmes embarqués",
    "keywords": [
      "autonome",
      "agent",
      "capteur",
      "automatique",
      "precision"
    ],
    "lighting": "bright",
    "file": "/broll-pool/ai_drone_tech.jpg"
  },
  {
    "id": "dev_server_rack",
    "domain": "logiciel_ingenierie",
    "title": "Serveurs · Ports & protocoles",
    "keywords": [
      "serveur",
      "mcp",
      "port",
      "reseau",
      "backend",
      "infra",
      "hebergement"
    ],
    "lighting": "high-contrast",
    "isDevOnly": true,
    "file": "/broll-pool/dev_server_rack.jpg"
  },
  {
    "id": "dev_dual_screen",
    "domain": "logiciel_ingenierie",
    "title": "Code · Environnement dev",
    "keywords": [
      "code",
      "developpeur",
      "dev",
      "ide",
      "typescript",
      "react",
      "python"
    ],
    "lighting": "high-contrast",
    "isDevOnly": true,
    "file": "/broll-pool/dev_dual_screen.jpg"
  },
  {
    "id": "dev_mech_keyboard",
    "domain": "logiciel_ingenierie",
    "title": "Clavier · Ligne de commande",
    "keywords": [
      "cli",
      "terminal",
      "bash",
      "commande",
      "raccourci",
      "claude code"
    ],
    "lighting": "high-contrast",
    "isDevOnly": true,
    "file": "/broll-pool/dev_mech_keyboard.jpg"
  },
  {
    "id": "dev_cloud_aisle",
    "domain": "logiciel_ingenierie",
    "title": "Cloud · Montée en charge",
    "keywords": [
      "cloud",
      "api",
      "scalabilite",
      "latence",
      "quota",
      "token"
    ],
    "lighting": "high-contrast",
    "isDevOnly": true,
    "file": "/broll-pool/dev_cloud_aisle.jpg"
  },
  {
    "id": "dev_terminal_desk",
    "domain": "logiciel_ingenierie",
    "title": "Terminal · Déploiement live",
    "keywords": [
      "terminal",
      "git",
      "github",
      "deploiement",
      "build",
      "ci"
    ],
    "lighting": "high-contrast",
    "isDevOnly": true,
    "file": "/broll-pool/dev_terminal_desk.jpg"
  },
  {
    "id": "dev_circuit_board",
    "domain": "logiciel_ingenierie",
    "title": "Matériel · Architecture basse couche",
    "keywords": [
      "hardware",
      "sdk",
      "driver",
      "memoire",
      "performance"
    ],
    "lighting": "high-contrast",
    "isDevOnly": true,
    "file": "/broll-pool/dev_circuit_board.jpg"
  },
  {
    "id": "dev_security_lock",
    "domain": "logiciel_ingenierie",
    "title": "Sécurité · Faille & permissions",
    "keywords": [
      "faille",
      "securite",
      "token",
      "auth",
      "oauth",
      "mcp",
      "injection"
    ],
    "lighting": "high-contrast",
    "isDevOnly": true,
    "file": "/broll-pool/dev_security_lock.jpg"
  },
  {
    "id": "dev_cafe_coding",
    "domain": "logiciel_ingenierie",
    "title": "Indie · Développement solo",
    "keywords": [
      "saas",
      "indie",
      "solo",
      "mvp",
      "vibecoding",
      "cursor"
    ],
    "lighting": "bright",
    "isDevOnly": true,
    "file": "/broll-pool/dev_cafe_coding.jpg"
  },
  {
    "id": "dev_pair_coding",
    "domain": "logiciel_ingenierie",
    "title": "Revue · Qualité logicielle",
    "keywords": [
      "bug",
      "test",
      "revue",
      "refactoring",
      "architecture",
      "junior"
    ],
    "lighting": "bright",
    "isDevOnly": true,
    "file": "/broll-pool/dev_pair_coding.jpg"
  },
  {
    "id": "dev_architecture_board",
    "domain": "logiciel_ingenierie",
    "title": "Schéma · Flux API & MCP",
    "keywords": [
      "api",
      "mcp",
      "connecteur",
      "schema",
      "webhook",
      "endpoint"
    ],
    "lighting": "bright",
    "isDevOnly": true,
    "file": "/broll-pool/dev_architecture_board.jpg"
  },
  {
    "id": "dev_linux_monitor",
    "domain": "logiciel_ingenierie",
    "title": "Système · Logs & monitoring",
    "keywords": [
      "log",
      "monitoring",
      "debug",
      "erreur",
      "production",
      "docker"
    ],
    "lighting": "high-contrast",
    "isDevOnly": true,
    "file": "/broll-pool/dev_linux_monitor.jpg"
  },
  {
    "id": "crt_creator_desk",
    "domain": "synthese_creator",
    "title": "Studio · Chaîne d’analyse",
    "keywords": [
      "abonne",
      "chaine",
      "episode",
      "analyse",
      "decryptage",
      "suivre"
    ],
    "lighting": "bright",
    "file": "/broll-pool/crt_creator_desk.jpg"
  },
  {
    "id": "crt_condenser_mic",
    "domain": "synthese_creator",
    "title": "Micro · Narration directe",
    "keywords": [
      "micro",
      "voix",
      "episode",
      "cloche",
      "suite",
      "decryptage"
    ],
    "lighting": "bright",
    "file": "/broll-pool/crt_condenser_mic.jpg"
  },
  {
    "id": "crt_camera_tripod",
    "domain": "synthese_creator",
    "title": "Caméra · Prochain numéro",
    "keywords": [
      "camera",
      "tournage",
      "short",
      "video",
      "suivre"
    ],
    "lighting": "bright",
    "file": "/broll-pool/crt_camera_tripod.jpg"
  },
  {
    "id": "crt_audio_mixer",
    "domain": "synthese_creator",
    "title": "Mixage · Rendu final",
    "keywords": [
      "son",
      "mixage",
      "qualite",
      "production",
      "studio"
    ],
    "lighting": "high-contrast",
    "file": "/broll-pool/crt_audio_mixer.jpg"
  },
  {
    "id": "crt_softbox_light",
    "domain": "synthese_creator",
    "title": "Éclairage · Setup studio",
    "keywords": [
      "lumiere",
      "studio",
      "set",
      "image",
      "pro"
    ],
    "lighting": "bright",
    "file": "/broll-pool/crt_softbox_light.jpg"
  },
  {
    "id": "crt_timeline_edit",
    "domain": "synthese_creator",
    "title": "Montage · Rythme final",
    "keywords": [
      "montage",
      "cut",
      "rythme",
      "retrouver",
      "chaine"
    ],
    "lighting": "high-contrast",
    "file": "/broll-pool/crt_timeline_edit.jpg"
  },
  {
    "id": "crt_script_notebook",
    "domain": "synthese_creator",
    "title": "Script · Prochaine enquête",
    "keywords": [
      "script",
      "enquete",
      "sujet",
      "demain",
      "abonne"
    ],
    "lighting": "bright",
    "file": "/broll-pool/crt_script_notebook.jpg"
  },
  {
    "id": "crt_clapperboard",
    "domain": "synthese_creator",
    "title": "Action · Épisode suivant",
    "keywords": [
      "action",
      "suite",
      "episode",
      "cloche",
      "abonne"
    ],
    "lighting": "bright",
    "file": "/broll-pool/crt_clapperboard.jpg"
  },
  {
    "id": "crt_acoustic_wall",
    "domain": "synthese_creator",
    "title": "Acoustique · Voix pure",
    "keywords": [
      "studio",
      "voix",
      "audio",
      "clair",
      "net"
    ],
    "lighting": "high-contrast",
    "file": "/broll-pool/crt_acoustic_wall.jpg"
  },
  {
    "id": "crt_teleprompter",
    "domain": "synthese_creator",
    "title": "Régie · Production quotidienne",
    "keywords": [
      "regie",
      "direct",
      "analyse",
      "jour",
      "chaine"
    ],
    "lighting": "bright",
    "file": "/broll-pool/crt_teleprompter.jpg"
  },
  {
    "id": "crt_desk_lamp",
    "domain": "synthese_creator",
    "title": "Veille · Décryptage continu",
    "keywords": [
      "veille",
      "recherche",
      "decryptage",
      "suivre",
      "cloche"
    ],
    "lighting": "bright",
    "file": "/broll-pool/crt_desk_lamp.jpg"
  }
];
