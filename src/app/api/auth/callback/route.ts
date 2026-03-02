import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const autoSync = searchParams.get('auto_sync') === 'true'

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/error`)
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.delete({ name, ...options })
        },
      },
    }
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.session) {
    return NextResponse.redirect(`${origin}/auth/error`)
  }

  // Salvar o access_token do GitHub na tabela users
  // Usamos serviceClient para bypassar RLS e garantir que o upsert funcione
  const serviceClient = createServiceClient()
  await serviceClient.from('users').upsert({
    id: data.session.user.id,
    github_username: data.session.user.user_metadata.user_name,
    avatar_url: data.session.user.user_metadata.avatar_url,
    github_access_token: data.session.provider_token, // Este é o access_token do GitHub
  }, { onConflict: 'id' })

  // Se auto_sync estiver ativado, redirecionar para sync e depois para dashboard
  if (autoSync) {
    return NextResponse.redirect(`${origin}/api/auth/callback/sync?redirect=${encodeURIComponent(`${origin}`)}`)
  }

  return NextResponse.redirect(`${origin}`)
}
