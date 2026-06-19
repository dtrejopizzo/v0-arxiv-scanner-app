-- Add tex_url column to daily_papers for arXiv LaTeX source downloads
ALTER TABLE daily_papers ADD COLUMN IF NOT EXISTS tex_url TEXT;

-- Backfill existing rows: arXiv source is always at /src/{id}
UPDATE daily_papers SET tex_url = 'https://arxiv.org/src/' || id WHERE tex_url IS NULL;
