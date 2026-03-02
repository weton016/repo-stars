import { createClient } from '@/lib/supabase/server'
import { GetRankings, RankingFilter } from '@/application/use-cases/GetRankings'
import { RankingsTable } from './rankings/RankingsTable'
import { RankingsFilters } from './rankings/RankingsFilters'
import { SyncRepositoriesButton } from './components/SyncRepositoriesButton'
import { HeroSearchInput } from './components/HeroSearchInput'

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; details?: string; filter?: string; search?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase?.auth?.getUser()

  const params = await searchParams
  const filter = (params.filter || 'stars') as RankingFilter
  const search = params.search
  const useCase = new GetRankings()
  const rankings = await useCase.execute(filter, search)

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            GitHub Repos Ranking
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Acompanhe o crescimento dos seus repositórios GitHub com métricas em tempo real
          </p>

          {params.error && (
            <div className="mb-6 p-4 bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-300 rounded max-w-2xl mx-auto">
              {params.error === 'no_code' && 'Erro: Código de autorização não recebido'}
              {params.error === 'auth_failed' && (
                <div>
                  <p className="font-semibold">Erro: Falha na autenticação</p>
                  {params.details && (
                    <p className="text-sm mt-1">Detalhes: {params.details}</p>
                  )}
                  <p className="text-sm mt-2">
                    Verifique se o GitHub OAuth está configurado corretamente no Supabase.
                  </p>
                </div>
              )}
              {params.error === 'no_token' && 'Erro: Token do GitHub não encontrado. Tente fazer login novamente.'}
              {!['no_code', 'auth_failed', 'no_token'].includes(params.error) && `Erro: ${params.error}`}
            </div>
          )}

          {/* Hero Search and Sync Button */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center max-w-3xl mx-auto">
            <HeroSearchInput />
            <SyncRepositoriesButton />
          </div>
        </div>

        {/* Rankings Section */}
        <div id="rankings-section" className="mb-8">
          <h2 className="text-3xl font-bold mb-6">Top Repositórios</h2>
          <RankingsFilters currentFilter={filter} />
          <RankingsTable rankings={rankings} currentFilter={filter} />
        </div>
      </div>
    </div>
  )
}

