### Supabase Setup Guide

Complete setup instructions for the arXiv Scanner database.

---

## Step 1: Connect Supabase Integration

1. **In v0 Chat**: Click the sidebar Connect tab
2. **Add Supabase**: Select Supabase from integrations list
3. **Create Project**: 
   - Name: `arxiv-scanner-prod`
   - Region: Choose closest to your users
   - Database Password: Save this securely

---

## Step 2: Run Database Migration

Once Supabase is connected:

1. **Open Supabase Dashboard**: Go to your project at supabase.com
2. **Navigate to SQL Editor**: Left sidebar → SQL Editor
3. **Create New Query**: Click "New query"
4. **Copy Migration**: Open `/supabase/migrations/001_initial_schema.sql`
5. **Paste and Run**: Paste the entire SQL file and click "Run"

You should see: `Success. No rows returned`

---

## Step 3: Verify Schema

Check that tables were created:

```sql
-- Run this query to verify
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

Expected tables:
- `analyses`
- `analysis_requests`
- `papers`
- `sync_logs`
- `user_credits`

---

## Step 4: Configure Environment Variables

The integration should auto-configure these, but verify in v0 sidebar → Vars:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # For server-side operations
```

---

## Step 5: Test Database Connection

Create a test API route:

```typescript
// app/api/test-db/route.ts
import { createServiceClient } from "@/lib/supabase/client"

export async function GET() {
  const supabase = createServiceClient()
  
  // Count papers in database
  const { count, error } = await supabase
    .from("papers")
    .select("*", { count: "exact", head: true })
  
  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
  
  return Response.json({ 
    status: "connected", 
    papers_count: count 
  })
}
```

Visit `/api/test-db` → Should return: `{"status":"connected","papers_count":0}`

---

## Step 6: Enable Extensions (if needed)

Some features require PostgreSQL extensions:

```sql
-- For full-text search (should already be enabled)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- For UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- For vector search (optional - for semantic search)
-- CREATE EXTENSION IF NOT EXISTS "vector";
```

---

## Database Indexes Explained

The migration creates optimized indexes:

| Index | Purpose | Query Speed |
|-------|---------|-------------|
| `idx_papers_published` | Sort by date | < 50ms |
| `idx_papers_primary_category` | Filter by category | < 50ms |
| `idx_papers_search` | Full-text search | < 100ms |
| `idx_papers_categories` | Multi-category filter | < 100ms |

---

## Monitoring & Maintenance

### View Database Size

```sql
SELECT 
  pg_size_pretty(pg_database_size(current_database())) as total_size,
  pg_size_pretty(pg_table_size('papers')) as papers_size,
  pg_size_pretty(pg_table_size('analyses')) as analyses_size;
```

### View Table Stats

```sql
SELECT 
  schemaname,
  tablename,
  n_live_tup as row_count,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;
```

### Check Index Usage

```sql
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as times_used,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

---

## Storage Estimates

| Papers | DB Size | Supabase Plan | Monthly Cost |
|--------|---------|---------------|--------------|
| 100k | ~200MB | Free | $0 |
| 1M | ~2GB | Free | $0 |
| 5M | ~10GB | Pro | $25 |
| 10M | ~20GB | Pro | $25 |

Note: Supabase Free tier includes 500MB. You'll need Pro plan for 5M+ papers.

---

## Backup Strategy

Supabase Pro includes:
- Daily automatic backups (7-day retention)
- Point-in-time recovery (7 days)

Manual backup:

```bash
# Export papers table
pg_dump -h db.your-project.supabase.co \
  -U postgres \
  -d postgres \
  -t papers \
  --data-only \
  -F c \
  -f papers_backup.dump
```

---

## Troubleshooting

### Error: "relation papers does not exist"
**Solution**: Run the migration script in SQL Editor

### Error: "permission denied for table papers"
**Solution**: Check RLS policies. For development, you can disable RLS:
```sql
ALTER TABLE papers DISABLE ROW LEVEL SECURITY;
```

### Error: "remaining connection slots reserved"
**Solution**: You've hit connection limit. Use connection pooling:
```typescript
// Add to supabase client config
{
  db: {
    schema: 'public',
  },
  global: {
    headers: { 'x-connection-timeout': '30000' },
  },
}
```

### Slow queries
**Solution**: Check missing indexes with EXPLAIN ANALYZE:
```sql
EXPLAIN ANALYZE
SELECT * FROM papers 
WHERE primary_category = 'cs.AI' 
ORDER BY published DESC 
LIMIT 50;
```

---

## Next Steps

Once Supabase is setup:

1. **Move to Task 2**: Create bulk import script
2. **Test import**: Upload sample JSON with 100 papers
3. **Verify search**: Test full-text search queries
4. **Setup cron**: Configure daily sync job

---

## Useful SQL Queries

### Find papers without analysis
```sql
SELECT COUNT(*) 
FROM papers p
LEFT JOIN analyses a ON p.id = a.paper_id
WHERE a.id IS NULL;
```

### Get analysis coverage by category
```sql
SELECT * FROM analysis_coverage_by_category
ORDER BY total_papers DESC
LIMIT 20;
```

### Find most cited papers
```sql
SELECT id, title, citation_count, primary_category
FROM papers
ORDER BY citation_count DESC
LIMIT 10;
```

### Check recent sync status
```sql
SELECT * FROM daily_sync_summary
ORDER BY sync_date DESC
LIMIT 7;
```
