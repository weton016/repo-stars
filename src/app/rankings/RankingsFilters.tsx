'use client'

import { useRouter, usePathname } from 'next/navigation'

export function RankingsFilters({ currentFilter }: { currentFilter: string }) {
  const router = useRouter()
  const pathname = usePathname()

  const handleFilterChange = (filter: string) => {
    const basePath = pathname === '/' ? '/' : '/rankings'
    router.push(`${basePath}?filter=${filter}`)
  }

  return (
    <div className="mb-6 flex gap-2">
      <button
        onClick={() => handleFilterChange('stars')}
        className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
          currentFilter === 'stars'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
        }`}
      >
        Stars
      </button>
      <button
        onClick={() => handleFilterChange('forks')}
        className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
          currentFilter === 'forks'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
        }`}
      >
        Forks
      </button>
      <button
        onClick={() => handleFilterChange('views')}
        className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
          currentFilter === 'views'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
        }`}
      >
        Views
      </button>
    </div>
  )
}

