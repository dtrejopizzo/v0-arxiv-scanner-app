# Setup Instructions

## 1. Install Dependencies

First, install all required packages:

```bash
npm install
```

This will install:
- `@neondatabase/serverless` - Neon PostgreSQL client
- `bcryptjs` - Password hashing
- `jose` - JWT token handling
- All other dependencies

## 2. Environment Variables

Add these environment variables to your project (in Vercel dashboard or `.env.local`):

```bash
# Neon Database
DATABASE_URL="your_neon_connection_string"

# JWT Secret (generate a random string)
JWT_SECRET="your_random_secret_key_here"

# Optional: AI Gateway (already configured if using Vercel AI Gateway)
AI_API_KEY="your_ai_api_key"
```

### Getting your DATABASE_URL:

The Neon integration is already connected to your project. You can get the connection string from:
1. Go to Vercel dashboard → Your project → Integrations → Neon
2. Copy the `DATABASE_URL` connection string

## 3. Database Setup

The tables are already created in your Neon database:
- ✅ `users` - User accounts with authentication
- ✅ `papers` - All arXiv papers
- ✅ `analyses` - AI analysis results
- ✅ `bookmarks` - User bookmarks
- ✅ `user_credits` - Credit tracking
- ✅ `sync_logs` - Sync monitoring

Run this SQL to create the bookmarks table (if it doesn't exist):

```sql
CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  paper_id TEXT NOT NULL,
  title TEXT NOT NULL,
  authors TEXT[] NOT NULL,
  abstract TEXT NOT NULL,
  published_date TIMESTAMPTZ NOT NULL,
  arxiv_url TEXT NOT NULL,
  pdf_url TEXT,
  primary_category TEXT NOT NULL,
  categories TEXT[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, paper_id)
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookmarks_paper_id ON bookmarks(paper_id);
```

## 4. Create Admin User

After the app is running, you can create an admin user by signing up at `/signup` and then manually updating the database:

```sql
UPDATE users 
SET is_admin = true, credits = 1000 
WHERE email = 'your@email.com';
```

## 5. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see your app!

## Features Now Available

### For All Users (No Login Required)
- ✅ Browse all papers by category
- ✅ View all existing AI analyses
- ✅ Filter and search papers
- ✅ Read abstracts and metadata

### For Logged-In Users
- ✅ Bookmark papers (unlimited)
- ✅ Request analysis for unanalyzed papers (5 free, then paid)
- ✅ View personal library
- ✅ Track credits

### For Admin Users
- ✅ Access `/admin` dashboard
- ✅ Bulk import papers
- ✅ Trigger daily sync cron jobs
- ✅ Monitor system status

## Next Steps

1. **Import Historical Papers**: Upload your 191k cs.AI papers JSON to the bulk import endpoint
2. **Setup Cron Jobs**: Configure Vercel cron for daily paper syncing
3. **Configure Stripe**: Add payment integration for credits (optional)
4. **Customize Branding**: Update colors, logo, and copy

## Troubleshooting

**Module not found errors?**
→ Run `npm install` to install dependencies

**Database connection errors?**
→ Check that `DATABASE_URL` is set correctly in environment variables

**Authentication not working?**
→ Make sure `JWT_SECRET` is set and is a long random string

**Can't create bookmarks?**
→ Check that the bookmarks table exists in your database

Need help? Check the other documentation files:
- `ARCHITECTURE.md` - System architecture overview
- `NEON_MIGRATION.md` - Database details
- `PAPERS_PROCESSING.md` - How paper syncing works
