-- Migration 005: Knowledge Base
-- Allows clients to upload documents and create a searchable knowledge base for their agents

-- ============================================
-- Enable pgvector extension (for future embeddings)
-- ============================================

CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- TABLE: knowledge_documents
-- ============================================

CREATE TABLE public.knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,

  -- Document info
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'autre' CHECK (category IN (
    'produits', 'services', 'technique', 'commercial', 'juridique', 'rh', 'autre'
  )),

  -- File info
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'docx', 'txt', 'csv', 'md', 'xlsx', 'url')),
  file_size INTEGER, -- bytes
  storage_path TEXT, -- Supabase Storage path
  source_url TEXT, -- original URL if type = 'url'

  -- Extracted content
  raw_text TEXT, -- full extracted text content for reference

  -- Processing status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'error')),
  processing_error TEXT,
  chunks_count INTEGER DEFAULT 0,

  -- Metadata
  metadata JSONB DEFAULT '{}', -- { version, author, tags[], page_count }

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- TABLE: knowledge_chunks
-- ============================================

CREATE TABLE public.knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,

  -- Chunk content
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL, -- position in document (0-based)

  -- Embedding for semantic search (nullable, populated later)
  embedding vector(1536),

  -- Metadata
  metadata JSONB DEFAULT '{}', -- { page_number, section_title, ... }

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- Full-text search index on chunks
-- ============================================

-- GIN index for PostgreSQL full-text search
ALTER TABLE public.knowledge_chunks ADD COLUMN tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('french', content)) STORED;

CREATE INDEX idx_knowledge_chunks_tsv ON public.knowledge_chunks USING GIN(tsv);

-- ============================================
-- Indexes
-- ============================================

CREATE INDEX idx_knowledge_documents_client_id ON public.knowledge_documents(client_id);
CREATE INDEX idx_knowledge_documents_status ON public.knowledge_documents(client_id, status);
CREATE INDEX idx_knowledge_documents_category ON public.knowledge_documents(client_id, category);

CREATE INDEX idx_knowledge_chunks_document_id ON public.knowledge_chunks(document_id);
CREATE INDEX idx_knowledge_chunks_client_id ON public.knowledge_chunks(client_id);
CREATE INDEX idx_knowledge_chunks_order ON public.knowledge_chunks(document_id, chunk_index);

-- HNSW index for future pgvector semantic search (created on nullable column)
-- Will become effective once embeddings are populated
CREATE INDEX idx_knowledge_chunks_embedding ON public.knowledge_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ============================================
-- RLS: knowledge_documents
-- ============================================

ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything on knowledge_documents"
  ON public.knowledge_documents FOR ALL
  USING (public.is_admin());

CREATE POLICY "Clients can view own knowledge documents"
  ON public.knowledge_documents FOR SELECT
  USING (client_id = public.get_my_client_id());

CREATE POLICY "Clients can create own knowledge documents"
  ON public.knowledge_documents FOR INSERT
  WITH CHECK (client_id = public.get_my_client_id());

CREATE POLICY "Clients can update own knowledge documents"
  ON public.knowledge_documents FOR UPDATE
  USING (client_id = public.get_my_client_id());

CREATE POLICY "Clients can delete own knowledge documents"
  ON public.knowledge_documents FOR DELETE
  USING (client_id = public.get_my_client_id());

-- ============================================
-- RLS: knowledge_chunks
-- ============================================

ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything on knowledge_chunks"
  ON public.knowledge_chunks FOR ALL
  USING (public.is_admin());

CREATE POLICY "Clients can view own knowledge chunks"
  ON public.knowledge_chunks FOR SELECT
  USING (client_id = public.get_my_client_id());

CREATE POLICY "Clients can create own knowledge chunks"
  ON public.knowledge_chunks FOR INSERT
  WITH CHECK (client_id = public.get_my_client_id());

CREATE POLICY "Clients can delete own knowledge chunks"
  ON public.knowledge_chunks FOR DELETE
  USING (client_id = public.get_my_client_id());

-- ============================================
-- Updated_at trigger
-- ============================================

CREATE TRIGGER set_updated_at_knowledge_documents
  BEFORE UPDATE ON public.knowledge_documents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- Storage bucket for knowledge files
-- ============================================

-- Note: Bucket creation and policies must be applied via Supabase Dashboard or CLI:
--
-- 1. Create bucket 'knowledge-files' with:
--    - Public: false
--    - File size limit: 52428800 (50MB)
--    - Allowed MIME types: application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document,
--      text/plain, text/csv, text/markdown, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
--
-- 2. Storage policies (applied in SQL below):

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'knowledge-files',
  'knowledge-files',
  false,
  52428800, -- 50MB
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/csv',
    'text/markdown',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Storage policies: each client can only access their own folder ({client_id}/)
CREATE POLICY "Clients can upload to own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'knowledge-files'
    AND (storage.foldername(name))[1] = public.get_my_client_id()::text
  );

CREATE POLICY "Clients can read own files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'knowledge-files'
    AND (storage.foldername(name))[1] = public.get_my_client_id()::text
  );

CREATE POLICY "Clients can delete own files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'knowledge-files'
    AND (storage.foldername(name))[1] = public.get_my_client_id()::text
  );

CREATE POLICY "Admins can manage all knowledge files"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'knowledge-files'
    AND public.is_admin()
  );
