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
  const [hasMore, setHasMore] = useState(true)
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
      if (!response.ok) throw new Error('Failed to load rankings')

      const data = await response.json()
      setRankings((prev) => {
        // Remove duplicatas baseado em fullName
        const existingFullNames = new Set(prev.map(r => r.fullName))
        const newRankings = data.rankings.filter((r: RankingItemDTO) => !existingFullNames.has(r.fullName))
        return [...prev, ...newRankings]
      })
      setHasMore(data.hasMore)
      setPage((prev) => prev + 1)
    } catch (error) {
      console.error('Error loading more rankings:', error)
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
    setHasMore(true)
  }, [currentFilter, search, initialRankings])

  useEffect(() => {
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Stars
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Forks
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Views
              </th>
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
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span>🍴 {item.forks.toLocaleString()}</span>
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
                <td colSpan={7} className="px-6 py-4 text-center">
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

