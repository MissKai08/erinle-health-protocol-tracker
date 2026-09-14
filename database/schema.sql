-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- SUPPLEMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS supplements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'supplement' CHECK (category IN ('supplement', 'prescription')),
  dose TEXT,
  timing TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  conditions TEXT[] DEFAULT '{}',
  reason TEXT,
  prescriber TEXT,
  refill_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_supplements_user ON supplements(user_id);
CREATE INDEX idx_supplements_status ON supplements(status);
CREATE INDEX idx_supplements_category ON supplements(category);

-- ============================================
-- PROTOCOLS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'daily-schedule' CHECK (type IN ('daily-schedule', 'pt-routine', 'dietary')),
  content TEXT,
  conditions TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_protocols_user ON protocols(user_id);
CREATE INDEX idx_protocols_type ON protocols(type);

-- ============================================
-- SOURCES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'article' CHECK (source_type IN ('ai-chat', 'pdf', 'docx', 'article')),
  content TEXT,
  date_captured DATE DEFAULT CURRENT_DATE,
  conditions TEXT[] DEFAULT '{}',
  linked_item_ids UUID[] DEFAULT '{}',
  original_file_url TEXT,
  search_vector TSVECTOR,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sources_user ON sources(user_id);
CREATE INDEX idx_sources_type ON sources(source_type);
CREATE INDEX idx_sources_search ON sources USING GIN(search_vector);

-- ============================================
-- DAILY LOG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS daily_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  log_date DATE NOT NULL,
  item_id UUID NOT NULL,
  item_type TEXT NOT NULL,
  done BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, log_date, item_id)
);

CREATE INDEX idx_dailylog_user ON daily_log(user_id);
CREATE INDEX idx_dailylog_date ON daily_log(log_date);

-- ============================================
-- SYMPTOM LOG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS symptom_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  symptom TEXT NOT NULL,
  severity INTEGER NOT NULL CHECK (severity BETWEEN 1 AND 5),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_symptomlog_user ON symptom_log(user_id);
CREATE INDEX idx_symptomlog_date ON symptom_log(log_date);

-- ============================================
-- TRIGGERS FOR updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_supplements_updated_at
  BEFORE UPDATE ON supplements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_protocols_updated_at
  BEFORE UPDATE ON protocols
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FULL-TEXT SEARCH VECTORS
-- ============================================
CREATE OR REPLACE FUNCTION sources_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector =
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sources_search_vector_trigger
  BEFORE INSERT OR UPDATE ON sources
  FOR EACH ROW EXECUTE FUNCTION sources_search_vector_update();

CREATE OR REPLACE FUNCTION protocols_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector =
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER protocols_search_vector_trigger
  BEFORE INSERT OR UPDATE ON protocols
  FOR EACH ROW EXECUTE FUNCTION protocols_search_vector_update();

-- Add search_vector column to protocols
ALTER TABLE protocols ADD COLUMN IF NOT EXISTS search_vector TSVECTOR;
CREATE INDEX idx_protocols_search ON protocols USING GIN(search_vector);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE supplements ENABLE ROW LEVEL SECURITY;
ALTER TABLE protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE symptom_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User can access own supplements" ON supplements
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "User can access own protocols" ON protocols
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "User can access own sources" ON sources
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "User can access own daily_log" ON daily_log
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "User can access own symptom_log" ON symptom_log
  FOR ALL USING (user_id = auth.uid());

-- ============================================
-- STORAGE BUCKET
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('library-uploads', 'library-uploads', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Service can read library-uploads" ON storage.objects
  FOR SELECT USING (bucket_id = 'library-uploads');

CREATE POLICY "Service can write library-uploads" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'library-uploads');

CREATE POLICY "Service can update library-uploads" ON storage.objects
  FOR UPDATE USING (bucket_id = 'library-uploads');

CREATE POLICY "Service can delete library-uploads" ON storage.objects
  FOR DELETE USING (bucket_id = 'library-uploads');
