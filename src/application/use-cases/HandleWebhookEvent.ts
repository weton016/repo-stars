import { IRepositoryRepository } from '@/domain/repositories/IRepositoryRepository'
import { ISnapshotRepository } from '@/domain/repositories/ISnapshotRepository'
import { RepositorySnapshot } from '@/domain/entities/RepositorySnapshot'
import { WebhookPayloadDTO } from '../dtos/WebhookPayloadDTO'

export class HandleWebhookEvent {
  constructor(
    private readonly repoRepo: IRepositoryRepository,
    private readonly snapshotRepo: ISnapshotRepository,
  ) {}

  async execute(payload: WebhookPayloadDTO): Promise<void> {
    const repo = await this.repoRepo.findByGithubRepoId(payload.repository.id)
    if (!repo) return // repo not registered in our system

    const updated = repo.updateFromWebhook(
      payload.repository.stargazers_count,
      payload.repository.forks_count,
    )

    const saved = await this.repoRepo.upsert(updated)

    // Every webhook event generates a new snapshot (immutable history)
    await this.snapshotRepo.insert(
      RepositorySnapshot.create(saved.toSnapshot('webhook'))
    )
  }
}

