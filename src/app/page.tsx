import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LoginButton } from './components/LoginButton'
import { createClient } from '@/lib/supabase/server'
import { GetRankings, RankingFilter } from '@/application/use-cases/GetRankings'
import { RankingsTable } from './rankings/RankingsTable'
import { RankingsFilters } from './rankings/RankingsFilters'

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; details?: string; filter?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase?.auth?.getUser()

  if (user) {
    redirect('/dashboard')
  }

  const params = await searchParams
  const filter = (params.filter || 'stars') as RankingFilter
  const useCase = new GetRankings()
  const rankings = await useCase.execute(filter)

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
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
              {!['no_code', 'auth_failed'].includes(params.error) && `Erro: ${params.error}`}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <LoginButton />
            <Link
              href="/rankings"
              className="px-8 py-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-2 border-gray-300 dark:border-gray-600 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors inline-flex items-center justify-center"
            >
              Ver Rankings Completo
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <div className="mb-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-2">📊 Métricas em Tempo Real</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Acompanhe stars, forks e views com atualizações automáticas via webhooks
            </p>
          </div>
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-2">📈 Crescimento MoM</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Veja o crescimento mês a mês dos seus repositórios
            </p>
          </div>
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-2">🏆 Rankings Públicos</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Compare seus repositórios com outros no ranking geral
            </p>
          </div>
        </div>

        {/* Rankings Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold">Top Repositórios</h2>
            <RankingsFilters currentFilter={filter} />
          </div>
          <RankingsTable rankings={rankings} />
        </div>
      </div>
    </div>
  )
}

