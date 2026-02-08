import { neon } from '@neondatabase/serverless'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set')
}

export const sql = neon(process.env.DATABASE_URL)

// Type-safe query helpers
export type Paper = {
  id: string
  title: string
  authors: string[]
  categories: string[]
  abstract: string
  published_date: Date
  updated_date: Date | null
  pdf_url: string | null
  arxiv_url: string
  comment: string | null
  journal_ref: string | null
  doi: string | null
  primary_category: string
  created_at: Date
}

export type Analysis = {
  id: string
  paper_id: string
  bs_index: number
  core_claims: string[]
  red_flags: string[] | null
  expert_commentary: string
  sota_score: number
  is_sota: boolean
  one_liner: string
  analyzed_by: string | null
  analyzed_at: Date
}

export type User = {
  id: string
  email: string
  password_hash: string
  full_name: string | null
  credits: number
  is_admin: boolean
  created_at: Date
  updated_at: Date
}

export type UserCredit = {
  id: string
  user_id: string
  paper_id: string
  credits_used: number
  created_at: Date
}

export type SyncLog = {
  id: string
  category: string
  papers_found: number
  papers_new: number
  papers_updated: number
  status: 'success' | 'partial' | 'failed'
  error_message: string | null
  started_at: Date
  completed_at: Date | null
  duration_seconds: number | null
}
