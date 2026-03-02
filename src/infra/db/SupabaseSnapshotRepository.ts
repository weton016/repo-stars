import { createClient } from '@/lib/supabase/client'
import { ISnapshotRepository } from '@/domain/repositories/ISnapshotRepository'
import { RepositorySnapshot } from '@/domain/entities/RepositorySnapshot'
import type { SupabaseClient } from '@supabase/supabase-js'

export class SupabaseSnapshotRepository implements ISnapshotRepository {
  private supabase: SupabaseClient

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase ?? createClient()
  }

  async insert(snapshot: RepositorySnapshot): Promise<void> {
    const { error } = await this.supabase
      .from('repository_snapshots')
      .insert({
        repository_id: snapshot.repositoryId,
        stars: snapshot.stars,
        forks: snapshot.forks,
        views: snapshot.views,
        source: snapshot.source,
        recorded_at: snapshot.recordedAt.toISOString(),
      })

    if (error) {
      throw new Error(`Failed to insert snapshot: ${error.message}`)
    }
  }

  async findLatestByRepositoryId(repositoryId: string): Promise<RepositorySnapshot | null> {
    const { data, error } = await this.supabase
      .from('repository_snapshots')
      .select('*')
      .eq('repository_id', repositoryId)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) return null

    return RepositorySnapshot.create({
      id: data.id,
      repositoryId: data.repository_id,
      stars: data.stars,
      forks: data.forks,
      views: data.views,
      source: data.source,
      recordedAt: new Date(data.recorded_at),
    })
  }

  async findMonthAgoByRepositoryId(repositoryId: string): Promise<RepositorySnapshot | null> {
    const monthAgo = new Date()
    monthAgo.setMonth(monthAgo.getMonth() - 1)

    const { data, error } = await this.supabase
      .from('repository_snapshots')
      .select('*')
      .eq('repository_id', repositoryId)
      .lte('recorded_at', monthAgo.toISOString())
      .order('recorded_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) return null

    return RepositorySnapshot.create({
      id: data.id,
      repositoryId: data.repository_id,
      stars: data.stars,
      forks: data.forks,
      views: data.views,
      source: data.source,
      recordedAt: new Date(data.recorded_at),
    })
  }
}

