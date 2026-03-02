import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SyncButton } from './SyncButton'
import { RepositoriesList } from './RepositoriesList'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  const { data: userData } = await supabase
    .from('users')
    .select('github_username, avatar_url')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-300">
              Bem-vindo, {userData?.github_username || user.email}
            </p>
          </div>
          <SyncButton />
        </div>

        <RepositoriesList userId={user.id} />
      </div>
    </div>
  )
}

