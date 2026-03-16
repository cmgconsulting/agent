import { createServiceRoleClient } from '@/lib/supabase/server'
import { encryptCredentials, decryptCredentials } from '@/lib/vault'
import type { CRMType, CRMAdapter, CRMSyncType, CRMSyncDirection } from './types'
import { getCRMConfig } from './types'
import { AxonautAdapter } from './adapters/axonaut'
import { ObatAdapter } from './adapters/obat'
import { VertuozaAdapter } from './adapters/vertuoza'
import { ToltekAdapter } from './adapters/toltek'
import { CostructorAdapter } from './adapters/costructor'
import { GraneetAdapter } from './adapters/graneet'
import { ExtrabatAdapter } from './adapters/extrabat'
import { HenrriAdapter } from './adapters/henrri'

// ─── Adapter factory ───

function createAdapter(type: CRMType, credentials: Record<string, string>): CRMAdapter {
  switch (type) {
    case 'axonaut': return new AxonautAdapter(credentials)
    case 'obat': return new ObatAdapter(credentials)
    case 'vertuoza': return new VertuozaAdapter(credentials)
    case 'toltek': return new ToltekAdapter(credentials)
    case 'costructor': return new CostructorAdapter(credentials)
    case 'graneet': return new GraneetAdapter(credentials)
    case 'extrabat': return new ExtrabatAdapter(credentials)
    case 'henrri': return new HenrriAdapter(credentials)
    default: throw new Error(`CRM type inconnu: ${type}`)
  }
}

// ─── Connection row type ───

interface CRMConnectionRow {
  id: string
  user_id: string
  crm_type: string
  status: string
  credentials_encrypted: string | null
  config: Record<string, unknown>
  last_sync_at: string | null
  last_sync_status: string | null
  last_sync_details: Record<string, unknown>
}

// ─── Main CRM Service ───

export class CRMService {
  private userId: string

  constructor(userId: string) {
    this.userId = userId
  }

  // Get active CRM connection for this user
  async getConnection(crmType?: CRMType): Promise<CRMConnectionRow | null> {
    const supabase = createServiceRoleClient()

    if (crmType) {
      const { data } = await supabase
        .from('crm_connections')
        .select('*')
        .eq('user_id', this.userId)
        .eq('crm_type', crmType)
        .single()
      return data as CRMConnectionRow | null
    }

    // Find any connected CRM
    const { data } = await supabase
      .from('crm_connections')
      .select('*')
      .eq('user_id', this.userId)
      .eq('status', 'connected')
      .limit(1)
      .single()
    return data as CRMConnectionRow | null
  }

  // Get all connections for user
  async getAllConnections(): Promise<CRMConnectionRow[]> {
    const supabase = createServiceRoleClient()
    const { data } = await supabase
      .from('crm_connections')
      .select('*')
      .eq('user_id', this.userId)
      .order('created_at', { ascending: false })
    return (data || []) as CRMConnectionRow[]
  }

  // Connect a CRM
  async connect(crmType: CRMType, credentials: Record<string, string>): Promise<{ success: boolean; error?: string }> {
    const supabase = createServiceRoleClient()

    // Test connection first
    try {
      const adapter = createAdapter(crmType, credentials)
      const testResult = await adapter.testConnection()
      if (!testResult.success) {
        return { success: false, error: testResult.error }
      }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }

    // Encrypt credentials
    const encrypted = encryptCredentials(credentials)

    // Upsert connection
    const { error } = await supabase
      .from('crm_connections')
      .upsert({
        user_id: this.userId,
        crm_type: crmType,
        status: 'connected',
        credentials_encrypted: encrypted,
        config: getCRMConfig(crmType).supportedEntities.reduce((acc, entity) => {
          acc[entity] = { enabled: true, direction: 'bidirectional', frequency: 'manual' }
          return acc
        }, {} as Record<string, unknown>),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,crm_type',
      })

    if (error) return { success: false, error: error.message }
    return { success: true }
  }

  // Disconnect a CRM
  async disconnect(crmType: CRMType): Promise<void> {
    const supabase = createServiceRoleClient()
    await supabase
      .from('crm_connections')
      .update({ status: 'disconnected', credentials_encrypted: null, updated_at: new Date().toISOString() })
      .eq('user_id', this.userId)
      .eq('crm_type', crmType)
  }

  // Test a connection
  async testConnection(crmType: CRMType): Promise<{ success: boolean; error?: string }> {
    const connection = await this.getConnection(crmType)
    if (!connection?.credentials_encrypted) {
      return { success: false, error: 'CRM non connecte' }
    }

    try {
      const credentials = decryptCredentials(connection.credentials_encrypted)
      const adapter = createAdapter(crmType, credentials)
      return await adapter.testConnection()
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  }

  // Update sync config
  async updateConfig(crmType: CRMType, config: Record<string, unknown>): Promise<void> {
    const supabase = createServiceRoleClient()
    await supabase
      .from('crm_connections')
      .update({ config, updated_at: new Date().toISOString() })
      .eq('user_id', this.userId)
      .eq('crm_type', crmType)
  }

  // Get adapter for active CRM
  async getAdapter(crmType?: CRMType): Promise<{ adapter: CRMAdapter; connectionId: string } | null> {
    const connection = await this.getConnection(crmType)
    if (!connection?.credentials_encrypted || connection.status !== 'connected') return null

    try {
      const credentials = decryptCredentials(connection.credentials_encrypted)
      const adapter = createAdapter(connection.crm_type as CRMType, credentials)
      return { adapter, connectionId: connection.id }
    } catch {
      return null
    }
  }

  // Log sync activity
  async logSync(
    connectionId: string,
    syncType: CRMSyncType,
    direction: CRMSyncDirection,
    status: 'started' | 'success' | 'partial' | 'error',
    details?: { itemsSynced?: number; itemsFailed?: number; errors?: unknown[] }
  ): Promise<string> {
    const supabase = createServiceRoleClient()
    const { data } = await supabase
      .from('crm_sync_logs')
      .insert({
        connection_id: connectionId,
        user_id: this.userId,
        sync_type: syncType,
        direction,
        status,
        items_synced: details?.itemsSynced || 0,
        items_failed: details?.itemsFailed || 0,
        error_details: details?.errors || [],
        completed_at: status !== 'started' ? new Date().toISOString() : null,
      })
      .select('id')
      .single()
    return data?.id || ''
  }

  // Get recent sync logs
  async getSyncLogs(connectionId: string, limit = 10): Promise<unknown[]> {
    const supabase = createServiceRoleClient()
    const { data } = await supabase
      .from('crm_sync_logs')
      .select('*')
      .eq('connection_id', connectionId)
      .order('created_at', { ascending: false })
      .limit(limit)
    return data || []
  }
}
