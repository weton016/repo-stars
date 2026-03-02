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
  ) {}

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
      if (!existing?.webhookId) {
        try {
        const webhookUrl = `${this.webhookBaseUrl}/api/webhooks/github`
        const hook = await this.githubClient.createWebhook(
          ghRepo.owner.login,
          ghRepo.name,
          webhookUrl,
        )
        repo = repo.attachWebhook(hook.id)
        } catch (error) {
          // Log error but don't fail the entire sync
          // Common reasons: repo is from org without permissions, token lacks webhook scope
          console.error(
            `Failed to create webhook for ${ghRepo.full_name}:`,
            error instanceof Error ? error.message : error
          )
          // Continue without webhook - user can manually create it later
        }
      } else {
        repo = repo.attachWebhook(existing.webhookId)
      }

      const saved = await this.repoRepo.upsert(repo)

      // Always save a snapshot on sync
      await this.snapshotRepo.insert(
        RepositorySnapshot.create(saved.toSnapshot('sync'))
      )
    }
  }
}

