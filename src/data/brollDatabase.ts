export type BrollFormat =
  | 'editorial_3d_vector'
  | 'macro_bright'
  | 'human_expressive'
  | 'kinetic_broll';

export type BrollCategory =
  | 'ai_agents'
  | 'tech_code'
  | 'finance_money'
  | 'work_career'
  | 'law_policy'
  | 'security_privacy'
  | 'mobile_attention'
  | 'productivity_time'
  | 'science_data'
  | 'hardware_retro'
  | 'business_saas'
  | 'creator_media'
  | 'economy_macro'
  | 'education_learning'
  | 'health_focus';

export interface BrollDatabaseEntry {
  id: string;
  format: BrollFormat;
  category: BrollCategory;
  subCategory: string;
  lighting: 'bright' | 'high-contrast';
  concrete_subject: string;
  metaphor_tags: string[];
  emotion: string;
  primaryIcon: string;
  secondaryIcon: string;
  palette: {
    bgTop: string;
    bgBottom: string;
    cardBg: string;
    accent: string;
    ink: string;
  };
  motionMode: 'zoom_pan' | 'float_orbit' | 'pulse_grid' | 'slide_reveal';
  caption: string;
}

interface PaletteSpec {
  bgTop: string;
  bgBottom: string;
  cardBg: string;
  accent: string;
  ink: string;
}

const PALETTES: PaletteSpec[] = [
  { bgTop: '#EFF6FF', bgBottom: '#DBEAFE', cardBg: '#FFFFFF', accent: '#2563EB', ink: '#0F172A' },
  { bgTop: '#FEF3C7', bgBottom: '#FDE68A', cardBg: '#FFFFFF', accent: '#D97706', ink: '#1C1917' },
  { bgTop: '#ECFDF5', bgBottom: '#D1FAE5', cardBg: '#FFFFFF', accent: '#059669', ink: '#064E3B' },
  { bgTop: '#FFF1F2', bgBottom: '#FFE4E6', cardBg: '#FFFFFF', accent: '#E11D48', ink: '#18181B' },
  { bgTop: '#F3E8FF', bgBottom: '#E9D5FF', cardBg: '#FFFFFF', accent: '#7C3AED', ink: '#1E1B4B' },
  { bgTop: '#F8FAFC', bgBottom: '#E2E8F0', cardBg: '#FFFFFF', accent: '#0284C7', ink: '#0F172A' },
  { bgTop: '#FFF7ED', bgBottom: '#FFEDD5', cardBg: '#FFFFFF', accent: '#EA580C', ink: '#1C1917' },
  { bgTop: '#F0FDF4', bgBottom: '#DCFCE7', cardBg: '#FFFFFF', accent: '#16A34A', ink: '#14532D' },
];

type RawTuple = [
  id: string,
  format: BrollFormat,
  category: BrollCategory,
  subCategory: string,
  lighting: 'bright' | 'high-contrast',
  concrete_subject: string,
  metaphor_tags: string[],
  emotion: string,
  primaryIcon: string,
  secondaryIcon: string,
  caption: string,
  paletteIdx: number,
  motionMode: BrollDatabaseEntry['motionMode'],
];

const RAW_ENTRIES: RawTuple[] = [
  // 1. AI AGENTS (15)
  ['ai_swarm_orchestration', 'editorial_3d_vector', 'ai_agents', 'swarm_mesh', 'bright', 'Essaim d’agents IA reliés en orbite lumineuse', ['agent', 'agents', 'autonome', 'multi-agent', 'orchestration', 'swarm', 'parallèle'], 'maîtrise', 'robot', 'connected', 'Essaim multi-agents actif', 0, 'float_orbit'],
  ['ai_night_shift_work', 'human_expressive', 'ai_agents', 'sleep_automation', 'high-contrast', 'Créateur endormi pendant que l’agent compile la nuit', ['dort', 'dorment', 'nuit', 'matin', 'automatique', '24h', 'continu'], 'soulagement', 'sleeping-face', 'laptop', 'Actif pendant le sommeil', 4, 'zoom_pan'],
  ['ai_hallucination_shield', 'kinetic_broll', 'ai_agents', 'truth_filter', 'bright', 'Bouclier bleu bloquant les réponses inventées', ['hallucination', 'erreur', 'faux', 'fiable', 'vérifié', 'filtre', 'ia'], 'alerte', 'shield', 'warning', 'Filtre anti-hallucination', 3, 'pulse_grid'],
  ['ai_refusal_wall', 'editorial_3d_vector', 'ai_agents', 'policy_block', 'high-contrast', 'Panneau stop rouge devant une requête chat', ['refus', 'censure', 'bridé', 'impossible', 'politique', 'sécurité', 'blocage'], 'choc', 'stop-sign', 'chat', 'Requête refusée par défaut', 3, 'slide_reveal'],
  ['ai_neural_chip_glow', 'macro_bright', 'ai_agents', 'inference_core', 'bright', 'Puce IA lumineuse en gros plan sur fond blanc cassé', ['modèle', 'llm', 'claude', 'gpt', 'deepseek', 'inférence', 'poids', 'neurones'], 'révélation', 'brain', 'sparkles', 'Cœur d’inférence rapide', 0, 'zoom_pan'],
  ['ai_prompt_magic_wand', 'editorial_3d_vector', 'ai_agents', 'prompt_craft', 'bright', 'Baguette créative transformant une note brute en action', ['prompt', 'instruction', 'skill', 'contexte', 'system', 'claude'], 'curiosité', 'magic-wand', 'script', 'Instruction calibrée', 4, 'float_orbit'],
  ['ai_local_vs_cloud_node', 'kinetic_broll', 'ai_agents', 'edge_inference', 'high-contrast', 'Serveur local déconnecté du nuage externe', ['local', 'offline', 'hors ligne', 'privé', 'cloud', 'open source', 'poids'], 'maîtrise', 'laptop', 'unlocked', 'Exécution locale sans cloud', 2, 'slide_reveal'],
  ['ai_human_in_loop_check', 'human_expressive', 'ai_agents', 'human_review', 'bright', 'Technologue validant une sortie IA à la loupe', ['relecture', 'humain', 'valider', 'relire', 'contrôle', 'erreur', 'audit'], 'vigilance', 'man-technologist', 'search', 'Contrôle humain ciblé', 5, 'zoom_pan'],
  ['ai_memory_context_stack', 'macro_bright', 'ai_agents', 'memory_window', 'bright', 'Classeurs de contexte empilés avec index fluo', ['mémoire', 'contexte', 'fenêtre', 'token', 'tokens', 'historique', 'rag'], 'clarté', 'books', 'pin', 'Mémoire contextuelle longue', 1, 'pulse_grid'],
  ['ai_tool_call_magnet', 'kinetic_broll', 'ai_agents', 'mcp_connector', 'bright', 'Aimant reliant l’agent aux API externes', ['mcp', 'outil', 'connecteur', 'api', 'plugin', 'intégration'], 'dynamisme', 'magnet', 'link', 'Connexion directe aux outils', 0, 'float_orbit'],
  ['ai_speed_multiplier_x10', 'editorial_3d_vector', 'ai_agents', 'velocity_boost', 'high-contrast', 'Fusée bleue propulsant un flux de travail', ['10x', 'vitesse', 'rapide', 'productivité', 'explose', 'levier'], 'enthousiasme', 'rocket', 'bolt', 'Vélocité démultipliée', 6, 'zoom_pan'],
  ['ai_cost_token_meter', 'macro_bright', 'ai_agents', 'token_budget', 'bright', 'Compteur de facture API qui chauffe en rouge', ['coût', 'api', 'facture', 'token', 'budget', 'prix', 'cher'], 'alerte', 'money-with-wings', 'timer', 'Compteur de coût API', 3, 'pulse_grid'],
  ['ai_mindblown_insight', 'human_expressive', 'ai_agents', 'aha_moment', 'high-contrast', 'Visage stupéfait devant une démonstration IA', ['incroyable', 'choc', 'personne', 'secret', 'cache', 'bascule'], 'choc', 'exploding-head', 'bulb', 'Déclic immédiat', 1, 'zoom_pan'],
  ['ai_abliteration_surgery', 'kinetic_broll', 'ai_agents', 'weight_pruning', 'bright', 'Microscope ciblant un nœud neuronal précis', ['couche', 'poids', 'abliteration', 'vecteur', 'matrice', 'neurone'], 'précision', 'microscope', 'compass', 'Ciblage d’une seule couche', 4, 'slide_reveal'],
  ['ai_assistant_desk_duo', 'human_expressive', 'ai_agents', 'copilot_duo', 'bright', 'Humain et robot alignés sur le même objectif', ['copilote', 'binôme', 'équipe', 'assistant', 'senior', 'collab'], 'confiance', 'handshake', 'robot', 'Binôme humain + agent', 2, 'float_orbit'],

  // 2. TECH CODE (15)
  ['code_terminal_cursor_click', 'macro_bright', 'tech_code', 'cli_command', 'high-contrast', 'Curseur vif cliquant une commande slash CLI', ['cli', 'terminal', 'commande', 'slash', '/effort', 'bash', 'shell'], 'action', 'cursor', 'code', 'Commande CLI instantanée', 5, 'zoom_pan'],
  ['code_git_rocket_stars', 'kinetic_broll', 'tech_code', 'open_source_boom', 'bright', 'Étoiles dorées propulsées sur un dépôt ouvert', ['github', 'repo', 'open source', 'stars', 'étoiles', 'commit', 'code'], 'triomphe', 'star', 'rocket', 'Croissance open source', 1, 'float_orbit'],
  ['code_diff_clean_merge', 'editorial_3d_vector', 'tech_code', 'diff_patch', 'bright', 'Ciseaux taillant les lignes superflues d’un script', ['diff', 'patch', 'refactor', 'propre', 'bug', 'debug', 'ligne'], 'précision', 'scissors', 'check', 'Diff propre et vérifié', 2, 'slide_reveal'],
  ['code_api_cable_plug', 'macro_bright', 'tech_code', 'sdk_bridge', 'bright', 'Prise physique connectée sans latence à un serveur', ['api', 'sdk', 'json', 'endpoint', 'webhook', 'serveur', 'mcp'], 'connexion', 'connected', 'server', 'Connexion API directe', 0, 'zoom_pan'],
  ['code_toolbox_arsenal', 'editorial_3d_vector', 'tech_code', 'dev_stack', 'high-contrast', 'Caisse à outils métallique ouverte avec engrenages', ['outil', 'outils', 'stack', 'framework', 'extension', 'plugin'], 'puissance', 'toolbox', 'wrench', 'Boîte à outils complète', 6, 'float_orbit'],
  ['code_bug_squashed_wrench', 'kinetic_broll', 'tech_code', 'bug_fix', 'bright', 'Clé mécanique verrouillant une alerte rouge', ['bug', 'erreur', 'crash', 'test', 'fix', 'corrigé', 'ci'], 'soulagement', 'hammer-and-wrench', 'check', 'Correctif validé en CI', 2, 'pulse_grid'],
  ['code_pixel_clone_compare', 'macro_bright', 'tech_code', 'pixel_parity', 'bright', 'Loupe vérifiant l’alignement pixel par pixel', ['pixel', 'clone', 'copie', 'ui', 'design', 'interface', 'rendu'], 'minutie', 'search', 'copy', 'Parité visuelle 99 %', 0, 'zoom_pan'],
  ['code_heatmap_green_streak', 'kinetic_broll', 'tech_code', 'commit_streak', 'bright', 'Calendrier vert rempli de validations quotidiennes', ['streak', 'commits', 'heatmap', 'quotidien', 'régularité', 'activité'], 'discipline', 'calendar', 'hundred-points', 'Série de commits verts', 7, 'pulse_grid'],
  ['code_file_config_json', 'editorial_3d_vector', 'tech_code', 'config_file', 'bright', 'Dossier technique avec étiquette JSON claire', ['fichier', 'json', 'config', 'skill.md', '.claude', 'dossier'], 'organisation', 'file', 'folder', 'Fichier de config ciblé', 5, 'slide_reveal'],
  ['code_dev_late_focus', 'human_expressive', 'tech_code', 'deep_coding', 'high-contrast', 'Développeur concentré devant un prototype net', ['dev', 'développeur', 'programmeur', 'coder', 'application', 'app'], 'concentration', 'man-technologist', 'fire', 'Build rapide en direct', 6, 'zoom_pan'],
  ['code_split_preview_window', 'editorial_3d_vector', 'tech_code', 'live_preview', 'bright', 'Double écran code à gauche et aperçu vivant à droite', ['preview', 'aperçu', 'react', 'frontend', 'html', 'composant'], 'clarté', 'laptop', 'sparkles', 'Aperçu en temps réel', 0, 'slide_reveal'],
  ['code_security_sandbox_lock', 'macro_bright', 'tech_code', 'env_isolation', 'high-contrast', 'Clé ancienne verrouillant les variables secrètes', ['env', 'clé', 'secret', 'token', 'sandbox', 'permission'], 'protection', 'old-key', 'locked', 'Clés isolées proprement', 3, 'pulse_grid'],
  ['code_deploy_cloud_upload', 'kinetic_broll', 'tech_code', 'ship_prod', 'bright', 'Flèche d’envoi rapide vers la production', ['deploy', 'déploiement', 'prod', 'production', 'serveur', 'live'], 'élan', 'upload', 'rocket', 'Mise en ligne immédiate', 2, 'float_orbit'],
  ['code_monocle_audit', 'human_expressive', 'tech_code', 'code_audit', 'bright', 'Inspecteur au monocle vérifiant chaque ligne', ['audit', 'revue', 'qualité', 'vérifier', 'linter', 'type'], 'rigueur', 'face-with-monocle', 'ruler', 'Audit technique strict', 1, 'zoom_pan'],
  ['code_gear_pipeline', 'kinetic_broll', 'tech_code', 'automation_flow', 'bright', 'Engrenages synchronisés sans friction manuelle', ['pipeline', 'workflow', 'automatisation', 'build', 'script'], 'fluidité', 'gear', 'repeat', 'Chaîne automatisée fluide', 5, 'float_orbit'],

  // 3. FINANCE MONEY (15)
  ['fin_overflow_invoice_2000', 'editorial_3d_vector', 'finance_money', 'heavy_bill', 'high-contrast', 'Facture salée entourée de billets qui s’envolent', ['2000', '1000', 'facture', 'abonnement', 'payer', 'cher', 'prix', 'coût', '$', '€'], 'choc', 'money-with-wings', 'warning', 'Facture mensuelle lourde', 3, 'zoom_pan'],
  ['fin_bank_overdraft_clamp', 'macro_bright', 'finance_money', 'overdraft_rule', 'bright', 'Banque institutionnelle avec verrou et balance', ['banque', 'découvert', 'agios', 'crédit', 'novembre', 'solvabilité'], 'alerte', 'bank', 'locked', 'Découvert bancaire encadré', 0, 'slide_reveal'],
  ['fin_savings_vault_grow', 'editorial_3d_vector', 'finance_money', 'net_savings', 'bright', 'Sac d’épargne protégé en hausse régulière', ['économies', 'économiser', 'épargne', 'livret', 'argent', 'marge', 'gain'], 'soulagement', 'money-bag', 'chart-increasing', 'Épargne protégée en hausse', 2, 'float_orbit'],
  ['fin_card_paywall_trap', 'macro_bright', 'finance_money', 'subscription_bleed', 'high-contrast', 'Carte bancaire bloquée devant un mur payant', ['carte', 'abonnement', 'payant', 'gratuit', 'saas', 'mensuel', 'frais'], 'tension', 'credit-card', 'prohibited', 'Piège des abonnements', 3, 'pulse_grid'],
  ['fin_coin_stack_compound', 'kinetic_broll', 'finance_money', 'compound_growth', 'bright', 'Pièces d’or empilées formant une courbe montante', ['intérêts', 'rendement', 'etf', 'euro', 'euros', 'capital', 'patrimoine'], 'optimisme', 'coin', 'chart-increasing-with-yen', 'Croissance composée nette', 1, 'zoom_pan'],
  ['fin_cash_burn_scissors', 'editorial_3d_vector', 'finance_money', 'cost_cutting', 'bright', 'Ciseaux coupant net une dépense récurrente', ['diviser', 'réduire', 'couper', 'gratuit', 'zéro euro', 'moins cher'], 'victoire', 'scissors', 'dollar-banknote', 'Dépense coupée net', 2, 'slide_reveal'],
  ['fin_daily_rate_13_usd', 'macro_bright', 'finance_money', 'micro_pricing', 'bright', 'Billet et chronomètre affichant un coût journalier', ['13 $/j', '$/j', 'par jour', 'tarif', 'budget', 'forfait'], 'révélation', 'dollar-banknote', 'stopwatch', 'Coût mesuré à la journée', 1, 'pulse_grid'],
  ['fin_roi_scale_balance', 'kinetic_broll', 'finance_money', 'roi_audit', 'bright', 'Balance comparant coût réel et gain comptable', ['roi', 'rentable', 'comptable', 'bilan', 'bénéfice', 'calcul'], 'analyse', 'balance-scale', 'bar-chart', 'Coût réel vs Gain net', 5, 'zoom_pan'],
  ['fin_freelance_underprice', 'human_expressive', 'finance_money', 'freelance_margin', 'high-contrast', 'Indépendant réalisant l’écart sur son devis', ['freelance', 'devis', 'facturer', 'tjm', 'client', 'marge'], 'surprise', 'thinking-face', 'briefcase', 'Marge cachée retrouvée', 6, 'float_orbit'],
  ['fin_inflation_squeeze', 'editorial_3d_vector', 'finance_money', 'inflation_drop', 'high-contrast', 'Graphique rouge montrant la perte de pouvoir d’achat', ['inflation', 'pouvoir d’achat', 'impôt', 'taxe', 'salaire', 'smic'], 'urgence', 'chart-decreasing', 'coin', 'Érosion du pouvoir d’achat', 3, 'zoom_pan'],
  ['fin_refund_cashback', 'kinetic_broll', 'finance_money', 'fee_refund', 'bright', 'Flèche retour vert émeraude sur frais bancaires', ['remboursement', 'économie', 'commission', 'frais', 'banque'], 'satisfaction', 'refund', 'check', 'Frais récupérés', 7, 'slide_reveal'],
  ['fin_coupon_discount_tag', 'macro_bright', 'finance_money', 'price_drop', 'bright', 'Étiquette tarifaire divisée par deux sur fond clair', ['gratuit', 'promo', 'prix', 'divisé', 'moins cher', 'accessible'], 'opportunité', 'coupon', 'sparkles', 'Tarif divisé net', 1, 'float_orbit'],
  ['fin_budget_cart_audit', 'editorial_3d_vector', 'finance_money', 'expense_audit', 'bright', 'Panier trié avec étiquette de priorité claire', ['dépenses', 'panier', 'achat', 'consommation', 'budget'], 'contrôle', 'shopping-cart', 'tag', 'Tri des postes clés', 5, 'pulse_grid'],
  ['fin_shocked_tax_shock', 'human_expressive', 'finance_money', 'tax_surprise', 'high-contrast', 'Visage choqué face à une ligne de prélèvement', ['fiche de paie', 'prélèvement', 'cotisation', 'charge', 'net'], 'choc', 'face-screaming-in-fear', 'memo', 'Impact sur le net', 3, 'zoom_pan'],
  ['fin_bullseye_profit', 'kinetic_broll', 'finance_money', 'margin_target', 'bright', 'Flèche en plein cœur de l’objectif de marge', ['objectif', 'cible', 'rentabilité', 'profit', 'résultat'], 'assurance', 'bullseye', 'trophy', 'Cible de marge atteinte', 2, 'float_orbit'],

  // 4. WORK CAREER (15)
  ['work_junior_cv_blocked', 'editorial_3d_vector', 'work_career', 'junior_hiring_freeze', 'high-contrast', 'Pile de CV tamponnée par un verrou rouge', ['junior', 'juniors', '-28 %', 'embauche', 'cv', 'diplômé', 'cdi', 'entretien'], 'choc', 'file', 'prohibited', 'Recrutement juniors bloqué', 3, 'zoom_pan'],
  ['work_senior_2x_leverage', 'human_expressive', 'work_career', 'senior_output', 'bright', 'Profil senior produisant double avec levier IA', ['senior', 'seniors', '2x', 'expérience', 'salaire', 'productif'], 'puissance', 'flexed-biceps', 'bolt', 'Levier senior ×2', 0, 'float_orbit'],
  ['work_async_memo_replace', 'kinetic_broll', 'work_career', 'async_shift', 'bright', 'Note structurée remplaçant six agendas bloqués', ['réunion', 'réunions', 'meeting', 'visio', 'async', 'résumé', 'agenda'], 'soulagement', 'memo', 'check', 'Note async de 90 s', 2, 'slide_reveal'],
  ['work_portfolio_proof_trophy', 'editorial_3d_vector', 'work_career', 'proof_of_work', 'bright', 'Trophée brillant posé sur un projet réel déployé', ['projet', 'preuve', 'portfolio', 'client', 'démo', 'recruter'], 'ambition', 'trophy', 'rocket', 'Preuve terrain vérifiable', 1, 'zoom_pan'],
  ['work_team_alignment_circle', 'human_expressive', 'work_career', 'team_sync', 'bright', 'Équipe alignée sans réunions de statut inutiles', ['équipe', 'équipes', 'collab', 'entreprise', 'pme', 'management'], 'cohésion', 'users', 'handshake', 'Équipe alignée sans friction', 0, 'float_orbit'],
  ['work_career_ladder_climb', 'kinetic_broll', 'work_career', 'skill_upgrade', 'bright', 'Courbe ascendante de compétences recherchées', ['carrière', 'compétence', 'métier', 'métiers', 'avenir', 'marché'], 'progression', 'chart-increasing', 'briefcase', 'Compétences recherchées', 2, 'pulse_grid'],
  ['work_burnout_low_battery', 'human_expressive', 'work_career', 'meeting_fatigue', 'high-contrast', 'Batterie faible rouge après six heures de visio', ['fatigue', 'épuisement', 'matinée', 'charge', 'subir'], 'alerte', 'low-battery', 'yawning-face', 'Surcharge de réunions', 3, 'zoom_pan'],
  ['work_graduate_shift_cap', 'editorial_3d_vector', 'work_career', 'campus_gap', 'bright', 'Chapeau diplômé face aux nouvelles attentes 2026', ['école', 'étudiant', 'diplôme', 'premier emploi', 'stage'], 'lucidité', 'graduation-cap', 'compass', 'Écart école vs terrain', 4, 'slide_reveal'],
  ['work_inbox_zero_clean', 'macro_bright', 'work_career', 'clean_inbox', 'bright', 'Boîte de réception vidée par un balai net', ['mail', 'email', 'message', 'slack', 'notif', 'trier'], 'légèreté', 'inbox-tray', 'broom', 'Boîte triée net', 5, 'float_orbit'],
  ['work_contract_signature', 'macro_bright', 'work_career', 'offer_signed', 'bright', 'Stylo posé sur une proposition d’embauche claire', ['contrat', 'offre', 'poste', 'recrutement', 'signer'], 'accomplissement', 'writing-hand', '1st-place-medal', 'Offre décrochée', 1, 'zoom_pan'],
  ['work_office_automation', 'editorial_3d_vector', 'work_career', 'office_ai', 'bright', 'Immeuble de bureaux connecté à des flux fluides', ['entreprise', 'entreprises', 'bureau', 'process', 'dossier'], 'efficacité', 'office-building', 'gear', 'Circuits internes simplifiés', 0, 'pulse_grid'],
  ['work_sprint_runner', 'human_expressive', 'work_career', 'fast_execution', 'bright', 'Coureur en plein élan devant un chrono vert', ['livrer', 'exécution', 'vite', 'sprint', 'semaine', 'action'], 'énergie', 'person-running', 'stopwatch', 'Exécution rapide cette semaine', 7, 'slide_reveal'],
  ['work_no_gesture_reject', 'human_expressive', 'work_career', 'reject_busywork', 'high-contrast', 'Personne refusant les tâches répétitives sans impact', ['inutile', 'répétitif', 'stop', 'refuser', 'bruit'], 'fermeté', 'person-gesturing-no', 'wastebasket', 'Zéro tâche inutile', 6, 'zoom_pan'],
  ['work_factory_scale', 'editorial_3d_vector', 'work_career', 'production_scale', 'bright', 'Usine propre produisant à grande cadence', ['production', 'échelle', 'volume', 'industriel', 'masse'], 'cadence', 'factory', 'chart-increasing', 'Passage à l’échelle', 5, 'float_orbit'],
  ['work_diploma_to_code', 'kinetic_broll', 'work_career', 'practical_shift', 'bright', 'Livre remplacé par un écran de preuve concrète', ['théorie', 'pratique', 'concret', 'réel', 'terrain'], 'pragmatisme', 'books', 'laptop', 'Du théorique au concret', 4, 'slide_reveal'],

  // 5. LAW POLICY (15)
  ['law_parliament_vote_scale', 'editorial_3d_vector', 'law_policy', 'legislation_vote', 'bright', 'Balance de justice dorée devant l’assemblée', ['loi', 'lois', 'parlement', 'décret', 'vote', 'voté', 'règle', 'règles'], 'solennité', 'balance-scale', 'classical-building', 'Nouveau cadre voté', 0, 'zoom_pan'],
  ['law_age_token_verified', 'macro_bright', 'law_policy', 'age_verification', 'bright', 'Bouclier de vérification anonyme sans carte d’identité', ['15 ans', 'âge', 'mineur', 'mineurs', 'contrôle', 'vérification', 'jeton'], 'sécurité', 'shield', 'check', 'Jeton d’âge anonyme', 2, 'slide_reveal'],
  ['law_eu_map_regulation', 'editorial_3d_vector', 'law_policy', 'eu_directive', 'bright', 'Carte de France et d’Europe avec zones surlignées', ['france', 'europe', 'européen', 'ue', 'bruxelles', 'pays'], 'portée', 'world-map', 'flag' in {} ? 'pin' : 'pin', 'Cadre appliqué en Europe', 0, 'float_orbit'],
  ['law_ban_prohibited_seal', 'kinetic_broll', 'law_policy', 'strict_ban', 'high-contrast', 'Tampon d’interdiction rouge vif sur fond clair', ['interdire', 'interdiction', 'interdit', 'bloquer', 'censure', 'verrou'], 'impact', 'no-entry', 'warning', 'Accès verrouillé par décret', 3, 'pulse_grid'],
  ['law_sanction_gavel_alert', 'macro_bright', 'law_policy', 'platform_fine', 'high-contrast', 'Marteau et gyrophare sur amende plateforme', ['amende', 'sanction', 'sanctions', 'plateforme', 'tribunal'], 'fermeté', 'hammer', 'police-car-light', 'Sanctions financières directes', 3, 'zoom_pan'],
  ['law_official_journal_clip', 'macro_bright', 'law_policy', 'official_gazette', 'bright', 'Journal officiel posé sous une loupe claire', ['texte', 'officiel', 'article', 'rapport', 'service public'], 'crédibilité', 'newspaper', 'search', 'Texte officiel publié', 5, 'slide_reveal'],
  ['law_ballot_public_debate', 'editorial_3d_vector', 'law_policy', 'public_vote', 'bright', 'Urne démocratique lumineuse au centre de l’écran', ['débat', 'public', 'citoyen', 'élection', 'politique'], 'intérêt', 'ballot-box-with-ballot', 'users', 'Débat public tranché', 0, 'float_orbit'],
  ['law_contract_transparency', 'kinetic_broll', 'law_policy', 'clear_terms', 'bright', 'Contrat déroulé avec clauses surlignées en jaune', ['transparence', 'affiché', 'écrit', 'clause', 'taeg', 'mention'], 'clarté', 'script', 'bulb', 'Mentions claires obligatoires', 1, 'zoom_pan'],
  ['law_calendar_deadline_nov', 'macro_bright', 'law_policy', 'effective_date', 'high-contrast', 'Calendrier cerclé sur la date d’entrée en vigueur', ['novembre', 'janvier', '2026', 'date', 'échéance', 'dès le'], 'urgence', 'calendar', 'bell', 'Date d’effet immédiate', 6, 'pulse_grid'],
  ['law_bypass_door_open', 'editorial_3d_vector', 'law_policy', 'loophole_door', 'high-contrast', 'Porte entrouverte contournant une barrière', ['contourner', 'contournement', 'vpn', 'faille', 'angle mort'], 'suspicion', 'door', 'unlocked', 'Faille de contournement', 4, 'slide_reveal'],
  ['law_privacy_zero_storage', 'kinetic_broll', 'law_policy', 'data_minimization', 'bright', 'Poubelle nette détruisant les pièces stockées', ['vie privée', 'anonymat', 'rgpd', 'données', 'identifiant'], 'confiance', 'wastebasket', 'shield', 'Zéro donnée stockée', 2, 'float_orbit'],
  ['law_housing_dpe_drop', 'editorial_3d_vector', 'law_policy', 'property_rule', 'bright', 'Maison avec étiquette énergétique baissant', ['dpe', 'logement', 'loyer', 'immobilier', 'classe', 'maison'], 'alerte', 'house', 'chart-decreasing', 'Impact règles logement', 6, 'zoom_pan'],
  ['law_detective_investigation', 'human_expressive', 'law_policy', 'compliance_audit', 'bright', 'Enquêteur inspectant un angle mort réglementaire', ['enquête', 'audit', 'angle mort', 'vérification', 'preuve'], 'curiosité', 'detective', 'microscope', 'Enquête réglementaire', 5, 'float_orbit'],
  ['law_megaphone_announcement', 'kinetic_broll', 'law_policy', 'minister_announce', 'high-contrast', 'Mégaphone diffusant une réforme majeure', ['annonce', 'réforme', 'nouvelle', 'gouvernement', 'état'], 'attention', 'megaphone', 'double-exclamation-mark', 'Annonce officielle forte', 1, 'pulse_grid'],
  ['law_locked_compliance', 'macro_bright', 'law_policy', 'strict_enforcement', 'bright', 'Serrure verrouillée sur un bâtiment officiel', ['appliqué', 'strict', 'obligatoire', 'contrainte', 'norme'], 'solidité', 'locked', 'classical-building', 'Norme rendue obligatoire', 0, 'zoom_pan'],

  // 6. SECURITY PRIVACY (15)
  ['sec_vault_slam_confidential', 'editorial_3d_vector', 'security_privacy', 'vault_lock', 'high-contrast', 'Coffre-fort blindé claqué sur données sensibles', ['confidentiel', 'secret', 'coffre', 'privé', 'sécurité', 'protéger'], 'tension', 'locked', 'shield', 'Coffre verrouillé net', 5, 'zoom_pan'],
  ['sec_shattered_lock_breach', 'kinetic_broll', 'security_privacy', 'lock_broken', 'high-contrast', 'Cadenas ouvert après une faille explosive', ['exploser', 'explosé', 'faille', 'piratage', 'contournement', 'brisé'], 'choc', 'unlocked', 'collision', 'Verrou contourné en direct', 3, 'pulse_grid'],
  ['sec_key_rotation_badge', 'macro_bright', 'security_privacy', 'auth_keys', 'bright', 'Clé dorée remplaçant un vieux mot de passe', ['clé', 'mot de passe', 'accès', 'jeton', 'auth', 'ssh'], 'confiance', 'key', 'check', 'Clé d’accès sécurisée', 2, 'float_orbit'],
  ['sec_cloud_lightning_risk', 'editorial_3d_vector', 'security_privacy', 'cloud_exposure', 'high-contrast', 'Nuage orageux menaçant des fichiers externes', ['cloud', 'fuite', 'serveur', 'externe', 'risque', 'danger'], 'alerte', 'cloud-with-lightning-and-rain', 'warning', 'Risque d’exposition cloud', 3, 'slide_reveal'],
  ['sec_offline_island_safe', 'kinetic_broll', 'security_privacy', 'airgap_safe', 'bright', 'Zone isolée hors réseau sous dôme protecteur', ['hors ligne', 'offline', 'local', 'isolé', 'sûr', 'zéro fuite'], 'sérénité', 'desert-island', 'shield', 'Isolation hors ligne totale', 2, 'float_orbit'],
  ['sec_phishing_hook_trap', 'editorial_3d_vector', 'security_privacy', 'social_engineering', 'high-contrast', 'Hameçon numérique face à un utilisateur attentif', ['piège', 'arnaque', 'fraude', 'phishing', 'hameçon'], 'vigilance', 'hook', 'e-mail', 'Détection du piège', 6, 'zoom_pan'],
  ['sec_zipper_mouth_nda', 'human_expressive', 'security_privacy', 'nda_silence', 'bright', 'Bouche zippée sur une clause de confidentialité', ['silence', 'discret', 'caché', 'confidentiel', 'secret'], 'mystère', 'zipper-mouth-face', 'file-cabinet', 'Données sous scellé', 4, 'slide_reveal'],
  ['sec_warning_beacon_red', 'kinetic_broll', 'security_privacy', 'incident_alarm', 'high-contrast', 'Gyrophare d’incident clignotant sur fond clair', ['alerte', 'incident', 'urgence', 'critique', 'piraté'], 'alarme', 'police-car-light', 'red-exclamation-mark', 'Alerte sécurité critique', 3, 'pulse_grid'],
  ['sec_server_rack_shield', 'macro_bright', 'security_privacy', 'infra_hardening', 'bright', 'Baie serveur entourée d’un bouclier émeraude', ['serveur', 'base', 'infrastructure', 'pare-feu', 'sauvegarde'], 'fiabilité', 'server', 'shield', 'Infrastructure blindée', 0, 'zoom_pan'],
  ['sec_disguised_fake_id', 'human_expressive', 'security_privacy', 'fake_identity', 'high-contrast', 'Visage déguisé contournant un faux contrôle', ['faux', 'masque', 'usurpation', 'compte', 'triche'], 'méfiance', 'disguised-face', 'prohibited', 'Faux profils détectés', 4, 'float_orbit'],
  ['sec_bomb_zero_day', 'kinetic_broll', 'security_privacy', 'exploit_risk', 'high-contrast', 'Mèche allumée neutralisée avant l’explosion', ['vulnérabilité', 'bombe', 'patch', 'urgence', 'bloque'], 'tension', 'bomb', 'fire-extinguisher', 'Faille neutralisée à temps', 3, 'slide_reveal'],
  ['sec_eye_tracking_watch', 'macro_bright', 'security_privacy', 'privacy_tracking', 'bright', 'Œil géant scrutant les traceurs publicitaires', ['traceur', 'surveillance', 'pistage', 'cookies', 'pub'], 'conscience', 'eye', 'no-entry', 'Pistage bloqué net', 0, 'pulse_grid'],
  ['sec_chain_unbroken', 'editorial_3d_vector', 'security_privacy', 'encryption_chain', 'bright', 'Maillons cryptographiques soudés en bleu clair', ['chiffrement', 'crypté', 'hash', 'chaîne', 'intégrité'], 'solidité', 'chains', 'locked', 'Chaîne chiffrée intacte', 5, 'float_orbit'],
  ['sec_tomb_dead_password', 'editorial_3d_vector', 'security_privacy', 'legacy_auth', 'bright', 'Ancien mot de passe enterré au profit de biométrie', ['obsolète', 'ancien', 'passkey', 'terminé'], 'transition', 'tomb', 'key', 'Fin des mots de passe faibles', 5, 'zoom_pan'],
  ['sec_shushing_whisper', 'human_expressive', 'security_privacy', 'private_prompt', 'bright', 'Doigt sur les lèvres pour données privées', ['privé', 'personnel', 'intime', 'données'], 'discrétion', 'shushing-face', 'locked', 'Confidentialité garantie', 4, 'slide_reveal'],

  // 7. MOBILE ATTENTION (15)
  ['mob_doomscroll_loop', 'human_expressive', 'mobile_attention', 'infinite_scroll', 'high-contrast', 'Smartphone lumineux aspirant l’attention nocturne', ['scroll', 'feed', 'réseau', 'réseaux', 'tiktok', 'instagram', 'reels'], 'captivité', 'phone', 'repeat', 'Boucle de scroll infini', 4, 'zoom_pan'],
  ['mob_08s_skip_thumb', 'kinetic_broll', 'mobile_attention', 'instant_skip', 'high-contrast', 'Pouce vers le bas rejetant une vidéo lisse en 0,8 s', ['0,8 s', 'skip', 'ennui', 'ennuient', 'lisse', 'faux', 'zapper'], 'rejet', 'thumbs-down', 'stopwatch', 'Zappé en 0,8 seconde', 3, 'slide_reveal'],
  ['mob_bell_muted_focus', 'editorial_3d_vector', 'mobile_attention', 'notif_off', 'bright', 'Cloche barrée ramenant le calme sur le bureau', ['notification', 'notifications', 'alerte', 'bruit', 'couper'], 'calme', 'bell-with-slash', 'sparkles', 'Notifications coupées net', 2, 'float_orbit'],
  ['mob_screen_time_bars', 'macro_bright', 'mobile_attention', 'daily_hours', 'high-contrast', 'Histogramme comparant 3 h 15 contre 45 min d’écran', ['écran', 'écrans', 'temps', 'heures', 'minutes', 'ado', 'jeunes'], 'constat', 'bar-chart', 'phone', 'Temps d’écran divisé', 0, 'pulse_grid'],
  ['mob_magnet_algorithm', 'kinetic_broll', 'mobile_attention', 'algo_hook', 'high-contrast', 'Aimant capturant les regards sur le fil social', ['algorithme', 'algo', 'rétention', 'attention', 'vues', 'viral'], 'attraction', 'magnet', 'eye', 'Aimant algorithmique', 4, 'zoom_pan'],
  ['mob_yawning_cloned_feed', 'human_expressive', 'mobile_attention', 'ai_slop_fatigue', 'bright', 'Visage lassé face à des vidéos identiques', ['fatigue', 'cloné', 'générique', 'pareil', 'saturé'], 'lassitude', 'yawning-face', 'film', 'Fatigue du contenu cloné', 5, 'slide_reveal'],
  ['mob_save_bookmark_star', 'editorial_3d_vector', 'mobile_attention', 'high_saves', 'bright', 'Signet et étoile dorée sur un post utile', ['enregistre', 'sauvegarde', 'partage', 'utile', 'revoir'], 'valeur', 'bookmark', 'star', 'Taux d’enregistrement ×3', 1, 'float_orbit'],
  ['mob_bell_ring_active', 'kinetic_broll', 'mobile_attention', 'sub_bell', 'bright', 'Cloche vibrante prête pour les prochains épisodes', ['cloche', 'abonne', 'abonne-toi', 'suivre', 'épisode'], 'appel', 'bell', 'partying-face', 'Cloche activée', 0, 'pulse_grid'],
  ['mob_eye_roll_cliche', 'human_expressive', 'mobile_attention', 'cliche_detector', 'bright', 'Yeux levés au ciel devant une intro générique', ['bonjour', 'blabla', 'cliché', 'intro', 'arnaque'], 'agacement', 'face-with-rolling-eyes', 'wastebasket', 'Zéro intro inutile', 6, 'zoom_pan'],
  ['mob_play_button_snap', 'macro_bright', 'mobile_attention', 'hook_frame_0', 'high-contrast', 'Bouton play géant déclenché dès la frame 0', ['frame', 'début', 'hook', 'accroche', 'seconde'], 'impact', 'play', 'bolt', 'Accroche immédiate', 0, 'slide_reveal'],
  ['mob_slot_machine_dopamine', 'editorial_3d_vector', 'mobile_attention', 'variable_reward', 'high-contrast', 'Machine à sous illustrant le feed infini', ['dopamine', 'addiction', 'casino', 'aléatoire', 'piège'], 'avertissement', 'slot-machine', 'phone', 'Mécanique de dopamine', 3, 'float_orbit'],
  ['mob_boomerang_retention', 'kinetic_broll', 'mobile_attention', 'loop_return', 'bright', 'Boomerang revenant parfaitement à la phrase 1', ['boucle', 'loop', 'replay', 'rewatch', 'fin'], 'ingéniosité', 'boomerang', 'repeat', 'Boucle de fin parfaite', 2, 'zoom_pan'],
  ['mob_fire_viral_spike', 'macro_bright', 'mobile_attention', 'outlier_reach', 'high-contrast', 'Flamme vive décollant au-dessus du lot', ['viral', 'explosion', 'millions', 'portée', 'pic'], 'excitation', 'fire', 'chart-increasing', 'Pic de portée organique', 6, 'pulse_grid'],
  ['mob_rolling_laugh_human', 'human_expressive', 'mobile_attention', 'authentic_tone', 'bright', 'Réaction humaine authentique et spontanée', ['humain', 'naturel', 'vrai', 'sincère', 'brut'], 'chaleur', 'rolling-on-the-floor-laughing', 'heart', 'Format humain incarné', 1, 'float_orbit'],
  ['mob_tornado_noise_filter', 'kinetic_broll', 'mobile_attention', 'cut_the_noise', 'bright', 'Tourbillon d’infos trié en un point clair', ['bruit', 'flux', 'flot', 'trier', 'clair'], 'clarté', 'tornado', 'bullseye', 'Du bruit vers le signal', 5, 'slide_reveal'],

  // 8. PRODUCTIVITY TIME (15)
  ['prod_5min_rule_timer', 'macro_bright', 'productivity_time', 'five_min_sprint', 'bright', 'Minuteur calé exactement sur cinq minutes nettes', ['5 minutes', 'cinq minutes', 'règle', 'matin', 'procrastination', 'bloc'], 'élan', 'timer', 'fire', 'Bloc net de 5 minutes', 6, 'zoom_pan'],
  ['prod_stopwatch_2x_speed', 'kinetic_broll', 'productivity_time', 'speed_110x', 'high-contrast', 'Double chronomètre accéléré sur fond papier clair', ['vitesse', 'chrono', 'seconde', 'secondes', 'rapide', 'temps', '1,10x'], 'rythme', 'stopwatch', 'bolt', 'Cadence sans temps mort', 0, 'pulse_grid'],
  ['prod_hourglass_drain', 'editorial_3d_vector', 'productivity_time', 'time_wasted', 'bright', 'Sablier s’écoulant vite pendant les réunions', ['perdu', 'heures', 'sablier', 'gaspillé', 'retard', 'tard'], 'urgence', 'hourglass', 'warning', 'Temps récupéré avant perte', 1, 'float_orbit'],
  ['prod_calendar_purge_clean', 'macro_bright', 'productivity_time', 'calendar_clear', 'bright', 'Agenda allégé avec plages de travail profond', ['agenda', 'semaine', 'lundi', 'planifier', 'créneau', '14 h', '3 h'], 'respiration', 'calendar', 'check', 'Agenda libéré net', 2, 'slide_reveal'],
  ['prod_sunrise_morning_block', 'editorial_3d_vector', 'productivity_time', 'morning_focus', 'bright', 'Soleil levant sur une matinée sans écran passif', ['matin', 'matinée', 'journée', 'aujourd’hui', 'dès'], 'fraîcheur', 'sunrise', 'bulb', 'Cap clair dès le matin', 1, 'float_orbit'],
  ['prod_broom_sweep_clutter', 'kinetic_broll', 'productivity_time', 'workflow_clean', 'bright', 'Balai nettoyant les étapes lentes d’un circuit', ['supprimer', 'nettoyer', 'simplifier', 'friction', 'étape', 'étapes'], 'propreté', 'broom', 'sparkles', 'Friction balayée net', 7, 'slide_reveal'],
  ['prod_compass_direction', 'macro_bright', 'productivity_time', 'priority_north', 'bright', 'Boussole pointant vers l’unique action rentable', ['priorité', 'cap', 'focus', 'stratégie', 'objectif'], 'direction', 'compass', 'bullseye', 'Une seule priorité claire', 0, 'zoom_pan'],
  ['prod_check_3_steps', 'editorial_3d_vector', 'productivity_time', 'three_habits', 'bright', 'Trois cases cochées en cascade rapide', ['trois', '3', 'gestes', 'réflexes', 'liste', 'actions'], 'accomplissement', 'check', 'hundred-points', '3 réflexes immédiats', 2, 'pulse_grid'],
  ['prod_clock_90s_recap', 'macro_bright', 'productivity_time', 'ninety_sec_summary', 'bright', 'Horloge nette marquant quatre-vingt-dix secondes', ['90 secondes', 'minute', 'minutes', 'synthèse', 'résumé'], 'précision', 'clock', 'memo', 'Synthèse en 90 secondes', 5, 'zoom_pan'],
  ['prod_clapping_done_sprint', 'human_expressive', 'productivity_time', 'sprint_finish', 'bright', 'Mains applaudissant une tâche livrée avant midi', ['livré', 'fini', 'terminé', 'gagné', 'résultat'], 'satisfaction', 'clapping-hands', '1st-place-medal', 'Livré sans débordement', 7, 'float_orbit'],
  ['prod_pin_priority_board', 'editorial_3d_vector', 'productivity_time', 'kanban_pin', 'bright', 'Épingle rouge fixant la tâche critique du jour', ['tâche', 'tâches', 'goulot', 'circuit', 'blocage'], 'clarté', 'pin', 'file', 'Goulot unique ciblé', 3, 'slide_reveal'],
  ['prod_package_shipped', 'kinetic_broll', 'productivity_time', 'shipped_artifact', 'bright', 'Colis scellé prêt à être expédié immédiatement', ['envoyer', 'publier', 'lancer', 'sortir', 'produit'], 'satisfaction', 'package', 'check', 'Livraison concrète', 6, 'zoom_pan'],
  ['prod_repeat_automation_loop', 'kinetic_broll', 'productivity_time', 'habit_loop', 'bright', 'Boucle fluide automatisant les routines du lundi', ['routine', 'habitude', 'chaque', 'automatique', 'hebdo'], 'constance', 'repeat', 'gear', 'Routine automatique', 0, 'float_orbit'],
  ['prod_battery_100_charged', 'macro_bright', 'productivity_time', 'energy_full', 'bright', 'Batterie verte rechargée à cent pour cent', ['énergie', 'concentration', 'mental', 'repos', 'clair'], 'vitalité', 'battery', 'sparkles', 'Attention rechargée', 2, 'pulse_grid'],
  ['prod_paperclip_minimal', 'editorial_3d_vector', 'productivity_time', 'lean_process', 'bright', 'Trombone reliant seulement deux feuilles utiles', ['simple', 'léger', 'court', 'direct', 'efficace'], 'minimalisme', 'paperclip', 'check', 'Processus allégé', 5, 'slide_reveal'],

  // 9. SCIENCE DATA (15)
  ['data_dot_matrix_crowd', 'kinetic_broll', 'science_data', 'population_grid', 'bright', 'Grille de points isolant un pourcentage exact en bleu', ['72 %', '80 %', '90 %', 'population', 'humains', 'monde', 'part'], 'révélation', 'users', 'search', 'Part isolée sur grille', 0, 'zoom_pan'],
  ['data_curve_climb_2026', 'editorial_3d_vector', 'science_data', 'trend_curve', 'bright', 'Courbe pluriannuelle grimpant jusqu’en 2026', ['courbe', '2026', '2025', '2024', '2023', 'hausse', 'croissance'], 'évidence', 'chart-increasing', 'sparkles', 'Courbe d’accélération', 2, 'slide_reveal'],
  ['data_curve_drop_28', 'editorial_3d_vector', 'science_data', 'metric_crash', 'high-contrast', 'Courbe plongeant brutalement sous le seuil', ['chute', 'effondre', 'baisse', 'chuté', '-28 %', 'recule', 'divisé'], 'choc', 'chart-decreasing', 'warning', 'Chute mesurée en baisse', 3, 'zoom_pan'],
  ['data_microscope_study', 'macro_bright', 'science_data', 'stanford_study', 'bright', 'Microscope braqué sur des chiffres vérifiés', ['étude', 'stanford', 'banque de france', 'observatoire', 'données', 'chiffres'], 'crédibilité', 'microscope', 'bar-chart', 'Étude chiffrée vérifiée', 5, 'float_orbit'],
  ['data_ab_test_medal', 'kinetic_broll', 'science_data', 'ab_leaderboard', 'bright', 'Podium classant les variantes par score de rétention', ['variante', 'test', 'a/b', 'meilleur', 'score', 'classement'], 'compétition', '1st-place-medal', 'bar-chart', 'Comparatif A/B chiffré', 1, 'pulse_grid'],
  ['data_100_percent_gauge', 'macro_bright', 'science_data', 'gauge_dial', 'bright', 'Cadran gradué atteignant la zone critique', ['jauge', 'seuil', 'taux', 'pour cent', '%', 'niveau'], 'intensité', 'level-slider', 'hundred-points', 'Seuil critique atteint', 6, 'zoom_pan'],
  ['data_search_outlier_zoom', 'editorial_3d_vector', 'science_data', 'outlier_loupe', 'bright', 'Loupe isolant un pic anormal dix fois supérieur', ['outlier', 'anomalie', 'écart', 'pic', 'exception'], 'curiosité', 'search', 'fire', 'Signal 10× supérieur', 4, 'float_orbit'],
  ['data_test_tube_experiment', 'macro_bright', 'science_data', 'lab_experiment', 'bright', 'Éprouvettes bleues et vertes en laboratoire clair', ['expérience', 'pilote', 'test', 'laboratoire', 'mesuré'], 'découverte', 'test-tube', 'sparkles', 'Test terrain mesuré', 0, 'pulse_grid'],
  ['data_bar_compare_split', 'kinetic_broll', 'science_data', 'vs_bars', 'high-contrast', 'Deux barres face à face montrant un écart de 7×', ['contre', 'face à', 'vs', 'comparaison', 'écart', 'différence'], 'contraste', 'bar-chart', 'balance-scale', 'Écart net face à face', 3, 'slide_reveal'],
  ['data_crystal_ball_myth', 'editorial_3d_vector', 'science_data', 'forecast_vs_fact', 'bright', 'Boule de cristal remplacée par un graphique réel', ['prédiction', 'mythe', 'croyance', 'réalité', ' discours'], 'lucidité', 'crystal-ball', 'chart-increasing', 'Mythe vs Données réelles', 4, 'zoom_pan'],
  ['data_ruler_exact_measure', 'macro_bright', 'science_data', 'precision_ruler', 'bright', 'Règle graduée mesurant l’impact exact au millimètre', ['mesure', 'exact', 'précis', 'calcul', 'statistique'], 'rigueur', 'ruler', 'check', 'Mesure exacte vérifiée', 5, 'slide_reveal'],
  ['data_thinking_analyst', 'human_expressive', 'science_data', 'pattern_spotter', 'bright', 'Analyste repérant le signal caché dans le tableau', ['analyse', 'analyste', 'repérer', 'comprendre', 'logique'], 'concentration', 'thinking-face', 'bulb', 'Modèle caché identifié', 1, 'float_orbit'],
  ['data_bullseye_metric', 'kinetic_broll', 'science_data', 'kpi_hit', 'bright', 'Cible statistique atteinte sur la métrique clé', ['indicateur', 'kpi', 'taux', 'rétention', 'conversion'], 'précision', 'bullseye', 'check', 'Indicateur clé validé', 2, 'zoom_pan'],
  ['data_notebook_research', 'macro_bright', 'science_data', 'field_notes', 'bright', 'Carnet de recherche annoté au feutre jaune fluo', ['note', 'source', 'sources', 'rapport', 'extrait'], 'sérieux', 'notebook', 'pencil', 'Notes sourcées surlignées', 1, 'pulse_grid'],
  ['data_globe_benchmark', 'editorial_3d_vector', 'science_data', 'global_benchmark', 'bright', 'Globe terrestre connecté aux moyennes mondiales', ['monde', 'mondial', 'australie', 'us', 'france', 'comparatif'], 'envergure', 'globe', 'chart-increasing', 'Benchmark international', 0, 'float_orbit'],

  // 10. HARDWARE RETRO (15)
  ['hw_crt_1995_monitor', 'editorial_3d_vector', 'hardware_retro', 'crt_1995', 'bright', 'Écran cathodique beige 1995 face à un écran moderne', ['1995', '2000', 'rétro', 'ancien', 'vieux', 'cathodique', 'tv', 'pc'], 'nostalgie', 'television', 'floppy-disk', 'Parallèle 1995 vs 2026', 5, 'zoom_pan'],
  ['hw_rotary_console_dials', 'macro_bright', 'hardware_retro', 'mixing_knobs', 'bright', 'Boutons rotatifs de console ajustés avec précision', ['réglage', 'console', 'bouton', 'curseurs', 'dosage', 'calibrer'], 'maîtrise', 'control-knobs', 'level-slider', 'Console rotative calibrée', 0, 'pulse_grid'],
  ['hw_floppy_to_ssd', 'kinetic_broll', 'hardware_retro', 'storage_leap', 'bright', 'Disquette rétro éjectée par une puce moderne', ['mémoire', 'stockage', 'disquette', 'rapide', 'materiel'], 'contraste', 'floppy-disk', 'bolt', 'Saut matériel ×1000', 1, 'slide_reveal'],
  ['hw_laptop_night_glow', 'macro_bright', 'hardware_retro', 'macbook_pro', 'bright', 'Ordinateur portable ouvert sur fond studio lumineux', ['mac', 'macbook', 'apple', 'ordinateur', 'laptop', 'pc'], 'élégance', 'laptop', 'sparkles', 'Poste de travail net', 5, 'zoom_pan'],
  ['hw_usb_cable_plug', 'editorial_3d_vector', 'hardware_retro', 'physical_plug', 'high-contrast', 'Câble physique branché net dans une application', ['brancher', 'câble', 'connecter', 'prise', 'lien', 'matériel'], 'action', 'connected', 'bolt', 'Branchement physique net', 0, 'slide_reveal'],
  ['hw_satellite_signal', 'kinetic_broll', 'hardware_retro', 'antenna_link', 'bright', 'Antenne captant un signal propre haute fréquence', ['signal', 'réseau', 'onde', 'antenne', 'connexion'], 'portée', 'satellite-antenna', 'waveform', 'Signal capté net', 4, 'float_orbit'],
  ['hw_camera_lens_macro', 'macro_bright', 'hardware_retro', 'studio_optic', 'bright', 'Objectif photo net capturant un détail macro', ['caméra', 'optique', 'zoom', 'image', 'visuel', 'capture'], 'netteté', 'camera-with-flash', 'eye', 'Capture haute précision', 5, 'zoom_pan'],
  ['hw_mouse_click_pointer', 'editorial_3d_vector', 'hardware_retro', 'mouse_precision', 'bright', 'Souris ergonomique cliquant un bouton d’action', ['clic', 'cliquer', 'souris', 'bouton', 'interface'], 'réactivité', 'mouse', 'cursor', 'Clic précis en direct', 0, 'pulse_grid'],
  ['hw_joystick_gaming_ai', 'macro_bright', 'hardware_retro', 'interactive_ctrl', 'bright', 'Manette rétro illustrant la prise en main rapide', ['jeu', 'contrôle', 'manette', 'piloter', 'jouer'], 'plaisir', 'joystick', 'video-game', 'Pilotage interactif', 4, 'float_orbit'],
  ['hw_radio_frequency', 'kinetic_broll', 'hardware_retro', 'analog_radio', 'bright', 'Poste radio analogique réglé sur la bonne bande', ['audio', 'fréquence', 'voix', 'radio', 'son'], 'chaleur', 'radio', 'music', 'Fréquence vocale claire', 6, 'slide_reveal'],
  ['hw_gear_mechanics', 'macro_bright', 'hardware_retro', 'precision_gears', 'bright', 'Rouages métalliques propres imbriqués sans jeu', ['mécanique', 'rouage', 'système', 'engrenage', 'moteur'], 'ingénierie', 'gear', 'wrench', 'Mécanique de précision', 5, 'zoom_pan'],
  ['hw_film_projector_reel', 'editorial_3d_vector', 'hardware_retro', 'cinema_reel', 'bright', 'Projecteur de cinéma éclairant un cadre vertical', ['vidéo', 'montage', 'projection', 'rendu', 'export'], 'créativité', 'film-projector', 'film', 'Rendu vidéo calibré', 1, 'float_orbit'],
  ['hw_drum_beat_impact', 'kinetic_broll', 'hardware_retro', 'sfx_beat', 'high-contrast', 'Caisse claire marquant les temps forts visuels', ['son', 'sfx', 'rythme', 'tempo', 'impact', 'boum'], 'énergie', 'drum', 'bolt', 'Synchro son sur temps fort', 3, 'pulse_grid'],
  ['hw_battery_solid_state', 'macro_bright', 'hardware_retro', 'solid_battery', 'bright', 'Batterie haute densité prête pour la recharge rapide', ['batterie', 'autonomie', 'électrique', 'solide', 'charge'], 'innovation', 'battery', 'fire', 'Autonomie longue durée', 2, 'zoom_pan'],
  ['hw_wrench_calibration', 'editorial_3d_vector', 'hardware_retro', 'hardware_tune', 'bright', 'Clé de réglage ajustant une carte électronique', ['calibrer', 'régler', 'ajuster', 'maintenance', 'outil'], 'précision', 'wrench', 'gear', 'Réglage matériel net', 5, 'slide_reveal'],

  // 11. BUSINESS SAAS (15)
  ['biz_card_fan_10x', 'kinetic_broll', 'business_saas', 'fan_cards', 'bright', 'Éventail de cartes SaaS s’ouvrant à 180 degrés', ['business', 'saas', 'micro-saas', '10k', 'revenus', 'clients', 'offre'], 'ambition', 'credit-card', 'sparkles', 'Offres dépliées en éventail', 0, 'float_orbit'],
  ['biz_paywall_shock_stack', 'editorial_3d_vector', 'business_saas', 'paywall_pop', 'high-contrast', 'Popups tarifaires empilées créant la friction', ['paywall', 'tarif', 'abonnement', 'bloqué', 'essai', 'gratuit'], 'tension', 'locked', 'dollar-banknote', 'Mur tarifaire bloquant', 3, 'zoom_pan'],
  ['biz_ugly_to_apple_morph', 'kinetic_broll', 'business_saas', 'ui_glowup', 'bright', 'Interface datée transformée en carte Apple épurée', ['design', 'ui', 'interface', 'moche', 'propre', 'apple', 'notion'], 'émerveillement', 'magic-wand', 'sparkles', 'Refonte UI épurée', 5, 'slide_reveal'],
  ['biz_churn_plug_leak', 'editorial_3d_vector', 'business_saas', 'retention_fix', 'bright', 'Seau colmaté stoppant la fuite de clients', ['rétention', 'churn', 'perte', 'clients', 'fidéliser'], 'maîtrise', 'bucket', 'adhesive-bandage', 'Fuite clients stoppée', 2, 'pulse_grid'],
  ['biz_rocket_mrr_takeoff', 'macro_bright', 'business_saas', 'mrr_launch', 'bright', 'Fusée décollant d’un tableau de bord financier', ['croissance', 'mrr', 'chiffre d’affaires', 'startup', 'lancer'], 'triomphe', 'rocket', 'money-bag', 'Décollage revenus nets', 2, 'zoom_pan'],
  ['biz_founder_solo_crown', 'human_expressive', 'business_saas', 'solo_leverage', 'bright', 'Fondateur seul pilotant une machine bien huilée', ['solo', 'sans équipe', 'fondateur', 'indépendant', 'créateur'], 'fierté', 'crown', 'man-technologist', 'Levier fondateur solo', 1, 'float_orbit'],
  ['biz_handshake_b2b_deal', 'human_expressive', 'business_saas', 'b2b_contract', 'bright', 'Poignée de main scellant un contrat rentable', ['client', 'b2b', 'vente', 'accord', 'partenaire'], 'confiance', 'handshake', 'briefcase', 'Accord client validé', 0, 'slide_reveal'],
  ['biz_red_strike_copy', 'kinetic_broll', 'business_saas', 'copy_rewrite', 'high-contrast', 'Ligne faible barrée en rouge et réécrite net', ['texte', 'copywriting', 'message', 'promesse', 'titre', 'réécrire'], 'clarté', 'pencil', 'check', 'Message réécrit net', 3, 'zoom_pan'],
  ['biz_onboarding_1_click', 'macro_bright', 'business_saas', 'frictionless_signup', 'bright', 'Doigt pointant un bouton d’entrée sans friction', ['onboarding', 'inscription', 'clics', 'simple', 'rapide'], 'facilité', 'index-pointing-up', 'check', 'Entrée en un seul clic', 2, 'pulse_grid'],
  ['biz_inbox_lead_flow', 'editorial_3d_vector', 'business_saas', 'lead_intake', 'bright', 'Enveloppes entrantes triées vers le dossier actif', ['prospect', 'demande', 'entrant', 'email', 'vente'], 'flux', 'incoming-envelope', 'folder', 'Flux de demandes qualifié', 0, 'float_orbit'],
  ['biz_puzzle_product_fit', 'macro_bright', 'business_saas', 'pmf_lock', 'bright', 'Pièce de puzzle s’emboîtant au millimètre', ['marché', 'besoin', 'produit', 'solution', 'adapter'], 'harmonie', 'puzzle-piece', 'hundred-points', 'Adéquation produit exacte', 4, 'slide_reveal'],
  ['biz_anchor_pricing_tier', 'editorial_3d_vector', 'business_saas', 'pricing_tiers', 'bright', 'Trois cartes de prix avec l’offre centrale mise en avant', ['offre', 'pack', 'plan', 'prix', 'formule'], 'stratégie', 'tag', '1st-place-medal', 'Grille tarifaire lisible', 1, 'zoom_pan'],
  ['biz_seedling_bootstrapped', 'editorial_3d_vector', 'business_saas', 'organic_seed', 'bright', 'Jeune pousse verte grandissant sans levée de fonds', ['organique', 'autofinancé', 'durable', 'pousse', 'début'], 'espoir', 'seedling', 'sun', 'Croissance saine autofinancée', 7, 'float_orbit'],
  ['biz_megaphone_launch', 'kinetic_broll', 'business_saas', 'product_launch', 'high-contrast', 'Annonce produit propulsée par une vague visuelle', ['lancement', 'sortie', 'public', 'audience', 'distribution'], 'dynamisme', 'loudspeaker', 'fireworks', 'Lancement public fort', 6, 'pulse_grid'],
  ['biz_bullseye_niche', 'macro_bright', 'business_saas', 'niche_focus', 'bright', 'Flèche ciblant un segment précis du marché', ['niche', 'segment', 'cible', 'spécifique', 'positionnement'], 'précision', 'bullseye', 'compass', 'Positionnement précis', 5, 'zoom_pan'],

  // 12. CREATOR MEDIA (15)
  ['cre_voice_mic_waveform', 'kinetic_broll', 'creator_media', 'voice_shortcut', 'bright', 'Micro studio avec onde vocale bondissant à 1,10x', ['voix', 'micro', 'audio', 'diction', 'parler', 'wispr', 'onde'], 'fluidité', 'mic', 'waveform', 'Voix nette et rythmée', 0, 'pulse_grid'],
  ['cre_hook_leaderboard', 'editorial_3d_vector', 'creator_media', 'ab_hooks', 'bright', 'Classement des trois meilleurs hooks en tête', ['hook', 'hooks', 'accroche', 'variante', 'rétention', 'top'], 'stratégie', 'trophy', 'sparkles', 'Top 3 hooks classés', 1, 'slide_reveal'],
  ['cre_article_highlighter', 'macro_bright', 'creator_media', 'press_highlight', 'bright', 'Surligneur jaune traçant la phrase clé dans l’article', ['article', 'presse', 'citation', 'extrait', 'lire', 'phrase'], 'focus', 'pencil', 'newspaper', 'Extrait clé surligné', 1, 'zoom_pan'],
  ['cre_studio_camera_flash', 'human_expressive', 'creator_media', 'creator_shoot', 'bright', 'Caméra studio capturant un plan net et lumineux', ['studio', 'tournage', 'short', 'vidéo', 'créateur', 'caméra'], 'professionnalisme', 'video-camera', 'camera-with-flash', 'Production studio nette', 5, 'float_orbit'],
  ['cre_caption_pop_words', 'kinetic_broll', 'creator_media', 'kinetic_subs', 'high-contrast', 'Mots géants contrastés sans boîte noire opaque', ['sous-titres', 'légende', 'texte', 'mot', 'mots', 'lisible'], 'lisibilité', 'speaking-head', 'bolt', 'Sous-titres ultra-lisibles', 0, 'slide_reveal'],
  ['cre_social_waterfall_feed', 'editorial_3d_vector', 'creator_media', 'social_stream', 'bright', 'Cartes sociales défilant en cascade synchronisée', ['posts', 'publications', 'x', 'linkedin', 'youtube', 'shorts'], 'cadence', 'chat', 'repeat', 'Cascade de posts sociaux', 4, 'float_orbit'],
  ['cre_palette_art_direction', 'macro_bright', 'creator_media', 'art_direction', 'bright', 'Palette artistique calibrée sur papier crème lumineux', ['couleurs', 'style', 'direction artistique', 'papier', 'esthétique'], 'goût', 'palette', 'sparkles', 'Direction artistique cohérente', 6, 'zoom_pan'],
  ['cre_headphones_mix_master', 'macro_bright', 'creator_media', 'lufs_master', 'bright', 'Casque studio vérifiant l’équilibre voix et musique', ['musique', 'mix', 'mixage', 'son', 'volume', 'sidechain'], 'finesse', 'headphone', 'control-knobs', 'Mixage broadcast -14 LUFS', 5, 'pulse_grid'],
  ['cre_party_milestone_100k', 'human_expressive', 'creator_media', 'audience_milestone', 'bright', 'Créateur célébrant un cap d’abonnés engagés', ['abonnés', 'communauté', 'audience', 'croissance', 'cap'], 'joie', 'partying-face', 'confetti' in {} ? 'party-popper' : 'party-popper', 'Cap d’audience franchi', 1, 'float_orbit'],
  ['cre_scissors_silence_trim', 'kinetic_broll', 'creator_media', 'silence_cut_60ms', 'high-contrast', 'Ciseaux coupant chaque silence supérieur à 60 ms', ['silence', 'silences', 'couper', 'cut', 'montage', 'rythme'], 'nervosité', 'scissors', 'waveform', 'Silences > 60 ms coupés', 3, 'slide_reveal'],
  ['cre_script_quill_humanize', 'editorial_3d_vector', 'creator_media', 'human_script', 'bright', 'Script retravaillé pour sonner direct et oral', ['script', 'écrire', 'histoire', 'narration', 'ton', 'direct'], 'authenticité', 'script', 'writing-hand', 'Script oral et incisif', 5, 'zoom_pan'],
  ['cre_conveyor_slop_clean', 'kinetic_broll', 'creator_media', 'quality_gate', 'bright', 'Tapis roulant éjectant les clichés avant publication', ['tapis', 'trier', 'cliché', 'filtre', 'propre', 'qualité'], 'exigence', 'gear', 'check', 'Contrôle qualité avant export', 2, 'pulse_grid'],
  ['cre_star_struck_thumb', 'human_expressive', 'creator_media', 'ctr_magnet', 'bright', 'Expression vive captant l’œil dès la vignette', ['miniature', 'clic', 'visuel', 'curiosité', 'impact'], 'magnétisme', 'star-struck', 'camera', 'Vignette magnétique', 1, 'float_orbit'],
  ['cre_envelope_newsletter', 'editorial_3d_vector', 'creator_media', 'creator_funnel', 'bright', 'Lettre éditoriale distribuée chaque semaine', ['chaîne', 'semaine', 'épisode', 'newsletter', 'rendez-vous'], 'fidélité', 'envelope', 'bell', 'Rendez-vous hebdomadaire', 0, 'slide_reveal'],
  ['cre_cool_authority_badge', 'human_expressive', 'creator_media', 'creator_signature', 'bright', 'Badge créateur net avec signature personnelle', ['signature', 'marque', 'chaîne', 'identité', 'style'], 'assurance', 'cool', '1st-place-medal', 'Signature éditoriale nette', 4, 'zoom_pan'],

  // 13. ECONOMY MACRO (15)
  ['eco_central_bank_pillars', 'editorial_3d_vector', 'economy_macro', 'central_bank', 'bright', 'Colonnes bancaires sous un graphique de taux directeurs', ['banque centrale', 'taux', 'france', 'europe', 'économie', 'macro'], 'gravité', 'classical-building', 'chart-increasing', 'Politique monétaire en jeu', 0, 'zoom_pan'],
  ['eco_energy_bolt_grid', 'kinetic_broll', 'economy_macro', 'energy_cost', 'high-contrast', 'Éclair tarifaire sur un compteur d’électricité', ['électricité', 'énergie', 'facture', 'kilowatt', 'nucléaire', 'prix'], 'tension', 'bolt', 'dollar-banknote', 'Coût de l’énergie mesuré', 1, 'pulse_grid'],
  ['eco_housing_key_market', 'macro_bright', 'economy_macro', 'real_estate', 'bright', 'Clé de maison posée sur une courbe de marché', ['immobilier', 'logement', 'prêt', 'taux', 'achat', 'loyer'], 'prudence', 'house', 'old-key', 'Marché immobilier 2026', 6, 'float_orbit'],
  ['eco_global_cargo_trade', 'editorial_3d_vector', 'economy_macro', 'supply_chain', 'bright', 'Routes maritimes et flux mondiaux sur globe clair', ['commerce', 'import', 'export', 'chine', 'usa', 'douane'], 'ampleur', 'airplane', 'globe', 'Flux mondiaux redessinés', 0, 'slide_reveal'],
  ['eco_smic_paycheck_scale', 'macro_bright', 'economy_macro', 'wage_purchasing', 'bright', 'Balance entre salaire brut affiché et pouvoir réel', ['salaire', 'smic', 'paie', 'revenu', 'français', 'ménages'], 'équité', 'balance-scale', 'coin', 'Brut vs Pouvoir réel', 1, 'zoom_pan'],
  ['eco_construction_infra', 'editorial_3d_vector', 'economy_macro', 'industrial_shift', 'bright', 'Chantier de réindustrialisation sur fond lumineux', ['industrie', 'chantier', 'investissement', 'infrastructure', 'plan'], 'mouvement', 'construction', 'factory', 'Investissements industriels', 6, 'float_orbit'],
  ['eco_mountain_peak_debt', 'kinetic_broll', 'economy_macro', 'debt_peak', 'high-contrast', 'Sommet budgétaire à franchir avant la bascule', ['dette', 'déficit', 'budget', 'état', 'milliards'], 'alerte', 'mountain', 'warning', 'Sommet budgétaire critique', 3, 'pulse_grid'],
  ['eco_volcano_market_shock', 'kinetic_broll', 'economy_macro', 'market_eruption', 'high-contrast', 'Rupture soudaine secouant un secteur établi', ['crise', 'rupture', 'choc', 'secousse', 'secteur'], 'dramatisme', 'volcano', 'chart-decreasing', 'Secousse sectorielle nette', 3, 'zoom_pan'],
  ['eco_wheat_food_basket', 'macro_bright', 'economy_macro', 'grocery_prices', 'bright', 'Panier quotidien reflétant l’évolution des prix', ['courses', 'alimentation', 'supermarché', 'panier', 'prix'], 'proximité', 'bread', 'basket', 'Panier quotidien chiffré', 1, 'slide_reveal'],
  ['eco_car_mobility_cost', 'editorial_3d_vector', 'economy_macro', 'transport_shift', 'bright', 'Véhicule moderne comparé au coût d’entretien', ['voiture', 'carburant', 'transport', 'électrique', 'coût'], 'pragmatisme', 'car', 'coin', 'Coût mobilité comparé', 5, 'float_orbit'],
  ['eco_factory_jobs_shift', 'human_expressive', 'economy_macro', 'labor_transition', 'bright', 'Salariés accompagnés vers de nouveaux outils', ['emploi', 'chômage', 'travail', 'secteur', 'transition'], 'lucidité', 'users', 'hammer-and-wrench', 'Transition des métiers', 0, 'zoom_pan'],
  ['eco_yen_euro_currency', 'macro_bright', 'economy_macro', 'currency_rates', 'bright', 'Courbe des devises et flux financiers mondiaux', ['devise', 'dollar', 'euro', 'marché', 'bourse'], 'dynamisme', 'chart-increasing-with-yen', 'globe', 'Devises & flux mondiaux', 2, 'pulse_grid'],
  ['eco_handshake_eu_us', 'human_expressive', 'economy_macro', 'geopolitics_deal', 'bright', 'Accord économique entre deux blocs majeurs', ['accord', 'traité', 'chine', 'états-unis', 'europe'], 'enjeu', 'handshake', 'world-map', 'Équilibre géopolitique', 5, 'slide_reveal'],
  ['eco_briefcase_pme', 'editorial_3d_vector', 'economy_macro', 'sme_resilience', 'bright', 'Mallette de dirigeant PME face aux nouveaux coûts', ['pme', 'dirigeant', 'patron', 'trésorerie', 'boîte'], 'résilience', 'briefcase', 'shield', 'Trésorerie PME protégée', 2, 'float_orbit'],
  ['eco_sunrise_recovery', 'editorial_3d_vector', 'economy_macro', 'cycle_turn', 'bright', 'Reprise économique claire après le point bas', ['reprise', 'rebond', 'cycle', 'opportunité', '2026'], 'optimisme', 'sunrise', 'chart-increasing', 'Rebond de cycle mesuré', 7, 'zoom_pan'],

  // 14. EDUCATION LEARNING (15)
  ['edu_lightbulb_eureka', 'editorial_3d_vector', 'education_learning', 'eureka_model', 'bright', 'Ampoule brillante illuminant un schéma clair', ['comprendre', 'idée', 'déclic', 'méthode', 'modèle', 'logique'], 'illumination', 'bulb', 'sparkles', 'Modèle mental limpide', 1, 'zoom_pan'],
  ['edu_books_distilled', 'macro_bright', 'education_learning', 'summary_distill', 'bright', 'Pile de livres condensée en trois points précis', ['livre', 'livres', 'résumer', 'synthèse', 'savoir', 'apprendre'], 'clarté', 'books', 'memo', 'Savoir condensé net', 0, 'slide_reveal'],
  ['edu_graduation_upskill', 'editorial_3d_vector', 'education_learning', 'fast_learning', 'bright', 'Apprentissage accéléré avec outils intelligents', ['formation', 'compétences', 'étudier', 'progresser', 'niveau'], 'ambition', 'graduation-cap', 'rocket', 'Montée en compétences ×3', 4, 'float_orbit'],
  ['edu_question_answer_pop', 'kinetic_broll', 'education_learning', 'why_how', 'high-contrast', 'Point d’interrogation transformé en réponse chiffrée', ['pourquoi', 'comment', 'question', 'piège', 'réponse'], 'curiosité', 'question', 'exclamation-question-mark', 'Question décryptée net', 6, 'pulse_grid'],
  ['edu_writing_practice', 'human_expressive', 'education_learning', 'active_practice', 'bright', 'Main écrivant une méthode applicable dès ce soir', ['pratiquer', 'tester', 'appliquer', 'exercice', 'étape'], 'action', 'writing-hand', 'notebook', 'Pratique directe active', 2, 'zoom_pan'],
  ['edu_brain_connections', 'macro_bright', 'education_learning', 'neural_retention', 'bright', 'Cerveau lumineux reliant deux concepts distincts', ['cerveau', 'mémoire', 'retenir', 'comprendre', 'penser'], 'fascination', 'brain', 'link', 'Connexions durables', 4, 'float_orbit'],
  ['edu_nerd_deep_research', 'human_expressive', 'education_learning', 'deep_analysis', 'bright', 'Chercheur passionné fouillant les sources primaires', ['recherche', 'source', 'fouiller', 'détail', 'technique'], 'curiosité', 'nerd-face', 'microscope', 'Analyse de source primaire', 0, 'slide_reveal'],
  ['edu_compass_roadmap', 'editorial_3d_vector', 'education_learning', 'learning_path', 'bright', 'Feuille de route en quatre étapes ordonnées', ['feuille de route', 'plan', 'étape', 'parcours', 'guide'], 'sérénité', 'compass', 'pin', 'Parcours balisé clair', 5, 'pulse_grid'],
  ['edu_school_vs_real', 'kinetic_broll', 'education_learning', 'school_gap', 'bright', 'École traditionnelle comparée aux outils actuels', ['école', 'cours', 'université', 'terrain', 'réel'], 'contraste', 'school', 'laptop', 'École vs Terrain 2026', 6, 'zoom_pan'],
  ['edu_puzzle_concept', 'macro_bright', 'education_learning', 'concept_piece', 'bright', 'Pièce manquante complétant la compréhension globale', ['pièce', 'manque', 'comprendre', 'secret', 'clé'], 'satisfaction', 'puzzle-piece', 'bulb', 'Pièce manquante révélée', 1, 'float_orbit'],
  ['edu_magnifying_clue', 'editorial_3d_vector', 'education_learning', 'clue_finder', 'bright', 'Loupe pointant le mot décisif d’un paragraphe', ['indice', 'détail', 'caché', 'repérer', 'lire'], 'attention', 'search', 'file', 'Détail décisif repéré', 5, 'slide_reveal'],
  ['edu_pencil_edit_draft', 'macro_bright', 'education_learning', 'refine_draft', 'bright', 'Crayon affûtant une phrase jusqu’à la clarté pure', ['brouillon', 'corriger', 'clair', 'simple', 'concis'], 'soin', 'pencil', 'check', 'Phrase affûtée net', 2, 'zoom_pan'],
  ['edu_hundred_score_mastery', 'kinetic_broll', 'education_learning', 'mastery_100', 'high-contrast', 'Score cent sur cent après vérification complète', ['maîtrise', 'expert', 'score', 'parfait', 'validé'], 'fierté', 'hundred-points', 'trophy', 'Maîtrise validée', 1, 'pulse_grid'],
  ['edu_thought_bubble_model', 'human_expressive', 'education_learning', 'mental_shift', 'bright', 'Bulle de pensée restructurée simplement', ['penser', 'réflexion', 'mental', 'biais', 'logique'], 'clarté', 'thought-balloon', 'brain', 'Changement de perspective', 4, 'float_orbit'],
  ['edu_victory_first_win', 'human_expressive', 'education_learning', 'quick_win', 'bright', 'Signe de victoire après le premier résultat concret', ['résultat', 'premier', 'réussir', 'gagné', 'victoire'], 'encouragement', 'victory-hand', 'star', 'Premier résultat concret', 7, 'slide_reveal'],

  // 15. HEALTH FOCUS (15)
  ['hlt_sleep_deep_recovery', 'human_expressive', 'health_focus', 'sleep_cycle', 'bright', 'Sommeil réparateur loin des écrans nocturnes', ['sommeil', 'dormir', 'nuit', 'repos', 'fatigue', 'matin'], 'apaisement', 'sleeping-face', 'bed', 'Sommeil sans écran tardif', 4, 'float_orbit'],
  ['hlt_brain_overload_reset', 'kinetic_broll', 'health_focus', 'cognitive_reset', 'high-contrast', 'Cerveau surchauffé refroidi par une pause claire', ['surcharge', 'mental', 'cerveau', 'fatigue', 'numérique', 'pause'], 'soulagement', 'hot-face', 'ice', 'Décharge mentale immédiate', 0, 'zoom_pan'],
  ['hlt_sun_morning_light', 'editorial_3d_vector', 'health_focus', 'circadian_light', 'bright', 'Lumière matinale naturelle avant tout téléphone', ['lumière', 'matin', 'soleil', 'rythme', 'réveil'], 'vitalité', 'sun', 'sunrise', 'Lumière naturelle d’abord', 1, 'slide_reveal'],
  ['hlt_heart_pulse_calm', 'macro_bright', 'health_focus', 'stress_drop', 'bright', 'Rythme cardiaque stabilisé après coupure du stress', ['stress', 'calme', 'respiration', 'pression', 'anxiété'], 'sérénité', 'heart', 'sparkles', 'Pression mentale réduite', 3, 'pulse_grid'],
  ['hlt_muted_quiet_zone', 'editorial_3d_vector', 'health_focus', 'sensory_quiet', 'bright', 'Enceinte coupée pour préserver deux heures de calme', ['calme', 'silence', 'concentration', 'calme', 'focus'], 'paix', 'muted-speaker', 'sunflower', 'Zone de calme protégée', 7, 'float_orbit'],
  ['hlt_walking_clear_mind', 'human_expressive', 'health_focus', 'active_break', 'bright', 'Course ou marche matinale loin des notifications', ['bouger', 'sport', 'marche', 'santé', 'corps'], 'énergie', 'person-running', 'deciduous-tree', 'Pause active sans écran', 2, 'zoom_pan'],
  ['hlt_tea_deep_work_ritual', 'macro_bright', 'health_focus', 'calm_ritual', 'bright', 'Boisson chaude posée à côté d’un carnet vierge', ['rituel', 'habitude', 'matin', 'café', 'thé', 'commencer'], 'confort', 'hot-beverage', 'notebook', 'Rituel calme de démarrage', 6, 'slide_reveal'],
  ['hlt_bandage_recovery', 'editorial_3d_vector', 'health_focus', 'burnout_heal', 'bright', 'Pansement réparateur sur une routine épuisante', ['récupérer', 'épuisement', 'soigner', 'équilibre'], 'soin', 'adhesive-bandage', 'heart', 'Récupération progressive', 3, 'float_orbit'],
  ['hlt_tree_nature_detox', 'editorial_3d_vector', 'health_focus', 'digital_detox', 'bright', 'Arbre vert lumineux symbolisant la déconnexion', ['déconnexion', 'nature', 'dehors', 'respirer', 'détox'], 'fraîcheur', 'evergreen-tree', 'rainbow', 'Déconnexion numérique', 7, 'zoom_pan'],
  ['hlt_eyes_rest_break', 'macro_bright', 'health_focus', 'eye_strain', 'bright', 'Œil reposé loin de la lumière bleue nocturne', ['yeux', 'vue', 'fatigue', 'écran', 'soir'], 'soulagement', 'eye', 'snowflake', 'Repos visuel protégé', 0, 'pulse_grid'],
  ['hlt_stopwatch_pomodoro', 'kinetic_broll', 'health_focus', 'focus_timer', 'bright', 'Chronomètre cadencé en blocs courts sans dispersion', ['bloc', 'focus', 'minutes', 'dispersion', 'concentration'], 'discipline', 'stopwatch', 'check', 'Blocs de focus courts', 5, 'slide_reveal'],
  ['hlt_apple_nutrition_fuel', 'macro_bright', 'health_focus', 'clean_energy', 'bright', 'Énergie naturelle durable sans pic artificiel', ['énergie', 'santé', 'quotidien', 'corps', 'vitalité'], 'vitalité', 'red-apple', 'bolt', 'Énergie stable toute la journée', 2, 'float_orbit'],
  ['hlt_woozy_dopamine_hangover', 'human_expressive', 'health_focus', 'scroll_hangover', 'high-contrast', 'Étourdissement après quarante minutes de scroll', ['vertige', 'scroll', 'passif', 'brouillard', 'perdu'], 'prise de conscience', 'woozy-face', 'phone', 'Brouillard post-scroll', 4, 'zoom_pan'],
  ['hlt_superhero_discipline', 'human_expressive', 'health_focus', 'self_mastery', 'bright', 'Maîtrise retrouvée sur son emploi du temps', ['maîtrise', 'contrôle', 'volonté', 'cap', 'force'], 'confiance', 'superhero', 'sparkles', 'Maîtrise retrouvée', 0, 'pulse_grid'],
  ['hlt_clover_good_habit', 'editorial_3d_vector', 'health_focus', 'positive_compound', 'bright', 'Effet cumulé positif des petits réflexes quotidiens', ['quotidien', 'jour', 'progrès', 'petit', 'durable'], 'sérénité', 'four-leaf-clover', 'chart-increasing', 'Effet cumulé positif', 7, 'float_orbit'],
];

export const BROLL_DATABASE: BrollDatabaseEntry[] = RAW_ENTRIES.map(
  ([
    id,
    format,
    category,
    subCategory,
    lighting,
    concrete_subject,
    metaphor_tags,
    emotion,
    primaryIcon,
    secondaryIcon,
    caption,
    paletteIdx,
    motionMode,
  ]) => ({
    id,
    format,
    category,
    subCategory,
    lighting,
    concrete_subject,
    metaphor_tags,
    emotion,
    primaryIcon,
    secondaryIcon,
    palette: PALETTES[paletteIdx % PALETTES.length],
    motionMode,
    caption,
  })
);

export const BROLL_DATABASE_BY_ID: Record<string, BrollDatabaseEntry> = Object.fromEntries(
  BROLL_DATABASE.map((entry) => [entry.id, entry])
);
