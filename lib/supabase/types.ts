// Generated TypeScript types for Supabase schema
// Keep in sync with 001_initial_schema.sql

export interface Paper {
  id: string // arXiv ID (e.g., "2401.12345")
  title: string
  summary: string
  authors: string[]
  categories: string[]
  primary_category: string
  published: string // ISO timestamp
  updated?: string | null
  pdf_url?: string | null
  abs_url?: string | null
  comment?: string | null
  journal_ref?: string | null
  doi?: string | null
  citation_count: number
  source: "arxiv" | "medrxiv"
  created_at: string
  indexed_at: string
}

export interface Analysis {
  id: number
  paper_id: string
  bs_index: number // 0-10
  sota_score: number // 0-10
  is_sota: boolean
  core_claims: string[]
  red_flags: string[]
  expert_commentary: string
  one_liner: string
  analyzed_at: string
  model_used: string
  analysis_version: number
  requested_by?: string | null
  created_at: string
}

export interface SyncLog {
  id: number
  sync_date: string // Date string
  category: string
  papers_found: number
  papers_inserted: number
  papers_analyzed: number
  errors: number
  duration_ms?: number | null
  status: "running" | "success" | "failed" | "partial"
  error_message?: string | null
  started_at: string
  completed_at?: string | null
}

export interface UserCredits {
  user_id: string
  credits_remaining: number
  total_analyses: number
  last_refill?: string | null
  plan: "free" | "pro" | "unlimited"
  created_at: string
  updated_at: string
}

export interface AnalysisRequest {
  id: number
  paper_id: string
  user_id?: string | null
  status: "pending" | "processing" | "completed" | "failed"
  error_message?: string | null
  requested_at: string
  completed_at?: string | null
}

// Combined types for common queries
export interface PaperWithAnalysis extends Paper {
  analysis?: Analysis | null
}

export interface RecentPaperWithAnalysis {
  id: string
  title: string
  primary_category: string
  published: string
  authors: string[]
  source: "arxiv" | "medrxiv"
  has_analysis: boolean
  bs_index?: number | null
  sota_score?: number | null
  is_sota?: boolean | null
  one_liner?: string | null
}

export interface CategoryCoverage {
  primary_category: string
  total_papers: number
  analyzed_papers: number
  coverage_percent: number
}

export interface DailySyncSummary {
  sync_date: string
  categories_synced: number
  total_papers_found: number
  total_papers_inserted: number
  total_papers_analyzed: number
  total_errors: number
  avg_duration_ms: number
  successful_syncs: number
  failed_syncs: number
}

// Search result type
export interface SearchResult {
  id: string
  title: string
  summary: string
  authors: string[]
  primary_category: string
  published: string
  has_analysis: boolean
  rank: number // Full-text search ranking score
}

// Database schema for Supabase client
export interface Database {
  public: {
    Tables: {
      papers: {
        Row: Paper
        Insert: Omit<Paper, "created_at" | "indexed_at">
        Update: Partial<Omit<Paper, "id" | "created_at" | "indexed_at">>
      }
      analyses: {
        Row: Analysis
        Insert: Omit<Analysis, "id" | "created_at" | "analyzed_at">
        Update: Partial<Omit<Analysis, "id" | "paper_id" | "created_at">>
      }
      sync_logs: {
        Row: SyncLog
        Insert: Omit<SyncLog, "id" | "started_at">
        Update: Partial<Omit<SyncLog, "id" | "sync_date" | "category">>
      }
      user_credits: {
        Row: UserCredits
        Insert: Omit<UserCredits, "created_at" | "updated_at">
        Update: Partial<Omit<UserCredits, "user_id" | "created_at">>
      }
      analysis_requests: {
        Row: AnalysisRequest
        Insert: Omit<AnalysisRequest, "id" | "requested_at">
        Update: Partial<Omit<AnalysisRequest, "id" | "paper_id" | "requested_at">>
      }
    }
    Views: {
      recent_papers_with_analysis: {
        Row: RecentPaperWithAnalysis
      }
      analysis_coverage_by_category: {
        Row: CategoryCoverage
      }
      daily_sync_summary: {
        Row: DailySyncSummary
      }
    }
    Functions: {
      search_papers: {
        Args: {
          search_query: string
          category_filter?: string | null
          limit_count?: number
          offset_count?: number
        }
        Returns: SearchResult[]
      }
      get_paper_with_analysis: {
        Args: {
          paper_id_param: string
        }
        Returns: {
          paper: Paper
          analysis: Analysis | null
        }
      }
    }
  }
}
