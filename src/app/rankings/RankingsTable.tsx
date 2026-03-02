import { RankingItemDTO } from '@/application/dtos/RankingItemDTO'

interface RankingsTableProps {
  rankings: RankingItemDTO[]
  currentFilter: 'stars' | 'forks' | 'views'
}

export function RankingsTable({ rankings, currentFilter }: RankingsTableProps) {
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
              <tr key={item.url} className="hover:bg-gray-50 dark:hover:bg-gray-700">
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
          </tbody>
        </table>
      </div>
    </div>
  )
}

