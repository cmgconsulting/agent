'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  FileText, Upload, Trash2, Search, Loader2, CheckCircle, AlertCircle, Clock,
  X, Plus, FolderOpen, Globe, Tag
} from 'lucide-react'
import type { KnowledgeDocument, KnowledgeCategory, KnowledgeFileType } from '@/types/database'
import { SectionHelp } from '@/components/ui/help-tooltip'
import { PageHeader } from '@/components/ui/page-header'

const CATEGORIES: { value: KnowledgeCategory; label: string }[] = [
  { value: 'produits', label: 'Produits' },
  { value: 'services', label: 'Services' },
  { value: 'technique', label: 'Technique' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'juridique', label: 'Juridique' },
  { value: 'rh', label: 'RH' },
  { value: 'autre', label: 'Autre' },
]

const STATUS_CONFIG = {
  pending: { label: 'En attente', color: 'bg-amber-100 text-amber-700', Icon: Clock },
  processing: { label: 'Traitement...', color: 'bg-brand-50 text-brand-600', Icon: Loader2 },
  ready: { label: 'Prêt', color: 'bg-emerald-100 text-emerald-700', Icon: CheckCircle },
  error: { label: 'Erreur', color: 'bg-red-100 text-red-700', Icon: AlertCircle },
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '-'
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

export default function KnowledgePage() {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{
    content: string
    document_title: string
    document_category: string
  }> | null>(null)
  const [searching, setSearching] = useState(false)

  const loadDocuments = useCallback(async () => {
    try {
      const url = filterCategory
        ? `/api/knowledge?category=${filterCategory}`
        : '/api/knowledge'
      const res = await fetch(url)
      const data = await res.json()
      setDocuments(data.documents || [])
    } catch {
      console.error('Failed to load documents')
    } finally {
      setLoading(false)
    }
  }, [filterCategory])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  // Poll for processing documents
  useEffect(() => {
    const hasProcessing = documents.some(d => d.status === 'pending' || d.status === 'processing')
    if (!hasProcessing) return
    const timer = setInterval(loadDocuments, 3000)
    return () => clearInterval(timer)
  }, [documents, loadDocuments])

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce document et tous ses extraits ?')) return
    try {
      await fetch(`/api/knowledge/${id}`, { method: 'DELETE' })
      loadDocuments()
    } catch {
      alert('Erreur lors de la suppression')
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const res = await fetch('/api/knowledge/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, limit: 10 }),
      })
      const data = await res.json()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setSearchResults((data.results || []).map((r: any) => ({
        content: r.content,
        document_title: r.knowledge_documents?.title || 'Document',
        document_category: r.knowledge_documents?.category || 'autre',
      })))
    } catch {
      alert('Erreur de recherche')
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={<FolderOpen className="w-5 h-5 text-brand-500" />}
        title="Base de connaissances"
        subtitle="Documents et ressources pour vos agents"
        action={{ label: showUpload ? 'Fermer' : 'Ajouter un document', onClick: () => setShowUpload(!showUpload), icon: <Plus className="w-4 h-4" /> }}
      />
      <div className="mb-6">
        <SectionHelp
          title="Comment fonctionne la base de connaissances ?"
          description="Enrichissez vos agents avec des documents et ressources spécifiques à votre entreprise."
          tips={[
            'Les documents sont découpés en extraits pour la recherche sémantique',
            'Formats supportés : PDF, DOCX, TXT, CSV, MD, XLSX',
            'Catégorisez vos documents pour une meilleure organisation',
          ]}
        />
      </div>
      {/* Upload form */}
      {showUpload && (
        <UploadForm
          onClose={() => setShowUpload(false)}
          onUploaded={() => { setShowUpload(false); loadDocuments() }}
        />
      )}

      {/* Search bar */}
      <div className="flex gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300" />
          <input
            type="text"
            placeholder="Rechercher dans votre base de connaissances..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="w-full pl-10 pr-4 py-2.5 input"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={searching || !searchQuery.trim()}
          className="px-4 py-2.5 bg-ink-700 text-white rounded-lg text-sm font-medium hover:bg-ink-600 transition disabled:opacity-50"
        >
          {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Rechercher'}
        </button>
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="input w-auto"
        >
          <option value="">Toutes les catégories</option>
          {CATEGORIES.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Search results */}
      {searchResults && (
        <div className="mb-6 bg-brand-50 border border-brand-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-brand-700">
              Résultats de recherche ({searchResults.length})
            </h3>
            <button onClick={() => setSearchResults(null)} className="text-brand-500 hover:text-brand-700">
              <X className="w-4 h-4" />
            </button>
          </div>
          {searchResults.length === 0 ? (
            <p className="text-sm text-brand-600">Aucun résultat pour cette recherche.</p>
          ) : (
            <div className="space-y-3">
              {searchResults.map((r, i) => (
                <div key={i} className="bg-white rounded-lg p-3 border border-brand-100">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-3.5 h-3.5 text-brand-500" />
                    <span className="text-xs font-medium text-brand-600">{r.document_title}</span>
                    <span className="text-xs bg-brand-50 text-brand-500 px-1.5 py-0.5 rounded">{r.document_category}</span>
                  </div>
                  <p className="text-sm text-ink-600 line-clamp-3">{r.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Documents list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-ink-300" />
        </div>
      ) : documents.length > 0 ? (
        <div className="grid gap-3">
          {documents.map(doc => {
            const status = STATUS_CONFIG[doc.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending
            const StatusIcon = status.Icon
            const tags = (doc.metadata as { tags?: string[] })?.tags || []
            return (
              <div key={doc.id} className="card flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-surface-100 flex items-center justify-center">
                    {doc.file_type === 'url'
                      ? <Globe className="w-5 h-5 text-ink-400" />
                      : <FileText className="w-5 h-5 text-ink-400" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-ink-700 truncate">{doc.title}</h3>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                        <StatusIcon className={`w-3 h-3 ${doc.status === 'processing' ? 'animate-spin' : ''}`} />
                        {status.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-ink-400">
                      <span className="bg-surface-100 px-2 py-0.5 rounded text-xs">{CATEGORIES.find(c => c.value === doc.category)?.label || doc.category}</span>
                      <span>{doc.file_type.toUpperCase()}</span>
                      <span>{formatFileSize(doc.file_size)}</span>
                      {doc.chunks_count > 0 && <span>{doc.chunks_count} extraits</span>}
                      {tags.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          {tags.slice(0, 3).join(', ')}
                        </span>
                      )}
                    </div>
                    {doc.processing_error && (
                      <p className="text-xs text-red-600 mt-1">{doc.processing_error}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="ml-4 p-2 text-ink-300 hover:text-red-600 transition"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-surface-50 rounded-xl border-2 border-dashed border-surface-200">
          <FolderOpen className="w-12 h-12 text-ink-200 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-ink-500 mb-2">Aucun document</h3>
          <p className="text-ink-400 mb-4">Ajoutez des documents pour enrichir les connaissances de vos agents</p>
          <button
            onClick={() => setShowUpload(true)}
            className="btn-brand"
          >
            <Upload className="w-4 h-4" /> Ajouter un document
          </button>
        </div>
      )}
    </div>
  )
}

// ============================================
// Upload form component
// ============================================

function UploadForm({ onClose, onUploaded }: { onClose: () => void; onUploaded: () => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<KnowledgeCategory>('autre')
  const [tags, setTags] = useState('')
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file')
  const [sourceUrl, setSourceUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function getFileType(file: File): KnowledgeFileType | null {
    const ext = file.name.split('.').pop()?.toLowerCase()
    const map: Record<string, KnowledgeFileType> = {
      pdf: 'pdf', docx: 'docx', txt: 'txt', csv: 'csv', md: 'md', xlsx: 'xlsx',
    }
    return map[ext || ''] || null
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      const ft = getFileType(droppedFile)
      if (!ft) {
        alert('Type de fichier non supporté. Types acceptés : PDF, DOCX, TXT, CSV, MD, XLSX')
        return
      }
      setFile(droppedFile)
      if (!title) setTitle(droppedFile.name.replace(/\.[^.]+$/, ''))
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (selected) {
      const ft = getFileType(selected)
      if (!ft) {
        alert('Type de fichier non supporté')
        return
      }
      setFile(selected)
      if (!title) setTitle(selected.name.replace(/\.[^.]+$/, ''))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { alert('Titre requis'); return }

    if (uploadMode === 'file' && !file) { alert('Fichier requis'); return }
    if (uploadMode === 'url' && !sourceUrl.trim()) { alert('URL requise'); return }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('title', title.trim())
      formData.append('description', description.trim())
      formData.append('category', category)
      formData.append('tags', tags)

      if (uploadMode === 'url') {
        formData.append('file_type', 'url')
        formData.append('source_url', sourceUrl.trim())
      } else if (file) {
        const fileType = getFileType(file)
        if (!fileType) { alert('Type non supporté'); return }
        formData.append('file_type', fileType)
        formData.append('file', file)
      }

      const res = await fetch('/api/knowledge', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) {
        alert(data.error || 'Erreur lors de l\'upload')
        return
      }

      onUploaded()
    } catch {
      alert('Erreur lors de l\'upload')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="mb-6 card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-ink-700">Nouveau document</h3>
        <button onClick={onClose} className="text-ink-300 hover:text-ink-500"><X className="w-5 h-5" /></button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Upload mode toggle */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setUploadMode('file')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              uploadMode === 'file'
                ? 'bg-brand-500 text-white'
                : 'bg-surface-100 text-ink-500 hover:bg-surface-200'
            }`}
          >
            <Upload className="w-4 h-4" /> Fichier
          </button>
          <button
            type="button"
            onClick={() => setUploadMode('url')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              uploadMode === 'url'
                ? 'bg-brand-500 text-white'
                : 'bg-surface-100 text-ink-500 hover:bg-surface-200'
            }`}
          >
            <Globe className="w-4 h-4" /> URL
          </button>
        </div>

        {/* File drop zone */}
        {uploadMode === 'file' && (
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
              dragOver
                ? 'border-brand-400 bg-brand-50'
                : file
                  ? 'border-emerald-300 bg-emerald-50'
                  : 'border-surface-200 hover:border-surface-300'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt,.csv,.md,.xlsx"
              onChange={handleFileSelect}
              className="hidden"
            />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-700">{file.name}</span>
                <span className="text-xs text-emerald-600">({formatFileSize(file.size)})</span>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); setFile(null) }}
                  className="text-emerald-600 hover:text-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 text-ink-200 mx-auto mb-2" />
                <p className="text-sm text-ink-400">Glissez un fichier ici ou cliquez pour sélectionner</p>
                <p className="text-xs text-ink-300 mt-1">PDF, DOCX, TXT, CSV, MD, XLSX (max 50 Mo)</p>
              </>
            )}
          </div>
        )}

        {/* URL input */}
        {uploadMode === 'url' && (
          <input
            type="url"
            placeholder="https://exemple.com/page-ou-document"
            value={sourceUrl}
            onChange={e => setSourceUrl(e.target.value)}
            className="input"
          />
        )}

        {/* Title & description */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink-600 mb-1">Titre *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Nom du document"
              className="input"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-600 mb-1">Catégorie</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as KnowledgeCategory)}
              className="input"
            >
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-600 mb-1">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Description optionnelle du document"
            rows={2}
            className="w-full border border-surface-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-600 mb-1">Tags (séparés par des virgules)</label>
          <input
            type="text"
            value={tags}
            onChange={e => setTags(e.target.value)}
            placeholder="poêle, granulés, installation"
            className="input"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">
            Annuler
          </button>
          <button type="submit" disabled={uploading} className="btn-brand">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? 'Upload en cours...' : 'Ajouter'}
          </button>
        </div>
      </form>
    </div>
  )
}
