-- Users (mirror of auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  github_username TEXT NOT NULL UNIQUE,
  avatar_url TEXT,
  github_access_token TEXT, -- store encrypted via Supabase Vault
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Repositories (current state)
CREATE TABLE public.repositories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_repo_id BIGINT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  url TEXT NOT NULL,
  stars INTEGER NOT NULL DEFAULT 0,
  forks INTEGER NOT NULL DEFAULT 0,
  views INTEGER NOT NULL DEFAULT 0,
  webhook_id BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Snapshots (history for MoM calculation)
CREATE TABLE public.repository_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  stars INTEGER NOT NULL DEFAULT 0,
  forks INTEGER NOT NULL DEFAULT 0,
  views INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL CHECK (source IN ('sync', 'webhook', 'cron')),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_snapshots_repo_recorded ON repository_snapshots(repository_id, recorded_at DESC);

-- Rankings view (public, no auth required)
CREATE VIEW public.repository_rankings AS
WITH latest AS (
  SELECT DISTINCT ON (repository_id)
    repository_id, stars, forks, views, recorded_at
  FROM repository_snapshots
  ORDER BY repository_id, recorded_at DESC
),
month_ago AS (
  SELECT DISTINCT ON (repository_id)
    repository_id, stars, forks, views
  FROM repository_snapshots
  WHERE recorded_at <= NOW() - INTERVAL '30 days'
  ORDER BY repository_id, recorded_at DESC
)
SELECT
  r.id,
  r.name,
  r.full_name,
  r.url,
  u.github_username,
  u.avatar_url,
  l.stars,
  l.forks,
  l.views,
  ROUND(((l.stars  - COALESCE(m.stars,  0))::numeric / NULLIF(COALESCE(m.stars,  1), 0)) * 100, 1) AS stars_mom,
  ROUND(((l.forks  - COALESCE(m.forks,  0))::numeric / NULLIF(COALESCE(m.forks,  1), 0)) * 100, 1) AS forks_mom,
  ROUND(((l.views  - COALESCE(m.views,  0))::numeric / NULLIF(COALESCE(m.views,  1), 0)) * 100, 1) AS views_mom
FROM repositories r
JOIN users u ON r.user_id = u.id
JOIN latest l ON l.repository_id = r.id
LEFT JOIN month_ago m ON m.repository_id = r.id;

-- RLS
ALTER TABLE public.repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repository_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can manage own repos" ON public.repositories
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "repos are public readable" ON public.repositories
  FOR SELECT USING (true);

CREATE POLICY "snapshots are public readable" ON public.repository_snapshots
  FOR SELECT USING (true);

CREATE POLICY "only owner inserts snapshots" ON public.repository_snapshots
  FOR INSERT WITH CHECK (
    repository_id IN (SELECT id FROM repositories WHERE user_id = auth.uid())
  );

