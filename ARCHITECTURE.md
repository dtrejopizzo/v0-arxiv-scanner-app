# 🏗️ Arquitectura del Sistema - arXiv Scanner Pro

## 📋 Resumen Ejecutivo

Sistema de escaneo y análisis de papers académicos con énfasis en eficiencia de costos y performance a escala de millones de papers.

## 🎯 Flujo de Datos

```
┌─────────────────────────────────────────────────────────────┐
│                    FASE 1: CARGA HISTÓRICA                  │
│                                                             │
│  Usuario sube JSON → Bulk Import Script → PostgreSQL       │
│  (5M+ papers sin análisis, solo metadata)                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    FASE 2: SYNC DIARIO                      │
│                                                             │
│  Cron (21:00 EST) → Fetch arXiv API → Detect New Papers    │
│       ↓                                                     │
│  Insert to DB → Auto-Analyze with AI → Cache Results       │
│  (~100-200 papers/día = $2-5/día en costos de IA)          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                 FASE 3: ANÁLISIS BAJO DEMANDA               │
│                                                             │
│  Usuario ve paper histórico sin análisis                   │
│       ↓                                                     │
│  Auth Check → AI Analysis (GPT-4o-mini) → Save to DB       │
│       ↓                                                     │
│  Próximo usuario ve mismo paper → Cached (gratis)          │
└─────────────────────────────────────────────────────────────┘
```

## 🗄️ Esquema de Base de Datos

### Tabla: `papers`
```sql
CREATE TABLE papers (
  id TEXT PRIMARY KEY,              -- arXiv ID (ej: "2401.12345")
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
  
  -- Metadata adicional
  citation_count INTEGER DEFAULT 0,
  source TEXT DEFAULT 'arxiv',     -- 'arxiv' | 'medrxiv'
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  indexed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Índices para búsqueda rápida
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(summary, '')), 'B')
  ) STORED
);

-- Índices
CREATE INDEX idx_papers_published ON papers(published DESC);
CREATE INDEX idx_papers_primary_category ON papers(primary_category);
CREATE INDEX idx_papers_categories ON papers USING GIN(categories);
CREATE INDEX idx_papers_search ON papers USING GIN(search_vector);
CREATE INDEX idx_papers_source ON papers(source);
```

### Tabla: `analyses`
```sql
CREATE TABLE analyses (
  id SERIAL PRIMARY KEY,
  paper_id TEXT NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  
  -- Métricas de análisis
  bs_index INTEGER NOT NULL CHECK (bs_index >= 0 AND bs_index <= 10),
  sota_score INTEGER NOT NULL CHECK (sota_score >= 0 AND sota_score <= 10),
  is_sota BOOLEAN DEFAULT FALSE,
  
  -- Contenido del análisis
  core_claims TEXT[] NOT NULL,
  red_flags TEXT[] DEFAULT '{}',
  expert_commentary TEXT NOT NULL,
  one_liner TEXT NOT NULL,
  
  -- Metadata del análisis
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  model_used TEXT DEFAULT 'gpt-4o-mini',
  analysis_version INTEGER DEFAULT 1,
  requested_by UUID REFERENCES auth.users(id),  -- Quién pidió el análisis
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(paper_id)  -- Un paper solo tiene un análisis
);

-- Índices
CREATE INDEX idx_analyses_paper_id ON analyses(paper_id);
CREATE INDEX idx_analyses_bs_index ON analyses(bs_index);
CREATE INDEX idx_analyses_sota_score ON analyses(sota_score);
CREATE INDEX idx_analyses_is_sota ON analyses(is_sota);
CREATE INDEX idx_analyses_analyzed_at ON analyses(analyzed_at DESC);
```

### Tabla: `sync_logs`
```sql
CREATE TABLE sync_logs (
  id SERIAL PRIMARY KEY,
  sync_date DATE NOT NULL,
  category TEXT NOT NULL,
  papers_found INTEGER DEFAULT 0,
  papers_inserted INTEGER DEFAULT 0,
  papers_analyzed INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  duration_ms INTEGER,
  status TEXT CHECK (status IN ('running', 'success', 'failed')),
  error_message TEXT,
  
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  UNIQUE(sync_date, category)
);

CREATE INDEX idx_sync_logs_date ON sync_logs(sync_date DESC);
CREATE INDEX idx_sync_logs_status ON sync_logs(status);
```

### Tabla: `user_credits` (opcional, para monetización)
```sql
CREATE TABLE user_credits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  credits_remaining INTEGER DEFAULT 0,
  total_analyses INTEGER DEFAULT 0,
  last_refill TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🔄 Flujo del Cron Job Diario

```typescript
// Ejecuta a las 21:00 EST (después de que arXiv publica a las 20:00)
async function dailySync() {
  const categories = ['cs.AI', 'cs.LG', 'cs.CV', ...];
  
  for (const category of categories) {
    // 1. Fetch papers del último día desde arXiv API
    const newPapers = await fetchArxivPapers(category, lastSync);
    
    // 2. Insert a PostgreSQL (evita duplicados con ON CONFLICT)
    await bulkInsertPapers(newPapers);
    
    // 3. Auto-analizar papers nuevos con IA
    for (const paper of newPapers) {
      const analysis = await analyzeWithAI(paper);
      await saveAnalysis(paper.id, analysis);
    }
    
    // 4. Log del proceso
    await logSyncResult(category, newPapers.length);
  }
}
```

## 🔐 Sistema de Autenticación

**Papers Nuevos (últimos 30 días)**:
- ✅ Acceso público
- ✅ Análisis IA pre-cargado

**Papers Históricos (>30 días sin análisis)**:
- 🔒 Requiere login
- 💰 Consume 1 crédito o requiere subscripción
- ✅ Análisis se guarda para todos los usuarios

## 💰 Modelo de Costos

| Concepto | Costo Estimado |
|----------|----------------|
| Supabase (5M papers, ~10GB) | $0-25/mes |
| Análisis diario (~200 papers) | $2-5/día = $60-150/mes |
| Análisis bajo demanda | Cubierto por usuarios |
| Total operacional | ~$85-175/mes |

**Proyección**: Con 100 usuarios activos solicitando 5 análisis históricos/mes = 500 análisis compartidos = Todo el histórico analizado en ~2 años de forma gratuita.

## 📊 Estimaciones de Performance

| Operación | Tiempo Esperado |
|-----------|-----------------|
| Búsqueda simple | < 50ms |
| Búsqueda con filtros | < 150ms |
| Análisis IA (nuevo) | ~5-10s |
| Análisis IA (cached) | < 50ms |
| Paginación (50 papers) | < 100ms |

## 🚀 Roadmap de Implementación

### Semana 1: Base de Datos
- [x] Setup Supabase
- [ ] Crear schema completo
- [ ] Bulk import script
- [ ] Validar queries de búsqueda

### Semana 2: Sincronización
- [ ] Cron job para arXiv API
- [ ] Auto-análisis de papers nuevos
- [ ] Sistema de logging

### Semana 3: Auth + Análisis
- [ ] Integrar Supabase Auth
- [ ] Análisis bajo demanda
- [ ] Sistema de créditos

### Semana 4: UI/UX
- [ ] Búsqueda avanzada
- [ ] Filtros por categoría/fecha
- [ ] Vista detallada de papers
- [ ] Dashboard de usuario

## 🔍 Decisiones Técnicas Clave

**¿Por qué PostgreSQL?**
- Full-text search nativo (mejor que JSON scanning)
- Índices GIN para arrays de categorías
- tsvector para búsqueda semántica básica
- Escalable a 10M+ papers sin problemas

**¿Por qué análisis bajo demanda?**
- Analizar 5M papers = $15k-50k de costo inicial
- Análisis compartido = Eventualmente todo está analizado
- Papers viejos son menos consultados (Pareto 80/20)

**¿Por qué Supabase?**
- PostgreSQL completo sin servidor propio
- Auth integrado (email, OAuth)
- Row Level Security para control de acceso
- Edge functions para Cron jobs
- Real-time subscriptions (opcional)

## 📝 Notas de Implementación

1. **Bulk Import**: Usa `COPY FROM` o batch inserts de 1000 papers para maximizar velocidad
2. **Cron**: Vercel Cron (gratis hasta 1M invocaciones) o Supabase Edge Functions
3. **Rate Limits**: arXiv API tiene límite de 1 request/3s, usar delays
4. **Deduplicación**: `ON CONFLICT (id) DO NOTHING` para evitar duplicados
5. **Backup**: Supabase hace backups automáticos, pero considerar export semanal

## 🎯 Métricas de Éxito

- [ ] 5M+ papers indexados
- [ ] < 100ms búsqueda promedio
- [ ] 100% papers nuevos auto-analizados
- [ ] < $200/mes costo operacional
- [ ] 95%+ uptime
