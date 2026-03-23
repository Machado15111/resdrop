-- ═══════════════════════════════════════════════════════════════
-- Migration v5: Document Uploads
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS document_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL REFERENCES users(email),
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INT,
  storage_path TEXT,
  extracted_data JSONB,
  confidence_scores JSONB,
  booking_id UUID REFERENCES bookings(id),
  status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded','processing','extracted','reviewed','created','failed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doc_uploads_email ON document_uploads(user_email);
ALTER TABLE document_uploads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Server full access document_uploads" ON document_uploads;
CREATE POLICY "Server full access document_uploads" ON document_uploads FOR ALL USING (true);
