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

