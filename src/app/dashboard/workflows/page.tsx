'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plus,
  ArrowLeft,
  Play,
  Clock,
  ChevronUp,
  ChevronDown,
  X,
  Save,
  History,
  CheckCircle,
  XCircle,
  MinusCircle,
  Loader2,
  GitBranch,
  AlertTriangle,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import type {
  Workflow,
  WorkflowStep,
  WorkflowStatus,
  WorkflowTriggerType,
  WorkflowOnError,
  WorkflowExecution,
  WorkflowStepResult,
  WorkflowStepStatus,
  WorkflowExecutionStatus,
} from '@/types/database'

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const AGENT_OPTIONS: { value: string; label: string }[] = [
  { value: 'eva', label: 'Eva - Social' },
  { value: 'ludo', label: 'Ludo - SAV' },
  { value: 'marc', label: 'Marc - Email' },
  { value: 'leo', label: 'Léo - Ops' },
  { value: 'hugo', label: 'Hugo - Marketing' },
  { value: 'sofia', label: 'Sofia - SOP' },
  { value: 'felix', label: 'Félix - Finance' },
  { value: 'iris', label: 'Iris - Reporting' },
]

const STATUS_BADGE: Record<WorkflowStatus, { label: string; classes: string }> = {
  draft: { label: 'Brouillon', classes: 'bg-surface-100 text-ink-500' },
  active: { label: 'Actif', classes: 'bg-emerald-100 text-emerald-700' },
  paused: { label: 'En pause', classes: 'bg-amber-100 text-amber-700' },
}

const TRIGGER_LABELS: Record<WorkflowTriggerType, string> = {
  manual: 'Manuel',
  schedule: 'Planifié',
  event: 'Événement',
  webhook: 'Webhook',
}

const EXEC_STATUS_BADGE: Record<WorkflowExecutionStatus, { label: string; classes: string }> = {
  running: { label: 'En cours', classes: 'bg-brand-50 text-brand-700' },
  completed: { label: 'Terminé', classes: 'bg-emerald-100 text-emerald-700' },
  failed: { label: 'Échoué', classes: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Annulé', classes: 'bg-surface-100 text-ink-400' },
}

// ─────────────────────────────────────────────
// Local types for editor state
// ─────────────────────────────────────────────

interface StepDraft {
  _key: string          // stable local key for React lists
  id?: string           // present when editing an existing step
  agent_id: string
  prompt_template: string
  condition_raw: string // raw JSON string (may be empty)
  timeout_seconds: number
  on_error: WorkflowOnError
}

interface WorkflowWithCount extends Workflow {
  steps_count: number
}

interface ExecutionWithDetails extends WorkflowExecution {
  step_results?: WorkflowStepResult[]
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

let _keyCounter = 0
function nextKey() {
  return `step-${++_keyCounter}-${Date.now()}`
}

function blankStep(): StepDraft {
  return {
    _key: nextKey(),
    agent_id: 'eva',
    prompt_template: '',
    condition_raw: '',
    timeout_seconds: 60,
    on_error: 'stop',
  }
}

function formatDuration(startedAt: string, completedAt: string | null): string {
  if (!completedAt) return '—'
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime()
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.round(ms / 60000)}min`
}

function StepStatusIcon({ status }: { status: WorkflowStepStatus }) {
  switch (status) {
    case 'success':
      return <CheckCircle className="w-4 h-4 text-emerald-500" />
    case 'error':
      return <XCircle className="w-4 h-4 text-red-500" />
    case 'skipped':
      return <MinusCircle className="w-4 h-4 text-ink-300" />
    case 'running':
      return <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />
    default:
      return <Clock className="w-4 h-4 text-ink-200" />
  }
}

// ─────────────────────────────────────────────
// Execution History Modal
// ─────────────────────────────────────────────

function HistoryModal({
  workflowId,
  workflowName,
  onClose,
}: {
  workflowId: string
  workflowName: string
  onClose: () => void
}) {
  const [executions, setExecutions] = useState<WorkflowExecution[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [expandedData, setExpandedData] = useState<Record<string, ExecutionWithDetails>>({})
  const [loading, setLoading] = useState(true)
  const [loadingDetails, setLoadingDetails] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/workflows/executions?workflow_id=${workflowId}&limit=50`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setError(data.error)
        } else {
          setExecutions(data.executions || [])
        }
      })
      .catch(() => setError('Erreur de chargement'))
      .finally(() => setLoading(false))
  }, [workflowId])

  async function toggleExpand(execId: string) {
    if (expanded === execId) {
      setExpanded(null)
      return
    }
    setExpanded(execId)
    if (expandedData[execId]) return
    setLoadingDetails(execId)
    try {
      const r = await fetch(`/api/workflows/executions/${execId}`)
      const data = await r.json()
      if (!data.error) {
        setExpandedData(prev => ({
          ...prev,
          [execId]: { ...data.execution, step_results: data.step_results },
        }))
      }
    } finally {
      setLoadingDetails(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-hover w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
          <div>
            <h2 className="text-lg font-semibold text-ink-700">Historique d&apos;exécution</h2>
            <p className="text-sm text-ink-400">{workflowName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-ink-300 hover:text-ink-500 hover:bg-surface-50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
          {!loading && !error && executions.length === 0 && (
            <div className="text-center py-12 text-ink-300">
              <Clock className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>Aucune exécution pour ce workflow</p>
            </div>
          )}
          {!loading && executions.map(exec => {
            const badge = EXEC_STATUS_BADGE[exec.status] ?? EXEC_STATUS_BADGE.failed
            const isOpen = expanded === exec.id
            const detail = expandedData[exec.id]
            const isLoadingDetail = loadingDetails === exec.id

            return (
              <div key={exec.id} className="border border-surface-200 rounded-xl overflow-hidden">
                {/* Summary row */}
                <button
                  onClick={() => toggleExpand(exec.id)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-50 transition text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.classes}`}>
                      {badge.label}
                    </span>
                    <span className="text-sm text-ink-600">
                      {new Date(exec.started_at).toLocaleString('fr-FR')}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-ink-400">
                    <span>{formatDuration(exec.started_at, exec.completed_at)}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {/* Expanded step results */}
                {isOpen && (
                  <div className="border-t border-surface-100 px-4 py-3 bg-surface-50">
                    {isLoadingDetail && (
                      <div className="flex items-center gap-2 text-sm text-ink-400 py-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Chargement des détails...
                      </div>
                    )}
                    {!isLoadingDetail && detail?.step_results && (
                      <div className="space-y-2">
                        {detail.step_results.length === 0 && (
                          <p className="text-sm text-ink-300">Aucun résultat d&apos;étape</p>
                        )}
                        {detail.step_results.map((sr, idx) => (
                          <div key={sr.id} className="flex items-start gap-3">
                            {/* Vertical connector */}
                            <div className="flex flex-col items-center mt-0.5">
                              <StepStatusIcon status={sr.status} />
                              {idx < (detail.step_results?.length ?? 0) - 1 && (
                                <div className="w-px h-4 bg-surface-200 mt-1" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-ink-600">
                                  Étape {idx + 1}
                                </span>
                                {sr.duration_ms != null && (
                                  <span className="text-xs text-ink-300">{sr.duration_ms}ms</span>
                                )}
                                {sr.tokens_used != null && (
                                  <span className="text-xs text-ink-300">{sr.tokens_used} tokens</span>
                                )}
                              </div>
                              {sr.output && (
                                <p className="text-xs text-ink-400 mt-0.5 line-clamp-2 break-words">
                                  {sr.output}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {exec.error && (
                      <div className="mt-2 text-xs text-red-600 bg-red-50 rounded p-2">
                        {exec.error}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Workflow Editor (View 2)
// ─────────────────────────────────────────────

function WorkflowEditor({
  initial,
  onBack,
  onSaved,
}: {
  initial: WorkflowWithCount | null  // null = new workflow
  onBack: () => void
  onSaved: (wf: WorkflowWithCount) => void
}) {
  // Meta fields
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [status, setStatus] = useState<WorkflowStatus>(initial?.status ?? 'draft')
  const [triggerType, setTriggerType] = useState<WorkflowTriggerType>(initial?.trigger_type ?? 'manual')
  const [cronExpression, setCronExpression] = useState<string>(
    (initial?.trigger_config as Record<string, unknown>)?.cron as string ?? ''
  )

  // Steps
  const [steps, setSteps] = useState<StepDraft[]>([])
  const [loadingSteps, setLoadingSteps] = useState(!!initial)

  // UI state
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Fetch existing steps when editing
  useEffect(() => {
    if (!initial) {
      // New workflow: start with one blank step
      setSteps([blankStep()])
      return
    }
    setLoadingSteps(true)
    fetch(`/api/workflows/${initial.id}`)
      .then(r => r.json())
      .then(data => {
        if (data.steps) {
          const mapped: StepDraft[] = (data.steps as WorkflowStep[]).map(s => ({
            _key: nextKey(),
            id: s.id,
            agent_id: s.agent_id,
            prompt_template: s.prompt_template,
            condition_raw: s.condition ? JSON.stringify(s.condition, null, 2) : '',
            timeout_seconds: s.timeout_seconds,
            on_error: s.on_error,
          }))
          setSteps(mapped.length > 0 ? mapped : [blankStep()])
        } else {
          setSteps([blankStep()])
        }
      })
      .catch(() => setSteps([blankStep()]))
      .finally(() => setLoadingSteps(false))
  }, [initial])

  // ── Step manipulation ──

  function updateStep(key: string, patch: Partial<StepDraft>) {
    setSteps(prev => prev.map(s => s._key === key ? { ...s, ...patch } : s))
  }

  function addStep() {
    setSteps(prev => [...prev, blankStep()])
  }

  function removeStep(key: string) {
    setSteps(prev => {
      if (prev.length <= 1) return prev // keep at least one
      return prev.filter(s => s._key !== key)
    })
  }

  function moveStep(key: string, direction: 'up' | 'down') {
    setSteps(prev => {
      const idx = prev.findIndex(s => s._key === key)
      if (idx === -1) return prev
      const target = direction === 'up' ? idx - 1 : idx + 1
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return next
    })
  }

  // ── Save ──

  async function handleSave() {
    if (!name.trim()) {
      setSaveError('Le nom du workflow est requis.')
      return
    }
    if (steps.length === 0) {
      setSaveError('Ajoutez au moins une étape.')
      return
    }
    for (let i = 0; i < steps.length; i++) {
      if (!steps[i].prompt_template.trim()) {
        setSaveError(`L'étape ${i + 1} doit avoir un prompt.`)
        return
      }
    }

    setSaving(true)
    setSaveError(null)

    const trigger_config: Record<string, unknown> = {}
    if (triggerType === 'schedule' && cronExpression.trim()) {
      trigger_config.cron = cronExpression.trim()
    }

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      status,
      trigger_type: triggerType,
      trigger_config,
      steps: steps.map((s, i) => {
        let condition: Record<string, unknown> | null = null
        if (s.condition_raw.trim()) {
          try {
            condition = JSON.parse(s.condition_raw)
          } catch {
            // invalid JSON — send null
          }
        }
        return {
          step_order: i + 1,
          agent_id: s.agent_id,
          prompt_template: s.prompt_template,
          condition,
          timeout_seconds: s.timeout_seconds,
          on_error: s.on_error,
        }
      }),
    }

    try {
      const url = initial ? `/api/workflows/${initial.id}` : '/api/workflows'
      const method = initial ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setSaveError(data.error || 'Erreur lors de la sauvegarde')
        return
      }
      const saved: WorkflowWithCount = {
        ...(data.workflow as Workflow),
        steps_count: steps.length,
      }
      onSaved(saved)
    } catch {
      setSaveError('Erreur réseau. Veuillez réessayer.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-ink-400 hover:text-ink-600 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux workflows
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-brand"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
      </div>

      {saveError && (
        <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg p-3 mb-4">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {saveError}
        </div>
      )}

      {/* ── Meta card ── */}
      <div className="card mb-5">
        <h2 className="text-sm font-semibold text-ink-500 uppercase tracking-wide mb-4">
          Informations générales
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-600 mb-1">
              Nom du workflow <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Relance devis"
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-600 mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Description optionnelle du workflow..."
              rows={2}
              className="input resize-none"
            />
          </div>
        </div>
      </div>

      {/* ── Config card ── */}
      <div className="card mb-5">
        <h2 className="text-sm font-semibold text-ink-500 uppercase tracking-wide mb-4">
          Configuration
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink-600 mb-1">Statut</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as WorkflowStatus)}
              className="input"
            >
              <option value="draft">Brouillon</option>
              <option value="active">Actif</option>
              <option value="paused">En pause</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-600 mb-1">Déclencheur</label>
            <select
              value={triggerType}
              onChange={e => setTriggerType(e.target.value as WorkflowTriggerType)}
              className="input"
            >
              <option value="manual">Manuel</option>
              <option value="schedule">Planifié (cron)</option>
              <option value="event">Événement</option>
              <option value="webhook">Webhook</option>
            </select>
          </div>
        </div>
        {triggerType === 'schedule' && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-ink-600 mb-1">
              Expression cron
            </label>
            <input
              type="text"
              value={cronExpression}
              onChange={e => setCronExpression(e.target.value)}
              placeholder="Ex: 0 9 * * 1-5  (chaque jour de semaine à 9h)"
              className="input font-mono"
            />
            <p className="text-xs text-ink-300 mt-1">
              Format: minute heure jour-du-mois mois jour-de-la-semaine
            </p>
          </div>
        )}
      </div>

      {/* ── Steps ── */}
      <div className="card">
        <h2 className="text-sm font-semibold text-ink-500 uppercase tracking-wide mb-4">
          Étapes
        </h2>

        {loadingSteps && (
          <div className="flex items-center justify-center py-8 text-ink-300">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Chargement des étapes...
          </div>
        )}

        {!loadingSteps && (
          <div className="space-y-4">
            {steps.map((step, idx) => (
              <StepCard
                key={step._key}
                step={step}
                index={idx}
                total={steps.length}
                onChange={patch => updateStep(step._key, patch)}
                onMoveUp={() => moveStep(step._key, 'up')}
                onMoveDown={() => moveStep(step._key, 'down')}
                onRemove={() => removeStep(step._key)}
              />
            ))}

            <button
              onClick={addStep}
              className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-surface-200 text-ink-400 hover:border-brand-300 hover:text-brand-500 rounded-xl py-3 text-sm font-medium transition"
            >
              <Plus className="w-4 h-4" />
              Ajouter un step
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Step Card (sub-component of editor)
// ─────────────────────────────────────────────

function StepCard({
  step,
  index,
  total,
  onChange,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  step: StepDraft
  index: number
  total: number
  onChange: (patch: Partial<StepDraft>) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
}) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="border border-surface-200 rounded-xl overflow-hidden">
      {/* Step header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-surface-50 border-b border-surface-100">
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-500 text-white text-xs font-bold flex-shrink-0">
          {index + 1}
        </span>
        <span className="flex-1 text-sm font-medium text-ink-600 truncate">
          {AGENT_OPTIONS.find(a => a.value === step.agent_id)?.label ?? step.agent_id}
          {step.prompt_template && (
            <span className="font-normal text-ink-300 ml-2">— {step.prompt_template.slice(0, 60)}{step.prompt_template.length > 60 ? '...' : ''}</span>
          )}
        </span>
        {/* Reorder */}
        <div className="flex items-center gap-1">
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            className="p-1 rounded text-ink-300 hover:text-ink-600 disabled:opacity-30 hover:bg-surface-100 transition"
            title="Monter"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="p-1 rounded text-ink-300 hover:text-ink-600 disabled:opacity-30 hover:bg-surface-100 transition"
            title="Descendre"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
        {/* Collapse toggle */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="p-1 rounded text-ink-300 hover:text-ink-600 hover:bg-surface-100 transition"
          title={expanded ? 'Réduire' : 'Développer'}
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? '' : '-rotate-90'}`} />
        </button>
        {/* Remove */}
        {total > 1 && (
          <button
            onClick={onRemove}
            className="p-1 rounded text-ink-300 hover:text-red-500 hover:bg-red-50 transition"
            title="Supprimer l'étape"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Step body */}
      {expanded && (
        <div className="px-4 py-4 space-y-4">
          {/* Agent selector */}
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1">Agent</label>
            <select
              value={step.agent_id}
              onChange={e => onChange({ agent_id: e.target.value })}
              className="input"
            >
              {AGENT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Prompt template */}
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1">
              Prompt template <span className="text-red-500">*</span>
            </label>
            <textarea
              value={step.prompt_template}
              onChange={e => onChange({ prompt_template: e.target.value })}
              placeholder={`Rédigez les instructions pour ${AGENT_OPTIONS.find(a => a.value === step.agent_id)?.label ?? 'l\'agent'}...\n\nVariables disponibles: {{previous_output}}, {{trigger_data}}, {{step_${index + 1}_output}}`}
              rows={4}
              className="input font-mono resize-y"
            />
            <p className="text-xs text-ink-300 mt-1">
              Variables disponibles:{' '}
              <code className="bg-surface-100 px-1 rounded">{'{{previous_output}}'}</code>,{' '}
              <code className="bg-surface-100 px-1 rounded">{'{{trigger_data}}'}</code>
              {index > 0 && (
                <>
                  ,{' '}
                  <code className="bg-surface-100 px-1 rounded">{`{{step_${index}_output}}`}</code>
                </>
              )}
            </p>
          </div>

          {/* Advanced row */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-ink-500 mb-1">Timeout (s)</label>
              <input
                type="number"
                min={1}
                max={3600}
                value={step.timeout_seconds}
                onChange={e => onChange({ timeout_seconds: parseInt(e.target.value) || 60 })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-500 mb-1">En cas d&apos;erreur</label>
              <select
                value={step.on_error}
                onChange={e => onChange({ on_error: e.target.value as WorkflowOnError })}
                className="input"
              >
                <option value="stop">Stopper</option>
                <option value="skip">Ignorer</option>
                <option value="retry">Réessayer</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-500 mb-1">
                Condition (JSON)
                <span className="font-normal text-ink-300 ml-1">optionnel</span>
              </label>
              <textarea
                value={step.condition_raw}
                onChange={e => onChange({ condition_raw: e.target.value })}
                placeholder='{"field": "value"}'
                rows={2}
                className="input text-xs font-mono resize-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Workflow List (View 1)
// ─────────────────────────────────────────────

function WorkflowList({
  workflows,
  loading,
  error,
  onEdit,
  onCreate,
  onRefresh,
}: {
  workflows: WorkflowWithCount[]
  loading: boolean
  error: string | null
  onEdit: (wf: WorkflowWithCount) => void
  onCreate: () => void
  onRefresh: () => void
}) {
  const [executing, setExecuting] = useState<string | null>(null)
  const [execError, setExecError] = useState<string | null>(null)
  const [execSuccess, setExecSuccess] = useState<string | null>(null)
  const [historyWorkflow, setHistoryWorkflow] = useState<WorkflowWithCount | null>(null)

  async function handleExecute(wf: WorkflowWithCount) {
    setExecuting(wf.id)
    setExecError(null)
    setExecSuccess(null)
    try {
      const res = await fetch(`/api/workflows/${wf.id}/execute`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok || data.error) {
        setExecError(data.error || 'Erreur lors du lancement')
      } else {
        setExecSuccess(`Workflow "${wf.name}" lancé (exécution #${data.execution_id?.slice(0, 8)}...)`)
      }
    } catch {
      setExecError('Erreur réseau. Veuillez réessayer.')
    } finally {
      setExecuting(null)
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={<GitBranch className="w-5 h-5 text-brand-500" />}
        title="Workflows"
        subtitle="Automatisez les tâches multi-agents"
        action={{ label: 'Nouveau workflow', onClick: onCreate, icon: <Plus className="w-4 h-4" /> }}
      />

      {/* Feedback banners */}
      {execError && (
        <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg p-3 mb-4">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {execError}
          <button onClick={() => setExecError(null)} className="ml-auto text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {execSuccess && (
        <div className="flex items-center gap-2 text-emerald-700 text-sm bg-emerald-50 border border-emerald-100 rounded-lg p-3 mb-4">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          {execSuccess}
          <button onClick={() => setExecSuccess(null)} className="ml-auto text-emerald-400 hover:text-emerald-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-ink-300">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Chargement...
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="text-center py-16 bg-red-50 rounded-xl border border-red-100">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={onRefresh}
            className="text-sm text-red-500 underline hover:text-red-700"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && workflows.length === 0 && (
        <EmptyState
          icon={<GitBranch className="w-5 h-5 text-brand-500" />}
          title="Aucun workflow"
          description="Créez votre premier workflow pour automatiser les tâches entre vos agents IA"
          actionLabel="Créer un workflow"
          onAction={onCreate}
          illustration="rocket"
        />
      )}

      {/* Workflow cards */}
      {!loading && !error && workflows.length > 0 && (
        <div className="grid gap-4">
          {workflows.map(wf => {
            const badge = STATUS_BADGE[wf.status]
            const isRunning = executing === wf.id

            return (
              <div
                key={wf.id}
                className="card-interactive p-5"
                onClick={() => onEdit(wf)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-ink-700 truncate">{wf.name}</h3>
                      <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${badge.classes}`}>
                        {badge.label}
                      </span>
                    </div>
                    {wf.description && (
                      <p className="text-sm text-ink-400 mb-3 line-clamp-2">{wf.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-ink-300">
                      <span className="flex items-center gap-1">
                        <GitBranch className="w-3.5 h-3.5" />
                        {TRIGGER_LABELS[wf.trigger_type]}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {wf.steps_count} étape{wf.steps_count !== 1 ? 's' : ''}
                      </span>
                      <span>
                        Mis à jour {new Date(wf.updated_at).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div
                    className="flex items-center gap-2 flex-shrink-0"
                    onClick={e => e.stopPropagation()}
                  >
                    <button
                      onClick={() => setHistoryWorkflow(wf)}
                      className="btn-secondary text-xs py-1.5"
                    >
                      <History className="w-3.5 h-3.5" />
                      Historique
                    </button>
                    {wf.status === 'active' && (
                      <button
                        onClick={() => handleExecute(wf)}
                        disabled={isRunning}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition disabled:opacity-60"
                      >
                        {isRunning
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Play className="w-3.5 h-3.5" />
                        }
                        {isRunning ? 'Lancement...' : 'Exécuter'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* History modal */}
      {historyWorkflow && (
        <HistoryModal
          workflowId={historyWorkflow.id}
          workflowName={historyWorkflow.name}
          onClose={() => setHistoryWorkflow(null)}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Main page component
// ─────────────────────────────────────────────

type View =
  | { type: 'list' }
  | { type: 'editor'; workflow: WorkflowWithCount | null }

export default function WorkflowsPage() {
  const [view, setView] = useState<View>({ type: 'list' })
  const [workflows, setWorkflows] = useState<WorkflowWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWorkflows = useCallback(() => {
    setLoading(true)
    setError(null)
    fetch('/api/workflows')
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setError(data.error)
        } else {
          setWorkflows(data.workflows || [])
        }
      })
      .catch(() => setError('Erreur de chargement des workflows'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchWorkflows()
  }, [fetchWorkflows])

  function handleSaved(saved: WorkflowWithCount) {
    setWorkflows(prev => {
      const exists = prev.findIndex(w => w.id === saved.id)
      if (exists !== -1) {
        const next = [...prev]
        next[exists] = saved
        return next
      }
      return [saved, ...prev]
    })
    setView({ type: 'list' })
  }

  if (view.type === 'editor') {
    return (
      <WorkflowEditor
        initial={view.workflow}
        onBack={() => setView({ type: 'list' })}
        onSaved={handleSaved}
      />
    )
  }

  return (
    <WorkflowList
      workflows={workflows}
      loading={loading}
      error={error}
      onEdit={wf => setView({ type: 'editor', workflow: wf })}
      onCreate={() => setView({ type: 'editor', workflow: null })}
      onRefresh={fetchWorkflows}
    />
  )
}
