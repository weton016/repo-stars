import { RepositorySnapshot } from '../entities/RepositorySnapshot'

export interface ISnapshotRepository {
  insert(snapshot: RepositorySnapshot): Promise<void>
  findLatestByRepositoryId(repositoryId: string): Promise<RepositorySnapshot | null>
  findMonthAgoByRepositoryId(repositoryId: string): Promise<RepositorySnapshot | null>
}

