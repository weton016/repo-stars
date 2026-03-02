import { GetRankings } from '@/application/use-cases/GetRankings'
import { RankingFilter } from '@/application/use-cases/GetRankings'
import { RankingsTable } from './RankingsTable'
import { RankingsFilters } from './RankingsFilters'
import { Suspense } from 'react'

export default async function RankingsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; search?: string }>
}) {
  const params = await searchParams
  const filter = (params.filter || 'stars') as RankingFilter
  const search = params.search
  const useCase = new GetRankings()
  const rankings = await useCase.execute(filter, search)

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Rankings</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Top 100 repositórios por {filter === 'stars' ? 'estrelas' : filter === 'forks' ? 'forks' : 'visualizações'}
          </p>
        </div>

        <Suspense fallback={<div>Carregando filtros...</div>}>
          <RankingsFilters currentFilter={filter} />
        </Suspense>

        <RankingsTable rankings={rankings} currentFilter={filter} />
      </div>
    </div>
  )
}

