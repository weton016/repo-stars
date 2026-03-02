import { NextRequest, NextResponse } from 'next/server'
import { GithubWebhookValidator } from '@/infra/github/GithubWebhookValidator'
import { HandleWebhookEvent } from '@/application/use-cases/HandleWebhookEvent'
import { SupabaseRepositoryRepository } from '@/infra/db/SupabaseRepositoryRepository'
import { SupabaseSnapshotRepository } from '@/infra/db/SupabaseSnapshotRepository'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-hub-signature-256')

  const validator = new GithubWebhookValidator(process.env.GITHUB_WEBHOOK_SECRET!)
  if (!validator.validate(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = req.headers.get('x-github-event')
  // We only care about events that change stars/forks
  if (!['star', 'fork', 'watch'].includes(event ?? '')) {
    return NextResponse.json({ ignored: true })
  }

  const payload = JSON.parse(rawBody)

  // Use service client for webhooks (no authenticated user)
  const serviceClient = await createClient()
  const useCase = new HandleWebhookEvent(
    new SupabaseRepositoryRepository(serviceClient),
    new SupabaseSnapshotRepository(serviceClient),
  )

  await useCase.execute(payload)

  return NextResponse.json({ success: true })
}

