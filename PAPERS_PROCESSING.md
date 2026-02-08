# Papers Processing with AI Analysis

This guide explains how to process the papers in `all_papers.json` with AI-powered analysis.

## Overview

The system can analyze research papers from arXiv and medRxiv using OpenAI's GPT-4o-mini model through the Vercel AI Gateway. Each paper receives:

- **BS Index** (0-10): Measures rigor vs speculation
- **Core Claims**: 2-4 key contributions
- **Red Flags**: Methodological concerns
- **Expert Commentary**: 2-3 sentence analysis
- **SOTA Score** (0-10): State-of-the-art relevance
- **One-liner**: Compelling summary

## Quick Start

### Option 1: Using the Admin Panel (Recommended)

1. Navigate to `/admin` in your browser
2. Enter the admin password: `Santander2728,2025*34erASsa35`
3. Check the "All Papers Status" card to see analysis progress
4. Click **"Process all_papers.json with AI"** button
5. Monitor the generation log for progress

### Option 2: Using the API Endpoint

```bash
# Process all categories (default batch size: 5 papers per category)
curl -X POST http://localhost:3000/api/process-papers \
  -H "Content-Type: application/json" \
  -d '{"batchSize": 5}'

# Process a specific category
curl -X POST http://localhost:3000/api/process-papers \
  -H "Content-Type: application/json" \
  -d '{"category": "cs.AI", "batchSize": 10}'
```

### Option 3: Using the Script

```bash
# Install dependencies first
npm install

# Run the processing script
npx tsx scripts/process-papers.ts
```

## File Structure

```
public/data/analyses/
├── all_papers.json          # Raw papers organized by category
├── cs-AI.json              # Analyzed papers for cs.AI
├── cs-LG.json              # Analyzed papers for cs.LG
└── [category].json         # Generated files for each category
```

## Input Format (all_papers.json)

```json
{
  "cs.AI": [
    {
      "id": "2602.06043v1",
      "title": "Paper Title",
      "summary": "Paper abstract...",
      "published": "2026-02-05T18:59:58Z",
      "authors": ["Author 1", "Author 2"],
      "link": "http://arxiv.org/abs/...",
      "pdfLink": "http://arxiv.org/pdf/...",
      "categories": ["cs.LG", "cs.AI"],
      "primaryCategory": "cs.AI",
      "source": "arxiv"
    }
  ]
}
```

## Output Format

Each category file contains:

```json
{
  "category": "cs.AI",
  "categoryName": "cs.AI",
  "generatedAt": "2026-02-08T...",
  "paperCount": 100,
  "analyzedCount": 100,
  "papers": [
    {
      // ... original paper fields
      "analysis": {
        "bsIndex": 3,
        "coreClaims": ["Claim 1", "Claim 2"],
        "redFlags": ["Concern 1"],
        "expertCommentary": "Analysis...",
        "sotaScore": 8,
        "isSOTA": true,
        "oneLiner": "Summary"
      }
    }
  ],
  "sotaRanking": [
    // Top 20 papers with SOTA score >= 5
  ]
}
```

## Rate Limiting

The system implements automatic rate limiting:
- 1 second delay between paper analyses
- Batch processing to prevent overwhelming the API
- Configurable batch size (default: 5 papers)

## Monitoring Progress

### Admin Panel
- Real-time status display
- Category-by-category breakdown
- Overall progress metrics
- Generation logs

### API Status Endpoint
```bash
curl http://localhost:3000/api/papers-status
```

Returns:
```json
{
  "categories": [
    {
      "category": "cs.AI",
      "total": 100,
      "analyzed": 50,
      "needsAnalysis": 50,
      "progress": 50
    }
  ],
  "summary": {
    "totalCategories": 10,
    "totalPapers": 1000,
    "totalAnalyzed": 500,
    "totalNeedsAnalysis": 500,
    "overallProgress": 50
  }
}
```

## Error Handling

If a paper fails to analyze:
- Default analysis values are used
- Error is logged to console
- Processing continues with next paper
- Failed papers can be retried by reprocessing

## Cost Estimation

Using GPT-4o-mini:
- ~$0.001 per paper analysis
- 1000 papers ≈ $1.00
- Average response time: 1-2 seconds per paper

## Tips

1. **Start Small**: Test with a small batch first (`batchSize: 5`)
2. **Monitor Costs**: Check your OpenAI usage dashboard
3. **Incremental Processing**: Process one category at a time
4. **Backup Data**: Keep a copy of `all_papers.json` before processing
5. **Review Results**: Check a few analyzed papers manually to ensure quality

## Troubleshooting

### Papers not appearing in dashboard
- Refresh the page
- Check file names match category codes (e.g., `cs-AI.json` not `cs.AI.json`)

### Analysis fails
- Check your AI Gateway API key is set
- Verify network connectivity
- Check console logs for specific errors

### Rate limit errors
- Increase delay between requests in the script
- Reduce batch size

## Next Steps

After processing:
1. View analyzed papers in the main dashboard
2. Browse SOTA rankings for each category
3. Export results for further analysis
4. Set up automated daily processing
