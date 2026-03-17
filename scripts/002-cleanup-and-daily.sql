-- Step 1: Clear all bulk-uploaded data using CASCADE to handle FK constraints

TRUNCATE TABLE analysis_requests, bookmarks, notifications, daily_usage, sync_logs, papers CASCADE;

-- Step 2: New tables for daily 100-paper approach

DROP TABLE IF EXISTS category_rankings CASCADE;
DROP TABLE IF EXISTS daily_papers CASCADE;
DROP TABLE IF EXISTS daily_fetch_batches CASCADE;

CREATE TABLE daily_fetch_batches (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category         TEXT NOT NULL,
  fetch_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  papers_fetched   INTEGER DEFAULT 0,
  papers_analyzed  INTEGER DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'running',
  error_message    TEXT,
  started_at       TIMESTAMPTZ DEFAULT NOW(),
  completed_at     TIMESTAMPTZ,
  UNIQUE(category, fetch_date)
);

CREATE INDEX idx_batches_category_date ON daily_fetch_batches(category, fetch_date DESC);

CREATE TABLE daily_papers (
  id                TEXT NOT NULL,
  category          TEXT NOT NULL,
  fetch_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  title             TEXT NOT NULL,
  abstract          TEXT NOT NULL,
  authors           TEXT[] NOT NULL DEFAULT '{}',
  published_date    TIMESTAMPTZ,
  arxiv_url         TEXT,
  pdf_url           TEXT,
  bs_index          INTEGER,
  sota_score        INTEGER,
  is_sota           BOOLEAN DEFAULT FALSE,
  one_liner         TEXT,
  core_claims       TEXT[] DEFAULT '{}',
  red_flags         TEXT[] DEFAULT '{}',
  expert_commentary TEXT,
  analyzed_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, category, fetch_date)
);

CREATE INDEX idx_daily_papers_category_date ON daily_papers(category, fetch_date DESC);
CREATE INDEX idx_daily_papers_sota          ON daily_papers(category, sota_score DESC) WHERE sota_score IS NOT NULL;
CREATE INDEX idx_daily_papers_published     ON daily_papers(published_date DESC);

CREATE TABLE category_rankings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category          TEXT NOT NULL,
  rank_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  rank_position     INTEGER NOT NULL,
  paper_id          TEXT NOT NULL,
  fetch_date        DATE NOT NULL,
  sota_score        INTEGER NOT NULL,
  bs_index          INTEGER,
  title             TEXT NOT NULL,
  authors           TEXT[],
  published_date    TIMESTAMPTZ,
  arxiv_url         TEXT,
  one_liner         TEXT,
  expert_commentary TEXT,
  UNIQUE(category, rank_date, rank_position)
);

CREATE INDEX idx_rankings_category_date ON category_rankings(category, rank_date DESC);
