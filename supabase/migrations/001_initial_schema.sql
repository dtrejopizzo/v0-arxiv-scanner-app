-- Migration 001: Initial Schema for arXiv Scanner
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search

-- =============================================================================
-- TABLE: papers
-- Stores all paper metadata (5M+ papers)
-- =============================================================================
CREATE TABLE IF NOT EXISTS papers (
  id TEXT PRIMARY KEY,              -- arXiv ID (e.g., "2401.12345")
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  authors TEXT[] NOT NULL,
  categories TEXT[] NOT NULL,
  primary_category TEXT NOT NULL,
  published TIMESTAMPTZ NOT NULL,
  updated TIMESTAMPTZ,
  pdf_url TEXT,
  abs_url TEXT,
  comment TEXT,
  journal_ref TEXT,
  doi TEXT,
  
  -- Additional metadata
  citation_count INTEGER DEFAULT 0,
  source TEXT DEFAULT 'arxiv' CHECK (source IN ('arxiv', 'medrxiv')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  indexed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Full-text search vector (auto-generated)
ALTER TABLE papers ADD COLUMN search_vector tsvector 
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
    setweight(to_tsvector('english', array_to_string(authors, ' ')), 'C')
  ) STORED;

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_papers_published ON papers(published DESC);
CREATE INDEX IF NOT EXISTS idx_papers_primary_category ON papers(primary_category);
CREATE INDEX IF NOT EXISTS idx_papers_categories ON papers USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_papers_search ON papers USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_papers_source ON papers(source);
CREATE INDEX IF NOT EXISTS idx_papers_created_at ON papers(created_at DESC);

-- Trigram index for fuzzy author search
CREATE INDEX IF NOT EXISTS idx_papers_authors_trgm ON papers USING GIN(authors gin_trgm_ops);

-- =============================================================================
-- TABLE: analyses
-- Stores AI-generated analysis (one per paper, cached for all users)
-- =============================================================================
CREATE TABLE IF NOT EXISTS analyses (
  id SERIAL PRIMARY KEY,
  paper_id TEXT NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  
  -- Analysis metrics
  bs_index INTEGER NOT NULL CHECK (bs_index >= 0 AND bs_index <= 10),
  sota_score INTEGER NOT NULL CHECK (sota_score >= 0 AND sota_score <= 10),
  is_sota BOOLEAN DEFAULT FALSE,
  
  -- Analysis content
  core_claims TEXT[] NOT NULL,
  red_flags TEXT[] DEFAULT '{}',
  expert_commentary TEXT NOT NULL,
  one_liner TEXT NOT NULL,
  
  -- Analysis metadata
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  model_used TEXT DEFAULT 'gpt-4o-mini',
  analysis_version INTEGER DEFAULT 1,
  requested_by UUID,  -- References auth.users(id) when auth is enabled
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_paper_analysis UNIQUE(paper_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_analyses_paper_id ON analyses(paper_id);
CREATE INDEX IF NOT EXISTS idx_analyses_bs_index ON analyses(bs_index);
CREATE INDEX IF NOT EXISTS idx_analyses_sota_score ON analyses(sota_score);
CREATE INDEX IF NOT EXISTS idx_analyses_is_sota ON analyses(is_sota) WHERE is_sota = true;
CREATE INDEX IF NOT EXISTS idx_analyses_analyzed_at ON analyses(analyzed_at DESC);

-- =============================================================================
-- TABLE: sync_logs
-- Tracks daily sync operations
-- =============================================================================
CREATE TABLE IF NOT EXISTS sync_logs (
  id SERIAL PRIMARY KEY,
  sync_date DATE NOT NULL,
  category TEXT NOT NULL,
  papers_found INTEGER DEFAULT 0,
  papers_inserted INTEGER DEFAULT 0,
  papers_analyzed INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  duration_ms INTEGER,
  status TEXT CHECK (status IN ('running', 'success', 'failed', 'partial')),
  error_message TEXT,
  
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  CONSTRAINT unique_sync_run UNIQUE(sync_date, category)
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_date ON sync_logs(sync_date DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_category ON sync_logs(category);

-- =============================================================================
-- TABLE: user_credits (optional - for monetization)
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_credits (
  user_id UUID PRIMARY KEY,  -- References auth.users(id) when auth is enabled
  credits_remaining INTEGER DEFAULT 5,  -- Free tier: 5 analysis credits
  total_analyses INTEGER DEFAULT 0,
  last_refill TIMESTAMPTZ,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'unlimited')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_credits_plan ON user_credits(plan);

-- =============================================================================
-- TABLE: analysis_requests (tracks user requests for analytics)
-- =============================================================================
CREATE TABLE IF NOT EXISTS analysis_requests (
  id SERIAL PRIMARY KEY,
  paper_id TEXT NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  user_id UUID,  -- NULL for anonymous, UUID for logged-in users
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_analysis_requests_paper_id ON analysis_requests(paper_id);
CREATE INDEX IF NOT EXISTS idx_analysis_requests_user_id ON analysis_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_requests_status ON analysis_requests(status);
CREATE INDEX IF NOT EXISTS idx_analysis_requests_requested_at ON analysis_requests(requested_at DESC);

-- =============================================================================
-- VIEWS: Useful views for common queries
-- =============================================================================

-- View: Recent papers with analysis status
CREATE OR REPLACE VIEW recent_papers_with_analysis AS
SELECT 
  p.id,
  p.title,
  p.primary_category,
  p.published,
  p.authors,
  p.source,
  CASE WHEN a.id IS NOT NULL THEN true ELSE false END as has_analysis,
  a.bs_index,
  a.sota_score,
  a.is_sota,
  a.one_liner
FROM papers p
LEFT JOIN analyses a ON p.id = a.paper_id
ORDER BY p.published DESC;

-- View: Analysis coverage by category
CREATE OR REPLACE VIEW analysis_coverage_by_category AS
SELECT 
  primary_category,
  COUNT(*) as total_papers,
  COUNT(a.id) as analyzed_papers,
  ROUND(100.0 * COUNT(a.id) / COUNT(*), 2) as coverage_percent
FROM papers p
LEFT JOIN analyses a ON p.id = a.paper_id
GROUP BY primary_category
ORDER BY total_papers DESC;

-- View: Daily sync summary
CREATE OR REPLACE VIEW daily_sync_summary AS
SELECT 
  sync_date,
  COUNT(*) as categories_synced,
  SUM(papers_found) as total_papers_found,
  SUM(papers_inserted) as total_papers_inserted,
  SUM(papers_analyzed) as total_papers_analyzed,
  SUM(errors) as total_errors,
  AVG(duration_ms) as avg_duration_ms,
  COUNT(*) FILTER (WHERE status = 'success') as successful_syncs,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_syncs
FROM sync_logs
GROUP BY sync_date
ORDER BY sync_date DESC;

-- =============================================================================
-- FUNCTIONS: Helper functions
-- =============================================================================

-- Function: Search papers with full-text search
CREATE OR REPLACE FUNCTION search_papers(
  search_query TEXT,
  category_filter TEXT DEFAULT NULL,
  limit_count INTEGER DEFAULT 50,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id TEXT,
  title TEXT,
  summary TEXT,
  authors TEXT[],
  primary_category TEXT,
  published TIMESTAMPTZ,
  has_analysis BOOLEAN,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.title,
    p.summary,
    p.authors,
    p.primary_category,
    p.published,
    CASE WHEN a.id IS NOT NULL THEN true ELSE false END as has_analysis,
    ts_rank(p.search_vector, plainto_tsquery('english', search_query)) as rank
  FROM papers p
  LEFT JOIN analyses a ON p.id = a.paper_id
  WHERE 
    p.search_vector @@ plainto_tsquery('english', search_query)
    AND (category_filter IS NULL OR p.primary_category = category_filter)
  ORDER BY rank DESC, p.published DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Function: Get paper with analysis (if exists)
CREATE OR REPLACE FUNCTION get_paper_with_analysis(paper_id_param TEXT)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'paper', row_to_json(p),
    'analysis', row_to_json(a)
  ) INTO result
  FROM papers p
  LEFT JOIN analyses a ON p.id = a.paper_id
  WHERE p.id = paper_id_param;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) - Enable when auth is ready
-- =============================================================================

-- Enable RLS on tables (commented out until auth is configured)
-- ALTER TABLE papers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

-- Papers: Public read access
-- CREATE POLICY "Papers are viewable by everyone" ON papers
--   FOR SELECT USING (true);

-- Analyses: Public read access
-- CREATE POLICY "Analyses are viewable by everyone" ON analyses
--   FOR SELECT USING (true);

-- User credits: Users can only see their own credits
-- CREATE POLICY "Users can view their own credits" ON user_credits
--   FOR SELECT USING (auth.uid() = user_id);

-- =============================================================================
-- SAMPLE DATA (optional - for testing)
-- =============================================================================

-- Uncomment to insert sample data:
-- INSERT INTO papers (id, title, summary, authors, categories, primary_category, published, pdf_url, abs_url) VALUES
-- ('2401.00001', 'Sample AI Paper', 'This is a sample abstract about artificial intelligence.', ARRAY['John Doe', 'Jane Smith'], ARRAY['cs.AI', 'cs.LG'], 'cs.AI', '2024-01-01 00:00:00+00', 'https://arxiv.org/pdf/2401.00001', 'https://arxiv.org/abs/2401.00001');

-- =============================================================================
-- GRANTS (for API access via service role)
-- =============================================================================

-- Grant access to anon and authenticated roles (when auth is enabled)
-- GRANT SELECT ON papers TO anon;
-- GRANT SELECT ON analyses TO anon;
-- GRANT SELECT, INSERT, UPDATE ON analysis_requests TO authenticated;
-- GRANT SELECT, UPDATE ON user_credits TO authenticated;
