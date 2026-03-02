import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const query = searchParams.get('q')

  if (!query || query.length < 2) {
    return NextResponse.json([])
  }

  const supabase = await createClient()

  // Buscar repositórios que contenham o termo de busca no nome ou full_name
  const { data, error } = await supabase
    .from('repository_rankings')
    .select('name, full_name, github_username')
    .or(`name.ilike.%${query}%,full_name.ilike.%${query}%,github_username.ilike.%${query}%`)
    .limit(10)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(
    (data || []).map((repo) => ({
      fullName: repo.full_name,
      name: repo.name,
      githubUsername: repo.github_username,
    }))
  )
}

