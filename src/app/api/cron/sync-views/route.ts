import { NextRequest, NextResponse } from 'next/server'
import { GithubApiClient } from '@/infra/github/GithubApiClient'
import { SupabaseRepositoryRepository } from '@/infra/db/SupabaseRepositoryRepository'
import { SupabaseSnapshotRepository } from '@/infra/db/SupabaseSnapshotRepository'
import { RepositorySnapshot } from '@/domain/entities/RepositorySnapshot'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
    // Protect cron endpoint
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const serviceClient = await createClient()
    const repoRepository = new SupabaseRepositoryRepository(serviceClient)
    const snapshotRepository = new SupabaseSnapshotRepository(serviceClient)

    // Get all users with access tokens
    const { data: users } = await serviceClient
        .from('users')
        .select('id, github_username, github_access_token')

    for (const user of users ?? []) {
        if (!user.github_access_token) continue

        const repos = await repoRepository.findAllByUserId(user.id)
        const client = new GithubApiClient(user.github_access_token)

        for (const repo of repos) {
            try {
                const [owner] = repo.fullName.split('/')
                const traffic = await client.getTrafficViews(owner, repo.name)

                const updated = repo.updateViews(traffic.count)
                const saved = await repoRepository.upsert(updated)

                await snapshotRepository.insert(
                    RepositorySnapshot.create(saved.toSnapshot('cron'))
                )

                // Avoid GitHub rate limit (5000 req/hour)
                await new Promise(r => setTimeout(r, 200))
            } catch (e) {
                console.error(`Failed to sync views for ${repo.fullName}:`, e)
            }
        }
    }

    return NextResponse.json({ success: true })
}

