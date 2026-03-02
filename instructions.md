# Backend Architecture — GitHub Repos Ranking

Stack: Next.js 15 (App Router) + Supabase + Vercel Functions + GitHub OAuth + GitHub Webhooks

---

## Folder Structure

```
src/
├── domain/
│   ├── entities/
│   │   ├── Repository.ts
│   │   ├── RepositorySnapshot.ts
│   │   └── User.ts
│   ├── value-objects/
│   │   ├── GithubRepoId.ts
│   │   ├── RepoUrl.ts
│   │   ├── StarCount.ts
│   │   ├── ForkCount.ts
│   │   ├── ViewCount.ts
│   │   └── MoMGrowth.ts
│   └── repositories/ (interfaces)
│       ├── IRepositoryRepository.ts
│       └── ISnapshotRepository.ts
├── application/
│   ├── use-cases/
│   │   ├── SyncUserRepositories.ts
│   │   ├── HandleWebhookEvent.ts
│   │   ├── GetRankings.ts
│   │   └── RegisterWebhooks.ts
│   └── dtos/
│       ├── RankingItemDTO.ts
│       └── WebhookPayloadDTO.ts
├── infra/
│   ├── db/
│   │   ├── SupabaseRepositoryRepository.ts
│   │   └── SupabaseSnapshotRepository.ts
│   └── github/
│       ├── GithubApiClient.ts
│       └── GithubWebhookValidator.ts
└── app/
    └── api/
        ├── auth/
        │   └── callback/route.ts
        ├── repositories/
        │   └── sync/route.ts
        ├── webhooks/
        │   └── github/route.ts
        └── rankings/
            └── route.ts
```

---

## Database Schema (Supabase)

```sql
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
```

---

## Value Objects

```typescript
// src/domain/value-objects/GithubRepoId.ts
export class GithubRepoId {
  private constructor(readonly value: number) {}

  static create(value: number): GithubRepoId {
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(`Invalid GithubRepoId: ${value}`)
    }
    return new GithubRepoId(value)
  }

  equals(other: GithubRepoId): boolean {
    return this.value === other.value
  }
}

// src/domain/value-objects/RepoUrl.ts
export class RepoUrl {
  private constructor(readonly value: string) {}

  static create(value: string): RepoUrl {
    try {
      const url = new URL(value)
      if (url.hostname !== 'github.com') throw new Error()
      return new RepoUrl(value)
    } catch {
      throw new Error(`Invalid RepoUrl: ${value}`)
    }
  }
}

// src/domain/value-objects/StarCount.ts
export class StarCount {
  private constructor(readonly value: number) {}

  static create(value: number): StarCount {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`Invalid StarCount: ${value}`)
    }
    return new StarCount(value)
  }

  growthFrom(previous: StarCount): number {
    if (previous.value === 0) return 0
    return Math.round(((this.value - previous.value) / previous.value) * 100 * 10) / 10
  }
}

// ForkCount and ViewCount follow the same pattern as StarCount

// src/domain/value-objects/MoMGrowth.ts
export class MoMGrowth {
  private constructor(readonly value: number) {}

  static calculate(current: number, previous: number): MoMGrowth {
    if (previous === 0) return new MoMGrowth(0)
    const growth = ((current - previous) / previous) * 100
    return new MoMGrowth(Math.round(growth * 10) / 10)
  }

  isPositive(): boolean { return this.value > 0 }
  isNegative(): boolean { return this.value < 0 }

  format(): string {
    const sign = this.value > 0 ? '+' : ''
    return `${sign}${this.value}%`
  }
}
```

---

## Domain Entities

```typescript
// src/domain/entities/Repository.ts
import { GithubRepoId } from '../value-objects/GithubRepoId'
import { RepoUrl } from '../value-objects/RepoUrl'
import { StarCount } from '../value-objects/StarCount'

export interface RepositoryProps {
  id: string
  githubRepoId: GithubRepoId
  userId: string
  name: string
  fullName: string
  url: RepoUrl
  stars: StarCount
  forks: number
  views: number
  webhookId?: number
  createdAt: Date
  updatedAt: Date
}

export class Repository {
  private constructor(private readonly props: RepositoryProps) {}

  static create(props: RepositoryProps): Repository {
    return new Repository(props)
  }

  static fromGithubPayload(payload: {
    id: number
    name: string
    full_name: string
    html_url: string
    stargazers_count: number
    forks_count: number
    userId: string
    repoId: string
  }): Repository {
    return new Repository({
      id: payload.repoId,
      githubRepoId: GithubRepoId.create(payload.id),
      userId: payload.userId,
      name: payload.name,
      fullName: payload.full_name,
      url: RepoUrl.create(payload.html_url),
      stars: StarCount.create(payload.stargazers_count),
      forks: payload.forks_count,
      views: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  get id() { return this.props.id }
  get githubRepoId() { return this.props.githubRepoId }
  get userId() { return this.props.userId }
  get name() { return this.props.name }
  get fullName() { return this.props.fullName }
  get url() { return this.props.url }
  get stars() { return this.props.stars }
  get forks() { return this.props.forks }
  get views() { return this.props.views }
  get webhookId() { return this.props.webhookId }

  updateFromWebhook(stars: number, forks: number): Repository {
    return new Repository({
      ...this.props,
      stars: StarCount.create(stars),
      forks,
      updatedAt: new Date(),
    })
  }

  updateViews(views: number): Repository {
    return new Repository({
      ...this.props,
      views,
      updatedAt: new Date(),
    })
  }

  attachWebhook(webhookId: number): Repository {
    return new Repository({ ...this.props, webhookId })
  }

  toSnapshot(source: 'sync' | 'webhook' | 'cron'): RepositorySnapshotProps {
    return {
      repositoryId: this.props.id,
      stars: this.props.stars.value,
      forks: this.props.forks,
      views: this.props.views,
      source,
      recordedAt: new Date(),
    }
  }
}

// src/domain/entities/RepositorySnapshot.ts
export interface RepositorySnapshotProps {
  id?: string
  repositoryId: string
  stars: number
  forks: number
  views: number
  source: 'sync' | 'webhook' | 'cron'
  recordedAt: Date
}

export class RepositorySnapshot {
  private constructor(private readonly props: RepositorySnapshotProps) {}

  static create(props: RepositorySnapshotProps): RepositorySnapshot {
    return new RepositorySnapshot(props)
  }

  get repositoryId() { return this.props.repositoryId }
  get stars() { return this.props.stars }
  get forks() { return this.props.forks }
  get views() { return this.props.views }
  get source() { return this.props.source }
  get recordedAt() { return this.props.recordedAt }
}
```

---

## Repository Interfaces

```typescript
// src/domain/repositories/IRepositoryRepository.ts
import { Repository } from '../entities/Repository'

export interface IRepositoryRepository {
  findById(id: string): Promise<Repository | null>
  findByGithubRepoId(githubRepoId: number): Promise<Repository | null>
  findAllByUserId(userId: string): Promise<Repository[]>
  upsert(repo: Repository): Promise<Repository>
  delete(id: string): Promise<void>
}

// src/domain/repositories/ISnapshotRepository.ts
import { RepositorySnapshot } from '../entities/RepositorySnapshot'

export interface ISnapshotRepository {
  insert(snapshot: RepositorySnapshot): Promise<void>
  findLatestByRepositoryId(repositoryId: string): Promise<RepositorySnapshot | null>
  findMonthAgoByRepositoryId(repositoryId: string): Promise<RepositorySnapshot | null>
}
```

---

## Infra: Supabase Implementations

```typescript
// src/infra/db/SupabaseRepositoryRepository.ts
import { createClient } from '@/lib/supabase/server'
import { IRepositoryRepository } from '@/domain/repositories/IRepositoryRepository'
import { Repository } from '@/domain/entities/Repository'
import { GithubRepoId } from '@/domain/value-objects/GithubRepoId'
import { RepoUrl } from '@/domain/value-objects/RepoUrl'
import { StarCount } from '@/domain/value-objects/StarCount'

export class SupabaseRepositoryRepository implements IRepositoryRepository {
  private supabase = createClient()

  async findByGithubRepoId(githubRepoId: number): Promise<Repository | null> {
    const { data, error } = await this.supabase
      .from('repositories')
      .select('*')
      .eq('github_repo_id', githubRepoId)
      .single()

    if (error || !data) return null
    return this.toDomain(data)
  }

  async findAllByUserId(userId: string): Promise<Repository[]> {
    const { data, error } = await this.supabase
      .from('repositories')
      .select('*')
      .eq('user_id', userId)

    if (error || !data) return []
    return data.map(this.toDomain)
  }

  async upsert(repo: Repository): Promise<Repository> {
    const { data, error } = await this.supabase
      .from('repositories')
      .upsert({
        id: repo.id,
        github_repo_id: repo.githubRepoId.value,
        user_id: repo.userId,
        name: repo.name,
        full_name: repo.fullName,
        url: repo.url.value,
        stars: repo.stars.value,
        forks: repo.forks,
        views: repo.views,
        webhook_id: repo.webhookId,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'github_repo_id' })
      .select()
      .single()

    if (error) throw new Error(`Failed to upsert repository: ${error.message}`)
    return this.toDomain(data)
  }

  async findById(id: string): Promise<Repository | null> {
    const { data } = await this.supabase
      .from('repositories')
      .select('*')
      .eq('id', id)
      .single()
    if (!data) return null
    return this.toDomain(data)
  }

  async delete(id: string): Promise<void> {
    await this.supabase.from('repositories').delete().eq('id', id)
  }

  private toDomain(raw: Record<string, any>): Repository {
    return Repository.create({
      id: raw.id,
      githubRepoId: GithubRepoId.create(raw.github_repo_id),
      userId: raw.user_id,
      name: raw.name,
      fullName: raw.full_name,
      url: RepoUrl.create(raw.url),
      stars: StarCount.create(raw.stars),
      forks: raw.forks,
      views: raw.views,
      webhookId: raw.webhook_id,
      createdAt: new Date(raw.created_at),
      updatedAt: new Date(raw.updated_at),
    })
  }
}
```

---

## Infra: GitHub Webhook Validator

```typescript
// src/infra/github/GithubWebhookValidator.ts
import { createHmac, timingSafeEqual } from 'crypto'

export class GithubWebhookValidator {
  constructor(private readonly secret: string) {}

  validate(payload: string, signature: string | null): boolean {
    if (!signature) return false

    const expectedSignature = 'sha256=' + createHmac('sha256', this.secret)
      .update(payload, 'utf8')
      .digest('hex')

    try {
      return timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      )
    } catch {
      return false
    }
  }
}

// src/infra/github/GithubApiClient.ts
export class GithubApiClient {
  constructor(private readonly accessToken: string) {}

  private async fetch<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`https://api.github.com${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...options?.headers,
      },
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`GitHub API error ${res.status}: ${body}`)
    }

    return res.json()
  }

  async getPublicRepos(): Promise<GithubRepo[]> {
    return this.fetch<GithubRepo[]>('/user/repos?type=public&per_page=100')
  }

  async createWebhook(owner: string, repo: string, webhookUrl: string): Promise<{ id: number }> {
    return this.fetch(`/repos/${owner}/${repo}/hooks`, {
      method: 'POST',
      body: JSON.stringify({
        config: {
          url: webhookUrl,
          content_type: 'json',
          secret: process.env.GITHUB_WEBHOOK_SECRET,
        },
        events: ['star', 'fork', 'watch', 'push'],
        active: true,
      }),
    })
  }

  async deleteWebhook(owner: string, repo: string, hookId: number): Promise<void> {
    await this.fetch(`/repos/${owner}/${repo}/hooks/${hookId}`, { method: 'DELETE' })
  }

  async getTrafficViews(owner: string, repo: string): Promise<{ count: number }> {
    return this.fetch(`/repos/${owner}/${repo}/traffic/views`)
  }
}

export interface GithubRepo {
  id: number
  name: string
  full_name: string
  html_url: string
  stargazers_count: number
  forks_count: number
  owner: { login: string }
}
```

---

## Use Cases

```typescript
// src/application/use-cases/SyncUserRepositories.ts
import { IRepositoryRepository } from '@/domain/repositories/IRepositoryRepository'
import { ISnapshotRepository } from '@/domain/repositories/ISnapshotRepository'
import { GithubApiClient } from '@/infra/github/GithubApiClient'
import { Repository } from '@/domain/entities/Repository'
import { RepositorySnapshot } from '@/domain/entities/RepositorySnapshot'
import { randomUUID } from 'crypto'

export class SyncUserRepositories {
  constructor(
    private readonly repoRepo: IRepositoryRepository,
    private readonly snapshotRepo: ISnapshotRepository,
    private readonly githubClient: GithubApiClient,
    private readonly webhookBaseUrl: string,
  ) {}

  async execute(userId: string): Promise<void> {
    const githubRepos = await this.githubClient.getPublicRepos()

    for (const ghRepo of githubRepos) {
      const existing = await this.repoRepo.findByGithubRepoId(ghRepo.id)

      let repo = Repository.fromGithubPayload({
        ...ghRepo,
        userId,
        repoId: existing?.id ?? randomUUID(),
      })

      // Create webhook if doesn't exist yet
      if (!existing?.webhookId) {
        const webhookUrl = `${this.webhookBaseUrl}/api/webhooks/github`
        const hook = await this.githubClient.createWebhook(
          ghRepo.owner.login,
          ghRepo.name,
          webhookUrl,
        )
        repo = repo.attachWebhook(hook.id)
      } else {
        repo = repo.attachWebhook(existing.webhookId)
      }

      const saved = await this.repoRepo.upsert(repo)

      // Always save a snapshot on sync
      await this.snapshotRepo.insert(
        RepositorySnapshot.create(saved.toSnapshot('sync'))
      )
    }
  }
}

// src/application/use-cases/HandleWebhookEvent.ts
import { IRepositoryRepository } from '@/domain/repositories/IRepositoryRepository'
import { ISnapshotRepository } from '@/domain/repositories/ISnapshotRepository'
import { RepositorySnapshot } from '@/domain/entities/RepositorySnapshot'

export interface WebhookPayload {
  repository: {
    id: number
    stargazers_count: number
    forks_count: number
  }
}

export class HandleWebhookEvent {
  constructor(
    private readonly repoRepo: IRepositoryRepository,
    private readonly snapshotRepo: ISnapshotRepository,
  ) {}

  async execute(payload: WebhookPayload): Promise<void> {
    const repo = await this.repoRepo.findByGithubRepoId(payload.repository.id)
    if (!repo) return // repo not registered in our system

    const updated = repo.updateFromWebhook(
      payload.repository.stargazers_count,
      payload.repository.forks_count,
    )

    const saved = await this.repoRepo.upsert(updated)

    // Every webhook event generates a new snapshot (immutable history)
    await this.snapshotRepo.insert(
      RepositorySnapshot.create(saved.toSnapshot('webhook'))
    )
  }
}

// src/application/use-cases/GetRankings.ts
import { createClient } from '@/lib/supabase/server'
import { RankingItemDTO } from '../dtos/RankingItemDTO'

export type RankingFilter = 'stars' | 'forks' | 'views'

export class GetRankings {
  async execute(filter: RankingFilter): Promise<RankingItemDTO[]> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('repository_rankings')
      .select('*')
      .order(filter, { ascending: false })
      .limit(100)

    if (error) throw new Error(`Failed to fetch rankings: ${error.message}`)

    return (data ?? []).map((row, index) => ({
      position: index + 1,
      repoName: row.name,
      fullName: row.full_name,
      url: row.url,
      githubUsername: row.github_username,
      avatarUrl: row.avatar_url,
      stars: row.stars,
      forks: row.forks,
      views: row.views,
      starsMom: row.stars_mom,
      forksMom: row.forks_mom,
      viewsMom: row.views_mom,
    }))
  }
}
```

---

## DTOs

```typescript
// src/application/dtos/RankingItemDTO.ts
export interface RankingItemDTO {
  position: number
  repoName: string
  fullName: string
  url: string
  githubUsername: string
  avatarUrl: string
  stars: number
  forks: number
  views: number
  starsMom: number
  forksMom: number
  viewsMom: number
}
```

---

## Vercel API Routes

```typescript
// src/app/api/auth/callback/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  if (!code) return NextResponse.redirect(new URL('/?error=no_code', req.url))

  const supabase = createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.session) {
    return NextResponse.redirect(new URL('/?error=auth_failed', req.url))
  }

  // Persist user + access token
  const serviceClient = createServiceClient()
  await serviceClient.from('users').upsert({
    id: data.session.user.id,
    github_username: data.session.user.user_metadata.user_name,
    avatar_url: data.session.user.user_metadata.avatar_url,
    github_access_token: data.session.provider_token, // encrypt in production via Supabase Vault
  }, { onConflict: 'id' })

  return NextResponse.redirect(new URL('/dashboard', req.url))
}

// src/app/api/repositories/sync/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { SyncUserRepositories } from '@/application/use-cases/SyncUserRepositories'
import { SupabaseRepositoryRepository } from '@/infra/db/SupabaseRepositoryRepository'
import { SupabaseSnapshotRepository } from '@/infra/db/SupabaseSnapshotRepository'
import { GithubApiClient } from '@/infra/github/GithubApiClient'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get stored access token
  const serviceClient = createServiceClient()
  const { data: userRow } = await serviceClient
    .from('users')
    .select('github_access_token')
    .eq('id', user.id)
    .single()

  if (!userRow?.github_access_token) {
    return NextResponse.json({ error: 'No GitHub token' }, { status: 400 })
  }

  const useCase = new SyncUserRepositories(
    new SupabaseRepositoryRepository(),
    new SupabaseSnapshotRepository(),
    new GithubApiClient(userRow.github_access_token),
    process.env.NEXT_PUBLIC_APP_URL!,
  )

  await useCase.execute(user.id)

  return NextResponse.json({ success: true })
}

// src/app/api/webhooks/github/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { GithubWebhookValidator } from '@/infra/github/GithubWebhookValidator'
import { HandleWebhookEvent } from '@/application/use-cases/HandleWebhookEvent'
import { SupabaseRepositoryRepository } from '@/infra/db/SupabaseRepositoryRepository'
import { SupabaseSnapshotRepository } from '@/infra/db/SupabaseSnapshotRepository'

// IMPORTANT: disable body parsing to get raw body for signature verification
export const config = { api: { bodyParser: false } }

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-hub-signature-256')

  const validator = new GithubWebhookValidator(process.env.GITHUB_WEBHOOK_SECRET!)
  if (!validator.validate(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = req.headers.get('x-github-event')
  // We only care about events that change stars/forks
  if (!['star', 'fork', 'watch'].includes(event ?? '')) {
    return NextResponse.json({ ignored: true })
  }

  const payload = JSON.parse(rawBody)

  const useCase = new HandleWebhookEvent(
    new SupabaseRepositoryRepository(),
    new SupabaseSnapshotRepository(),
  )

  await useCase.execute(payload)

  return NextResponse.json({ success: true })
}

// src/app/api/rankings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { GetRankings, RankingFilter } from '@/application/use-cases/GetRankings'

export const revalidate = 60 // ISR: revalidate every 60s

export async function GET(req: NextRequest) {
  const filter = (req.nextUrl.searchParams.get('filter') ?? 'stars') as RankingFilter

  if (!['stars', 'forks', 'views'].includes(filter)) {
    return NextResponse.json({ error: 'Invalid filter' }, { status: 400 })
  }

  const useCase = new GetRankings()
  const rankings = await useCase.execute(filter)

  return NextResponse.json(rankings, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
  })
}
```

---

## Cron Job (Views via Vercel Cron)

O GitHub não envia views por webhook — precisamos buscar via cron.

```typescript
// src/app/api/cron/sync-views/route.ts
// Configure in vercel.json: { "crons": [{ "path": "/api/cron/sync-views", "schedule": "0 3 * * *" }] }
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { GithubApiClient } from '@/infra/github/GithubApiClient'
import { SupabaseRepositoryRepository } from '@/infra/db/SupabaseRepositoryRepository'
import { SupabaseSnapshotRepository } from '@/infra/db/SupabaseSnapshotRepository'
import { RepositorySnapshot } from '@/domain/entities/RepositorySnapshot'

export async function GET(req: NextRequest) {
  // Protect cron endpoint
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const serviceClient = createServiceClient()
  const repoRepository = new SupabaseRepositoryRepository()
  const snapshotRepository = new SupabaseSnapshotRepository()

  // Get all users with access tokens
  const { data: users } = await serviceClient
    .from('users')
    .select('id, github_username, github_access_token')

  for (const user of users ?? []) {
    if (!user.github_access_token) continue

    const repos = await repoRepository.findAllByUserId(user.id)
    const client = new GithubApiClient(user.github_access_token)

    for (const repo of repos) {
      try {
        const [owner] = repo.fullName.split('/')
        const traffic = await client.getTrafficViews(owner, repo.name)

        const updated = repo.updateViews(traffic.count)
        const saved = await repoRepository.upsert(updated)

        await snapshotRepository.insert(
          RepositorySnapshot.create(saved.toSnapshot('cron'))
        )

        // Avoid GitHub rate limit (5000 req/hour)
        await new Promise(r => setTimeout(r, 200))
      } catch (e) {
        console.error(`Failed to sync views for ${repo.fullName}:`, e)
      }
    }
  }

  return NextResponse.json({ success: true })
}
```

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/sync-views",
      "schedule": "0 3 * * *"
    }
  ]
}
```

---

## Environment Variables

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

GITHUB_WEBHOOK_SECRET=   # string aleatória, a mesma usada ao criar webhooks
CRON_SECRET=             # string aleatória para proteger o endpoint de cron

NEXT_PUBLIC_APP_URL=https://seu-projeto.vercel.app
```

---

## Key Design Decisions

**Domain purity** — entidades e value objects não importam nada de infra. Apenas tipos nativos do TypeScript. Isso facilita testes unitários sem mocks de banco.

**Imutabilidade nas entidades** — `updateFromWebhook`, `updateViews`, `attachWebhook` retornam novas instâncias em vez de mutar o estado. Facilita rastreabilidade e evita efeitos colaterais.

**Snapshot sempre** — todo evento (sync, webhook, cron) grava um snapshot novo. Nunca atualiza um snapshot existente. Isso garante histórico completo para o MoM e permite calcular growths de qualquer janela de tempo no futuro.

**MoM na view do banco** — o cálculo de crescimento mensal fica no banco via SQL view para evitar trazer todos os snapshots para a aplicação. A query faz o join diretamente no banco de forma eficiente.

**Webhook signature validation** — usa `timingSafeEqual` para evitar timing attacks na comparação de HMAC. Nunca comparar strings diretamente com `===`.

**Separação do supabase client** — `/lib/supabase/server.ts` usa cookies do usuário (session), `/lib/supabase/service.ts` usa service role key para operações administrativas (gravar token, buscar todos os usuários no cron).