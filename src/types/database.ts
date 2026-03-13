export type UserRole = 'admin' | 'client'
export type PlanType = 'basic' | 'pro' | 'full'
export type AgentType = 'eva' | 'ludo' | 'marc' | 'leo' | 'hugo' | 'sofia' | 'felix' | 'iris'
export type ConnectorType =
  | 'gmail' | 'outlook' | 'brevo' | 'mailchimp'
  | 'whatsapp' | 'twilio'
  | 'meta_api' | 'linkedin_api'
  | 'meta_ads' | 'google_ads'
  | 'airtable' | 'hubspot'
  | 'notion' | 'google_docs'
  | 'canva'
  | 'google_analytics'
  | 'pennylane' | 'sellsy' | 'quickbooks' | 'google_sheets'
  | 'make_com'
export type ConnectorStatus = 'active' | 'inactive' | 'error'
export type ActionStatus = 'pending' | 'approved' | 'rejected' | 'executed' | 'failed'
export type LogStatus = 'success' | 'error' | 'warning' | 'info'
export type ToneOfVoice = 'professionnel' | 'chaleureux' | 'technique' | 'familier'

// ============================================
// Onboarding / Company Memory types
// ============================================

export interface OnboardingProduct {
  name: string
  brand: string
  price_range: string
  description: string
}

export interface SavScript {
  trigger: string
  response: string
}

export interface FaqEntry {
  question: string
  answer: string
}

export interface Objection {
  objection: string
  response: string
}

export interface CompanyMemory {
  id: string
  client_id: string
  // Identite (Etape 1)
  company_description: string | null
  founding_year: number | null
  geographic_zone: string | null
  certifications: string[]
  team_size: number | null
  brand_values: string[]
  // Catalogue (Etape 2)
  products: OnboardingProduct[]
  service_zone: string | null
  intervention_delays: string | null
  available_subsidies: string[]
  exclusion_zones: string | null
  // Commercial (Etape 3)
  typical_client_profile: string | null
  sales_process: string | null
  average_ticket: number | null
  objections: Objection[]
  competitors: string[]
  differentiators: string[]
  // Communication (Etape 4)
  tone_of_voice: ToneOfVoice
  formal_address: boolean
  words_to_avoid: string[]
  example_messages: string[]
  email_signature: string | null
  // SAV & Finance (Etape 5)
  sav_scripts: SavScript[]
  faq: FaqEntry[]
  emergency_contact: string | null
  response_delay: string | null
  target_margin: number
  hourly_rate: number | null
  payment_reminder_process: string | null
  // Meta
  raw_responses: Record<string, unknown>
  updated_at: string
}

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface ClientBranding {
  logo_url: string | null
  primary_color: string       // hex color
  secondary_color: string     // hex color
  accent_color: string        // hex color
}

export interface Client {
  id: string
  user_id: string
  company_name: string
  plan: PlanType
  active_agents: AgentType[]
  phone: string | null
  address: string | null
  siret: string | null
  onboarded_at: string | null
  onboarding_step: number
  onboarding_score: number
  is_active: boolean
  branding: ClientBranding | null
  created_at: string
  updated_at: string
}

export interface Connector {
  id: string
  client_id: string
  type: ConnectorType
  label: string | null
  credentials_encrypted: string | null
  status: ConnectorStatus
  last_tested_at: string | null
  config: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Agent {
  id: string
  client_id: string
  type: AgentType
  name: string
  active: boolean
  system_prompt: string | null
  config: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface AgentLog {
  id: string
  agent_id: string
  client_id: string
  action: string
  status: LogStatus
  payload_summary: string | null
  tokens_used: number
  duration_ms: number
  created_at: string
}

export interface PendingAction {
  id: string
  agent_id: string
  client_id: string
  action_type: string
  title: string
  description: string | null
  payload: Record<string, unknown>
  status: ActionStatus
  approved_by: string | null
  approved_at: string | null
  executed_at: string | null
  created_at: string
}

export interface KPI {
  id: string
  client_id: string
  agent_id: string | null
  week: string
  metric_key: string
  metric_value: number
  created_at: string
}

// Supabase Database type
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Partial<Profile> & { id: string; email: string }
        Update: Partial<Profile>
      }
      clients: {
        Row: Client
        Insert: Omit<Client, 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<Client>
      }
      connectors: {
        Row: Connector
        Insert: Omit<Connector, 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<Connector>
      }
      agents: {
        Row: Agent
        Insert: Omit<Agent, 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<Agent>
      }
      agent_logs: {
        Row: AgentLog
        Insert: Omit<AgentLog, 'id' | 'created_at'> & { id?: string }
        Update: Partial<AgentLog>
      }
      pending_actions: {
        Row: PendingAction
        Insert: Omit<PendingAction, 'id' | 'created_at'> & { id?: string }
        Update: Partial<PendingAction>
      }
      kpis: {
        Row: KPI
        Insert: Omit<KPI, 'id' | 'created_at'> & { id?: string }
        Update: Partial<KPI>
      }
    }
  }
}
