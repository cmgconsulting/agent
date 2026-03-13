import Anthropic from '@anthropic-ai/sdk'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { decryptCredentials } from '@/lib/vault'
import { getAgentConfig, type AgentConfig } from '@/lib/agents-config'
import type { Agent, AgentType, ConnectorType } from '@/types/database'
import * as metaApi from '@/lib/connectors/meta'
import * as gmailApi from '@/lib/connectors/gmail'
import * as whatsappApi from '@/lib/connectors/whatsapp'
import * as airtableApi from '@/lib/connectors/airtable'
import * as quotesLib from '@/lib/connectors/quotes'
import * as aidsCalc from '@/lib/connectors/aids-calculator'
import * as pennylaneApi from '@/lib/connectors/pennylane'
import * as remindersLib from '@/lib/connectors/payment-reminders'
import * as metaAdsApi from '@/lib/connectors/meta-ads'
import * as leadsLib from '@/lib/connectors/leads'
import * as sofiaLib from '@/lib/connectors/sofia-sop'
import * as felixLib from '@/lib/connectors/felix-finance'
import * as irisLib from '@/lib/connectors/iris-reporting'

// ============================================
// TYPES
// ============================================

export interface AgentContext {
  clientId: string
  agentType: AgentType
  userMessage?: string
  trigger?: string  // 'manual' | 'scheduled' | 'webhook' | 'event'
  metadata?: Record<string, unknown>
}

export interface AgentTool {
  name: string
  description: string
  input_schema: Record<string, unknown>
  execute: (input: Record<string, unknown>, ctx: AgentRunContext) => Promise<unknown>
}

export interface AgentRunContext {
  agent: Agent
  config: AgentConfig
  clientId: string
  connectors: Map<ConnectorType, Record<string, string>>
}

export interface AgentResult {
  success: boolean
  response: string
  actions: AgentAction[]
  tokensUsed: number
  durationMs: number
}

export interface AgentAction {
  type: string
  title: string
  description: string
  payload: Record<string, unknown>
  requiresApproval: boolean
}

// ============================================
// SYSTEM PROMPTS
// ============================================

const BASE_SYSTEM_PROMPT = `Tu es un agent IA de la plateforme CMG Agents, specialise dans les entreprises ENR (poeles a bois, panneaux solaires, pompes a chaleur).

Regles importantes :
- Tu agis pour le compte de l'entreprise cliente, jamais a titre personnel
- Pour les actions importantes (envoi d'email, publication, transaction), tu dois TOUJOURS demander une validation
- Tu reponds en francais, de maniere professionnelle et concise
- Tu ne partages jamais les credentials ou informations sensibles
- Tu log tes activites de maniere detaillee pour la tracabilite`

const AGENT_SYSTEM_PROMPTS: Record<AgentType, string> = {
  eva: `${BASE_SYSTEM_PROMPT}

Tu es Eva, responsable des reseaux sociaux.
- Tu generes et publies les posts sur Meta (Facebook/Instagram) et LinkedIn
- Tu reponds aux commentaires et messages sur les reseaux
- Tu analyses les performances des publications
- Tu proposes un calendrier editorial adapte au secteur ENR
- Avant de publier, tu demandes TOUJOURS la validation du contenu`,

  ludo: `${BASE_SYSTEM_PROMPT}

Tu es Ludo, responsable du SAV Client.
- Tu reponds aux demandes clients via WhatsApp et SMS
- Tu crees les tickets SAV dans Airtable
- Tu escalades les cas complexes (reclamations, urgences techniques)
- Tu assures le suivi des interventions
- Pour les remboursements ou gestes commerciaux, tu demandes une validation`,

  marc: `${BASE_SYSTEM_PROMPT}

Tu es Marc, responsable de la gestion des emails.
- Tu tries la boite mail et classes les emails par priorite
- Tu reponds aux demandes de devis et d'information
- Tu prepares et envoies les newsletters via Brevo/Mailchimp
- Tu fais le suivi des emails importants non repondus
- Pour l'envoi d'emails importants, tu demandes une validation`,

  leo: `${BASE_SYSTEM_PROMPT}

Tu es Leo, responsable des operations.
- Tu generes les devis a partir des informations client
- Tu calcules les aides (MaPrimeRenov, CEE, etc.) selon les criteres du dossier
- Tu prepares et envoies les factures via Pennylane/Sellsy
- Tu relances les impayes automatiquement
- Pour les devis et factures, tu demandes une validation avant envoi`,

  hugo: `${BASE_SYSTEM_PROMPT}

Tu es Hugo, responsable du marketing et de l'acquisition.
- Tu geres les campagnes publicitaires Meta Ads et Google Ads
- Tu qualifies les leads entrants et leur attribues un score
- Tu nourris les prospects avec des sequences automatisees
- Tu analyses le ROI par canal d'acquisition
- Pour les budgets pub et les campagnes, tu demandes une validation`,

  sofia: `${BASE_SYSTEM_PROMPT}

Tu es Sofia, responsable de la structuration et des SOP.
- Tu generes l'organigramme de l'entreprise
- Tu rediges les procedures operationnelles (SOP) dans Notion
- Tu detectes les gaps de processus et proposes des ameliorations
- Tu documentes les workflows et les bonnes pratiques
- Pour les modifications de process, tu demandes une validation`,

  felix: `${BASE_SYSTEM_PROMPT}

Tu es Felix, responsable des finances et des marges.
- Tu calcules les marges par produit et par chantier
- Tu alertes sur les seuils critiques (tresorerie, rentabilite)
- Tu produis la tresorerie previsionnelle
- Tu analyses les ecarts entre previsionnel et realise
- Pour les decisions financieres, tu demandes TOUJOURS une validation`,

  iris: `${BASE_SYSTEM_PROMPT}

Tu es Iris, responsable de la data et du reporting.
- Tu consolides les KPIs de tous les agents
- Tu generes les rapports hebdomadaires et mensuels
- Tu analyses le ROI par canal et par agent
- Tu detectes les tendances et anomalies
- Tu presentes les donnees de maniere claire et actionnable`,
}

// ============================================
// TOOLS REGISTRY
// ============================================

function getAgentTools(agentType: AgentType): Anthropic.Tool[] {
  const commonTools: Anthropic.Tool[] = [
    {
      name: 'create_pending_action',
      description: 'Cree une action en attente de validation par le client. Utilise pour toute action importante (envoi email, publication, transaction, etc.)',
      input_schema: {
        type: 'object' as const,
        properties: {
          action_type: { type: 'string', description: 'Type: send_email, publish_post, create_invoice, send_sms, etc.' },
          title: { type: 'string', description: 'Titre court de l\'action' },
          description: { type: 'string', description: 'Description detaillee de ce qui sera fait' },
          payload: { type: 'object', description: 'Donnees de l\'action (contenu email, post, etc.)' },
        },
        required: ['action_type', 'title', 'description'],
      },
    },
    {
      name: 'log_activity',
      description: 'Enregistre une activite dans les logs de l\'agent',
      input_schema: {
        type: 'object' as const,
        properties: {
          action: { type: 'string', description: 'Description de l\'activite' },
          status: { type: 'string', enum: ['success', 'error', 'warning', 'info'] },
          details: { type: 'string', description: 'Details supplementaires' },
        },
        required: ['action', 'status'],
      },
    },
  ]

  const typeSpecificTools: Record<AgentType, Anthropic.Tool[]> = {
    eva: [
      {
        name: 'generate_social_post',
        description: 'Genere un post pour les reseaux sociaux (Meta ou LinkedIn)',
        input_schema: {
          type: 'object' as const,
          properties: {
            platform: { type: 'string', enum: ['facebook', 'instagram', 'linkedin'] },
            topic: { type: 'string', description: 'Sujet du post' },
            tone: { type: 'string', enum: ['professionnel', 'decontracte', 'informatif', 'promotionnel'] },
          },
          required: ['platform', 'topic'],
        },
      },
      {
        name: 'publish_facebook_post',
        description: 'Publie un post sur la page Facebook. Necessite le connecteur meta_api.',
        input_schema: {
          type: 'object' as const,
          properties: {
            message: { type: 'string', description: 'Texte du post' },
            link: { type: 'string', description: 'Lien a inclure (optionnel)' },
            image_url: { type: 'string', description: 'URL d\'image a publier (optionnel)' },
          },
          required: ['message'],
        },
      },
      {
        name: 'publish_instagram_post',
        description: 'Publie un post sur Instagram. Necessite image + connecteur meta_api.',
        input_schema: {
          type: 'object' as const,
          properties: {
            image_url: { type: 'string', description: 'URL publique de l\'image' },
            caption: { type: 'string', description: 'Legende du post' },
          },
          required: ['image_url', 'caption'],
        },
      },
      {
        name: 'get_post_comments',
        description: 'Recupere les commentaires d\'un post Facebook ou Instagram',
        input_schema: {
          type: 'object' as const,
          properties: {
            post_id: { type: 'string', description: 'ID du post' },
            limit: { type: 'number', description: 'Nombre max de commentaires (defaut: 25)' },
          },
          required: ['post_id'],
        },
      },
      {
        name: 'reply_to_comment',
        description: 'Repond a un commentaire sur Facebook/Instagram',
        input_schema: {
          type: 'object' as const,
          properties: {
            comment_id: { type: 'string', description: 'ID du commentaire' },
            message: { type: 'string', description: 'Reponse au commentaire' },
          },
          required: ['comment_id', 'message'],
        },
      },
      {
        name: 'get_page_insights',
        description: 'Recupere les statistiques de performance de la page Facebook',
        input_schema: {
          type: 'object' as const,
          properties: {
            period: { type: 'string', enum: ['day', 'week', 'month'], description: 'Periode d\'analyse' },
          },
          required: [],
        },
      },
    ],
    ludo: [
      {
        name: 'send_whatsapp_message',
        description: 'Envoie un message WhatsApp a un client',
        input_schema: {
          type: 'object' as const,
          properties: {
            to: { type: 'string', description: 'Numero de telephone (+33...)' },
            text: { type: 'string', description: 'Message texte' },
          },
          required: ['to', 'text'],
        },
      },
      {
        name: 'send_sms',
        description: 'Envoie un SMS via Twilio',
        input_schema: {
          type: 'object' as const,
          properties: {
            to: { type: 'string', description: 'Numero de telephone (+33...)' },
            text: { type: 'string', description: 'Message SMS (160 car. max recommande)' },
          },
          required: ['to', 'text'],
        },
      },
      {
        name: 'create_sav_ticket',
        description: 'Cree un ticket SAV dans Airtable',
        input_schema: {
          type: 'object' as const,
          properties: {
            client_name: { type: 'string', description: 'Nom du client' },
            phone: { type: 'string', description: 'Telephone du client' },
            category: { type: 'string', enum: ['panne', 'installation', 'garantie', 'reclamation', 'information', 'rdv', 'autre'] },
            priority: { type: 'string', enum: ['urgent', 'high', 'normal', 'low'] },
            description: { type: 'string', description: 'Description du probleme' },
            product: { type: 'string', description: 'Produit concerne (poele, PAC, panneaux, etc.)' },
          },
          required: ['client_name', 'category', 'priority', 'description'],
        },
      },
      {
        name: 'search_sav_tickets',
        description: 'Recherche des tickets SAV existants dans Airtable',
        input_schema: {
          type: 'object' as const,
          properties: {
            client_name: { type: 'string', description: 'Nom du client a rechercher' },
            status: { type: 'string', enum: ['ouvert', 'en_cours', 'resolu', 'ferme'] },
          },
          required: [],
        },
      },
      {
        name: 'classify_sav_request',
        description: 'Classifie automatiquement une demande SAV (categorie, priorite, escalade)',
        input_schema: {
          type: 'object' as const,
          properties: {
            text: { type: 'string', description: 'Texte de la demande client' },
          },
          required: ['text'],
        },
      },
    ],
    marc: [
      {
        name: 'list_emails',
        description: 'Liste les emails de la boite Gmail avec filtres optionnels',
        input_schema: {
          type: 'object' as const,
          properties: {
            query: { type: 'string', description: 'Recherche Gmail (ex: "is:unread", "from:client@email.com")' },
            max_results: { type: 'number', description: 'Nombre max de resultats (defaut: 20)' },
          },
          required: [],
        },
      },
      {
        name: 'read_email',
        description: 'Lit le contenu complet d\'un email',
        input_schema: {
          type: 'object' as const,
          properties: {
            message_id: { type: 'string', description: 'ID du message Gmail' },
          },
          required: ['message_id'],
        },
      },
      {
        name: 'categorize_emails',
        description: 'Categorise les emails non lus (lead, sav, devis, facture, newsletter, spam)',
        input_schema: {
          type: 'object' as const,
          properties: {
            max_results: { type: 'number', description: 'Nombre d\'emails a categoriser (defaut: 10)' },
          },
          required: [],
        },
      },
      {
        name: 'draft_email',
        description: 'Redige un brouillon d\'email a envoyer (necessite validation)',
        input_schema: {
          type: 'object' as const,
          properties: {
            to: { type: 'string', description: 'Destinataire' },
            subject: { type: 'string', description: 'Objet' },
            body: { type: 'string', description: 'Contenu HTML' },
            reply_to_message_id: { type: 'string', description: 'ID du message auquel repondre (optionnel)' },
            thread_id: { type: 'string', description: 'ID du thread (optionnel)' },
            template: { type: 'string', enum: ['devis', 'relance', 'newsletter', 'reponse', 'custom'] },
          },
          required: ['to', 'subject', 'body'],
        },
      },
      {
        name: 'send_email',
        description: 'Envoie un email via Gmail. Utilise create_pending_action pour validation d\'abord.',
        input_schema: {
          type: 'object' as const,
          properties: {
            to: { type: 'string', description: 'Destinataire' },
            subject: { type: 'string', description: 'Objet' },
            body: { type: 'string', description: 'Contenu HTML' },
            cc: { type: 'string', description: 'Copie (optionnel)' },
            reply_to_message_id: { type: 'string', description: 'ID du message auquel repondre' },
            thread_id: { type: 'string', description: 'ID du thread' },
          },
          required: ['to', 'subject', 'body'],
        },
      },
      {
        name: 'label_email',
        description: 'Applique ou retire un label Gmail sur un email',
        input_schema: {
          type: 'object' as const,
          properties: {
            message_id: { type: 'string', description: 'ID du message' },
            add_labels: { type: 'array', items: { type: 'string' }, description: 'Labels a ajouter' },
            remove_labels: { type: 'array', items: { type: 'string' }, description: 'Labels a retirer' },
          },
          required: ['message_id'],
        },
      },
    ],
    leo: [
      {
        name: 'calculate_aids',
        description: 'Calcule les aides disponibles (MaPrimeRenov, CEE, TVA reduite, eco-PTZ) pour un projet ENR',
        input_schema: {
          type: 'object' as const,
          properties: {
            project_type: { type: 'string', enum: ['pompe_a_chaleur', 'panneaux_solaires', 'poele_a_bois', 'poele_a_granules', 'isolation', 'chauffe_eau_solaire', 'chauffe_eau_thermo'] },
            revenue_category: { type: 'string', enum: ['tres_modeste', 'modeste', 'intermediaire', 'superieur'] },
            location: { type: 'string', description: 'Code postal' },
            housing_type: { type: 'string', enum: ['maison', 'appartement'] },
            housing_age: { type: 'number', description: 'Age du logement en annees' },
            surface: { type: 'number', description: 'Surface en m2 (pour isolation)' },
            project_cost: { type: 'number', description: 'Cout du projet HT' },
          },
          required: ['project_type', 'revenue_category', 'location', 'housing_type', 'housing_age'],
        },
      },
      {
        name: 'generate_quote',
        description: 'Genere un devis professionnel au format HTML pour un projet ENR',
        input_schema: {
          type: 'object' as const,
          properties: {
            client_name: { type: 'string', description: 'Nom du client' },
            client_address: { type: 'string', description: 'Adresse du client' },
            client_phone: { type: 'string', description: 'Telephone du client' },
            client_email: { type: 'string', description: 'Email du client' },
            project_type: { type: 'string', enum: ['pompe_a_chaleur', 'panneaux_solaires', 'poele_a_bois', 'poele_a_granules', 'isolation', 'autre'] },
            project_description: { type: 'string', description: 'Description du projet' },
            items: { type: 'array', description: 'Lignes du devis [{description, quantity, unit_price, tva_rate}]', items: { type: 'object' } },
            maprimenov: { type: 'number', description: 'Montant MaPrimeRenov a deduire' },
            cee: { type: 'number', description: 'Montant CEE a deduire' },
            validity_days: { type: 'number', description: 'Duree de validite en jours (defaut: 30)' },
            notes: { type: 'string', description: 'Notes additionnelles' },
          },
          required: ['client_name', 'client_address', 'project_type', 'project_description', 'items'],
        },
      },
      {
        name: 'create_invoice',
        description: 'Cree une facture dans Pennylane. Necessite le connecteur pennylane.',
        input_schema: {
          type: 'object' as const,
          properties: {
            customer_id: { type: 'number', description: 'ID client Pennylane' },
            deadline_days: { type: 'number', description: 'Delai de paiement en jours (defaut: 30)' },
            items: { type: 'array', description: 'Lignes [{label, quantity, unit_price, tva_rate}]', items: { type: 'object' } },
            subject: { type: 'string', description: 'Objet de la facture' },
            draft: { type: 'boolean', description: 'Creer en brouillon (defaut: true)' },
          },
          required: ['customer_id', 'items'],
        },
      },
      {
        name: 'list_invoices',
        description: 'Liste les factures Pennylane avec filtres optionnels',
        input_schema: {
          type: 'object' as const,
          properties: {
            status: { type: 'string', enum: ['draft', 'pending', 'paid', 'late'] },
            customer_id: { type: 'number', description: 'Filtrer par client' },
          },
          required: [],
        },
      },
      {
        name: 'check_unpaid_invoices',
        description: 'Verifie les factures impayees et genere les relances automatiques (J+7, J+14, J+21)',
        input_schema: {
          type: 'object' as const,
          properties: {
            auto_generate_reminders: { type: 'boolean', description: 'Generer automatiquement les actions de relance' },
          },
          required: [],
        },
      },
      {
        name: 'search_customers',
        description: 'Recherche un client dans Pennylane par nom',
        input_schema: {
          type: 'object' as const,
          properties: {
            name: { type: 'string', description: 'Nom du client a rechercher' },
          },
          required: ['name'],
        },
      },
    ],
    felix: [
      {
        name: 'calculate_margin',
        description: 'Calcule la marge sur un devis ou un chantier',
        input_schema: {
          type: 'object' as const,
          properties: {
            revenue: { type: 'number', description: 'Chiffre d\'affaires HT' },
            costs: { type: 'number', description: 'Couts totaux HT' },
            label: { type: 'string', description: 'Libelle du calcul' },
          },
          required: ['revenue', 'costs'],
        },
      },
      {
        name: 'analyze_project_margins',
        description: 'Analyse les marges sur tous les projets/chantiers avec alertes automatiques',
        input_schema: {
          type: 'object' as const,
          properties: {
            projects: { type: 'array', description: 'Liste des projets [{project_id, project_name, client_name, project_type, quote_amount_ht, invoiced_amount_ht, paid_amount, material_cost, labor_cost, subcontractor_cost, other_costs, start_date, status}]', items: { type: 'object' } },
            warning_threshold: { type: 'number', description: 'Seuil alerte marge % (defaut: 20)' },
            critical_threshold: { type: 'number', description: 'Seuil critique marge % (defaut: 10)' },
          },
          required: ['projects'],
        },
      },
      {
        name: 'generate_cash_flow',
        description: 'Genere un previsionnel de tresorerie sur N jours (defaut: 90)',
        input_schema: {
          type: 'object' as const,
          properties: {
            opening_balance: { type: 'number', description: 'Solde de depart en EUR' },
            period_days: { type: 'number', description: 'Nombre de jours de prevision (defaut: 90)' },
            expected_incomes: { type: 'array', description: 'Encaissements prevus [{date, label, amount, category}]', items: { type: 'object' } },
            expected_expenses: { type: 'array', description: 'Decaissements prevus [{date, label, amount, category}]', items: { type: 'object' } },
            recurring_expenses: { type: 'array', description: 'Charges recurrentes [{label, amount, category, day_of_month}]', items: { type: 'object' } },
          },
          required: ['opening_balance'],
        },
      },
      {
        name: 'get_financial_report',
        description: 'Genere un rapport financier consolide avec top/worst projets et alertes',
        input_schema: {
          type: 'object' as const,
          properties: {
            projects: { type: 'array', description: 'Liste des projets', items: { type: 'object' } },
          },
          required: ['projects'],
        },
      },
    ],
    hugo: [
      {
        name: 'get_ad_campaigns',
        description: 'Liste les campagnes Meta Ads actives ou filtrees par statut',
        input_schema: {
          type: 'object' as const,
          properties: {
            status: { type: 'string', enum: ['ACTIVE', 'PAUSED', 'DELETED', 'ARCHIVED'], description: 'Filtrer par statut' },
            limit: { type: 'number', description: 'Nombre max de resultats (defaut: 25)' },
          },
          required: [],
        },
      },
      {
        name: 'get_ad_insights',
        description: 'Recupere les metriques de performance des campagnes Meta Ads (impressions, clics, CPC, CTR, conversions)',
        input_schema: {
          type: 'object' as const,
          properties: {
            campaign_ids: { type: 'array', items: { type: 'string' }, description: 'IDs des campagnes (optionnel, toutes par defaut)' },
            date_preset: { type: 'string', enum: ['today', 'yesterday', 'last_7d', 'last_14d', 'last_30d', 'this_month', 'last_month'] },
            time_range_since: { type: 'string', description: 'Date debut YYYY-MM-DD (alternative a date_preset)' },
            time_range_until: { type: 'string', description: 'Date fin YYYY-MM-DD' },
          },
          required: [],
        },
      },
      {
        name: 'check_budget_alerts',
        description: 'Verifie les alertes budgetaires sur les campagnes Meta Ads (CPC eleve, CTR faible, depassement budget)',
        input_schema: {
          type: 'object' as const,
          properties: {
            max_cpc: { type: 'number', description: 'Seuil CPC max en EUR (defaut: 5)' },
            min_ctr: { type: 'number', description: 'Seuil CTR min en % (defaut: 0.5)' },
            max_daily_spend: { type: 'number', description: 'Budget quotidien max en EUR (defaut: 100)' },
            date_preset: { type: 'string', enum: ['today', 'yesterday', 'last_7d', 'this_month'], description: 'Periode (defaut: last_7d)' },
          },
          required: [],
        },
      },
      {
        name: 'qualify_lead',
        description: 'Score et qualifie un lead (hot/warm/cold) avec recommandation d\'action',
        input_schema: {
          type: 'object' as const,
          properties: {
            name: { type: 'string', description: 'Nom du lead' },
            phone: { type: 'string', description: 'Telephone' },
            email: { type: 'string', description: 'Email' },
            source: { type: 'string', enum: ['meta_ads', 'google_ads', 'website', 'referral', 'manual'] },
            project_type: { type: 'string', description: 'Type de projet ENR' },
            postal_code: { type: 'string', description: 'Code postal' },
            revenue_category: { type: 'string', description: 'Categorie de revenus' },
            housing_type: { type: 'string', description: 'Type de logement' },
            message: { type: 'string', description: 'Message du lead' },
          },
          required: ['name', 'phone', 'source'],
        },
      },
      {
        name: 'send_lead_sms',
        description: 'Envoie un SMS de reponse automatique a un lead (cible < 2min apres soumission)',
        input_schema: {
          type: 'object' as const,
          properties: {
            lead_name: { type: 'string', description: 'Nom du lead' },
            lead_phone: { type: 'string', description: 'Telephone du lead' },
            project_type: { type: 'string', description: 'Type de projet' },
            company_name: { type: 'string', description: 'Nom de l\'entreprise' },
          },
          required: ['lead_name', 'lead_phone', 'company_name'],
        },
      },
      {
        name: 'get_nurture_sequence',
        description: 'Recupere la sequence de nurturing adaptee au niveau de qualification du lead',
        input_schema: {
          type: 'object' as const,
          properties: {
            qualification: { type: 'string', enum: ['hot', 'warm', 'cold'], description: 'Niveau de qualification du lead' },
            lead_name: { type: 'string', description: 'Nom du lead (pour personnaliser les templates)' },
            project_type: { type: 'string', description: 'Type de projet' },
            company_name: { type: 'string', description: 'Nom de l\'entreprise' },
          },
          required: ['qualification'],
        },
      },
    ],
    sofia: [
      {
        name: 'generate_org_chart',
        description: 'Genere un organigramme de l\'entreprise a partir de la liste des employes',
        input_schema: {
          type: 'object' as const,
          properties: {
            employees: { type: 'array', description: 'Liste [{name, role, department, manager?, email?, phone?}]', items: { type: 'object' } },
          },
          required: ['employees'],
        },
      },
      {
        name: 'generate_sop',
        description: 'Cree une procedure operationnelle standard (SOP) structuree',
        input_schema: {
          type: 'object' as const,
          properties: {
            title: { type: 'string', description: 'Titre de la SOP' },
            category: { type: 'string', enum: ['installation', 'maintenance', 'commercial', 'administratif', 'sav', 'autre'] },
            objective: { type: 'string', description: 'Objectif de la procedure' },
            scope: { type: 'string', description: 'Perimetre d\'application' },
            author: { type: 'string', description: 'Auteur' },
            steps: { type: 'array', description: 'Etapes [{order, title, description, responsible, tools?, duration?, notes?}]', items: { type: 'object' } },
            kpis: { type: 'array', items: { type: 'string' }, description: 'KPIs de suivi' },
          },
          required: ['title', 'category', 'objective', 'scope', 'steps'],
        },
      },
      {
        name: 'export_to_notion',
        description: 'Exporte un document (SOP, organigramme) vers Notion',
        input_schema: {
          type: 'object' as const,
          properties: {
            parent_id: { type: 'string', description: 'ID de la page ou base Notion parente' },
            parent_type: { type: 'string', enum: ['database_id', 'page_id'], description: 'Type de parent' },
            title: { type: 'string', description: 'Titre de la page' },
            content_markdown: { type: 'string', description: 'Contenu en markdown' },
          },
          required: ['parent_id', 'parent_type', 'title', 'content_markdown'],
        },
      },
    ],
    iris: [
      {
        name: 'consolidate_kpis',
        description: 'Consolide les KPIs de toutes les sources (ads, email, sav, finance, leads) en un tableau de bord',
        input_schema: {
          type: 'object' as const,
          properties: {
            sources: { type: 'array', description: 'Donnees par source [{source, metrics, period, date_range}]', items: { type: 'object' } },
          },
          required: ['sources'],
        },
      },
      {
        name: 'analyze_roi',
        description: 'Analyse le ROI par canal d\'acquisition (meta_ads, google_ads, referral, website)',
        input_schema: {
          type: 'object' as const,
          properties: {
            channels: { type: 'array', description: 'Donnees par canal [{channel, spend, leads_generated, leads_converted, revenue_generated}]', items: { type: 'object' } },
          },
          required: ['channels'],
        },
      },
      {
        name: 'generate_weekly_report',
        description: 'Genere le rapport hebdomadaire complet (KPIs + ROI + alertes + recommandations) au format HTML',
        input_schema: {
          type: 'object' as const,
          properties: {
            sources: { type: 'array', description: 'Donnees KPI par source', items: { type: 'object' } },
            channels: { type: 'array', description: 'Donnees ROI par canal', items: { type: 'object' } },
          },
          required: ['sources'],
        },
      },
      {
        name: 'send_weekly_report_email',
        description: 'Envoie le rapport hebdomadaire par email au client',
        input_schema: {
          type: 'object' as const,
          properties: {
            to: { type: 'string', description: 'Email du destinataire' },
            report_html: { type: 'string', description: 'Contenu HTML du rapport' },
            subject: { type: 'string', description: 'Objet de l\'email (optionnel)' },
          },
          required: ['to', 'report_html'],
        },
      },
    ],
  }

  return [...commonTools, ...(typeSpecificTools[agentType] || [])]
}

// ============================================
// CONNECTOR TOOL EXECUTION
// ============================================

async function executeConnectorTool(
  toolName: string,
  input: Record<string, unknown>,
  ctx: AgentRunContext
): Promise<unknown> {
  const metaCreds = ctx.connectors.get('meta_api')
  const gmailCreds = ctx.connectors.get('gmail')
  const whatsappCreds = ctx.connectors.get('whatsapp')
  const twilioCreds = ctx.connectors.get('twilio')
  const airtableCreds = ctx.connectors.get('airtable')

  try {
    switch (toolName) {
      // ===== EVA TOOLS =====
      case 'generate_social_post':
        // This is a pure AI tool — just return instructions for Claude to generate
        return { success: true, message: 'Genere le contenu du post en te basant sur le sujet et le ton demandes.' }

      case 'publish_facebook_post': {
        if (!metaCreds) return { success: false, error: 'Connecteur Meta non configure' }
        const pages = await metaApi.getPages(metaCreds.access_token)
        if (pages.length === 0) return { success: false, error: 'Aucune page Facebook trouvee' }
        const page = pages[0]
        const result = await metaApi.publishFacebookPost({
          pageId: page.id,
          accessToken: page.access_token,
          message: input.message as string,
          link: input.link as string | undefined,
          imageUrl: input.image_url as string | undefined,
        })
        return { success: true, post_id: result.id, page_name: page.name }
      }

      case 'publish_instagram_post': {
        if (!metaCreds) return { success: false, error: 'Connecteur Meta non configure' }
        const pages = await metaApi.getPages(metaCreds.access_token)
        if (pages.length === 0) return { success: false, error: 'Aucune page Facebook trouvee' }
        const igUserId = await metaApi.getInstagramBusinessAccount({
          pageId: pages[0].id,
          accessToken: metaCreds.access_token,
        })
        if (!igUserId) return { success: false, error: 'Compte Instagram Business non lie' }
        const result = await metaApi.publishInstagramPost({
          igUserId,
          accessToken: metaCreds.access_token,
          imageUrl: input.image_url as string,
          caption: input.caption as string,
        })
        return { success: true, post_id: result.id }
      }

      case 'get_post_comments': {
        if (!metaCreds) return { success: false, error: 'Connecteur Meta non configure' }
        const comments = await metaApi.getPostComments({
          postId: input.post_id as string,
          accessToken: metaCreds.access_token,
          limit: (input.limit as number) || 25,
        })
        return { success: true, comments, count: comments.length }
      }

      case 'reply_to_comment': {
        if (!metaCreds) return { success: false, error: 'Connecteur Meta non configure' }
        const result = await metaApi.replyToComment({
          commentId: input.comment_id as string,
          message: input.message as string,
          accessToken: metaCreds.access_token,
        })
        return { success: true, reply_id: result.id }
      }

      case 'get_page_insights': {
        if (!metaCreds) return { success: false, error: 'Connecteur Meta non configure' }
        const pages = await metaApi.getPages(metaCreds.access_token)
        if (pages.length === 0) return { success: false, error: 'Aucune page trouvee' }
        const insights = await metaApi.getPageInsights({
          pageId: pages[0].id,
          accessToken: pages[0].access_token,
          period: (input.period as string) || 'week',
        })
        return { success: true, insights, page_name: pages[0].name }
      }

      // ===== LUDO TOOLS =====
      case 'send_whatsapp_message': {
        if (!whatsappCreds) return { success: false, error: 'Connecteur WhatsApp non configure' }
        const result = await whatsappApi.sendWhatsAppMessage({
          phoneNumberId: whatsappCreds.phone_number_id,
          accessToken: whatsappCreds.access_token,
          to: input.to as string,
          text: input.text as string,
        })
        return { success: true, message_id: result.messageId }
      }

      case 'send_sms': {
        if (!twilioCreds) return { success: false, error: 'Connecteur Twilio non configure' }
        const body = new URLSearchParams({
          To: input.to as string,
          From: twilioCreds.phone_number,
          Body: input.text as string,
        })
        const res = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioCreds.account_sid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              Authorization: `Basic ${Buffer.from(`${twilioCreds.account_sid}:${twilioCreds.auth_token}`).toString('base64')}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body.toString(),
          }
        )
        if (!res.ok) throw new Error(`Twilio error: ${res.status}`)
        const data = await res.json()
        return { success: true, sid: data.sid, status: data.status }
      }

      case 'create_sav_ticket': {
        if (!airtableCreds) return { success: false, error: 'Connecteur Airtable non configure' }
        // Use agent config for base/table IDs or defaults
        const agentConf = ctx.agent.config as Record<string, string> || {}
        const baseId = agentConf.airtable_base_id || ''
        const tableId = agentConf.airtable_table_id || 'Tickets SAV'
        if (!baseId) return { success: false, error: 'airtable_base_id non configure dans l\'agent' }
        const record = await airtableApi.createRecord({
          apiKey: airtableCreds.api_key,
          baseId,
          tableId,
          fields: {
            'Client': input.client_name,
            'Telephone': input.phone || '',
            'Categorie': input.category,
            'Priorite': input.priority,
            'Description': input.description,
            'Produit': input.product || '',
            'Statut': 'ouvert',
            'Date': new Date().toISOString().split('T')[0],
          },
        })
        return { success: true, ticket_id: record.id, message: `Ticket cree: ${record.id}` }
      }

      case 'search_sav_tickets': {
        if (!airtableCreds) return { success: false, error: 'Connecteur Airtable non configure' }
        const agentConf = ctx.agent.config as Record<string, string> || {}
        const baseId = agentConf.airtable_base_id || ''
        const tableId = agentConf.airtable_table_id || 'Tickets SAV'
        if (!baseId) return { success: false, error: 'airtable_base_id non configure' }
        const filters: string[] = []
        if (input.client_name) filters.push(`FIND("${input.client_name}", {Client})`)
        if (input.status) filters.push(`{Statut} = "${input.status}"`)
        const filterFormula = filters.length > 0 ? `AND(${filters.join(',')})` : undefined
        const records = await airtableApi.listRecords({
          apiKey: airtableCreds.api_key,
          baseId,
          tableId,
          filterFormula,
          maxRecords: 10,
          sort: [{ field: 'Date', direction: 'desc' }],
        })
        return { success: true, tickets: records.map(r => ({ id: r.id, ...r.fields })), count: records.length }
      }

      case 'classify_sav_request': {
        const classification = whatsappApi.classifySAVRequest(input.text as string)
        return { success: true, ...classification }
      }

      // ===== MARC TOOLS =====
      case 'list_emails': {
        if (!gmailCreds) return { success: false, error: 'Connecteur Gmail non configure' }
        const messages = await gmailApi.listMessages({
          creds: gmailCreds,
          query: input.query as string | undefined,
          maxResults: (input.max_results as number) || 20,
        })
        return {
          success: true,
          emails: messages.map(m => ({
            id: m.id,
            subject: m.subject,
            from: m.from,
            date: m.date,
            snippet: m.snippet,
            labels: m.labelIds,
          })),
          count: messages.length,
        }
      }

      case 'read_email': {
        if (!gmailCreds) return { success: false, error: 'Connecteur Gmail non configure' }
        const msg = await gmailApi.getMessage({
          creds: gmailCreds,
          messageId: input.message_id as string,
        })
        if (!msg) return { success: false, error: 'Email non trouve' }
        return { success: true, email: msg }
      }

      case 'categorize_emails': {
        if (!gmailCreds) return { success: false, error: 'Connecteur Gmail non configure' }
        const unread = await gmailApi.listMessages({
          creds: gmailCreds,
          query: 'is:unread',
          maxResults: (input.max_results as number) || 10,
        })
        const categorized = unread.map(m => ({
          id: m.id,
          subject: m.subject,
          from: m.from,
          category: gmailApi.categorizeEmail(m),
          snippet: m.snippet,
        }))
        const summary: Record<string, number> = {}
        for (const c of categorized) {
          summary[c.category] = (summary[c.category] || 0) + 1
        }
        return { success: true, emails: categorized, summary, total: categorized.length }
      }

      case 'draft_email':
        // Draft is informational — the actual sending goes through create_pending_action
        return {
          success: true,
          message: 'Brouillon prepare. Utilise create_pending_action pour soumettre l\'envoi a validation.',
          draft: {
            to: input.to,
            subject: input.subject,
            body: input.body,
            template: input.template || 'custom',
          },
        }

      case 'send_email': {
        if (!gmailCreds) return { success: false, error: 'Connecteur Gmail non configure' }
        const result = await gmailApi.sendEmail({
          creds: gmailCreds,
          email: {
            to: input.to as string,
            subject: input.subject as string,
            body: input.body as string,
            cc: input.cc as string | undefined,
            replyToMessageId: input.reply_to_message_id as string | undefined,
            threadId: input.thread_id as string | undefined,
          },
        })
        return { success: true, message_id: result.id, thread_id: result.threadId }
      }

      case 'label_email': {
        if (!gmailCreds) return { success: false, error: 'Connecteur Gmail non configure' }
        await gmailApi.modifyLabels({
          creds: gmailCreds,
          messageId: input.message_id as string,
          addLabelIds: input.add_labels as string[] | undefined,
          removeLabelIds: input.remove_labels as string[] | undefined,
        })
        return { success: true, message: 'Labels mis a jour' }
      }

      // ===== LEO TOOLS =====
      case 'calculate_aids': {
        const result = aidsCalc.calculateAids({
          project_type: input.project_type as aidsCalc.ProjectType,
          revenue_category: input.revenue_category as aidsCalc.RevenueCategory,
          location: input.location as string,
          housing_type: ((input.housing_type as string) || 'maison') as 'maison' | 'appartement',
          housing_age: (input.housing_age as number) || 20,
          surface: input.surface as number | undefined,
          project_cost: input.project_cost as number | undefined,
        })
        return { success: true, ...result }
      }

      case 'generate_quote': {
        const items = (input.items as Array<{ description: string; quantity: number; unit_price: number; tva_rate?: number }>).map(item => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tva_rate: item.tva_rate || 5.5,
        }))
        const aids: quotesLib.QuoteData['aids'] = {}
        if (input.maprimenov) aids.maprimenov = input.maprimenov as number
        if (input.cee) aids.cee = input.cee as number

        const agentConf = ctx.agent.config as Record<string, string> || {}
        const quoteNumber = quotesLib.generateQuoteNumber('DEV')
        const result = quotesLib.generateQuoteHTML({
          company_name: agentConf.company_name || 'Entreprise ENR',
          company_address: agentConf.company_address || '',
          company_phone: agentConf.company_phone || '',
          company_email: agentConf.company_email || '',
          company_siret: agentConf.company_siret || '',
          client_name: input.client_name as string,
          client_address: input.client_address as string,
          client_phone: input.client_phone as string || '',
          client_email: input.client_email as string || '',
          quote_number: quoteNumber,
          date: new Date().toLocaleDateString('fr-FR'),
          project_type: input.project_type as quotesLib.QuoteData['project_type'],
          project_description: input.project_description as string,
          items,
          aids,
          validity_days: (input.validity_days as number) || 30,
          notes: input.notes as string || '',
        })
        return { success: true, ...result }
      }

      case 'create_invoice': {
        const pennylaneCreds = ctx.connectors.get('pennylane')
        if (!pennylaneCreds) return { success: false, error: 'Connecteur Pennylane non configure' }
        const auth = { api_key: pennylaneCreds.api_key }
        const today = new Date().toISOString().split('T')[0]
        const deadlineDays = (input.deadline_days as number) || 30
        const deadline = new Date(Date.now() + deadlineDays * 86400000).toISOString().split('T')[0]
        const items = (input.items as Array<{ label: string; quantity: number; unit_price: number; tva_rate?: number }>).map(item => ({
          label: item.label,
          quantity: item.quantity,
          unit_price: pennylaneApi.amountToCents(item.unit_price),
          vat_rate: pennylaneApi.getVATRateCode(item.tva_rate || 20),
          unit: 'piece',
        }))
        const invoice = await pennylaneApi.createInvoice(auth, {
          customer_id: input.customer_id as number,
          date: today,
          deadline,
          draft: input.draft !== false,
          currency: 'EUR',
          line_items: items,
          pdf_invoice_subject: input.subject as string || '',
        })
        return { success: true, invoice_id: invoice.id, invoice_number: invoice.invoice_number, status: invoice.status, total: invoice.total }
      }

      case 'list_invoices': {
        const pennylaneCreds = ctx.connectors.get('pennylane')
        if (!pennylaneCreds) return { success: false, error: 'Connecteur Pennylane non configure' }
        const auth = { api_key: pennylaneCreds.api_key }
        const result = await pennylaneApi.listInvoices(auth, {
          status: input.status as 'draft' | 'pending' | 'paid' | 'late' | undefined,
          customer_id: input.customer_id as number | undefined,
        })
        return { success: true, invoices: result.invoices, total: result.total }
      }

      case 'check_unpaid_invoices': {
        const pennylaneCreds = ctx.connectors.get('pennylane')
        if (!pennylaneCreds) return { success: false, error: 'Connecteur Pennylane non configure' }
        const auth = { api_key: pennylaneCreds.api_key }
        const unpaid = await pennylaneApi.getUnpaidInvoices(auth)
        const agentConf = ctx.agent.config as Record<string, string> || {}
        const companyName = agentConf.company_name || 'Entreprise'

        const unpaidInvoices: remindersLib.UnpaidInvoice[] = unpaid.map(inv => ({
          invoice_id: String(inv.id),
          invoice_number: inv.invoice_number,
          customer_name: inv.customer.name,
          customer_email: '',
          amount: inv.total,
          currency: inv.currency,
          due_date: inv.deadline,
          days_overdue: remindersLib.calculateDaysOverdue(inv.deadline),
        }))

        if (input.auto_generate_reminders) {
          const actions = remindersLib.generateReminderActions(unpaidInvoices, companyName)
          return { success: true, unpaid_count: unpaidInvoices.length, invoices: unpaidInvoices, reminder_actions: actions }
        }
        return { success: true, unpaid_count: unpaidInvoices.length, invoices: unpaidInvoices }
      }

      case 'search_customers': {
        const pennylaneCreds = ctx.connectors.get('pennylane')
        if (!pennylaneCreds) return { success: false, error: 'Connecteur Pennylane non configure' }
        const auth = { api_key: pennylaneCreds.api_key }
        const result = await pennylaneApi.listCustomers(auth, { filter: input.name as string })
        return { success: true, customers: result.customers, total: result.total }
      }

      // ===== HUGO TOOLS =====
      case 'get_ad_campaigns': {
        const metaAdsCreds = ctx.connectors.get('meta_ads')
        if (!metaAdsCreds) return { success: false, error: 'Connecteur Meta Ads non configure' }
        const auth = { access_token: metaAdsCreds.access_token, ad_account_id: metaAdsCreds.ad_account_id }
        const campaigns = await metaAdsApi.listCampaigns(auth, {
          status: input.status as 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED' | undefined,
          limit: input.limit as number | undefined,
        })
        return { success: true, campaigns, count: campaigns.length }
      }

      case 'get_ad_insights': {
        const metaAdsCreds = ctx.connectors.get('meta_ads')
        if (!metaAdsCreds) return { success: false, error: 'Connecteur Meta Ads non configure' }
        const auth = { access_token: metaAdsCreds.access_token, ad_account_id: metaAdsCreds.ad_account_id }
        const params: Parameters<typeof metaAdsApi.getCampaignInsights>[1] = {}
        if (input.campaign_ids) params.campaign_ids = input.campaign_ids as string[]
        if (input.time_range_since && input.time_range_until) {
          params.time_range = { since: input.time_range_since as string, until: input.time_range_until as string }
        } else {
          params.date_preset = (input.date_preset as string || 'last_7d') as 'last_7d'
        }
        const insights = await metaAdsApi.getCampaignInsights(auth, params)
        const report = metaAdsApi.generateAdReport(insights, [])
        return { success: true, insights, report }
      }

      case 'check_budget_alerts': {
        const metaAdsCreds = ctx.connectors.get('meta_ads')
        if (!metaAdsCreds) return { success: false, error: 'Connecteur Meta Ads non configure' }
        const auth = { access_token: metaAdsCreds.access_token, ad_account_id: metaAdsCreds.ad_account_id }
        const datePreset = (input.date_preset as string || 'last_7d') as 'last_7d'
        const insights = await metaAdsApi.getCampaignInsights(auth, { date_preset: datePreset })
        const alerts = metaAdsApi.checkBudgetAlerts(insights, {
          max_cpc: input.max_cpc as number | undefined,
          min_ctr: input.min_ctr as number | undefined,
          max_daily_spend: input.max_daily_spend as number | undefined,
        })
        const report = metaAdsApi.generateAdReport(insights, alerts)
        return { success: true, alerts, alert_count: alerts.length, report }
      }

      case 'qualify_lead': {
        const lead: leadsLib.Lead = {
          name: input.name as string,
          phone: input.phone as string,
          email: input.email as string | undefined,
          source: input.source as leadsLib.Lead['source'],
          project_type: input.project_type as string | undefined,
          postal_code: input.postal_code as string | undefined,
          revenue_category: input.revenue_category as string | undefined,
          housing_type: input.housing_type as string | undefined,
          message: input.message as string | undefined,
          created_at: new Date().toISOString(),
          status: 'new',
        }
        const score = leadsLib.scoreLead(lead)
        return { success: true, lead, score }
      }

      case 'send_lead_sms': {
        if (!twilioCreds) return { success: false, error: 'Connecteur Twilio non configure' }
        const lead: leadsLib.Lead = {
          name: input.lead_name as string,
          phone: input.lead_phone as string,
          source: 'manual',
          project_type: input.project_type as string | undefined,
          created_at: new Date().toISOString(),
          status: 'new',
        }
        const smsText = leadsLib.generateAutoResponseSMS(lead, input.company_name as string)
        const body = new URLSearchParams({
          To: input.lead_phone as string,
          From: twilioCreds.phone_number,
          Body: smsText,
        })
        const res = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioCreds.account_sid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              Authorization: `Basic ${Buffer.from(`${twilioCreds.account_sid}:${twilioCreds.auth_token}`).toString('base64')}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body.toString(),
          }
        )
        if (!res.ok) throw new Error(`Twilio error: ${res.status}`)
        const data = await res.json()
        return { success: true, sid: data.sid, sms_text: smsText }
      }

      case 'get_nurture_sequence': {
        const qualification = input.qualification as 'hot' | 'warm' | 'cold'
        const sequence = leadsLib.getNurtureSequence(qualification)
        if (!sequence) {
          return { success: true, message: 'Lead chaud: pas de sequence de nurturing, contact direct recommande.' }
        }
        // Render templates with available variables
        const variables: Record<string, string> = {
          name: (input.lead_name as string) || '{name}',
          project_type: (input.project_type as string) || '{project_type}',
          company: (input.company_name as string) || '{company}',
        }
        const renderedSteps = sequence.steps.map(step => ({
          day: step.day,
          channel: step.channel,
          subject: step.subject ? leadsLib.renderTemplate(step.subject, variables) : undefined,
          content: leadsLib.renderTemplate(step.template, variables),
        }))
        return { success: true, sequence_name: sequence.name, target: sequence.target, steps: renderedSteps }
      }

      // ===== SOFIA TOOLS =====
      case 'generate_org_chart': {
        const employees = input.employees as sofiaLib.Employee[]
        const result = sofiaLib.buildOrgChart(employees)
        return { success: true, total_employees: result.total_employees, departments: result.departments, html: result.html }
      }

      case 'generate_sop': {
        const doc: sofiaLib.SOPDocument = {
          title: input.title as string,
          category: input.category as sofiaLib.SOPDocument['category'],
          version: '1.0',
          created_at: new Date().toLocaleDateString('fr-FR'),
          author: (input.author as string) || 'Sofia',
          objective: input.objective as string,
          scope: input.scope as string,
          steps: input.steps as sofiaLib.SOPStep[],
          kpis: input.kpis as string[] | undefined,
        }
        const result = sofiaLib.generateSOP(doc)
        return { success: true, ...result }
      }

      case 'export_to_notion': {
        const notionCreds = ctx.connectors.get('notion' as ConnectorType)
        if (!notionCreds) return { success: false, error: 'Connecteur Notion non configure' }
        const auth = { api_key: notionCreds.api_key }
        const result = await sofiaLib.createNotionPage(auth, {
          parent_id: input.parent_id as string,
          parent_type: input.parent_type as 'database_id' | 'page_id',
          title: input.title as string,
          content_markdown: input.content_markdown as string,
        })
        return { success: true, page_id: result.id, url: result.url }
      }

      // ===== FELIX TOOLS =====
      case 'analyze_project_margins': {
        const projects = input.projects as felixLib.ProjectFinancials[]
        const result = felixLib.analyzeAllMargins(projects)
        return {
          success: true,
          analyses: result.analyses,
          alerts: result.alerts,
          dashboard: result.dashboard,
          report: felixLib.generateFinancialReport(result.dashboard),
        }
      }

      case 'generate_cash_flow': {
        const result = felixLib.generateCashFlowForecast({
          opening_balance: input.opening_balance as number,
          period_days: (input.period_days as number) || 90,
          expected_incomes: (input.expected_incomes as felixLib.CashFlowForecast['entries']) || [],
          expected_expenses: (input.expected_expenses as felixLib.CashFlowForecast['entries']) || [],
          recurring_expenses: input.recurring_expenses as { label: string; amount: number; category: string; day_of_month: number }[] | undefined,
        })
        return {
          success: true,
          summary: result.summary,
          entries_count: result.entries.length,
          report: felixLib.generateCashFlowReport(result),
        }
      }

      case 'get_financial_report': {
        const projects = input.projects as felixLib.ProjectFinancials[]
        const result = felixLib.analyzeAllMargins(projects)
        return {
          success: true,
          report: felixLib.generateFinancialReport(result.dashboard),
          dashboard: result.dashboard,
        }
      }

      // ===== IRIS TOOLS =====
      case 'consolidate_kpis': {
        const sources = input.sources as irisLib.KPISource[]
        const kpis = irisLib.consolidateKPIs(sources)
        return { success: true, kpis }
      }

      case 'analyze_roi': {
        const channels = input.channels as { channel: string; spend: number; leads_generated: number; leads_converted: number; revenue_generated: number }[]
        const roi = irisLib.analyzeChannelROI(channels)
        return { success: true, roi_by_channel: roi }
      }

      case 'generate_weekly_report': {
        const sources = input.sources as irisLib.KPISource[]
        const channels = (input.channels as { channel: string; spend: number; leads_generated: number; leads_converted: number; revenue_generated: number }[]) || []
        const kpis = irisLib.consolidateKPIs(sources)
        const roi = irisLib.analyzeChannelROI(channels)
        const report = irisLib.generateWeeklyReport(kpis, roi)
        return { success: true, title: report.title, highlights: report.highlights, alerts: report.alerts, recommendations: report.recommendations, html: report.html }
      }

      case 'send_weekly_report_email': {
        const gmailCreds = ctx.connectors.get('gmail')
        if (!gmailCreds) return { success: false, error: 'Connecteur Gmail non configure' }
        const subject = (input.subject as string) || `📊 Rapport Hebdomadaire — ${new Date().toLocaleDateString('fr-FR')}`
        const result = await gmailApi.sendEmail({
          creds: gmailCreds,
          email: {
            to: input.to as string,
            subject,
            body: input.report_html as string,
          },
        })
        return { success: true, message_id: result.id, message: `Rapport envoye a ${input.to}` }
      }

      default:
        return { success: true, result: `Tool ${toolName} executed (no specific handler)`, input }
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: msg }
  }
}

// ============================================
// AGENT RUNNER
// ============================================

export async function runAgent(context: AgentContext): Promise<AgentResult> {
  const startTime = Date.now()
  const supabase = createServiceRoleClient()

  // Load agent record
  const { data: agent } = await supabase
    .from('agents')
    .select('*')
    .eq('client_id', context.clientId)
    .eq('type', context.agentType)
    .single()

  if (!agent) throw new Error(`Agent ${context.agentType} not found for client ${context.clientId}`)
  if (!agent.active) throw new Error(`Agent ${agent.name} is inactive`)

  // Check onboarding score — agents blocked if < 80%
  const { data: clientData } = await supabase
    .from('clients')
    .select('onboarding_score')
    .eq('id', context.clientId)
    .single()

  const onboardingScore = (clientData as Record<string, unknown>)?.onboarding_score as number | undefined
  if (onboardingScore !== undefined && onboardingScore < 80) {
    throw new Error(`Onboarding incomplet (${onboardingScore}%). Completez l'onboarding pour activer vos agents.`)
  }

  const agentConfig = getAgentConfig(context.agentType)

  // Load connected connectors for this agent
  const connectorTypes = agentConfig.connectors as ConnectorType[]
  const { data: connectors } = await supabase
    .from('connectors')
    .select('*')
    .eq('client_id', context.clientId)
    .eq('status', 'active')
    .in('type', connectorTypes)

  const connectorMap = new Map<ConnectorType, Record<string, string>>()
  for (const conn of connectors || []) {
    if (conn.credentials_encrypted) {
      try {
        connectorMap.set(conn.type as ConnectorType, decryptCredentials(conn.credentials_encrypted))
      } catch {
        // Skip connectors with invalid credentials
      }
    }
  }

  // Build system prompt
  const systemPrompt = agent.system_prompt || AGENT_SYSTEM_PROMPTS[context.agentType]
  const connectorInfo = connectorTypes.map(t => {
    const connected = connectorMap.has(t)
    return `- ${t}: ${connected ? 'connecte' : 'non connecte'}`
  }).join('\n')

  const fullSystemPrompt = `${systemPrompt}

Connecteurs disponibles :
${connectorInfo}

Context : trigger=${context.trigger || 'manual'}`

  // Call Claude API with prompt caching for cost optimization
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const tools = getAgentTools(context.agentType)
  const actions: AgentAction[] = []
  let totalTokens = 0
  let cacheReadTokens = 0
  let cacheCreationTokens = 0

  const messages: Anthropic.MessageParam[] = []
  if (context.userMessage) {
    messages.push({ role: 'user', content: context.userMessage })
  } else {
    messages.push({ role: 'user', content: `Trigger: ${context.trigger || 'manual'}. Analyse la situation et propose des actions.` })
  }

  // System prompt with cache_control for prompt caching
  // This caches the system prompt across calls with the same agent type,
  // saving ~90% on input tokens for repeated calls
  const systemWithCache = [
    {
      type: 'text' as const,
      text: fullSystemPrompt,
      cache_control: { type: 'ephemeral' as const },
    },
  ]

  // Agent loop (max 5 iterations for tool use)
  let response: Anthropic.Message
  let iterations = 0
  const maxIterations = 5

  while (iterations < maxIterations) {
    iterations++
    response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6-20250514',
      max_tokens: 4096,
      system: systemWithCache,
      tools,
      messages,
    })

    totalTokens += (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0)
    // Track cache usage for cost monitoring
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const usage = response.usage as any
    cacheReadTokens += (usage?.cache_read_input_tokens as number) || 0
    cacheCreationTokens += (usage?.cache_creation_input_tokens as number) || 0

    // Check if we need to handle tool use
    const toolUseBlocks = response.content.filter(b => b.type === 'tool_use')
    if (toolUseBlocks.length === 0 || response.stop_reason !== 'tool_use') break

    // Process tool calls
    const toolResults: Anthropic.ToolResultBlockParam[] = []

    for (const block of toolUseBlocks) {
      if (block.type !== 'tool_use') continue
      const input = block.input as Record<string, unknown>

      if (block.name === 'create_pending_action') {
        const action: AgentAction = {
          type: (input.action_type as string) || 'unknown',
          title: (input.title as string) || '',
          description: (input.description as string) || '',
          payload: (input.payload as Record<string, unknown>) || {},
          requiresApproval: true,
        }
        actions.push(action)

        // Save to database
        await supabase.from('pending_actions').insert({
          agent_id: agent.id,
          client_id: context.clientId,
          action_type: action.type,
          title: action.title,
          description: action.description,
          payload: action.payload,
          status: 'pending',
        })

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify({ success: true, message: 'Action en attente de validation' }),
        })
      } else if (block.name === 'log_activity') {
        await supabase.from('agent_logs').insert({
          agent_id: agent.id,
          client_id: context.clientId,
          action: (input.action as string) || 'Activity',
          status: (input.status as string) || 'info',
          payload_summary: (input.details as string) || null,
          tokens_used: 0,
          duration_ms: 0,
        })

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify({ success: true }),
        })
      } else {
        // Execute connector-backed tools
        const toolResult = await executeConnectorTool(block.name, input, {
          agent,
          config: agentConfig,
          clientId: context.clientId,
          connectors: connectorMap,
        })
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(toolResult),
        })
      }
    }

    // Add assistant message + tool results to conversation
    messages.push({ role: 'assistant', content: response.content })
    messages.push({ role: 'user', content: toolResults })
  }

  // Extract text response
  const textBlocks = response!.content.filter(b => b.type === 'text')
  const responseText = textBlocks.map(b => b.type === 'text' ? b.text : '').join('\n')

  const durationMs = Date.now() - startTime

  // Log the run with cache stats
  const cacheSavings = cacheReadTokens > 0 ? ` (cache: ${cacheReadTokens} read, ${cacheCreationTokens} created)` : ''
  await supabase.from('agent_logs').insert({
    agent_id: agent.id,
    client_id: context.clientId,
    action: `Run: ${context.trigger || 'manual'}${context.userMessage ? ` - "${context.userMessage.slice(0, 100)}"` : ''}`,
    status: 'success',
    payload_summary: `${actions.length} action(s), ${totalTokens} tokens${cacheSavings}`,
    tokens_used: totalTokens,
    duration_ms: durationMs,
  })

  return {
    success: true,
    response: responseText,
    actions,
    tokensUsed: totalTokens,
    durationMs,
  }
}
