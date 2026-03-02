import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { RankingItemDTO } from '@/application/dtos/RankingItemDTO'

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const filter = (searchParams.get('filter') || 'stars') as 'stars' | 'forks' | 'views'
  const search = searchParams.get('search') || undefined
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = (page - 1) * limit

  const supabase = await createClient()

  let query = supabase
    .from('repository_rankings')
    .select('*', { count: 'exact' })

  // Aplicar filtro de busca se fornecido
  if (search && search.trim()) {
    query = query.or(`name.ilike.%${search}%,full_name.ilike.%${search}%,github_username.ilike.%${search}%`)
  }

  const { data, error, count } = await query
    .order(filter, { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rankings: RankingItemDTO[] = (data ?? []).map((row, index) => ({
    position: offset + index + 1,
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

  return NextResponse.json({
    rankings,
    hasMore: count ? offset + limit < count : false,
    total: count || 0,
  })
}
