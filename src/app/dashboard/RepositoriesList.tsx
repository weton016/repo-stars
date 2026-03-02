import { createClient } from '@/lib/supabase/server'

export async function RepositoriesList({ userId }: { userId: string }) {
  const supabase = await createClient()
  const { data: repositories } = await supabase
    .from('repositories')
    .select('*')
    .eq('user_id', userId)
    .order('stars', { ascending: false })

  if (!repositories || repositories.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Nenhum repositório sincronizado ainda.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Clique em "Sincronizar Repositórios" para começar.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-semibold">Meus Repositórios</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Repositório
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
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {repositories.map((repo) => (
              <tr key={repo.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap">
                  <a
                    href={repo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    {repo.full_name}
                  </a>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="flex items-center gap-1">
                    ⭐ {repo.stars}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="flex items-center gap-1">
                    🍴 {repo.forks}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {repo.views.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

