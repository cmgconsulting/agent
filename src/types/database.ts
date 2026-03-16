export type UserRole = 'admin' | 'client'
export type PlanType = 'starter' | 'pro' | 'enterprise'
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
// Custom Connectors types
// ============================================

export type CustomConnectorType = 'api_rest' | 'mcp'
export type AuthMethod = 'api_key' | 'oauth2' | 'bearer_token' | 'basic_auth' | 'none'

export interface McpDiscoveredTool {
  name: string
  description: string
  input_schema: Record<string, unknown>
}

export interface McpConfig {
  server_url: string
  transport: 'sse' | 'stdio'
  discovered_tools?: McpDiscoveredTool[]
}

export interface CustomConnector {
  id: string
  client_id: string
  name: string
  description: string | null
  connector_type: CustomConnectorType
  base_url: string | null
  http_method: string
  auth_method: AuthMethod
  credentials_encrypted: string | null
  custom_headers: Record<string, string>
  mcp_config: McpConfig | null
  status: ConnectorStatus
  last_error: string | null
  last_tested_at: string | null
  created_at: string
  updated_at: string
}

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

// ============================================
// ROI Tracking types
// ============================================

export type UsageLogStatus = 'success' | 'error'

export interface AgentUsageLog {
  id: string
  client_id: string
  agent_id: string
  user_id: string
  task_type: string
  estimated_human_minutes: number
  agent_duration_seconds: number
  tokens_used: number
  status: UsageLogStatus
  error_message: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface RoiConfig {
  id: string
  client_id: string
  hourly_cost_euros: number
  currency: string
  created_at: string
  updated_at: string
}

// Task type → estimated human time mapping (in minutes)
export const TASK_HUMAN_TIME_MAP: Record<string, number> = {
  'redaction_proposition': 120,
  'redaction_email': 30,
  'redaction_post_social': 45,
  'veille_sectorielle': 45,
  'analyse_reglementaire': 90,
  'rapport_kpi': 60,
  'reponse_sav': 20,
  'creation_devis': 45,
  'analyse_financiere': 90,
  'planification_intervention': 30,
  'creation_sop': 120,
  'campagne_marketing': 60,
  'reponse_generale': 15,
}

// ============================================
// Workflow types
// ============================================

export type WorkflowStatus = 'draft' | 'active' | 'paused'
export type WorkflowTriggerType = 'manual' | 'schedule' | 'event' | 'webhook'
export type WorkflowExecutionStatus = 'running' | 'completed' | 'failed' | 'cancelled'
export type WorkflowStepStatus = 'pending' | 'running' | 'success' | 'error' | 'skipped'
export type WorkflowOnError = 'stop' | 'skip' | 'retry'

export interface Workflow {
  id: string
  client_id: string
  name: string
  description: string | null
  status: WorkflowStatus
  trigger_type: WorkflowTriggerType
  trigger_config: Record<string, unknown>
  created_by: string
  created_at: string
  updated_at: string
}

export interface WorkflowStep {
  id: string
  workflow_id: string
  step_order: number
  agent_id: string
  prompt_template: string
  condition: Record<string, unknown> | null
  timeout_seconds: number
  on_error: WorkflowOnError
  created_at: string
  updated_at: string
}

export interface WorkflowExecution {
  id: string
  workflow_id: string
  client_id: string
  status: WorkflowExecutionStatus
  trigger_data: Record<string, unknown>
  started_at: string
  completed_at: string | null
  error: string | null
}

export interface WorkflowStepResult {
  id: string
  execution_id: string
  step_id: string
  agent_id: string
  input: Record<string, unknown>
  output: string | null
  status: WorkflowStepStatus
  duration_ms: number | null
  tokens_used: number | null
  started_at: string | null
  completed_at: string | null
}

// ============================================
// Conversation History types
// ============================================

export type ConversationStatus = 'active' | 'archived'
export type MessageRole = 'user' | 'assistant' | 'system'
export type FeedbackType = 'positive' | 'negative'
export type PreferredTone = 'formel' | 'decontracte' | 'technique'
export type PreferredLength = 'concis' | 'detaille' | 'exhaustif'

export interface Conversation {
  id: string
  client_id: string
  user_id: string
  agent_id: string
  title: string | null
  status: ConversationStatus
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  conversation_id: string
  role: MessageRole
  content: string
  tokens_used: number
  feedback: FeedbackType | null
  feedback_comment: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface ClientPreference {
  id: string
  client_id: string
  agent_id: string
  preferred_tone: PreferredTone
  preferred_length: PreferredLength
  custom_instructions: string | null
  good_examples: string[]
  updated_at: string
}

// ============================================
// Client Branding Config types
// ============================================

export type BrandFont = 'Inter' | 'Roboto' | 'Lato' | 'Montserrat' | 'Open Sans' | 'Poppins'

export interface ClientBrandingConfig {
  id: string
  client_id: string
  logo_url: string | null
  primary_color: string
  secondary_color: string
  font_family: BrandFont
  slogan: string | null
  address: string | null
  phone: string | null
  contact_email: string | null
  website: string | null
  legal_mentions: string | null
  templates: Record<string, unknown>
  created_at: string
  updated_at: string
}

// ============================================
// Team Collaboration types
// ============================================

export type TeamRole = 'owner' | 'manager' | 'member' | 'viewer'
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type NotificationType = 'share' | 'assignment' | 'mention' | 'agent_alert'

export interface SharedConversation {
  id: string
  conversation_id: string
  shared_by: string
  shared_with_team: boolean
  shared_with_users: string[]
  note: string | null
  created_at: string
}

export interface TaskAssignment {
  id: string
  client_id: string
  conversation_id: string | null
  title: string
  description: string | null
  assigned_to: string
  assigned_by: string
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  agent_source: string | null
  created_at: string
  updated_at: string
}

export interface TeamNotification {
  id: string
  client_id: string
  user_id: string
  type: NotificationType
  title: string
  body: string | null
  reference_type: string | null
  reference_id: string | null
  read: boolean
  created_at: string
}

// ============================================
// Knowledge Base types
// ============================================

export type KnowledgeCategory = 'produits' | 'services' | 'technique' | 'commercial' | 'juridique' | 'rh' | 'autre'
export type KnowledgeFileType = 'pdf' | 'docx' | 'txt' | 'csv' | 'md' | 'xlsx' | 'url'
export type KnowledgeDocStatus = 'pending' | 'processing' | 'ready' | 'error'

export interface KnowledgeDocumentMetadata {
  version?: string
  author?: string
  tags?: string[]
  page_count?: number
}

export interface KnowledgeDocument {
  id: string
  client_id: string
  title: string
  description: string | null
  category: KnowledgeCategory
  file_type: KnowledgeFileType
  file_size: number | null
  storage_path: string | null
  source_url: string | null
  raw_text: string | null
  status: KnowledgeDocStatus
  processing_error: string | null
  chunks_count: number
  metadata: KnowledgeDocumentMetadata
  created_at: string
  updated_at: string
}

export interface KnowledgeChunk {
  id: string
  document_id: string
  client_id: string
  content: string
  chunk_index: number
  metadata: Record<string, unknown>
  created_at: string
}

// ============================================
// Real-time Agent Tracking types
// ============================================

export type AgentSessionStatus = 'idle' | 'thinking' | 'executing' | 'completed' | 'error'
export type AgentSessionTrigger = 'manual' | 'scheduled' | 'webhook' | 'event'

export interface AgentSession {
  id: string
  client_id: string
  agent_id: string
  user_id: string | null
  status: AgentSessionStatus
  trigger: AgentSessionTrigger
  input_preview: string | null
  output_preview: string | null
  tokens_used: number
  tools_called: number
  duration_ms: number | null
  error_message: string | null
  started_at: string
  completed_at: string | null
  created_at: string
  updated_at: string
}

export type ActivityEventType = 'status_change' | 'tool_call' | 'tool_result' | 'message' | 'error' | 'warning'

export interface AgentActivityEvent {
  id: string
  session_id: string
  client_id: string
  event_type: ActivityEventType
  event_data: Record<string, unknown>
  created_at: string
}

// ============================================
// Scheduled Tasks types
// ============================================

export type ScheduleType = 'once' | 'daily' | 'weekly' | 'monthly' | 'cron'
export type ScheduledTaskType = 'agent_run' | 'workflow_run'
export type TaskRunStatus = 'running' | 'completed' | 'failed' | 'skipped'
export type TaskRunTrigger = 'cron' | 'manual' | 'retry'

export interface ScheduleConfig {
  run_at?: string
  time?: string
  timezone?: string
  day?: number
  day_of_month?: number
  expression?: string
}

export interface ScheduledTask {
  id: string
  client_id: string
  name: string
  description: string | null
  task_type: ScheduledTaskType
  agent_id: string | null
  workflow_id: string | null
  prompt: string | null
  trigger_data: Record<string, unknown>
  schedule_type: ScheduleType
  schedule_config: ScheduleConfig
  cron_expression: string | null
  timezone: string
  active: boolean
  next_run_at: string | null
  last_run_at: string | null
  locked_until: string | null
  lock_key: string | null
  run_count: number
  error_count: number
  last_error: string | null
  max_retries: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ScheduledTaskRun {
  id: string
  task_id: string
  client_id: string
  status: TaskRunStatus
  output: string | null
  error_message: string | null
  tokens_used: number
  duration_ms: number | null
  triggered_by: TaskRunTrigger
  started_at: string
  completed_at: string | null
}

// ============================================
// Social Media types
// ============================================

export type SocialPlatform = 'facebook' | 'instagram' | 'linkedin' | 'twitter' | 'tiktok' | 'google_ads'
export type SocialAccountStatus = 'active' | 'inactive' | 'expired' | 'error'
export type PostType = 'text' | 'image' | 'video' | 'carousel' | 'story' | 'reel'
export type PostStatus = 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed'
export type CampaignObjective = 'awareness' | 'traffic' | 'engagement' | 'leads' | 'sales'
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived'

export interface SocialAccount {
  id: string
  client_id: string
  platform: SocialPlatform
  platform_user_id: string
  platform_username: string | null
  display_name: string | null
  profile_image_url: string | null
  access_token_encrypted: string | null
  refresh_token_encrypted: string | null
  token_expires_at: string | null
  scopes: string[]
  page_id: string | null
  page_name: string | null
  status: SocialAccountStatus
  last_error: string | null
  last_synced_at: string | null
  connected_at: string
  created_at: string
  updated_at: string
}

export interface SocialPost {
  id: string
  client_id: string
  social_account_id: string | null
  platform: string
  platform_post_id: string | null
  content: string | null
  media_urls: string[]
  post_type: PostType
  status: PostStatus
  scheduled_at: string | null
  published_at: string | null
  ai_generated: boolean
  ai_prompt: string | null
  campaign_id: string | null
  engagement: Record<string, unknown>
  error_message: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface SocialAnalytics {
  id: string
  client_id: string
  social_account_id: string
  platform: string
  metric_date: string
  followers_count: number
  following_count: number
  impressions: number
  reach: number
  engagement_rate: number
  likes: number
  comments: number
  shares: number
  clicks: number
  saves: number
  profile_views: number
  website_clicks: number
  audience_data: Record<string, unknown>
  raw_data: Record<string, unknown>
  synced_at: string | null
  created_at: string
}

export interface SocialCampaign {
  id: string
  client_id: string
  name: string
  description: string | null
  platforms: string[]
  objective: CampaignObjective | null
  status: CampaignStatus
  budget_total: number | null
  budget_daily: number | null
  budget_spent: number
  currency: string
  start_date: string | null
  end_date: string | null
  target_audience: Record<string, unknown>
  ad_accounts: Record<string, unknown>
  performance: Record<string, unknown>
  created_by: string | null
  created_at: string
  updated_at: string
}

// ============================================
// Billing & Token Consumption types
// ============================================

export type BillingPlanName = 'starter' | 'pro' | 'enterprise'
export type SubscriptionStatus = 'active' | 'trial' | 'past_due' | 'cancelled' | 'suspended'
export type BillingCycle = 'monthly' | 'yearly'
export type BillingAlertType = 'threshold_80' | 'threshold_90' | 'threshold_100' | 'overage' | 'plan_upgrade_suggested' | 'plan_upgrade_required'

export interface BillingPlan {
  id: string
  name: BillingPlanName
  display_name: string
  description: string | null
  monthly_token_quota: number
  price_monthly: number
  price_yearly: number | null
  max_agents: number
  max_documents: number
  max_connectors: number
  max_team_members: number
  features: Record<string, boolean>
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface ClientSubscription {
  id: string
  client_id: string
  plan_id: string
  status: SubscriptionStatus
  billing_cycle: BillingCycle
  current_period_start: string
  current_period_end: string
  tokens_used: number
  tokens_quota: number
  overage_allowed: boolean
  overage_rate: number | null
  stripe_subscription_id: string | null
  stripe_customer_id: string | null
  trial_ends_at: string | null
  cancelled_at: string | null
  created_at: string
  updated_at: string
}

export interface TokenUsageLog {
  id: string
  client_id: string
  agent_type: string
  conversation_id: string | null
  task_id: string | null
  model: string
  input_tokens: number
  output_tokens: number
  total_tokens: number
  estimated_cost: number | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface TokenUsageDaily {
  id: string
  client_id: string
  date: string
  agent_type: string
  total_input_tokens: number
  total_output_tokens: number
  total_tokens: number
  total_cost: number
  request_count: number
  created_at: string
}

export interface BillingAlert {
  id: string
  client_id: string
  alert_type: BillingAlertType
  message: string
  threshold_percent: number | null
  tokens_used: number | null
  tokens_quota: number | null
  suggested_plan_id: string | null
  is_read: boolean
  is_dismissed: boolean
  actioned_at: string | null
  created_at: string
}

export interface CheckQuotaResult {
  allowed: boolean
  tokens_used: number
  tokens_quota: number
  percent_used: number
  plan_name: string | null
  overage_allowed?: boolean
  suggested_upgrade_plan_id: string | null
  error?: string
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
      custom_connectors: {
        Row: CustomConnector
        Insert: Omit<CustomConnector, 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<CustomConnector>
      }
      knowledge_documents: {
        Row: KnowledgeDocument
        Insert: Omit<KnowledgeDocument, 'id' | 'created_at' | 'updated_at' | 'chunks_count'> & { id?: string; chunks_count?: number }
        Update: Partial<KnowledgeDocument>
      }
      knowledge_chunks: {
        Row: KnowledgeChunk
        Insert: Omit<KnowledgeChunk, 'id' | 'created_at'> & { id?: string }
        Update: Partial<KnowledgeChunk>
      }
      agent_usage_logs: {
        Row: AgentUsageLog
        Insert: Omit<AgentUsageLog, 'id' | 'created_at'> & { id?: string }
        Update: Partial<AgentUsageLog>
      }
      roi_config: {
        Row: RoiConfig
        Insert: Omit<RoiConfig, 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<RoiConfig>
      }
      workflows: {
        Row: Workflow
        Insert: Omit<Workflow, 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<Workflow>
      }
      workflow_steps: {
        Row: WorkflowStep
        Insert: Omit<WorkflowStep, 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<WorkflowStep>
      }
      workflow_executions: {
        Row: WorkflowExecution
        Insert: Omit<WorkflowExecution, 'id'> & { id?: string }
        Update: Partial<WorkflowExecution>
      }
      workflow_step_results: {
        Row: WorkflowStepResult
        Insert: Omit<WorkflowStepResult, 'id'> & { id?: string }
        Update: Partial<WorkflowStepResult>
      }
      conversations: {
        Row: Conversation
        Insert: Omit<Conversation, 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<Conversation>
      }
      messages: {
        Row: Message
        Insert: Omit<Message, 'id' | 'created_at'> & { id?: string }
        Update: Partial<Message>
      }
      client_preferences: {
        Row: ClientPreference
        Insert: Omit<ClientPreference, 'id' | 'updated_at'> & { id?: string }
        Update: Partial<ClientPreference>
      }
      client_branding_config: {
        Row: ClientBrandingConfig
        Insert: Omit<ClientBrandingConfig, 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<ClientBrandingConfig>
      }
      shared_conversations: {
        Row: SharedConversation
        Insert: Omit<SharedConversation, 'id' | 'created_at'> & { id?: string }
        Update: Partial<SharedConversation>
      }
      task_assignments: {
        Row: TaskAssignment
        Insert: Omit<TaskAssignment, 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<TaskAssignment>
      }
      team_notifications: {
        Row: TeamNotification
        Insert: Omit<TeamNotification, 'id' | 'created_at'> & { id?: string }
        Update: Partial<TeamNotification>
      }
      agent_sessions: {
        Row: AgentSession
        Insert: Omit<AgentSession, 'id' | 'created_at' | 'updated_at' | 'tokens_used' | 'tools_called'> & { id?: string; tokens_used?: number; tools_called?: number }
        Update: Partial<AgentSession>
      }
      agent_activity_stream: {
        Row: AgentActivityEvent
        Insert: Omit<AgentActivityEvent, 'id' | 'created_at'> & { id?: string }
        Update: Partial<AgentActivityEvent>
      }
      scheduled_tasks: {
        Row: ScheduledTask
        Insert: Omit<ScheduledTask, 'id' | 'created_at' | 'updated_at' | 'run_count' | 'error_count' | 'max_retries'> & { id?: string; run_count?: number; error_count?: number; max_retries?: number }
        Update: Partial<ScheduledTask>
      }
      scheduled_task_runs: {
        Row: ScheduledTaskRun
        Insert: Omit<ScheduledTaskRun, 'id' | 'tokens_used'> & { id?: string; tokens_used?: number }
        Update: Partial<ScheduledTaskRun>
      }
      social_accounts: {
        Row: SocialAccount
        Insert: Omit<SocialAccount, 'id' | 'created_at' | 'updated_at' | 'connected_at'> & { id?: string; connected_at?: string }
        Update: Partial<SocialAccount>
      }
      social_posts: {
        Row: SocialPost
        Insert: Omit<SocialPost, 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<SocialPost>
      }
      social_analytics: {
        Row: SocialAnalytics
        Insert: Omit<SocialAnalytics, 'id' | 'created_at'> & { id?: string }
        Update: Partial<SocialAnalytics>
      }
      social_campaigns: {
        Row: SocialCampaign
        Insert: Omit<SocialCampaign, 'id' | 'created_at' | 'updated_at' | 'budget_spent'> & { id?: string; budget_spent?: number }
        Update: Partial<SocialCampaign>
      }
      billing_plans: {
        Row: BillingPlan
        Insert: Omit<BillingPlan, 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<BillingPlan>
      }
      client_subscriptions: {
        Row: ClientSubscription
        Insert: Omit<ClientSubscription, 'id' | 'created_at' | 'updated_at' | 'tokens_used'> & { id?: string; tokens_used?: number }
        Update: Partial<ClientSubscription>
      }
      token_usage_logs: {
        Row: TokenUsageLog
        Insert: Omit<TokenUsageLog, 'id' | 'created_at' | 'total_tokens'> & { id?: string }
        Update: Partial<TokenUsageLog>
      }
      token_usage_daily: {
        Row: TokenUsageDaily
        Insert: Omit<TokenUsageDaily, 'id' | 'created_at'> & { id?: string }
        Update: Partial<TokenUsageDaily>
      }
      billing_alerts: {
        Row: BillingAlert
        Insert: Omit<BillingAlert, 'id' | 'created_at'> & { id?: string }
        Update: Partial<BillingAlert>
      }
    }
  }
}
