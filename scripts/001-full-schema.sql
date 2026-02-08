-- Full schema migration for arXiv Scanner
-- Drops and recreates all tables with proper structure

-- 1. Drop existing tables (in correct dependency order)
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS analysis_requests CASCADE;
DROP TABLE IF EXISTS bookmarks CASCADE;
DROP TABLE IF EXISTS user_credits CASCADE;
DROP TABLE IF EXISTS daily_usage CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS analyses CASCADE;
DROP TABLE IF EXISTS sync_logs CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS papers CASCADE;

-- 2. Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- PAPERS TABLE
-- Stores every paper from arXiv and medRxiv
-- ============================================
CREATE TABLE papers (
  id TEXT PRIMARY KEY,                          -- arXiv ID e.g. "2502.04370v1"
  title TEXT NOT NULL,
  abstract TEXT NOT NULL,
  authors TEXT[] NOT NULL DEFAULT '{}',
  published_date TIMESTAMPTZ,
  updated_date TIMESTAMPTZ,
  categories TEXT[] NOT NULL DEFAULT '{}',
  primary_category TEXT NOT NULL,
  arxiv_url TEXT,
  pdf_url TEXT,
  comment TEXT,
  journal_ref TEXT,
  doi TEXT,
  source TEXT DEFAULT 'arxiv',                  -- 'arxiv' or 'medrxiv'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- AI Analysis fields (nullable until analyzed)
  bs_index INTEGER,                             -- 0-10 scale
  sota_score INTEGER,                           -- 0-10 scale
  is_sota BOOLEAN DEFAULT FALSE,
  one_liner TEXT,
  core_claims TEXT[] DEFAULT '{}',
  red_flags TEXT[] DEFAULT '{}',
  expert_commentary TEXT,
  analyzed_at TIMESTAMPTZ,
  analyzed_by TEXT DEFAULT 'system'             -- 'system' | 'admin' | user_id
);

-- Indexes for papers
CREATE INDEX idx_papers_primary_category ON papers(primary_category);
CREATE INDEX idx_papers_published_date ON papers(published_date DESC);
CREATE INDEX idx_papers_source ON papers(source);
CREATE INDEX idx_papers_is_sota ON papers(is_sota) WHERE is_sota = TRUE;
CREATE INDEX idx_papers_analyzed ON papers(analyzed_at) WHERE analyzed_at IS NOT NULL;
CREATE INDEX idx_papers_categories ON papers USING GIN(categories);
CREATE INDEX idx_papers_created_at ON papers(created_at DESC);

-- ============================================
-- USERS TABLE
-- All user data including auth
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',             -- 'user' | 'admin'
  user_type TEXT NOT NULL DEFAULT 'individual',  -- 'researcher' | 'student' | 'individual' | 'developer' | 'institution'
  institution TEXT,
  avatar_url TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  email_verified BOOLEAN DEFAULT FALSE,
  
  -- Plan info
  plan TEXT NOT NULL DEFAULT 'free',             -- 'free' | 'starter' | 'pro' | 'edu' | 'enterprise'
  daily_analysis_limit INTEGER NOT NULL DEFAULT 0, -- 0 = use welcome credit only
  analyses_used_today INTEGER NOT NULL DEFAULT 0,
  welcome_credit_used BOOLEAN DEFAULT FALSE,
  
  -- Stripe
  stripe_customer_id TEXT UNIQUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_stripe ON users(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX idx_users_plan ON users(plan);

-- ============================================
-- SESSIONS TABLE
-- Secure server-side sessions
-- ============================================
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- ============================================
-- SUBSCRIPTIONS TABLE
-- Stripe subscription tracking
-- ============================================
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  plan TEXT NOT NULL,                            -- 'starter' | 'pro' | 'edu' | 'enterprise'
  status TEXT NOT NULL DEFAULT 'active',         -- 'active' | 'canceled' | 'past_due' | 'trialing'
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- ============================================
-- DAILY USAGE TABLE
-- Track daily analysis usage per user
-- ============================================
CREATE TABLE daily_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  analyses_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, usage_date)
);

CREATE INDEX idx_daily_usage_user_date ON daily_usage(user_id, usage_date);

-- ============================================
-- BOOKMARKS TABLE
-- Papers saved by users
-- ============================================
CREATE TABLE bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  paper_id TEXT NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, paper_id)
);

CREATE INDEX idx_bookmarks_user ON bookmarks(user_id);
CREATE INDEX idx_bookmarks_paper ON bookmarks(paper_id);

-- ============================================
-- ANALYSIS REQUESTS TABLE
-- User requests for AI analysis (free or queued)
-- ============================================
CREATE TABLE analysis_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  paper_id TEXT NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',        -- 'pending' | 'processing' | 'done' | 'failed'
  priority INTEGER DEFAULT 0,                    -- higher = faster processing
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  UNIQUE(user_id, paper_id)
);

CREATE INDEX idx_analysis_requests_status ON analysis_requests(status);
CREATE INDEX idx_analysis_requests_user ON analysis_requests(user_id);

-- ============================================
-- NOTIFICATIONS TABLE
-- User notification system
-- ============================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,                            -- 'analysis_complete' | 'daily_limit' | 'subscription' | 'welcome' | 'system'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  paper_id TEXT REFERENCES papers(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read) WHERE read = FALSE;

-- ============================================
-- SYNC LOGS TABLE
-- Track arXiv/medRxiv sync operations
-- ============================================
CREATE TABLE sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  source TEXT DEFAULT 'arxiv',                   -- 'arxiv' | 'medrxiv'
  status TEXT NOT NULL DEFAULT 'running',        -- 'running' | 'completed' | 'failed'
  papers_found INTEGER DEFAULT 0,
  papers_new INTEGER DEFAULT 0,
  papers_updated INTEGER DEFAULT 0,
  papers_analyzed INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER
);

CREATE INDEX idx_sync_logs_category ON sync_logs(category);
CREATE INDEX idx_sync_logs_started ON sync_logs(started_at DESC);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to reset daily analysis counters (called by cron or at midnight)
CREATE OR REPLACE FUNCTION reset_daily_usage()
RETURNS void AS $$
BEGIN
  UPDATE users SET analyses_used_today = 0;
END;
$$ LANGUAGE plpgsql;

-- Function to get plan limits
CREATE OR REPLACE FUNCTION get_plan_daily_limit(plan_name TEXT)
RETURNS INTEGER AS $$
BEGIN
  RETURN CASE plan_name
    WHEN 'free' THEN 0
    WHEN 'starter' THEN 2       -- ~60/month
    WHEN 'pro' THEN 17          -- ~510/month
    WHEN 'edu' THEN 17          -- same as pro
    WHEN 'enterprise' THEN 1000 -- effectively unlimited
    ELSE 0
  END;
END;
$$ LANGUAGE plpgsql;
