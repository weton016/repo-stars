import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { SyncUserRepositories } from '@/application/use-cases/SyncUserRepositories'
import { SupabaseRepositoryRepository } from '@/infra/db/SupabaseRepositoryRepository'
import { SupabaseSnapshotRepository } from '@/infra/db/SupabaseSnapshotRepository'
import { GithubApiClient } from '@/infra/github/GithubApiClient'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const redirectTo = searchParams.get('redirect') || '/dashboard'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.redirect(new URL('/?error=auth_failed', req.url))
  }

  // Usar service client para bypassar RLS e garantir acesso à tabela users
  const serviceClient = createServiceClient()
  const { data: userRow } = await serviceClient
    .from('users')
    .select('github_access_token')
    .eq('id', user.id)
    .single()

  if (!userRow?.github_access_token) {
    return NextResponse.redirect(new URL('/?error=no_token', req.url))
  }

  try {
    // Usar service client para os repositórios também, para bypassar RLS
    const useCase = new SyncUserRepositories(
      new SupabaseRepositoryRepository(serviceClient),
      new SupabaseSnapshotRepository(serviceClient),
      new GithubApiClient(userRow.github_access_token),
      process.env.NEXT_PUBLIC_APP_URL!,
    )

    await useCase.execute(user.id)
  } catch (error) {
    console.error('Sync error:', error)
    // Continuar mesmo se houver erro na sincronização
  }

  return NextResponse.redirect(new URL(redirectTo, req.url))
}

