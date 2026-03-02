import { createClient } from '@/lib/supabase/server'
import { RankingItemDTO } from '../dtos/RankingItemDTO'

export type RankingFilter = 'stars' | 'forks' | 'views'

export class GetRankings {
  async execute(filter: RankingFilter, search?: string): Promise<RankingItemDTO[]> {
    const supabase = await createClient()

    let query = supabase
      .from('repository_rankings')
      .select('*')

    // Aplicar filtro de busca se fornecido
    if (search && search.trim()) {
      query = query.or(`name.ilike.%${search}%,full_name.ilike.%${search}%,github_username.ilike.%${search}%`)
    }

    const { data, error } = await query
      .order(filter, { ascending: false })
      .limit(15)

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

