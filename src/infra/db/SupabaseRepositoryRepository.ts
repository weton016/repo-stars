import { createClient } from '@/lib/supabase/client'
import { IRepositoryRepository } from '@/domain/repositories/IRepositoryRepository'
import { Repository } from '@/domain/entities/Repository'
import { GithubRepoId } from '@/domain/value-objects/GithubRepoId'
import { RepoUrl } from '@/domain/value-objects/RepoUrl'
import { StarCount } from '@/domain/value-objects/StarCount'
import type { SupabaseClient } from '@supabase/supabase-js'

export class SupabaseRepositoryRepository implements IRepositoryRepository {
  private supabase: SupabaseClient

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase ?? createClient()
  }

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
    const { error } = await this.supabase.from('repositories').delete().eq('id', id)
    if (error) throw new Error(`Failed to delete repository: ${error.message}`)
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

