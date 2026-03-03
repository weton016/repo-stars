import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { SignOutButton } from './SignOutButton'

export async function Header() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Só exibe a navbar se o usuário estiver logado
  if (!user) {
    return null
  }

  return (
    <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div className="max-w-7xl mx-auto px-8 py-4 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          GitHub Repos Ranking
        </Link>
        <nav className="flex items-center gap-6">
          <Link
            href="/rankings"
            className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            Rankings
          </Link>
          <Link
            href="/dashboard"
            className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            Dashboard
          </Link>
          <SignOutButton />
        </nav>
      </div>
    </header>
  )
}

