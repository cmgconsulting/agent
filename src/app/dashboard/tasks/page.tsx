'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plus,
  X,
  Loader2,
  AlertTriangle,
  CheckCircle,
  ClipboardList,
  Calendar,
  Bot,
  User,
  Trash2,
} from 'lucide-react'
import type { TaskStatus, TaskPriority, TaskAssignment } from '@/types/database'
import { PageHeader } from '@/components/ui/page-header'

// ─────────────────────────────────────────────
// Local types
// ─────────────────────────────────────────────

interface TeamMember {
  id: string
  full_name: string | null
  email: string
}

interface TaskWithAssignee extends TaskAssignment {
  assignee_name?: string | null
  assignee_email?: string
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const COLUMNS: { status: TaskStatus; label: string; headerClass: string; dotClass: string }[] = [
  { status: 'todo', label: 'À faire', headerClass: 'bg-brand-50 border-brand-200', dotClass: 'bg-brand-400' },
  { status: 'in_progress', label: 'En cours', headerClass: 'bg-amber-50 border-amber-200', dotClass: 'bg-amber-500' },
  { status: 'done', label: 'Terminé', headerClass: 'bg-emerald-50 border-emerald-200', dotClass: 'bg-emerald-500' },
  { status: 'cancelled', label: 'Annulé', headerClass: 'bg-surface-50 border-surface-200', dotClass: 'bg-ink-300' },
]

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; classes: string }> = {
  low: { label: 'Faible', classes: 'bg-surface-100 text-ink-500' },
  medium: { label: 'Moyen', classes: 'bg-brand-50 text-brand-700' },
  high: { label: 'Élevé', classes: 'bg-orange-100 text-orange-700' },
  urgent: { label: 'Urgent', classes: 'bg-red-100 text-red-700' },
}

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'À faire' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'done', label: 'Terminé' },
  { value: 'cancelled', label: 'Annulé' },
]

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Faible' },
  { value: 'medium', label: 'Moyen' },
  { value: 'high', label: 'Élevé' },
  { value: 'urgent', label: 'Urgent' },
]

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}



function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false
  return new Date(dueDate) < new Date()
}

// ─────────────────────────────────────────────
// Task Card
// ─────────────────────────────────────────────

function TaskCard({
  task,
  onClick,
  onStatusChange,
}: {
  task: TaskWithAssignee
  onClick: () => void
  onStatusChange: (id: string, status: TaskStatus) => void
}) {
  const priority = PRIORITY_CONFIG[task.priority]
  const overdue = isOverdue(task.due_date)
  const displayName = task.assignee_name || task.assignee_email || null

  return (
    <div
      className="card-interactive p-4"
      onClick={onClick}
    >
      {/* Title + priority */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <h4 className="text-sm font-semibold text-ink-700 leading-snug flex-1 min-w-0 break-words">
          {task.title}
        </h4>
        <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${priority.classes}`}>
          {priority.label}
        </span>
      </div>

      {/* Meta */}
      <div className="flex flex-col gap-1.5">
        {/* Assignee */}
        {displayName && (
          <div className="flex items-center gap-1.5 text-xs text-ink-400">
            <User className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{displayName}</span>
          </div>
        )}

        {/* Due date */}
        {task.due_date && (
          <div className={`flex items-center gap-1.5 text-xs ${overdue ? 'text-red-500' : 'text-ink-400'}`}>
            <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{formatDate(task.due_date)}{overdue ? ' — En retard' : ''}</span>
          </div>
        )}

        {/* Agent source */}
        {task.agent_source && (
          <div className="flex items-center gap-1.5 text-xs text-purple-600">
            <Bot className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate capitalize">{task.agent_source}</span>
          </div>
        )}
      </div>

      {/* Status dropdown — stops propagation so card click doesn't trigger */}
      <div className="mt-3 pt-3 border-t border-surface-100" onClick={e => e.stopPropagation()}>
        <select
          value={task.status}
          onChange={e => onStatusChange(task.id, e.target.value as TaskStatus)}
          className="w-full text-xs border border-surface-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-300 cursor-pointer"
        >
          {STATUS_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Task Modal (create / edit)
// ─────────────────────────────────────────────

interface TaskFormData {
  title: string
  description: string
  assigned_to: string
  priority: TaskPriority
  due_date: string
  status: TaskStatus
}

function TaskModal({
  initial,
  members,
  onClose,
  onSaved,
  onDeleted,
}: {
  initial: TaskWithAssignee | null
  members: TeamMember[]
  onClose: () => void
  onSaved: (task: TaskWithAssignee) => void
  onDeleted?: (id: string) => void
}) {
  const isEditing = !!initial

  const [form, setForm] = useState<TaskFormData>({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    assigned_to: initial?.assigned_to ?? '',
    priority: initial?.priority ?? 'medium',
    due_date: initial?.due_date ? initial.due_date.slice(0, 10) : '',
    status: initial?.status ?? 'todo',
  })

  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof TaskFormData>(key: K, value: TaskFormData[K]) =>
    setForm(prev => ({ ...prev, [key]: value }))

  async function handleSave() {
    if (!form.title.trim()) {
      setError('Le titre est requis.')
      return
    }
    setSaving(true)
    setError(null)

    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      assigned_to: form.assigned_to || null,
      priority: form.priority,
      due_date: form.due_date || null,
      status: form.status,
    }

    try {
      const url = isEditing ? `/api/tasks/${initial!.id}` : '/api/tasks'
      const method = isEditing ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error || 'Erreur lors de la sauvegarde')
        return
      }

      // Enrich with assignee info
      const assigneeMember = members.find(m => m.id === (data.task?.assigned_to || form.assigned_to))
      const enriched: TaskWithAssignee = {
        ...data.task,
        assignee_name: assigneeMember?.full_name ?? null,
        assignee_email: assigneeMember?.email,
      }
      onSaved(enriched)
    } catch {
      setError('Erreur réseau. Veuillez réessayer.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!initial) return
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch(`/api/tasks/${initial.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Erreur lors de la suppression')
        setConfirmDelete(false)
        return
      }
      onDeleted?.(initial.id)
    } catch {
      setError('Erreur réseau. Veuillez réessayer.')
      setConfirmDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-hover w-full max-w-lg flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
          <h2 className="text-lg font-semibold text-ink-700">
            {isEditing ? 'Modifier la tâche' : 'Nouvelle tâche'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-ink-300 hover:text-ink-500 hover:bg-surface-50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-ink-600 mb-1">
              Titre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="Titre de la tâche..."
              className="input"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-ink-600 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Description optionnelle..."
              rows={3}
              className="input resize-none"
            />
          </div>

          {/* Assignee */}
          <div>
            <label className="block text-sm font-medium text-ink-600 mb-1">Assigner à</label>
            <select
              value={form.assigned_to}
              onChange={e => set('assigned_to', e.target.value)}
              className="input"
            >
              <option value="">— Non assigné —</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>
                  {m.full_name || m.email}
                </option>
              ))}
            </select>
          </div>

          {/* Priority + Status row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-ink-600 mb-1">Priorité</label>
              <select
                value={form.priority}
                onChange={e => set('priority', e.target.value as TaskPriority)}
                className="input"
              >
                {PRIORITY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-600 mb-1">Statut</label>
              <select
                value={form.status}
                onChange={e => set('status', e.target.value as TaskStatus)}
                className="input"
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Due date */}
          <div>
            <label className="block text-sm font-medium text-ink-600 mb-1">Date d&apos;échéance</label>
            <input
              type="date"
              value={form.due_date}
              onChange={e => set('due_date', e.target.value)}
              className="input"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-surface-100">
          {/* Delete (edit mode only) */}
          {isEditing && onDeleted && (
            <div className="flex items-center gap-2">
              {confirmDelete ? (
                <>
                  <span className="text-xs text-red-600 font-medium">Confirmer la suppression ?</span>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition disabled:opacity-60"
                  >
                    {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    Supprimer
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="text-xs text-ink-400 hover:text-ink-600 px-2 py-1.5"
                  >
                    Annuler
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Supprimer
                </button>
              )}
            </div>
          )}

          <div className={`flex items-center gap-3 ${!isEditing || !onDeleted ? 'ml-auto' : ''}`}>
            <button
              onClick={onClose}
              className="btn-ghost"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-brand"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {saving ? 'Sauvegarde...' : isEditing ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskWithAssignee[]>([])
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskWithAssignee | null>(null)

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [tasksRes, membersRes] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/team/members'),
      ])
      const [tasksData, membersData] = await Promise.all([
        tasksRes.json(),
        membersRes.json(),
      ])

      const memberList: TeamMember[] = membersData.members || []
      setMembers(memberList)

      const rawTasks: TaskAssignment[] = tasksData.tasks || []
      // Enrich each task with assignee info
      const enriched: TaskWithAssignee[] = rawTasks.map(t => {
        const assignee = memberList.find(m => m.id === t.assigned_to)
        return {
          ...t,
          assignee_name: assignee?.full_name ?? null,
          assignee_email: assignee?.email,
        }
      })
      setTasks(enriched)
    } catch {
      setError('Erreur de chargement des tâches')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleSaved(task: TaskWithAssignee) {
    setTasks(prev => {
      const idx = prev.findIndex(t => t.id === task.id)
      if (idx !== -1) {
        const next = [...prev]
        next[idx] = task
        return next
      }
      return [task, ...prev]
    })
    setShowCreateModal(false)
    setEditingTask(null)
  }

  function handleDeleted(id: string) {
    setTasks(prev => prev.filter(t => t.id !== id))
    setEditingTask(null)
  }

  async function handleStatusChange(id: string, status: TaskStatus) {
    // Optimistic update
    setTasks(prev =>
      prev.map(t => t.id === id ? { ...t, status } : t)
    )
    try {
      await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
    } catch {
      // Revert on error — simple: re-fetch
      fetchData()
    }
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const tasksByStatus = (status: TaskStatus) => tasks.filter(t => t.status === status)

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={ClipboardList}
        title="Tâches"
        subtitle="Tableau Kanban de l'équipe"
        action={{ label: 'Nouvelle tâche', onClick: () => setShowCreateModal(true), icon: Plus }}
      />

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20 text-ink-300">
          <Loader2 className="w-7 h-7 animate-spin mr-3" />
          Chargement...
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex items-center gap-3 text-red-600 bg-red-50 border border-red-100 rounded-xl p-4 mb-6">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
          <button
            onClick={fetchData}
            className="ml-auto text-sm text-red-500 underline hover:text-red-700"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Kanban board */}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {COLUMNS.map(col => {
            const colTasks = tasksByStatus(col.status)
            return (
              <div key={col.status} className="flex flex-col">
                {/* Column header */}
                <div className={`flex items-center justify-between px-3 py-2.5 rounded-xl border mb-3 ${col.headerClass}`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${col.dotClass}`} />
                    <span className="text-sm font-semibold text-ink-600">{col.label}</span>
                  </div>
                  <span className="text-xs font-medium text-ink-400 bg-white/70 rounded-full px-2 py-0.5 border border-current border-opacity-20">
                    {colTasks.length}
                  </span>
                </div>

                {/* Task cards */}
                <div className="flex flex-col gap-3">
                  {colTasks.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-ink-200 border-2 border-dashed border-surface-200 rounded-xl">
                      <ClipboardList className="w-8 h-8 mb-2" />
                      <p className="text-xs">Aucune tâche</p>
                    </div>
                  )}
                  {colTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onClick={() => setEditingTask(task)}
                      onStatusChange={handleStatusChange}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create modal */}
      {showCreateModal && (
        <TaskModal
          initial={null}
          members={members}
          onClose={() => setShowCreateModal(false)}
          onSaved={handleSaved}
        />
      )}

      {/* Edit modal */}
      {editingTask && (
        <TaskModal
          initial={editingTask}
          members={members}
          onClose={() => setEditingTask(null)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  )
}
