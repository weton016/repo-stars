import { IRepositoryRepository } from '@/domain/repositories/IRepositoryRepository'
import { ISnapshotRepository } from '@/domain/repositories/ISnapshotRepository'
import { GithubApiClient } from '@/infra/github/GithubApiClient'
import { Repository } from '@/domain/entities/Repository'
import { RepositorySnapshot } from '@/domain/entities/RepositorySnapshot'
import { randomUUID } from 'crypto'

export class SyncUserRepositories {
  constructor(
    private readonly repoRepo: IRepositoryRepository,
    private readonly snapshotRepo: ISnapshotRepository,
    private readonly githubClient: GithubApiClient,
    private readonly webhookBaseUrl: string,
  ) { }

  async execute(userId: string): Promise<void> {
    const githubRepos = await this.githubClient.getPublicRepos()

    for (const ghRepo of githubRepos) {
      const existing = await this.repoRepo.findByGithubRepoId(ghRepo.id)

      let repo = Repository.fromGithubPayload({
        ...ghRepo,
        userId,
        repoId: existing?.id ?? randomUUID(),
      })

      // Create webhook if doesn't exist yet
      // Skip webhook creation in development (localhost URLs are not accepted by GitHub)
      const isLocalhost = this.webhookBaseUrl.includes('localhost') || this.webhookBaseUrl.includes('127.0.0.1')

      if (existing?.webhookId) {
        console.log(`Webhook already exists for ${ghRepo.full_name}, hook ID: ${existing.webhookId}`)
        repo = repo.attachWebhook(existing.webhookId)
      } else if (isLocalhost) {
        console.log(`Skipping webhook creation for ${ghRepo.full_name} (localhost URL not supported by GitHub)`)
        // Continue without webhook in development
      } else {
        try {
          const webhookUrl = `${this.webhookBaseUrl}/api/webhooks/github`
          console.log(`Creating webhook for ${ghRepo.full_name} at ${webhookUrl}`)
          const hook = await this.githubClient.createWebhook(
            ghRepo.owner.login,
            ghRepo.name,
            webhookUrl,
          )
          console.log(`Webhook created successfully for ${ghRepo.full_name}, hook ID: ${hook.id}`)
          repo = repo.attachWebhook(hook.id)
        } catch (error) {
          // Log error but don't fail the entire sync
          // Common reasons: repo is from org without permissions, token lacks webhook scope
          console.error(
            `Failed to create webhook for ${ghRepo.full_name}:`,
            error instanceof Error ? error.message : error
          )
          if (error instanceof Error) {
            console.error('Error details:', error.stack)
          }
          // Continue without webhook - user can manually create it later
        }
      }

      console.log(`Upserting repo ${ghRepo.full_name} with webhook_id: ${repo.webhookId}`)
      const saved = await this.repoRepo.upsert(repo)
      console.log(`Repo ${ghRepo.full_name} saved with webhook_id: ${saved.webhookId}`)

      // Always save a snapshot on sync
      await this.snapshotRepo.insert(
        RepositorySnapshot.create(saved.toSnapshot('sync'))
      )
    }
  }
}

