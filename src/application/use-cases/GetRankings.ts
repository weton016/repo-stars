import { createClient } from '@/lib/supabase/server'
import { RankingItemDTO } from '../dtos/RankingItemDTO'

export type RankingFilter = 'stars' | 'forks' | 'views'

export class GetRankings {
  async execute(filter: RankingFilter): Promise<RankingItemDTO[]> {
    const supabase = await createClient()

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

