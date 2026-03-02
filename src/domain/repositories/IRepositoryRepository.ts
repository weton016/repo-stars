import { Repository } from '../entities/Repository'

export interface IRepositoryRepository {
  findById(id: string): Promise<Repository | null>
  findByGithubRepoId(githubRepoId: number): Promise<Repository | null>
  findAllByUserId(userId: string): Promise<Repository[]>
  upsert(repo: Repository): Promise<Repository>
  delete(id: string): Promise<void>
}

