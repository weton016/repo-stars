import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { SyncUserRepositories } from '@/application/use-cases/SyncUserRepositories'
import { SupabaseRepositoryRepository } from '@/infra/db/SupabaseRepositoryRepository'
import { SupabaseSnapshotRepository } from '@/infra/db/SupabaseSnapshotRepository'
import { GithubApiClient } from '@/infra/github/GithubApiClient'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Usar service client para bypassar RLS e garantir acesso à tabela users
    const serviceClient = createServiceClient()
    const { data: userRow } = await serviceClient
        .from('users')
        .select('github_access_token')
        .eq('id', user.id)
        .single()

    if (!userRow?.github_access_token) {
        return NextResponse.json({ error: 'No GitHub token' }, { status: 400 })
    }

    // Usar service client para os repositórios também, para bypassar RLS
    const useCase = new SyncUserRepositories(
        new SupabaseRepositoryRepository(serviceClient),
        new SupabaseSnapshotRepository(serviceClient),
        new GithubApiClient(userRow.github_access_token),
        process.env.NEXT_PUBLIC_APP_URL!,
    )

    await useCase.execute(user.id)

    return NextResponse.json({ success: true })
}

