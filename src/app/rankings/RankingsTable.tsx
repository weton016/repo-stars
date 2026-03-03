'use client'

import { RankingItemDTO } from '@/application/dtos/RankingItemDTO'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'

interface RankingsTableProps {
  initialRankings: RankingItemDTO[]
  currentFilter: 'stars' | 'forks' | 'views'
}

export function RankingsTable({ initialRankings, currentFilter }: RankingsTableProps) {
  const [rankings, setRankings] = useState<RankingItemDTO[]>(initialRankings)
  const [loading, setLoading] = useState(false)
  // Inicializa hasMore baseado no número de itens iniciais
  const [hasMore, setHasMore] = useState(initialRankings.length >= 15)
  const [page, setPage] = useState(1)
  const observerTarget = useRef<HTMLTableRowElement>(null)
  const searchParams = useSearchParams()
  const search = searchParams.get('search') || undefined

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return

    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('filter', currentFilter)
      params.set('page', String(page + 1))
      params.set('limit', '20')
      if (search) {
        params.set('search', search)
      }

      const response = await fetch(`/api/rankings?${params.toString()}`)
      if (!response.ok) {
        setHasMore(false)
        throw new Error('Failed to load rankings')
      }

      const data = await response.json()
      
      // Se não retornou rankings ou retornou array vazio, não há mais dados
      if (!data.rankings || data.rankings.length === 0) {
        setHasMore(false)
        setLoading(false)
        return
      }
      
      setRankings((prev) => {
        // Remove duplicatas baseado em fullName
        const existingFullNames = new Set(prev.map(r => r.fullName))
        const newRankings = data.rankings.filter((r: RankingItemDTO) => !existingFullNames.has(r.fullName))
        return [...prev, ...newRankings]
      })
      
      // Atualiza hasMore baseado na resposta e se realmente adicionou novos itens
      setHasMore(data.hasMore === true && data.rankings.length > 0)
      setPage((prev) => prev + 1)
    } catch (error) {
      console.error('Error loading more rankings:', error)
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }, [loading, hasMore, page, currentFilter, search])

  useEffect(() => {
    // Reset rankings when filter or search changes
    // Remove duplicatas baseado em fullName
    const uniqueRankings = initialRankings.filter((item, index, self) =>
      index === self.findIndex((r) => r.fullName === item.fullName)
    )
    setRankings(uniqueRankings)
    setPage(1)
    
    // Se temos exatamente 15 itens, provavelmente há mais dados
    // Se temos menos, provavelmente não há mais
    // Mas vamos verificar na primeira chamada de loadMore se necessário
    setHasMore(uniqueRankings.length >= 15)
  }, [currentFilter, search, initialRankings])

  useEffect(() => {
    // Só observar se realmente há mais dados para carregar
    if (!hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    const currentTarget = observerTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [loadMore, hasMore, loading])

  if (rankings.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
        <p className="text-gray-600 dark:text-gray-300">
          Nenhum ranking disponível ainda.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Repositório
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Autor
              </th>
              {currentFilter === 'stars' && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Stars
                </th>
              )}
              {currentFilter === 'forks' && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Forks
                </th>
              )}
              {currentFilter === 'views' && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Views
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                MoM Growth
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {rankings.map((item) => (
              <tr key={item.fullName} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {item.position}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    {item.repoName}
                  </a>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {item.avatarUrl && (
                      <img
                        src={item.avatarUrl}
                        alt={item.githubUsername}
                        width={24}
                        height={24}
                        className="rounded-full"
                      />
                    )}
                    <span className="text-sm">{item.githubUsername}</span>
                  </div>
                </td>
                {currentFilter === 'stars' && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span>⭐ {item.stars.toLocaleString()}</span>
                      {item.starsMom !== 0 && (
                        <span
                          className={`text-xs ${
                            item.starsMom > 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          ({item.starsMom > 0 ? '+' : ''}{item.starsMom.toFixed(1)}%)
                        </span>
                      )}
                    </div>
                  </td>
                )}
                {currentFilter === 'forks' && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M5 3.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm0 2.122a2.25 2.25 0 10-1.5 0v.878A2.25 2.25 0 005.75 8.5h1.5v2.128a2.251 2.251 0 101.5 0V8.5h1.5a2.25 2.25 0 002.25-2.25v-.878a2.25 2.25 0 10-1.5 0v.878a.75.75 0 01-.75.75h-4.5A.75.75 0 015 6.25v-.878zm3.75 7.378a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm3-8.75a.75.75 0 100-1.5.75.75 0 000 1.5z"/>
                      </svg>
                      <span>{item.forks.toLocaleString()}</span>
                      {item.forksMom !== 0 && (
                        <span
                          className={`text-xs ${
                            item.forksMom > 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          ({item.forksMom > 0 ? '+' : ''}{item.forksMom.toFixed(1)}%)
                        </span>
                      )}
                    </div>
                  </td>
                )}
                {currentFilter === 'views' && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span>{item.views.toLocaleString()}</span>
                      {item.viewsMom !== 0 && (
                        <span
                          className={`text-xs ${
                            item.viewsMom > 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          ({item.viewsMom > 0 ? '+' : ''}{item.viewsMom.toFixed(1)}%)
                        </span>
                      )}
                    </div>
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {currentFilter === 'stars' && (
                    <span className={item.starsMom > 0 ? 'text-green-600' : item.starsMom < 0 ? 'text-red-600' : 'text-gray-500'}>
                      {item.starsMom > 0 ? '+' : ''}{item.starsMom.toFixed(1)}%
                    </span>
                  )}
                  {currentFilter === 'forks' && (
                    <span className={item.forksMom > 0 ? 'text-green-600' : item.forksMom < 0 ? 'text-red-600' : 'text-gray-500'}>
                      {item.forksMom > 0 ? '+' : ''}{item.forksMom.toFixed(1)}%
                    </span>
                  )}
                  {currentFilter === 'views' && (
                    <span className={item.viewsMom > 0 ? 'text-green-600' : item.viewsMom < 0 ? 'text-red-600' : 'text-gray-500'}>
                      {item.viewsMom > 0 ? '+' : ''}{item.viewsMom.toFixed(1)}%
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {hasMore && (
              <tr ref={observerTarget}>
                <td colSpan={5} className="px-6 py-4 text-center">
                  {loading && (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      <span className="text-gray-600 dark:text-gray-400">Carregando mais...</span>
                    </div>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

